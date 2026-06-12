import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { randomInt } from 'node:crypto';
import { PrismaService } from '../../prisma/prisma/prisma.service';
import { UpsertPlanillaDto } from '../dto/upsert-planilla.dto';
import { GenerarPagoSimpleTestDto } from '../dto/generar-pagosimple-test.dto';
import { ConfirmarPagoSimpleMockDto } from '../dto/confirmar-pagosimple-mock.dto';

const SALUD_RATE = 0.125;
const PENSION_RATE = 0.16;
const ARL_RATE = 0.00522;
const PIN_TTL_MINUTES = 15;

@Injectable()
export class PlanillaService {
  constructor(private readonly prisma: PrismaService) {}

  async obtener(cuentaCobroId: bigint, codigoTercero: string, rol: string) {
    const cuenta = await this.prisma.cuentaCobro.findUnique({
      where: { id: cuentaCobroId },
      select: { codigoTercero: true, codigoTerceroSupervisor: true, codigoTerceroAprobador: true },
    });
    if (!cuenta) throw new NotFoundException('Cuenta de cobro no encontrada');
    this.verificarAcceso(cuenta, codigoTercero, rol);

    const planilla = await this.prisma.planilla.findUnique({ where: { cuentaCobroId } });
    if (!planilla) throw new NotFoundException('Aun no hay planilla registrada para esta cuenta');
    return planilla;
  }

  async upsert(cuentaCobroId: bigint, dto: UpsertPlanillaDto, codigoTercero: string) {
    const cuenta = await this.verificarPropietario(cuentaCobroId, codigoTercero);
    if (cuenta.estado !== 'BORRADOR') {
      throw new BadRequestException('Solo se puede modificar la planilla cuando la cuenta esta en BORRADOR');
    }

    const totalAportes = dto.aporteSalud + dto.aportePension + dto.aporteArl;
    const totalAportesRedondeado = Math.round(totalAportes * 100);
    const valorCobradoRedondeado = Math.round(Number(cuenta.valorCobrado) * 100);
    if (totalAportesRedondeado > valorCobradoRedondeado) {
      throw new BadRequestException(
        `La suma de aportes (${totalAportes}) no puede superar el valor cobrado (${cuenta.valorCobrado})`,
      );
    }

    const data = {
      plantillaPagoNo: dto.plantillaPagoNo,
      fechaPago: new Date(dto.fechaPago),
      periodoPagado: dto.periodoPagado,
      ingresoBaseCotizacion: dto.ingresoBaseCotizacion,
      aporteSalud: dto.aporteSalud,
      aportePension: dto.aportePension,
      aporteArl: dto.aporteArl,
      valorPagado: dto.valorPagado,
    };

    return this.prisma.planilla.upsert({
      where: { cuentaCobroId },
      create: { cuentaCobroId, ...data },
      update: data,
    });
  }

  async generarPagoSimpleMock(
    cuentaCobroId: bigint,
    codigoTercero: string,
    dto: GenerarPagoSimpleTestDto,
  ) {
    const cuenta = await this.verificarPropietario(cuentaCobroId, codigoTercero);
    if (cuenta.estado !== 'BORRADOR') {
      throw new BadRequestException('Solo se puede generar PagoSimple cuando la cuenta esta en BORRADOR');
    }

    const planillaExistente = await this.prisma.planilla.findUnique({ where: { cuentaCobroId } });
    if (planillaExistente?.estadoPago === 'PAGADA') {
      throw new BadRequestException('La planilla ya fue marcada como PAGADA');
    }

    const datosFinancieros = this.construirDatosFinancieros(planillaExistente, dto);
    const ahora = new Date();
    const pinExistenteValido = this.pinVigente(planillaExistente?.pinExpiraAt);

    if (planillaExistente && pinExistenteValido && planillaExistente.pinPagoSimple) {
      return this.formatearRespuestaPagoSimpleMock(
        cuentaCobroId,
        planillaExistente,
        planillaExistente.pinPagoSimple,
      );
    }

    const pin = this.generarPin();
    const pinExpiraAt = new Date(ahora.getTime() + PIN_TTL_MINUTES * 60 * 1000);
    const numeroPlanilla = planillaExistente?.numeroPlanilla ?? this.generarNumeroPlanilla(cuentaCobroId);
    const urlPago = this.generarUrlPago(pin);

    const planilla = await this.prisma.planilla.upsert({
      where: { cuentaCobroId },
      create: {
        cuentaCobroId,
        plantillaPagoNo: null,
        fechaPago: null,
        periodoPagado: null,
        ingresoBaseCotizacion: datosFinancieros.ingresoBaseCotizacion,
        aporteSalud: datosFinancieros.aporteSalud,
        aportePension: datosFinancieros.aportePension,
        aporteArl: datosFinancieros.aporteArl,
        valorPagado: datosFinancieros.valorPagado,
        numeroPlanilla,
        urlPago,
        estadoPago: 'PENDIENTE',
        pinPagoSimple: pin,
        pinExpiraAt,
        intentosPagoSimple: 0,
        ultimaConfirmacionAt: null,
      },
      update: {
        ...datosFinancieros,
        numeroPlanilla,
        urlPago,
        estadoPago: 'PENDIENTE',
        pinPagoSimple: pin,
        pinExpiraAt,
        intentosPagoSimple: 0,
        ultimaConfirmacionAt: null,
      },
    });

    return this.formatearRespuestaPagoSimpleMock(cuentaCobroId, planilla, pin);
  }

  async confirmarPagoSimpleMock(
    cuentaCobroId: bigint,
    codigoTercero: string,
    dto: ConfirmarPagoSimpleMockDto,
  ) {
    const cuenta = await this.verificarPropietario(cuentaCobroId, codigoTercero);
    if (cuenta.estado !== 'BORRADOR') {
      throw new BadRequestException('Solo se puede confirmar PagoSimple cuando la cuenta esta en BORRADOR');
    }

    const planilla = await this.prisma.planilla.findUnique({ where: { cuentaCobroId } });
    if (!planilla) {
      throw new NotFoundException('No existe una planilla asociada a esta cuenta');
    }

    if (!planilla.pinPagoSimple) {
      throw new BadRequestException('La planilla no tiene un PIN de PagoSimple generado');
    }

    if (planilla.estadoPago === 'PAGADA') {
      return planilla;
    }

    if (planilla.pinPagoSimple !== dto.pin) {
      await this.prisma.planilla.update({
        where: { cuentaCobroId },
        data: {
          intentosPagoSimple: { increment: 1 },
        },
      });
      throw new BadRequestException('El PIN enviado no coincide con el PIN generado');
    }

    if (!this.pinVigente(planilla.pinExpiraAt)) {
      await this.prisma.planilla.update({
        where: { cuentaCobroId },
        data: {
          estadoPago: 'EXPIRADA',
          intentosPagoSimple: { increment: 1 },
        },
      });
      throw new BadRequestException('El PIN de PagoSimple esta vencido');
    }

    return this.prisma.planilla.update({
      where: { cuentaCobroId },
      data: {
        estadoPago: 'PAGADA',
        fechaPago: new Date(),
        ultimaConfirmacionAt: new Date(),
      },
    });
  }

  private verificarAcceso(
    cuenta: {
      codigoTercero: string;
      codigoTerceroSupervisor: string | null;
      codigoTerceroAprobador: string | null;
    },
    codigoTercero: string,
    rol: string,
  ) {
    if (rol === 'SUPERVISOR') {
      if (!cuenta.codigoTerceroSupervisor || cuenta.codigoTerceroSupervisor !== codigoTercero) {
        throw new ForbiddenException('No tienes permisos para acceder a esta planilla');
      }
      return;
    }

    if (rol === 'APROBADOR') {
      if (!cuenta.codigoTerceroAprobador || cuenta.codigoTerceroAprobador !== codigoTercero) {
        throw new ForbiddenException('No tienes permisos para acceder a esta planilla');
      }
      return;
    }

    if (cuenta.codigoTercero !== codigoTercero) {
      throw new ForbiddenException('No tienes permisos para acceder a esta planilla');
    }
  }

  private async verificarPropietario(cuentaCobroId: bigint, codigoTercero: string) {
    const cuenta = await this.prisma.cuentaCobro.findUnique({
      where: { id: cuentaCobroId },
      select: { codigoTercero: true, estado: true, valorCobrado: true },
    });
    if (!cuenta) throw new NotFoundException('Cuenta de cobro no encontrada');
    if (cuenta.codigoTercero !== codigoTercero) {
      throw new ForbiddenException('No tienes permisos para modificar esta planilla');
    }
    return cuenta;
  }

  private construirDatosFinancieros(
    planillaExistente:
      | {
          ingresoBaseCotizacion: unknown | null;
          aporteSalud: unknown | null;
          aportePension: unknown | null;
          aporteArl: unknown | null;
          valorPagado: unknown | null;
        }
      | null,
    dto: GenerarPagoSimpleTestDto,
  ) {
    const ingresoBaseCotizacion = this.aNumero(
      planillaExistente?.ingresoBaseCotizacion ?? dto.ingresoBaseCotizacion,
    );

    if (!Number.isFinite(ingresoBaseCotizacion) || ingresoBaseCotizacion <= 0) {
      throw new BadRequestException(
        'Debes enviar ingresoBaseCotizacion cuando la planilla aun no tiene datos financieros',
      );
    }

    const aporteSalud = this.redondearDosDecimales(
      this.aNumero(planillaExistente?.aporteSalud) || ingresoBaseCotizacion * SALUD_RATE,
    );
    const aportePension = this.redondearDosDecimales(
      this.aNumero(planillaExistente?.aportePension) || ingresoBaseCotizacion * PENSION_RATE,
    );
    const aporteArl = this.redondearDosDecimales(
      this.aNumero(planillaExistente?.aporteArl) || ingresoBaseCotizacion * ARL_RATE,
    );
    const valorPagado = this.redondearDosDecimales(
      this.aNumero(planillaExistente?.valorPagado) || aporteSalud + aportePension + aporteArl,
    );

    return {
      ingresoBaseCotizacion,
      aporteSalud,
      aportePension,
      aporteArl,
      valorPagado,
    };
  }

  private formatearRespuestaPagoSimpleMock(
    cuentaCobroId: bigint,
    planilla: {
      id: bigint;
      numeroPlanilla: string | null;
      urlPago: string | null;
      estadoPago: string | null;
      pinPagoSimple: string | null;
      pinExpiraAt: Date | null;
      intentosPagoSimple: number;
      ultimaConfirmacionAt: Date | null;
      ingresoBaseCotizacion: unknown | null;
      aporteSalud: unknown | null;
      aportePension: unknown | null;
      aporteArl: unknown | null;
      valorPagado: unknown | null;
    },
    pin: string,
  ) {
    return {
      cuentaCobroId: cuentaCobroId.toString(),
      numeroPlanilla: planilla.numeroPlanilla ?? this.generarNumeroPlanilla(cuentaCobroId),
      pin,
      total: this.redondearDosDecimales(this.aNumero(planilla.valorPagado)),
      urlPago: planilla.urlPago ?? this.generarUrlPago(pin),
      urlConfirmacionMock: `/planilla/${cuentaCobroId.toString()}/pagosimple/mock-confirmacion`,
      estadoPago: planilla.estadoPago ?? 'PENDIENTE',
      pinExpiraAt: planilla.pinExpiraAt,
      intentosPagoSimple: planilla.intentosPagoSimple,
      ultimaConfirmacionAt: planilla.ultimaConfirmacionAt,
      ingresoBaseCotizacion: this.aNumero(planilla.ingresoBaseCotizacion),
      aporteSalud: this.redondearDosDecimales(this.aNumero(planilla.aporteSalud)),
      aportePension: this.redondearDosDecimales(this.aNumero(planilla.aportePension)),
      aporteArl: this.redondearDosDecimales(this.aNumero(planilla.aporteArl)),
    };
  }

  private generarPin() {
    return randomInt(100000000, 1000000000).toString();
  }

  private generarUrlPago(pin: string) {
    return `https://mock.pagosimple.local/pago?pin=${pin}`;
  }

  private generarNumeroPlanilla(cuentaCobroId: bigint) {
    return `PS-${cuentaCobroId.toString()}-${Date.now()}`;
  }

  private pinVigente(pinExpiraAt: Date | null | undefined) {
    if (!pinExpiraAt) return false;
    return pinExpiraAt.getTime() > Date.now();
  }

  private aNumero(valor: unknown) {
    if (typeof valor === 'number') return valor;
    if (typeof valor === 'bigint') return Number(valor);
    if (valor && typeof valor === 'object' && 'toNumber' in valor && typeof valor.toNumber === 'function') {
      return valor.toNumber();
    }
    return Number(valor ?? 0);
  }

  private redondearDosDecimales(valor: number) {
    return Math.round(valor * 100) / 100;
  }
}
