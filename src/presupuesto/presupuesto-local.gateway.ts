import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma/prisma.service';
import { PresupuestoGateway, TerceroPresupuesto } from './presupuesto.gateway';

/**
 * Implementación temporal del gateway que resuelve el tercero contra la tabla
 * local `precarga_terceros`, simulando lo que entregaría el módulo de presupuesto.
 */
@Injectable()
export class PresupuestoLocalGateway implements PresupuestoGateway {
  constructor(private readonly prisma: PrismaService) {}

  async obtenerTerceroPorIdentificacion(
    numeroIdentificacion: string,
  ): Promise<TerceroPresupuesto | null> {
    const row = await this.prisma.precargaTercero.findUnique({
      where: { numeroIdentificacion },
      select: { codigoTercero: true, nombre: true },
    });
    return row
      ? { codigoTercero: row.codigoTercero, nombre: row.nombre }
      : null;
  }
}
