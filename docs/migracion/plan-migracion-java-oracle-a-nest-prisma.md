# Plan de migración: Java + Oracle -> NestJS + Prisma + PostgreSQL

## Objetivo

Migrar el backend heredado en Java/Oracle al backend nuevo en NestJS + Prisma + PostgreSQL, usando el proyecto actual como base funcional y migrando **endpoint por endpoint** para reducir errores.

La prioridad es conservar el comportamiento de negocio y validar cada corte antes de avanzar al siguiente.

## Principios

1. Migrar en cortes pequeños.
2. Mantener paridad funcional con el backend Java hasta terminar.
3. Separar dominio, persistencia e integraciones externas.
4. Tratar `PagoSimple` como una frontera externa independiente.
5. No mezclar rediseño profundo con la migración base.
6. No endurecer columnas ni constraints sin antes hacer backfill.
7. Cada endpoint migrado debe quedar:
   - implementado
   - documentado
   - probado
   - validado manualmente

## Orden recomendado

### 1. Base técnica

- Confirmar `PrismaClient` y conexión a PostgreSQL.
- Validar migraciones base.
- Revisar variables de entorno.
- Tener Swagger y validación global activos.

### 2. Autenticación

Migrar primero porque todo lo demás depende de esto.

Endpoints:

- `POST /auth/login`
- `POST /auth/me`
- `POST /auth/cambiar-password`
- `POST /auth/usuarios`
- `GET /auth/usuarios/contratistas`
- `POST /auth/dev-token`

Validaciones:

- JWT funcional
- roles correctos
- cambio obligatorio de contraseña
- usuarios contratistas

### 3. Contratos

Endpoints:

- `GET /contratos`
- `GET /contratos/admin`
- `GET /contratos/contratistas`
- `GET /contratos/tipos-plazo`
- `GET /contratos/supervisor`
- `POST /contratos`
- `PATCH /contratos/:codigoContrato`
- `DELETE /contratos/:codigoContrato`
- `POST /contratos/:codigoContrato/clonar`

Validaciones:

- CRUD completo
- filtros por rol
- clonado
- compatibilidad con las nuevas columnas:
  - `numero_contrato`
  - `fecha_suscripcion`
  - `objeto`
  - `tercero_id`
  - `compromiso_id`
  - `dependencia_id`
  - `ccostos_id`
  - `numero_acta_inicio` como texto

### 4. Presupuesto / precarga

Endpoints:

- `POST /presupuesto/precarga`
- `GET /presupuesto/tercero`

Validaciones:

- resolución de tercero por identificación
- precarga de terceros
- consistencia con contratos

### 5. Registro de contratistas

Endpoints:

- `POST /registro-contratistas/extraer`
- `POST /registro-contratistas/finalizar`

Validaciones:

- extracción de RUT y certificado bancario
- creación de usuario contratista
- manejo de duplicados
- resolución de tercero

### 6. PagoSimple

Migrar PagoSimple como servicio aislado, no como lógica dispersa.

Orden:

1. `PagoSimpleModule`
2. `PagoSimpleClientService`
3. DTOs externos
4. configuración por ambiente
5. login
6. consulta BDUA/RUAF
7. timeout / retry
8. endpoint aislado de consulta
9. integración con registro

Reglas:

- si el frontend trae EPS/AFP, respetarlo
- si falta un dato, consultar PagoSimple
- si PagoSimple falla, no romper el registro
- guardar trazabilidad del origen del dato

### 7. Cuentas de cobro

Endpoints:

- `POST /cuentas-cobro`
- `GET /cuentas-cobro`
- `GET /cuentas-cobro/:id/resumen-radicacion`
- `POST /cuentas-cobro/:id/radicar`
- `GET /cuentas-cobro/:id`

Validaciones:

- borrador
- listado
- resumen de radicación
- cambio de estado
- detalle

### 8. Planilla

Endpoints:

- `GET /planilla/:cuentaCobroId`
- `POST /planilla/:cuentaCobroId/pagosimple/test`
- `POST /planilla/:cuentaCobroId/pagosimple/mock-confirmacion`

Validaciones:

- datos de planilla
- confirmaciones idempotentes
- integración controlada con PagoSimple

### 9. Flujo de revisión

Endpoints:

- supervisor
- aprobador
- checklist
- actividades
- gastos
- ejecución física

Validaciones:

- máquina de estados
- observaciones
- rechazo/aprobación por sección
- trazabilidad del usuario

## Checklist por endpoint

Antes de marcar un endpoint como migrado:

1. Ruta creada.
2. DTO validado.
3. Servicio implementado.
4. Persistencia Prisma lista.
5. Swagger actualizado.
6. Prueba unitaria.
7. Prueba de integración.
8. Validación manual.
9. Paridad funcional revisada.

## Reglas de oro

- No migrar dos cambios grandes a la vez.
- No usar `any` en DTOs.
- No poner secretos en el repo.
- No mezclar integración externa dentro del controller.
- No convertir columnas a obligatorias sin backfill.
- No apagar el backend Java hasta validar el flujo Nest.

## Resultado esperado

Al final de este plan deberíamos tener:

- backend NestJS + Prisma sobre PostgreSQL
- endpoints migrados de forma incremental
- `PagoSimple` desacoplado
- contratos extendidos
- trazabilidad de estados
- menos riesgo en despliegue

