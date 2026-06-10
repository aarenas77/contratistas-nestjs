-- Seed admin user for portal access
INSERT INTO "usuarios" (
  "username",
  "password_hash",
  "nombre",
  "email",
  "codigo_tercero",
  "user_identification",
  "rol",
  "activo",
  "created_at",
  "updated_at"
)
VALUES (
  'admin',
  '$2b$10$7J00YlVeRbAEb4ERoHEzOORXG9PTGEXE6Yf7bIG0JWFoggFNdP9kS',
  'Administrador',
  'admin@cuentascobro.dev',
  '0',
  '10000004',
  'ADMINISTRADOR',
  TRUE,
  NOW(),
  NOW()
)
ON CONFLICT ("username") DO UPDATE SET
  "password_hash" = EXCLUDED."password_hash",
  "nombre" = EXCLUDED."nombre",
  "email" = EXCLUDED."email",
  "codigo_tercero" = EXCLUDED."codigo_tercero",
  "user_identification" = EXCLUDED."user_identification",
  "rol" = EXCLUDED."rol",
  "activo" = TRUE,
  "updated_at" = NOW();
