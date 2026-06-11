import { Module } from '@nestjs/common';
import { PresupuestoController } from './presupuesto.controller';
import { PresupuestoService } from './presupuesto.service';
import { PresupuestoLocalGateway } from './presupuesto-local.gateway';
import { PRESUPUESTO_GATEWAY } from './presupuesto.gateway';

/**
 * Módulo temporal que simula el módulo de presupuesto. El día que llegue la
 * integración real, basta con cambiar el `useClass` del token PRESUPUESTO_GATEWAY.
 */
@Module({
  controllers: [PresupuestoController],
  providers: [
    PresupuestoService,
    { provide: PRESUPUESTO_GATEWAY, useClass: PresupuestoLocalGateway },
  ],
  exports: [PRESUPUESTO_GATEWAY],
})
export class PresupuestoModule {}
