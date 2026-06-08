import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { Rol } from '../../auth/interfaces/jwt-payload.interface';
import { PrismaService } from '../../prisma/prisma/prisma.service';
import { ActualizarChecklistDto } from '../dto/actualizar-checklist.dto';

const ITEMS_CHECKLIST = [
  { idChecklist: 1, nombre: 'No he contratado o vinculado dos (2) o más trabajadores.' },
  { idChecklist: 2, nombre: 'Tengo dependiente de ley 1607/2012 para efectos de deducción de retención en la fuente a título de renta. (Parag 2 artículo 378 E.T), anexo soportes según ley' },
  { idChecklist: 3, nombre: 'Realicé pagos de intereses en préstamo para adquisición de vivienda del año inmediatamente anterior, anexo certificado bancario.' },
  { idChecklist: 4, nombre: 'Realicé pagos por medicina prepagada o póliza de seguros, anexo certificado' },
  { idChecklist: 5, nombre: 'Realicé los pagos obligatorios al sistema general de seguridad social, anexo plantilla' },
  { idChecklist: 6, nombre: 'Para efectos de depuración de la base aplicable para retención por industria y comercio, manifiesto bajo gravedad de juramento que ejerzo una profesión liberal.' },
];

@Injectable()
export class ChecklistRetefuenteService {
  constructor(private readonly prisma: PrismaService) {}

  async obtener(cuentaCobroId: bigint, codigoTercero: string, rol: string) {
    const cuenta = await this.prisma.cuentaCobro.findUnique({
      where: { id: cuentaCobroId },
      select: { codigoTercero: true, codigoTerceroSupervisor: true },
    });
    if (!cuenta) throw new NotFoundException('Cuenta de cobro no encontrada');
    if (rol === Rol.SUPERVISOR) {
      if (!cuenta.codigoTerceroSupervisor || cuenta.codigoTerceroSupervisor !== codigoTercero) {
        throw new ForbiddenException('No tienes permisos para acceder a esta cuenta');
      }
    } else {
      if (cuenta.codigoTercero !== codigoTercero) {
        throw new ForbiddenException('No tienes permisos para acceder a esta cuenta');
      }
    }

    await this.prisma.$transaction(async (tx) => {
      const existentes = await tx.checklistRetefuente.count({ where: { cuentaCobroId } });
      if (existentes === 0) {
        await tx.checklistRetefuente.createMany({
          data: ITEMS_CHECKLIST.map((item) => ({
            cuentaCobroId,
            idChecklist: item.idChecklist,
            nombre: item.nombre,
            kaNlCumple: null,
          })),
        });
      }
    });

    return this.prisma.checklistRetefuente.findMany({
      where: { cuentaCobroId },
      orderBy: { idChecklist: 'asc' },
    });
  }

  async actualizar(cuentaCobroId: bigint, dto: ActualizarChecklistDto, codigoTercero: string) {
    await this.verificarPropietario(cuentaCobroId, codigoTercero);
    await Promise.all(
      dto.respuestas.map((r) =>
        this.prisma.checklistRetefuente.updateMany({
          where: { cuentaCobroId, idChecklist: r.idChecklist },
          data: { kaNlCumple: r.kaNlCumple, observacion: r.observacion ?? null },
        }),
      ),
    );
    return this.prisma.checklistRetefuente.findMany({
      where: { cuentaCobroId },
      orderBy: { idChecklist: 'asc' },
    });
  }

  private async verificarPropietario(cuentaCobroId: bigint, codigoTercero: string) {
    const cuenta = await this.prisma.cuentaCobro.findUnique({
      where: { id: cuentaCobroId },
      select: { codigoTercero: true },
    });
    if (!cuenta) throw new NotFoundException('Cuenta de cobro no encontrada');
    if (cuenta.codigoTercero !== codigoTercero) throw new ForbiddenException('No tienes permisos para acceder a esta cuenta');
    return cuenta;
  }
}
