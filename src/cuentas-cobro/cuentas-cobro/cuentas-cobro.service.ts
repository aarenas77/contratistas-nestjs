import { Injectable } from '@nestjs/common';
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

  async findOne(id: bigint) {
    return this.prisma.cuentaCobro.findUniqueOrThrow({
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
  }
}
