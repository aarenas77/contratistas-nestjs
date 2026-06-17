# CI/CD para `cuentas-cobro-api`

Esta guia explica como implementar CI/CD desde cero en este proyecto con GitHub Actions y Railway, sin asumir configuraciones previas.

## 1. Que hace falta entender primero

- `CI` valida codigo en cada `push` o `pull request`.
- `CD` despliega una version cuando el codigo ya paso las validaciones.
- Este proyecto usa:
  - NestJS
  - Prisma
  - PostgreSQL
- Eso significa que el pipeline debe considerar:
  - instalar dependencias
  - generar Prisma Client
  - compilar TypeScript
  - ejecutar tests
  - aplicar migraciones en el entorno de despliegue

## 2. Flujo recomendado

### CI

1. `checkout` del repositorio.
2. Instalar Node usando la version del archivo `.node-version`.
3. Ejecutar `npm ci`.
4. Ejecutar `npm run lint`.
5. Ejecutar `npm test`.
6. Ejecutar `npm run build`.
7. Ejecutar pruebas e2e si el entorno lo permite.

### CD

1. Hacer `push` a `main`.
2. GitHub Actions valida el cambio.
3. Si todo pasa, se despliega a Railway.
4. Railway corre migraciones y levanta la app.
5. Railway valida salud del servicio con un `healthcheck`.

## 3. Preparacion minima del proyecto

Antes de automatizar, asegurese de que estos puntos existen:

- Un comando de build funcionando:

```json
"build": "prisma generate && nest build"
```

- Un comando de arranque en produccion:

```json
"start:prod": "node dist/main"
```

- Variables de entorno definidas:

```bash
DATABASE_URL=
JWT_SECRET=
JWT_EXPIRES_IN=
GESTION_CONTRATISTAS_URL=
LEGACY_API_TOKEN=
PORT=3000
```

- Un repositorio GitHub conectado al proyecto.

## 4. GitHub Actions: CI

### Objetivo

Validar el proyecto en cada `push` y `pull request`.

### Estructura sugerida

Crear este archivo:

```text
.github/workflows/ci.yml
```

### Ejemplo de workflow

```yaml
name: CI

on:
  push:
    branches:
      - main
      - develop
  pull_request:

jobs:
  validate:
    runs-on: ubuntu-latest

    steps:
      - name: Checkout
        uses: actions/checkout@v4

      - name: Setup Node
        uses: actions/setup-node@v4
        with:
          node-version-file: .node-version
          cache: npm

      - name: Install dependencies
        run: npm ci

      - name: Lint
        run: npm run lint

      - name: Build
        run: npm run build

      - name: Test
        run: npm test -- --runInBand
```

### Si usas Prisma y Postgres en CI

Si los tests necesitan base de datos real, agrega un servicio temporal de PostgreSQL en GitHub Actions.

Lo importante es:

- definir `DATABASE_URL`
- levantar un contenedor de PostgreSQL
- correr `npx prisma migrate deploy`
- ejecutar los tests despues de tener la BD lista

### Buenas practicas

- Usa `npm ci`, no `npm install`.
- Separa `lint` de `lint --fix`.
- No uses secretos reales en CI.
- Si el repo aun tiene errores de lint existentes, limpia eso antes de exigir que el pipeline sea verde.

## 5. GitHub Actions: CD hacia Railway

Hay dos caminos comunes:

### Opcion A: Railway conectado directo a GitHub

Es la opcion mas simple.

1. Conectas el repo a Railway.
2. Railway detecta el branch.
3. Railway construye y despliega automaticamente.

Ventajas:

- menos configuracion
- menos piezas que mantener
- ideal para empezar

Desventajas:

- menos control que un pipeline propio
- dependes mas de la configuracion de Railway

### Opcion B: GitHub Actions despliega a Railway

Es la opcion mas didactica para aprender CI/CD.

1. GitHub Actions corre CI.
2. Si pasa, un workflow de deploy usa Railway CLI.
3. Railway recibe el deploy desde el pipeline.

Ventajas:

- aprendes el flujo completo
- controlas cuando se despliega
- el pipeline queda explicitado en el repo

Desventajas:

- mas configuracion
- necesitas secretos adicionales

## 6. Railway: configuracion desde cero

### Paso 1: crear el proyecto

En Railway:

1. Crear un nuevo proyecto.
2. Conectar el repositorio GitHub o crear el servicio manualmente.
3. Elegir el branch que va a desplegar, normalmente `main`.

### Paso 2: configurar la base de datos

Este proyecto necesita PostgreSQL.

Opciones:

- usar un plugin de PostgreSQL en Railway
- usar una base externa y copiar el `DATABASE_URL`

Para aprender, la opcion mas simple es PostgreSQL dentro de Railway.

### Paso 3: configurar variables de entorno

En Railway agrega:

- `DATABASE_URL`
- `JWT_SECRET`
- `JWT_EXPIRES_IN`
- `GESTION_CONTRATISTAS_URL`
- `LEGACY_API_TOKEN`
- `PORT`

### Paso 4: configurar el start command

El arranque de produccion debe verse similar a esto:

```bash
npx prisma migrate deploy && node dist/main
```

Esto hace dos cosas:

- aplica migraciones
- arranca la API

### Paso 5: healthcheck

Railway necesita una ruta que responda rapido y de forma estable.

Lo mas simple es:

- crear `GET /health`
- responder `200` con un JSON basico

Ejemplo de respuesta:

```json
{
  "status": "ok"
}
```

## 7. Variables y secretos que debes conocer

### En GitHub Actions

Si el deploy se hace desde Actions, vas a necesitar secretos como:

- `RAILWAY_TOKEN`
- `RAILWAY_PROJECT_ID`
- `RAILWAY_SERVICE_ID`

### En Railway

Los secretos de aplicacion viven en Railway, no en GitHub:

- `DATABASE_URL`
- `JWT_SECRET`
- `JWT_EXPIRES_IN`
- `GESTION_CONTRATISTAS_URL`
- `LEGACY_API_TOKEN`

## 8. Orden recomendado para implementarlo

1. Crear CI solo con `npm ci`, `npm run build` y `npm test`.
2. Agregar lint.
3. Agregar Postgres temporal para pruebas e2e.
4. Crear un `healthcheck`.
5. Crear Railway y su base de datos.
6. Configurar variables de entorno.
7. Elegir CD directo con Railway o CD desde GitHub Actions.
8. Automatizar el despliegue de `main`.

## 9. Que deberia quedar al final

Al terminar, deberias tener:

- un workflow de CI en `.github/workflows/ci.yml`
- un workflow de deploy en `.github/workflows/deploy-railway.yml` o deploy directo desde Railway
- un `GET /health`
- variables de entorno bien separadas
- migraciones corriendo en produccion

## 10. Regla practica

Si algo falla en CI/CD, revisa en este orden:

1. Dependencias.
2. Variables de entorno.
3. Prisma migrations.
4. Compilacion TypeScript.
5. Tests.
6. Configuracion de Railway.

