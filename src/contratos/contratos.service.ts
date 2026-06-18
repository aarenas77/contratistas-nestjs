import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma/prisma.service';
import { ListarContratosDto } from './dto/listar-contratos.dto';
import { ListarContratosAdminDto } from './dto/listar-contratos-admin.dto';
import { CreateContratoDto } from './dto/create-contrato.dto';
import { UpdateContratoDto } from './dto/update-contrato.dto';

type Contrato = Prisma.ContratoGetPayload<{}>;

@Injectable()
export class ContratosService {
  constructor(private readonly prisma: PrismaService) {}

  async listar(codigoTercero: string, dto: ListarContratosDto) {
    const page = dto.page ?? 0;
    const size = dto.size ?? 10;

    const where: Prisma.ContratoWhereInput = {
      codigoTercero,
      estado: { not: 'I' },
    };

    const [contratos, totalElements] = await Promise.all([
      this.prisma.contrato.findMany({
        where,
        orderBy: { fechaElaboracion: 'desc' },
        skip: page * size,
        take: size,
      }),
      this.prisma.contrato.count({ where }),
    ]);

    return this.respuestaPaginada(contratos, totalElements, page, size);
  }

  async listarTodos(dto: ListarContratosAdminDto) {
    const page = dto.page ?? 0;
    const size = dto.size ?? 10;

    const where: Prisma.ContratoWhereInput = {};
    if (dto.codigoTercero) where.codigoTercero = dto.codigoTercero;
    if (dto.estado) where.estado = dto.estado;

    const [contratos, totalElements] = await Promise.all([
      this.prisma.contrato.findMany({
        where,
        orderBy: { fechaElaboracion: 'desc' },
        skip: page * size,
        take: size,
      }),
      this.prisma.contrato.count({ where }),
    ]);

    return this.respuestaPaginada(contratos, totalElements, page, size);
  }

  async crear(dto: CreateContratoDto) {
    const codigoContrato = await this.siguienteCodigoContrato();

    const contrato = await this.prisma.contrato.create({
      data: {
        codigoContrato,
        consecutivo: dto.consecutivo,
        descripcion: dto.descripcion,
        codigoTercero: dto.codigoTercero,
        valor: dto.valor,
        totalPago: dto.valor,
        estado: 'A',
        estadoCompromiso: 'ELABORADO',
        fechaElaboracion: new Date(dto.fechaElaboracion),
        fechaRegistro: new Date(),
        fechaFin: dto.fechaFin ? new Date(dto.fechaFin) : null,
        fechaAprobacion: dto.fechaAprobacion ? new Date(dto.fechaAprobacion) : null,
        fechaInicioSecop: dto.fechaInicioSecop ? new Date(dto.fechaInicioSecop) : null,
        plazoDias: dto.plazoDias,
        tipoPlazo: dto.tipoPlazo,
        consecutivoCompromiso: dto.consecutivoCompromiso,
        codigoDependencia: dto.codigoDependencia ?? null,
        idSupervisor: dto.idSupervisor ?? null,
      },
    });

    return this.mapContrato(contrato);
  }

  async actualizar(codigoContrato: number, dto: UpdateContratoDto) {
    await this.obtenerOFallar(codigoContrato);

    const data: Prisma.ContratoUpdateInput = {};
    if (dto.consecutivo !== undefined) data.consecutivo = dto.consecutivo;
    if (dto.descripcion !== undefined) data.descripcion = dto.descripcion;
    if (dto.codigoTercero !== undefined) data.codigoTercero = dto.codigoTercero;
    if (dto.valor !== undefined) {
      data.valor = dto.valor;
      data.totalPago = dto.valor;
    }
    if (dto.plazoDias !== undefined) data.plazoDias = dto.plazoDias;
    if (dto.tipoPlazo !== undefined) data.tipoPlazo = dto.tipoPlazo;
    if (dto.consecutivoCompromiso !== undefined)
      data.consecutivoCompromiso = dto.consecutivoCompromiso;
    if (dto.codigoDependencia !== undefined)
      data.codigoDependencia = dto.codigoDependencia;
    if (dto.idSupervisor !== undefined) data.idSupervisor = dto.idSupervisor;
    if (dto.fechaElaboracion !== undefined)
      data.fechaElaboracion = new Date(dto.fechaElaboracion);
    if (dto.fechaFin !== undefined)
      data.fechaFin = dto.fechaFin ? new Date(dto.fechaFin) : null;
    if (dto.fechaAprobacion !== undefined)
      data.fechaAprobacion = dto.fechaAprobacion ? new Date(dto.fechaAprobacion) : null;
    if (dto.fechaInicioSecop !== undefined)
      data.fechaInicioSecop = dto.fechaInicioSecop ? new Date(dto.fechaInicioSecop) : null;

    const contrato = await this.prisma.contrato.update({
      where: { codigoContrato },
      data,
    });

    return this.mapContrato(contrato);
  }

  async eliminar(codigoContrato: number) {
    await this.obtenerOFallar(codigoContrato);

    await this.prisma.contrato.update({
      where: { codigoContrato },
      data: { estado: 'I' },
    });

    return {
      success: true,
      message: 'Contrato eliminado (inactivado) correctamente',
      codigoContrato,
    };
  }

  async clonar(codigoContrato: number) {
    const origen = await this.obtenerOFallar(codigoContrato);
    const nuevoCodigo = await this.siguienteCodigoContrato();

    const contrato = await this.prisma.contrato.create({
      data: {
        codigoContrato: nuevoCodigo,
        consecutivo: `${origen.consecutivo} (COPIA)`,
        descripcion: `[COPIA] ${origen.descripcion}`,
        codigoTercero: origen.codigoTercero,
        valor: origen.valor,
        totalPago: origen.totalPago,
        estado: 'A',
        estadoCompromiso: 'ELABORADO',
        fechaElaboracion: origen.fechaElaboracion,
        fechaRegistro: new Date(),
        fechaFin: origen.fechaFin,
        fechaAprobacion: null,
        fechaInicioSecop: origen.fechaInicioSecop,
        plazoDias: origen.plazoDias,
        tipoPlazo: origen.tipoPlazo,
        consecutivoCompromiso: origen.consecutivoCompromiso,
        numeroActaInicio: origen.numeroActaInicio,
        saldoDisponibleOtrosGastos: origen.saldoDisponibleOtrosGastos,
        idSupervisor: origen.idSupervisor,
        codigoDependencia: origen.codigoDependencia,
        codigoMempresa: origen.codigoMempresa,
      },
    });

    return this.mapContrato(contrato);
  }

  async listarContratistas() {
    const contratistas = await this.prisma.usuario.findMany({
      where: { rol: 'CONTRATISTA', activo: true },
      orderBy: { nombre: 'asc' },
      select: { codigoTercero: true, nombre: true, userIdentification: true },
    });

    return {
      success: true,
      data: contratistas,
      timestamp: new Date().toISOString(),
    };
  }

  tiposPlazo() {
    return {
      success: true,
      data: [
        { value: 'D', label: 'Días' },
        { value: 'M', label: 'Meses' },
        { value: 'A', label: 'Años' },
      ],
      timestamp: new Date().toISOString(),
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

  private async obtenerOFallar(codigoContrato: number): Promise<Contrato> {
    const contrato = await this.prisma.contrato.findUnique({
      where: { codigoContrato },
    });
    if (!contrato) {
      throw new NotFoundException('Contrato no encontrado');
    }
    return contrato;
  }

  private async siguienteCodigoContrato(): Promise<number> {
    const agregado = await this.prisma.contrato.aggregate({
      _max: { codigoContrato: true },
    });
    return (agregado._max.codigoContrato ?? 0) + 1;
  }

  private mapContrato(c: Contrato) {
    return {
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
    };
  }

  private respuestaPaginada(
    contratos: Contrato[],
    totalElements: number,
    page: number,
    size: number,
  ) {
    const content = contratos.map((c) => this.mapContrato(c));

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
