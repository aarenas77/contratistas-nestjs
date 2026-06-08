import { Injectable } from '@nestjs/common';
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
}
