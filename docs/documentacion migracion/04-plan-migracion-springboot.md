# Plan de migración: NestJS → Java 21 + Spring Boot 3.x

## Contexto

`cuentas-cobro-api` es un backend NestJS 11 + Prisma 7 (~5.800 LOC de producción, ~2.500 de tests)
que gestiona el ciclo de vida de **cuentas de cobro de contratistas**: radicación, doble revisión
(supervisor + aprobador), planilla de aportes, checklist de retefuente, actividades, gastos,
ejecución física, adjuntos y un registro de contratistas con **extracción de PDF** (RUT y certificado
bancario). 13 tablas en PostgreSQL, máquina de estados de 9 estados, 5 roles, auth JWT.

La migración responde a un **mandato institucional** (estándar corporativo Java/Spring): la decisión
de *si* migrar ya está tomada, así que este plan se enfoca en *cómo* hacerlo con el menor riesgo.
Dos hechos cambian todo el enfoque frente a una migración típica:

1. **No hay frontend en producción.** No existe contrato congelado que proteger → tenemos libertad
   para **limpiar el contrato actual** (que hoy es frágil) en vez de replicar sus defectos.
2. **Quien ejecuta es principiante en Spring** (viene de Node/Nest). El cronograma debe ser
   conservador y el plan debe optimizar para *aprender el patrón una vez y repetirlo*, no para
   velocidad.

El resultado esperado: un backend Spring Boot funcionalmente equivalente, con el mismo esquema
PostgreSQL gobernado por Flyway, mismo comportamiento de negocio, y un contrato REST más limpio.

---

## Veredicto brutal (léelo antes que nada)

- **El código no es el riesgo. La curva de aprendizaje sí lo es.** Portar 5.800 LOC de
  *transaction scripts* sobre un ORM es mecánico. Pero hacerlo *mientras aprendes* Spring Data JPA,
  Spring Security, el ciclo de vida de transacciones de JPA y MapStruct multiplica el tiempo. No te
  vendas la idea de "es el mismo CRUD en otro lenguaje": Spring tiene trampas (lazy loading,
  `@Transactional` proxies, equals/hashCode en entidades, N+1) que Prisma te ocultaba.

- **La extracción posicional de PDF es el único trabajo genuinamente difícil, y no se porta 1:1.**
  `RutPdfParser` y `CertificadoBancarioParser` anclan cada valor a la posición (x,y) de su etiqueta,
  usando `pdfjs-dist`. En Java el equivalente es **Apache PDFBox**, cuyo sistema de coordenadas y
  modelo de `TextPosition` es distinto. Esto se **reescribe y se re-valida desde cero contra PDFs
  reales** (RUT DIAN, certificados Bancolombia, etc.). Estima esto en semanas, no en días, y necesita
  fixtures de PDF reales antes de empezar. Si no tienes esos PDFs, el plan se bloquea aquí.

- **No apliques arquitectura hexagonal a TODO el sistema** aunque el doc de stack la sugiera. Para un
  principiante, montar puertos/adaptadores + MapStruct en cada CRUD es ceremonia que matará el
  cronograma sin aportar valor. Recomendación: **capas pragmáticas** (controller → service →
  repository) en los módulos CRUD, y reservar hexagonal **solo** donde hay frontera real con el
  exterior: extracción de PDF, gateway de presupuesto y la futura integración PagoSimple. Esto sí
  está alineado con el espíritu del doc (que ya usa el patrón puerto en `PresupuestoGateway`).

- **El contrato REST actual está sucio; arréglalo ahora que puedes.** Hoy hay un envelope hecho a
  mano (`{ success, message, data, totalElementos, paginaActual, tamañoPagina, ... timestamp }`) con
  una clave **`tamañoPagina` con ñ**, e IDs serializados inconsistentemente (`BigInt.toJSON → string`
  global en `src/main.ts`, pero a veces `Number(c.id)` y a veces string en el mismo servicio — ver
  `src/supervisor/supervisor/supervisor.service.ts`). Sin frontend, **no repliques esto**: define un
  envelope limpio y consistente y serializa IDs de un solo modo. Si lo replicas, arrastras deuda a un
  sistema nuevo por nada.

- **`Adjunto.datos` guarda archivos binarios dentro de la base de datos (`bytea`).** Es mala práctica
  que infla la DB y complica backups. La migración es el momento de moverlo a object storage
  (S3/MinIO/disco) dejando solo `urlStorage`. Si no quieres tocarlo, JPA lo soporta con `byte[]`/`@Lob`,
  pero déjalo registrado como deuda.

- **PagoSimple todavía es un mock**, no una integración HTTP real (ver campos `pagosimple_mock` en el
  esquema y los DTOs `confirmar-pagosimple-mock`, `generar-pagosimple-test`). No migres una
  integración que no existe: porta el mock tal cual detrás de un puerto y listo. `@nestjs/axios` está
  declarado pero no se usa en serio.

---

## Inventario y mapeo tecnológico

| Pieza NestJS actual | Equivalente Spring Boot | Notas / riesgo |
|---|---|---|
| NestJS módulos/DI | Spring `@Component`/`@Service` + componente-scan | Mecánico |
| Prisma Client + schema | **Spring Data JPA + entidades `@Entity`** | Mecánico pero voluminoso (13 entidades) |
| Migraciones Prisma (12) | **Flyway** | **Baseline:** generar `V1__baseline.sql` con el `pg_dump --schema-only` del esquema actual; NO reescribir las 12 migraciones |
| `class-validator` DTOs | **Jakarta Bean Validation** (`@NotNull`, `@Size`...) | Mecánico, 29 DTOs |
| `passport-jwt` + guards | **Spring Security resource server (JWT)** + `@PreAuthorize` | Curva alta para principiante |
| Decorators `@Public`, `@CurrentUser`, `@Roles`, `PasswordChangeGuard` | `SecurityFilterChain` + `HandlerMethodArgumentResolver` + method security | Reescritura de la capa de seguridad completa |
| `bcrypt` | `BCryptPasswordEncoder` (Spring Security) | Compatible — los hashes existentes siguen validando |
| `@nestjs/swagger` | **springdoc-openapi** | Mecánico |
| Multer (`Express.Multer.File`) | `MultipartFile` | Mecánico |
| `pdfjs-dist` (parsing posicional) | **Apache PDFBox** | **Riesgo más alto**, reescritura + re-validación |
| `PresupuestoGateway` (puerto) | Interfaz Java + adaptador `@Component` | Ya es hexagonal; traducción directa |
| Envelope de respuesta a mano | DTO de respuesta + `@JsonProperty` / `ResponseEntity` | Oportunidad de limpieza |
| BigInt PKs (`@id`) | `Long` (`@Id @GeneratedValue IDENTITY`) | Decidir serialización JSON (number vs string) explícitamente |
| `Decimal(18,2)` | `BigDecimal` | Cuidado con escala y redondeo |
| Enums Postgres (`Rol`, `EstadoCuentaCobro`, `EstadoSeccion`) | `@Enumerated(EnumType.STRING)` + tipo enum PG | Mapear a tipo nativo o a `varchar` con check |
| `InformeSupervision.contenido` (`Json`) | `jsonb` vía **hypersistence-utils** (`@Type(JsonType.class)`) | JPA no mapea jsonb sin librería extra |
| `Adjunto.datos` (`Bytes`/bytea) | `byte[] @Lob` **o** mover a object storage | Recomiendo lo segundo |
| `ticket` (segunda secuencia autoincrement) | Segunda secuencia PG + `@GeneratedValue(SEQUENCE)` | Detalle fácil de olvidar |

---

## Riesgos rankeados (de mayor a menor)

1. **Extracción posicional de PDF (PDFBox).** Reescritura no trivial + necesita PDFs reales de
   fixture. Bloqueante si no hay muestras. → *Mitigación: empezar un spike de PDFBox AISLADO en
   semana 1, antes de comprometer cronograma.*
2. **Curva de Spring Security + JWT** para un principiante. La seguridad mal hecha es un agujero, no
   solo un bug. → *Mitigación: implementarla en el primer vertical slice con revisión de alguien con
   experiencia.*
3. **Semántica de transacciones y lazy-loading en JPA.** Prisma materializaba todo; JPA no. Riesgo de
   `LazyInitializationException`, N+1 y estados inconsistentes en la máquina de estados.
   → *Mitigación: `@Transactional` explícito en services, fetch joins, tests de integración con DB real.*
4. **Paridad de la máquina de estados de cuentas de cobro** (9 estados, transiciones validadas en
   supervisor/aprobador). Un error aquí corrompe datos financieros. → *Mitigación: tests que cubran
   cada transición y cada rechazo de transición inválida.*
5. **Mapeo de tipos PostgreSQL** (jsonb, bytea, decimal, enums, doble secuencia). Errores silenciosos.
6. **Baseline de Flyway** sobre el esquema existente sin perder datos.

---

## Estrategia de corte recomendada

**Reescritura limpia "big-bang" por módulos, con vertical-slice primero. NO strangler proxy.**

Justificación honesta: el strangler (correr ambos backends tras un gateway y migrar endpoint por
endpoint) solo se justifica cuando hay tráfico de producción que no puede caerse. Aquí **no hay
frontend en producción**, así que el costo del proxy + doble despliegue + sincronización de datos no
compra nada. Big-bang limpio es lo correcto.

El orden importa para un principiante: **primero un slice vertical completo y delgado** para aprender
el patrón end-to-end, luego repetirlo en los módulos restantes.

- **Slice 0 (vertical, el más importante):** `Auth` + `Contratos` (lectura). Esto ejercita: entidad
  JPA + repositorio + Flyway baseline + Spring Security/JWT + un controller + Swagger + Docker
  Compose con Postgres + un test de integración. Cuando este slice funciona end-to-end, ya conoces
  el 80% del patrón que repetirás.

---

## Plan por fases

### Fase 1 — Andamiaje (proyecto vacío que arranca)
- Proyecto Spring Boot 3.x / Java 21 (Maven o Gradle), dependencias: web, data-jpa, security,
  validation, postgresql, flyway, springdoc-openapi, lombok, mapstruct, hypersistence-utils,
  pdfbox, junit5, mockito, testcontainers.
- `docker-compose.yml` con Postgres + servicio backend (como pide el doc de stack).
- **Flyway baseline:** `pg_dump --schema-only` del esquema actual → `V1__baseline.sql`. Verificar que
  Flyway valida contra la DB existente sin recrear.
- Config base: `application.yml`, propiedades JWT (issuer/secret/expiración), perfil `local`.
- Criterio de salida: la app levanta, conecta a Postgres, Swagger UI responde.

### Fase 2 — Spike de extracción de PDF (en paralelo, aislado)
- Probar PDFBox con un PDF RUT real y un certificado bancario real: ¿se puede extraer texto con
  coordenadas equivalentes? Reescribir `PdfTextExtractor` (líneas + items posicionales).
- Portar `RutPdfParser` y `CertificadoBancarioParser` como **unidades puras** (igual que hoy: reciben
  items/texto, no tocan I/O) con tests sobre fixtures.
- Criterio de salida: dado el mismo PDF, la salida coincide con la del backend Nest. **Si este spike
  falla, se renegocia el alcance antes de seguir.**

### Fase 3 — Slice vertical 0: Auth + Contratos
- Entidades `Usuario`, `Contrato`, `PrecargaTercero`. Repositorios JPA.
- Spring Security: filtro JWT, `BCryptPasswordEncoder`, resolver de usuario actual, method security
  por rol, manejo de `mustChangePassword`.
- Controllers de auth (login, cambio de password, dev-token) y contratos (listar/obtener supervisor).
- **Decidir y fijar aquí el contrato REST limpio** (envelope + serialización de IDs) y documentarlo.
- Tests de integración con Testcontainers.
- Criterio de salida: login → JWT → endpoint protegido funciona end-to-end.

### Fase 4 — Núcleo de cuentas de cobro y máquina de estados
- Entidades `CuentaCobro`, `HistorialEstado` y secciones (`Planilla`, `ChecklistRetefuente`,
  `Actividad`, `OtroGasto`, `EjecucionFisica`, `Adjunto`, `InformeSupervision`).
- Services de `CuentasCobro`, `Supervisor`, `Aprobador` con **toda la máquina de estados** y la doble
  revisión (`estadoRevision` / `estadoRevisionAprobador`). Este es el corazón del sistema.
- Tests exhaustivos de transiciones válidas e inválidas.
- Decidir `Adjunto.datos`: object storage (recomendado) vs `byte[]`.

### Fase 5 — Módulos restantes
- `Planilla` (incluye el **mock de PagoSimple** detrás de un puerto), `Actividades`, `Gastos`,
  `ChecklistRetefuente`, `Presupuesto` (puerto + adaptador local sobre `precarga_terceros`).
- `RegistroContratistas`: integrar la extracción de PDF de la Fase 2 + finalización de registro.

### Fase 6 — Endurecimiento y paridad
- CORS, prefijo global `api/v1`, manejo global de excepciones (`@ControllerAdvice`) equivalente a los
  `BadRequestException`/`ForbiddenException` actuales.
- Suite de tests de paridad: para endpoints clave, comparar respuestas Nest vs Spring (con el
  contrato limpio ya acordado, no idéntico al viejo).
- Dockerización final, seed del usuario admin (vía Flyway `V2__seed_admin` o `CommandLineRunner`).

---

## Cronograma realista (principiante en Spring, una persona)

Rangos conservadores, no compromisos. Un experto en Spring lo haría en ~40% de esto.

| Fase | Esfuerzo estimado |
|---|---|
| 1 — Andamiaje + Flyway baseline | 1 semana (incluye aprender el setup) |
| 2 — Spike PDF (PDFBox) | 1–3 semanas (depende de disponer de PDFs reales) |
| 3 — Slice vertical (Auth+Contratos) | 2 semanas (aquí se aprende Security, lo más duro) |
| 4 — Cuentas de cobro + máquina de estados | 3–4 semanas |
| 5 — Módulos restantes | 3–4 semanas |
| 6 — Endurecimiento + paridad + Docker | 1–2 semanas |
| **Total** | **~11–16 semanas** a tiempo completo |

Brutal: si alguien te prometió "esto es un mes", está ignorando la curva de Spring y el spike de PDF.

---

## Lo que NO deberías hacer (anti-alcance)

- **No** hexagonal completo en módulos CRUD. Solo en fronteras externas (PDF, presupuesto, PagoSimple).
- **No** replicar el envelope sucio ni la clave `tamañoPagina`. No hay frontend; límpialo.
- **No** migrar una integración real de PagoSimple: hoy es mock. Porta el mock.
- **No** reescribir las 12 migraciones Prisma a Flyway una por una: baseline con un dump.
- **No** intentes paridad byte-a-byte con el contrato viejo; busca paridad *funcional*.

## Decisiones abiertas a confirmar antes de Fase 3

- ¿Maven o Gradle? (recomiendo Maven por familiaridad institucional / menos curva).
- ¿`Adjunto.datos` se mueve a object storage o se deja `byte[]` en DB?
- ¿Serialización de IDs en JSON: `number` o `string`? (recomiendo `number`/`Long` plano, ya que no
  hay precisión >2^53 esperada en estos volúmenes — confirmar).

---

## Verificación (cómo sabremos que funciona)

1. **Esquema:** Flyway aplica `V1__baseline` contra una copia de la DB actual sin recrear ni perder
   datos; `flyway validate` pasa.
2. **Por módulo:** tests de integración con **Testcontainers** (Postgres real) cubriendo cada
   service. La máquina de estados con un test por transición y por rechazo de transición inválida.
3. **PDF:** dado un set de PDFs reales (RUT + certificado), la salida del parser Java coincide con la
   del parser Nest (comparación de DTO).
4. **End-to-end:** `docker compose up` levanta Postgres + backend; recorrer el flujo completo
   (login → radicar cuenta → revisión supervisor → revisión aprobador → liquidar) vía Swagger /
   colección de requests, comparando contra el comportamiento del backend Nest corriendo en paralelo
   en local.
5. **Seguridad:** un endpoint protegido rechaza sin JWT, rechaza con rol incorrecto, y respeta
   `mustChangePassword`.
