# Documentación Técnica — Backend Cuentas de Cobro (contratistas-nestjs)

> Documento generado el 2026-06-12. Describe el **estado real del código** en la rama `main`, no solo el diseño planeado. Donde el diseño aspiracional (`docs/nuevo-backend-arquitectura.md`) difiere de lo implementado, se indica explícitamente.

---

## 1. Resumen ejecutivo

`cuentas-cobro-api` es un backend **NestJS + Prisma + PostgreSQL** que reemplaza el flujo legacy de **cuentas de cobro** del ecosistema ADA (MFContratistas). Su responsabilidad es manejar el ciclo de vida completo de una cuenta de cobro de un contratista:

```
Contratista radica  →  Supervisor revisa  →  Aprobador aprueba  →  Contabilidad
```

Es un servicio **autónomo con su propia base de datos**, desacoplado de los ~96 endpoints legacy repartidos en 12 microservicios. Mantiene **compatibilidad de contrato de datos** con el frontend legacy (los servicios devuelven estructuras con campos como `idEstado`, `idPago`, `response.body.content`, etc. que el front Angular ya consume).

**Madurez actual:** el núcleo (auth, creación/radicación de cuentas, secciones del contratista) está implementado. El flujo de **supervisor** está parcialmente implementado (solo listado) y el de **aprobador** es un stub vacío.

---

## 2. Stack tecnológico

| Capa | Tecnología | Versión | Notas |
|---|---|---|---|
| Runtime | Node.js | ≥ 22 | definido en `engines` y `.node-version` |
| Framework | NestJS | 11.x | módulos, DI, decoradores |
| Lenguaje | TypeScript | 5.7 | strict, sin `any` salvo casts puntuales |
| ORM | Prisma | 7.8 | schema declarativo + migraciones |
| Driver DB | `@prisma/adapter-pg` + `pg` | 8.21 | adapter PG nativo (no el engine binario) |
| Base de datos | PostgreSQL | — | ACID, `Decimal`, `Bytes`, `Json` |
| Auth | `@nestjs/jwt` + `passport-jwt` | 11.x / 4.x | JWT Bearer, expiración 8h |
| Hashing | `bcrypt` | 6.0 | 10 rounds |
| Validación | `class-validator` + `class-transformer` | — | vía `ValidationPipe` global |
| Docs API | `@nestjs/swagger` | 11.4 | Swagger UI en `/api` |
| HTTP externo | `@nestjs/axios` + `axios` | — | preparado para proxy a servicios legacy (PagoSimple) |
| Tests | Jest + ts-jest + Supertest | 30.x | specs unitarios por módulo |
| Deploy | Railway (`railway.toml`) + Docker Compose | — | Postgres en `docker-compose.yml` |

---

## 3. Arquitectura

### 3.1 Estilo arquitectónico

Arquitectura **modular monolítica por capas**, idiomática de NestJS:

```
HTTP Request
   │
   ▼
┌─────────────────────────────────────────────────┐
│  Guards globales (APP_GUARD)                      │
│   1. JwtAuthGuard   → valida Bearer JWT           │
│   2. RolesGuard     → valida @Roles(...)          │
└─────────────────────────────────────────────────┘
   │
   ▼
┌─────────────┐   DTO + ValidationPipe   ┌──────────────┐
│ Controller  │ ───────────────────────► │   Service    │
│ (routing,   │                          │ (lógica de   │
│  @Roles,    │ ◄─────────────────────── │  negocio)    │
│  Swagger)   │      respuesta           └──────┬───────┘
└─────────────┘                                 │
                                                ▼
                                        ┌──────────────┐
                                        │ PrismaService │
                                        │  (acceso DB)  │
                                        └──────┬───────┘
                                               ▼
                                        ┌──────────────┐
                                        │  PostgreSQL  │
                                        └──────────────┘
```

**Patrón por módulo:** cada feature es un módulo Nest con `*.controller.ts` (rutas + Swagger + `@Roles`), `*.service.ts` (lógica + Prisma) y `dto/` (validación de entrada). No hay capa de repositorio adicional: el `PrismaService` actúa como repositorio compartido (módulo `@Global`-ish, importado donde se necesita).

### 3.2 Seguridad transversal

- **`JwtAuthGuard`** (global vía `APP_GUARD`): exige `Authorization: Bearer <jwt>` salvo en rutas marcadas con `@Public()` (login, dev-token). El secreto es `JWT_SECRET`.
- **`RolesGuard`** (global vía `APP_GUARD`): lee metadata de `@Roles(Rol.X)` y compara contra `user.rol` del payload JWT. Sin `@Roles`, la ruta pasa (solo exige autenticación).
- **`JwtStrategy`** (passport): extrae el token del header, valida expiración y firma, e inyecta el `JwtPayload` en `request.user`.
- **Decoradores de apoyo:** `@CurrentUser()` (extrae el payload), `@Public()`, `@Roles()`.
- **`AuthModule` es `@Global`** → `JwtModule` disponible en toda la app.

**Payload JWT** (`JwtPayload`): `sub`, `nombre`, `codigoTercero`, `userIdentification`, `rol`. El `codigoTercero` es la clave de negocio que enlaza usuario ↔ contratos ↔ cuentas (emitido por el sistema de terceros legacy).

### 3.3 Configuración global (`main.ts`)

- Prefijo global de API: **`/api/v1`**.
- `ValidationPipe` global: `whitelist`, `forbidNonWhitelisted`, `transform` (auto-convierte tipos).
- **Patch de `BigInt.prototype.toJSON`** → serializa los IDs `BigInt` de Prisma como string en las respuestas JSON.
- CORS abierto (ajustar en producción).
- Swagger con Bearer auth en `/api`.

---

## 4. Distribución del código (módulos)

```
src/
├── main.ts                    # Bootstrap, pipes, Swagger, prefijo /api/v1
├── app.module.ts             # Raíz: importa todos los módulos
│
├── prisma/                    # PrismaService (acceso DB compartido)
├── auth/                      # JWT, login, guards, roles, decoradores, dev-token
│
├── contratos/                 # Listado de contratos del contratista (read-only)
├── cuentas-cobro/             # NÚCLEO: crear, listar, radicar, detalle, resumen
│
│   # --- Secciones de una cuenta (todas FK → cuentaCobroId) ---
├── planilla/                  # Planilla de seguridad social (upsert)
├── actividades/               # Actividades del informe + adjuntos (multipart)
├── gastos/                    # Otros gastos + evidencias (multipart)
├── checklist-retefuente/      # Checklist de retención en la fuente
│
│   # --- Flujo de revisión ---
├── supervisor/                # Listado de cuentas radicadas (parcial)
└── aprobador/                 # STUB vacío (no implementado)
```

### 4.1 Responsabilidad por módulo

| Módulo | Estado | Responsabilidad |
|---|---|---|
| `prisma` | ✅ | Conexión PG vía adapter, `$connect` en init |
| `auth` | ✅ | Login, creación de usuarios (rol APROBADOR), dev-token (solo dev), `/me`, guards globales |
| `contratos` | ✅ | `GET /contratos` — lista paginada de contratos del `codigoTercero`, formato legacy `response.body.content` |
| `cuentas-cobro` | ✅ | `POST /` crear borrador, `GET /` listar por contrato, `GET /:id` detalle, `GET /:id/resumen-radicacion`, `POST /:id/radicar` |
| `planilla` | ✅ | `GET/PUT /planilla/:cuentaCobroId` — upsert de planilla SS |
| `actividades` | ✅ | CRUD parcial + descarga de adjuntos (`bytea`), límite 10 MB |
| `gastos` | ✅ | Igual patrón que actividades (gastos adicionales + evidencia) |
| `checklist-retefuente` | ✅ | `GET` (auto-inicializa) + `PATCH` (actualización batch) |
| `supervisor` | ⚠️ Parcial | Solo `GET /supervisor/cuentas-cobro` (lista RADICADAs asignadas). Faltan aprobar/devolver/informe |
| `aprobador` | ❌ Stub | Controller vacío; sin endpoints |

### 4.2 Inventario real de endpoints (lo que existe hoy)

| Método | Ruta (`/api/v1` + ...) | Rol | Descripción |
|---|---|---|---|
| POST | `/auth/login` | público | Login user/password → JWT |
| POST | `/auth/usuarios` | APROBADOR | Crear contratista/supervisor/aprobador |
| POST | `/auth/dev-token` | público (solo `NODE_ENV=development`) | Token con cualquier rol |
| GET | `/auth/me` | autenticado | Devuelve el payload del token |
| GET | `/contratos` | CONTRATISTA | Lista contratos del contratista |
| POST | `/cuentas-cobro` | CONTRATISTA | Crear borrador |
| GET | `/cuentas-cobro` | CONTRATISTA | Listar cuentas por contrato (paginado) |
| GET | `/cuentas-cobro/:id` | CONTRATISTA, SUPERVISOR, APROBADOR | Detalle completo (con autorización por rol) |
| GET | `/cuentas-cobro/:id/resumen-radicacion` | CONTRATISTA | Resumen previo a radicar |
| POST | `/cuentas-cobro/:id/radicar` | CONTRATISTA | Valida y transiciona BORRADOR → RADICADA |
| GET | `/planilla/:cuentaCobroId` | CONTRATISTA, SUPERVISOR | Ver planilla SS |
| PUT | `/planilla/:cuentaCobroId` | CONTRATISTA | Upsert planilla SS |
| GET | `/actividades/:cuentaCobroId` | CONTRATISTA | Listar actividades |
| POST | `/actividades/:cuentaCobroId` | CONTRATISTA | Crear actividad + adjunto (multipart, ≤10 MB) |
| DELETE | `/actividades/:actividadId` | CONTRATISTA | Eliminar actividad y adjunto |
| GET | `/actividades/adjunto/:adjuntoId` | CONTRATISTA | Descargar adjunto |
| GET/POST/DELETE | `/gastos/...` | CONTRATISTA | Igual patrón (gastos + evidencia) |
| GET | `/checklist-retefuente/:cuentaCobroId` | CONTRATISTA, SUPERVISOR | Ver/inicializar checklist |
| PATCH | `/checklist-retefuente/:cuentaCobroId` | CONTRATISTA | Actualizar respuestas en bloque |
| GET | `/supervisor/cuentas-cobro` | SUPERVISOR | Listar cuentas RADICADAS asignadas |

> Nota: el documento `docs/nuevo-backend-arquitectura.md` lista muchos endpoints adicionales (aprobar/devolver, informe-supervisión, ejecución física, adjuntos genéricos, proxy PagoSimple). Esos son **diseño planeado, aún no implementado**.

---

## 5. Modelo de datos

### 5.1 Diagrama entidad-relación (textual)

```
                          ┌──────────────┐
                          │   Usuario    │   (auth: username, passwordHash, rol,
                          │              │    codigoTercero, userIdentification)
                          └──────────────┘
                                 · (sin FK; se enlaza por codigoTercero lógico)

┌──────────────┐  1     N  ┌─────────────────────────────────┐
│  Contrato    │──────────►│         CuentaCobro             │
│              │           │  (raíz del agregado)            │
│ codigoContrato (UQ)      │  estado: EstadoCuentaCobro      │
│ codigoTercero            │  ticket (UQ, autoincrement)     │
│ valor, plazoDias, ...    │  codigoContrato → Contrato      │
└──────────────┘           │  codigoTercero / ...Supervisor  │
                           └───┬───┬───┬───┬───┬───┬───┬─────┘
            1:N ┌──────────────┘   │   │   │   │   │   └──────────┐ 1:1
                ▼          1:N ┌────┘   │   │   │   └────┐ 1:1     ▼
        ┌───────────────┐     ▼   1:N  ▼   ▼  1:1 ▼   ┌───────────────────┐
        │ HistorialEstado│ ┌─────────┐ │ ┌─────────┐ │ │ InformeSupervision│
        └───────────────┘ │Actividad│ │ │OtroGasto│ │ │  (contenido Json) │
                          └────┬────┘ │ └────┬────┘ │ └───────────────────┘
                          1:N  │      │  1:N │      │
                               ▼      │      ▼      │
                          ┌─────────────────────────┐   ┌──────────────┐
                          │        Adjunto          │   │   Planilla   │ 1:1
                          │ (cuentaCobroId + opcional│   └──────────────┘
                          │  actividadId / gastoId;  │   ┌──────────────────┐
                          │  datos: bytea o urlStorage)  │ChecklistRetefuente│ 1:N
                          └─────────────────────────┘   └──────────────────┘
                                                         ┌──────────────┐
                                                         │EjecucionFisica│ 1:1
                                                         └──────────────┘
```

### 5.2 Entidades

**`CuentaCobro`** — raíz del agregado. Una cuenta pertenece a un `Contrato` (vía `codigoContrato`) y a un contratista (`codigoTercero`). Acumula todas las secciones. Campos clave: `estado` (máquina de estados), `ticket` (consecutivo único), `valorCobrado`, `fechaInicio/fechaFin` (período válido para radicar), `declaracion`.

**`Contrato`** — réplica local del contrato (datos espejados del sistema de contratos legacy): valor, plazo, supervisor, dependencia, saldos. Indexado por `codigoTercero`.

**`Usuario`** — autenticación local. `rol` ∈ {CONTRATISTA, SUPERVISOR, APROBADOR}. `codigoTercero` + `userIdentification` enlazan al usuario con el dominio de negocio. **No hay FK** entre `Usuario` y `Contrato/CuentaCobro`; el vínculo es lógico vía `codigoTercero`.

**`HistorialEstado`** — bitácora append-only de transiciones (`estadoAnterior`, `estadoNuevo`, `usuarioId`, `usuarioNombre`, `observacion`). Es la trazabilidad de auditoría del workflow.

**Secciones de la cuenta** (todas FK → `cuentaCobroId`, cada una con `estadoRevision: EstadoSeccion`):
- `Planilla` (1:1) — seguridad social: IBC, aportes salud/pensión/ARL, planilla PILA.
- `ChecklistRetefuente` (1:N) — ítems de checklist de retención (`kaNlCumple`).
- `Actividad` (1:N) — actividades del informe, con adjuntos.
- `OtroGasto` (1:N) — gastos adicionales, con evidencias.
- `EjecucionFisica` (1:1) — porcentaje de avance + justificación.
- `InformeSupervision` (1:1) — informe del supervisor (`contenido: Json`).

**`Adjunto`** — archivos. Pertenece siempre a una `CuentaCobro` y opcionalmente a una `Actividad` o un `OtroGasto`. Estrategia MVP: bytes en columna `bytea` (`datos`); preparado para migrar a object storage (`urlStorage`).

### 5.3 Enums

```
Rol:                CONTRATISTA | SUPERVISOR | APROBADOR

EstadoCuentaCobro:  BORRADOR | RADICADA | EN_REVISION_SUPERVISOR |
                    DEVUELTA_CONTRATISTA | APROBADA_SUPERVISOR |
                    EN_REVISION_APROBADOR | RECHAZADA_APROBADOR |
                    APROBADA_FINAL | ENVIADA_CONTABILIDAD

EstadoSeccion:      PENDIENTE | APROBADO | RECHAZADO | SIN_OBSERVACIONES
```

### 5.4 Convenciones de modelado

- IDs `BigInt @default(autoincrement())` (serializados a string por el patch en `main.ts`).
- Mapeo `camelCase` (Prisma) ↔ `snake_case` (tabla/columna) vía `@map`/`@@map`.
- Dinero: `Decimal(18,2)`; porcentajes: `Decimal(5,2)`.
- Timestamps: `createdAt` (`@default(now())`) y `updatedAt` (`@updatedAt`).
- Índices en claves de búsqueda frecuente (`codigoTercero`, `codigoContrato`).

---

## 6. Máquina de estados (workflow)

**Diseño completo planeado:**

```
BORRADOR ──radicar──► RADICADA ──supervisor toma──► EN_REVISION_SUPERVISOR
                          ▲                              │
                          │                              ├─► DEVUELTA_CONTRATISTA ──subsanar──► RADICADA
              (subsanar)  └──────────────────────────────┤
                                                          └─► APROBADA_SUPERVISOR ──auto──► EN_REVISION_APROBADOR
                                                                                                │
                                            RECHAZADA_APROBADOR ◄── rechazar ──────────────────┤
                                                                                                └─► APROBADA_FINAL ──► ENVIADA_CONTABILIDAD
```

**Implementado hoy:** únicamente `BORRADOR → RADICADA` (en `cuentas-cobro.service.radicar`). Las demás transiciones aún no tienen endpoint.

**Validaciones al radicar** (`radicar()`):
1. La fecha actual debe estar dentro de `[fechaInicio, fechaFin]`.
2. La cuenta debe pertenecer al `codigoTercero` del usuario.
3. Estado debe ser `BORRADOR`.
4. ≥ 1 actividad registrada.
5. Planilla SS registrada.
6. Checklist con ≥ 6 ítems y **ninguno sin responder**.

Todo en una **transacción Prisma** que actualiza el estado + `fechaSolicitud` y crea el registro de `HistorialEstado`.

### Decisión de negocio pendiente
¿Qué ocurre cuando el **aprobador rechaza**? ¿Vuelve a supervisor o directo al contratista? No está definido (ver `docs/nuevo-backend-arquitectura.md`, sección final).

---

## 7. Compatibilidad con el legacy

El backend está diseñado para ser **drop-in** del frontend Angular existente sin reescribir sus modelos de dominio. Por eso los servicios transforman la salida a formatos legacy:

- `cuentas-cobro.service` mapea `EstadoCuentaCobro` → `{ idEstado, estado }` legacy (tabla `ESTADO_LEGACY`), y deriva `disponibleParaRadicar` / estado `INACTIVA`/`PENDIENTE` según el período.
- `contratos.service` envuelve la respuesta en `{ response: { body: { content, totalElements, ... } } }` para imitar la paginación Spring del backend antiguo.
- PagoSimple (PILA) se concibe como **proxy** al servicio `gestion-contratistas`, no se reimplementa (aún no codificado).

---

## 8. Despliegue y configuración

- **`docker-compose.yml`**: PostgreSQL local para desarrollo.
- **`railway.toml`**: configuración de deploy en Railway.
- **Build**: `prisma generate && nest build`; arranque prod: `node dist/main`.
- **Migraciones**: `prisma/migrations/` (init, usuarios, contratos). Seed en `prisma/seed.ts`.
- **Variables de entorno** (`.env.example`): `DATABASE_URL`, `JWT_SECRET`, `JWT_EXPIRES_IN` (default 8h), `PORT` (default 3000), `NODE_ENV`.

---

## 9. Mejoras recomendadas

### 9.1 Funcionalidad incompleta (prioridad alta)
1. **Implementar el flujo de supervisor**: aprobar (`APROBADA_SUPERVISOR`), devolver (`DEVUELTA_CONTRATISTA`) con observaciones por sección, informe de supervisión, revisión por `estadoRevision` de cada sección.
2. **Implementar el módulo aprobador** (hoy stub): listar, aprobar (`APROBADA_FINAL`), rechazar (`RECHAZADA_APROBADOR`), y la transición a `ENVIADA_CONTABILIDAD`.
3. **Definir y codificar la transición de rechazo del aprobador** (decisión de negocio pendiente).
4. **Completar CRUD de secciones**: editar actividades (solo hay crear/eliminar), ejecución física (endpoints), proxy PagoSimple.

### 9.2 Arquitectura y mantenibilidad
5. **Centralizar la máquina de estados**: hoy la lógica de transición vive en `radicar()`. A medida que crezca, extraer un `EstadoWorkflowService` con una tabla de transiciones válidas (qué rol puede pasar de qué estado a cuál) evita estados inconsistentes.
6. **Extraer la lógica de autorización por recurso**: el chequeo "esta cuenta es de mi `codigoTercero`/soy su supervisor" se repite en varios services (`findOne`, `resumenRadicacion`, `radicar`, planilla...). Centralizar en un guard/policy o un helper de dominio (`assertPuedeVer(cuenta, user)`).
7. **Capa de mapeo/serialización explícita**: las transformaciones a formato legacy están inline en los services. Mover a *mappers*/*presenters* dedicados mejora testeo y desacopla el contrato legacy del dominio.
8. **Estandarizar el formato de respuesta**: hoy conviven `{ success, message, data }`, `{ response: { body } }` y entidades crudas. Definir un envelope consistente (o un interceptor) facilita el consumo y la migración fuera del legacy.

### 9.3 Datos e integridad
9. **FK explícita Usuario ↔ dominio**: el vínculo por `codigoTercero` es solo lógico. Considerar relaciones o al menos índices/constraints para integridad referencial.
10. **`codigoTerceroSupervisor` se asigna ¿dónde?**: la cuenta filtra por supervisor pero no se ve dónde se setea al crear/radicar. Verificar que se popula (si no, el supervisor nunca verá cuentas).
11. **Archivos en `bytea`**: viable para MVP pero infla la DB y el backup. Migrar a object storage (MinIO/S3) usando el campo `urlStorage` ya previsto, antes de producción.

### 9.4 Seguridad
12. **CORS abierto** (`enableCors()` sin opciones): restringir orígenes en producción.
13. **`JWT_SECRET` sin validación de arranque**: si falta, el server arranca y falla en runtime. Validar config al boot (`@nestjs/config` con schema Joi/zod).
14. **`dev-token` endpoint**: bien protegido por `NODE_ENV`, pero asegurar que `NODE_ENV` nunca quede en `development` en prod (validación de config).
15. **Rate limiting / throttling** en login (`@nestjs/throttler`) para mitigar fuerza bruta.
16. **Refresh tokens / expiración**: hoy solo access token de 8h. Evaluar refresh para mejor UX/seguridad.

### 9.5 Calidad y operación
17. **Tests de integración del workflow** (e2e) cubriendo transiciones y autorización por rol, no solo specs unitarios con mocks.
18. **Manejo de errores uniforme**: filtro de excepciones global con códigos de error de negocio.
19. **Logging estructurado + health check** (`/health` con readiness de DB) para Railway.
20. **Paginación por cursor** en listados grandes (hoy offset, que degrada con volumen).
21. **Observabilidad**: métricas por estado (cuántas cuentas en cada etapa), tiempos de aprobación.

