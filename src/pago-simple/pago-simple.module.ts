import { HttpModule, HttpService } from '@nestjs/axios';
import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PAGO_SIMPLE_GATEWAY } from './pago-simple.gateway';
import { PagoSimpleHttpGateway } from './pago-simple-http.gateway';
import { PagoSimpleMockGateway } from './pago-simple-mock.gateway';
import { APORTANTE_SOURCE_GATEWAY } from './aportante/aportante-source.gateway';
import { AportanteSourceMockGateway } from './aportante/aportante-source-mock.gateway';
import { PAGO_SIMPLE_PILA_GATEWAY } from './pila/pago-simple-pila.gateway';
import { PagoSimplePilaHttpGateway } from './pila/pago-simple-pila-http.gateway';
import { PagoSimplePilaMockGateway } from './pila/pago-simple-pila-mock.gateway';
import { PlanillaPilaGeneratorService } from './pila/planilla-pila.generator';

const usaMock = (config: ConfigService) =>
  config.get<string>('PAGOSIMPLE_USE_MOCK') === 'true';

/**
 * Módulo de la frontera externa PagoSimple. Selecciona la implementación de
 * cada gateway según `PAGOSIMPLE_USE_MOCK`: en dev/pruebas mocks sin red, en
 * los demás ambientes los clientes HTTP reales. Los tokens se exportan para que
 * otros módulos (registro de contratistas, planilla) los inyecten.
 *
 * `APORTANTE_SOURCE_GATEWAY` solo tiene implementación mock por ahora: la real
 * leerá las tablas replicadas desde Oracle cuando existan.
 */
@Module({
  imports: [HttpModule],
  providers: [
    PlanillaPilaGeneratorService,
    {
      provide: PAGO_SIMPLE_GATEWAY,
      inject: [ConfigService, HttpService],
      useFactory: (config: ConfigService, http: HttpService) =>
        usaMock(config)
          ? new PagoSimpleMockGateway()
          : new PagoSimpleHttpGateway(http, config),
    },
    {
      provide: PAGO_SIMPLE_PILA_GATEWAY,
      inject: [ConfigService, HttpService],
      useFactory: (config: ConfigService, http: HttpService) =>
        usaMock(config)
          ? new PagoSimplePilaMockGateway()
          : new PagoSimplePilaHttpGateway(http, config),
    },
    {
      provide: APORTANTE_SOURCE_GATEWAY,
      useClass: AportanteSourceMockGateway,
    },
  ],
  exports: [
    PAGO_SIMPLE_GATEWAY,
    PAGO_SIMPLE_PILA_GATEWAY,
    APORTANTE_SOURCE_GATEWAY,
    PlanillaPilaGeneratorService,
  ],
})
export class PagoSimpleModule {}
