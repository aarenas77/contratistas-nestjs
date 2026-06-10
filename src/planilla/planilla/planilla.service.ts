import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma/prisma.service';
import { UpsertPlanillaDto } from '../dto/upsert-planilla.dto';

@Injectable()
export class PlanillaService {
  constructor(private readonly prisma: PrismaService) {}

  async obtener(cuentaCobroId: bigint, codigoTercero: string, rol: string) {
    const cuenta = await this.prisma.cuentaCobro.findUnique({
      where: { id: cuentaCobroId },
      select: { codigoTercero: true, codigoTerceroSupervisor: true, codigoTerceroAprobador: true },
    });
    if (!cuenta) throw new NotFoundException('Cuenta de cobro no encontrada');
    if (rol === 'SUPERVISOR') {
      if (!cuenta.codigoTerceroSupervisor || cuenta.codigoTerceroSupervisor !== codigoTercero) {
        throw new ForbiddenException('No tienes permisos para acceder a esta planilla');
      }
    } else if (rol === 'APROBADOR') {
      if (!cuenta.codigoTerceroAprobador || cuenta.codigoTerceroAprobador !== codigoTercero) {
        throw new ForbiddenException('No tienes permisos para acceder a esta planilla');
      }
    } else {
      if (cuenta.codigoTercero !== codigoTercero) {
        throw new ForbiddenException('No tienes permisos para acceder a esta planilla');
      }
    }
    const planilla = await this.prisma.planilla.findUnique({ where: { cuentaCobroId } });
    if (!planilla) throw new NotFoundException('Aún no hay planilla registrada para esta cuenta');
    return planilla;
  }

  async upsert(cuentaCobroId: bigint, dto: UpsertPlanillaDto, codigoTercero: string) {
    const cuenta = await this.verificarPropietario(cuentaCobroId, codigoTercero);
    if (cuenta.estado !== 'BORRADOR') {
      throw new BadRequestException('Solo se puede modificar la planilla cuando la cuenta está en BORRADOR');
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

  private async verificarPropietario(cuentaCobroId: bigint, codigoTercero: string) {
    const cuenta = await this.prisma.cuentaCobro.findUnique({
      where: { id: cuentaCobroId },
      select: { codigoTercero: true, codigoTerceroSupervisor: true, estado: true, valorCobrado: true },
    });
    if (!cuenta) throw new NotFoundException('Cuenta de cobro no encontrada');
    if (cuenta.codigoTercero !== codigoTercero) throw new ForbiddenException('No tienes permisos para modificar esta planilla');
    return cuenta;
  }
}
