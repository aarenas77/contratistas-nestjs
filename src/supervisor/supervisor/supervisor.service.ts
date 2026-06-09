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

  // ─── Revisión por Secciones ───────────────────────────────────────────────

  private async validarPermisoSeccion(id: bigint, codigoTercero: string) {
    const cuenta = await this.prisma.cuentaCobro.findUniqueOrThrow({ where: { id } });
    if (cuenta.codigoTerceroSupervisor !== codigoTercero) {
      throw new ForbiddenException('No tienes permisos para revisar esta cuenta de cobro');
    }
    if (cuenta.estado !== 'RADICADA') {
      throw new BadRequestException('Solo se pueden revisar secciones de una cuenta en estado RADICADA');
    }
    return cuenta;
  }

  async aprobarSeccionInformeActividades(id: bigint, codigoTercero: string) {
    await this.validarPermisoSeccion(id, codigoTercero);
    const result = await this.prisma.actividad.updateMany({
      where: { cuentaCobroId: id },
      data: { estadoRevision: 'APROBADO', observacionRevision: null },
    });
    if (result.count === 0) {
      throw new BadRequestException('No hay actividades registradas en esta cuenta');
    }
    return { mensaje: 'Informe de actividades aprobado', seccion: 'INFORME_ACTIVIDADES', estado: 'APROBADO' };
  }

  async rechazarSeccionInformeActividades(id: bigint, codigoTercero: string, justificacion: string) {
    await this.validarPermisoSeccion(id, codigoTercero);
    const result = await this.prisma.actividad.updateMany({
      where: { cuentaCobroId: id },
      data: { estadoRevision: 'RECHAZADO', observacionRevision: justificacion },
    });
    if (result.count === 0) {
      throw new BadRequestException('No hay actividades registradas en esta cuenta');
    }
    return { mensaje: 'Informe de actividades rechazado', seccion: 'INFORME_ACTIVIDADES', estado: 'RECHAZADO', justificacion };
  }

  async aprobarSeccionPlanilla(id: bigint, codigoTercero: string) {
    await this.validarPermisoSeccion(id, codigoTercero);
    const planilla = await this.prisma.planilla.findUnique({ where: { cuentaCobroId: id } });
    if (!planilla) {
      throw new BadRequestException('No hay planilla de seguridad social registrada en esta cuenta');
    }
    await this.prisma.planilla.update({
      where: { cuentaCobroId: id },
      data: { estadoRevision: 'APROBADO', observacionRevision: null },
    });
    return { mensaje: 'Pago de planilla aprobado', seccion: 'PLANILLA', estado: 'APROBADO' };
  }

  async rechazarSeccionPlanilla(id: bigint, codigoTercero: string, justificacion: string) {
    await this.validarPermisoSeccion(id, codigoTercero);
    const planilla = await this.prisma.planilla.findUnique({ where: { cuentaCobroId: id } });
    if (!planilla) {
      throw new BadRequestException('No hay planilla de seguridad social registrada en esta cuenta');
    }
    await this.prisma.planilla.update({
      where: { cuentaCobroId: id },
      data: { estadoRevision: 'RECHAZADO', observacionRevision: justificacion },
    });
    return { mensaje: 'Pago de planilla rechazado', seccion: 'PLANILLA', estado: 'RECHAZADO', justificacion };
  }

  async aprobarSeccionRetenciones(id: bigint, codigoTercero: string) {
    await this.validarPermisoSeccion(id, codigoTercero);
    const result = await this.prisma.checklistRetefuente.updateMany({
      where: { cuentaCobroId: id },
      data: { estadoRevision: 'APROBADO', observacionRevision: null },
    });
    if (result.count === 0) {
      throw new BadRequestException('No hay ítems de retenciones registrados en esta cuenta');
    }
    return { mensaje: 'Retenciones aprobadas', seccion: 'RETENCIONES', estado: 'APROBADO' };
  }

  async rechazarSeccionRetenciones(id: bigint, codigoTercero: string, justificacion: string) {
    await this.validarPermisoSeccion(id, codigoTercero);
    const result = await this.prisma.checklistRetefuente.updateMany({
      where: { cuentaCobroId: id },
      data: { estadoRevision: 'RECHAZADO', observacionRevision: justificacion },
    });
    if (result.count === 0) {
      throw new BadRequestException('No hay ítems de retenciones registrados en esta cuenta');
    }
    return { mensaje: 'Retenciones rechazadas', seccion: 'RETENCIONES', estado: 'RECHAZADO', justificacion };
  }

  async aprobarSeccionGastosAdicionales(id: bigint, codigoTercero: string) {
    await this.validarPermisoSeccion(id, codigoTercero);
    const result = await this.prisma.otroGasto.updateMany({
      where: { cuentaCobroId: id },
      data: { estadoRevision: 'APROBADO', observacionRevision: null },
    });
    if (result.count === 0) {
      throw new BadRequestException('No hay gastos adicionales registrados en esta cuenta');
    }
    return { mensaje: 'Gastos adicionales aprobados', seccion: 'GASTOS_ADICIONALES', estado: 'APROBADO' };
  }

  async rechazarSeccionGastosAdicionales(id: bigint, codigoTercero: string, justificacion: string) {
    await this.validarPermisoSeccion(id, codigoTercero);
    const result = await this.prisma.otroGasto.updateMany({
      where: { cuentaCobroId: id },
      data: { estadoRevision: 'RECHAZADO', observacionRevision: justificacion },
    });
    if (result.count === 0) {
      throw new BadRequestException('No hay gastos adicionales registrados en esta cuenta');
    }
    return { mensaje: 'Gastos adicionales rechazados', seccion: 'GASTOS_ADICIONALES', estado: 'RECHAZADO', justificacion };
  }

  async aprobarSeccionEjecucionFisica(id: bigint, codigoTercero: string) {
    await this.validarPermisoSeccion(id, codigoTercero);
    const ejecucion = await this.prisma.ejecucionFisica.findUnique({ where: { cuentaCobroId: id } });
    if (!ejecucion) {
      throw new BadRequestException('No hay ejecución física registrada en esta cuenta');
    }
    await this.prisma.ejecucionFisica.update({
      where: { cuentaCobroId: id },
      data: { estadoRevision: 'APROBADO', observacionRevision: null },
    });
    return { mensaje: 'Ejecución física aprobada', seccion: 'EJECUCION_FISICA', estado: 'APROBADO' };
  }

  async rechazarSeccionEjecucionFisica(id: bigint, codigoTercero: string, justificacion: string) {
    await this.validarPermisoSeccion(id, codigoTercero);
    const ejecucion = await this.prisma.ejecucionFisica.findUnique({ where: { cuentaCobroId: id } });
    if (!ejecucion) {
      throw new BadRequestException('No hay ejecución física registrada en esta cuenta');
    }
    await this.prisma.ejecucionFisica.update({
      where: { cuentaCobroId: id },
      data: { estadoRevision: 'RECHAZADO', observacionRevision: justificacion },
    });
    return { mensaje: 'Ejecución física rechazada', seccion: 'EJECUCION_FISICA', estado: 'RECHAZADO', justificacion };
  }
}
