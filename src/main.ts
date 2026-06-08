// BigInt no es serializable por JSON.stringify por defecto
(BigInt.prototype as any).toJSON = function () {
  return this.toString();
};

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
      whitelist: true, // elimina campos no declarados en el DTO
      forbidNonWhitelisted: true,
      transform: true, // auto-convierte tipos (string → number)
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
