import {
  BadRequestException,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma/prisma.service';
import { ListarCuentasSupervisorDto } from '../dto/listar-cuentas-supervisor.dto';

const ESTADOS_REVISION_SUPERVISOR = [
  'RADICADA',
  'DEVUELTA_CONTRATISTA',
] as const;

@Injectable()
export class SupervisorService {
  constructor(private readonly prisma: PrismaService) {}

  async listarRadicadas(
    codigoTerceroSupervisor: string,
    dto: ListarCuentasSupervisorDto,
  ) {
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
        include: {
          contrato: { select: { consecutivo: true, descripcion: true } },
        },
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
      codigoTerceroAprobador: c.codigoTerceroAprobador
        ? Number(c.codigoTerceroAprobador)
        : null,
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
    const cuenta = await this.prisma.cuentaCobro.findUniqueOrThrow({
      where: { id },
    });

    if (cuenta.codigoTerceroSupervisor !== codigoTercero) {
      throw new ForbiddenException(
        'No tienes permisos para aprobar esta cuenta de cobro',
      );
    }

    if (cuenta.estado !== 'RADICADA') {
      throw new BadRequestException(
        'Solo se puede aprobar una cuenta en estado RADICADA',
      );
    }

    if (await this.tieneSeccionesRechazadas(id)) {
      throw new BadRequestException(
        'No se puede aprobar: hay secciones rechazadas. Debe completar el rechazo global.',
      );
    }

    const ejecucion = await this.prisma.ejecucionFisica.findUnique({
      where: { cuentaCobroId: id },
    });
    if (!ejecucion || ejecucion.porcentaje == null) {
      throw new BadRequestException(
        'Debe digitar el porcentaje de ejecución física antes de aprobar la cuenta de cobro',
      );
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
      return {
        ...actualizada,
        mensaje: 'Cuenta de cobro aprobada por el supervisor',
      };
    });
  }

  async rechazar(
    id: bigint,
    codigoTercero: string,
    usuarioNombre: string,
    observacion: string,
  ) {
    const cuenta = await this.prisma.cuentaCobro.findUniqueOrThrow({
      where: { id },
    });

    if (cuenta.codigoTerceroSupervisor !== codigoTercero) {
      throw new ForbiddenException(
        'No tienes permisos para rechazar esta cuenta de cobro',
      );
    }

    if (!ESTADOS_REVISION_SUPERVISOR.includes(cuenta.estado as any)) {
      throw new BadRequestException(
        'Solo se puede rechazar una cuenta RADICADA o en subsanación',
      );
    }

    return this.prisma.$transaction(async (tx) => {
      const actualizada = await tx.cuentaCobro.update({
        where: { id },
        data: { estado: 'DEVUELTA_CONTRATISTA', observaciones: observacion },
      });
      await tx.historialEstado.create({
        data: {
          cuentaCobroId: id,
          estadoAnterior: cuenta.estado,
          estadoNuevo: 'DEVUELTA_CONTRATISTA',
          usuarioId: codigoTercero,
          usuarioNombre,
          observacion,
        },
      });
      return {
        ...actualizada,
        mensaje: 'Cuenta de cobro devuelta al contratista',
      };
    });
  }

  // ─── Revisión por Secciones ───────────────────────────────────────────────

  private async validarPermisoSeccion(id: bigint, codigoTercero: string) {
    const cuenta = await this.prisma.cuentaCobro.findUniqueOrThrow({
      where: { id },
    });
    if (cuenta.codigoTerceroSupervisor !== codigoTercero) {
      throw new ForbiddenException(
        'No tienes permisos para revisar esta cuenta de cobro',
      );
    }
    if (!ESTADOS_REVISION_SUPERVISOR.includes(cuenta.estado as any)) {
      throw new BadRequestException(
        'Solo se pueden revisar secciones de una cuenta RADICADA o en subsanación',
      );
    }
    return cuenta;
  }

  /**
   * Si la cuenta aún está RADICADA, la devuelve de inmediato al contratista al
   * rechazarse una sección. En subsanación (DEVUELTA_CONTRATISTA) no duplica el
   * cambio de estado: el supervisor sigue rechazando/aprobando otras secciones.
   */
  private async marcarDevueltaSiAplica(
    tx: any,
    id: bigint,
    codigoTercero: string,
    usuarioNombre: string,
    estadoActual: string,
  ) {
    if (estadoActual === 'RADICADA') {
      await tx.cuentaCobro.update({
        where: { id },
        data: { estado: 'DEVUELTA_CONTRATISTA' },
      });
      await tx.historialEstado.create({
        data: {
          cuentaCobroId: id,
          estadoAnterior: 'RADICADA',
          estadoNuevo: 'DEVUELTA_CONTRATISTA',
          usuarioId: codigoTercero,
          usuarioNombre,
          observacion: 'Cuenta devuelta al contratista por rechazo de sección',
        },
      });
    }
  }

  private async tieneSeccionesRechazadas(id: bigint): Promise<boolean> {
    const [actividades, planilla, retenciones, gastos, ejecucion] =
      await Promise.all([
        this.prisma.actividad.count({
          where: { cuentaCobroId: id, estadoRevision: 'RECHAZADO' },
        }),
        this.prisma.planilla.count({
          where: { cuentaCobroId: id, estadoRevision: 'RECHAZADO' },
        }),
        this.prisma.checklistRetefuente.count({
          where: { cuentaCobroId: id, estadoRevision: 'RECHAZADO' },
        }),
        this.prisma.otroGasto.count({
          where: { cuentaCobroId: id, estadoRevision: 'RECHAZADO' },
        }),
        this.prisma.ejecucionFisica.count({
          where: { cuentaCobroId: id, estadoRevision: 'RECHAZADO' },
        }),
      ]);
    return actividades + planilla + retenciones + gastos + ejecucion > 0;
  }

  async aprobarSeccionInformeActividades(id: bigint, codigoTercero: string) {
    await this.validarPermisoSeccion(id, codigoTercero);
    const result = await this.prisma.actividad.updateMany({
      where: { cuentaCobroId: id },
      data: { estadoRevision: 'APROBADO', observacionRevision: null },
    });
    if (result.count === 0) {
      throw new BadRequestException(
        'No hay actividades registradas en esta cuenta',
      );
    }
    return {
      mensaje: 'Informe de actividades aprobado',
      seccion: 'INFORME_ACTIVIDADES',
      estado: 'APROBADO',
    };
  }

  async rechazarSeccionInformeActividades(
    id: bigint,
    codigoTercero: string,
    usuarioNombre: string,
    justificacion: string,
  ) {
    const cuenta = await this.validarPermisoSeccion(id, codigoTercero);
    const tieneActividades = await this.prisma.actividad.count({
      where: { cuentaCobroId: id },
    });
    if (tieneActividades === 0) {
      throw new BadRequestException(
        'No hay actividades registradas en esta cuenta',
      );
    }
    return this.prisma.$transaction(async (tx) => {
      await tx.actividad.updateMany({
        where: { cuentaCobroId: id },
        data: {
          estadoRevision: 'RECHAZADO',
          observacionRevision: justificacion,
        },
      });
      await this.marcarDevueltaSiAplica(
        tx,
        id,
        codigoTercero,
        usuarioNombre,
        cuenta.estado,
      );
      return {
        mensaje: 'Informe de actividades rechazado',
        seccion: 'INFORME_ACTIVIDADES',
        estado: 'RECHAZADO',
        justificacion,
      };
    });
  }

  async aprobarSeccionPlanilla(id: bigint, codigoTercero: string) {
    await this.validarPermisoSeccion(id, codigoTercero);
    const planilla = await this.prisma.planilla.findUnique({
      where: { cuentaCobroId: id },
    });
    if (!planilla) {
      throw new BadRequestException(
        'No hay planilla de seguridad social registrada en esta cuenta',
      );
    }
    await this.prisma.planilla.update({
      where: { cuentaCobroId: id },
      data: { estadoRevision: 'APROBADO', observacionRevision: null },
    });
    return {
      mensaje: 'Pago de planilla aprobado',
      seccion: 'PLANILLA',
      estado: 'APROBADO',
    };
  }

  async rechazarSeccionPlanilla(
    id: bigint,
    codigoTercero: string,
    usuarioNombre: string,
    justificacion: string,
  ) {
    const cuenta = await this.validarPermisoSeccion(id, codigoTercero);
    const planilla = await this.prisma.planilla.findUnique({
      where: { cuentaCobroId: id },
    });
    if (!planilla) {
      throw new BadRequestException(
        'No hay planilla de seguridad social registrada en esta cuenta',
      );
    }
    return this.prisma.$transaction(async (tx) => {
      await tx.planilla.update({
        where: { cuentaCobroId: id },
        data: {
          estadoRevision: 'RECHAZADO',
          observacionRevision: justificacion,
        },
      });
      await this.marcarDevueltaSiAplica(
        tx,
        id,
        codigoTercero,
        usuarioNombre,
        cuenta.estado,
      );
      return {
        mensaje: 'Pago de planilla rechazado',
        seccion: 'PLANILLA',
        estado: 'RECHAZADO',
        justificacion,
      };
    });
  }

  async aprobarSeccionRetenciones(id: bigint, codigoTercero: string) {
    await this.validarPermisoSeccion(id, codigoTercero);
    const result = await this.prisma.checklistRetefuente.updateMany({
      where: { cuentaCobroId: id },
      data: { estadoRevision: 'APROBADO', observacionRevision: null },
    });
    if (result.count === 0) {
      throw new BadRequestException(
        'No hay ítems de retenciones registrados en esta cuenta',
      );
    }
    return {
      mensaje: 'Retenciones aprobadas',
      seccion: 'RETENCIONES',
      estado: 'APROBADO',
    };
  }

  async rechazarSeccionRetenciones(
    id: bigint,
    codigoTercero: string,
    usuarioNombre: string,
    justificacion: string,
  ) {
    const cuenta = await this.validarPermisoSeccion(id, codigoTercero);
    const tieneItems = await this.prisma.checklistRetefuente.count({
      where: { cuentaCobroId: id },
    });
    if (tieneItems === 0) {
      throw new BadRequestException(
        'No hay ítems de retenciones registrados en esta cuenta',
      );
    }
    return this.prisma.$transaction(async (tx) => {
      await tx.checklistRetefuente.updateMany({
        where: { cuentaCobroId: id },
        data: {
          estadoRevision: 'RECHAZADO',
          observacionRevision: justificacion,
        },
      });
      await this.marcarDevueltaSiAplica(
        tx,
        id,
        codigoTercero,
        usuarioNombre,
        cuenta.estado,
      );
      return {
        mensaje: 'Retenciones rechazadas',
        seccion: 'RETENCIONES',
        estado: 'RECHAZADO',
        justificacion,
      };
    });
  }

  async aprobarSeccionGastosAdicionales(id: bigint, codigoTercero: string) {
    await this.validarPermisoSeccion(id, codigoTercero);
    const result = await this.prisma.otroGasto.updateMany({
      where: { cuentaCobroId: id },
      data: { estadoRevision: 'APROBADO', observacionRevision: null },
    });
    if (result.count === 0) {
      throw new BadRequestException(
        'No hay gastos adicionales registrados en esta cuenta',
      );
    }
    return {
      mensaje: 'Gastos adicionales aprobados',
      seccion: 'GASTOS_ADICIONALES',
      estado: 'APROBADO',
    };
  }

  async rechazarSeccionGastosAdicionales(
    id: bigint,
    codigoTercero: string,
    usuarioNombre: string,
    justificacion: string,
  ) {
    const cuenta = await this.validarPermisoSeccion(id, codigoTercero);
    const tieneGastos = await this.prisma.otroGasto.count({
      where: { cuentaCobroId: id },
    });
    if (tieneGastos === 0) {
      throw new BadRequestException(
        'No hay gastos adicionales registrados en esta cuenta',
      );
    }
    return this.prisma.$transaction(async (tx) => {
      await tx.otroGasto.updateMany({
        where: { cuentaCobroId: id },
        data: {
          estadoRevision: 'RECHAZADO',
          observacionRevision: justificacion,
        },
      });
      await this.marcarDevueltaSiAplica(
        tx,
        id,
        codigoTercero,
        usuarioNombre,
        cuenta.estado,
      );
      return {
        mensaje: 'Gastos adicionales rechazados',
        seccion: 'GASTOS_ADICIONALES',
        estado: 'RECHAZADO',
        justificacion,
      };
    });
  }

  async digitarEjecucionFisica(
    id: bigint,
    codigoTercero: string,
    porcentaje: number,
    justificacion: string,
  ) {
    await this.validarPermisoSeccion(id, codigoTercero);
    await this.prisma.ejecucionFisica.upsert({
      where: { cuentaCobroId: id },
      create: { cuentaCobroId: id, porcentaje, justificacion },
      update: { porcentaje, justificacion },
    });
    return {
      mensaje: 'Porcentaje de ejecución física registrado',
      seccion: 'EJECUCION_FISICA',
      porcentaje,
      justificacion,
    };
  }

  async aprobarSeccionEjecucionFisica(id: bigint, codigoTercero: string) {
    await this.validarPermisoSeccion(id, codigoTercero);
    const ejecucion = await this.prisma.ejecucionFisica.findUnique({
      where: { cuentaCobroId: id },
    });
    if (!ejecucion) {
      throw new BadRequestException(
        'No hay ejecución física registrada en esta cuenta',
      );
    }
    await this.prisma.ejecucionFisica.update({
      where: { cuentaCobroId: id },
      data: { estadoRevision: 'APROBADO', observacionRevision: null },
    });
    return {
      mensaje: 'Ejecución física aprobada',
      seccion: 'EJECUCION_FISICA',
      estado: 'APROBADO',
    };
  }

  async rechazarSeccionEjecucionFisica(
    id: bigint,
    codigoTercero: string,
    usuarioNombre: string,
    justificacion: string,
  ) {
    const cuenta = await this.validarPermisoSeccion(id, codigoTercero);
    const ejecucion = await this.prisma.ejecucionFisica.findUnique({
      where: { cuentaCobroId: id },
    });
    if (!ejecucion) {
      throw new BadRequestException(
        'No hay ejecución física registrada en esta cuenta',
      );
    }
    return this.prisma.$transaction(async (tx) => {
      await tx.ejecucionFisica.update({
        where: { cuentaCobroId: id },
        data: {
          estadoRevision: 'RECHAZADO',
          observacionRevision: justificacion,
        },
      });
      await this.marcarDevueltaSiAplica(
        tx,
        id,
        codigoTercero,
        usuarioNombre,
        cuenta.estado,
      );
      return {
        mensaje: 'Ejecución física rechazada',
        seccion: 'EJECUCION_FISICA',
        estado: 'RECHAZADO',
        justificacion,
      };
    });
  }
}
