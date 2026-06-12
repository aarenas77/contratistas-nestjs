ALTER TABLE "planillas"
ADD COLUMN "pin_pago_simple" TEXT,
ADD COLUMN "pin_expira_at" TIMESTAMP(3),
ADD COLUMN "intentos_pago_simple" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN "ultima_confirmacion_at" TIMESTAMP(3);
