import { Module } from '@nestjs/common';
import { AvatarsService } from './avatars/avatars.service';
import { AvatarsController } from './avatars/avatars.controller';

@Module({
  controllers: [AvatarsController],
  providers: [AvatarsService],
})
export class AvatarsModule {}
