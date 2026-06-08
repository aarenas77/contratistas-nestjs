import { Module } from '@nestjs/common';
import { PlanillaController } from './planilla/planilla.controller';
import { PlanillaService } from './planilla/planilla.service';

@Module({
  controllers: [PlanillaController],
  providers: [PlanillaService]
})
export class PlanillaModule {}
