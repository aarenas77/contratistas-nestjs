-- CreateEnum
CREATE TYPE "EstadoCuentaCobro" AS ENUM ('BORRADOR', 'RADICADA', 'EN_REVISION_SUPERVISOR', 'DEVUELTA_CONTRATISTA', 'APROBADA_SUPERVISOR', 'EN_REVISION_APROBADOR', 'RECHAZADA_APROBADOR', 'APROBADA_FINAL', 'ENVIADA_CONTABILIDAD');

-- CreateEnum
CREATE TYPE "EstadoSeccion" AS ENUM ('PENDIENTE', 'APROBADO', 'RECHAZADO', 'SIN_OBSERVACIONES');

-- CreateTable
CREATE TABLE "cuentas_cobro" (
    "id" BIGSERIAL NOT NULL,
    "codigo_contrato" TEXT NOT NULL,
    "codigo_tercero" TEXT NOT NULL,
    "estado" "EstadoCuentaCobro" NOT NULL DEFAULT 'BORRADOR',
    "fecha_solicitud" TIMESTAMP(3),
    "fecha_inicio" DATE NOT NULL,
    "fecha_fin" DATE NOT NULL,
    "valor_cobrado" DECIMAL(18,2) NOT NULL,
    "observaciones" TEXT,
    "declaracion" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "cuentas_cobro_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "historial_estados" (
    "id" BIGSERIAL NOT NULL,
    "cuenta_cobro_id" BIGINT NOT NULL,
    "estado_anterior" TEXT,
    "estado_nuevo" TEXT NOT NULL,
    "usuario_id" TEXT NOT NULL,
    "usuario_nombre" TEXT,
    "observacion" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "historial_estados_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "planillas" (
    "id" BIGSERIAL NOT NULL,
    "cuenta_cobro_id" BIGINT NOT NULL,
    "plantilla_pago_no" INTEGER,
    "fecha_pago" DATE,
    "periodo_pagado" TEXT,
    "ingreso_base_cotizacion" DECIMAL(18,2),
    "aporte_salud" DECIMAL(18,2),
    "aporte_pension" DECIMAL(18,2),
    "aporte_arl" DECIMAL(18,2),
    "valor_pagado" DECIMAL(18,2),
    "tipo_riesgo_arl" TEXT,
    "estado_revision" "EstadoSeccion" NOT NULL DEFAULT 'PENDIENTE',
    "observacion_revision" TEXT,
    "id_aportante" TEXT,
    "numero_planilla" TEXT,
    "url_pago" TEXT,
    "estado_pago" TEXT,

    CONSTRAINT "planillas_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "checklist_retefuente" (
    "id" BIGSERIAL NOT NULL,
    "cuenta_cobro_id" BIGINT NOT NULL,
    "id_checklist" INTEGER NOT NULL,
    "nombre" TEXT,
    "ka_nl_cumple" INTEGER,
    "observacion" TEXT,
    "estado_revision" "EstadoSeccion" NOT NULL DEFAULT 'PENDIENTE',
    "observacion_revision" TEXT,

    CONSTRAINT "checklist_retefuente_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "actividades" (
    "id" BIGSERIAL NOT NULL,
    "cuenta_cobro_id" BIGINT NOT NULL,
    "descripcion" TEXT NOT NULL,
    "fecha_actividad" DATE NOT NULL,
    "estado_revision" "EstadoSeccion" NOT NULL DEFAULT 'PENDIENTE',
    "observacion_revision" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "actividades_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "otros_gastos" (
    "id" BIGSERIAL NOT NULL,
    "cuenta_cobro_id" BIGINT NOT NULL,
    "fecha" DATE NOT NULL,
    "codigo_concepto" TEXT NOT NULL,
    "observacion" TEXT,
    "valor" DECIMAL(18,2) NOT NULL,
    "estado_revision" "EstadoSeccion" NOT NULL DEFAULT 'PENDIENTE',
    "observacion_revision" TEXT,

    CONSTRAINT "otros_gastos_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ejecucion_fisica" (
    "id" BIGSERIAL NOT NULL,
    "cuenta_cobro_id" BIGINT NOT NULL,
    "porcentaje" DECIMAL(5,2),
    "justificacion" TEXT,
    "estado_revision" "EstadoSeccion" NOT NULL DEFAULT 'PENDIENTE',
    "observacion_revision" TEXT,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ejecucion_fisica_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "adjuntos" (
    "id" BIGSERIAL NOT NULL,
    "cuenta_cobro_id" BIGINT NOT NULL,
    "actividad_id" BIGINT,
    "gasto_id" BIGINT,
    "nombre" TEXT NOT NULL,
    "mime_type" TEXT,
    "tamanio_bytes" INTEGER,
    "datos" BYTEA,
    "url_storage" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "adjuntos_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "informes_supervision" (
    "id" BIGSERIAL NOT NULL,
    "cuenta_cobro_id" BIGINT NOT NULL,
    "supervisor_id" TEXT NOT NULL,
    "contenido" JSONB,
    "estado" TEXT NOT NULL DEFAULT 'BORRADOR',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "informes_supervision_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "planillas_cuenta_cobro_id_key" ON "planillas"("cuenta_cobro_id");

-- CreateIndex
CREATE UNIQUE INDEX "ejecucion_fisica_cuenta_cobro_id_key" ON "ejecucion_fisica"("cuenta_cobro_id");

-- CreateIndex
CREATE UNIQUE INDEX "informes_supervision_cuenta_cobro_id_key" ON "informes_supervision"("cuenta_cobro_id");

-- AddForeignKey
ALTER TABLE "historial_estados" ADD CONSTRAINT "historial_estados_cuenta_cobro_id_fkey" FOREIGN KEY ("cuenta_cobro_id") REFERENCES "cuentas_cobro"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "planillas" ADD CONSTRAINT "planillas_cuenta_cobro_id_fkey" FOREIGN KEY ("cuenta_cobro_id") REFERENCES "cuentas_cobro"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "checklist_retefuente" ADD CONSTRAINT "checklist_retefuente_cuenta_cobro_id_fkey" FOREIGN KEY ("cuenta_cobro_id") REFERENCES "cuentas_cobro"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "actividades" ADD CONSTRAINT "actividades_cuenta_cobro_id_fkey" FOREIGN KEY ("cuenta_cobro_id") REFERENCES "cuentas_cobro"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "otros_gastos" ADD CONSTRAINT "otros_gastos_cuenta_cobro_id_fkey" FOREIGN KEY ("cuenta_cobro_id") REFERENCES "cuentas_cobro"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ejecucion_fisica" ADD CONSTRAINT "ejecucion_fisica_cuenta_cobro_id_fkey" FOREIGN KEY ("cuenta_cobro_id") REFERENCES "cuentas_cobro"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "adjuntos" ADD CONSTRAINT "adjuntos_cuenta_cobro_id_fkey" FOREIGN KEY ("cuenta_cobro_id") REFERENCES "cuentas_cobro"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "adjuntos" ADD CONSTRAINT "adjuntos_actividad_id_fkey" FOREIGN KEY ("actividad_id") REFERENCES "actividades"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "adjuntos" ADD CONSTRAINT "adjuntos_gasto_id_fkey" FOREIGN KEY ("gasto_id") REFERENCES "otros_gastos"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "informes_supervision" ADD CONSTRAINT "informes_supervision_cuenta_cobro_id_fkey" FOREIGN KEY ("cuenta_cobro_id") REFERENCES "cuentas_cobro"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
