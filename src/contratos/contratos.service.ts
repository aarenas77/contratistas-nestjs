import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma/prisma.service';
import { ListarContratosDto } from './dto/listar-contratos.dto';

@Injectable()
export class ContratosService {
  constructor(private readonly prisma: PrismaService) {}

  async listar(codigoTercero: string, dto: ListarContratosDto) {
    const page = dto.page ?? 0;
    const size = dto.size ?? 10;

    const [contratos, totalElements] = await Promise.all([
      this.prisma.contrato.findMany({
        where: { codigoTercero },
        orderBy: { fechaElaboracion: 'desc' },
        skip: page * size,
        take: size,
      }),
      this.prisma.contrato.count({ where: { codigoTercero } }),
    ]);

    const content = contratos.map((c) => ({
      codigoContrato: c.codigoContrato,
      consecutivo: c.consecutivo,
      descripcion: c.descripcion,
      codigoTercero: Number(c.codigoTercero),
      valor: Number(c.valor),
      totalPago: Number(c.totalPago),
      estado: c.estado,
      fechaElaboracion: c.fechaElaboracion?.toISOString().split('T')[0] ?? null,
      fechaAprobacion: c.fechaAprobacion?.toISOString().split('T')[0] ?? null,
      fechaFin: c.fechaFin?.toISOString().split('T')[0] ?? null,
      fechaRegistro: c.fechaRegistro?.toISOString().split('T')[0] ?? null,
      fechaInicioSecop: c.fechaInicioSecop?.toISOString().split('T')[0] ?? null,
      plazoDias: c.plazoDias,
      tipoPlazo: c.tipoPlazo,
      consecutivoCompromiso: c.consecutivoCompromiso,
      estadoCompromiso: c.estadoCompromiso,
      numeroActaInicioString: c.numeroActaInicio,
      saldoDisponibleOtrosGastos: Number(c.saldoDisponibleOtrosGastos),
      idSupervisor: c.idSupervisor,
      codigoDependencia: c.codigoDependencia,
      codigoMempresa: Number(c.codigoMempresa),
    }));

    return {
      response: {
        length: 1,
        statusCode: 0,
        body: {
          size,
          number: page,
          numberOfElements: content.length,
          totalElements,
          totalPages: Math.ceil(totalElements / size),
          content,
        },
      },
    };
  }
}
