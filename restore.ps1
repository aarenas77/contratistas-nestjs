<#
.SYNOPSIS
    Restaura la base de datos de cuentas-cobro-api en un PC nuevo desde un dump de pg_dump.

.DESCRIPTION
    Levanta un contenedor de PostgreSQL limpio con docker-compose y restaura el
    respaldo (.sql) generado en el PC original.

    EJECUTAR ESTE SCRIPT EN EL PC NUEVO (destino), NO en el original.

    ADVERTENCIA: el paso "docker compose down -v" BORRA el volumen de datos actual
    del contenedor. Solo debe usarse en el PC destino, donde la BD esta vacia/danada.

.PARAMETER BackupFile
    Ruta al archivo de respaldo .sql. Si no se indica, toma el backup_cuentas_cobro_*.sql
    mas reciente de la carpeta actual.

.EXAMPLE
    .\restore.ps1
    .\restore.ps1 -BackupFile .\backup_cuentas_cobro_20260617_145858.sql
#>

[CmdletBinding()]
param(
    [string]$BackupFile,
    [string]$Container = "cuentas_cobro_db",
    [string]$DbUser    = "cuentas_user",
    [string]$DbName    = "cuentas_cobro"
)

$ErrorActionPreference = "Stop"

function Write-Step($msg) { Write-Host "`n==> $msg" -ForegroundColor Cyan }

# 1. Validaciones previas -----------------------------------------------------
Write-Step "Verificando requisitos"

if (-not (Get-Command docker -ErrorAction SilentlyContinue)) {
    throw "Docker no esta instalado o no esta en el PATH. Instala Docker Desktop primero."
}

if (-not (Test-Path ".\docker-compose.yml")) {
    throw "No se encontro docker-compose.yml. Ejecuta este script desde la raiz del repo."
}

# Resolver el archivo de backup
if (-not $BackupFile) {
    $candidate = Get-ChildItem ".\backup_cuentas_cobro_*.sql" -ErrorAction SilentlyContinue |
                 Sort-Object LastWriteTime -Descending | Select-Object -First 1
    if (-not $candidate) {
        throw "No se encontro ningun backup_cuentas_cobro_*.sql en la carpeta actual. Indica la ruta con -BackupFile."
    }
    $BackupFile = $candidate.FullName
}

if (-not (Test-Path $BackupFile)) {
    throw "No existe el archivo de respaldo: $BackupFile"
}
$BackupFile = (Get-Item $BackupFile).FullName

Write-Host "Backup a restaurar: $BackupFile"
Write-Host "Tamano: $([math]::Round((Get-Item $BackupFile).Length / 1MB, 2)) MB"

# 2. Confirmacion (esto borra datos) -----------------------------------------
Write-Step "ADVERTENCIA"
Write-Host "Se va a ejecutar 'docker compose down -v', lo que BORRA el volumen de datos" -ForegroundColor Yellow
Write-Host "del contenedor '$Container' en ESTE equipo." -ForegroundColor Yellow
$confirm = Read-Host "Escribe SI para continuar"
if ($confirm -ne "SI") {
    Write-Host "Cancelado por el usuario." -ForegroundColor Red
    exit 1
}

# 3. Levantar Postgres limpio -------------------------------------------------
Write-Step "Recreando contenedor de PostgreSQL limpio"
docker compose down -v
docker compose up -d

# 4. Esperar a que Postgres acepte conexiones ---------------------------------
Write-Step "Esperando a que PostgreSQL este listo"
$ready = $false
for ($i = 1; $i -le 30; $i++) {
    docker exec $Container pg_isready -U $DbUser -d $DbName *> $null
    if ($LASTEXITCODE -eq 0) { $ready = $true; break }
    Start-Sleep -Seconds 2
    Write-Host "  ...intento $i/30"
}
if (-not $ready) {
    throw "PostgreSQL no respondio a tiempo. Revisa 'docker compose logs'."
}
Write-Host "PostgreSQL listo."

# 5. Restaurar el dump --------------------------------------------------------
Write-Step "Restaurando el respaldo"
docker cp $BackupFile "${Container}:/tmp/restore.sql"
docker exec $Container psql -U $DbUser -d $DbName -v ON_ERROR_STOP=1 -f /tmp/restore.sql
docker exec $Container rm /tmp/restore.sql

# 6. Verificacion -------------------------------------------------------------
Write-Step "Verificando datos restaurados"
docker exec $Container psql -U $DbUser -d $DbName -c `
"SELECT (SELECT COUNT(*) FROM usuarios) AS usuarios, (SELECT COUNT(*) FROM contratos) AS contratos, (SELECT COUNT(*) FROM cuentas_cobro) AS cuentas, (SELECT COUNT(*) FROM _prisma_migrations) AS migraciones;"

Write-Step "Restauracion completada"
Write-Host "Ahora puedes levantar el backend con:" -ForegroundColor Green
Write-Host "  npm install" -ForegroundColor Green
Write-Host "  npm run start:dev" -ForegroundColor Green
Write-Host "`nRecuerda tener el archivo .env con el mismo DATABASE_URL y JWT_SECRET." -ForegroundColor Yellow
