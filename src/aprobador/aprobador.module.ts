import { Module } from '@nestjs/common';
import { AprobadorController } from './aprobador/aprobador.controller';
import { AprobadorService } from './aprobador/aprobador.service';

@Module({
  controllers: [AprobadorController],
  providers: [AprobadorService]
})
export class AprobadorModule {}
