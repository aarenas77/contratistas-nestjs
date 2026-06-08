# Guía de inicio: Nuevo backend cuentas de cobro

## Prerrequisitos

| Herramienta | Versión mínima | Verificar |
|---|---|---|
| Node.js | 20.x LTS | `node -v` |
| npm | 10.x | `npm -v` |
| Docker Desktop | Cualquier reciente | `docker -v` |
| Git | Cualquier | `git -v` |
| NestJS CLI | global | `npm i -g @nestjs/cli` |

---

## 1. Crear el proyecto

```bash
nest new cuentas-cobro-api
# Seleccionar: npm

cd cuentas-cobro-api
```

---

## 2. Instalar dependencias

```bash
# Prisma ORM
npm install prisma @prisma/client

# Validación de DTOs
npm install class-validator class-transformer

# Autenticación JWT
npm install @nestjs/passport passport passport-jwt
npm install --save-dev @types/passport-jwt

# Configuración por entorno
npm install @nestjs/config

# Swagger
npm install @nestjs/swagger swagger-ui-express

# Cliente HTTP (para proxy a PagoSimple y catálogos)
npm install @nestjs/axios axios
```

---

## 3. Configurar PostgreSQL con Docker

Crear `docker-compose.yml` en la raíz del proyecto:

```yaml
version: '3.8'
services:
  postgres:
    image: postgres:16-alpine
    container_name: cuentas_cobro_db
    environment:
      POSTGRES_USER: cuentas_user
      POSTGRES_PASSWORD: cuentas_pass
      POSTGRES_DB: cuentas_cobro
    ports:
      - '5432:5432'
    volumes:
      - cuentas_cobro_data:/var/lib/postgresql/data

volumes:
  cuentas_cobro_data:
```

Levantar la base de datos:

```bash
docker-compose up -d
```

Verificar que está corriendo:

```bash
docker ps
# Debe aparecer: cuentas_cobro_db   Up
```

---

## 4. Configurar variables de entorno

Crear `.env` en la raíz:

```env
DATABASE_URL="postgresql://cuentas_user:cuentas_pass@localhost:5432/cuentas_cobro"
JWT_SECRET="super-secreto-cambiar-en-produccion"
JWT_EXPIRES_IN="8h"

# URL del backend existente (para proxy PagoSimple y catálogos)
GESTION_CONTRATISTAS_URL="https://ecosystem-gateway-dev.adacsc.co"
LEGACY_API_TOKEN="bello-dev"

PORT=3000
```

Crear `.env.example` (para el repo, sin valores reales):

```env
DATABASE_URL="postgresql://USER:PASSWORD@HOST:PORT/DB_NAME"
JWT_SECRET="your-jwt-secret"
JWT_EXPIRES_IN="8h"
GESTION_CONTRATISTAS_URL="https://..."
LEGACY_API_TOKEN=""
PORT=3000
```

Agregar `.env` al `.gitignore`:

```bash
echo ".env" >> .gitignore
```

---

## 5. Inicializar Prisma

```bash
npx prisma init
```

Esto crea:
- `prisma/schema.prisma` — aquí va el schema completo del plan de arquitectura
- Actualiza `.env` con `DATABASE_URL` (ya lo tienes del paso anterior)

Copiar el schema completo del documento de arquitectura al archivo `prisma/schema.prisma`.

Ejecutar la primera migración:

```bash
npx prisma migrate dev --name init
```

Verificar que las tablas se crearon:

```bash
npx prisma studio
# Abre el explorador visual en http://localhost:5555
```

---

## 6. Estructura de módulos

Generar los módulos usando el CLI de NestJS:

```bash
# Módulo de autenticación
nest g module auth
nest g service auth/auth
nest g controller auth/auth

# Módulo principal de cuentas de cobro
nest g module cuentas-cobro
nest g controller cuentas-cobro/cuentas-cobro
nest g service cuentas-cobro/cuentas-cobro

# Módulo de planilla
nest g module planilla
nest g controller planilla/planilla
nest g service planilla/planilla

# Módulo de actividades
nest g module actividades
nest g controller actividades/actividades
nest g service actividades/actividades

# Módulo de gastos
nest g module gastos
nest g controller gastos/gastos
nest g service gastos/gastos

# Módulo de checklist
nest g module checklist-retefuente
nest g controller checklist-retefuente/checklist-retefuente
nest g service checklist-retefuente/checklist-retefuente

# Módulo de supervisor
nest g module supervisor
nest g controller supervisor/supervisor
nest g service supervisor/supervisor

# Módulo de aprobador
nest g module aprobador
nest g controller aprobador/aprobador
nest g service aprobador/aprobador

# Servicio compartido de Prisma
nest g module prisma
nest g service prisma/prisma
```

---

## 7. Configurar Prisma Service

Editar `src/prisma/prisma.service.ts`:

```typescript
import { Injectable, OnModuleInit } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit {
  async onModuleInit() {
    await this.$connect();
  }
}
```

Editar `src/prisma/prisma.module.ts`:

```typescript
import { Global, Module } from '@nestjs/common';
import { PrismaService } from './prisma.service';

@Global()
@Module({
  providers: [PrismaService],
  exports: [PrismaService],
})
export class PrismaModule {}
```

Importar `PrismaModule` en `AppModule`:

```typescript
// src/app.module.ts
import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { PrismaModule } from './prisma/prisma.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    PrismaModule,
    // ... demás módulos
  ],
})
export class AppModule {}
```

---

## 8. Configurar Swagger y ValidationPipe

Editar `src/main.ts`:

```typescript
import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // Prefijo global de API
  app.setGlobalPrefix('api/v1');

  // Validación automática de DTOs
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,          // elimina campos no declarados en el DTO
      forbidNonWhitelisted: true,
      transform: true,          // auto-convierte tipos (string → number)
    }),
  );

  // CORS (ajustar origins en producción)
  app.enableCors();

  // Swagger
  const config = new DocumentBuilder()
    .setTitle('Cuentas de Cobro API')
    .setDescription('Backend para radicación y revisión de cuentas de cobro')
    .setVersion('1.0')
    .addBearerAuth()
    .build();
  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api', app, document);

  const port = process.env.PORT ?? 3000;
  await app.listen(port);
  console.log(`Server running on http://localhost:${port}`);
  console.log(`Swagger UI at http://localhost:${port}/api`);
}
bootstrap();
```

---

## 9. Primer endpoint funcional: crear cuenta de cobro

### DTO

Crear `src/cuentas-cobro/dto/create-cuenta-cobro.dto.ts`:

```typescript
import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsDateString, IsNumber, IsPositive } from 'class-validator';

export class CreateCuentaCobroDto {
  @ApiProperty({ example: 'CTR-2024-001' })
  @IsString()
  codigoContrato: string;

  @ApiProperty({ example: '12345' })
  @IsString()
  codigoTercero: string;

  @ApiProperty({ example: '2026-01-01' })
  @IsDateString()
  fechaInicio: string;

  @ApiProperty({ example: '2026-01-31' })
  @IsDateString()
  fechaFin: string;

  @ApiProperty({ example: 5000000 })
  @IsNumber()
  @IsPositive()
  valorCobrado: number;
}
```

### Service

Editar `src/cuentas-cobro/cuentas-cobro.service.ts`:

```typescript
import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateCuentaCobroDto } from './dto/create-cuenta-cobro.dto';

@Injectable()
export class CuentasCobroService {
  constructor(private readonly prisma: PrismaService) {}

  async create(dto: CreateCuentaCobroDto) {
    return this.prisma.cuentaCobro.create({
      data: {
        codigoContrato: dto.codigoContrato,
        codigoTercero: dto.codigoTercero,
        fechaInicio: new Date(dto.fechaInicio),
        fechaFin: new Date(dto.fechaFin),
        valorCobrado: dto.valorCobrado,
        estado: 'BORRADOR',
      },
    });
  }

  async findAll(codigoTercero: string) {
    return this.prisma.cuentaCobro.findMany({
      where: { codigoTercero },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOne(id: bigint) {
    return this.prisma.cuentaCobro.findUniqueOrThrow({
      where: { id },
      include: {
        planilla: true,
        actividades: true,
        gastos: true,
        checklistItems: true,
        ejecucionFisica: true,
        historialEstados: { orderBy: { createdAt: 'asc' } },
      },
    });
  }
}
```

### Controller

Editar `src/cuentas-cobro/cuentas-cobro.controller.ts`:

```typescript
import { Controller, Get, Post, Body, Param, Query } from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { CuentasCobroService } from './cuentas-cobro.service';
import { CreateCuentaCobroDto } from './dto/create-cuenta-cobro.dto';

@ApiTags('Cuentas de Cobro')
@ApiBearerAuth()
@Controller('cuentas-cobro')
export class CuentasCobroController {
  constructor(private readonly service: CuentasCobroService) {}

  @Post()
  create(@Body() dto: CreateCuentaCobroDto) {
    return this.service.create(dto);
  }

  @Get()
  findAll(@Query('codigoTercero') codigoTercero: string) {
    return this.service.findAll(codigoTercero);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.service.findOne(BigInt(id));
  }
}
```

---

## 10. Levantar el servidor

```bash
npm run start:dev
```

Verificar:
- `http://localhost:3000/api` → Swagger UI con el endpoint visible
- `POST /api/v1/cuentas-cobro` → crear una cuenta borrador
- `GET /api/v1/cuentas-cobro?codigoTercero=12345` → listar

---

## 11. Integrar con el frontend Angular

En `proxy.conf.json` del proyecto Angular (`MFContratistas`), agregar:

```json
{
  "/nuevo-backend": {
    "target": "http://localhost:3000",
    "pathRewrite": { "^/nuevo-backend": "/api/v1" },
    "secure": false,
    "changeOrigin": true
  }
}
```

En el service Angular que reemplaza `collection-invoice.service.ts`, cambiar las URLs para apuntar a `/nuevo-backend/cuentas-cobro/...`.

---

## 12. Comandos útiles del día a día

```bash
# Levantar base de datos
docker-compose up -d

# Levantar servidor en modo desarrollo (hot reload)
npm run start:dev

# Aplicar nuevas migraciones (tras editar schema.prisma)
npx prisma migrate dev --name descripcion-del-cambio

# Abrir explorador visual de BD
npx prisma studio

# Generar cliente Prisma (tras cambios en schema sin migrar)
npx prisma generate

# Bajar la base de datos
docker-compose down

# Borrar todo (BD incluida) — DESTRUCTIVO
docker-compose down -v
```

---

## 13. Checklist de verificación antes de mostrar al equipo

- [ ] `docker-compose up -d` levanta sin errores
- [ ] `npx prisma migrate dev` aplica sin errores
- [ ] `npm run start:dev` arranca sin errores
- [ ] Swagger en `localhost:3000/api` muestra todos los endpoints
- [ ] `POST /api/v1/cuentas-cobro` crea un registro visible en `prisma studio`
- [ ] `PUT /api/v1/cuentas-cobro/:id/radicar` cambia estado a `RADICADA`
- [ ] `GET /api/v1/cuentas-cobro/:id/historial` muestra la transición de estado
- [ ] `POST /api/v1/supervisor/cuentas-cobro/:id/aprobar` cambia a `APROBADA_SUPERVISOR`
- [ ] `POST /api/v1/aprobador/cuentas-cobro/:id/aprobar` cambia a `APROBADA_FINAL`
