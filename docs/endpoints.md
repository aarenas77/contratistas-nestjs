# Documentación de la API — `cuentas-cobro-api`

**Base URL:** `http://localhost:3000/api/v1`  
**Swagger UI:** `http://localhost:3000/api`  
**Autenticación:** Bearer JWT en header `Authorization: Bearer {token}`

---

## Roles del sistema

| Rol | Descripción |
|---|---|
| `CONTRATISTA` | Crea y gestiona sus propias cuentas de cobro |
| `SUPERVISOR` | Revisa cuentas radicadas de sus contratistas |
| `APROBADOR` | Aprueba cuentas revisadas. Crea usuarios |

---

## Enumeraciones

**`EstadoCuentaCobro`**
```
BORRADOR | RADICADA | EN_REVISION_SUPERVISOR | DEVUELTA_CONTRATISTA
APROBADA_SUPERVISOR | EN_REVISION_APROBADOR | RECHAZADA_APROBADOR
LIQUIDADA | ENVIADA_CONTABILIDAD
```

**`EstadoSeccion`**
```
PENDIENTE | APROBADO | RECHAZADO | SIN_OBSERVACIONES
```

**`CodigoConcepto`** (gastos)
```
ALIMENTACION | TRANSPORTE | ALOJAMIENTO | OTROS
```

---

## Módulo Auth — `/auth`

| Método | Ruta | Roles | Descripción |
|---|---|---|---|
| `POST` | `/auth/login` | Público | Login con username y password |
| `POST` | `/auth/dev-token` | Público (solo dev) | Genera token de desarrollo |
| `GET` | `/auth/me` | Cualquier rol | Retorna el usuario del token actual |
| `POST` | `/auth/usuarios` | `APROBADOR` | Crea un nuevo usuario en el sistema |

---

### `POST /auth/login`

**Body**
```json
{
  "username": "string",
  "password": "string"
}
```

**Response `200`**
```json
{
  "accessToken": "string",
  "user": {
    "nombre": "string",
    "codigoTercero": "string",
    "rol": "CONTRATISTA | SUPERVISOR | APROBADOR"
  }
}
```

---

### `POST /auth/dev-token`

Solo disponible cuando `NODE_ENV=development`.

**Body**
```json
{
  "rol": "SUPERVISOR",
  "nombre": "string",
  "codigoTercero": "string",
  "userIdentification": "string (opcional)",
  "companyId": 1,
  "subsidiaryId": 1
}
```

**Response `200`**
```json
{
  "accessToken": "string"
}
```

---

### `GET /auth/me`

Sin body.

**Response `200`**
```json
{
  "sub": "string",
  "nombre": "string",
  "codigoTercero": "string",
  "userIdentification": "string",
  "rol": "CONTRATISTA | SUPERVISOR | APROBADOR"
}
```

---

### `POST /auth/usuarios`

**Body**
```json
{
  "username": "string",
  "password": "string (min 6 chars)",
  "nombre": "string",
  "email": "string (opcional)",
  "codigoTercero": "string",
  "userIdentification": "string",
  "rol": "CONTRATISTA | SUPERVISOR | APROBADOR"
}
```

**Response `201`**
```json
{
  "id": "bigint",
  "username": "string",
  "nombre": "string",
  "email": "string | null",
  "codigoTercero": "string",
  "userIdentification": "string",
  "rol": "string",
  "activo": true,
  "createdAt": "ISO datetime",
  "updatedAt": "ISO datetime"
}
```

---

## Módulo Registro de Contratistas — `/registro-contratistas`

Registro por pasos para contratistas invitados (sin autenticación previa). El frontend conserva
los datos extraídos y los reenvía al finalizar (flujo *stateless*).

> **Nota temporal:** el `codigoTercero` real proviene de un sistema de precarga aún no integrado.
> Mientras tanto se usa el endpoint `codigo-tercero-temporal` que genera un placeholder único.

| Método | Ruta | Roles | Descripción |
|---|---|---|---|
| `POST` | `/registro-contratistas/extraer` | Público | Extrae datos del RUT y la certificación bancaria desde los PDFs |
| `POST` | `/registro-contratistas/codigo-tercero-temporal` | Público | Genera un `codigoTercero` temporal |
| `POST` | `/registro-contratistas/finalizar` | Público | Crea el usuario contratista y devuelve sus credenciales |

---

### `POST /registro-contratistas/extraer`

**Body** `multipart/form-data`
```
rut:                 archivo PDF (max 10 MB, requerido)
certificadoBancario: archivo PDF (max 10 MB, requerido)
```

**Response `200`**
```json
{
  "rut": {
    "codigoVerificacion": 5,
    "tipoDocumento": "Cédula de Ciudadanía",
    "numeroIdentificacion": "1036662102",
    "nit": "1036662102",
    "primerApellido": "OTERO",
    "segundoApellido": "ARANGO",
    "primerNombre": "BRANDEL",
    "segundoNombre": "DANIEL",
    "razonSocial": null,
    "nombreComercial": "TALLER INDUSTRIAL OTEROS",
    "tipoContribuyente": "Persona natural o sucesión ilíquida",
    "pais": "COLOMBIA",
    "departamento": "Antioquia",
    "ciudad": "Itagui",
    "direccion": "CR   52       78   97",
    "correoElectronico": "comercial@industriasoteros.com.co",
    "telefono1": "6046006394",
    "telefono2": "3122305066",
    "actividadEconomicaPrincipal": null,
    "actividadEconomicaSecundaria": null,
    "responsabilidadesTributarias": ["49"],
    "numeroFormulario": "141152791843",
    "codigoDepartamento": "05",
    "codigoPais": "169"
  },
  "certificadoBancario": {
    "entidadBancaria": "BANCOLOMBIA",
    "tipoCuenta": "1",
    "numeroCuenta": "36593235038"
  }
}
```

> La extracción se delega a un servicio legacy configurado por `GESTION_CONTRATISTAS_URL`,
> `LEGACY_EXTRACCION_PATH` y `LEGACY_API_TOKEN`. Si el legacy falla responde `502`.

---

### `POST /registro-contratistas/codigo-tercero-temporal`

Sin body.

**Response `200`**
```json
{
  "codigoTercero": "TMP-3f9a2c1b"
}
```

---

### `POST /registro-contratistas/finalizar`

**Body** — reenvía los datos extraídos más el `codigoTercero` obtenido en el paso previo.
```json
{
  "rut": { "...": "objeto rut devuelto por /extraer" },
  "certificadoBancario": { "...": "objeto certificadoBancario devuelto por /extraer" },
  "codigoTercero": "TMP-3f9a2c1b"
}
```

**Response `201`**
```json
{
  "username": "brandel.otero",
  "password": "string (texto plano, una sola vez)",
  "usuario": {
    "id": "bigint",
    "nombre": "BRANDEL DANIEL OTERO ARANGO",
    "email": "comercial@industriasoteros.com.co",
    "codigoTercero": "TMP-3f9a2c1b",
    "rol": "CONTRATISTA"
  }
}
```

- `username` se genera como `primernombre.primerapellido` (normalizado, con sufijo numérico si colisiona).
- `password` es aleatoria y se devuelve en texto plano **una sola vez** para que el sistema invocante envíe el correo de bienvenida.
- Responde `409` si ya existe un usuario con esa identificación o correo.

---

## Módulo Contratos — `/contratos`

| Método | Ruta | Roles | Descripción |
|---|---|---|---|
| `GET` | `/contratos` | `CONTRATISTA` | Lista contratos del contratista autenticado |

---

### `GET /contratos`

**Query params**
```
page?: number  (default: 0)
size?: number  (default: 10, max: 50)
```

**Response `200`**
```json
{
  "response": {
    "length": 1,
    "statusCode": 200,
    "body": {
      "size": 10,
      "number": 0,
      "numberOfElements": 5,
      "totalElements": 5,
      "totalPages": 1,
      "content": [
        {
          "codigoContrato": 39492,
          "consecutivo": "string",
          "descripcion": "string",
          "codigoTercero": 12345,
          "valor": 5000000,
          "totalPago": 1000000,
          "estado": "string",
          "fechaElaboracion": "ISO date | null",
          "fechaAprobacion": "ISO date | null",
          "fechaFin": "ISO date | null",
          "fechaRegistro": "ISO date | null",
          "fechaInicioSecop": "ISO date | null",
          "plazoDias": 30,
          "tipoPlazo": "string",
          "consecutivoCompromiso": 1,
          "estadoCompromiso": "string",
          "numeroActaInicioString": "number | null",
          "saldoDisponibleOtrosGastos": 0,
          "idSupervisor": "string | null",
          "codigoDependencia": "number | null",
          "codigoMempresa": 1
        }
      ]
    }
  }
}
```

---

## Módulo Cuentas de Cobro — `/cuentas-cobro`

| Método | Ruta | Roles | Descripción |
|---|---|---|---|
| `POST` | `/cuentas-cobro` | `CONTRATISTA` | Crea una cuenta de cobro en estado BORRADOR |
| `GET` | `/cuentas-cobro` | `CONTRATISTA` | Lista cuentas del contratista por contrato |
| `GET` | `/cuentas-cobro/:id` | `CONTRATISTA`, `SUPERVISOR`, `APROBADOR` | Obtiene el detalle completo de una cuenta |
| `GET` | `/cuentas-cobro/:id/resumen-radicacion` | `CONTRATISTA` | Vista previa antes de radicar |
| `POST` | `/cuentas-cobro/:id/radicar` | `CONTRATISTA` | Radica la cuenta (cambia estado a RADICADA) |

---

### `POST /cuentas-cobro`

**Body**
```json
{
  "codigoContrato": 39492,
  "fechaInicio": "2026-01-01",
  "fechaFin": "2026-01-31",
  "valorCobrado": 5000000
}
```

**Response `201`**
```json
{
  "id": "bigint",
  "ticket": 1,
  "codigoContrato": 39492,
  "codigoTercero": "string",
  "codigoTerceroSupervisor": "string | null",
  "estado": "BORRADOR",
  "fechaSolicitud": null,
  "fechaInicio": "ISO datetime",
  "fechaFin": "ISO datetime",
  "valorCobrado": 5000000,
  "observaciones": null,
  "declaracion": false,
  "createdAt": "ISO datetime",
  "updatedAt": "ISO datetime"
}
```

---

### `GET /cuentas-cobro`

**Query params**
```
codigoContrato: number  (requerido)
page?: number           (default: 0)
size?: number           (default: 10, max: 50)
```

**Response `200`**
```json
{
  "success": true,
  "message": "string",
  "data": [
    {
      "idPago": 1,
      "ticket": 1,
      "contrato": "string",
      "codigoContrato": 39492,
      "codigoTercero": 12345,
      "codigoTerceroSupervisor": "number | null",
      "idEstado": 1,
      "estado": "BORRADOR",
      "fechaInicio": "ISO datetime",
      "fechaFin": "ISO datetime",
      "fechaSolicitud": "string | null",
      "valorSolicitud": 5000000,
      "disponibleParaRadicar": false
    }
  ],
  "totalElementos": 10,
  "paginaActual": 0,
  "tamañoPagina": 10,
  "totalElementosPagina": 10,
  "totalPaginas": 1,
  "primera": true,
  "ultima": true,
  "timestamp": "ISO datetime"
}
```

---

### `GET /cuentas-cobro/:id`

Sin body ni query params.

**Response `200`**
```json
{
  "id": "bigint",
  "ticket": 1,
  "codigoContrato": 39492,
  "codigoTercero": "string",
  "codigoTerceroSupervisor": "string | null",
  "estado": "RADICADA",
  "fechaSolicitud": "ISO datetime | null",
  "fechaInicio": "ISO datetime",
  "fechaFin": "ISO datetime",
  "valorCobrado": 5000000,
  "observaciones": "string | null",
  "declaracion": false,
  "createdAt": "ISO datetime",
  "updatedAt": "ISO datetime",
  "planilla": { "...Planilla" },
  "actividades": [ { "...Actividad" } ],
  "gastos": [ { "...OtroGasto" } ],
  "checklistItems": [ { "...ChecklistRetefuente" } ],
  "ejecucionFisica": { "...EjecucionFisica" },
  "historialEstados": [ { "...HistorialEstado" } ]
}
```

---

### `GET /cuentas-cobro/:id/resumen-radicacion`

Sin body ni query params.

**Response `200`**
```json
{
  "cuentaCobroId": 1,
  "estado": "BORRADOR",
  "fechaInicio": "ISO datetime",
  "fechaFin": "ISO datetime",
  "valorCobrado": 5000000,
  "actividades": {
    "total": 2,
    "items": [
      {
        "id": "bigint",
        "descripcion": "string",
        "fechaActividad": "ISO datetime",
        "adjuntos": [{ "id": "bigint", "nombre": "string" }]
      }
    ]
  },
  "planilla": {
    "plantillaPagoNo": 12345,
    "fechaPago": "ISO datetime | null",
    "periodoPagado": "ENERO 2026",
    "ingresoBaseCotizacion": 5000000,
    "aporteSalud": 212500,
    "aportePension": 200000,
    "aporteArl": 10000,
    "valorPagado": 422500
  },
  "checklist": {
    "total": 6,
    "respondidos": 3,
    "items": [
      { "idChecklist": 1, "nombre": "string", "kaNlCumple": 1 }
    ]
  },
  "gastos": {
    "total": 1,
    "valorTotal": 50000,
    "items": [
      {
        "id": "bigint",
        "codigoConcepto": "TRANSPORTE",
        "valor": 50000,
        "fecha": "ISO datetime",
        "observacion": "string | null"
      }
    ]
  }
}
```

---

### `POST /cuentas-cobro/:id/radicar`

Sin body.

**Response `200`**
```json
{
  "id": "bigint",
  "ticket": 1,
  "estado": "RADICADA",
  "fechaSolicitud": "ISO datetime",
  "mensaje": "Cuenta de cobro radicada exitosamente"
}
```

---

## Módulo Actividades — `/actividades`

| Método | Ruta | Roles | Descripción |
|---|---|---|---|
| `POST` | `/actividades/:cuentaCobroId` | `CONTRATISTA` | Agrega actividad con adjunto (`multipart/form-data`) |
| `GET` | `/actividades/:cuentaCobroId` | `CONTRATISTA`, `SUPERVISOR`, `APROBADOR` | Lista actividades de la cuenta |
| `GET` | `/actividades/adjunto/:adjuntoId` | `CONTRATISTA`, `SUPERVISOR`, `APROBADOR` | Descarga el adjunto de una actividad |
| `DELETE` | `/actividades/:actividadId` | `CONTRATISTA` | Elimina actividad y su adjunto |

---

### `POST /actividades/:cuentaCobroId`

**Content-Type:** `multipart/form-data`

**Body (form fields)**
```
descripcion:     string
fechaActividad:  string (ISO date)
archivo:         file (max 10 MB)
```

**Response `201`**
```json
{
  "id": "bigint",
  "cuentaCobroId": "bigint",
  "descripcion": "string",
  "fechaActividad": "ISO datetime",
  "estadoRevision": "PENDIENTE",
  "observacionRevision": null,
  "createdAt": "ISO datetime",
  "updatedAt": "ISO datetime",
  "adjunto": {
    "id": 1,
    "nombre": "archivo.pdf",
    "mimeType": "application/pdf"
  }
}
```

---

### `GET /actividades/:cuentaCobroId`

Sin body ni query params.

**Response `200`**
```json
[
  {
    "id": "bigint",
    "cuentaCobroId": "bigint",
    "descripcion": "string",
    "fechaActividad": "ISO datetime",
    "estadoRevision": "PENDIENTE | APROBADO | RECHAZADO",
    "observacionRevision": "string | null",
    "createdAt": "ISO datetime",
    "updatedAt": "ISO datetime",
    "adjuntos": [
      {
        "id": "bigint",
        "nombre": "string",
        "mimeType": "string | null",
        "tamanioBytes": "number | null",
        "createdAt": "ISO datetime"
      }
    ]
  }
]
```

---

### `GET /actividades/adjunto/:adjuntoId`

Sin body.

**Response `200`** — Archivo binario con headers:
```
Content-Type: <mimeType>
Content-Disposition: attachment; filename="<nombre>"
Content-Length: <tamanioBytes>
```

---

### `DELETE /actividades/:actividadId`

Sin body.

**Response `204`** — Sin contenido.

---

## Módulo Gastos — `/gastos`

| Método | Ruta | Roles | Descripción |
|---|---|---|---|
| `POST` | `/gastos/:cuentaCobroId` | `CONTRATISTA` | Agrega gasto con evidencia (`multipart/form-data`) |
| `GET` | `/gastos/:cuentaCobroId` | `CONTRATISTA`, `SUPERVISOR`, `APROBADOR` | Lista gastos de la cuenta |
| `GET` | `/gastos/adjunto/:adjuntoId` | `CONTRATISTA`, `SUPERVISOR`, `APROBADOR` | Descarga la evidencia de un gasto |
| `DELETE` | `/gastos/:gastoId` | `CONTRATISTA` | Elimina gasto y su evidencia |

---

### `POST /gastos/:cuentaCobroId`

**Content-Type:** `multipart/form-data`

**Body (form fields)**
```
codigoConcepto:  ALIMENTACION | TRANSPORTE | ALOJAMIENTO | OTROS
valor:           number (positivo)
fecha:           string (ISO date)
observacion?:    string (max 500 chars)
archivo:         file (max 10 MB)
```

**Response `201`**
```json
{
  "id": "bigint",
  "cuentaCobroId": "bigint",
  "fecha": "ISO datetime",
  "codigoConcepto": "TRANSPORTE",
  "observacion": "string | null",
  "valor": 50000,
  "estadoRevision": "PENDIENTE",
  "observacionRevision": null,
  "adjunto": {
    "id": 1,
    "nombre": "factura.jpg",
    "mimeType": "image/jpeg"
  }
}
```

---

### `GET /gastos/:cuentaCobroId`

Sin body ni query params.

**Response `200`**
```json
[
  {
    "id": "bigint",
    "cuentaCobroId": "bigint",
    "fecha": "ISO datetime",
    "codigoConcepto": "ALIMENTACION | TRANSPORTE | ALOJAMIENTO | OTROS",
    "observacion": "string | null",
    "valor": 50000,
    "estadoRevision": "PENDIENTE | APROBADO | RECHAZADO",
    "observacionRevision": "string | null",
    "adjuntos": [
      {
        "id": "bigint",
        "nombre": "string",
        "mimeType": "string | null",
        "tamanioBytes": "number | null",
        "createdAt": "ISO datetime"
      }
    ]
  }
]
```

---

### `GET /gastos/adjunto/:adjuntoId`

Sin body.

**Response `200`** — Archivo binario con headers:
```
Content-Type: <mimeType>
Content-Disposition: attachment; filename="<nombre>"
Content-Length: <tamanioBytes>
```

---

### `DELETE /gastos/:gastoId`

Sin body.

**Response `204`** — Sin contenido.

---

## Módulo Planilla — `/planilla`

| Método | Ruta | Roles | Descripción |
|---|---|---|---|
| `GET` | `/planilla/:cuentaCobroId` | `CONTRATISTA`, `SUPERVISOR`, `APROBADOR` | Obtiene la planilla de seguridad social |
| `PUT` | `/planilla/:cuentaCobroId` | `CONTRATISTA` | Crea o actualiza la planilla (upsert) |

---

### `GET /planilla/:cuentaCobroId`

Sin body.

**Response `200`**
```json
{
  "id": "bigint",
  "cuentaCobroId": "bigint",
  "plantillaPagoNo": 12345,
  "fechaPago": "ISO datetime | null",
  "periodoPagado": "ENERO 2026",
  "ingresoBaseCotizacion": 5000000,
  "aporteSalud": 212500,
  "aportePension": 200000,
  "aporteArl": 10000,
  "valorPagado": 422500,
  "tipoRiesgoArl": "string | null",
  "estadoRevision": "PENDIENTE | APROBADO | RECHAZADO",
  "observacionRevision": "string | null",
  "idAportante": "string | null",
  "numeroPlanilla": "string | null",
  "urlPago": "string | null",
  "estadoPago": "string | null"
}
```

---

### `PUT /planilla/:cuentaCobroId`

**Body**
```json
{
  "plantillaPagoNo": 12345,
  "fechaPago": "2026-01-31",
  "periodoPagado": "ENERO 2026",
  "ingresoBaseCotizacion": 5000000,
  "aporteSalud": 212500,
  "aportePension": 200000,
  "aporteArl": 10000,
  "valorPagado": 422500
}
```

**Response `200`** — Mismo esquema que `GET /planilla/:cuentaCobroId`.

---

## Módulo Checklist Retefuente — `/checklist-retefuente`

| Método | Ruta | Roles | Descripción |
|---|---|---|---|
| `GET` | `/checklist-retefuente/:cuentaCobroId` | `CONTRATISTA`, `SUPERVISOR`, `APROBADOR` | Obtiene el checklist (se auto-inicializa si no existe) |
| `PATCH` | `/checklist-retefuente/:cuentaCobroId` | `CONTRATISTA` | Actualiza respuestas del checklist en bloque |

---

### `GET /checklist-retefuente/:cuentaCobroId`

Sin body.

**Response `200`**
```json
[
  {
    "id": "bigint",
    "cuentaCobroId": "bigint",
    "idChecklist": 1,
    "nombre": "string | null",
    "kaNlCumple": "1 | 0 | null",
    "observacion": "string | null",
    "estadoRevision": "PENDIENTE | APROBADO | RECHAZADO",
    "observacionRevision": "string | null"
  }
]
```

> `idChecklist`: valores del 1 al 6

---

### `PATCH /checklist-retefuente/:cuentaCobroId`

**Body**
```json
{
  "respuestas": [
    {
      "idChecklist": 1,
      "kaNlCumple": 1,
      "observacion": "string (opcional, max 500)"
    }
  ]
}
```

> `kaNlCumple`: `1` = cumple · `0` = no cumple · `null` = sin responder

**Response `200`** — Mismo esquema que `GET /checklist-retefuente/:cuentaCobroId`.

---

## Módulo Supervisor — `/supervisor`

| Método | Ruta | Roles | Descripción |
|---|---|---|---|
| `GET` | `/supervisor/cuentas-cobro` | `SUPERVISOR` | Lista cuentas radicadas asignadas al supervisor |
| `POST` | `/supervisor/cuentas-cobro/:id/aprobar` | `SUPERVISOR` | Aprueba la cuenta completa |
| `POST` | `/supervisor/cuentas-cobro/:id/rechazar` | `SUPERVISOR` | Rechaza/devuelve la cuenta al contratista |
| `POST` | `/supervisor/cuentas-cobro/:id/secciones/informe-actividades/aprobar` | `SUPERVISOR` | Aprueba la sección de actividades |
| `POST` | `/supervisor/cuentas-cobro/:id/secciones/informe-actividades/rechazar` | `SUPERVISOR` | Rechaza la sección de actividades |
| `POST` | `/supervisor/cuentas-cobro/:id/secciones/planilla/aprobar` | `SUPERVISOR` | Aprueba la sección de planilla |
| `POST` | `/supervisor/cuentas-cobro/:id/secciones/planilla/rechazar` | `SUPERVISOR` | Rechaza la sección de planilla |
| `POST` | `/supervisor/cuentas-cobro/:id/secciones/retenciones/aprobar` | `SUPERVISOR` | Aprueba la sección de retenciones |
| `POST` | `/supervisor/cuentas-cobro/:id/secciones/retenciones/rechazar` | `SUPERVISOR` | Rechaza la sección de retenciones |
| `POST` | `/supervisor/cuentas-cobro/:id/secciones/gastos-adicionales/aprobar` | `SUPERVISOR` | Aprueba la sección de gastos adicionales |
| `POST` | `/supervisor/cuentas-cobro/:id/secciones/gastos-adicionales/rechazar` | `SUPERVISOR` | Rechaza la sección de gastos adicionales |
| `POST` | `/supervisor/cuentas-cobro/:id/secciones/ejecucion-fisica/aprobar` | `SUPERVISOR` | Aprueba la sección de ejecución física |
| `POST` | `/supervisor/cuentas-cobro/:id/secciones/ejecucion-fisica/rechazar` | `SUPERVISOR` | Rechaza la sección de ejecución física |

---

### `GET /supervisor/cuentas-cobro`

**Query params**
```
codigoContrato?: number  (opcional, filtra por contrato)
page?: number            (default: 0)
size?: number            (min: 1, default: sin límite)
```

**Response `200`**
```json
{
  "success": true,
  "message": "string",
  "data": [
    {
      "idPago": 1,
      "ticket": 1,
      "contrato": "string",
      "descripcionContrato": "string",
      "codigoContrato": 39492,
      "codigoTercero": "string",
      "codigoTerceroSupervisor": "string",
      "estado": "RADICADA",
      "fechaInicio": "ISO datetime",
      "fechaFin": "ISO datetime",
      "fechaSolicitud": "string | null",
      "valorCobrado": 5000000
    }
  ],
  "totalElementos": 10,
  "paginaActual": 0,
  "tamañoPagina": 10,
  "totalElementosPagina": 10,
  "totalPaginas": 1,
  "primera": true,
  "ultima": true,
  "timestamp": "ISO datetime"
}
```

---

### `POST /supervisor/cuentas-cobro/:id/aprobar`

Sin body.

**Response `200`**
```json
{
  "id": "bigint",
  "ticket": 1,
  "estado": "APROBADA_SUPERVISOR",
  "updatedAt": "ISO datetime",
  "mensaje": "string"
}
```

---

### `POST /supervisor/cuentas-cobro/:id/rechazar`

**Body**
```json
{
  "observacion": "string (max 1000 chars)"
}
```

**Response `200`**
```json
{
  "id": "bigint",
  "ticket": 1,
  "estado": "DEVUELTA_CONTRATISTA",
  "updatedAt": "ISO datetime",
  "mensaje": "string"
}
```

---

### `POST /supervisor/cuentas-cobro/:id/secciones/{seccion}/aprobar`

Donde `{seccion}` es: `informe-actividades` | `planilla` | `retenciones` | `gastos-adicionales` | `ejecucion-fisica`

Sin body.

**Response `200`**
```json
{
  "mensaje": "string",
  "seccion": "INFORME_ACTIVIDADES | PLANILLA | RETENCIONES | GASTOS_ADICIONALES | EJECUCION_FISICA",
  "estado": "APROBADO"
}
```

---

### `POST /supervisor/cuentas-cobro/:id/secciones/{seccion}/rechazar`

Donde `{seccion}` es: `informe-actividades` | `planilla` | `retenciones` | `gastos-adicionales` | `ejecucion-fisica`

**Body**
```json
{
  "justificacion": "string (max 1000 chars)"
}
```

**Response `200`**
```json
{
  "mensaje": "string",
  "seccion": "INFORME_ACTIVIDADES | PLANILLA | RETENCIONES | GASTOS_ADICIONALES | EJECUCION_FISICA",
  "estado": "RECHAZADO",
  "justificacion": "string"
}
```

---

## Módulo Aprobador — `/aprobador`

| Método | Ruta | Roles | Descripción |
|---|---|---|---|
| `GET` | `/aprobador/cuentas-cobro` | `APROBADOR` | Lista cuentas en estado APROBADA_SUPERVISOR o EN_REVISION_APROBADOR asignadas al aprobador |
| `POST` | `/aprobador/cuentas-cobro/:id/aprobar` | `APROBADOR` | Liquida la cuenta si todas las secciones están aprobadas (→ LIQUIDADA) |
| `POST` | `/aprobador/cuentas-cobro/:id/rechazar` | `APROBADOR` | Rechaza la cuenta (→ RECHAZADA_APROBADOR) |
| `POST` | `/aprobador/cuentas-cobro/:id/secciones/informe-actividades/aprobar` | `APROBADOR` | Aprueba la sección de actividades |
| `POST` | `/aprobador/cuentas-cobro/:id/secciones/informe-actividades/rechazar` | `APROBADOR` | Rechaza la sección de actividades |
| `POST` | `/aprobador/cuentas-cobro/:id/secciones/planilla/aprobar` | `APROBADOR` | Aprueba la sección de planilla |
| `POST` | `/aprobador/cuentas-cobro/:id/secciones/planilla/rechazar` | `APROBADOR` | Rechaza la sección de planilla |
| `POST` | `/aprobador/cuentas-cobro/:id/secciones/retenciones/aprobar` | `APROBADOR` | Aprueba la sección de retenciones |
| `POST` | `/aprobador/cuentas-cobro/:id/secciones/retenciones/rechazar` | `APROBADOR` | Rechaza la sección de retenciones |
| `POST` | `/aprobador/cuentas-cobro/:id/secciones/gastos-adicionales/aprobar` | `APROBADOR` | Aprueba la sección de gastos adicionales |
| `POST` | `/aprobador/cuentas-cobro/:id/secciones/gastos-adicionales/rechazar` | `APROBADOR` | Rechaza la sección de gastos adicionales |
| `POST` | `/aprobador/cuentas-cobro/:id/secciones/ejecucion-fisica/aprobar` | `APROBADOR` | Aprueba la sección de ejecución física |
| `POST` | `/aprobador/cuentas-cobro/:id/secciones/ejecucion-fisica/rechazar` | `APROBADOR` | Rechaza la sección de ejecución física |

---

### `GET /aprobador/cuentas-cobro`

**Query params**
```
codigoContrato?: number  (opcional, filtra por contrato)
page?: number            (default: 0)
size?: number            (default: 10, min: 1)
```

**Response `200`**
```json
{
  "success": true,
  "message": "string",
  "data": [
    {
      "idPago": 1,
      "ticket": 1,
      "contrato": "string",
      "descripcionContrato": "string",
      "codigoContrato": 39492,
      "codigoTercero": "string",
      "codigoTerceroSupervisor": "string",
      "estado": "APROBADA_SUPERVISOR | EN_REVISION_APROBADOR",
      "fechaInicio": "ISO datetime",
      "fechaFin": "ISO datetime",
      "fechaSolicitud": "string | null",
      "valorCobrado": 5000000
    }
  ],
  "totalElementos": 10,
  "paginaActual": 0,
  "tamañoPagina": 10,
  "totalElementosPagina": 10,
  "totalPaginas": 1,
  "primera": true,
  "ultima": true,
  "timestamp": "ISO datetime"
}
```

---

### `POST /aprobador/cuentas-cobro/:id/aprobar`

Sin body. La cuenta debe estar en estado `EN_REVISION_APROBADOR` y todas sus secciones (informe de actividades, planilla, retenciones, gastos adicionales, ejecución física) deben estar en estado `APROBADO` (las secciones sin registros se ignoran). Si alguna sección no está aprobada, retorna `400 Bad Request`.

**Response `200`**
```json
{
  "id": "bigint",
  "ticket": 1,
  "estado": "LIQUIDADA",
  "updatedAt": "ISO datetime",
  "mensaje": "Cuenta de cobro liquidada"
}
```

---

### `POST /aprobador/cuentas-cobro/:id/rechazar`

La cuenta debe estar en estado `APROBADA_SUPERVISOR` o `EN_REVISION_APROBADOR`.

**Body**
```json
{
  "observacion": "string (max 1000 chars)"
}
```

**Response `200`**
```json
{
  "id": "bigint",
  "ticket": 1,
  "estado": "RECHAZADA_APROBADOR",
  "updatedAt": "ISO datetime",
  "mensaje": "Cuenta de cobro rechazada por el aprobador"
}
```

---

### `POST /aprobador/cuentas-cobro/:id/secciones/{seccion}/aprobar`

Donde `{seccion}` es: `informe-actividades` | `planilla` | `retenciones` | `gastos-adicionales` | `ejecucion-fisica`

Sin body. Si la cuenta está en `APROBADA_SUPERVISOR`, pasa automáticamente a `EN_REVISION_APROBADOR`.

Esta acción no liquida la cuenta. Una vez todas las secciones estén en `APROBADO`, el aprobador debe llamar a `POST /aprobador/cuentas-cobro/:id/aprobar` para liquidar la cuenta.

**Response `200`**
```json
{
  "mensaje": "string",
  "seccion": "INFORME_ACTIVIDADES | PLANILLA | RETENCIONES | GASTOS_ADICIONALES | EJECUCION_FISICA",
  "estado": "APROBADO"
}
```

---

### `POST /aprobador/cuentas-cobro/:id/secciones/{seccion}/rechazar`

Donde `{seccion}` es: `informe-actividades` | `planilla` | `retenciones` | `gastos-adicionales` | `ejecucion-fisica`

Si la cuenta está en `APROBADA_SUPERVISOR`, pasa automáticamente a `EN_REVISION_APROBADOR`.

**Body**
```json
{
  "justificacion": "string (max 1000 chars)"
}
```

**Response `200`**
```json
{
  "mensaje": "string",
  "seccion": "INFORME_ACTIVIDADES | PLANILLA | RETENCIONES | GASTOS_ADICIONALES | EJECUCION_FISICA",
  "estado": "RECHAZADO",
  "justificacion": "string"
}
```

---

## Flujo principal del sistema

```
1. CONTRATISTA  →  POST /auth/login
                →  GET  /contratos                              (elige un contrato)
                →  POST /cuentas-cobro                          (crea cuenta en BORRADOR)

2. CONTRATISTA completa la cuenta:
                →  POST  /actividades/:id                       (agrega actividades con adjunto)
                →  POST  /gastos/:id                            (agrega gastos con evidencia)
                →  PUT   /planilla/:id                          (registra planilla de SS)
                →  PATCH /checklist-retefuente/:id              (responde checklist retefuente)

3. CONTRATISTA  →  GET  /cuentas-cobro/:id/resumen-radicacion   (valida antes de radicar)
                →  POST /cuentas-cobro/:id/radicar              (cuenta → RADICADA)

4. SUPERVISOR   →  GET  /supervisor/cuentas-cobro               (lista cuentas pendientes)
                →  GET  /cuentas-cobro/:id                      (revisa detalle completo)
                →  GET  /planilla/:id                           (revisa planilla SS)
                →  GET  /checklist-retefuente/:id               (revisa checklist)
                →  POST /supervisor/cuentas-cobro/:id/secciones/{seccion}/aprobar|rechazar
                →  POST /supervisor/cuentas-cobro/:id/aprobar   (cuenta → APROBADA_SUPERVISOR)
                   ó
                →  POST /supervisor/cuentas-cobro/:id/rechazar  (cuenta → DEVUELTA_CONTRATISTA)

5. APROBADOR    →  GET  /aprobador/cuentas-cobro                (lista cuentas pendientes de aprobación)
                →  GET  /cuentas-cobro/:id                      (revisa detalle completo)
                →  POST /aprobador/cuentas-cobro/:id/secciones/{seccion}/aprobar|rechazar
                →  POST /aprobador/cuentas-cobro/:id/aprobar    (cuenta → LIQUIDADA, requiere todas las secciones aprobadas)
                   ó
                →  POST /aprobador/cuentas-cobro/:id/rechazar   (cuenta → RECHAZADA_APROBADOR)
```

---

## Resumen de endpoints

| # | Módulo | Total endpoints |
|---|---|---|
| 1 | Auth | 4 |
| 2 | Registro de Contratistas | 3 |
| 3 | Contratos | 1 |
| 4 | Cuentas de Cobro | 5 |
| 5 | Actividades | 4 |
| 6 | Gastos | 4 |
| 7 | Planilla | 2 |
| 8 | Checklist Retefuente | 2 |
| 9 | Supervisor | 13 |
| 10 | Aprobador | 13 |
| | **Total** | **51** |

> Los IDs numéricos grandes (`cuentaCobroId`, `actividadId`, `gastoId`, `adjuntoId`) son de tipo `BigInt`.
