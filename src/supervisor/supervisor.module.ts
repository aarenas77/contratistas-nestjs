import { Module } from '@nestjs/common';
import { SupervisorController } from './supervisor/supervisor.controller';
import { SupervisorService } from './supervisor/supervisor.service';

@Module({
  controllers: [SupervisorController],
  providers: [SupervisorService]
})
export class SupervisorModule {}
