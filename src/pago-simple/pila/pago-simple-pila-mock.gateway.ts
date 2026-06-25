import { Injectable, Logger } from '@nestjs/common';
import { DatosAportante } from '../aportante/aportante-source.gateway';
import {
  PagoSimplePilaGateway,
  ValidarPlanillaInput,
} from './pago-simple-pila.gateway';
import {
  AportanteVinculado,
  TotalesPlanillaPila,
  UrlPagoPlanillaPila,
  ValidacionPlanillaPila,
} from './pila-result.models';

/**
 * Implementación de desarrollo/pruebas del flujo PILA: no hace red. Devuelve
 * respuestas deterministas (vinculación exitosa, validación sin errores,
 * totales calculados con el IBC y una URL de pago simulada) para ejercitar el
 * flujo completo sin credenciales reales de PagoSimple.
 */
@Injectable()
export class PagoSimplePilaMockGateway implements PagoSimplePilaGateway {
  private readonly logger = new Logger(PagoSimplePilaMockGateway.name);

  vincularAportante(datos: DatosAportante): Promise<AportanteVinculado> {
    this.logger.debug(`[MOCK] vincular aportante ${datos.numeroDocumento}`);
    const idAportante =
      datos.idAportante ?? this.idDeterminista(datos.numeroDocumento);
    return Promise.resolve({
      idAportante,
      tipoDocumento: datos.tipoDocumento,
      numeroDocumento: datos.numeroDocumento,
      nombre: datos.nombreCompleto ?? datos.primerNombre,
      estado: 'ACTIVE',
      authToken: 'MOCK-AUTH-TOKEN',
    });
  }

  validarPlanilla(input: ValidarPlanillaInput): Promise<ValidacionPlanillaPila> {
    this.logger.debug(`[MOCK] validar planilla ${input.archivo.nombreArchivo}`);
    const payrollNumber = this.numeroPlanillaDeterminista(
      input.datos.numeroDocumento,
    );
    return Promise.resolve({
      validationStatus: 'VALIDATED',
      payrollValidations: [
        {
          payrollCode: 0,
          payrollNumber,
          numberErrorsContributor: 0,
          numberErrorsCompany: 0,
          numberWarnings: 0,
          detailErrorsContributor: [],
          detailErrorsCompany: [],
          detailWarnings: [],
        },
      ],
    });
  }

  consultarTotales(
    numeroPlanilla: string,
    datos: DatosAportante,
  ): Promise<TotalesPlanillaPila> {
    this.logger.debug(`[MOCK] totales planilla ${numeroPlanilla}`);
    const ibc = datos.ibc ?? 0;
    const pension = this.redondearPila(ibc, 0.16);
    const salud = this.redondearPila(ibc, 0.125);
    const arl = this.redondearPila(ibc, this.tarifaArl(datos.claseRiesgo ?? 1));
    const total = pension + salud + arl;
    return Promise.resolve({
      documentType: datos.tipoDocumento,
      documentNumber: datos.numeroDocumento,
      verificationDigit: String(datos.digitoVerificacion),
      reportDate: new Date().toISOString().slice(0, 10),
      contributorName: datos.nombreCompleto ?? datos.primerNombre,
      payrollNumber: Number(numeroPlanilla) || null,
      quotePeriod: null,
      servicePeriod: null,
      affiliatesNumber: 1,
      limitDate: null,
      payrollStatus: 'PENDING_PAYMENT',
      administratorTotalValue: [
        this.administrador('AFP', datos.codigoAfp, pension),
        this.administrador('EPS', datos.codigoEps, salud),
        this.administrador('ARL', datos.codigoArl, arl),
      ],
      totalWithoutArrear: total,
      arrearValue: 0,
      totalToPay: total,
    });
  }

  generarUrlPago(
    numeroPlanilla: string,
    datos: DatosAportante,
  ): Promise<UrlPagoPlanillaPila> {
    this.logger.debug(`[MOCK] url pago planilla ${numeroPlanilla}`);
    return Promise.resolve({
      urlPago: `https://mock.pagosimple.local/pse?planilla=${numeroPlanilla}&doc=${datos.numeroDocumento}`,
      mensaje: 'URL de pago generada (mock)',
      descripcion: null,
    });
  }

  private administrador(tipo: string, codigo: string | null, total: number) {
    return {
      identification: codigo,
      verificationDigit: 0,
      administratorCode: codigo,
      administratorName: `${tipo} (mock)`,
      administratorType: tipo,
      affiliates: '1',
      totalWithoutArrear: total,
      arrearValue: 0,
      total,
    };
  }

  private redondearPila(base: number, rate: number): number {
    const num = Math.round(rate * 100000);
    const roundedPeso = Math.ceil((base * num) / 100000);
    return Math.ceil(roundedPeso / 100) * 100;
  }

  private tarifaArl(claseRiesgo: number): number {
    const tarifas: Record<number, number> = {
      1: 0.00522,
      2: 0.01044,
      3: 0.02436,
      4: 0.0435,
      5: 0.0696,
    };
    return tarifas[claseRiesgo] ?? tarifas[1];
  }

  private idDeterminista(numeroDocumento: string): number {
    const digitos = numeroDocumento.replace(/\D/g, '').slice(-6);
    return Number(digitos) || 100001;
  }

  private numeroPlanillaDeterminista(numeroDocumento: string): number {
    const digitos = numeroDocumento.replace(/\D/g, '').slice(-7);
    return Number(digitos) || 1000001;
  }
}
