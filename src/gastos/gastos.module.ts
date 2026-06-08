import { Module } from '@nestjs/common';
import { MulterModule } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';
import { GastosController } from './gastos/gastos.controller';
import { GastosService } from './gastos/gastos.service';

@Module({
  imports: [
    MulterModule.register({
      storage: memoryStorage(),
      limits: { fileSize: 10 * 1024 * 1024 },
    }),
  ],
  controllers: [GastosController],
  providers: [GastosService],
})
export class GastosModule {}
