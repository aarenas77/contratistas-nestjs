import { Module } from '@nestjs/common';
import { MulterModule } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';
import { ActividadesController } from './actividades/actividades.controller';
import { ActividadesService } from './actividades/actividades.service';

@Module({
  imports: [
    MulterModule.register({
      storage: memoryStorage(),
      limits: { fileSize: 10 * 1024 * 1024 },
    }),
  ],
  controllers: [ActividadesController],
  providers: [ActividadesService],
})
export class ActividadesModule {}
