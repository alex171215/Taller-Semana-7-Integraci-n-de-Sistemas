# Resumen Teórico: Gestión de Contratos, Esquemas y Compatibilidad

**Fuente:** *Integración de Sistemas · Semana 7: Esquemas, compatibilidad y gestión de contratos*  
**Autoría de Referencia:** Sistemas de Información - PUCE (Damián Nicolalde)  

---

## 7.1. Contratos REST vs. gRPC: Contrato Formal y Explícito

Un **contrato de integración** es una descripción formal, verificable y compartida de cómo dos sistemas deben comunicarse: qué operaciones existen, qué estructura tienen los datos de entrada y salida, y qué errores pueden ocurrir.

| Dimensión | Enfoque REST (OpenAPI / JSON Schema) | Enfoque gRPC (Protocol Buffers) |
| :--- | :--- | :--- |
| **Naturaleza del Contrato** | Opcional: Puede existir una API REST sin documentación ni OpenAPI. | **Obligatorio por diseño:** No se puede compilar ni comunicar sin un archivo `.proto`. |
| **Serialización** | Texto legible (JSON/YAML), mayor sobrecarga en bytes. | Binario eficiente y fuertemente tipado. |
| **Generación de Código** | Secundaria (vía openapi-generator u opcional). | Primaria (vía compilador `protoc` generando stubs automáticos). |
| **Gobernanza** | Requiere disciplina y herramientas como `ajv` para forzar cumplimiento. | Forzada por el propio compilador y framework de transporte. |

---

## 7.2. Enfoques Schema-first vs. Code-first

### 1. Code-first (Ej. DTOs con `class-validator` en NestJS)
* **Mecanismo:** El desarrollador escribe clases TypeScript con decoradores (`@IsString()`, `@Min()`). El contrato OpenAPI/Swagger se genera a partir del código.
* **Ventajas:** Alta velocidad de desarrollo inicial; integración nativa con el tipado estático del IDE.
* **Desventajas:** El contrato está acoplado al runtime de Node.js y a la implementación interna. Si cambia el código sin querer, el contrato se rompe silenciosamente.

### 2. Schema-first (Ej. JSON Schema independiente + `ajv`)
* **Mecanismo:** El equipo diseña y aprueba primero el archivo de esquema (`producto.schema.json`) antes de programar controladores. El código valida contra ese artefacto.
* **Ventajas:** Agnóstico a cualquier lenguaje de programación; los clientes pueden validar payloads en local antes de enviarlos por la red; facilita Contract-Driven Development (CDD).
* **Desventajas:** Requiere sincronizar manualmente o generar los tipos de TypeScript a partir del esquema.

---

## 7.3. Lenguajes de Esquema: JSON Schema, Avro y Protobuf

* **JSON Schema (Draft 2020-12):**
  * Estándar IETF para describir la forma y restricciones de documentos JSON.
  * Clave crítica: `"additionalProperties": false`. Evita ataques de *Mass Assignment* (asignación masiva) y garantiza que el cliente no envíe campos espurios no pactados.
  * Motor de validación de referencia: **`ajv`** (Another JSON Schema Validator), el validador más rápido del ecosistema Node.js que compila a JavaScript JIT.
* **Apache Avro:**
  * Formato binario con esquema JSON adjunto o referenciado en un registro. Usado extensivamente en Apache Kafka.
* **Protocol Buffers (Protobuf):**
  * Formato binario de Google con numeración estricta de campos (`field tags: 1, 2, 3`), permitiendo renombrar campos sin romper compatibilidad.

---

## 7.4. Schema Registry y Versionamiento de Esquemas

En arquitecturas distribuidas, un **Schema Registry** (como Confluent Schema Registry) almacena las versiones de los esquemas y rechaza eventos que no cumplan la política de compatibilidad establecida:

1. **BACKWARD (Hacia atrás):**
   * El consumidor con el nuevo esquema puede procesar datos generados con el esquema anterior.
   * Regla: Se pueden añadir campos opcionales o con default; NO se pueden eliminar campos obligatorios.
2. **FORWARD (Hacia adelante):**
   * El consumidor con el esquema viejo puede procesar datos emitidos con el nuevo esquema.
   * Regla: Se pueden eliminar campos opcionales; NO se pueden añadir campos requeridos.
3. **FULL (Completa):**
   * Cumple simultáneamente BACKWARD y FORWARD.
4. **NONE:**
   * Sin validación de compatibilidad (alto riesgo de breaking changes).

---

## 7.5. Validación Automática y Detección de Breaking Changes

Un **Breaking Change** (cambio disruptivo) ocurre cuando una nueva versión del contrato impide que clientes existentes sigan comunicándose sin fallar.

* **Casos típicos de Breaking Changes:**
  1. Volver requerido un campo que antes no existía o era opcional sin proporcionar un valor por defecto.
  2. Eliminar un campo existente que los clientes aún envían (si `additionalProperties: false`).
  3. Modificar el tipo de dato de un campo (ej. `number` a `string`).
  4. Reducir las restricciones de un `enum` o rango numérico.

La integración de scripts como `check-compatibility.js` dentro del pipeline de **CI/CD (GitHub Actions)** previene que código con breaking changes no intencionales sea desplegado a producción.
