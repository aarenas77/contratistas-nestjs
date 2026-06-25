# Planilla y PagoSimple: inventario técnico para migración

## Objetivo

Este documento resume todo lo relevante del flujo de **pago de planilla** que hoy existe en el backend Java `gestion-contratistas`, con foco en la migración hacia NestJS + Prisma + PostgreSQL.

La intención es separar:

- lógica de dominio
- integración con PagoSimple
- validaciones de negocio
- contrato REST público
- datos que se persisten o se derivan

---

## Qué hace hoy este módulo

El flujo de planilla en este sistema no es una sola operación. Incluye:

1. generar token de sesión en PagoSimple
2. vincular o consultar un aportante independiente
3. generar el archivo plano PILA
4. validar la planilla en PagoSimple
5. consultar totales de planilla
6. generar URL de pago PSE
7. consultar BDUA/RUAF

Todo eso vive bajo el concepto de **PagoSimple PILA**.

---

## Rutas públicas actuales

El controlador principal es:

- [`AportesSeguridadSocialController.java`](../src/main/java/com/ada/ecosystem/gestioncontratistas/v1/infrastructure/adapter/in/rest/AportesSeguridadSocialController.java)

### Endpoints

- `POST /api/v1/pago-simple/token`
- `POST /api/v1/pago-simple/aportantes/independiente/vincular`
- `POST /api/v1/pago-simple/planillas/validar`
- `POST /api/v1/pago-simple/bdua-ruaf/data`
- `GET /api/v1/pago-simple/payroll/total/{payrollNumber}?ciTercero=...`
- `GET /api/v1/pago-simple/planillas/{payrollNumber}/totales?ciTercero=...`
- `GET /api/v1/pago-simple/payroll/payment/{payrollNumber}?ciTercero=...`
- `GET /api/v1/pago-simple/planillas/{payrollNumber}/url-pago?ciTercero=...`

El sistema expone aliases equivalentes para algunos GET:

- `/payroll/total/{payrollNumber}` y `/planillas/{payrollNumber}/totales`
- `/payroll/payment/{payrollNumber}` y `/planillas/{payrollNumber}/url-pago`

---

## Contrato funcional de cada operación

### 1. Generar token

#### Request

- `POST /api/v1/pago-simple/token`
- Body opcional con credenciales custom

#### Respuesta

- retorna `token` y `session_token`
- la respuesta pública solo muestra un preview enmascarado

#### Uso

- autenticar al usuario de la app contra PagoSimple
- crear sesión para las demás operaciones

---

### 2. Vincular aportante independiente

#### Request

- `POST /api/v1/pago-simple/aportantes/independiente/vincular`
- Body:

```json
{
  "ciTercero": 123456
}
```

#### Reglas

- busca el tercero por `ciTercero` en la base local
- si ya tiene `idAportante`, solo lo consulta
- si no tiene, crea el aportante en PagoSimple y luego lo autoriza
- luego lo consulta nuevamente y guarda el `idAportante` si lo obtiene

#### Resultado

- devuelve el aportante ya vinculado/consultado
- incluye `authToken`

---

### 3. Generar y validar planilla

#### Request

- `POST /api/v1/pago-simple/planillas/validar`

#### Body mínimo

```json
{
  "ciTercero": 123456,
  "periodoPago": "2026-06"
}
```

#### Campos relevantes del request

- `ciTercero`
- `periodoPago`
- `numeroRadicacion`
- `tipoPlanilla`
- `modalidadPlanilla`
- `formaPresentacion`
- `tipoAportante`
- `codigoOperador`
- `tipoCotizante`
- `subtipoCotizante`
- `diasCotizados`
- `salario`
- `codigoAfp`
- `codigoEps`
- `codigoCcf`
- `claseRiesgo`
- `actividadEconomicaRiesgos`
- `exonerado`
- `isUgpp`
- `isNoveltiesPlanillaN`
- `fileType`

#### Reglas de negocio

- busca el aportante por `ciTercero`
- aplica datos de tercero al comando de planilla
- exige `idAportante`
- hace login en PagoSimple
- genera el archivo plano PILA
- autoriza al aportante
- valida la planilla en PagoSimple

#### Resultado

Devuelve:

- aportante usado
- nombre del archivo plano
- contenido del archivo plano
- validación de PagoSimple

---

### 4. Consultar BDUA/RUAF

#### Request

- `POST /api/v1/pago-simple/bdua-ruaf/data`

#### Body

```json
{
  "document_type": "CC",
  "document": "15436453"
}
```

#### Resultado

Retorna:

- EPS / AFP
- nombres
- fechas de afiliación
- tipo de afiliado

---

### 5. Consultar totales de planilla

#### Request

- `GET /api/v1/pago-simple/payroll/total/{payrollNumber}?ciTercero=123456`

#### Resultado

Retorna:

- documento
- dígito de verificación
- fecha de reporte
- nombre del aportante
- periodo cotizado
- periodo de servicio
- número de afiliados
- fecha límite
- estado de planilla
- totales por administrador
- total sin mora
- valor de mora
- total a pagar

---

### 6. Generar URL de pago

#### Request

- `GET /api/v1/pago-simple/payroll/payment/{payrollNumber}?ciTercero=123456`

#### Resultado

Retorna:

- `urlPago`
- mensaje
- descripción

---

## Lógica de dominio importante

### Servicio principal

El caso de uso principal es:

- [`AportesSeguridadSocialService.java`](../src/main/java/com/ada/ecosystem/gestioncontratistas/v1/domain/service/AportesSeguridadSocialService.java)

### Responsabilidades

Ese servicio:

- obtiene token
- resuelve el aportante por tercero
- crea o consulta aportante
- valida planilla
- consulta totales
- genera URL de pago
- consulta BDUA/RUAF

### Comportamiento clave

- si el tercero ya tiene `idAportante`, reutiliza ese vínculo
- si no lo tiene, lo crea en PagoSimple
- la autorización usa `auth_token`
- la validación de planilla usa archivo plano generado localmente

---

## Generación del archivo PILA

La generación del archivo plano está en:

- [`PlanillaPilaGenerator.java`](../src/main/java/com/ada/ecosystem/gestioncontratistas/v1/domain/service/PlanillaPilaGenerator.java)

### Qué hace

- construye un encabezado de longitud fija
- construye un detalle de longitud fija
- valida longitudes exactas:
  - encabezado: `359`
  - detalle: `693`
- arma el nombre del archivo:
  - `{tipoDocumento}{numeroDocumento}_{periodoPagoSinGuiones}.txt`

### Validaciones internas

- aportante obligatorio
- documento obligatorio
- nombres obligatorios
- código departamento y municipio obligatorios
- periodo `yyyy-MM`
- actividad económica de riesgos numérica
- salario mayor a cero

### Cálculo financiero

- IBC salud = salario
- IBC pensión = salario
- IBC ARL = salario
- IBC CCF = 0
- tarifas:
  - pensión: `16%`
  - salud: `12.5%`
  - ARL depende de clase de riesgo

### Clases de riesgo

- 1 -> `0.00522`
- 2 -> `0.01044`
- 3 -> `0.02436`
- 4 -> `0.04350`
- 5 -> `0.06960`

---

## Modelo de aportante

### Dominio

- [`AportanteIndependiente.java`](../src/main/java/com/ada/ecosystem/gestioncontratistas/v1/domain/model/AportanteIndependiente.java)
- [`AportanteIndependienteCommand.java`](../src/main/java/com/ada/ecosystem/gestioncontratistas/v1/domain/model/AportanteIndependienteCommand.java)
- [`DatosAportanteIndependientePagoSimple.java`](../src/main/java/com/ada/ecosystem/gestioncontratistas/v1/domain/model/DatosAportanteIndependientePagoSimple.java)

### Campos clave

- `id`
- `tipoDocumento`
- `numeroDocumento`
- `nombre`
- `estado`
- `codigoActividadEconomica`
- `codigoArl`
- `codigoClasificacion`
- `codigoTipoPersona`
- `authToken`

### Datos usados para crear el aportante

- documento
- nombre completo o nombres + apellidos
- dirección
- email
- teléfono / celular
- actividad económica
- código ARL
- flags de validación

---

## Modelo de resultado

### Validación

- [`ValidacionPlanillaPila.java`](../src/main/java/com/ada/ecosystem/gestioncontratistas/v1/domain/model/ValidacionPlanillaPila.java)
- [`PlanillaValidation.java`](../src/main/java/com/ada/ecosystem/gestioncontratistas/v1/domain/model/PlanillaValidation.java)
- [`PlanillaValidationDetail.java`](../src/main/java/com/ada/ecosystem/gestioncontratistas/v1/domain/model/PlanillaValidationDetail.java)

### Totales

- [`TotalesPlanillaPila.java`](../src/main/java/com/ada/ecosystem/gestioncontratistas/v1/domain/model/TotalesPlanillaPila.java)
- [`TotalAdministradorPlanilla.java`](../src/main/java/com/ada/ecosystem/gestioncontratistas/v1/domain/model/TotalAdministradorPlanilla.java)

### URL de pago

- [`UrlPagoPlanillaPila.java`](../src/main/java/com/ada/ecosystem/gestioncontratistas/v1/domain/model/UrlPagoPlanillaPila.java)

---

## Contrato técnico de PagoSimple

### Login

- `POST {base-url}/auth/login`

#### Body

```json
{
  "document_type": "CC",
  "document": "15436453",
  "password": "9753",
  "nit": "800167494",
  "company": "...",
  "secret_key": "..."
}
```

### Consulta BDUA/RUAF

- `POST {base-url}/bdua-ruaf/data`

#### Headers

- `nit`
- `token`

#### Body

```json
{
  "document_type": "CC",
  "document": "15436453"
}
```

### Contribuyente / aportante

- `POST {base-url}/contributor`
- `GET {base-url}/auth/{id}/{documentType}/{document}`
- `GET {base-url}/contributor/independent/{id}`

### Planilla PILA

- `POST {base-url}/payroll/validate`
- `GET {base-url}/payroll/total/{payrollNumber}`
- `GET {base-url}/payroll/payment/{payrollNumber}`

---

## Qué persiste el sistema

La persistencia local guarda datos relacionados con PagoSimple, especialmente en el flujo de terceros y el estado del aportante.

### En el contexto de planilla

- `idAportante` por tercero
- datos del aportante vinculados
- estado de planilla en el sistema local
- URLs o tokens derivados si aplica

### Recomendación para migración

En NestJS + Prisma, conviene guardar:

- snapshot de sesión/validación
- resultado de validación
- número de planilla
- URL de pago
- estado de integración
- errores de integración

---

## Riesgos y deudas técnicas

1. **Credenciales embebidas**
   - hoy las propiedades de PagoSimple viven en archivos de configuración
   - deben pasar a variables de entorno o secret manager

2. **Cliente HTTP muy acoplado**
   - el adaptador de PagoSimple concentra mucha lógica
   - conviene dividirlo por casos de uso en NestJS

3. **Validaciones rígidas**
   - el archivo PILA depende de longitudes exactas
   - cualquier cambio requiere pruebas con casos reales

4. **Sin resiliencia fuerte**
   - hoy se trabaja con `RestTemplate` y manejo manual de errores
   - en NestJS conviene agregar timeout, retry y logging estructurado

5. **Integración con datos locales**
   - si el tercero no está precargado, la vinculación no puede continuar
   - ese supuesto debe conservarse o replantearse explícitamente

---

## Qué migrar primero

Para migrar esta parte correctamente, el orden recomendado es:

1. `GET /api/v1/pago-simple/bdua-ruaf/data`
2. `POST /api/v1/pago-simple/token`
3. `POST /api/v1/pago-simple/aportantes/independiente/vincular`
4. `POST /api/v1/pago-simple/planillas/validar`
5. `GET /api/v1/pago-simple/payroll/total/{payrollNumber}`
6. `GET /api/v1/pago-simple/payroll/payment/{payrollNumber}`

La razón:

- primero se estabiliza la consulta más simple
- luego se migra la autenticación
- después el vínculo del aportante
- finalmente la generación y cobro de la planilla

---

## Recomendación para NestJS

### Módulos sugeridos

- `PagoSimpleModule`
- `PlanillaModule`
- `AportantesModule`
- `SeguridadSocialModule`

### Servicios sugeridos

- `PagoSimpleClientService`
- `PlanillaPilaGeneratorService`
- `AportanteService`
- `PlanillaService`

### Tablas sugeridas en Postgres

- `aportantes`
- `planillas`
- `planilla_validaciones`
- `planilla_pagos`
- `integrations_log`

---

## Conclusión

El flujo de planilla es una pieza crítica porque mezcla:

- cálculo financiero
- construcción de archivo plano
- integración externa
- vinculación de aportante
- generación de URL de pago
- trazabilidad de resultado

No conviene migrarlo como un solo endpoint grande. Lo correcto es partirlo en rutas pequeñas, con pruebas por capa y una implementación separada para PagoSimple.

