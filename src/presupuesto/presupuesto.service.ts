import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { EstadoCuentaCobro } from '@prisma/client';
import { PrismaService } from '../prisma/prisma/prisma.service';
import { PRESUPUESTO_GATEWAY } from './presupuesto.gateway';
import type { PresupuestoGateway } from './presupuesto.gateway';
import { PrecargaContratoDto, PrecargarDto } from './dto/precargar.dto';

@Injectable()
export class PresupuestoService {
  constructor(
    private readonly prisma: PrismaService,
    @Inject(PRESUPUESTO_GATEWAY)
    private readonly gateway: PresupuestoGateway,
  ) {}

  /**
   * Carga (o reemplaza) la precarga de un tercero junto con sus contratos y las
   * cuentas de cobro shell. Simula lo que entregaría el módulo de presupuesto.
   * Idempotente: re-cargar la misma cédula actualiza en vez de duplicar.
   */
  async precargar(dto: PrecargarDto) {
    return this.prisma.$transaction(async (tx) => {
      await tx.precargaTercero.upsert({
        where: { numeroIdentificacion: dto.numeroIdentificacion },
        create: {
          numeroIdentificacion: dto.numeroIdentificacion,
          tipoIdentificacion: dto.tipoIdentificacion ?? null,
          codigoTercero: dto.codigoTercero,
          nombre: dto.nombre ?? null,
        },
        update: {
          tipoIdentificacion: dto.tipoIdentificacion ?? null,
          codigoTercero: dto.codigoTercero,
          nombre: dto.nombre ?? null,
        },
      });

      for (const contrato of dto.contratos) {
        const data = this.datosContrato(contrato, dto.codigoTercero);
        await tx.contrato.upsert({
          where: { codigoContrato: contrato.codigoContrato },
          create: data,
          update: data,
        });

        // Reemplaza las cuentas shell del contrato para mantener idempotencia.
        await tx.cuentaCobro.deleteMany({
          where: { codigoContrato: contrato.codigoContrato },
        });
        await tx.cuentaCobro.createMany({
          data: contrato.cuentas.map((cuenta) => ({
            codigoContrato: contrato.codigoContrato,
            codigoTercero: cuenta.codigoTercero ?? dto.codigoTercero,
            codigoTerceroSupervisor: cuenta.codigoTerceroSupervisor ?? null,
            codigoTerceroAprobador: cuenta.codigoTerceroAprobador ?? null,
            estado: this.estadoCuenta(cuenta.estado),
            fechaSolicitud: this.parseDateOrNull(cuenta.fechaSolicitud),
            fechaInicio: new Date(cuenta.fechaInicio),
            fechaFin: new Date(cuenta.fechaFin),
            valorCobrado: cuenta.valorSolicitud ?? cuenta.valorCobrado ?? 0,
          })),
        });
      }

      return {
        numeroIdentificacion: dto.numeroIdentificacion,
        codigoTercero: dto.codigoTercero,
      };
    });
  }

  /** Devuelve el tercero (vía gateway) y sus contratos, para el preview del registro. */
  async consultarTercero(numeroIdentificacion: string) {
    const tercero =
      await this.gateway.obtenerTerceroPorIdentificacion(numeroIdentificacion);
    if (!tercero) {
      throw new NotFoundException(
        'No existe precarga de presupuesto para esa identificación.',
      );
    }

    const contratos = await this.prisma.contrato.findMany({
      where: { codigoTercero: tercero.codigoTercero },
      orderBy: { fechaElaboracion: 'desc' },
    });

    return {
      codigoTercero: tercero.codigoTercero,
      nombre: tercero.nombre,
      contratos: contratos.map((c) => ({
        codigoContrato: c.codigoContrato,
        consecutivo: c.consecutivo,
        descripcion: c.descripcion,
        valor: Number(c.valor),
      })),
    };
  }

  /** Mapea el DTO de contrato a la fila de `contratos`, rellenando defaults razonables. */
  private datosContrato(contrato: PrecargaContratoDto, codigoTercero: string) {
    const hoy = new Date();
    return {
      codigoContrato: contrato.codigoContrato,
      consecutivo: contrato.consecutivo,
      descripcion: contrato.descripcion,
      codigoTercero: contrato.codigoTercero ?? codigoTercero,
      valor: contrato.valor,
      totalPago: contrato.totalPago ?? contrato.valor,
      estado: contrato.estado ?? 'A',
      fechaElaboracion: contrato.fechaElaboracion
        ? new Date(contrato.fechaElaboracion)
        : hoy,
      fechaAprobacion: this.parseDateOrNull(contrato.fechaAprobacion),
      fechaRegistro: contrato.fechaRegistro
        ? new Date(contrato.fechaRegistro)
        : hoy,
      fechaInicioSecop: this.parseDateOrNull(contrato.fechaInicioSecop),
      fechaFin: contrato.fechaFin ? new Date(contrato.fechaFin) : null,
      tipoPlazo: contrato.tipoPlazo ?? 'D',
      plazoDias: contrato.plazoDias ?? 0,
      consecutivoCompromiso: contrato.consecutivoCompromiso ?? 0,
      estadoCompromiso: contrato.estadoCompromiso ?? 'A',
      numeroActaInicio: contrato.numeroActaInicioString ?? null,
      saldoDisponibleOtrosGastos: contrato.saldoDisponibleOtrosGastos ?? 0,
      idSupervisor: contrato.idSupervisor ?? null,
      codigoDependencia: contrato.codigoDependencia ?? null,
      codigoMempresa: contrato.codigoMempresa
        ? BigInt(contrato.codigoMempresa)
        : undefined,
    };
  }

  private parseDateOrNull(value?: string | null) {
    return value ? new Date(value) : null;
  }

  private estadoCuenta(value?: string): EstadoCuentaCobro {
    if (!value) {
      return 'BORRADOR';
    }

    if (value === 'PENDIENTE' || value === 'INACTIVA') {
      return 'BORRADOR';
    }

    return value as EstadoCuentaCobro;
  }
}
