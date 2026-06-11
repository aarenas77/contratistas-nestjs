import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AuthModule } from './auth/auth.module';
import { CuentasCobroModule } from './cuentas-cobro/cuentas-cobro.module';
import { PlanillaModule } from './planilla/planilla.module';
import { ActividadesModule } from './actividades/actividades.module';
import { GastosModule } from './gastos/gastos.module';
import { ChecklistRetefuenteModule } from './checklist-retefuente/checklist-retefuente.module';
import { SupervisorModule } from './supervisor/supervisor.module';
import { AprobadorModule } from './aprobador/aprobador.module';
import { ContratosModule } from './contratos/contratos.module';
import { RegistroContratistasModule } from './registro-contratistas/registro-contratistas.module';
import { PresupuestoModule } from './presupuesto/presupuesto.module';
import { PrismaModule } from './prisma/prisma.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    PrismaModule,
    AuthModule,
    CuentasCobroModule,
    PlanillaModule,
    ActividadesModule,
    GastosModule,
    ChecklistRetefuenteModule,
    SupervisorModule,
    AprobadorModule,
    ContratosModule,
    RegistroContratistasModule,
    PresupuestoModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
