-- CreateTable
CREATE TABLE "precarga_terceros" (
    "id" BIGSERIAL NOT NULL,
    "tipo_identificacion" TEXT,
    "numero_identificacion" TEXT NOT NULL,
    "codigo_tercero" TEXT NOT NULL,
    "nombre" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "precarga_terceros_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "precarga_terceros_numero_identificacion_key" ON "precarga_terceros"("numero_identificacion");

-- CreateIndex
CREATE UNIQUE INDEX "precarga_terceros_codigo_tercero_key" ON "precarga_terceros"("codigo_tercero");
