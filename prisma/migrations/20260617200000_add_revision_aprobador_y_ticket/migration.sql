-- AlterTable
ALTER TABLE "actividades" ADD COLUMN     "estado_revision_aprobador" "EstadoSeccion" NOT NULL DEFAULT 'PENDIENTE',
ADD COLUMN     "observacion_revision_aprobador" TEXT;

-- AlterTable
ALTER TABLE "checklist_retefuente" ADD COLUMN     "estado_revision_aprobador" "EstadoSeccion" NOT NULL DEFAULT 'PENDIENTE',
ADD COLUMN     "observacion_revision_aprobador" TEXT;

-- AlterTable
ALTER TABLE "cuentas_cobro" ADD COLUMN     "codigo_tercero_aprobador" TEXT,
ADD COLUMN     "codigo_tercero_supervisor" TEXT,
ADD COLUMN     "ticket" SERIAL NOT NULL,
DROP COLUMN "codigo_contrato",
ADD COLUMN     "codigo_contrato" INTEGER NOT NULL;

-- AlterTable
ALTER TABLE "ejecucion_fisica" ADD COLUMN     "estado_revision_aprobador" "EstadoSeccion" NOT NULL DEFAULT 'PENDIENTE',
ADD COLUMN     "observacion_revision_aprobador" TEXT;

-- AlterTable
ALTER TABLE "otros_gastos" ADD COLUMN     "estado_revision_aprobador" "EstadoSeccion" NOT NULL DEFAULT 'PENDIENTE',
ADD COLUMN     "observacion_revision_aprobador" TEXT;

-- AlterTable
ALTER TABLE "planillas" ADD COLUMN     "estado_revision_aprobador" "EstadoSeccion" NOT NULL DEFAULT 'PENDIENTE',
ADD COLUMN     "observacion_revision_aprobador" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "cuentas_cobro_ticket_key" ON "cuentas_cobro"("ticket");

-- CreateIndex
CREATE INDEX "cuentas_cobro_codigo_contrato_idx" ON "cuentas_cobro"("codigo_contrato");

-- CreateIndex
CREATE INDEX "cuentas_cobro_codigo_tercero_idx" ON "cuentas_cobro"("codigo_tercero");

-- AddForeignKey
ALTER TABLE "cuentas_cobro" ADD CONSTRAINT "cuentas_cobro_codigo_contrato_fkey" FOREIGN KEY ("codigo_contrato") REFERENCES "contratos"("codigo_contrato") ON DELETE RESTRICT ON UPDATE CASCADE;

