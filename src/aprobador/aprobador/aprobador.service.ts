import { BadRequestException, ForbiddenException, Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma/prisma.service';
import { ListarCuentasAprobadorDto } from '../dto/listar-cuentas-aprobador.dto';

const ESTADOS_REVISION_APROBADOR = ['APROBADA_SUPERVISOR', 'EN_REVISION_APROBADOR'] as const;

@Injectable()
export class AprobadorService {
  constructor(private readonly prisma: PrismaService) {}

  async listarParaAprobacion(codigoTerceroAprobador: string, dto: ListarCuentasAprobadorDto) {
    const page = dto.page ?? 0;
    const size = dto.size ?? 10;

    const where = {
      codigoTerceroAprobador,
      estado: { in: [...ESTADOS_REVISION_APROBADOR] },
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
      codigoTerceroSupervisor: c.codigoTerceroSupervisor,
      estado: c.estado,
      fechaInicio: c.fechaInicio,
      fechaFin: c.fechaFin,
      fechaSolicitud: c.fechaSolicitud?.toISOString() ?? null,
      valorCobrado: Number(c.valorCobrado),
    }));

    return {
      success: true,
      message: `Se encontraron ${totalElementos} cuenta(s) pendiente(s) de aprobación`,
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

    if (cuenta.codigoTerceroAprobador !== codigoTercero) {
      throw new ForbiddenException('No tienes permisos para aprobar esta cuenta de cobro');
    }

    if (cuenta.estado !== 'EN_REVISION_APROBADOR') {
      throw new BadRequestException('Solo se puede aprobar una cuenta en estado EN_REVISION_APROBADOR');
    }

    return this.prisma.$transaction(async (tx) => {
      const actualizada = await tx.cuentaCobro.update({
        where: { id },
        data: { estado: 'APROBADA_FINAL' },
      });
      await tx.historialEstado.create({
        data: {
          cuentaCobroId: id,
          estadoAnterior: 'EN_REVISION_APROBADOR',
          estadoNuevo: 'APROBADA_FINAL',
          usuarioId: codigoTercero,
          usuarioNombre,
          observacion: 'Cuenta de cobro aprobada definitivamente por el aprobador',
        },
      });
      return { ...actualizada, mensaje: 'Cuenta de cobro aprobada definitivamente' };
    });
  }

  async rechazar(id: bigint, codigoTercero: string, usuarioNombre: string, observacion: string) {
    const cuenta = await this.prisma.cuentaCobro.findUniqueOrThrow({ where: { id } });

    if (cuenta.codigoTerceroAprobador !== codigoTercero) {
      throw new ForbiddenException('No tienes permisos para rechazar esta cuenta de cobro');
    }

    if (!ESTADOS_REVISION_APROBADOR.includes(cuenta.estado as any)) {
      throw new BadRequestException('Solo se puede rechazar una cuenta en estado APROBADA_SUPERVISOR o EN_REVISION_APROBADOR');
    }

    return this.prisma.$transaction(async (tx) => {
      const actualizada = await tx.cuentaCobro.update({
        where: { id },
        data: { estado: 'RECHAZADA_APROBADOR', observaciones: observacion },
      });
      await tx.historialEstado.create({
        data: {
          cuentaCobroId: id,
          estadoAnterior: cuenta.estado,
          estadoNuevo: 'RECHAZADA_APROBADOR',
          usuarioId: codigoTercero,
          usuarioNombre,
          observacion,
        },
      });
      return { ...actualizada, mensaje: 'Cuenta de cobro rechazada por el aprobador' };
    });
  }

  // ─── Revisión por Secciones ───────────────────────────────────────────────

  private async validarPermisoSeccionAprobador(id: bigint, codigoTercero: string) {
    const cuenta = await this.prisma.cuentaCobro.findUniqueOrThrow({ where: { id } });
    if (cuenta.codigoTerceroAprobador !== codigoTercero) {
      throw new ForbiddenException('No tienes permisos para revisar esta cuenta de cobro');
    }
    if (!ESTADOS_REVISION_APROBADOR.includes(cuenta.estado as any)) {
      throw new BadRequestException('Solo se pueden revisar secciones de una cuenta en estado APROBADA_SUPERVISOR o EN_REVISION_APROBADOR');
    }
    return cuenta;
  }

  private async activarRevisionAprobador(tx: any, id: bigint, codigoTercero: string, usuarioNombre: string, estadoActual: string) {
    if (estadoActual === 'APROBADA_SUPERVISOR') {
      await tx.cuentaCobro.update({
        where: { id },
        data: { estado: 'EN_REVISION_APROBADOR' },
      });
      await tx.historialEstado.create({
        data: {
          cuentaCobroId: id,
          estadoAnterior: 'APROBADA_SUPERVISOR',
          estadoNuevo: 'EN_REVISION_APROBADOR',
          usuarioId: codigoTercero,
          usuarioNombre,
          observacion: 'El aprobador inició la revisión de la cuenta',
        },
      });
    }
  }

  private async verificarTodasSeccionesAprobadas(tx: any, id: bigint): Promise<boolean> {
    const [actividadesPendientes, planilla, retencionesPendientes, gastosPendientes, ejecucion] = await Promise.all([
      tx.actividad.count({ where: { cuentaCobroId: id, estadoRevisionAprobador: { not: 'APROBADO' } } }),
      tx.planilla.findUnique({ where: { cuentaCobroId: id } }),
      tx.checklistRetefuente.count({ where: { cuentaCobroId: id, estadoRevisionAprobador: { not: 'APROBADO' } } }),
      tx.otroGasto.count({ where: { cuentaCobroId: id, estadoRevisionAprobador: { not: 'APROBADO' } } }),
      tx.ejecucionFisica.findUnique({ where: { cuentaCobroId: id } }),
    ]);

    if (actividadesPendientes > 0 || retencionesPendientes > 0 || gastosPendientes > 0) {
      return false;
    }
    if (planilla && planilla.estadoRevisionAprobador !== 'APROBADO') {
      return false;
    }
    if (ejecucion && ejecucion.estadoRevisionAprobador !== 'APROBADO') {
      return false;
    }
    return true;
  }

  private async liquidarSiCorresponde(tx: any, id: bigint, codigoTercero: string, usuarioNombre: string): Promise<boolean> {
    const todasAprobadas = await this.verificarTodasSeccionesAprobadas(tx, id);
    if (!todasAprobadas) {
      return false;
    }

    await tx.cuentaCobro.update({
      where: { id },
      data: { estado: 'LIQUIDADA' },
    });
    await tx.historialEstado.create({
      data: {
        cuentaCobroId: id,
        estadoAnterior: 'EN_REVISION_APROBADOR',
        estadoNuevo: 'LIQUIDADA',
        usuarioId: codigoTercero,
        usuarioNombre,
        observacion: 'Cuenta de cobro liquidada automáticamente al aprobar todas las secciones',
      },
    });
    return true;
  }

  async aprobarSeccionInformeActividades(id: bigint, codigoTercero: string, usuarioNombre: string) {
    const cuenta = await this.validarPermisoSeccionAprobador(id, codigoTercero);
    return this.prisma.$transaction(async (tx) => {
      await this.activarRevisionAprobador(tx, id, codigoTercero, usuarioNombre, cuenta.estado);
      const result = await tx.actividad.updateMany({
        where: { cuentaCobroId: id },
        data: { estadoRevisionAprobador: 'APROBADO', observacionRevisionAprobador: null },
      });
      if (result.count === 0) {
        throw new BadRequestException('No hay actividades registradas en esta cuenta');
      }
      const cuentaLiquidada = await this.liquidarSiCorresponde(tx, id, codigoTercero, usuarioNombre);
      return { mensaje: 'Informe de actividades aprobado por el aprobador', seccion: 'INFORME_ACTIVIDADES', estado: 'APROBADO', cuentaLiquidada };
    });
  }

  async rechazarSeccionInformeActividades(id: bigint, codigoTercero: string, usuarioNombre: string, justificacion: string) {
    const cuenta = await this.validarPermisoSeccionAprobador(id, codigoTercero);
    return this.prisma.$transaction(async (tx) => {
      await this.activarRevisionAprobador(tx, id, codigoTercero, usuarioNombre, cuenta.estado);
      const result = await tx.actividad.updateMany({
        where: { cuentaCobroId: id },
        data: { estadoRevisionAprobador: 'RECHAZADO', observacionRevisionAprobador: justificacion },
      });
      if (result.count === 0) {
        throw new BadRequestException('No hay actividades registradas en esta cuenta');
      }
      return { mensaje: 'Informe de actividades rechazado por el aprobador', seccion: 'INFORME_ACTIVIDADES', estado: 'RECHAZADO', justificacion };
    });
  }

  async aprobarSeccionPlanilla(id: bigint, codigoTercero: string, usuarioNombre: string) {
    const cuenta = await this.validarPermisoSeccionAprobador(id, codigoTercero);
    const planilla = await this.prisma.planilla.findUnique({ where: { cuentaCobroId: id } });
    if (!planilla) {
      throw new BadRequestException('No hay planilla de seguridad social registrada en esta cuenta');
    }
    return this.prisma.$transaction(async (tx) => {
      await this.activarRevisionAprobador(tx, id, codigoTercero, usuarioNombre, cuenta.estado);
      await tx.planilla.update({
        where: { cuentaCobroId: id },
        data: { estadoRevisionAprobador: 'APROBADO', observacionRevisionAprobador: null },
      });
      return { mensaje: 'Pago de planilla aprobado por el aprobador', seccion: 'PLANILLA', estado: 'APROBADO' };
    });
  }

  async rechazarSeccionPlanilla(id: bigint, codigoTercero: string, usuarioNombre: string, justificacion: string) {
    const cuenta = await this.validarPermisoSeccionAprobador(id, codigoTercero);
    const planilla = await this.prisma.planilla.findUnique({ where: { cuentaCobroId: id } });
    if (!planilla) {
      throw new BadRequestException('No hay planilla de seguridad social registrada en esta cuenta');
    }
    return this.prisma.$transaction(async (tx) => {
      await this.activarRevisionAprobador(tx, id, codigoTercero, usuarioNombre, cuenta.estado);
      await tx.planilla.update({
        where: { cuentaCobroId: id },
        data: { estadoRevisionAprobador: 'RECHAZADO', observacionRevisionAprobador: justificacion },
      });
      return { mensaje: 'Pago de planilla rechazado por el aprobador', seccion: 'PLANILLA', estado: 'RECHAZADO', justificacion };
    });
  }

  async aprobarSeccionRetenciones(id: bigint, codigoTercero: string, usuarioNombre: string) {
    const cuenta = await this.validarPermisoSeccionAprobador(id, codigoTercero);
    return this.prisma.$transaction(async (tx) => {
      await this.activarRevisionAprobador(tx, id, codigoTercero, usuarioNombre, cuenta.estado);
      const result = await tx.checklistRetefuente.updateMany({
        where: { cuentaCobroId: id },
        data: { estadoRevisionAprobador: 'APROBADO', observacionRevisionAprobador: null },
      });
      if (result.count === 0) {
        throw new BadRequestException('No hay ítems de retenciones registrados en esta cuenta');
      }
      return { mensaje: 'Retenciones aprobadas por el aprobador', seccion: 'RETENCIONES', estado: 'APROBADO' };
    });
  }

  async rechazarSeccionRetenciones(id: bigint, codigoTercero: string, usuarioNombre: string, justificacion: string) {
    const cuenta = await this.validarPermisoSeccionAprobador(id, codigoTercero);
    return this.prisma.$transaction(async (tx) => {
      await this.activarRevisionAprobador(tx, id, codigoTercero, usuarioNombre, cuenta.estado);
      const result = await tx.checklistRetefuente.updateMany({
        where: { cuentaCobroId: id },
        data: { estadoRevisionAprobador: 'RECHAZADO', observacionRevisionAprobador: justificacion },
      });
      if (result.count === 0) {
        throw new BadRequestException('No hay ítems de retenciones registrados en esta cuenta');
      }
      return { mensaje: 'Retenciones rechazadas por el aprobador', seccion: 'RETENCIONES', estado: 'RECHAZADO', justificacion };
    });
  }

  async aprobarSeccionGastosAdicionales(id: bigint, codigoTercero: string, usuarioNombre: string) {
    const cuenta = await this.validarPermisoSeccionAprobador(id, codigoTercero);
    return this.prisma.$transaction(async (tx) => {
      await this.activarRevisionAprobador(tx, id, codigoTercero, usuarioNombre, cuenta.estado);
      const result = await tx.otroGasto.updateMany({
        where: { cuentaCobroId: id },
        data: { estadoRevisionAprobador: 'APROBADO', observacionRevisionAprobador: null },
      });
      if (result.count === 0) {
        throw new BadRequestException('No hay gastos adicionales registrados en esta cuenta');
      }
      return { mensaje: 'Gastos adicionales aprobados por el aprobador', seccion: 'GASTOS_ADICIONALES', estado: 'APROBADO' };
    });
  }

  async rechazarSeccionGastosAdicionales(id: bigint, codigoTercero: string, usuarioNombre: string, justificacion: string) {
    const cuenta = await this.validarPermisoSeccionAprobador(id, codigoTercero);
    return this.prisma.$transaction(async (tx) => {
      await this.activarRevisionAprobador(tx, id, codigoTercero, usuarioNombre, cuenta.estado);
      const result = await tx.otroGasto.updateMany({
        where: { cuentaCobroId: id },
        data: { estadoRevisionAprobador: 'RECHAZADO', observacionRevisionAprobador: justificacion },
      });
      if (result.count === 0) {
        throw new BadRequestException('No hay gastos adicionales registrados en esta cuenta');
      }
      return { mensaje: 'Gastos adicionales rechazados por el aprobador', seccion: 'GASTOS_ADICIONALES', estado: 'RECHAZADO', justificacion };
    });
  }

  async aprobarSeccionEjecucionFisica(id: bigint, codigoTercero: string, usuarioNombre: string) {
    const cuenta = await this.validarPermisoSeccionAprobador(id, codigoTercero);
    const ejecucion = await this.prisma.ejecucionFisica.findUnique({ where: { cuentaCobroId: id } });
    if (!ejecucion) {
      throw new BadRequestException('No hay ejecución física registrada en esta cuenta');
    }
    return this.prisma.$transaction(async (tx) => {
      await this.activarRevisionAprobador(tx, id, codigoTercero, usuarioNombre, cuenta.estado);
      await tx.ejecucionFisica.update({
        where: { cuentaCobroId: id },
        data: { estadoRevisionAprobador: 'APROBADO', observacionRevisionAprobador: null },
      });
      return { mensaje: 'Ejecución física aprobada por el aprobador', seccion: 'EJECUCION_FISICA', estado: 'APROBADO' };
    });
  }

  async rechazarSeccionEjecucionFisica(id: bigint, codigoTercero: string, usuarioNombre: string, justificacion: string) {
    const cuenta = await this.validarPermisoSeccionAprobador(id, codigoTercero);
    const ejecucion = await this.prisma.ejecucionFisica.findUnique({ where: { cuentaCobroId: id } });
    if (!ejecucion) {
      throw new BadRequestException('No hay ejecución física registrada en esta cuenta');
    }
    return this.prisma.$transaction(async (tx) => {
      await this.activarRevisionAprobador(tx, id, codigoTercero, usuarioNombre, cuenta.estado);
      await tx.ejecucionFisica.update({
        where: { cuentaCobroId: id },
        data: { estadoRevisionAprobador: 'RECHAZADO', observacionRevisionAprobador: justificacion },
      });
      return { mensaje: 'Ejecución física rechazada por el aprobador', seccion: 'EJECUCION_FISICA', estado: 'RECHAZADO', justificacion };
    });
  }
}
