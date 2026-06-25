import { Injectable } from '@nestjs/common';
import { PlanillaPilaException } from './planilla-pila.exception';
import {
  AportanteIndependienteCommand,
  GenerarPlanillaSeguridadSocialCommand,
  PlanillaPilaArchivo,
} from './planilla-pila.types';

const HEADER_LENGTH = 359;
const DETAIL_LENGTH = 693;

/** Tarifas PILA con escala 5 (denominador 100000). */
const TARIFA_PENSION = 0.16;
const TARIFA_SALUD = 0.125;
const TARIFAS_ARL: Record<number, number> = {
  1: 0.00522,
  2: 0.01044,
  3: 0.02436,
  4: 0.0435,
  5: 0.0696,
};

/**
 * Port directo de `PlanillaPilaGenerator.java`. Construye el archivo plano PILA
 * de longitud fija (encabezado 359, detalle 693) a partir del comando de
 * planilla. Es un servicio puro: sin estado, sin red, totalmente determinista.
 */
@Injectable()
export class PlanillaPilaGeneratorService {
  generar(command: GenerarPlanillaSeguridadSocialCommand): PlanillaPilaArchivo {
    this.validar(command);
    const encabezado = this.buildHeader(command);
    const detalle = this.buildDetail(command);

    if (encabezado.length !== HEADER_LENGTH) {
      throw new PlanillaPilaException(
        `El encabezado PILA no cumple longitud ${HEADER_LENGTH}`,
      );
    }
    if (detalle.length !== DETAIL_LENGTH) {
      throw new PlanillaPilaException(
        `El detalle PILA no cumple longitud ${DETAIL_LENGTH}`,
      );
    }

    const nombreArchivo = this.buildFileName(command);
    return { nombreArchivo, contenido: `${encabezado}\n${detalle}` };
  }

  private buildHeader(command: GenerarPlanillaSeguridadSocialCommand): string {
    const aportante = command.aportante;
    let sb = '';
    sb += this.text('01', 2);
    sb += this.text(this.defaultValue(command.modalidadPlanilla, '1'), 1);
    sb += this.number(1, 4);
    sb += this.text(this.resolveNombre(aportante), 200);
    sb += this.text(this.defaultValue(aportante.tipoDocumento, 'CC'), 2);
    sb += this.text(aportante.numeroDocumento, 16);
    sb += this.number(this.defaultInt(aportante.digitoVerificacion, 0), 1);
    sb += this.text(this.defaultValue(command.tipoPlanilla, 'I'), 1);
    sb += this.spaces(10);
    sb += this.spaces(10);
    sb += this.text(this.defaultValue(command.formaPresentacion, 'U'), 1);
    sb += this.spaces(10);
    sb += this.spaces(40);
    sb += this.text(this.defaultValue(aportante.codigoArl, '14-11'), 6);
    sb += this.text(command.periodoPago, 7);
    sb += this.text(command.periodoPago, 7);
    sb += this.text(command.numeroRadicacion ?? '', 10);
    sb += this.spaces(10);
    sb += this.number(1, 5);
    sb += this.number(0, 12);
    sb += this.text(this.defaultValue(command.tipoAportante, '02'), 2);
    sb += this.text(this.defaultValue(command.codigoOperador, '88'), 2);
    return sb;
  }

  private buildDetail(command: GenerarPlanillaSeguridadSocialCommand): string {
    const aportante = command.aportante;
    const salario = Math.round(command.salario);
    const ibcPension = salario;
    const ibcSalud = salario;
    const ibcArl = salario;
    const ibcCcf = 0;

    const tarifaPension = TARIFA_PENSION;
    const tarifaSalud = TARIFA_SALUD;
    const tarifaArl = this.tarifaArl(this.defaultInt(command.claseRiesgo, 1));

    const aportePension = this.roundPila(ibcPension, tarifaPension);
    const aporteSalud = this.roundPila(ibcSalud, tarifaSalud);
    const aporteArl = this.roundPila(ibcArl, tarifaArl);

    let sb = '';
    sb += this.text('02', 2);
    sb += this.number(1, 5);
    sb += this.text(this.defaultValue(aportante.tipoDocumento, 'CC'), 2);
    sb += this.text(aportante.numeroDocumento, 16);
    sb += this.text(this.defaultValue(command.tipoCotizante, '59'), 2);
    sb += this.text(this.defaultValue(command.subtipoCotizante, '00'), 2);
    sb += this.spaces(1);
    sb += this.spaces(1);
    sb += this.text(aportante.codigoDepartamento, 2);
    sb += this.text(
      this.codigoMunicipioPila(
        aportante.codigoDepartamento,
        aportante.codigoMunicipio,
      ),
      3,
    );
    sb += this.text(aportante.primerApellido, 20);
    sb += this.text(aportante.segundoApellido, 30);
    sb += this.text(aportante.primerNombre, 20);
    sb += this.text(aportante.segundoNombre, 30);
    sb += this.spaces(15);
    sb += this.number(0, 2);
    sb += this.text(command.codigoAfp, 6);
    sb += this.spaces(6);
    sb += this.text(command.codigoEps, 6);
    sb += this.spaces(6);
    sb += this.text(command.codigoCcf ?? '', 6);
    sb += this.number(this.defaultInt(command.diasCotizados, 30), 2);
    sb += this.number(this.defaultInt(command.diasCotizados, 30), 2);
    sb += this.number(this.defaultInt(command.diasCotizados, 30), 2);
    sb += this.number(0, 2);
    sb += this.number(salario, 9);
    sb += this.spaces(1);
    sb += this.number(ibcPension, 9);
    sb += this.number(ibcSalud, 9);
    sb += this.number(ibcArl, 9);
    sb += this.number(ibcCcf, 9);
    sb += this.rate(tarifaPension, 7, 5);
    sb += this.number(aportePension, 9);
    sb += this.number(0, 9);
    sb += this.number(0, 9);
    sb += this.number(aportePension, 9);
    sb += this.number(0, 9);
    sb += this.number(0, 9);
    sb += this.number(0, 9);
    sb += this.rate(tarifaSalud, 7, 5);
    sb += this.number(aporteSalud, 9);
    sb += this.number(0, 9);
    sb += this.spaces(15);
    sb += this.number(0, 9);
    sb += this.spaces(15);
    sb += this.number(0, 9);
    sb += this.rate(tarifaArl, 9, 7);
    sb += this.number(0, 9);
    sb += this.number(aporteArl, 9);
    sb += this.rate(0, 7, 5);
    sb += this.number(0, 9);
    sb += this.rate(0, 7, 5);
    sb += this.number(0, 9);
    sb += this.rate(0, 7, 5);
    sb += this.number(0, 9);
    sb += this.rate(0, 7, 5);
    sb += this.number(0, 9);
    sb += this.rate(0, 7, 5);
    sb += this.number(0, 9);
    sb += this.spaces(2);
    sb += this.spaces(16);
    sb += command.exonerado === true ? 'S' : 'N';
    sb += this.text(this.defaultValue(aportante.codigoArl, '14-11'), 6);
    sb += this.number(this.defaultInt(command.claseRiesgo, 1), 1);
    sb += this.spaces(1);
    sb += this.spaces(150);
    sb += this.number(0, 9);
    sb += this.number(0, 3);
    sb += this.spaces(10);
    sb += this.number(this.parseLong(command.actividadEconomicaRiesgos), 7);
    return sb;
  }

  private validar(command: GenerarPlanillaSeguridadSocialCommand): void {
    if (!command || !command.aportante) {
      throw new PlanillaPilaException(
        'Los datos del aportante son obligatorios.',
      );
    }
    const aportante = command.aportante;
    this.require(aportante.numeroDocumento, 'El numero de documento es obligatorio.');
    this.require(aportante.primerNombre, 'El primer nombre es obligatorio.');
    this.require(aportante.primerApellido, 'El primer apellido es obligatorio.');
    this.require(
      aportante.codigoDepartamento,
      'El codigo de departamento es obligatorio.',
    );
    this.require(
      aportante.codigoMunicipio,
      'El codigo de municipio es obligatorio.',
    );
    this.require(command.periodoPago, 'El periodo de pago es obligatorio.');
    this.require(command.codigoAfp, 'El codigo AFP es obligatorio.');
    this.require(command.codigoEps, 'El codigo EPS es obligatorio.');
    this.require(
      command.actividadEconomicaRiesgos,
      'La actividad economica de riesgos es obligatoria.',
    );
    if (!/^\d{4}-\d{2}$/.test(command.periodoPago)) {
      throw new PlanillaPilaException(
        'El periodo de pago debe tener formato yyyy-MM.',
      );
    }
    if (!/^\d{1,7}$/.test(command.actividadEconomicaRiesgos)) {
      throw new PlanillaPilaException(
        'La actividad economica de riesgos debe ser numerica de maximo 7 digitos.',
      );
    }
    if (command.salario == null || command.salario <= 0) {
      throw new PlanillaPilaException('El salario/IBC debe ser mayor a cero.');
    }
  }

  /**
   * Redondeo PILA: base * tarifa, techo al peso, luego al siguiente múltiplo de
   * 100. Se opera en aritmética entera (numerador escalado a 1e5) para evitar
   * el error de punto flotante que tendría `base * tarifa` directo.
   */
  private roundPila(base: number, rate: number): number {
    const num = Math.round(rate * 100000);
    const roundedPeso = Math.ceil((base * num) / 100000);
    return Math.ceil(roundedPeso / 100) * 100;
  }

  private tarifaArl(claseRiesgo: number): number {
    return TARIFAS_ARL[claseRiesgo] ?? TARIFAS_ARL[1];
  }

  private buildFileName(command: GenerarPlanillaSeguridadSocialCommand): string {
    const periodo = command.periodoPago.replace(/-/g, '');
    const aportante = command.aportante;
    return `${this.defaultValue(aportante.tipoDocumento, 'CC')}${aportante.numeroDocumento}_${periodo}.txt`;
  }

  private resolveNombre(aportante: AportanteIndependienteCommand): string {
    if (aportante.nombreCompleto && aportante.nombreCompleto.trim() !== '') {
      return aportante.nombreCompleto;
    }
    return [
      aportante.primerNombre,
      aportante.segundoNombre,
      aportante.primerApellido,
      aportante.segundoApellido,
    ]
      .filter((v): v is string => v != null && v.trim() !== '')
      .join(' ');
  }

  private codigoMunicipioPila(
    codigoDepartamento: string | null | undefined,
    codigoMunicipio: string | null | undefined,
  ): string {
    if (!codigoMunicipio || codigoMunicipio.trim() === '') {
      return codigoMunicipio ?? '';
    }
    const digits = codigoMunicipio.replace(/\D/g, '');
    if (
      digits.length >= 5 &&
      codigoDepartamento != null &&
      digits.startsWith(codigoDepartamento.replace(/\D/g, ''))
    ) {
      return digits.substring(2, 5);
    }
    if (digits.length > 3) {
      return digits.substring(digits.length - 3);
    }
    return digits;
  }

  private require(value: string | null | undefined, message: string): void {
    if (value == null || value.trim() === '') {
      throw new PlanillaPilaException(message);
    }
  }

  private text(value: string | null | undefined, length: number): string {
    const clean = value ?? '';
    if (clean.length > length) {
      return clean.substring(0, length);
    }
    return clean + this.spaces(length - clean.length);
  }

  private number(value: number, length: number): string {
    let clean = Math.trunc(Math.max(value, 0)).toString();
    if (clean.length > length) {
      clean = clean.substring(clean.length - length);
    }
    return '0'.repeat(length - clean.length) + clean;
  }

  private rate(value: number, length: number, scale: number): string {
    let clean = value.toFixed(scale);
    if (clean.length > length) {
      clean = clean.substring(0, length);
    }
    return clean + '0'.repeat(length - clean.length);
  }

  private spaces(count: number): string {
    return ' '.repeat(Math.max(count, 0));
  }

  private defaultValue(
    value: string | null | undefined,
    fallback: string,
  ): string {
    return value == null || value.trim() === '' ? fallback : value;
  }

  private defaultInt(value: number | null | undefined, fallback: number): number {
    return value == null ? fallback : value;
  }

  private parseLong(value: string): number {
    return Number.parseInt(value, 10);
  }
}
