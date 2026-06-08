import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma/prisma.service';
import { CrearGastoDto } from '../dto/crear-gasto.dto';

@Injectable()
export class GastosService {
  constructor(private readonly prisma: PrismaService) {}

  async listar(cuentaCobroId: bigint, codigoTercero: string) {
    await this.verificarPropietario(cuentaCobroId, codigoTercero);
    return this.prisma.otroGasto.findMany({
      where: { cuentaCobroId },
      include: {
        adjuntos: {
          select: {
            id: true,
            nombre: true,
            mimeType: true,
            tamanioBytes: true,
            createdAt: true,
            // NO incluir "datos" para no pesar la respuesta
          },
        },
      },
      orderBy: { fecha: 'desc' },
    });
  }

  async crear(
    cuentaCobroId: bigint,
    dto: CrearGastoDto,
    file: Express.Multer.File,
    codigoTercero: string,
  ) {
    const cuenta = await this.verificarPropietario(cuentaCobroId, codigoTercero);
    if (cuenta.estado !== 'BORRADOR') {
      throw new BadRequestException('Solo se pueden agregar gastos cuando la cuenta está en BORRADOR');
    }
    return this.prisma.$transaction(async (tx) => {
      const gasto = await tx.otroGasto.create({
        data: {
          cuentaCobroId,
          codigoConcepto: dto.codigoConcepto,
          valor: dto.valor,
          fecha: new Date(dto.fecha),
          observacion: dto.observacion,
        },
      });
      const adjunto = await tx.adjunto.create({
        data: {
          cuentaCobroId,
          gastoId: gasto.id,
          nombre: file.originalname,
          mimeType: file.mimetype,
          tamanioBytes: file.size,
          datos: file.buffer as unknown as Uint8Array<ArrayBuffer>,
        },
      });
      return {
        ...gasto,
        adjunto: { id: Number(adjunto.id), nombre: adjunto.nombre, mimeType: adjunto.mimeType },
      };
    });
  }

  async eliminar(gastoId: bigint, codigoTercero: string) {
    const gasto = await this.prisma.otroGasto.findUnique({
      where: { id: gastoId },
      include: { cuentaCobro: { select: { codigoTercero: true, estado: true } } },
    });
    if (!gasto) throw new NotFoundException('Gasto no encontrado');
    if (gasto.cuentaCobro.codigoTercero !== codigoTercero) throw new ForbiddenException();
    if (gasto.cuentaCobro.estado !== 'BORRADOR') {
      throw new BadRequestException('Solo se pueden eliminar gastos cuando la cuenta está en BORRADOR');
    }
    await this.prisma.$transaction([
      this.prisma.adjunto.deleteMany({ where: { gastoId } }),
      this.prisma.otroGasto.delete({ where: { id: gastoId } }),
    ]);
  }

  async getAdjunto(adjuntoId: bigint, codigoTercero: string) {
    const adjunto = await this.prisma.adjunto.findUnique({
      where: { id: adjuntoId },
      include: { cuentaCobro: { select: { codigoTercero: true } } },
    });
    if (!adjunto) throw new NotFoundException('Adjunto no encontrado');
    if (adjunto.cuentaCobro.codigoTercero !== codigoTercero) throw new ForbiddenException();
    return adjunto;
  }

  private async verificarPropietario(cuentaCobroId: bigint, codigoTercero: string) {
    const cuenta = await this.prisma.cuentaCobro.findUnique({
      where: { id: cuentaCobroId },
      select: { codigoTercero: true, estado: true },
    });
    if (!cuenta) throw new NotFoundException('Cuenta de cobro no encontrada');
    if (cuenta.codigoTercero !== codigoTercero) throw new ForbiddenException();
    return cuenta;
  }
}
