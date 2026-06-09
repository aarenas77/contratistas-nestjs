import { BadRequestException, ForbiddenException, Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma/prisma.service';
import { ListarCuentasSupervisorDto } from '../dto/listar-cuentas-supervisor.dto';

@Injectable()
export class SupervisorService {
  constructor(private readonly prisma: PrismaService) {}

  async listarRadicadas(codigoTerceroSupervisor: string, dto: ListarCuentasSupervisorDto) {
    const page = dto.page ?? 0;
    const size = dto.size ?? 10;

    const where = {
      estado: 'RADICADA' as const,
      codigoTerceroSupervisor,
      ...(dto.codigoContrato ? { codigoContrato: dto.codigoContrato } : {}),
    };

    const [cuentas, totalElementos] = await Promise.all([
      this.prisma.cuentaCobro.findMany({
        where,
        include: { contrato: { select: { consecutivo: true, descripcion: true } } },
        orderBy: { fechaSolicitud: 'desc' },
        skip: page * size,
        take: size,
      }),
      this.prisma.cuentaCobro.count({ where }),
    ]);

    const totalPaginas = Math.ceil(totalElementos / size);
    const data = cuentas.map((c) => ({
      idPago: Number(c.id),
      ticket: c.ticket,
      contrato: c.contrato.consecutivo,
      descripcionContrato: c.contrato.descripcion,
      codigoContrato: c.codigoContrato,
      codigoTercero: c.codigoTercero,
      estado: 'RADICADA',
      fechaInicio: c.fechaInicio,
      fechaFin: c.fechaFin,
      fechaSolicitud: c.fechaSolicitud?.toISOString() ?? null,
      valorCobrado: Number(c.valorCobrado),
    }));

    return {
      success: true,
      message: `Se encontraron ${totalElementos} cuenta(s) radicada(s)`,
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

  async aprobar(id: bigint, codigoTercero: string, usuarioNombre: string) {
    const cuenta = await this.prisma.cuentaCobro.findUniqueOrThrow({ where: { id } });

    if (cuenta.codigoTerceroSupervisor !== codigoTercero) {
      throw new ForbiddenException('No tienes permisos para aprobar esta cuenta de cobro');
    }

    if (cuenta.estado !== 'RADICADA') {
      throw new BadRequestException('Solo se puede aprobar una cuenta en estado RADICADA');
    }

    return this.prisma.$transaction(async (tx) => {
      const actualizada = await tx.cuentaCobro.update({
        where: { id },
        data: { estado: 'APROBADA_SUPERVISOR' },
      });
      await tx.historialEstado.create({
        data: {
          cuentaCobroId: id,
          estadoAnterior: 'RADICADA',
          estadoNuevo: 'APROBADA_SUPERVISOR',
          usuarioId: codigoTercero,
          usuarioNombre,
          observacion: 'Cuenta de cobro aprobada por el supervisor',
        },
      });
      return { ...actualizada, mensaje: 'Cuenta de cobro aprobada por el supervisor' };
    });
  }

  async rechazar(id: bigint, codigoTercero: string, usuarioNombre: string, observacion: string) {
    const cuenta = await this.prisma.cuentaCobro.findUniqueOrThrow({ where: { id } });

    if (cuenta.codigoTerceroSupervisor !== codigoTercero) {
      throw new ForbiddenException('No tienes permisos para rechazar esta cuenta de cobro');
    }

    if (cuenta.estado !== 'RADICADA') {
      throw new BadRequestException('Solo se puede rechazar una cuenta en estado RADICADA');
    }

    return this.prisma.$transaction(async (tx) => {
      const actualizada = await tx.cuentaCobro.update({
        where: { id },
        data: { estado: 'DEVUELTA_CONTRATISTA', observaciones: observacion },
      });
      await tx.historialEstado.create({
        data: {
          cuentaCobroId: id,
          estadoAnterior: 'RADICADA',
          estadoNuevo: 'DEVUELTA_CONTRATISTA',
          usuarioId: codigoTercero,
          usuarioNombre,
          observacion,
        },
      });
      return { ...actualizada, mensaje: 'Cuenta de cobro devuelta al contratista' };
    });
  }
}
