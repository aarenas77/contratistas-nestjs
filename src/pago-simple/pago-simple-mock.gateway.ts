import { Injectable, Logger } from '@nestjs/common';
import {
  PagoSimpleGateway,
  SeguridadSocialSnapshot,
} from './pago-simple.gateway';

/**
 * Implementación de desarrollo/pruebas: no hace red. Devuelve un snapshot fijo
 * para cualquier documento, de modo que el flujo de registro pueda ejercitarse
 * sin credenciales reales de PagoSimple.
 */
@Injectable()
export class PagoSimpleMockGateway implements PagoSimpleGateway {
  private readonly logger = new Logger(PagoSimpleMockGateway.name);

  consultarSeguridadSocial(
    tipoDocumento: string,
    documento: string,
  ): Promise<SeguridadSocialSnapshot | null> {
    this.logger.debug(
      `[MOCK] consulta seguridad social ${tipoDocumento} ${documento}`,
    );
    return Promise.resolve({
      eps: 'EPS SURA',
      epsFechaAfiliacion: new Date(Date.UTC(2020, 0, 15)),
      afp: 'PORVENIR',
      afpFechaAfiliacion: new Date(Date.UTC(2020, 0, 15)),
      tipoAfiliado: 'C',
      origen: 'PAGOSIMPLE',
    });
  }
}
