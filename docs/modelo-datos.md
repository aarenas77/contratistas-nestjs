# Modelo de Datos — Cuentas de Cobro API

> Diagrama entidad-relación basado en `prisma/schema.prisma`. Pégalo en GitHub, Notion, [mermaid.live](https://mermaid.live) o ábrelo con la vista previa de VS Code (`Ctrl+Shift+V`).
>
> 💡 **Para verlo grande:** en mermaid.live puedes hacer zoom y exportar PNG/SVG. En la preview de VS Code usa `Ctrl` + rueda del ratón para acercar.

---

## 1. Mapa general (vista rápida)

Cómo se conectan las entidades, sin atributos. `CuentaCobro` es el centro del modelo.

```mermaid
%%{init: {'theme': 'neutral', 'themeVariables': {'fontSize': '18px'}}}%%
erDiagram
    Usuario }o..o{ Contrato : "vínculo lógico (codigoTercero)"
    Contrato ||--o{ CuentaCobro : "tiene"

    CuentaCobro ||--o| Planilla : "1:1"
    CuentaCobro ||--o| EjecucionFisica : "1:1"
    CuentaCobro ||--o| InformeSupervision : "1:1"

    CuentaCobro ||--o{ HistorialEstado : "1:N"
    CuentaCobro ||--o{ ChecklistRetefuente : "1:N"
    CuentaCobro ||--o{ Actividad : "1:N"
    CuentaCobro ||--o{ OtroGasto : "1:N"
    CuentaCobro ||--o{ Adjunto : "1:N"

    Actividad ||--o{ Adjunto : "evidencia"
    OtroGasto ||--o{ Adjunto : "evidencia"
```

**Cómo leer las líneas:**

| Símbolo | Significado |
|---|---|
| `||--o|` | Uno a **uno** (0 o 1) |
| `||--o{` | Uno a **muchos** (0, 1 o varios) |
| `}o..o{` | Relación **lógica** (sin FK física en la BD) |

---

## 2. Diagrama detallado (con campos)

```mermaid
%%{init: {'theme': 'neutral', 'themeVariables': {'fontSize': '15px'}}}%%
erDiagram
    Contrato ||--o{ CuentaCobro : "tiene"
    CuentaCobro ||--o{ HistorialEstado : "registra"
    CuentaCobro ||--o| Planilla : "1:1"
    CuentaCobro ||--o{ ChecklistRetefuente : "items"
    CuentaCobro ||--o{ Actividad : "informe"
    CuentaCobro ||--o{ OtroGasto : "gastos"
    CuentaCobro ||--o| EjecucionFisica : "1:1"
    CuentaCobro ||--o| InformeSupervision : "1:1"
    CuentaCobro ||--o{ Adjunto : "archivos"
    Actividad ||--o{ Adjunto : "evidencia"
    OtroGasto ||--o{ Adjunto : "evidencia"

    Usuario {
        BigInt   id PK
        string   username UK
        string   passwordHash
        string   nombre
        string   email UK "nullable"
        string   codigoTercero "enlace lógico al dominio"
        string   userIdentification
        Rol      rol "CONTRATISTA|SUPERVISOR|APROBADOR"
        boolean  activo "default true"
        DateTime createdAt
        DateTime updatedAt
    }

    Contrato {
        BigInt   id PK
        int      codigoContrato UK
        string   consecutivo
        string   descripcion
        string   codigoTercero "FK lógica -> contratista"
        decimal  valor "18,2"
        decimal  totalPago "18,2"
        string   estado "default A"
        date     fechaElaboracion
        date     fechaAprobacion "nullable"
        date     fechaFin "nullable"
        date     fechaRegistro
        date     fechaInicioSecop "nullable"
        int      plazoDias
        string   tipoPlazo "default D"
        int      consecutivoCompromiso
        string   estadoCompromiso
        int      numeroActaInicio "nullable"
        decimal  saldoDisponibleOtrosGastos "18,2"
        string   idSupervisor "nullable"
        int      codigoDependencia "nullable"
        BigInt   codigoMempresa
        DateTime createdAt
    }

    CuentaCobro {
        BigInt            id PK
        int               ticket UK "autoincrement"
        int               codigoContrato FK
        string            codigoTercero "contratista"
        string            codigoTerceroSupervisor "nullable"
        EstadoCuentaCobro estado "default BORRADOR"
        DateTime          fechaSolicitud "nullable"
        date              fechaInicio
        date              fechaFin
        decimal           valorCobrado "18,2"
        string            observaciones "nullable"
        boolean           declaracion "default false"
        DateTime          createdAt
        DateTime          updatedAt
    }

    HistorialEstado {
        BigInt   id PK
        BigInt   cuentaCobroId FK
        string   estadoAnterior "nullable"
        string   estadoNuevo
        string   usuarioId
        string   usuarioNombre "nullable"
        string   observacion "nullable"
        DateTime createdAt
    }

    Planilla {
        BigInt        id PK
        BigInt        cuentaCobroId FK,UK
        int           plantillaPagoNo "nullable"
        date          fechaPago "nullable"
        string        periodoPagado "nullable"
        decimal       ingresoBaseCotizacion "18,2 nullable"
        decimal       aporteSalud "18,2 nullable"
        decimal       aportePension "18,2 nullable"
        decimal       aporteArl "18,2 nullable"
        decimal       valorPagado "18,2 nullable"
        string        tipoRiesgoArl "nullable"
        EstadoSeccion estadoRevision "default PENDIENTE"
        string        observacionRevision "nullable"
        string        idAportante "nullable"
        string        numeroPlanilla "nullable"
        string        urlPago "nullable"
        string        estadoPago "nullable"
    }

    ChecklistRetefuente {
        BigInt        id PK
        BigInt        cuentaCobroId FK
        int           idChecklist
        string        nombre "nullable"
        int           kaNlCumple "nullable"
        string        observacion "nullable"
        EstadoSeccion estadoRevision "default PENDIENTE"
        string        observacionRevision "nullable"
    }

    Actividad {
        BigInt        id PK
        BigInt        cuentaCobroId FK
        string        descripcion
        date          fechaActividad
        EstadoSeccion estadoRevision "default PENDIENTE"
        string        observacionRevision "nullable"
        DateTime      createdAt
        DateTime      updatedAt
    }

    OtroGasto {
        BigInt        id PK
        BigInt        cuentaCobroId FK
        date          fecha
        string        codigoConcepto
        string        observacion "nullable"
        decimal       valor "18,2"
        EstadoSeccion estadoRevision "default PENDIENTE"
        string        observacionRevision "nullable"
    }

    EjecucionFisica {
        BigInt        id PK
        BigInt        cuentaCobroId FK,UK
        decimal       porcentaje "5,2 nullable"
        string        justificacion "nullable"
        EstadoSeccion estadoRevision "default PENDIENTE"
        string        observacionRevision "nullable"
        DateTime      updatedAt
    }

    Adjunto {
        BigInt   id PK
        BigInt   cuentaCobroId FK
        BigInt   actividadId FK "nullable"
        BigInt   gastoId FK "nullable"
        string   nombre
        string   mimeType "nullable"
        int      tamanioBytes "nullable"
        bytes    datos "nullable (bytea)"
        string   urlStorage "nullable"
        DateTime createdAt
    }

    InformeSupervision {
        BigInt   id PK
        BigInt   cuentaCobroId FK,UK
        string   supervisorId
        json     contenido "nullable"
        string   estado "default BORRADOR"
        DateTime createdAt
        DateTime updatedAt
    }
```

---

## 3. Enums

| Enum | Valores |
|---|---|
| **Rol** | `CONTRATISTA`, `SUPERVISOR`, `APROBADOR`, `ADMINISTRADOR` |
| **EstadoCuentaCobro** | `BORRADOR`, `RADICADA`, `EN_REVISION_SUPERVISOR`, `DEVUELTA_CONTRATISTA`, `APROBADA_SUPERVISOR`, `EN_REVISION_APROBADOR`, `RECHAZADA_APROBADOR`, `LIQUIDADA`, `ENVIADA_CONTABILIDAD` |
| **EstadoSeccion** | `PENDIENTE`, `APROBADO`, `RECHAZADO` |

> Los valores exactos viven en `prisma/schema.prisma`.

---

## 4. Notas clave

- **Usuario** no tiene FK física hacia `Contrato`/`CuentaCobro`: el vínculo es **lógico** vía `codigoTercero`.
- **`Contrato.codigoContrato`** (no el `id`) es la clave referenciada por `CuentaCobro.codigoContrato`.
- Relaciones **1:1** (`||--o|`): `Planilla`, `EjecucionFisica`, `InformeSupervision` (FK `cuentaCobroId` con `@unique`).
- Relaciones **1:N** (`||--o{`): `HistorialEstado`, `ChecklistRetefuente`, `Actividad`, `OtroGasto`, `Adjunto`.
- **`Adjunto`** cuelga siempre de una `CuentaCobro` y, opcionalmente, de una `Actividad` **o** un `OtroGasto`.

---

> Versión automática (siempre sincronizada con el schema, sin formato): `docs/modelo-datos-auto.md` — se regenera con `npx prisma generate`.
