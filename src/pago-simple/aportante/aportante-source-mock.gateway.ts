import { Injectable, Logger } from '@nestjs/common';
import {
  AportanteSourceGateway,
  DatosAportante,
} from './aportante-source.gateway';

/**
 * Implementación de desarrollo/pruebas del origen de datos del aportante. No
 * toca la base de datos: devuelve un `DatosAportante` determinista derivado del
 * código de tercero, para poder ejercitar el flujo de planilla end-to-end sin
 * las tablas replicadas de Oracle. El `idAportante` arranca en null para que el
 * flujo de vinculación ejercite también la rama de "creación".
 */
@Injectable()
export class AportanteSourceMockGateway implements AportanteSourceGateway {
  private readonly logger = new Logger(AportanteSourceMockGateway.name);
  private readonly idAportantePorTercero = new Map<string, number>();

  obtenerDatosAportante(codigoTercero: string): Promise<DatosAportante | null> {
    this.logger.debug(`[MOCK] datos aportante tercero=${codigoTercero}`);
    const documento = this.documentoDeterminista(codigoTercero);
    return Promise.resolve({
      codigoTercero,
      idAportante: this.idAportantePorTercero.get(codigoTercero) ?? null,
      tipoDocumento: 'CC',
      numeroDocumento: documento,
      digitoVerificacion: 0,
      nombreCompleto: null,
      primerNombre: 'JUAN',
      segundoNombre: 'CARLOS',
      primerApellido: 'PEREZ',
      segundoApellido: 'GOMEZ',
      codigoDepartamento: '05',
      codigoMunicipio: '05001',
      email: 'aportante.mock@example.com',
      telefono: '6041234567',
      celular: '3001234567',
      direccion: 'CALLE 1 # 2-3',
      codigoActividadEconomica: '0951',
      codigoArl: '14-11',
      ibc: 2000000,
      codigoAfp: '230201',
      codigoEps: 'EPS010',
      codigoCcf: 'CCF010',
      claseRiesgo: 1,
      tipoCotizante: '59',
      subtipoCotizante: '00',
      actividadEconomicaRiesgos: '0951000',
    });
  }

  guardarIdAportante(codigoTercero: string, idAportante: number): Promise<void> {
    this.logger.debug(
      `[MOCK] guardar idAportante=${idAportante} tercero=${codigoTercero}`,
    );
    this.idAportantePorTercero.set(codigoTercero, idAportante);
    return Promise.resolve();
  }

  private documentoDeterminista(codigoTercero: string): string {
    const digitos = codigoTercero.replace(/\D/g, '');
    return digitos.length > 0 ? digitos : '123456789';
  }
}
