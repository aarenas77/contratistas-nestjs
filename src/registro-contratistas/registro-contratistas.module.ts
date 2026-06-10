import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { MulterModule } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';
import { RegistroContratistasController } from './registro-contratistas/registro-contratistas.controller';
import { RegistroContratistasService } from './registro-contratistas/registro-contratistas.service';
import { ExtraccionLegacyService } from './extraccion/extraccion-legacy.service';

@Module({
  imports: [
    MulterModule.register({
      storage: memoryStorage(),
      limits: { fileSize: 10 * 1024 * 1024 },
    }),
    HttpModule,
  ],
  controllers: [RegistroContratistasController],
  providers: [RegistroContratistasService, ExtraccionLegacyService],
})
export class RegistroContratistasModule {}
