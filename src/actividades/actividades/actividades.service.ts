import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma/prisma.service';
import { CrearActividadDto } from '../dto/crear-actividad.dto';
import { Rol } from '../../auth/interfaces/jwt-payload.interface';

@Injectable()
export class ActividadesService {
  constructor(private readonly prisma: PrismaService) {}

  async listar(cuentaCobroId: bigint, codigoTercero: string, rol: Rol) {
    await this.verificarAcceso(cuentaCobroId, codigoTercero, rol);
    return this.prisma.actividad.findMany({
      where: { cuentaCobroId },
      include: {
        adjuntos: {
          select: {
            id: true,
            nombre: true,
            mimeType: true,
            tamanioBytes: true,
            createdAt: true,
            // IMPORTANTE: NO incluir "datos" aquí para no pesar la respuesta
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async crear(
    cuentaCobroId: bigint,
    dto: CrearActividadDto,
    file: Express.Multer.File,
    codigoTercero: string,
  ) {
    const cuenta = await this.verificarPropietario(cuentaCobroId, codigoTercero);
    if (cuenta.estado !== 'BORRADOR') {
      throw new BadRequestException(
        'Solo se pueden agregar actividades cuando la cuenta está en BORRADOR',
      );
    }
    return this.prisma.$transaction(async (tx) => {
      const actividad = await tx.actividad.create({
        data: {
          cuentaCobroId,
          descripcion: dto.descripcion,
          fechaActividad: new Date(dto.fechaActividad),
        },
      });
      const adjunto = await tx.adjunto.create({
        data: {
          cuentaCobroId,
          actividadId: actividad.id,
          nombre: file.originalname,
          mimeType: file.mimetype,
          tamanioBytes: file.size,
          datos: file.buffer as unknown as Uint8Array<ArrayBuffer>,
        },
      });
      return {
        ...actividad,
        adjunto: { id: Number(adjunto.id), nombre: adjunto.nombre, mimeType: adjunto.mimeType },
      };
    });
  }

  async eliminar(actividadId: bigint, codigoTercero: string) {
    const actividad = await this.prisma.actividad.findUnique({
      where: { id: actividadId },
      include: { cuentaCobro: { select: { codigoTercero: true, estado: true } } },
    });
    if (!actividad) throw new NotFoundException('Actividad no encontrada');
    if (actividad.cuentaCobro.codigoTercero !== codigoTercero) throw new ForbiddenException();
    if (actividad.cuentaCobro.estado !== 'BORRADOR') {
      throw new BadRequestException(
        'Solo se pueden eliminar actividades cuando la cuenta está en BORRADOR',
      );
    }
    await this.prisma.$transaction([
      this.prisma.adjunto.deleteMany({ where: { actividadId } }),
      this.prisma.actividad.delete({ where: { id: actividadId } }),
    ]);
  }

  async getAdjunto(adjuntoId: bigint, codigoTercero: string, rol: Rol) {
    const adjunto = await this.prisma.adjunto.findUnique({
      where: { id: adjuntoId },
      include: { cuentaCobro: { select: { codigoTercero: true, codigoTerceroSupervisor: true, codigoTerceroAprobador: true } } },
    });
    if (!adjunto) throw new NotFoundException('Adjunto no encontrado');
    let propietarioAdjunto: string | null;
    if (rol === Rol.SUPERVISOR) propietarioAdjunto = adjunto.cuentaCobro.codigoTerceroSupervisor;
    else if (rol === Rol.APROBADOR) propietarioAdjunto = adjunto.cuentaCobro.codigoTerceroAprobador;
    else propietarioAdjunto = adjunto.cuentaCobro.codigoTercero;
    if (propietarioAdjunto !== codigoTercero) throw new ForbiddenException();
    return adjunto;
  }

  private async verificarAcceso(cuentaCobroId: bigint, codigoTercero: string, rol: Rol) {
    const cuenta = await this.prisma.cuentaCobro.findUnique({
      where: { id: cuentaCobroId },
      select: { codigoTercero: true, codigoTerceroSupervisor: true, codigoTerceroAprobador: true, estado: true },
    });
    if (!cuenta) throw new NotFoundException('Cuenta de cobro no encontrada');
    let propietario: string | null;
    if (rol === Rol.SUPERVISOR) propietario = cuenta.codigoTerceroSupervisor;
    else if (rol === Rol.APROBADOR) propietario = cuenta.codigoTerceroAprobador;
    else propietario = cuenta.codigoTercero;
    if (propietario !== codigoTercero) throw new ForbiddenException();
    return cuenta;
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
