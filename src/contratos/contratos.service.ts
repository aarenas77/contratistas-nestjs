import { Injectable, NotFoundException } from '@nestjs/common';
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

  async obtenerSupervisor(codigoContrato: number) {
    const contrato = await this.prisma.contrato.findUnique({
      where: { codigoContrato },
      select: { idSupervisor: true },
    });

    if (!contrato) {
      throw new NotFoundException('Contrato no encontrado');
    }

    const sinSupervisor = {
      success: false,
      message:
        'El contrato no tiene un supervisor asociado. Comuníquese con el administrador.',
      data: null,
      timestamp: new Date().toISOString(),
    };

    if (!contrato.idSupervisor) {
      return sinSupervisor;
    }

    const supervisor = await this.prisma.usuario.findFirst({
      where: { codigoTercero: contrato.idSupervisor, rol: 'SUPERVISOR' },
      select: { nombre: true, codigoTercero: true },
    });

    if (!supervisor) {
      return sinSupervisor;
    }

    return {
      success: true,
      message: 'Supervisor encontrado',
      data: {
        nombreSupervisor: supervisor.nombre,
        codigoTerceroSupervisor: supervisor.codigoTercero,
      },
      timestamp: new Date().toISOString(),
    };
  }
}
