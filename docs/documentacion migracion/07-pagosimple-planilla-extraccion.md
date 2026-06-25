# Extracción técnica de Planilla + PagoSimple

Este documento resume lo más relevante del repo `gestion-contratistas` para migrar el flujo de **planilla PILA / PagoSimple** a NestJS + Prisma.

---

## 1. Archivos críticos

### 1.1 Generación del archivo PILA

- [`src/main/java/com/ada/ecosystem/gestioncontratistas/v1/domain/service/PlanillaPilaGenerator.java`](../src/main/java/com/ada/ecosystem/gestioncontratistas/v1/domain/service/PlanillaPilaGenerator.java)

### 1.2 Orquestación del caso de uso

- [`src/main/java/com/ada/ecosystem/gestioncontratistas/v1/domain/service/AportesSeguridadSocialService.java`](../src/main/java/com/ada/ecosystem/gestioncontratistas/v1/domain/service/AportesSeguridadSocialService.java)

### 1.3 Cliente HTTP de PagoSimple PILA

- [`src/main/java/com/ada/ecosystem/gestioncontratistas/v1/infrastructure/adapter/out/client/PagoSimplePilaClientAdapter.java`](../src/main/java/com/ada/ecosystem/gestioncontratistas/v1/infrastructure/adapter/out/client/PagoSimplePilaClientAdapter.java)

### 1.4 Origen local de datos del aportante

- [`src/main/java/com/ada/ecosystem/gestioncontratistas/v1/infrastructure/adapter/out/persistence/AportanteIndependientePagoSimpleRepositoryAdapter.java`](../src/main/java/com/ada/ecosystem/gestioncontratistas/v1/infrastructure/adapter/out/persistence/AportanteIndependientePagoSimpleRepositoryAdapter.java)

### 1.5 Contrato REST público

- [`src/main/java/com/ada/ecosystem/gestioncontratistas/v1/infrastructure/adapter/in/rest/AportesSeguridadSocialController.java`](../src/main/java/com/ada/ecosystem/gestioncontratistas/v1/infrastructure/adapter/in/rest/AportesSeguridadSocialController.java)

---

## 2. Layout byte a byte del archivo PILA

El archivo generado por `PlanillaPilaGenerator` tiene:

- **cabecera**: `359` caracteres
- **detalle**: `693` caracteres

El generador concatena:

```text
encabezado + "\n" + detalle
```

### 2.1 Reglas de formato

- `text(valor, len)`:
  - recorta a `len` si excede
  - rellena con **espacios a la derecha**
- `number(valor, len)`:
  - convierte a string
  - rellena con **ceros a la izquierda**
  - si excede `len`, recorta por la izquierda
- `rate(valor, len, scale)`:
  - escala decimal
  - rellena con ceros a la derecha
- `spaces(n)`:
  - n espacios exactos

### 2.2 Cabecera

| Posición | Longitud | Campo | Formato |
|---|---:|---|---|
| 1-2 | 2 | `01` | fijo |
| 3 | 1 | `modalidadPlanilla` | texto |
| 4-7 | 4 | literal `1` | número con padding |
| 8-207 | 200 | nombre aportante | texto |
| 208-209 | 2 | tipo documento | texto |
| 210-225 | 16 | número documento | texto |
| 226 | 1 | dígito verificación | número |
| 227 | 1 | tipo planilla | texto |
| 228-237 | 10 | reservado | espacios |
| 238-247 | 10 | reservado | espacios |
| 248 | 1 | forma presentación | texto |
| 249-258 | 10 | reservado | espacios |
| 259-298 | 40 | reservado | espacios |
| 299-304 | 6 | código ARL | texto |
| 305-311 | 7 | periodo pago | texto |
| 312-318 | 7 | periodo pago | texto |
| 319-328 | 10 | número radicación | texto |
| 329-338 | 10 | reservado | espacios |
| 339-343 | 5 | literal `1` | número |
| 344-355 | 12 | literal `0` | número |
| 356-357 | 2 | tipo aportante | texto |
| 358-359 | 2 | código operador | texto |

### 2.3 Detalle

| Posición | Longitud | Campo | Formato |
|---|---:|---|---|
| 1-2 | 2 | `02` | fijo |
| 3-7 | 5 | literal `1` | número |
| 8-9 | 2 | tipo documento | texto |
| 10-25 | 16 | número documento | texto |
| 26-27 | 2 | tipo cotizante | texto |
| 28-29 | 2 | subtipo cotizante | texto |
| 30 | 1 | reservado | espacio |
| 31 | 1 | reservado | espacio |
| 32-33 | 2 | código departamento | texto |
| 34-36 | 3 | código municipio PILA | texto |
| 37-56 | 20 | primer apellido | texto |
| 57-86 | 30 | segundo apellido | texto |
| 87-106 | 20 | primer nombre | texto |
| 107-136 | 30 | segundo nombre | texto |
| 137-151 | 15 | reservado | espacios |
| 152-153 | 2 | literal `0` | número |
| 154-159 | 6 | código AFP | texto |
| 160-165 | 6 | reservado | espacios |
| 166-171 | 6 | código EPS | texto |
| 172-177 | 6 | reservado | espacios |
| 178-183 | 6 | código CCF | texto |
| 184-185 | 2 | días cotizados | número |
| 186-187 | 2 | días cotizados | número |
| 188-189 | 2 | días cotizados | número |
| 190-191 | 2 | literal `0` | número |
| 192-200 | 9 | salario | número |
| 201 | 1 | reservado | espacio |
| 202-210 | 9 | IBC pensión | número |
| 211-219 | 9 | IBC salud | número |
| 220-228 | 9 | IBC ARL | número |
| 229-237 | 9 | IBC CCF | número |
| 238-244 | 7 | tarifa pensión | rate |
| 245-253 | 9 | aporte pensión | número |
| 254-262 | 9 | literal `0` | número |
| 263-271 | 9 | literal `0` | número |
| 272-280 | 9 | aporte pensión | número |
| 281-289 | 9 | literal `0` | número |
| 290-298 | 9 | literal `0` | número |
| 299-307 | 9 | literal `0` | número |
| 308-314 | 7 | tarifa salud | rate |
| 315-323 | 9 | aporte salud | número |
| 324-332 | 9 | literal `0` | número |
| 333-347 | 15 | reservado | espacios |
| 348-356 | 9 | literal `0` | número |
| 357-371 | 15 | reservado | espacios |
| 372-380 | 9 | literal `0` | número |
| 381-389 | 9 | tarifa ARL | rate |
| 390-398 | 9 | literal `0` | número |
| 399-407 | 9 | aporte ARL | número |
| 408-414 | 7 | literal `0` | rate |
| 415-423 | 9 | literal `0` | número |
| 424-430 | 7 | literal `0` | rate |
| 431-439 | 9 | literal `0` | número |
| 440-446 | 7 | literal `0` | rate |
| 447-455 | 9 | literal `0` | número |
| 456-462 | 7 | literal `0` | rate |
| 463-471 | 9 | literal `0` | número |
| 472-478 | 7 | literal `0` | rate |
| 479-487 | 9 | literal `0` | número |
| 488-489 | 2 | reservado | espacios |
| 490-505 | 16 | reservado | espacios |
| 506 | 1 | exonerado | `S` / `N` |
| 507-512 | 6 | código ARL | texto |
| 513 | 1 | clase riesgo | número |
| 514 | 1 | reservado | espacio |
| 515-664 | 150 | reservado | espacios |
| 665-673 | 9 | literal `0` | número |
| 674-676 | 3 | literal `0` | número |
| 677-686 | 10 | reservado | espacios |
| 687-693 | 7 | actividad económica riesgos | número |

### 2.4 Fórmulas financieras

- `salario = command.getSalario().setScale(0, HALF_UP)`
- `ibcPension = salario`
- `ibcSalud = salario`
- `ibcArl = salario`
- `ibcCcf = 0`

#### Tarifas

- pensión: `0.16000`
- salud: `0.12500`
- ARL:
  - clase 1: `0.00522`
  - clase 2: `0.01044`
  - clase 3: `0.02436`
  - clase 4: `0.04350`
  - clase 5: `0.06960`

#### Redondeo PILA

```java
BigDecimal value = BigDecimal.valueOf(base).multiply(rate);
long roundedPeso = value.setScale(0, RoundingMode.CEILING).longValue();
return ((roundedPeso + 99L) / 100L) * 100L;
```

Interpretación:

- multiplica base * tarifa
- redondea hacia arriba al peso
- luego ajusta al siguiente múltiplo de 100

### 2.5 Nombre del archivo

```text
{tipoDocumento}{numeroDocumento}_{periodoPagoSinGuiones}.txt
```

Ejemplo:

```text
CC123456789_202606.txt
```

---

## 3. Caso de uso principal

Archivo:

- [`AportesSeguridadSocialService.java`](../src/main/java/com/ada/ecosystem/gestioncontratistas/v1/domain/service/AportesSeguridadSocialService.java)

### 3.1 Orden exacto de llamadas

#### `generarToken()`

- delega directamente a `pagoSimplePilaPort.login()`

#### `vincularContratista(ciTercero)`

1. `resolverDatosAportante(ciTercero)`
2. si `idAportante` ya existe:
   - `login()`
   - `autorizarAportante(idAportante, tipoDocumento, numeroDocumento, session)`
   - `consultarAportanteIndependiente(idAportante, session, authorization)`
3. si no existe:
   - `aportanteCommandMapper.toCommand(datos)`
   - `login()`
   - `crearAportanteIndependiente(command, session)`
   - `autorizarAportante(...)`
   - `consultarAportanteIndependiente(...)`
   - `guardarIdAportante(ciTercero, aportante)`

#### `generarYValidarPlanilla(command)`

1. `resolverDatosAportante(command.getCiTercero())`
2. `aportanteCommandMapper.aplicarDatosTercero(command, datos)`
3. `command.setIdAportante(resolverIdAportante(datos))`
4. `login()`
5. `planillaPilaGenerator.generar(command)`
6. `resolverAutorizacionPlanilla(command, session)`
7. `validarPlanilla(archivo, command, session, authorization)`
8. construir resultado final con aportante + archivo + validación

#### `consultarTotalesPlanilla(numeroPlanilla, ciTercero)`

1. `resolverDatosAportante(ciTercero)`
2. `login()`
3. `autorizarAportante(...)`
4. `consultarTotalesPlanilla(numeroPlanilla, session, authorization)`

#### `generarUrlPagoPlanilla(numeroPlanilla, ciTercero)`

1. `resolverDatosAportante(ciTercero)`
2. `login()`
3. `autorizarAportante(...)`
4. `generarUrlPagoPlanilla(numeroPlanilla, session, authorization)`

#### `consultarInformacionBduaRuaf(command)`

1. validar request
2. `login()`
3. `consultarInformacionBduaRuaf(command, session)`

### 3.2 Manejo de `idAportante`

- si el tercero ya tiene `idAportante` en `MAESTRO_TERCEROS`, se reutiliza
- si no tiene, se crea en PagoSimple
- después de crear el aportante:
  - se guarda `idAportante` en `MAESTRO_TERCEROS.CODIGO_APORTANTE`

### 3.3 Manejo de errores

- si `ciTercero` es `null`, lanza `OnboardingException`
- si no existe tercero, lanza `NoSuchElementException`
- si no existe `idAportante`, lanza `OnboardingException`
- si `idAportante` no es numérico, lanza `OnboardingException`
- si PagoSimple responde mal, el adapter convierte el error a:
  - `PagoSimplePilaException`
  - o `ServicioExternoNoDisponibleException`

---

## 4. Cliente HTTP de PagoSimple PILA

Archivo:

- [`PagoSimplePilaClientAdapter.java`](../src/main/java/com/ada/ecosystem/gestioncontratistas/v1/infrastructure/adapter/out/client/PagoSimplePilaClientAdapter.java)

### 4.1 Headers base

#### JSON

- `Content-Type: application/json`
- `Accept: application/json`

#### Autorizados

- `nit`
- `token`
- `session_token`

#### Autorizados con autorización adicional

- `nit`
- `token`
- `session_token`
- `auth_token`

#### BDUA/RUAF

- `nit`
- `token`

#### Validación de planilla

- `Content-Type: multipart/form-data`
- `Accept: application/json`
- `nit`
- `token`
- `session_token`
- `auth_token`

### 4.2 Endpoint: `/auth/login`

#### Request

```http
POST {base-url}/auth/login
Content-Type: application/json
```

#### Body

```json
{
  "document_type": "CC",
  "document": "71337829",
  "password": "2041",
  "nit": "71337829",
  "company": "...",
  "secret_key": "..."
}
```

#### Response

```json
{
  "success": true,
  "code": 200,
  "data": {
    "token": "...",
    "session_token": "..."
  },
  "message": "...",
  "description": "..."
}
```

### 4.3 Endpoint: `/contributor`

#### Request

```http
POST {base-url}/contributor
Content-Type: application/json
nit: <nit>
token: <token>
session_token: <session_token>
```

#### Shape del JSON

```json
{
  "economic_activity_code": "xxxx",
  "classification_contributor_code": "I",
  "classification_contributor_id": 2,
  "occupational_risk_administrator_code": "14-11",
  "digit_verification": 0,
  "status": "ACTIVE",
  "presentation_format_id": 1,
  "id": null,
  "legal_nature_id": 2,
  "identification_number": "123456789",
  "pay_esap_min": false,
  "business_name": "NOMBRE",
  "segment_id": 1,
  "type_action_id": 5,
  "type_contributor_id": 2,
  "type_identification": "CC",
  "type_payer_pension_id": 1,
  "type_person_id": 1,
  "information_contact": {
    "department_code": "05",
    "municipal_code": "05001000",
    "email": "...",
    "extra_email": "",
    "fax": "...",
    "id": null,
    "cell_phone_number": "...",
    "phone_number": "...",
    "identification_number": "...",
    "surname": "...",
    "first_name": "...",
    "second_surname": "",
    "second_name": "",
    "type_identification": "CC",
    "address_data": {
      "full_address": "..."
    }
  },
  "extra_validation": {
    "contributor_id": null,
    "family_compensation_fund_benefit": "N",
    "sheet_duplication": "S",
    "exonerated_parafiscal_payment": "S",
    "id": null,
    "new_income_withdrawal": "N",
    "replaces_contributing_health_administrator": "N",
    "replaces_contributing_names": "S",
    "replaces_contributor_upc_value": "N",
    "type_assisted_payment_voucher_id": 2,
    "values_voucher": "N"
  }
}
```

#### Notas

- en el código algunos campos se fuerzan a constantes:
  - `classification_contributor_id = 2`
  - `legal_nature_id = 2`
  - `type_action_id = 5`
  - `type_contributor_id = 2`
- el contacto usa:
  - dirección
  - email
  - teléfono
  - celular
  - primer/segundo nombre y apellido

### 4.4 Endpoint: `/auth/{id}/{documentType}/{document}`

#### Request

```http
GET {base-url}/auth/{id}/{documentType}/{document}
nit: <nit>
token: <token>
session_token: <session_token>
```

#### Respuesta

```json
{
  "success": true,
  "code": 200,
  "data": {
    "auth_token": "..."
  },
  "message": "...",
  "description": "..."
}
```

### 4.5 Endpoint: `/contributor/independent/{id}`

#### Request

```http
GET {base-url}/contributor/independent/{id}
nit: <nit>
token: <token>
session_token: <session_token>
auth_token: <auth_token>
```

#### Respuesta

```json
{
  "success": true,
  "code": 200,
  "data": {
    "id": "...",
    "type_identification": "CC",
    "identification_number": "...",
    "business_name": "...",
    "type_contributor_id": "...",
    "classification_contributor_id": "...",
    "classification_contributor_code": "...",
    "digit_verification": "...",
    "presentation_format_id": "...",
    "type_person_id": "...",
    "type_person_code": "...",
    "legal_nature_id": "...",
    "type_action_id": "...",
    "occupational_risk_administrator_code": "...",
    "economic_activity_id": "...",
    "economic_activity_code": "...",
    "status": "...",
    "type_payer_pension_id": "...",
    "segment_id": "..."
  },
  "message": "...",
  "description": "..."
}
```

### 4.6 Endpoint: `/payroll/validate`

#### Request

```http
POST {base-url}/payroll/validate
Content-Type: multipart/form-data
nit: <nit>
token: <token>
session_token: <session_token>
auth_token: <auth_token>
```

#### Partes del multipart

```text
execution_params = JSON string
payroll_file = archivo plano PILA (.txt)
```

#### `execution_params`

```json
{
  "is_UGPP": false,
  "is_novelties_planillaN": false,
  "file_type": "I"
}
```

#### `payroll_file`

- `Content-Type: text/plain`
- `Content-Disposition: form-data; name="payroll_file"; filename="<archivo>.txt"`

#### Respuesta

```json
{
  "success": true,
  "code": 200,
  "data": {
    "validation_status": "...",
    "payroll_validations": [
      {
        "payroll_code": 0,
        "payroll_number": 0,
        "number_errors_contributor": 0,
        "number_errors_company": 0,
        "number_warnings": 0,
        "detail_errors_contributor": [],
        "detail_errors_company": [],
        "detail_warnings": []
      }
    ]
  },
  "message": "...",
  "description": "..."
}
```

### 4.7 Endpoint: `/payroll/total/{payrollNumber}`

#### Request

```http
GET {base-url}/payroll/total/{payrollNumber}
nit: <nit>
token: <token>
session_token: <session_token>
auth_token: <auth_token>
```

#### Respuesta

```json
{
  "success": true,
  "code": 200,
  "data": {
    "document_type": "CC",
    "document_number": "...",
    "verification_digit": "...",
    "report_date": "...",
    "contributor_name": "...",
    "payroll_number": 123,
    "quote_period": "2026-06",
    "service_period": "2026-06",
    "affiliates_number": 1,
    "limit_date": "...",
    "payroll_status": "...",
    "administrator_total_value": [
      {
        "identification": "...",
        "verification_digit": 0,
        "administrator_code": "...",
        "administrator_name": "...",
        "administrator_type": "...",
        "affiliates": "...",
        "total_without_arrear": 0,
        "arrear_value": 0,
        "total": 0
      }
    ],
    "total_without_arrear": 0,
    "arrear_value": 0,
    "total_to_pay": 0
  },
  "message": "...",
  "description": "..."
}
```

### 4.8 Endpoint: `/payroll/payment/{payrollNumber}`

#### Request

```http
GET {base-url}/payroll/payment/{payrollNumber}
nit: <nit>
token: <token>
session_token: <session_token>
auth_token: <auth_token>
```

#### Respuesta

```json
{
  "success": true,
  "code": 200,
  "data": "https://...",
  "message": "...",
  "description": "..."
}
```

### 4.9 Endpoint: `/bdua-ruaf/data`

#### Request

```http
POST {base-url}/bdua-ruaf/data
Content-Type: application/json
nit: <nit>
token: <token>
```

#### Body

```json
{
  "document_type": "CC",
  "document": "123456789"
}
```

#### Respuesta

```json
{
  "success": true,
  "code": 200,
  "data": [
    {
      "affiliate_type": "C",
      "document_type": "CC",
      "document": "123456789",
      "first_last_name": "...",
      "second_last_name": "...",
      "first_name": "...",
      "second_name": "...",
      "bdua_eps_code": "...",
      "bdua_administrator_nit": "...",
      "bdua_administrator_name": "...",
      "bdua_affiliate_date": "yyyyMMdd",
      "ruaf_afp_code": "...",
      "ruaf_administrator_nit": "...",
      "ruaf_administrator_name": "...",
      "ruaf_affiliate_date": "yyyyMMdd",
      "is_pensionary": "..."
    }
  ],
  "message": "...",
  "description": "..."
}
```

---

## 5. Origen de los datos del aportante

El adaptador que arma `DatosAportanteIndependientePagoSimple` es:

- [`AportanteIndependientePagoSimpleRepositoryAdapter.java`](../src/main/java/com/ada/ecosystem/gestioncontratistas/v1/infrastructure/adapter/out/persistence/AportanteIndependientePagoSimpleRepositoryAdapter.java)

### 5.1 Tablas / fuentes locales

#### `TESORE01.MAESTRO_TERCEROS`

Entidad:

- [`MaestroTercerosJpaEntity.java`](../src/main/java/com/ada/ecosystem/gestioncontratistas/v1/infrastructure/adapter/out/persistence/MaestroTercerosJpaEntity.java)

Repositorio:

- [`MaestroTercerosJpaRepository.java`](../src/main/java/com/ada/ecosystem/gestioncontratistas/v1/infrastructure/adapter/out/persistence/MaestroTercerosJpaRepository.java)

Campos usados:

- `codigoTercero` → `ciTercero`
- `tipoDocumento`
- `nitsd`
- `nit` para dígito verificador
- `primerNombre`
- `segundoNombre`
- `primerApellido`
- `segundoApellido`
- `nombre`
- `telefono`
- `celular`
- `codigoPais`
- `codigoCiudad`
- `direccion`
- `email`
- `actividadEconomica`
- `codigoAportante`

#### `CONTRATACIONES.SEGURIDAD_SOCIAL_CONTRATISTA`

Entidad:

- [`SeguridadSocialContratistaJpaEntity.java`](../src/main/java/com/ada/ecosystem/gestioncontratistas/v1/infrastructure/adapter/out/persistence/SeguridadSocialContratistaJpaEntity.java)

Repositorio:

- [`SeguridadSocialContratistaJpaRepository.java`](../src/main/java/com/ada/ecosystem/gestioncontratistas/v1/infrastructure/adapter/out/persistence/SeguridadSocialContratistaJpaRepository.java)

Se usa para recuperar:

- `IBC`
- `CLASE_RIESGO`
- `TIPO_COTIZANTE`
- `SUBTIPO_COTIZANTE`
- `ENTIDAD_SALUD`
- `ENTIDAD_PENSION`
- `CAJA_COMPENSACION`
- `ENTIDAD_ARL`

#### Catálogos de entidades

- `EntidadSaludJpaRepository`
- `EntidadPensionJpaRepository`
- `EntidadCajaCompensacionJpaRepository`
- `EntidadArlJpaRepository`

Esos catálogos aportan el `codigoPlanilla` de cada entidad:

- EPS
- AFP
- CCF
- ARL

### 5.2 Cómo se arma `DatosAportanteIndependientePagoSimple`

Se llenan los campos así:

- `ciTercero` ← `MaestroTerceros.codigoTercero`
- `idAportante` ← `MAESTRO_TERCEROS.codigo_aportante`
- `tipoDocumento` ← normalización de `MaestroTerceros.tipoDocumento`
- `numeroDocumento` ← `MaestroTerceros.nitsd`
- `digitoVerificacion` ← decimal de `MaestroTerceros.nit`
- `nombreCompleto` ← `nombre` o nombres + apellidos
- `primerNombre` ← `primerNombre`
- `segundoNombre` ← `segundoNombre`
- `primerApellido` ← `primerApellido`
- `segundoApellido` ← `segundoApellido`
- `codigoDepartamento` ← primeros 2 dígitos de `codigoCiudad`
- `codigoMunicipio` ← `codigoCiudad` normalizado
- `email` ← `email`
- `telefono` ← `telefono`
- `celular` ← `celular`
- `direccion` ← `direccion`
- `codigoActividadEconomica` ← prefijo numérico de `actividadEconomica`
- `codigoArl` ← catálogo ARL
- `ibc` ← seguridad social
- `codigoAfp` ← catálogo AFP
- `codigoEps` ← catálogo EPS
- `codigoCcf` ← catálogo CCF
- `claseRiesgo` ← seguridad social
- `tipoCotizante` ← seguridad social
- `subtipoCotizante` ← seguridad social
- `actividadEconomicaRiesgos` ← código de actividad económica convertido a formato PILA

### 5.3 Reglas de normalización relevantes

- `tipoDocumento`:
  - `1` → `CC`
  - `2` → `CE`
  - `3` → `NIT`
  - `4` → `TI`
  - `5` → `PA`
  - también normaliza texto con acentos y variantes
- `codigoMunicipio`:
  - se formatea a 5 dígitos
- `codigoDepartamento`:
  - primeros 2 dígitos del municipio
- `actividadEconomicaRiesgos`:
  - si tiene 7 o más dígitos, toma los primeros 7
  - si tiene 4 dígitos, lo convierte a `0 + digits + 00`
  - si no, devuelve los dígitos tal cual

---

## 6. Modelos de dominio relevantes

### Aportante

- [`AportanteIndependiente.java`](../src/main/java/com/ada/ecosystem/gestioncontratistas/v1/domain/model/AportanteIndependiente.java)
- [`AportanteIndependienteCommand.java`](../src/main/java/com/ada/ecosystem/gestioncontratistas/v1/domain/model/AportanteIndependienteCommand.java)
- [`DatosAportanteIndependientePagoSimple.java`](../src/main/java/com/ada/ecosystem/gestioncontratistas/v1/domain/model/DatosAportanteIndependientePagoSimple.java)

### Validación

- [`ValidacionPlanillaPila.java`](../src/main/java/com/ada/ecosystem/gestioncontratistas/v1/domain/model/ValidacionPlanillaPila.java)
- [`PlanillaValidation.java`](../src/main/java/com/ada/ecosystem/gestioncontratistas/v1/domain/model/PlanillaValidation.java)
- [`PlanillaValidationDetail.java`](../src/main/java/com/ada/ecosystem/gestioncontratistas/v1/domain/model/PlanillaValidationDetail.java)

### Totales

- [`TotalesPlanillaPila.java`](../src/main/java/com/ada/ecosystem/gestioncontratistas/v1/domain/model/TotalesPlanillaPila.java)
- [`TotalAdministradorPlanilla.java`](../src/main/java/com/ada/ecosystem/gestioncontratistas/v1/domain/model/TotalAdministradorPlanilla.java)
- [`UrlPagoPlanillaPila.java`](../src/main/java/com/ada/ecosystem/gestioncontratistas/v1/domain/model/UrlPagoPlanillaPila.java)

### Orquestación

- [`GenerarPlanillaSeguridadSocialCommand.java`](../src/main/java/com/ada/ecosystem/gestioncontratistas/v1/domain/model/GenerarPlanillaSeguridadSocialCommand.java)
- [`GenerarPlanillaSeguridadSocialResult.java`](../src/main/java/com/ada/ecosystem/gestioncontratistas/v1/domain/model/GenerarPlanillaSeguridadSocialResult.java)
- [`PagoSimpleSession.java`](../src/main/java/com/ada/ecosystem/gestioncontratistas/v1/domain/model/PagoSimpleSession.java)
- [`PagoSimpleAuthorization.java`](../src/main/java/com/ada/ecosystem/gestioncontratistas/v1/domain/model/PagoSimpleAuthorization.java)

---

## 7. Contrato público del controlador

Archivo:

- [`AportesSeguridadSocialController.java`](../src/main/java/com/ada/ecosystem/gestioncontratistas/v1/infrastructure/adapter/in/rest/AportesSeguridadSocialController.java)

### Rutas

- `POST /api/v1/pago-simple/token`
- `POST /api/v1/pago-simple/aportantes/independiente/vincular`
- `POST /api/v1/pago-simple/planillas/validar`
- `POST /api/v1/pago-simple/bdua-ruaf/data`
- `GET /api/v1/pago-simple/payroll/total/{payrollNumber}`
- `GET /api/v1/pago-simple/planillas/{payrollNumber}/totales`
- `GET /api/v1/pago-simple/payroll/payment/{payrollNumber}`
- `GET /api/v1/pago-simple/planillas/{payrollNumber}/url-pago`

### Requests principales

#### `PagoSimpleTokenRequest`

- credenciales opcionales para generar token

#### `VincularAportantePagoSimpleRequest`

```json
{
  "ciTercero": 123456
}
```

#### `GenerarPlanillaSeguridadSocialRequest`

Campos:

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
- `exonerado`
- `isUgpp`
- `isNoveltiesPlanillaN`
- `fileType`

#### `ConsultarBduaRuafPagoSimpleRequest`

```json
{
  "document_type": "CC",
  "document": "123456789"
}
```

---

## 8. Configuración relevante

Archivo:

- [`src/main/resources/application.properties`](../src/main/resources/application.properties)

### Propiedades de PagoSimple PILA

```properties
pagosimple.pila.base-url=...
pagosimple.pila.nit=...
pagosimple.pila.document-type=...
pagosimple.pila.document=...
pagosimple.pila.password=...
pagosimple.pila.company=...
pagosimple.pila.secret-key=...
```

### Valores embebidos hoy

El proyecto los resuelve desde estas propiedades, con defaults locales:

- `PAGOSIMPLE_PILA_BASE_URL`
- `PAGOSIMPLE_PILA_NIT`
- `PAGOSIMPLE_PILA_DOCUMENT_TYPE`
- `PAGOSIMPLE_PILA_DOCUMENT`
- `PAGOSIMPLE_PILA_PASSWORD`
- `PAGOSIMPLE_PILA_COMPANY`
- `PAGOSIMPLE_PILA_SECRET_KEY`

---

## 9. Archivo PILA de ejemplo

No encontré un `.txt` PILA real ya generado dentro del repo.

Si lo tienes fuera del repo, conviene usarlo como **golden file** para tests del generador:

- comparar longitud exacta
- comparar posiciones fijas
- comparar padding
- comparar resultados financieros

---

## 10. Qué debe migrarse primero

Orden recomendado para portar esto a NestJS:

1. `AportanteIndependientePagoSimpleRepositoryAdapter`
2. `PlanillaPilaGenerator`
3. `PagoSimplePilaClientAdapter`
4. `AportesSeguridadSocialService`
5. `AportesSeguridadSocialController`

Así separas:

- origen del aportante
- generación del archivo
- integración remota
- orquestación
- contrato público

---

## 11. Resumen corto para la Fase 1

Sin estas piezas, la migración de planilla no arranca:

- layout PILA exacto
- reglas de padding y formato
- cálculo de aportes y redondeo
- orden de orquestación
- contrato HTTP de PagoSimple
- origen local de datos del aportante
- mappings de EPS/AFP/ARL/CCF

---

## 12. Recomendación de implementación en NestJS

Separarlo en estos componentes:

- `PagoSimpleClient`
- `PlanillaPilaGenerator`
- `AportanteSourceGateway`
- `PlanillaIntegrationService`
- `PlanillaController`

Y persistir:

- `idAportante`
- último resultado de validación
- totales
- URL de pago
- estado de integración

