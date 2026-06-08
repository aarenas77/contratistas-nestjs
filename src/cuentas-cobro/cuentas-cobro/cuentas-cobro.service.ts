import { BadRequestException, ForbiddenException, Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma/prisma.service';
import { CreateCuentaCobroDto } from '../dto/create-cuenta-cobro.dto';
import { ListarCuentasCobroDto } from '../dto/listar-cuentas-cobro.dto';
import { EstadoCuentaCobro } from '@prisma/client';

const ESTADO_LEGACY: Record<EstadoCuentaCobro, { idEstado: number; estado: string }> = {
  BORRADOR:               { idEstado: 0, estado: 'BORRADOR' },
  RADICADA:               { idEstado: 1, estado: 'ACTIVO' },
  EN_REVISION_SUPERVISOR: { idEstado: 2, estado: 'PENDIENTE' },
  DEVUELTA_CONTRATISTA:   { idEstado: 3, estado: 'DEVUELTA' },
  APROBADA_SUPERVISOR:    { idEstado: 4, estado: 'APROBADA_SUPERVISOR' },
  EN_REVISION_APROBADOR:  { idEstado: 5, estado: 'EN_REVISION_APROBADOR' },
  RECHAZADA_APROBADOR:    { idEstado: 6, estado: 'RECHAZADA' },
  APROBADA_FINAL:         { idEstado: 7, estado: 'APROBADA' },
  ENVIADA_CONTABILIDAD:   { idEstado: 8, estado: 'ENVIADA_CONTABILIDAD' },
};

@Injectable()
export class CuentasCobroService {
  constructor(private readonly prisma: PrismaService) {}

  async create(dto: CreateCuentaCobroDto, codigoTercero: string) {
    return this.prisma.cuentaCobro.create({
      data: {
        codigoContrato: dto.codigoContrato,
        codigoTercero,
        fechaInicio: new Date(dto.fechaInicio),
        fechaFin: new Date(dto.fechaFin),
        valorCobrado: dto.valorCobrado,
        estado: 'BORRADOR',
      },
    });
  }

  async listar(codigoTercero: string, dto: ListarCuentasCobroDto) {
    const page = dto.page ?? 0;
    const size = dto.size ?? 10;
    const where = { codigoContrato: dto.codigoContrato, codigoTercero };

    const [cuentas, totalElementos] = await Promise.all([
      this.prisma.cuentaCobro.findMany({
        where,
        include: { contrato: { select: { consecutivo: true } } },
        orderBy: { fechaSolicitud: 'desc' },
        skip: page * size,
        take: size,
      }),
      this.prisma.cuentaCobro.count({ where }),
    ]);

    const totalPaginas = Math.ceil(totalElementos / size);
    const data = cuentas.map((c) => {
      const { idEstado, estado } = ESTADO_LEGACY[c.estado];

      // Calcular si la cuenta está disponible para radicar
      const hoy = new Date();
      hoy.setHours(0, 0, 0, 0);
      const disponibleParaRadicar =
        c.estado === 'BORRADOR' &&
        new Date(c.fechaInicio) <= hoy &&
        new Date(c.fechaFin) >= hoy;

      return {
        idPago: Number(c.id),
        ticket: c.ticket,
        contrato: c.contrato.consecutivo,
        codigoContrato: c.codigoContrato,
        codigoTercero: Number(c.codigoTercero),
        codigoTerceroSupervisor: c.codigoTerceroSupervisor ? Number(c.codigoTerceroSupervisor) : null,
        idEstado,
        estado,
        fechaSolicitud: c.fechaSolicitud?.toISOString() ?? null,
        valorSolicitud: Number(c.valorCobrado),
        disponibleParaRadicar,
      };
    });

    return {
      success: true,
      message: `Se encontraron ${totalElementos} cuenta(s) de cobro`,
      data,
      totalElementos,
      paginaActual: page,
      tamañoPagina: size,
      totalElementosPagina: data.length,
      totalPaginas,
      primera: page === 0,
      ultima: page >= totalPaginas - 1,
      timestamp: new Date().toISOString(),
    };
  }

  async findOne(id: bigint, codigoTercero: string, rol: string) {
    const cuenta = await this.prisma.cuentaCobro.findUniqueOrThrow({
      where: { id },
      include: {
        planilla: true,
        actividades: true,
        gastos: true,
        checklistItems: true,
        ejecucionFisica: true,
        historialEstados: { orderBy: { createdAt: 'asc' } },
      },
    });

    // APROBADOR puede ver todas las cuentas
    if (rol !== 'APROBADOR') {
      if (rol === 'SUPERVISOR') {
        if (!cuenta.codigoTerceroSupervisor || cuenta.codigoTerceroSupervisor !== codigoTercero) {
          throw new ForbiddenException('No tienes permisos para ver esta cuenta de cobro');
        }
      } else {
        // CONTRATISTA
        if (cuenta.codigoTercero !== codigoTercero) {
          throw new ForbiddenException('No tienes permisos para ver esta cuenta de cobro');
        }
      }
    }

    return cuenta;
  }

  async resumenRadicacion(id: bigint, codigoTercero: string) {
    const cuenta = await this.prisma.cuentaCobro.findUniqueOrThrow({
      where: { id },
      include: {
        actividades: {
          select: {
            id: true,
            descripcion: true,
            fechaActividad: true,
            adjuntos: { select: { id: true, nombre: true } },
          },
        },
        planilla: {
          select: {
            plantillaPagoNo: true,
            fechaPago: true,
            periodoPagado: true,
            ingresoBaseCotizacion: true,
            aporteSalud: true,
            aportePension: true,
            aporteArl: true,
            valorPagado: true,
          },
        },
        checklistItems: {
          orderBy: { idChecklist: 'asc' },
          select: { idChecklist: true, nombre: true, kaNlCumple: true },
        },
        gastos: {
          select: { id: true, codigoConcepto: true, valor: true, fecha: true, observacion: true },
        },
      },
    });

    if (cuenta.codigoTercero !== codigoTercero) throw new ForbiddenException();

    const totalGastos = cuenta.gastos.reduce((acc, g) => acc + Number(g.valor), 0);

    return {
      cuentaCobroId: Number(id),
      estado: cuenta.estado,
      fechaInicio: cuenta.fechaInicio,
      fechaFin: cuenta.fechaFin,
      valorCobrado: Number(cuenta.valorCobrado),
      actividades: {
        total: cuenta.actividades.length,
        items: cuenta.actividades,
      },
      planilla: cuenta.planilla,
      checklist: {
        total: cuenta.checklistItems.length,
        respondidos: cuenta.checklistItems.filter((c) => c.kaNlCumple !== null).length,
        items: cuenta.checklistItems,
      },
      gastos: {
        total: cuenta.gastos.length,
        valorTotal: totalGastos,
        items: cuenta.gastos,
      },
    };
  }

  async radicar(id: bigint, codigoTercero: string, usuarioNombre: string) {
    const cuenta = await this.prisma.cuentaCobro.findUniqueOrThrow({
      where: { id },
      include: {
        actividades: { select: { id: true } },
        planilla: { select: { id: true } },
        checklistItems: { select: { kaNlCumple: true } },
      },
    });

    const hoy = new Date();
    hoy.setHours(0, 0, 0, 0);
    const fechaInicio = new Date(cuenta.fechaInicio);
    fechaInicio.setHours(0, 0, 0, 0);
    const fechaFin = new Date(cuenta.fechaFin);
    fechaFin.setHours(0, 0, 0, 0);
    if (hoy < fechaInicio || hoy > fechaFin) {
      throw new BadRequestException('La cuenta solo puede radicarse dentro del período vigente (fechaInicio - fechaFin)');
    }

    if (cuenta.codigoTercero !== codigoTercero) throw new ForbiddenException();
    if (cuenta.estado !== 'BORRADOR') {
      throw new BadRequestException('La cuenta ya fue radicada o no está en estado BORRADOR');
    }
    if (cuenta.actividades.length === 0) {
      throw new BadRequestException('Debe registrar al menos una actividad antes de radicar');
    }
    if (!cuenta.planilla) {
      throw new BadRequestException('Debe registrar la planilla de seguridad social antes de radicar');
    }
    if (cuenta.checklistItems.length < 6) {
      throw new BadRequestException('Debe consultar y completar el checklist de retefuente antes de radicar');
    }
    const sinResponder = cuenta.checklistItems.filter((c) => c.kaNlCumple === null).length;
    if (sinResponder > 0) {
      throw new BadRequestException(`Quedan ${sinResponder} ítem(s) del checklist sin responder`);
    }

    return this.prisma.$transaction(async (tx) => {
      const actualizada = await tx.cuentaCobro.update({
        where: { id },
        data: { estado: 'RADICADA', fechaSolicitud: new Date() },
      });
      await tx.historialEstado.create({
        data: {
          cuentaCobroId: id,
          estadoAnterior: 'BORRADOR',
          estadoNuevo: 'RADICADA',
          usuarioId: codigoTercero,
          usuarioNombre,
          observacion: 'Cuenta de cobro radicada por el contratista',
        },
      });
      return { ...actualizada, mensaje: 'Cuenta de cobro radicada exitosamente' };
    });
  }
}
