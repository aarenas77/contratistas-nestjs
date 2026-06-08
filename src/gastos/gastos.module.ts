import { Module } from '@nestjs/common';
import { GastosController } from './gastos/gastos.controller';
import { GastosService } from './gastos/gastos.service';

@Module({
  controllers: [GastosController],
  providers: [GastosService]
})
export class GastosModule {}
