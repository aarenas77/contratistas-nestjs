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
| `ADMINISTRADOR` | Acceso transversal. Precarga terceros desde presupuesto |

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
| `POST` | `/auth/cambiar-password` | Cualquier rol | Cambia la contraseña del usuario autenticado |
| `GET` | `/auth/me` | Cualquier rol | Retorna el usuario del token actual |
| `POST` | `/auth/usuarios` | `APROBADOR` | Crea un nuevo usuario en el sistema |

> **Contraseña temporal:** el usuario creado por el registro de contratistas recibe una
> contraseña **temporal** (`mustChangePassword: true`). Hasta que la cambie vía
> `POST /auth/cambiar-password`, el backend responde **`403`** a cualquier otro endpoint
> protegido (se exceptúan `/auth/cambiar-password` y `/auth/me`).

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
    "rol": "CONTRATISTA | SUPERVISOR | APROBADOR",
    "mustChangePassword": true
  }
}
```

Si `mustChangePassword` es `true`, el frontend debe redirigir a la pantalla de cambio de
contraseña: el backend bloqueará (`403`) cualquier otra operación hasta que se cambie.

---

### `POST /auth/cambiar-password`

Requiere token. Disponible incluso cuando la contraseña está pendiente de cambio.

**Body**
```json
{
  "passwordActual": "string",
  "passwordNueva": "string (min 8, mayúscula + minúscula + dígito + símbolo)"
}
```

**Response `200`**
```json
{
  "mensaje": "Contraseña actualizada correctamente.",
  "accessToken": "string"
}
```

Usar el `accessToken` devuelto para las siguientes peticiones (ya viene habilitado, sin el
bloqueo de cambio obligatorio). Errores: `401` si la contraseña actual es incorrecta, `400`
si la nueva es igual a la actual o no cumple la complejidad.

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
  "rol": "CONTRATISTA | SUPERVISOR | APROBADOR",
  "mustChangePassword": false
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

> **Nota:** el `codigoTercero` se resuelve **server-side** a partir de la identificación del RUT,
> consultando el [módulo Presupuesto](#módulo-presupuesto--presupuesto) (precarga temporal). El cliente
> **no** envía `codigoTercero`. El contratista debe estar precargado antes de finalizar; de lo contrario
> `finalizar` responde `422`.

| Método | Ruta | Roles | Descripción |
|---|---|---|---|
| `POST` | `/registro-contratistas/extraer` | Público | Extrae datos del RUT y la certificación bancaria desde los PDFs |
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

> La extracción es **local** (sin servicios externos): el RUT se parsea posicionalmente con
> `pdfjs-dist` y el certificado bancario por texto (parsers por banco, ej. Bancolombia).
> **Ambos PDFs deben tener texto seleccionable**; si alguno es una imagen/escaneo responde `400`
> pidiendo volver a cargarlo con texto.

---

### `POST /registro-contratistas/finalizar`

**Body** — reenvía los datos extraídos. **No** incluye `codigoTercero`: se resuelve server-side desde
`rut.numeroIdentificacion` vía el módulo Presupuesto.
```json
{
  "rut": { "...": "objeto rut devuelto por /extraer" },
  "certificadoBancario": { "...": "objeto certificadoBancario devuelto por /extraer" }
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
    "codigoTercero": "123456",
    "rol": "CONTRATISTA"
  }
}
```

- `username` se genera como `primernombre.primerapellido` (normalizado, con sufijo numérico si colisiona).
- `password` es aleatoria y se devuelve en texto plano **una sola vez** para que el sistema invocante envíe el correo de bienvenida.
- Responde `409` si ya existe un usuario con esa identificación o correo.
- Responde `422` si la identificación del RUT no está precargada en presupuesto.

---

## Módulo Presupuesto — `/presupuesto`

> **Stub temporal.** Simula el módulo de presupuesto (aún no integrado), que pre-asigna a cada
> contratista un `codigoTercero` con sus contratos y cuentas de cobro. Toda la integración pasa por
> una única costura (`PresupuestoGateway`); el día que exista la API real, se reemplaza esa pieza y
> se elimina este módulo.

| Método | Ruta | Roles | Descripción |
|---|---|---|---|
| `POST` | `/presupuesto/precarga` | `ADMINISTRADOR` | Precarga un tercero con sus contratos y cuentas (idempotente) |
| `GET` | `/presupuesto/tercero` | Público | Consulta el tercero precargado y sus contratos por identificación |

---

### `POST /presupuesto/precarga`

Carga (o reemplaza) la precarga de un tercero. **Idempotente:** re-cargar la misma identificación
actualiza en vez de duplicar; las cuentas de cobro shell del contrato se reemplazan en cada carga.
El payload ahora acepta la misma estructura de campos que devuelven `GET /contratos` y
`GET /cuentas-cobro`, para mantener uniformidad entre endpoints. Los campos de solo lectura
(`idPago`, `ticket`, `contrato`, `idEstado`, `disponibleParaRadicar`) se aceptan para simetría,
pero el backend persiste solo los campos soportados por el modelo.

**Body**
```json
{
  "numeroIdentificacion": "1036662102",
  "tipoIdentificacion": "CC",
  "codigoTercero": "123456",
  "nombre": "Brandel Otero",
  "contratos": [
    {
      "codigoContrato": 39492,
      "codigoTercero": "123456",
      "consecutivo": "CO-2026-001",
      "descripcion": "Mantenimiento de equipos",
      "valor": 60000000,
      "totalPago": 60000000,
      "estado": "ELABORADO",
      "fechaElaboracion": "2026-01-01",
      "fechaAprobacion": "2026-01-15",
      "fechaRegistro": "2026-01-01",
      "fechaInicioSecop": "2026-01-01",
      "fechaFin": "2026-12-31",
      "tipoPlazo": "D",
      "plazoDias": 365,
      "consecutivoCompromiso": 1,
      "estadoCompromiso": "A",
      "numeroActaInicioString": 12,
      "saldoDisponibleOtrosGastos": 0,
      "idSupervisor": "string (opcional, codigoTercero del supervisor)",
      "codigoDependencia": 11,
      "codigoMempresa": 9999999999,
      "cuentas": [
        {
          "idPago": 1,
          "ticket": 1,
          "contrato": "CO-2026-001",
          "codigoContrato": 39492,
          "codigoTercero": "123456",
          "codigoTerceroSupervisor": "123457",
          "codigoTerceroAprobador": "123458",
          "idEstado": 0,
          "estado": "BORRADOR",
          "fechaInicio": "2026-01-01",
          "fechaFin": "2026-01-31",
          "fechaSolicitud": "2026-01-15T12:00:00.000Z",
          "valorSolicitud": 5000000,
          "disponibleParaRadicar": true
        }
      ]
    }
  ]
}
```

> Campos opcionales del contrato (`totalPago`, `estado`, fechas, `tipoPlazo`, `plazoDias`,
> `consecutivoCompromiso`, `estadoCompromiso`, `numeroActaInicioString`,
> `saldoDisponibleOtrosGastos`, `idSupervisor`, `codigoDependencia`, `codigoMempresa`)
> usan defaults razonables si se omiten. En cuentas, `valorSolicitud` y `valorCobrado`
> se aceptan como sinónimos de entrada.

**Response `201`**
```json
{
  "numeroIdentificacion": "1036662102",
  "codigoTercero": "123456"
}
```

---

### `GET /presupuesto/tercero`

Usado por el wizard de registro para mostrar los contratos del contratista **antes** de finalizar.

**Query params**
```
numeroIdentificacion: string  (requerido)
```

**Response `200`**
```json
{
  "codigoTercero": "123456",
  "nombre": "Brandel Otero",
  "contratos": [
    {
      "codigoContrato": 39492,
      "consecutivo": "CO-2026-001",
      "descripcion": "Mantenimiento de equipos",
      "valor": 60000000
    }
  ]
}
```

- Responde `404` si la identificación no está precargada en presupuesto.

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

Sin body. Sirve tanto para la **radicación inicial** (desde `BORRADOR`) como para la
**re-radicación tras subsanación** (desde `DEVUELTA_CONTRATISTA`).

- Desde otro estado responde `400`.
- En la re-radicación (`DEVUELTA_CONTRATISTA`) **solo se reinician a `PENDIENTE` las secciones
  que el supervisor había marcado `RECHAZADO`**; las secciones `APROBADO` conservan su estado.
- La validación de período vigente (`fechaInicio`–`fechaFin`) solo aplica a la radicación inicial;
  la subsanación puede radicarse aunque el período ya haya vencido.

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

> **Edición / subsanación:** agregar y eliminar actividades se permite cuando la cuenta está en
> `BORRADOR`, o en `DEVUELTA_CONTRATISTA` **solo si la sección de actividades fue rechazada**
> (`estadoRevision = RECHAZADO`). En cualquier otro caso responde `400`.

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

> **Edición / subsanación:** agregar y eliminar gastos se permite cuando la cuenta está en
> `BORRADOR`, o en `DEVUELTA_CONTRATISTA` **solo si la sección de gastos fue rechazada**
> (`estadoRevision = RECHAZADO`). En cualquier otro caso responde `400`.

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

> **Edición / subsanación:** modificar la planilla y las operaciones de PagoSimple se permiten
> cuando la cuenta está en `BORRADOR`, o en `DEVUELTA_CONTRATISTA` **solo si la sección de planilla
> fue rechazada** (`estadoRevision = RECHAZADO`). En cualquier otro caso responde `400`.

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

> **Edición / subsanación:** actualizar el checklist se permite cuando la cuenta está en
> `BORRADOR`, o en `DEVUELTA_CONTRATISTA` **solo si la sección de retenciones fue rechazada**
> (`estadoRevision = RECHAZADO`). En cualquier otro caso responde `400`.

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
| `POST` | `/supervisor/cuentas-cobro/:id/secciones/ejecucion-fisica/digitar` | `SUPERVISOR` | Digita el porcentaje de ejecución física |
| `POST` | `/supervisor/cuentas-cobro/:id/secciones/ejecucion-fisica/aprobar` | `SUPERVISOR` | Aprueba la sección de ejecución física |
| `POST` | `/supervisor/cuentas-cobro/:id/secciones/ejecucion-fisica/rechazar` | `SUPERVISOR` | Rechaza la sección de ejecución física |

> **Flujo de subsanación (rechazo por secciones):**
> 1. El supervisor revisa la cuenta `RADICADA` aprobando o rechazando cada sección.
> 2. **En cuanto rechaza la primera sección**, la cuenta pasa **de inmediato** a
>    `DEVUELTA_CONTRATISTA` y ya no puede aprobarse.
> 3. El supervisor puede **seguir** aprobando/rechazando el resto de secciones (la revisión por
>    secciones se permite tanto en `RADICADA` como en `DEVUELTA_CONTRATISTA`).
> 4. Al terminar, confirma con el **rechazo global** (`POST .../rechazar`) que agrega la observación
>    general y devuelve formalmente la cuenta al contratista.
>
> El contratista ve las secciones rechazadas (con su `observacionRevision`) vía
> `GET /cuentas-cobro/:id`, corrige **solo esas** secciones y re-radica con
> `POST /cuentas-cobro/:id/radicar`.

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

Sin body. La cuenta debe estar en estado `RADICADA`. Si **alguna sección está rechazada**
(`estadoRevision = RECHAZADO`) responde `400`: una cuenta con rechazos no puede aprobarse, debe
completarse el rechazo global. Además, el supervisor **debe haber digitado el porcentaje de
ejecución física** (ver `.../ejecucion-fisica/digitar`); si no, responde `400`.

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

Rechazo global que devuelve la cuenta al contratista con una observación general. Se permite
cuando la cuenta está en `RADICADA` o ya en `DEVUELTA_CONTRATISTA` (cierre del rechazo por
secciones). Desde otro estado responde `400`.

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

### `POST /supervisor/cuentas-cobro/:id/secciones/ejecucion-fisica/digitar`

El supervisor revisa la cuenta y digita el porcentaje de ejecución física (con su justificación).
Crea el registro de ejecución física si no existe, o lo actualiza si ya fue digitado. Se permite
cuando la cuenta está en `RADICADA` o `DEVUELTA_CONTRATISTA`. **Es obligatorio digitar este
porcentaje antes de aprobar la cuenta de cobro** (`POST .../aprobar`).

**Body**
```json
{
  "porcentaje": 85.5,
  "justificacion": "string (max 1000 chars)"
}
```

`porcentaje`: número entre 0 y 100, hasta 2 decimales.

**Response `200`**
```json
{
  "mensaje": "Porcentaje de ejecución física registrado",
  "seccion": "EJECUCION_FISICA",
  "porcentaje": 85.5,
  "justificacion": "string"
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

Marca la sección como `RECHAZADO` con la justificación. **Si la cuenta estaba en `RADICADA`, la
transiciona de inmediato a `DEVUELTA_CONTRATISTA`** (registrando el cambio en el historial). Si ya
estaba en `DEVUELTA_CONTRATISTA`, solo actualiza la sección sin duplicar la transición de estado.
Se permite con la cuenta en `RADICADA` o `DEVUELTA_CONTRATISTA`.

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
                   • el 1er rechazo de sección deja la cuenta en DEVUELTA_CONTRATISTA
                →  POST /supervisor/cuentas-cobro/:id/aprobar   (cuenta → APROBADA_SUPERVISOR; 400 si hay secciones rechazadas)
                   ó
                →  POST /supervisor/cuentas-cobro/:id/rechazar  (rechazo global → DEVUELTA_CONTRATISTA)

4b. SUBSANACIÓN (si la cuenta quedó en DEVUELTA_CONTRATISTA):
    CONTRATISTA →  GET  /cuentas-cobro/:id                      (ve las secciones RECHAZADO + observación)
                →  PUT/POST/PATCH/DELETE sobre las secciones rechazadas  (corrige solo lo rechazado)
                →  POST /cuentas-cobro/:id/radicar              (re-radica → RADICADA; resetea solo lo rechazado)
                → vuelve al paso 4

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
| 2 | Registro de Contratistas | 2 |
| 3 | Presupuesto | 2 |
| 4 | Contratos | 1 |
| 5 | Cuentas de Cobro | 5 |
| 6 | Actividades | 4 |
| 7 | Gastos | 4 |
| 8 | Planilla | 2 |
| 9 | Checklist Retefuente | 2 |
| 10 | Supervisor | 13 |
| 11 | Aprobador | 13 |
| | **Total** | **52** |

> Los IDs numéricos grandes (`cuentaCobroId`, `actividadId`, `gastoId`, `adjuntoId`) son de tipo `BigInt`.
