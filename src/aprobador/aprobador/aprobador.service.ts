import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma/prisma.service';
import { ListarCuentasAprobadorDto } from '../dto/listar-cuentas-aprobador.dto';

@Injectable()
export class AprobadorService {
  constructor(private readonly prisma: PrismaService) {}

  async listarParaAprobacion(dto: ListarCuentasAprobadorDto) {
    const page = dto.page ?? 0;
    const size = dto.size ?? 10;

    const where = {
      estado: 'APROBADA_SUPERVISOR' as const,
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
      estado: 'APROBADA_SUPERVISOR',
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
}
