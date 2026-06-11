import { Module } from '@nestjs/common';
import { MulterModule } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';
import { RegistroContratistasController } from './registro-contratistas/registro-contratistas.controller';
import { RegistroContratistasService } from './registro-contratistas/registro-contratistas.service';
import { ExtraccionService } from './extraccion/extraccion.service';
import { PdfTextExtractor } from './extraccion/pdf-text-extractor';
import { RutPdfParser } from './extraccion/rut-pdf.parser';
import { CertificadoBancarioParser } from './extraccion/certificado-bancario.parser';
import { PresupuestoModule } from '../presupuesto/presupuesto.module';

@Module({
  imports: [
    PresupuestoModule,
    MulterModule.register({
      storage: memoryStorage(),
      limits: { fileSize: 10 * 1024 * 1024 },
    }),
  ],
  controllers: [RegistroContratistasController],
  providers: [
    RegistroContratistasService,
    ExtraccionService,
    PdfTextExtractor,
    RutPdfParser,
    CertificadoBancarioParser,
  ],
})
export class RegistroContratistasModule {}
