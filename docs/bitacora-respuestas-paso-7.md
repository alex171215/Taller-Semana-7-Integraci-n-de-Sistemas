# Bitácora de Cierre · Paso 7: Comparación de Enfoques de Validación

**Estudiante:** Alex Nicolalde  
**Materia:** Integración de Sistemas  
**Semana:** 7 · Contratos y Validación con JSON Schema  
**Fecha:** Octubre 2026  

---

### Pregunta 1: ¿Cuál de los tres enfoques (JSON Schema con `ajv`, DTOs con `class-validator` de la Semana 2, contrato `.proto` de la Semana 3) se sintió más "contrato explícito", y por qué?

**Respuesta Técnica:**
El contrato más rigurosamente "explícito" es el archivo **`.proto` de gRPC**, seguido inmediatamente por **JSON Schema**. 

* **Justificación:**
  1. **`.proto` es explícito por definición ontológica:** En gRPC no existe forma física de levantar un servicio sin haber escrito previamente el archivo `.proto`. Es un contrato binario, agnóstico al lenguaje (polyglot) y autoejecutable que genera el código tanto del cliente como del servidor.
  2. **JSON Schema como contrato agnóstico:** A diferencia de `class-validator`, donde las reglas están atadas al runtime de Node.js y a decoradores de TypeScript, el archivo `producto.schema.json` es un estándar abierto del IETF (`https://json-schema.org/draft/2020-12/schema`). Puede ser compartido con equipos que programen en Python, Go o Java y validado con motores nativos sin tocar una sola línea de TypeScript.
  3. **`class-validator` es código-primero (Code-first):** Los DTOs con `@IsString()`, `@Min(0)` no son un contrato desacoplado, sino código ejecutable dentro del microservicio. Si un cliente externo necesita saber las reglas, depende de que se genere un Swagger derivado, el cual es una representación secundaria y no la fuente primaria de la verdad.

---

### Pregunta 2: ¿En qué escenario preferirías `class-validator` sobre JSON Schema, y viceversa?

**Respuesta Técnica:**

| Escenario de Integración | Enfoque Recomendado | Justificación de Ingeniería |
| :--- | :--- | :--- |
| **Monolito modular o microservicios full TypeScript internos** | `class-validator` + DTOs | **Productividad y ergonomía:** Los desarrolladores operan en el mismo stack (TypeScript). La integración nativa de NestJS con `ValidationPipe` y `class-transformer` permite tipado estático inmediato en el IDE, autocompletado y validación en un solo artefacto. |
| **APIs públicas consumidas por clientes externos o móviles** | JSON Schema con `ajv` | **Garantía contractual e independencia tecnológica:** Clientes en iOS (Swift), Android (Kotlin) o servicios de terceros pueden validar los payloads antes de enviarlos usando el mismo JSON Schema publicado en el API Gateway. |
| **Arquitecturas Event-Driven (EDA) con Kafka o RabbitMQ** | JSON Schema / Avro | **Validación en el broker o Schema Registry:** Los esquemas viajan o se registran en un Confluent Schema Registry; la validación ocurre a nivel de mensaje de red antes de llegar a la lógica de aplicación. |
| **Reglas de negocio complejas con validadores personalizados** | `class-validator` | Soporta inyección de dependencias en validadores (ej. `@IsUserAlreadyExistConstraint`) contra base de datos. |
| **Validaciones ultrarrápidas de alta concurrencia** | `ajv` | `ajv` precompila el esquema a código JavaScript optimizado en JIT (Just-In-Time), siendo entre **10x y 20x más rápido** en benchmarks que la reflexión por decoradores de `class-validator`. |

---

### Pregunta 3: Si tu equipo tuviera 5 consumidores externos de esta API, ¿usarías la política BACKWARD o FULL para versionar este esquema? Justifica.

**Respuesta Técnica:**
Para una API expuesta a 5 consumidores externos con ciclos de despliegue independientes, la política recomendada es **BACKWARD COMPATIBILITY** (o preferiblemente **FULL** si los consumidores también reciben payloads del servidor).

* **Análisis de la Política BACKWARD (Compatibilidad hacia atrás):**
  * **Definición:** El nuevo esquema (servidor) puede procesar datos generados por clientes que utilicen el esquema anterior.
  * **Reglas:**
    1. Se pueden agregar campos nuevos, **siempre que sean opcionales** o tengan valor por defecto.
    2. **No se pueden eliminar** campos que el cliente viejo aún envía (o deben ignorarse sin rechazar).
    3. **No se pueden cambiar los tipos** de datos.
  * **Justificación para 5 consumidores externos:** Si tú como proveedor de la API liberas la versión 2 (agregando `categoria` como opcional), los 5 clientes externos **no tienen que sincronizar su despliegue contigo el mismo día ni a la misma hora**. Sus sistemas pueden seguir enviando peticiones en formato v1 durante semanas sin romperse.

* **¿Cuándo exigir FULL COMPATIBILITY?**
  * Si los clientes externos no solo envían datos (`request`), sino que también almacenan o consumen respuestas estructuradas (`response`) o leen de una cola de eventos compartida. FULL garantiza que tanto un cliente viejo pueda hablar con un servidor nuevo, como un cliente nuevo pueda leer datos emitidos por un servidor viejo.
