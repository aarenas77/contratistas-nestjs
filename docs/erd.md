# ERD

Diagrama entidad-relacion basado en `prisma/schema.prisma`.

```mermaid
erDiagram
    CONTRATO ||--o{ CUENTA_COBRO : tiene
    CUENTA_COBRO ||--o{ HISTORIAL_ESTADO : registra
    CUENTA_COBRO ||--o| PLANILLA : genera
    CUENTA_COBRO ||--o{ CHECKLIST_RETEFUENTE : contiene
    CUENTA_COBRO ||--o{ ACTIVIDAD : incluye
    CUENTA_COBRO ||--o{ OTRO_GASTO : incluye
    CUENTA_COBRO ||--o| EJECUCION_FISICA : resume
    CUENTA_COBRO ||--o{ ADJUNTO : adjunta
    CUENTA_COBRO ||--o| INFORME_SUPERVISION : documenta
    ACTIVIDAD ||--o{ ADJUNTO : evidencia
    OTRO_GASTO ||--o{ ADJUNTO : soporte

    CONTRATO {
        BigInt id PK
        Int codigoContrato UK
        String consecutivo
        String descripcion
        String codigoTercero
        Decimal valor
        Decimal totalPago
        String estado
        DateTime fechaElaboracion
        DateTime fechaAprobacion "nullable"
        DateTime fechaFin "nullable"
        DateTime fechaRegistro
        DateTime fechaInicioSecop "nullable"
        Int plazoDias
        String tipoPlazo
        Int consecutivoCompromiso
        String estadoCompromiso
        Int numeroActaInicio "nullable"
        Decimal saldoDisponibleOtrosGastos
        String idSupervisor "nullable"
        Int codigoDependencia "nullable"
        BigInt codigoMempresa
        DateTime createdAt
    }

    PRECARGA_TERCERO {
        BigInt id PK
        String tipoIdentificacion "nullable"
        String numeroIdentificacion UK
        String codigoTercero UK
        String nombre "nullable"
        DateTime createdAt
    }

    USUARIO {
        BigInt id PK
        String username UK
        String passwordHash
        String nombre
        String email UK "nullable"
        String codigoTercero
        String userIdentification
        Rol rol
        Boolean activo
        Boolean mustChangePassword
        DateTime createdAt
        DateTime updatedAt
    }

    CUENTA_COBRO {
        BigInt id PK
        Int ticket UK
        Int codigoContrato FK
        String codigoTercero
        String codigoTerceroSupervisor "nullable"
        String codigoTerceroAprobador "nullable"
        EstadoCuentaCobro estado
        DateTime fechaSolicitud "nullable"
        DateTime fechaInicio
        DateTime fechaFin
        Decimal valorCobrado
        String observaciones "nullable"
        Boolean declaracion
        DateTime createdAt
        DateTime updatedAt
    }

    HISTORIAL_ESTADO {
        BigInt id PK
        BigInt cuentaCobroId FK
        String estadoAnterior "nullable"
        String estadoNuevo
        String usuarioId
        String usuarioNombre "nullable"
        String observacion "nullable"
        DateTime createdAt
    }

    PLANILLA {
        BigInt id PK
        BigInt cuentaCobroId FK,UK
        Int plantillaPagoNo "nullable"
        DateTime fechaPago "nullable"
        String periodoPagado "nullable"
        Decimal ingresoBaseCotizacion "nullable"
        Decimal aporteSalud "nullable"
        Decimal aportePension "nullable"
        Decimal aporteArl "nullable"
        Decimal valorPagado "nullable"
        String tipoRiesgoArl "nullable"
        EstadoSeccion estadoRevision
        String observacionRevision "nullable"
        EstadoSeccion estadoRevisionAprobador
        String observacionRevisionAprobador "nullable"
        String idAportante "nullable"
        String numeroPlanilla "nullable"
        String urlPago "nullable"
        String estadoPago "nullable"
        String pinPagoSimple "nullable"
        DateTime pinExpiraAt "nullable"
        Int intentosPagoSimple
        DateTime ultimaConfirmacionAt "nullable"
    }

    CHECKLIST_RETEFUENTE {
        BigInt id PK
        BigInt cuentaCobroId FK
        Int idChecklist
        String nombre "nullable"
        Int kaNlCumple "nullable"
        String observacion "nullable"
        EstadoSeccion estadoRevision
        String observacionRevision "nullable"
        EstadoSeccion estadoRevisionAprobador
        String observacionRevisionAprobador "nullable"
    }

    ACTIVIDAD {
        BigInt id PK
        BigInt cuentaCobroId FK
        String descripcion
        DateTime fechaActividad
        EstadoSeccion estadoRevision
        String observacionRevision "nullable"
        EstadoSeccion estadoRevisionAprobador
        String observacionRevisionAprobador "nullable"
        DateTime createdAt
        DateTime updatedAt
    }

    OTRO_GASTO {
        BigInt id PK
        BigInt cuentaCobroId FK
        DateTime fecha
        String codigoConcepto
        String observacion "nullable"
        Decimal valor
        EstadoSeccion estadoRevision
        String observacionRevision "nullable"
        EstadoSeccion estadoRevisionAprobador
        String observacionRevisionAprobador "nullable"
    }

    EJECUCION_FISICA {
        BigInt id PK
        BigInt cuentaCobroId FK,UK
        Decimal porcentaje "nullable"
        String justificacion "nullable"
        EstadoSeccion estadoRevision
        String observacionRevision "nullable"
        EstadoSeccion estadoRevisionAprobador
        String observacionRevisionAprobador "nullable"
        DateTime updatedAt
    }

    ADJUNTO {
        BigInt id PK
        BigInt cuentaCobroId FK
        BigInt actividadId FK "nullable"
        BigInt gastoId FK "nullable"
        String nombre
        String mimeType "nullable"
        Int tamanioBytes "nullable"
        Bytes datos "nullable"
        String urlStorage "nullable"
        DateTime createdAt
    }

    INFORME_SUPERVISION {
        BigInt id PK
        BigInt cuentaCobroId FK,UK
        String supervisorId
        Json contenido "nullable"
        String estado
        DateTime createdAt
        DateTime updatedAt
    }
```

## Enums

| Enum | Valores |
|---|---|
| `Rol` | `CONTRATISTA`, `SUPERVISOR`, `APROBADOR`, `ADMINISTRADOR`, `ABOGADO` |
| `EstadoCuentaCobro` | `BORRADOR`, `RADICADA`, `EN_REVISION_SUPERVISOR`, `DEVUELTA_CONTRATISTA`, `APROBADA_SUPERVISOR`, `EN_REVISION_APROBADOR`, `RECHAZADA_APROBADOR`, `LIQUIDADA`, `ENVIADA_CONTABILIDAD` |
| `EstadoSeccion` | `PENDIENTE`, `APROBADO`, `RECHAZADO`, `SIN_OBSERVACIONES` |

## Notas

- `CONTRATO.codigoContrato` es la clave referenciada por `CUENTA_COBRO.codigoContrato`.
- `PLANILLA`, `EJECUCION_FISICA` e `INFORME_SUPERVISION` son relaciones 1:1 con `CUENTA_COBRO`.
- `ADJUNTO` siempre pertenece a una `CUENTA_COBRO` y opcionalmente a una `ACTIVIDAD` o a un `OTRO_GASTO`.
- `USUARIO` y `CONTRATO`/`CUENTA_COBRO` se relacionan de forma logica por `codigoTercero`, pero no hay FK fisica en el esquema.
