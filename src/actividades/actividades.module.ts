import { Module } from '@nestjs/common';
import { ActividadesController } from './actividades/actividades.controller';
import { ActividadesService } from './actividades/actividades.service';

@Module({
  controllers: [ActividadesController],
  providers: [ActividadesService]
})
export class ActividadesModule {}
