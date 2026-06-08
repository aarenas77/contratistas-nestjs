# Arquitectura: Nuevo backend para cuentas de cobro

## Contexto

El sistema actual (MFContratistas) consume ~96 endpoints repartidos en al menos 12 microservicios distintos del ecosistema ADA. El flujo de cuenta de cobro ya existe en el frontend pero depende de backends legacy con contratos de datos complejos (`contratistas-solicitud`, `contratistas-aprobacion-rechazo`, `contratistas-informe-supervisor`, etc.).

El objetivo es construir un **nuevo backend limpio y autónomo** que maneje el ciclo de vida completo de la cuenta de cobro: radicación (contratista) → revisión (supervisor) → aprobación (aprobador), con su propia base de datos, desacoplado del ecosistema legacy.

---

## Inventario de endpoints actuales del frontend

### Base URL del gateway
```
https://ecosystem-gateway-dev.adacsc.co
```

### Endpoints por módulo

#### Autenticación (`auth-service`)
| Método | Endpoint | Descripción |
|---|---|---|
| POST | `/auth/login/token` | Login con usuario y contraseña |
| POST | `/auth/login/email-reset-password` | Solicitar reset de contraseña |
| POST | `/auth/login/user-email-code` | Validar OTP |
| POST | `/auth/login/save-user-pass` | Guardar nueva contraseña |

#### Registro de contratista (`gestion-contratistas`)
| Método | Endpoint | Descripción |
|---|---|---|
| GET | `/gestion-contratistas/catalogos/bancos` | Lista de bancos |
| GET | `/gestion-contratistas/catalogos/tipos-cuenta` | Tipos de cuenta bancaria |
| GET | `/gestion-contratistas/catalogos/entidades-salud` | EPS |
| GET | `/gestion-contratistas/catalogos/entidades-arl` | ARL |
| GET | `/gestion-contratistas/catalogos/entidades-pension` | Fondos de pensión |
| POST | `/gestion-contratistas/onboarding/extraer-documentos` | Extracción de datos del RUT (PDF) |
| GET | `/gestion-contratistas/onboarding/seguridad-social` | Consulta afiliación SS |
| POST | `/gestion-contratistas/onboarding/registrar` | Registro definitivo del contratista |

#### Contratos (`contratistas-contrato`)
| Método | Endpoint | Descripción |
|---|---|---|
| POST | `/contratistas-contrato/contratos-contratista` | Listar contratos del contratista (paginado + filtros) |
| GET | `/contratistas-contrato/conceptos-otros-gastos` | Catálogo de conceptos para gastos adicionales |

#### Plan de pagos (`contratista-plan-pagos`)
| Método | Endpoint | Descripción |
|---|---|---|
| GET | `/contratista-plan-pagos/contracts/{idContrato}/payments` | Plan de pagos del contrato |

#### Supervisor del contrato (`contrato-supervisor`)
| Método | Endpoint | Descripción |
|---|---|---|
| GET | `/contrato-supervisor/supervisor` | Datos del supervisor asignado al contrato |

#### Cuenta de cobro — legacy (`contratistas-solicitud`)
| Método | Endpoint | Descripción |
|---|---|---|
| GET | `/contratistas-solicitud/parametros-contrataciones` | Parámetros (porcentajes SS) |
| GET | `/contratistas-solicitud/informacion-cuenta-contratista` | Info base para crear cuenta |
| PUT | `/contratistas-solicitud/proceso-enviar-solicitud` | Radicar cuenta de cobro |
| GET | `/contratistas-solicitud/detalle-cuenta-cobro` | Detalle de una cuenta |
| GET | `/contratistas-solicitud/consultar-actividades-cuenta-cobro` | Actividades del informe |
| POST | `/contratistas-solicitud/crear-actividad-cuenta-cobro` | Crear actividad |
| PUT | `/contratistas-solicitud/editar-actividad-cuenta-cobro` | Editar actividad |
| DELETE | `/contratistas-solicitud/eliminar-actividad-cuenta-cobro` | Eliminar actividad |
| PUT | `/contratistas-solicitud/revisar-actividades-cuenta-cobro` | Revisión supervisor |

#### Cuenta de cobro — legacy (`gestion-contratistas/solicitudes`)
| Método | Endpoint | Descripción |
|---|---|---|
| GET | `/gestion-contratistas/contratistas/{c}/cuentas-cobro` | Historial de cuentas |
| GET | `/gestion-contratistas/solicitudes/{id}/historial` | Historial de estados |
| GET | `/gestion-contratistas/solicitudes/{id}/checklist-retefuente` | Checklist retención |
| GET | `/gestion-contratistas/solicitudes/{id}/gastos-adicionales` | Gastos adicionales |
| POST | `/gestion-contratistas/solicitudes/{id}/gastos-adicionales` | Crear gasto adicional |
| GET | `/gestion-contratistas/solicitudes/{id}/ejecucion-fisica` | Ejecución física |
| PUT | `/gestion-contratistas/solicitudes/{id}/ejecucion-fisica` | Actualizar ejecución |
| POST | `/gestion-contratistas/solicitudes/{id}/aprobar` | Supervisor aprueba |
| POST | `/gestion-contratistas/solicitudes/{id}/devolver-contratista` | Supervisor devuelve |
| GET | `/gestion-contratistas/solicitudes/{id}/informe-supervision` | Informe supervisión |
| POST | `/gestion-contratistas/solicitudes/{id}/informe-supervision` | Guardar informe |
| GET | `/gestion-contratistas/solicitudes/tercero/{c}` | Procesos del supervisor |

#### Supervisor dashboard
| Método | Endpoint | Descripción |
|---|---|---|
| GET | `/gestion-contratistas/supervisores/{c}/carga` | Carga del supervisor |
| GET | `/gestion-contratistas/supervisores/{c}/cuentas/conteo` | Conteo de cuentas |
| GET | `/gestion-contratistas/contratistas/{c}/cuentas/resumen` | Resumen de cuentas |
| GET | `/gestion-contratistas/contratistas/{c}/devoluciones` | Devoluciones |

#### Aprobación
| Método | Endpoint | Descripción |
|---|---|---|
| GET | `/contratistas-aprobacion-rechazo/consultar-cuota-pago` | Consultar cuota |
| POST | `/contratistas-aprobacion-rechazo/guardar-cuota-pago` | Guardar cuota |
| PUT | `/contratistas-informe-supervisor/actualizar-solicitud-informe-supervision` | Actualizar informe |

#### PagoSimple PILA (`gestion-contratistas/api/v1/pago-simple`)
| Método | Endpoint | Descripción |
|---|---|---|
| POST | `/api/v1/pago-simple/aportantes/independiente/vincular` | Vincular aportante en PagoSimple |
| POST | `/api/v1/pago-simple/planillas/validar` | Generar archivo PILA y validar |
| GET | `/api/v1/pago-simple/payroll/total/{payrollNumber}` | Consultar totales de planilla |
| GET | `/api/v1/pago-simple/payroll/payment/{payrollNumber}` | Generar URL de pago PSE |

#### Facilitador / Admin
| Método | Endpoint | Descripción |
|---|---|---|
| GET | `/gestion-contratistas/aprobacion/pendientes` | Pendientes de aprobación facilitador |
| GET | `/gestion-contratistas/aprobacion/rechazados` | Rechazados |
| GET | `/gestion-contratistas/contratos/sin-acta-inicio` | Contratos sin acta de inicio |
| GET | `/gestion-contratistas/contratos/sin-contratista` | Contratos sin contratista |
| GET | `/gestion-contratistas/contratos/sin-supervisor` | Contratos sin supervisor |

---

## Análisis crítico: ¿Qué conservar y qué reemplazar?

### Conservar del backend legacy

| Endpoint | Razón |
|---|---|
| `POST /contratistas-contrato/contratos-contratista` | Los contratos son el dominio de otro sistema. Duplicarlos sería crear inconsistencias. **No tocar.** |
| `POST /gestion-contratistas/onboarding/registrar` + flujo RUT | El registro de contratistas es un proceso separado (onboarding) que funciona. **No tocar.** |
| `GET /gestion-contratistas/catalogos/*` | Datos de catálogo sincronizados con el sistema central. Consumir como servicio. |
| `GET /terceros/get-codigo-tercero` | El `codigoTercero` lo emite el sistema de terceros. |
| `GET /contrato-supervisor/supervisor` | Datos del supervisor del contrato viven en el sistema de contratos. |
| `GET /contratista-plan-pagos/*` | Plan de pagos del contrato pertenece al sistema de contratos. |

### Reemplazar con el nuevo backend

| Endpoint Legacy | Reemplazo |
|---|---|
| `PUT /contratistas-solicitud/proceso-enviar-solicitud` | `POST /cuentas-cobro` + `PUT /cuentas-cobro/:id/radicar` |
| `GET /contratistas-solicitud/informacion-cuenta-contratista` | `GET /cuentas-cobro/info-contrato` |
| `GET /gestion-contratistas/contratistas/{c}/cuentas-cobro` | `GET /cuentas-cobro` |
| `GET /gestion-contratistas/solicitudes/{id}/historial` | `GET /cuentas-cobro/:id/historial` |
| CRUD actividades | `GET/POST/PUT/DELETE /cuentas-cobro/:id/actividades` |
| CRUD gastos | `GET/POST/DELETE /cuentas-cobro/:id/gastos` |
| Checklist retención | `GET/PUT /cuentas-cobro/:id/checklist-retefuente` |
| Ejecución física | `GET/PUT /cuentas-cobro/:id/ejecucion-fisica` |
| Endpoints supervisor (aprobar, devolver, informe) | `POST /supervisor/cuentas-cobro/:id/aprobar|devolver` |
| Endpoints aprobador | `POST /aprobador/cuentas-cobro/:id/aprobar|rechazar` |

### Veredicto sobre historial de cuentas
El endpoint de historial **debe migrar al nuevo backend** porque el nuevo backend ES la fuente de verdad. Conservarlo en el legacy dividiría los datos. Las cuentas históricas del sistema legacy pueden mostrarse como "historial antiguo" hasta que se decida migrar los datos.

---

## Recomendación de stack

### Base de datos: PostgreSQL
- ACID compliant — ideal para máquina de estados con transiciones estrictas
- JSONB nativo para campos flexibles (informes, metadata)
- `FOR UPDATE SKIP LOCKED` para prevenir race conditions en aprobaciones concurrentes
- Window functions para queries de historial paginado
- Gratuito, ampliamente soportado

**Descartados:**
- MongoDB: un workflow relacional (cuenta → planilla → actividades → gastos) necesita integridad referencial
- MySQL: menor soporte JSON y de tipos complejos que PostgreSQL

### Backend: NestJS (TypeScript/Node.js)
- Mismo lenguaje que el frontend Angular — curva de aprendizaje mínima para el equipo
- CLI potente: `nest generate` crea módulos completos en segundos
- Decoradores y DI idénticos en concepto a Angular
- TypeORM o Prisma se integran nativamente
- Swagger/OpenAPI se genera automáticamente

**Descartados:**
- Spring Boot: más lento de arrancar, más boilerplate para el mismo resultado
- FastAPI (Python): el equipo vive en TypeScript

### ORM: Prisma
- Schema declarativo en un solo archivo — fácil de revisar en PR
- Migraciones automáticas y trazables (`prisma migrate dev`)
- Cliente completamente tipado — sin `any`
- Mejor DX que TypeORM para queries complejas

### Almacenamiento de archivos
- **MVP:** Guardar en PostgreSQL como `bytea` — simple, sin dependencias adicionales
- **Producción:** MinIO (S3-compatible, self-hosted) o el blob storage que ya use ADA

---

## Schema de base de datos (Prisma)

```prisma
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

enum EstadoCuentaCobro {
  BORRADOR
  RADICADA
  EN_REVISION_SUPERVISOR
  DEVUELTA_CONTRATISTA
  APROBADA_SUPERVISOR
  EN_REVISION_APROBADOR
  RECHAZADA_APROBADOR
  APROBADA_FINAL
  ENVIADA_CONTABILIDAD
}

enum EstadoSeccion {
  PENDIENTE
  APROBADO
  RECHAZADO
  SIN_OBSERVACIONES
}

model CuentaCobro {
  id               BigInt            @id @default(autoincrement())
  codigoContrato   String            @map("codigo_contrato")
  codigoTercero    String            @map("codigo_tercero")
  estado           EstadoCuentaCobro @default(BORRADOR)
  fechaSolicitud   DateTime?         @map("fecha_solicitud")
  fechaInicio      DateTime          @map("fecha_inicio") @db.Date
  fechaFin         DateTime          @map("fecha_fin") @db.Date
  valorCobrado     Decimal           @map("valor_cobrado") @db.Decimal(18, 2)
  observaciones    String?
  declaracion      Boolean           @default(false)
  createdAt        DateTime          @default(now()) @map("created_at")
  updatedAt        DateTime          @updatedAt @map("updated_at")

  historialEstados   HistorialEstado[]
  planilla           Planilla?
  checklistItems     ChecklistRetefuente[]
  actividades        Actividad[]
  gastos             OtroGasto[]
  ejecucionFisica    EjecucionFisica?
  adjuntos           Adjunto[]
  informeSupervision InformeSupervision?

  @@map("cuentas_cobro")
}

model HistorialEstado {
  id             BigInt      @id @default(autoincrement())
  cuentaCobroId  BigInt      @map("cuenta_cobro_id")
  estadoAnterior String?     @map("estado_anterior")
  estadoNuevo    String      @map("estado_nuevo")
  usuarioId      String      @map("usuario_id")
  usuarioNombre  String?     @map("usuario_nombre")
  observacion    String?
  createdAt      DateTime    @default(now()) @map("created_at")

  cuentaCobro    CuentaCobro @relation(fields: [cuentaCobroId], references: [id])

  @@map("historial_estados")
}

model Planilla {
  id                    BigInt        @id @default(autoincrement())
  cuentaCobroId         BigInt        @unique @map("cuenta_cobro_id")
  plantillaPagoNo       Int?          @map("plantilla_pago_no")
  fechaPago             DateTime?     @map("fecha_pago") @db.Date
  periodoPagado         String?       @map("periodo_pagado")
  ingresoBaseCotizacion Decimal?      @map("ingreso_base_cotizacion") @db.Decimal(18, 2)
  aporteSalud           Decimal?      @map("aporte_salud") @db.Decimal(18, 2)
  aportePension         Decimal?      @map("aporte_pension") @db.Decimal(18, 2)
  aporteArl             Decimal?      @map("aporte_arl") @db.Decimal(18, 2)
  valorPagado           Decimal?      @map("valor_pagado") @db.Decimal(18, 2)
  tipoRiesgoArl         String?       @map("tipo_riesgo_arl")
  estadoRevision        EstadoSeccion @default(PENDIENTE) @map("estado_revision")
  observacionRevision   String?       @map("observacion_revision")
  idAportante           String?       @map("id_aportante")
  numeroPlanilla        String?       @map("numero_planilla")
  urlPago               String?       @map("url_pago")
  estadoPago            String?       @map("estado_pago")

  cuentaCobro   CuentaCobro @relation(fields: [cuentaCobroId], references: [id])

  @@map("planillas")
}

model ChecklistRetefuente {
  id                  BigInt        @id @default(autoincrement())
  cuentaCobroId       BigInt        @map("cuenta_cobro_id")
  idChecklist         Int           @map("id_checklist")
  nombre              String?
  kaNlCumple          Int?          @map("ka_nl_cumple")
  observacion         String?
  estadoRevision      EstadoSeccion @default(PENDIENTE) @map("estado_revision")
  observacionRevision String?       @map("observacion_revision")

  cuentaCobro   CuentaCobro @relation(fields: [cuentaCobroId], references: [id])

  @@map("checklist_retefuente")
}

model Actividad {
  id                  BigInt        @id @default(autoincrement())
  cuentaCobroId       BigInt        @map("cuenta_cobro_id")
  descripcion         String
  fechaActividad      DateTime      @map("fecha_actividad") @db.Date
  estadoRevision      EstadoSeccion @default(PENDIENTE) @map("estado_revision")
  observacionRevision String?       @map("observacion_revision")
  createdAt           DateTime      @default(now()) @map("created_at")
  updatedAt           DateTime      @updatedAt @map("updated_at")

  adjuntos    Adjunto[]
  cuentaCobro CuentaCobro @relation(fields: [cuentaCobroId], references: [id])

  @@map("actividades")
}

model OtroGasto {
  id                  BigInt        @id @default(autoincrement())
  cuentaCobroId       BigInt        @map("cuenta_cobro_id")
  fecha               DateTime      @db.Date
  codigoConcepto      String        @map("codigo_concepto")
  observacion         String?
  valor               Decimal       @db.Decimal(18, 2)
  estadoRevision      EstadoSeccion @default(PENDIENTE) @map("estado_revision")
  observacionRevision String?       @map("observacion_revision")

  adjuntos    Adjunto[]
  cuentaCobro CuentaCobro @relation(fields: [cuentaCobroId], references: [id])

  @@map("otros_gastos")
}

model EjecucionFisica {
  id                  BigInt        @id @default(autoincrement())
  cuentaCobroId       BigInt        @unique @map("cuenta_cobro_id")
  porcentaje          Decimal?      @db.Decimal(5, 2)
  justificacion       String?
  estadoRevision      EstadoSeccion @default(PENDIENTE) @map("estado_revision")
  observacionRevision String?       @map("observacion_revision")
  updatedAt           DateTime      @updatedAt @map("updated_at")

  cuentaCobro CuentaCobro @relation(fields: [cuentaCobroId], references: [id])

  @@map("ejecucion_fisica")
}

model Adjunto {
  id            BigInt    @id @default(autoincrement())
  cuentaCobroId BigInt    @map("cuenta_cobro_id")
  actividadId   BigInt?   @map("actividad_id")
  gastoId       BigInt?   @map("gasto_id")
  nombre        String
  mimeType      String?   @map("mime_type")
  tamanioBytes  Int?      @map("tamanio_bytes")
  datos         Bytes?
  urlStorage    String?   @map("url_storage")
  createdAt     DateTime  @default(now()) @map("created_at")

  cuentaCobro CuentaCobro @relation(fields: [cuentaCobroId], references: [id])
  actividad   Actividad?  @relation(fields: [actividadId], references: [id])
  gasto       OtroGasto?  @relation(fields: [gastoId], references: [id])

  @@map("adjuntos")
}

model InformeSupervision {
  id            BigInt    @id @default(autoincrement())
  cuentaCobroId BigInt    @unique @map("cuenta_cobro_id")
  supervisorId  String    @map("supervisor_id")
  contenido     Json?
  estado        String    @default("BORRADOR")
  createdAt     DateTime  @default(now()) @map("created_at")
  updatedAt     DateTime  @updatedAt @map("updated_at")

  cuentaCobro CuentaCobro @relation(fields: [cuentaCobroId], references: [id])

  @@map("informes_supervision")
}
```

---

## Máquina de estados

```
BORRADOR
  │
  ▼ contratista: PUT /cuentas-cobro/:id/radicar
RADICADA
  │
  ▼ supervisor toma la cuenta
EN_REVISION_SUPERVISOR
  │
  ├──► DEVUELTA_CONTRATISTA   POST /supervisor/cuentas-cobro/:id/devolver
  │         │
  │         └──► RADICADA     contratista: PUT /cuentas-cobro/:id/subsanar
  │
  └──► APROBADA_SUPERVISOR    POST /supervisor/cuentas-cobro/:id/aprobar
            │
            ▼ automático: entra a cola del aprobador
       EN_REVISION_APROBADOR
            │
            ├──► RECHAZADA_APROBADOR   POST /aprobador/cuentas-cobro/:id/rechazar
            │         │
            │         └──► DECISIÓN PENDIENTE: ¿vuelve a supervisor o a contratista?
            │
            └──► APROBADA_FINAL        POST /aprobador/cuentas-cobro/:id/aprobar
                      │
                      ▼
                 ENVIADA_CONTABILIDAD
```

---

## Contratos de API (nuevo backend)

### Base URL: `http://localhost:3000/api/v1`

### Contratista — Cuentas de cobro

| Método | Endpoint | Descripción |
|---|---|---|
| POST | `/cuentas-cobro` | Crear borrador |
| GET | `/cuentas-cobro` | Listar mis cuentas (`?codigoTercero&estado&page&size`) |
| GET | `/cuentas-cobro/:id` | Detalle completo |
| PUT | `/cuentas-cobro/:id/radicar` | Radicar para revisión |
| PUT | `/cuentas-cobro/:id/subsanar` | Re-radicar luego de devolución |
| GET | `/cuentas-cobro/:id/historial` | Historial de transiciones de estado |

### Contratista — Secciones

| Método | Endpoint | Descripción |
|---|---|---|
| GET | `/cuentas-cobro/:id/planilla` | Ver planilla SS |
| PUT | `/cuentas-cobro/:id/planilla` | Guardar planilla SS |
| POST | `/cuentas-cobro/:id/planilla/vincular-aportante` | Proxy → PagoSimple vincular |
| POST | `/cuentas-cobro/:id/planilla/validar` | Proxy → PagoSimple validar planilla |
| GET | `/cuentas-cobro/:id/planilla/totales` | Proxy → PagoSimple totales |
| GET | `/cuentas-cobro/:id/planilla/url-pago` | Proxy → PagoSimple URL PSE |
| GET | `/cuentas-cobro/:id/actividades` | Listar actividades |
| POST | `/cuentas-cobro/:id/actividades` | Crear actividad (multipart) |
| PUT | `/cuentas-cobro/:id/actividades/:actId` | Editar actividad |
| DELETE | `/cuentas-cobro/:id/actividades/:actId` | Eliminar actividad |
| GET | `/cuentas-cobro/:id/gastos` | Listar gastos adicionales |
| POST | `/cuentas-cobro/:id/gastos` | Crear gasto |
| DELETE | `/cuentas-cobro/:id/gastos/:gastoId` | Eliminar gasto |
| GET | `/cuentas-cobro/:id/checklist-retefuente` | Ver checklist |
| PUT | `/cuentas-cobro/:id/checklist-retefuente` | Guardar respuestas checklist (batch) |
| GET | `/cuentas-cobro/:id/ejecucion-fisica` | Ver ejecución física |
| PUT | `/cuentas-cobro/:id/ejecucion-fisica` | Actualizar ejecución física |

### Adjuntos

| Método | Endpoint | Descripción |
|---|---|---|
| POST | `/adjuntos` | Upload (multipart/form-data) |
| GET | `/adjuntos/:id` | Download |
| DELETE | `/adjuntos/:id` | Eliminar |

### Supervisor

| Método | Endpoint | Descripción |
|---|---|---|
| GET | `/supervisor/cuentas-cobro` | Listar cuentas asignadas |
| GET | `/supervisor/resumen` | Métricas (radicadas, aprobadas, devueltas) |
| GET | `/supervisor/cuentas-cobro/:id` | Detalle para revisión |
| POST | `/supervisor/cuentas-cobro/:id/aprobar` | Aprobar → `APROBADA_SUPERVISOR` |
| POST | `/supervisor/cuentas-cobro/:id/devolver` | Devolver con observaciones por sección |
| GET | `/supervisor/cuentas-cobro/:id/informe` | Ver informe de supervisión |
| POST | `/supervisor/cuentas-cobro/:id/informe` | Guardar informe |
| PATCH | `/supervisor/cuentas-cobro/:id/secciones` | Revisión por sección |

### Aprobador

| Método | Endpoint | Descripción |
|---|---|---|
| GET | `/aprobador/cuentas-cobro` | Listar cuentas en `APROBADA_SUPERVISOR` |
| GET | `/aprobador/resumen` | Métricas |
| GET | `/aprobador/cuentas-cobro/:id` | Detalle completo |
| POST | `/aprobador/cuentas-cobro/:id/aprobar` | Aprobar → `APROBADA_FINAL` |
| POST | `/aprobador/cuentas-cobro/:id/rechazar` | Rechazar → `RECHAZADA_APROBADOR` |

---

## Plan de implementación

### Fase 1 — Setup y núcleo (1-2 días)
1. `nest new cuentas-cobro-api` + instalar dependencias
2. Docker Compose con PostgreSQL
3. Schema Prisma completo + primera migración
4. Módulo `auth`: JWT + `RoleGuard`
5. Módulo `cuentas-cobro`: CRUD básico + endpoint `radicar`

### Fase 2 — Secciones (1-2 días)
6. Módulo `planilla` + proxy PagoSimple
7. Módulo `actividades` + adjuntos
8. Módulo `gastos`
9. Módulo `checklist-retefuente`
10. Módulo `ejecucion-fisica`

### Fase 3 — Flujo supervisor (1 día)
11. Módulo `supervisor`: listar, aprobar, devolver, informe
12. Revisión por secciones

### Fase 4 — Flujo aprobador (1 día)
13. Módulo `aprobador`: listar, aprobar, rechazar
14. Resúmenes y métricas

### Fase 5 — Integración frontend (1-2 días)
15. Actualizar `proxy.conf.json`
16. Nuevos services Angular apuntando al nuevo backend
17. Verificar flujo end-to-end

### Fase 6 — Polish (1 día)
18. Swagger completo con `@ApiProperty` en todos los DTOs
19. Health check
20. Docker Compose de producción
21. Seed de datos de prueba

**Estimación total: 6-8 días back + 1-2 días integración front**

---

## Decisión crítica pendiente

**¿Qué pasa cuando el aprobador rechaza?**

- **Opción A:** `RECHAZADA_APROBADOR` → vuelve a supervisor → supervisor corrige informe → contratista
- **Opción B:** `RECHAZADA_APROBADOR` → directo al contratista para subsanar

El frontend actual no tiene flujo claro para este caso. **Se requiere decisión de negocio antes de implementar esta transición.**

---

## Cambios en el frontend (MFContratistas)

Los `domain/models/` y `domain/ports/` **no cambian** — solo cambian las implementaciones HTTP de los repositorios. Eso es exactamente el valor de la clean architecture actual.

| Archivo | Cambio |
|---|---|
| `src/app/features/contractor/data/services/collection-invoice.service.ts` | Reemplazar URLs por nuevo backend |
| `src/app/features/contractor/data/services/actividad-cuenta-cobro.service.ts` | Ídem |
| `src/app/features/contractor/data/services/cuenta-cobro-historico.service.ts` | Ídem |
| `src/app/features/supervisor/dashboard-supervisor/data/services/supervisor-dashboard-api.service.ts` | Ídem |
| `proxy.conf.json` | Agregar entrada para el nuevo backend |

---

## Integración PagoSimple

El nuevo backend **no reimplementa** la integración PagoSimple. En cambio, actúa como proxy hacia el `gestion-contratistas` existente:

```
Frontend Angular
  → POST /cuentas-cobro/:id/planilla/validar  (nuevo backend)
    → POST /api/v1/pago-simple/planillas/validar  (gestion-contratistas)
      → PagoSimple (plataforma externa)
```

Esto evita duplicar: autenticación PagoSimple, lógica de armado del archivo PILA, y la consulta de datos del contratista desde la BD legacy.
