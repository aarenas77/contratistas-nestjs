# Precarga de presupuesto (stub temporal) — Diseño

Fecha: 2026-06-10
Estado: Aprobado

## Problema

El contratista que se registra en el portal ya viene pre-registrado en el **módulo
de presupuesto** (otro sistema de la empresa), que le asigna un `codigoTercero`
real del cual cuelgan sus contratos y cuentas de cobro. Ese módulo **no está
migrado** a este backend.

Hoy `RegistroContratistasService.generarCodigoTerceroTemporal()` **inventa** un
código `TMP-xxxx` aleatorio. Eso es incompatible con el pre-registro: el
contratista quedaría con un código que **nunca** cruza con `Contrato.codigoTercero`
ni `CuentaCobro.codigoTercero`, y entraría a un portal vacío. O se usa el código
real, o el temporal — no ambos. El `TMP-` debe morir.

No hay datos reales de presupuesto disponibles para importar: hay que **fabricar**
la precarga manualmente mientras llega la integración real.

## Objetivo

Resolver temporalmente, dentro de este backend, lo que haría presupuesto, de modo
que:

1. El flujo del portal funcione end-to-end (registro → contratos → cuentas).
2. El día que llegue la integración real, el reemplazo sea cambiar **una sola
   pieza** (la implementación de un gateway) y borrar la tabla de precarga.
3. La fachada no contamine el flujo productivo.

## Arquitectura

### La costura: `PresupuestoGateway`

Una única interfaz aísla "presupuesto" del resto del sistema. Nadie más consulta
la tabla de precarga directamente.

```ts
export const PRESUPUESTO_GATEWAY = Symbol('PRESUPUESTO_GATEWAY');

export interface PresupuestoGateway {
  obtenerTerceroPorIdentificacion(numeroIdentificacion: string):
    Promise<{ codigoTercero: string; nombre: string | null } | null>;
}
```

- **Hoy:** `PresupuestoLocalGateway` lee de la tabla `precarga_terceros`.
- **Mañana:** `PresupuestoApiGateway` hace el HTTP call al módulo real. Se cambia
  el binding del token `PRESUPUESTO_GATEWAY` en el módulo y se borra la tabla.
  Nada más se toca.

### Cardinalidad

Una cédula = un único `codigoTercero` (1:1). `Usuario.codigoTercero` (String) se
mantiene como está. El lookup es **solo por `numeroIdentificacion`** (único): se
evita mapear el `tipoDocumento` de texto del RUT ("Cédula de Ciudadanía") a un
código.

## Modelo de datos

Una sola tabla nueva. Contratos y cuentas usan las tablas existentes (`contratos`,
`cuentas_cobro`), que ya llevan `codigoTercero`.

```prisma
model PrecargaTercero {
  id                   BigInt   @id @default(autoincrement())
  tipoIdentificacion   String?  @map("tipo_identificacion")
  numeroIdentificacion String   @unique @map("numero_identificacion")
  codigoTercero        String   @unique @map("codigo_tercero")
  nombre               String?
  createdAt            DateTime @default(now()) @map("created_at")

  @@map("precarga_terceros")
}
```

## Endpoints (módulo `presupuesto`)

### `POST /presupuesto/precarga` — rol ADMINISTRADOR

El admin "hace de presupuesto". Idempotente (upsert por `numeroIdentificacion` /
`codigoContrato`), todo en una transacción. Crea/actualiza la fila de precarga +
los contratos + las cuentas shell en estado `BORRADOR`.

Payload:

```json
{
  "numeroIdentificacion": "1036662102",
  "codigoTercero": "123456",
  "nombre": "Brandel Otero",
  "contratos": [
    {
      "codigoContrato": 39492,
      "consecutivo": "CO-2026-001",
      "descripcion": "Mantenimiento de equipos",
      "valor": 60000000,
      "...": "demás campos de Contrato",
      "cuentas": [
        { "fechaInicio": "2026-01-01", "fechaFin": "2026-01-31", "valorCobrado": 5000000 }
      ]
    }
  ]
}
```

### `GET /presupuesto/tercero?numeroIdentificacion=...` — consulta (preview)

Lo usa el wizard del frontend para mostrar los contratos **antes** de finalizar el
registro. Pasa por el gateway. Devuelve `{ codigoTercero, nombre, contratos: [...] }`
o `404` si no hay precarga.

## Cambios en el registro

- Se elimina el endpoint `POST /registro-contratistas/codigo-tercero-temporal` y
  el método `generarCodigoTerceroTemporal()`.
- Se elimina el campo `codigoTercero` de `FinalizarRegistroDto`.
- `finalizar` deriva el `codigoTercero` **server-side** desde
  `rut.numeroIdentificacion` vía `PresupuestoGateway`. Esto cierra un hueco de
  seguridad: hoy el cliente envía el `codigoTercero` y podría inyectar el de otra
  persona para secuestrar sus contratos.
- Si no hay precarga → `UnprocessableEntityException` con mensaje:
  "Este contratista no está pre-registrado en presupuesto. Contacte al área de
  presupuesto." No se crea usuario fantasma.

## Flujo end-to-end

```
[Admin]       POST /presupuesto/precarga            (carga cédula + contratos + cuentas)
[Contratista] POST /registro-contratistas/extraer   (RUT → numeroIdentificacion)
[Frontend]    GET  /presupuesto/tercero?...         (preview de contratos)
[Contratista] POST /registro-contratistas/finalizar (gateway resuelve codigoTercero → crea Usuario)
[Contratista] GET  /contratos                       (ve sus contratos: cruzan por codigoTercero)
```

## Manejo de errores

- Precarga con `codigoTercero` ya usado por otra cédula → conflicto explícito.
- Precarga parcialmente fallida → rollback (transacción).
- Finalizar sin precarga → 422 explícito.
- Finalizar con cédula ya registrada → 409 (comportamiento actual se mantiene).

## Testing

- `PresupuestoLocalGateway`: lookup hit / miss.
- Precarga: idempotencia (cargar dos veces no duplica), transaccionalidad.
- `finalizar`: cédula con precarga usa el código real; sin precarga lanza 422; ya
  no acepta `codigoTercero` del cliente.

## Fuera de alcance (YAGNI)

Mapeo de tipos de documento, múltiples terceros por cédula, sincronización
automática con presupuesto, UI de admin. La carga es vía Swagger/Postman.

## Camino de reemplazo (cuando llegue presupuesto real)

1. Implementar `PresupuestoApiGateway` (HTTP) contra el módulo real.
2. Cambiar el binding de `PRESUPUESTO_GATEWAY` en `PresupuestoModule`.
3. Migrar/borrar `precarga_terceros` y el endpoint `POST /presupuesto/precarga`.

El resto del sistema (registro, contratos, cuentas) no cambia.
