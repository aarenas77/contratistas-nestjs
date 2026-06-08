-- CreateTable
CREATE TABLE "contratos" (
    "id" BIGSERIAL NOT NULL,
    "codigo_contrato" INTEGER NOT NULL,
    "consecutivo" TEXT NOT NULL,
    "descripcion" TEXT NOT NULL,
    "codigo_tercero" TEXT NOT NULL,
    "valor" DECIMAL(18,2) NOT NULL,
    "total_pago" DECIMAL(18,2) NOT NULL,
    "estado" TEXT NOT NULL DEFAULT 'A',
    "fecha_elaboracion" DATE NOT NULL,
    "fecha_aprobacion" DATE,
    "fecha_fin" DATE,
    "fecha_registro" DATE NOT NULL,
    "fecha_inicio_secop" DATE,
    "plazo_dias" INTEGER NOT NULL,
    "tipo_plazo" TEXT NOT NULL DEFAULT 'D',
    "consecutivo_compromiso" INTEGER NOT NULL,
    "estado_compromiso" TEXT NOT NULL,
    "numero_acta_inicio" INTEGER,
    "saldo_disponible_otros_gastos" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "id_supervisor" TEXT,
    "codigo_dependencia" INTEGER,
    "codigo_mempresa" BIGINT NOT NULL DEFAULT 9999999999,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "contratos_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "contratos_codigo_contrato_key" ON "contratos"("codigo_contrato");

-- CreateIndex
CREATE INDEX "contratos_codigo_tercero_idx" ON "contratos"("codigo_tercero");
