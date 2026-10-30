# INFORME EJECUTIVO DE AUDITORÍA TÉCNICA Y ARQUITECTÓNICA
## Evaluación Integral de Calidad, Resiliencia, Seguridad y Gobernanza de Contratos API
**Proyecto:** Plataforma de Gestión de Productos orientada a Contratos (*Schema-First API*)  
**Módulo Evaluado:** Taller Semana 7 — Integración de Sistemas con NestJS y JSON Schema (Draft 2020-12)  
**Repositorio Oficial:** [alex171215/Taller-Semana-7-Integración-de-Sistemas](https://github.com/alex171215/Taller-Semana-7-Integraci-n-de-Sistemas.git)  
**Fecha de Evaluación:** Octubre 2026  
**Audiencia Objetivo:** Dirección de Tecnología (CTO), Arquitectos de Software, Líderes Técnicos y DevSecOps  

---

## 1. RESUMEN EJECUTIVO

### 1.1. Propósito y Alcance del Análisis
El presente informe constituye una auditoría técnica profunda sobre el diseño, arquitectura, seguridad, mecanismos de validación y ciclo de vida de contratos del microservicio desarrollado en **NestJS 10**. El sistema fue concebido bajo el paradigma **Schema-First**, donde los contratos de datos se definen formalmente en especificaciones **JSON Schema (Draft 2020-12)** y son compilados en tiempo de ejecución por el motor **Ajv 2020**, respaldado por un pipeline de integración y despliegue continuo en **GitHub Actions** hacia la plataforma Cloud **Render**.

El propósito fundamental de esta auditoría es diagnosticar la brecha técnica existente entre la implementación actual (desarrollada conforme a los lineamientos del taller académico) y los estándares de ingeniería exigidos en entornos corporativos de alta demanda, transaccionalidad crítica e integración de sistemas heterogéneos.

### 1.2. Dictamen General de la Auditoría
* **Cumplimiento Funcional del Taller Académico:** **100% SATISFACTORIO**. El código satisface la totalidad de los requisitos pedagógicos: esquemas versionados v1, v2 y v3-breaking, validación estricta con bloqueo de propiedades no declaradas (`additionalProperties: false`), verificación automatizada de compatibilidad backward y despliegue continuo con 15 pruebas unitarias exitosas.
* **Madurez y Preparación para Producción Empresarial (*Enterprise Readiness*):** **NIVEL MEDIO-BAJO (Requiere Plan de Remediación Obligatorio)**. A pesar de su correcta lógica funcional, la aplicación presenta vulnerabilidades de arquitectura y seguridad sustanciales: el estado reside exclusivamente en memoria volátil, la validación expone vectores de ataque por contaminación de prototipos, el algoritmo de compatibilidad de esquemas genera falsos negativos críticos, y las respuestas de error exponen metadatos internos del sistema.

### 1.3. Matriz Ejecutiva de Hallazgos y Severidad

| Identificador | Hallazgo / Deficiencia Detectada | Dominio de Ingeniería | Nivel de Severidad | Impacto Operativo y de Negocio |
|---|---|---|---|---|
| **AUD-01** | Persistencia volátil en memoria y ruptura de consistencia horizontal | Arquitectura de Datos | **CRÍTICA** | Pérdida total de datos en reinicios del servidor e inconsistencias (errores 404) al escalar a múltiples instancias. |
| **AUD-02** | Riesgo de Prototype Pollution y carencia de modo estricto en Ajv | Seguridad de Aplicación | **ALTA** | Exposición a manipulación indebida del prototipo base de JavaScript y vulnerabilidad a denegación de servicio (ReDoS). |
| **AUD-03** | Falsos negativos y análisis superficial en el verificador de compatibilidad | Gobernanza de Contratos | **ALTA** | Paso inadvertido a producción de breaking changes que rompen clientes existentes (reducción de enums, rangos y objetos anidados). |
| **AUD-04** | Fuga de metadatos internos en respuestas HTTP 400 (Violación RFC 7807) | Seguridad / API Design | **MEDIA** | Exposición de la topología interna del schema a atacantes; desalineación con el estándar corporativo de reporte de errores. |
| **AUD-05** | Acoplamiento estático de esquemas y ausencia de Schema Registry | Arquitectura Distribuida | **MEDIA** | Desincronización (*contract drift*) entre microservicios consumidores; necesidad de redespliegue ante cambios menores. |
| **AUD-06** | Ejecución del contenedor Docker bajo usuario con privilegios de superusuario (`root`) | Seguridad en Infraestructura | **MEDIA** | Riesgo de escalamiento de privilegios y escape de contenedor hacia el host ante vulnerabilidades en el runtime. |
| **AUD-07** | Ausencia de telemetría, métricas de contratos y logging no estructurado | Observabilidad y SRE | **BAJA-MEDIA** | Incapacidad de auditar clientes desactualizados, monitorear tasas de rechazo de esquemas o correlacionar incidentes. |

---

## 2. AUDITORÍA TÉCNICA DETALLADA: PROBLEMAS, IMPACTOS Y SOLUCIONES

---

### HALLAZGO AUD-01: Persistencia Volátil en Memoria (`Map<string, Producto>`) y Ruptura de Consistencia Horizontal
* **Severidad:** **CRÍTICA**  
* **Componente Afectado:** `src/productos/productos.service.ts`

#### Enunciado y Detalle Técnico del Error
El servicio `ProductosService` almacena los datos de los productos mediante una colección privada en memoria basada en la estructura nativa `Map<string, Producto>`. Esta colección reside únicamente en el espacio de memoria RAM del proceso de Node.js que ejecuta la aplicación. Cada operación de creación, consulta y eliminación interactúa exclusivamente con este mapa volátil, dependiendo de la vida útil del proceso del sistema operativo.

#### Cómo Afecta a la Aplicación y al Negocio
1. **Pérdida Irreversible de Información:** En infraestructuras modernas en la nube como Render, AWS Elastic Beanstalk o clústeres de Kubernetes, las instancias de los contenedores son efímeras. Cuando se realiza un nuevo despliegue a través del pipeline de CI/CD, o cuando el proveedor recicla contenedores por balanceo de recursos o inactividad, el proceso Node.js se destruye. En ese instante, todos los productos creados por los usuarios desaparecen definitivamente, restableciéndose únicamente los 3 productos configurados como semilla inicial.
2. **Incompatibilidad Absoluta con el Escalado Horizontal:** Si la aplicación experimenta un incremento de tráfico y se escala a dos o más réplicas detrás de un balanceador de carga, cada réplica mantendrá su propia instancia aislada del mapa en memoria. Si un cliente emite una petición de creación que es recibida por la Réplica A, y su siguiente petición de consulta es derivada por el balanceador hacia la Réplica B, el sistema responderá con un error `404 Not Found`. Esto provoca un comportamiento errático e inconsistente que destruye la confiabilidad del servicio ante clientes externos.
3. **Inexistencia de Garantías Transaccionales:** No existen mecanismos de atomicidad, consistencia, aislamiento ni durabilidad (propiedades ACID), lo que genera riesgo de condiciones de carrera en operaciones concurrentes de escritura y borrado.

#### Solución Técnica Detallada (Enfoque Arquitectónico)
La solución requiere desacoplar por completo el almacenamiento de datos del ciclo de vida del proceso de la aplicación, implementando una arquitectura de persistencia empresarial basada en el patrón de diseño **Repository**.

Se debe incorporar una base de datos relacional externa de alta disponibilidad, como **PostgreSQL**, gestionada a través de un ORM moderno y tipado como **Prisma** o **TypeORM**. La capa de servicio en NestJS debe inyectar el cliente de base de datos y transformar cada método (`crear`, `obtenerTodos`, `obtenerPorId`, `eliminar`) en operaciones asíncronas delegadas al motor relacional mediante transacciones seguras. Asimismo, se debe configurar una capa de conexión compartida (*connection pooling* con PgBouncer) para administrar eficientemente las conexiones en picos de alta concurrencia. De esta forma, cualquier número de réplicas del microservicio compartirá la misma fuente de verdad persistente, garantizando consistencia inmediata y tolerancia a fallos.

*Línea ilustrativa:*  
`await this.prisma.producto.create({ data: { nombre, precio, categoria, versionEsquema } });`

---

### HALLAZGO AUD-02: Exposición a Vulnerabilidad de Prototype Pollution y Ausencia de Modo Estricto en Ajv
* **Severidad:** **ALTA**  
* **Componente Afectado:** `src/common/json-schema-validation.pipe.ts`

#### Enunciado y Detalle Técnico del Error
En el pipe de validación personalizado `JsonSchemaValidationPipe`, la instancia del validador Ajv se construye mediante `new Ajv2020({ allErrors: true })`. Esta inicialización carece de banderas de seguridad indispensables. No se activa el modo de verificación rigurosa de especificaciones (`strict: true`), se mantiene habilitada la heurística por defecto que permite la entrada de propiedades especiales de objetos, y no se desactiva explícitamente la coerción de tipos de datos (`coerceTypes: false`).

#### Cómo Afecta a la Aplicación y al Negocio
1. **Riesgo de Contaminación de Prototipos (*Prototype Pollution* - CWE-1321):** Aunque el esquema actual utiliza la directiva `additionalProperties: false`, la instancia de Ajv no cuenta con filtros defensivos a nivel de parser. Si un atacante envía un cuerpo JSON especialmente manipulado que contenga propiedades reservadas de la cadena de prototipos de JavaScript (tales como `__proto__`, `constructor` o `prototype`), y estas propiedades interactúan con funciones auxiliares de clonado o fusión de objetos (*deep merge*), el atacante puede inyectar propiedades en el prototipo base `Object.prototype`. Esto permite alterar el comportamiento global de la aplicación, eludir verificaciones de seguridad en otros módulos o forzar excepciones no controladas.
2. **Vulnerabilidad a Denegación de Servicio por Expresiones Regulares (*ReDoS*):** Sin la directiva `strict: true`, el compilador de Ajv ignora advertencias severas sobre expresiones regulares ambiguas dentro de los esquemas. Si en futuras iteraciones se añade una validación de formato mediante expresiones regulares con retroceso catastrófico (*Catastrophic Backtracking*), una carga útil maliciosa puede bloquear el *Event Loop* de Node.js al 100% de uso de CPU, provocando una caída completa del servicio para todos los usuarios.

#### Solución Técnica Detallada (Enfoque Arquitectónico)
La remediación consiste en aplicar una estrategia de defensa en profundidad en dos capas: configuración estricta del compilador y sanitización defensiva en el pipeline de entrada.

En primer lugar, se debe configurar la instancia global de Ajv activando el modo estricto corporativo (`strict: true`), exigiendo que todos los formatos sean validados explícitamente (`validateFormats: true`) y desactivando la coerción automática de tipos (`coerceTypes: false`), obligando a que un número sea enviado como tipo numérico estricto y no como cadena convertible. En segundo lugar, dentro del método `transform` del pipe de NestJS, se debe implementar una verificación previa que inspeccione las claves del objeto entrante; si se detecta cualquier intento de enviar propiedades reservadas de prototipo, la petición se aborta de inmediato con una excepción HTTP 400 antes de que el objeto sea procesado o compilado en memoria.

*Configuración mínima recomendada:*  
`const ajv = new Ajv2020({ allErrors: true, strict: true, coerceTypes: false, validateFormats: true });`

---

### HALLAZGO AUD-03: Falsos Negativos y Cobertura Superficial en el Verificador de Compatibilidad (`check-compatibility.js`)
* **Severidad:** **ALTA**  
* **Componente Afectado:** `check-compatibility.js` y el paso correspondiente en el pipeline `.github/workflows/ci-cd.yml`

#### Enunciado y Detalle Técnico del Error
La función `esCompatibleBackward` implementada en `check-compatibility.js` evalúa únicamente tres condiciones superficiales de primer nivel: si se agregaron nuevos campos a la lista de requeridos, si se eliminaron propiedades directas del objeto, o si cambió el tipo primitivo de datos. El algoritmo carece de análisis semántico sobre restricciones cuantitativas, conjuntos cerrados de valores y jerarquías anidadas.

#### Cómo Afecta a la Aplicación y al Negocio
El verificador genera **falsos negativos críticos**, lo que significa que aprueba esquemas que en realidad rompen la compatibilidad con clientes existentes. Si un cambio en los contratos pasa esta validación, el pipeline de CI/CD autoriza el despliegue automático a producción, provocando incidentes graves:
1. **Reducción Inadvertida de Enumeraciones (`enum`):** Si la versión 2 acepta las categorías `["electronica", "oficina", "hogar"]` y en la versión 3 un desarrollador elimina la categoría `"oficina"`, el script actual dictamina que el cambio es 100% compatible. Al llegar a producción, todos los sistemas satélites que envíen productos de oficina comenzarán a ser rechazados con errores 400.
2. **Endurecimiento de Restricciones Numéricas y de Longitud:** Si el campo `precio` tenía una restricción `minimum: 0` y en la siguiente versión se modifica a `minimum: 50`, cualquier cliente que cree productos con precios menores fallará. El script actual no inspecciona palabras clave como `minimum`, `maximum`, `minLength`, `maxLength` ni `pattern`.
3. **Ceguera ante Objetos Anidados y Colecciones:** El script solo lee el primer nivel del JSON. Si el contrato añade objetos secundarios o listas (`items`), las alteraciones incompatibles en esos niveles pasan totalmente desapercibidas.
4. **Restricción de Propiedades Adicionales:** Si un esquema previo permitía propiedades adicionales y el nuevo las bloquea (`additionalProperties: false`), los clientes que enviaban campos complementarios serán rechazados.

#### Solución Técnica Detallada (Enfoque Arquitectónico)
Es indispensable refactorizar el verificador para convertirlo en un evaluador semántico recursivo basado en la teoría de subconjuntos de JSON Schema.

El algoritmo debe recorrer recursivamente la estructura del contrato. Para cada propiedad coincidente entre ambas versiones, debe verificar que el dominio permitido en el nuevo esquema contenga íntegramente al dominio del esquema anterior. Específicamente, en campos de tipo `enum`, debe validar matemáticamente que el nuevo conjunto sea un superconjunto del anterior (no se permite eliminar elementos). En restricciones numéricas, debe comprobar que el nuevo valor de `minimum` sea menor o igual al original, y que el nuevo `maximum` sea mayor o igual. En restricciones de longitud de cadena, el nuevo `maxLength` no puede ser inferior al anterior. Si una propiedad es de tipo objeto, la función debe autoinvocarse recursivamente agregando la ruta del campo al contexto de auditoría. Si cualquiera de estas reglas se infringe, el proceso debe finalizar con un código de salida distinto de cero para detener de forma contundente el pipeline de despliegue.

---

### HALLAZGO AUD-04: Fuga de Metadatos y Estructuras Internas en Respuestas HTTP 400
* **Severidad:** **MEDIA**  
* **Componente Afectado:** `src/common/json-schema-validation.pipe.ts`

#### Enunciado y Detalle Técnico del Error
Cuando una petición no supera la validación del contrato, el pipe lanza una excepción `BadRequestException` pasando directamente la colección cruda `this.validateFn.errors` generada por el compilador de Ajv.

#### Cómo Afecta a la Aplicación y al Negocio
1. **Fuga de Información Confidencial de Arquitectura (*Information Disclosure* - CWE-200):** La salida nativa de Ajv incluye metadatos como `schemaPath`, punteros de compilación interna (`#/properties/precio/minimum`), variables del motor de validación y rutas de esquemas. Esta información permite a atacantes externos deducir la topología interna del software, facilitando la ingeniería inversa de las reglas de negocio y los límites del backend.
2. **Falta de Adherencia a Estándares de la Industria:** Las respuestas de error no se ajustan al estándar internacional **RFC 7807 (Problem Details for HTTP APIs)** ni al RFC 9457. Esto genera fricción con clientes frontend, aplicaciones móviles y microservicios de terceros, los cuales requieren esquemas de error normalizados, predecibles y libres de estructuras arbitrarias.

#### Solución Técnica Detallada (Enfoque Arquitectónico)
Se debe desacoplar el formato de salida del motor de validación implementando un filtro de excepciones global en NestJS (`ValidationExceptionFilter`) o una función de sanitización dentro del mismo pipe.

Esta capa intermedia debe interceptar los errores crudos de Ajv y mapearlos a un objeto de respuesta uniforme conforme a la especificación RFC 7807. La respuesta resultante debe contener exclusivamente un código de estado numérico (`400`), un tipo URI que identifique la categoría del problema, un título comprensible, la instancia del endpoint solicitado y un arreglo limpio de parámetros inválidos. En dicho arreglo solo se incluirá el nombre del campo infractor y una descripción legible en lenguaje natural (por ejemplo: "El precio debe ser un número mayor o igual a 0"), purgando de raíz cualquier puntero o identificador técnico interno del validador.

---

### HALLAZGO AUD-05: Acoplamiento Estático de Esquemas y Ausencia de un Registro Centralizado (*Schema Registry*)
* **Severidad:** **MEDIA**  
* **Componente Afectado:** `src/productos/schemas/*.json` y la arquitectura global de distribución de contratos

#### Enunciado y Detalle Técnico del Error
Los esquemas JSON que definen los contratos formales de la aplicación se encuentran almacenados como ficheros físicos locales en la ruta `src/productos/schemas/`. Estos archivos se importan estáticamente en el código TypeScript y se empaquetan de forma inmutable dentro del artefacto de distribución.

#### Cómo Afecta a la Aplicación y al Negocio
1. **Divergencia Silenciosa de Contratos (*Contract Drift*):** En un ecosistema empresarial donde conviven múltiples microservicios (por ejemplo: catálogo, inventario, facturación y clientes web/móviles), los equipos externos no tienen acceso dinámico al esquema. Se ven forzados a copiar manualmente los archivos `.json` a sus propios repositorios. Con el tiempo, esto provoca desincronización de versiones, donde el productor evoluciona el contrato y los consumidores continúan validando con especificaciones obsoletas.
2. **Inflexibilidad Operativa:** No es posible actualizar descripciones, extender validaciones menores o compartir esquemas comunes entre servicios sin realizar un ciclo completo de compilación y despliegue del microservicio.

#### Solución Técnica Detallada (Enfoque Arquitectónico)
Se recomienda transicionar hacia una arquitectura desacoplada basada en un **Centralized Schema Registry**, adoptando herramientas empresariales como **Apicurio Registry**, **Confluent Schema Registry** o un repositorio centralizado de esquemas alojado en almacenamiento seguro (S3 / Cloud Storage).

Bajo este modelo, los esquemas se gestionan en un ciclo de vida independiente. El pipeline de integración continua valida la compatibilidad y, tras su aprobación, publica las nuevas versiones semánticas en el registro central. El microservicio de productos y los consumidores externos descargan los esquemas mediante peticiones HTTP autenticadas con soporte de caché (`ETag` y `Cache-Control`). Para evitar latencias y asegurar la operatividad ante caídas de red, la aplicación debe mantener una caché local en memoria de los esquemas compilados, invalidándola únicamente mediante webhooks o verificación asíncrona periódica.

---

### HALLAZGO AUD-06: Ejecución del Contenedor Docker con Privilegios de Superusuario (`root`)
* **Severidad:** **MEDIA**  
* **Componente Afectado:** `Dockerfile` (etapa `runner`)

#### Enunciado y Detalle Técnico del Error
En el archivo `Dockerfile`, la segunda fase del despliegue multi-stage (`FROM node:20-alpine AS runner`) copia los artefactos compilados y ejecuta el comando de inicio `npm start` sin definir una directiva de identidad de usuario. Por omisión, los contenedores Linux inician todos sus procesos bajo el usuario con UID 0 (`root`).

#### Cómo Afecta a la Aplicación y al Negocio
1. **Violación del Principio de Menor Privilegio (*Least Privilege*):** Si se detecta una vulnerabilidad en una dependencia de Node.js o una falla de inyección de comandos en el código que permita ejecución remota de código (RCE), el atacante ejecutará sus instrucciones con privilegios totales de administrador dentro del contenedor.
2. **Incremento del Riesgo de Escape de Contenedor (*Container Breakout*):** En entornos orquestados como Kubernetes o instancias de contenedores compartidas, un proceso ejecutado como `root` cuenta con capacidades extendidas del kernel. Ante fallas de aislamiento en el motor de ejecución de contenedores (runc / containerd), un intruso puede vulnerar el aislamiento y acceder al sistema operativo del servidor anfitrión.

#### Solución Técnica Detallada (Enfoque Arquitectónico)
La remediación consiste en configurar el contenedor para que opere bajo una identidad sin privilegios administrativos, utilizando el usuario no-root `node` que ya viene preconfigurado en la imagen base oficial de Alpine.

En la etapa `runner` del `Dockerfile`, inmediatamente después de copiar los archivos del código y las dependencias de producción, se debe ejecutar una instrucción que transfiera la propiedad de todo el directorio de trabajo al usuario `node` (`chown -R node:node /app`). Posteriormente, antes de exponer los puertos y definir el comando de inicio, se debe declarar explícitamente la directiva `USER node`. Esto asegura que el proceso de Node.js, Express y NestJS se ejecute con privilegios mínimos, impidiendo la escritura no autorizada en directorios del sistema y mitigando los vectores de escape de contenedor.

*Directiva clave en Dockerfile:*  
`RUN chown -R node:node /app && USER node`

---

### HALLAZGO AUD-07: Ausencia de Logging Estructurado y Telemetría de Contratos
* **Severidad:** **BAJA-MEDIA**  
* **Componente Afectado:** `src/main.ts`, controladores y pipes de validación

#### Enunciado y Detalle Técnico del Error
La aplicación utiliza llamadas a `console.log()` en texto plano para registrar el inicio del servidor, y carece de un sistema centralizado de registro de eventos. Cuando ocurre una violación de esquema en el pipe de validación, la excepción se propaga directamente al cliente sin emitir ningún evento de auditoría en los flujos de log del servidor.

#### Cómo Afecta a la Aplicación y al Negocio
1. **Ceguera Operacional para Soporte y SRE:** Los registros de consola en texto plano no pueden ser ingeridos, tokenizados ni filtrados eficientemente por herramientas corporativas de observabilidad como Datadog, ElasticSearch o AWS CloudWatch.
2. **Imposibilidad de Detección Temprana de Incidentes:** Si una nueva versión de una aplicación móvil de la empresa tiene un error en el payload que provoca miles de fallos de validación al día, el equipo de operaciones no tiene forma de correlacionar estos rechazos con la versión del cliente, la dirección IP o el endpoint específico. Tampoco es posible diferenciar entre errores legítimos de integración y ataques de escaneo automatizado que buscan desbordar los validadores.

#### Solución Técnica Detallada (Enfoque Arquitectónico)
Se debe reemplazar la consola estándar por una librería de logging estructurado asíncrono y de alto rendimiento, como **Pino**, integrada mediante el módulo oficial `nestjs-pino`.

Cada evento del servidor debe emitirse como un objeto JSON individual que contenga marcas temporales en formato ISO-8601, el nivel de severidad correspondiente, el contexto del componente emisor y un identificador único de correlación (`correlationId`) propagado desde las cabeceras HTTP de la petición entrante. Adicionalmente, el pipe de validación debe registrar un evento de advertencia cada vez que se rechace un contrato, detallando el esquema evaluado, los nombres de los campos que fallaron y el identificador de cliente, facilitando la creación de dashboards de monitoreo en tiempo real sobre la salud de los contratos.

---

## 3. PLAN DE REMEDIACIÓN Y HOJA DE RUTA ESTRATÉGICA

Se establece un cronograma escalonado en tres fases de intervención para subsanar los hallazgos sin interrumpir la operación del servicio:

```
+-----------------------------------------------------------------------------------------+
| FASE 1: REMEDIACIÓN INMEDIATA (Semana 1) - SEGURIDAD Y HARDENING                        |
| • Activar la directiva USER node y permisos restringidos en el Dockerfile (AUD-06).     |
| • Endurecer la inicialización de Ajv con strict: true y bloqueo de __proto__ (AUD-02).   |
| • Implementar filtro de sanitización de errores bajo estándar RFC 7807 (AUD-04).        |
+-----------------------------------------------------------------------------------------+
                                             |
                                             v
+-----------------------------------------------------------------------------------------+
| FASE 2: ASEGURAMIENTO DEL CICLO DE VIDA (Semanas 2 y 3) - CONTRATOS Y SRE                |
| • Reescribir check-compatibility.js con validación recursiva de enums y rangos (AUD-03).|
| • Integrar logging estructurado en formato JSON con Pino y Correlation ID (AUD-07).     |
| • Configurar suite de pruebas automatizadas para detectar regresiones de esquemas.      |
+-----------------------------------------------------------------------------------------+
                                             |
                                             v
+-----------------------------------------------------------------------------------------+
| FASE 3: EVOLUCIÓN ARQUITECTÓNICA (Mes 2) - ALTA DISPONIBILIDAD Y GOBERNANZA             |
| • Migrar persistencia en memoria hacia PostgreSQL administrado mediante Prisma (AUD-01).|
| • Implementar integración con Schema Registry centralizado para microservicios (AUD-05).|
| • Desplegar monitoreo de métricas de violación de contratos en Prometheus/Grafana.      |
+-----------------------------------------------------------------------------------------+
```

---

## 4. CONCLUSIÓN Y DICTAMEN DEL AUDITOR

El proyecto **Semana 7: Contratos y Validación con JSON Schema** demuestra una comprensión conceptual acertada de la validación declarativa y del diseño guiado por esquemas (*Schema-First*). La estructura modular en NestJS, el uso de borradores recientes de JSON Schema y la automatización del despliegue en Render constituyen un excelente punto de partida.

No obstante, la transición hacia un producto corporativo requiere erradicar de inmediato supuestos de entorno ideales:
* El almacenamiento no puede delegarse a la memoria volátil del servidor.
* Los validadores deben asumir un entorno hostil con protecciones activas contra contaminación de prototipos y fugas de metadatos.
* Los algoritmos de compatibilidad en integración continua deben ser rigurosos para evitar la degradación inadvertida de clientes productivos.

La ejecución del plan de remediación presentado en este informe garantizará que la plataforma alcance los niveles de resiliencia, seguridad y gobernanza indispensables para operar como una infraestructura de misión crítica en el ecosistema empresarial.
