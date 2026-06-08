import { Module } from '@nestjs/common';
import { ChecklistRetefuenteController } from './checklist-retefuente/checklist-retefuente.controller';
import { ChecklistRetefuenteService } from './checklist-retefuente/checklist-retefuente.service';

@Module({
  controllers: [ChecklistRetefuenteController],
  providers: [ChecklistRetefuenteService]
})
export class ChecklistRetefuenteModule {}
