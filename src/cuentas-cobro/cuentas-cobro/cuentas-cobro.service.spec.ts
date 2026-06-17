import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException } from '@nestjs/common';
import { CuentasCobroService } from './cuentas-cobro.service';
import { PrismaService } from '../../prisma/prisma/prisma.service';

const mockPrismaService = {
  cuentaCobro: { findUniqueOrThrow: jest.fn() },
  actividad: { updateMany: jest.fn() },
  planilla: { updateMany: jest.fn() },
  checklistRetefuente: { updateMany: jest.fn() },
  otroGasto: { updateMany: jest.fn() },
  ejecucionFisica: { updateMany: jest.fn() },
  $transaction: jest.fn(),
};

describe('CuentasCobroService', () => {
  let service: CuentasCobroService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CuentasCobroService,
        { provide: PrismaService, useValue: mockPrismaService },
      ],
    }).compile();

    service = module.get<CuentasCobroService>(CuentasCobroService);
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('radicar', () => {
    const id = BigInt(1);
    const codigoTercero = 'CON001';
    const usuarioNombre = 'Ana Contratista';

    const ayer = new Date();
    ayer.setDate(ayer.getDate() - 10);
    const anteayer = new Date();
    anteayer.setDate(anteayer.getDate() - 20);

    // Cuenta devuelta cuyo período ya venció: la subsanación debe permitirse igual.
    const cuentaDevuelta = {
      id,
      estado: 'DEVUELTA_CONTRATISTA',
      codigoTercero,
      fechaInicio: anteayer,
      fechaFin: ayer,
      actividades: [{ id: BigInt(1) }],
      planilla: { id: BigInt(1) },
      checklistItems: Array.from({ length: 6 }, () => ({ kaNlCumple: true })),
    };

    function mockTransaction() {
      const txCuentaUpdate = jest.fn().mockResolvedValue({ ...cuentaDevuelta, estado: 'RADICADA' });
      const txHistorialCreate = jest.fn().mockResolvedValue({});
      const txActividadUpdate = jest.fn().mockResolvedValue({});
      const txPlanillaUpdate = jest.fn().mockResolvedValue({});
      const txChecklistUpdate = jest.fn().mockResolvedValue({});
      const txGastoUpdate = jest.fn().mockResolvedValue({});
      const txEjecucionUpdate = jest.fn().mockResolvedValue({});
      mockPrismaService.$transaction.mockImplementation(async (cb) =>
        cb({
          actividad: { updateMany: txActividadUpdate },
          planilla: { updateMany: txPlanillaUpdate },
          checklistRetefuente: { updateMany: txChecklistUpdate },
          otroGasto: { updateMany: txGastoUpdate },
          ejecucionFisica: { updateMany: txEjecucionUpdate },
          cuentaCobro: { update: txCuentaUpdate },
          historialEstado: { create: txHistorialCreate },
        }),
      );
      return { txCuentaUpdate, txHistorialCreate, txActividadUpdate };
    }

    it('lanza BadRequestException si el estado no es BORRADOR ni DEVUELTA_CONTRATISTA', async () => {
      mockPrismaService.cuentaCobro.findUniqueOrThrow.mockResolvedValue({
        ...cuentaDevuelta,
        estado: 'RADICADA',
      });

      await expect(service.radicar(id, codigoTercero, usuarioNombre)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('re-radica desde DEVUELTA aunque el período haya vencido y resetea solo las secciones rechazadas', async () => {
      mockPrismaService.cuentaCobro.findUniqueOrThrow.mockResolvedValue(cuentaDevuelta);
      const { txActividadUpdate, txHistorialCreate } = mockTransaction();

      const result = await service.radicar(id, codigoTercero, usuarioNombre);

      expect(result.estado).toBe('RADICADA');
      // Solo se reinician las filas RECHAZADO
      expect(txActividadUpdate).toHaveBeenCalledWith({
        where: { cuentaCobroId: id, estadoRevision: 'RECHAZADO' },
        data: { estadoRevision: 'PENDIENTE', observacionRevision: null },
      });
      expect(txHistorialCreate).toHaveBeenCalledWith({
        data: expect.objectContaining({
          estadoAnterior: 'DEVUELTA_CONTRATISTA',
          estadoNuevo: 'RADICADA',
        }),
      });
    });
  });
});
