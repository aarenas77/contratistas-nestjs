# Flujo de Subsanación de Cuentas de Cobro

Documento funcional y técnico del proceso de **subsanación**: cómo el supervisor devuelve una
cuenta de cobro al contratista mediante rechazo por secciones, y cómo el contratista corrige y
re-radica.

> Base URL: `http://localhost:3000/api/v1` · Autenticación: `Bearer JWT`.
> Para el contrato completo de cada endpoint, ver [`endpoints.md`](./endpoints.md).

---

## 1. Resumen

Cuando el contratista radica una cuenta de cobro, esta queda en estado **`RADICADA`** para que el
supervisor la revise. El supervisor aprueba o rechaza **cada sección** de forma independiente:

- Si **rechaza al menos una sección**, la cuenta **no puede aprobarse** y pasa **de inmediato** a
  **`DEVUELTA_CONTRATISTA`**.
- El supervisor **sigue revisando** el resto de secciones (puede acumular varios rechazos).
- Al terminar, confirma con un **rechazo global** que agrega una observación general.
- El contratista ve las secciones rechazadas, **corrige solo esas** y **re-radica**; el ciclo se
  repite hasta que el supervisor aprueba la cuenta completa.

---

## 2. Estados involucrados

### `EstadoCuentaCobro` (cuenta)

| Estado                 | Significado en este flujo                                                              |
| ---------------------- | -------------------------------------------------------------------------------------- |
| `RADICADA`             | El contratista envió la cuenta; el supervisor la está revisando.                       |
| `DEVUELTA_CONTRATISTA` | Hay al menos una sección rechazada; la cuenta está en subsanación.                     |
| `APROBADA_SUPERVISOR`  | El supervisor aprobó la cuenta completa (sin rechazos). Sale del flujo de subsanación. |

### `EstadoSeccion` (cada sección)

| Estado      | Significado                                                       |
| ----------- | ----------------------------------------------------------------- |
| `PENDIENTE` | Sin revisar (estado inicial al radicar).                          |
| `APROBADO`  | El supervisor aprobó la sección.                                  |
| `RECHAZADO` | El supervisor rechazó la sección; el contratista debe corregirla. |

Las **5 secciones** revisables son:

| Sección                            | Identificador         | Entidad                |
| ---------------------------------- | --------------------- | ---------------------- |
| Informe de actividades             | `INFORME_ACTIVIDADES` | `actividades`          |
| Planilla de seguridad social       | `PLANILLA`            | `planillas`            |
| Retenciones (checklist retefuente) | `RETENCIONES`         | `checklist_retefuente` |
| Gastos adicionales                 | `GASTOS_ADICIONALES`  | `otros_gastos`         |
| Ejecución física                   | `EJECUCION_FISICA`    | `ejecucion_fisica`     |

---

## 3. Máquina de estados

```
RADICADA
  ├─ (supervisor aprueba secciones)            → sigue RADICADA
  ├─ (supervisor rechaza 1ª sección)           → DEVUELTA_CONTRATISTA   [inmediato]
  └─ (supervisor aprueba global, sin rechazos) → APROBADA_SUPERVISOR

DEVUELTA_CONTRATISTA
  ├─ (supervisor sigue rechazando/aprobando secciones)      → sigue DEVUELTA_CONTRATISTA
  ├─ (supervisor rechazo global, observación general)       → sigue DEVUELTA_CONTRATISTA
  └─ (contratista corrige secciones rechazadas y re-radica) → RADICADA   [resetea solo lo rechazado]
```

---

## 4. Flujo paso a paso

### Paso 1 — El contratista radica

`POST /cuentas-cobro/:id/radicar`

La cuenta pasa a `RADICADA` y todas las secciones quedan en `PENDIENTE`.

### Paso 2 — El supervisor revisa por secciones

Para cada sección, el supervisor llama a uno de:

- `POST /supervisor/cuentas-cobro/:id/secciones/{seccion}/aprobar`
- `POST /supervisor/cuentas-cobro/:id/secciones/{seccion}/rechazar` (con `justificacion`)

donde `{seccion}` es `informe-actividades` | `planilla` | `retenciones` | `gastos-adicionales` | `ejecucion-fisica`.

**Regla clave:** en cuanto se ejecuta el **primer rechazo de sección** estando la cuenta en
`RADICADA`, esta pasa **automáticamente** a `DEVUELTA_CONTRATISTA` y se registra en el historial.
Rechazos posteriores (ya en `DEVUELTA_CONTRATISTA`) solo marcan su sección, sin duplicar la
transición de estado.

> La revisión por secciones se permite tanto en `RADICADA` como en `DEVUELTA_CONTRATISTA`, de modo
> que el supervisor puede **seguir** aprobando/rechazando después de la primera devolución.

### Paso 3 — Cierre del supervisor

- **Si no hubo rechazos:** `POST /supervisor/cuentas-cobro/:id/aprobar` → `APROBADA_SUPERVISOR`.
  - Si existe **alguna** sección `RECHAZADO`, este endpoint responde **`400`** (no se puede aprobar
    una cuenta con rechazos).
- **Si hubo rechazos:** `POST /supervisor/cuentas-cobro/:id/rechazar` con `observacion` general
  (rechazo global). Se permite con la cuenta en `RADICADA` o `DEVUELTA_CONTRATISTA`.

### Paso 4 — El contratista consulta los rechazos

`GET /cuentas-cobro/:id`

La respuesta incluye, por sección, `estadoRevision` y `observacionRevision`, además de
`observaciones` (observación general del rechazo global) y el `historialEstados`.

### Paso 5 — El contratista corrige solo lo rechazado

Mientras la cuenta está en `DEVUELTA_CONTRATISTA`, el contratista puede editar **únicamente** las
secciones marcadas `RECHAZADO`:

| Sección rechazada      | Endpoints de corrección                                                |
| ---------------------- | ---------------------------------------------------------------------- |
| Informe de actividades | `POST /actividades/:cuentaCobroId`, `DELETE /actividades/:actividadId` |
| Planilla               | `PUT /planilla/:cuentaCobroId` (y operaciones de PagoSimple)           |
| Retenciones            | `PATCH /checklist-retefuente/:cuentaCobroId`                           |
| Gastos adicionales     | `POST /gastos/:cuentaCobroId`, `DELETE /gastos/:gastoId`               |

Intentar editar una sección que **no** fue rechazada (o estando la cuenta en otro estado distinto de
`BORRADOR`/`DEVUELTA_CONTRATISTA`) responde **`400`**.

> La sección de **ejecución física** no tiene endpoint de edición del contratista; no es subsanable
> por este medio.

### Paso 6 — El contratista re-radica

`POST /cuentas-cobro/:id/radicar` (mismo endpoint que la radicación inicial)

- Se permite desde `DEVUELTA_CONTRATISTA`.
- **Solo** las secciones que estaban `RECHAZADO` se reinician a `PENDIENTE`; las `APROBADO`
  conservan su estado, por lo que el supervisor solo re-revisa lo corregido.
- La validación de período vigente (`fechaInicio`–`fechaFin`) **no** aplica en la re-radicación
  (la radicación original ya fue dentro del período).

La cuenta vuelve a `RADICADA` y el ciclo regresa al **Paso 2**.

---

## 5. Diagrama de secuencia

```
CONTRATISTA            SUPERVISOR                         CUENTA
    │ radicar ───────────────────────────────────────►  RADICADA
    │                      │ aprobar sección A ────────►  RADICADA (A=APROBADO)
    │                      │ rechazar sección B ───────►  DEVUELTA_CONTRATISTA (B=RECHAZADO)
    │                      │ rechazar sección C ───────►  DEVUELTA_CONTRATISTA (C=RECHAZADO)
    │                      │ rechazar (global) ────────►  DEVUELTA_CONTRATISTA (+observación)
    │ GET detalle ◄────────────────────────────────────  ve B y C rechazadas
    │ corrige B y C                                       (A queda intacta)
    │ radicar (re) ─────────────────────────────────────► RADICADA (B,C=PENDIENTE; A=APROBADO)
    │                      │ revisa B y C de nuevo ...
```

---

## 6. Reglas de validación (resumen)

| Acción                                | Estado requerido                                                 | Condición extra                                               | Error si falla |
| ------------------------------------- | ---------------------------------------------------------------- | ------------------------------------------------------------- | -------------- |
| Aprobar/rechazar sección (supervisor) | `RADICADA` o `DEVUELTA_CONTRATISTA`                              | Supervisor asignado a la cuenta                               | `400` / `403`  |
| Aprobar cuenta (supervisor)           | `RADICADA`                                                       | Ninguna sección `RECHAZADO`                                   | `400`          |
| Rechazo global (supervisor)           | `RADICADA` o `DEVUELTA_CONTRATISTA`                              | —                                                             | `400`          |
| Editar sección (contratista)          | `BORRADOR`, o `DEVUELTA_CONTRATISTA` con esa sección `RECHAZADO` | Propietario de la cuenta                                      | `400` / `403`  |
| Re-radicar (contratista)              | `BORRADOR` o `DEVUELTA_CONTRATISTA`                              | Validaciones de radicación (actividades, planilla, checklist) | `400`          |

---

## 7. Consideraciones y casos borde

- **Ventana de devolución mientras el supervisor sigue revisando:** entre el primer rechazo de
  sección y el rechazo global, la cuenta ya está en `DEVUELTA_CONTRATISTA`, por lo que el contratista
  podría empezar a corregir antes de que el supervisor termine. Es un comportamiento aceptado: el
  modelo de estados no distingue "supervisor revisando" de "ya devuelta".
- **Rechazo no reversible por sección:** una vez la cuenta entra en `DEVUELTA_CONTRATISTA`, aprobar
  una sección no la regresa a `RADICADA`; permanece devuelta hasta que el contratista re-radique.
- **Trazabilidad:** cada transición de estado (incluida la devolución automática por rechazo de
  sección y la re-radicación) queda registrada en `HistorialEstado` con usuario y observación.

---

## 8. Endpoints involucrados

| Método          | Ruta                                                         | Rol                                      | Papel en el flujo                                   |
| --------------- | ------------------------------------------------------------ | ---------------------------------------- | --------------------------------------------------- |
| `POST`          | `/cuentas-cobro/:id/radicar`                                 | `CONTRATISTA`                            | Radicar / re-radicar tras subsanación               |
| `GET`           | `/cuentas-cobro/:id`                                         | `CONTRATISTA`, `SUPERVISOR`, `APROBADOR` | Ver estado, secciones rechazadas e historial        |
| `POST`          | `/supervisor/cuentas-cobro/:id/secciones/{seccion}/aprobar`  | `SUPERVISOR`                             | Aprobar una sección                                 |
| `POST`          | `/supervisor/cuentas-cobro/:id/secciones/{seccion}/rechazar` | `SUPERVISOR`                             | Rechazar una sección (devuelve la cuenta)           |
| `POST`          | `/supervisor/cuentas-cobro/:id/aprobar`                      | `SUPERVISOR`                             | Aprobar cuenta completa (bloqueado si hay rechazos) |
| `POST`          | `/supervisor/cuentas-cobro/:id/rechazar`                     | `SUPERVISOR`                             | Rechazo global con observación                      |
| `POST`/`DELETE` | `/actividades/...`                                           | `CONTRATISTA`                            | Corregir actividades rechazadas                     |
| `PUT`           | `/planilla/:cuentaCobroId`                                   | `CONTRATISTA`                            | Corregir planilla rechazada                         |
| `PATCH`         | `/checklist-retefuente/:cuentaCobroId`                       | `CONTRATISTA`                            | Corregir retenciones rechazadas                     |
| `POST`/`DELETE` | `/gastos/...`                                                | `CONTRATISTA`                            | Corregir gastos rechazados                          |
