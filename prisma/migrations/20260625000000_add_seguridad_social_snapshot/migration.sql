-- AlterTable: snapshot de seguridad social (PagoSimple BDUA/RUAF) en usuarios.
-- Todas las columnas son opcionales para no requerir backfill.
ALTER TABLE "usuarios"
  ADD COLUMN "eps" TEXT,
  ADD COLUMN "eps_fecha_afiliacion" DATE,
  ADD COLUMN "afp" TEXT,
  ADD COLUMN "afp_fecha_afiliacion" DATE,
  ADD COLUMN "tipo_afiliado" TEXT,
  ADD COLUMN "origen_seguridad_social" TEXT,
  ADD COLUMN "seguridad_social_consultada_at" TIMESTAMP(3);
