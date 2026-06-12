import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException } from '@nestjs/common';
import { PlanillaService } from './planilla.service';
import { PrismaService } from '../../prisma/prisma/prisma.service';

describe('PlanillaService', () => {
  let service: PlanillaService;
  let prisma: {
    cuentaCobro: {
      findUnique: jest.Mock;
    };
    planilla: {
      findUnique: jest.Mock;
      upsert: jest.Mock;
      update: jest.Mock;
    };
  };

  beforeEach(async () => {
    prisma = {
      cuentaCobro: {
        findUnique: jest.fn(),
      },
      planilla: {
        findUnique: jest.fn(),
        upsert: jest.fn(),
        update: jest.fn(),
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [PlanillaService, { provide: PrismaService, useValue: prisma }],
    }).compile();

    service = module.get<PlanillaService>(PlanillaService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('genera un mock de PagoSimple y persiste el PIN', async () => {
    prisma.cuentaCobro.findUnique.mockResolvedValue({
      codigoTercero: 'T-001',
      estado: 'BORRADOR',
      valorCobrado: 5000000,
    });
    prisma.planilla.findUnique.mockResolvedValue(null);
    prisma.planilla.upsert.mockResolvedValue({
      id: BigInt(1),
      numeroPlanilla: 'PS-1-1718123123',
      urlPago: 'https://mock.pagosimple.local/pago?pin=834729123',
      estadoPago: 'PENDIENTE',
      pinPagoSimple: '834729123',
      pinExpiraAt: new Date('2026-06-11T12:15:00.000Z'),
      intentosPagoSimple: 0,
      ultimaConfirmacionAt: null,
      ingresoBaseCotizacion: 2000000,
      aporteSalud: 250000,
      aportePension: 320000,
      aporteArl: 10440,
      valorPagado: 580440,
    });

    const result = await service.generarPagoSimpleMock(BigInt(1), 'T-001', {
      cedula: '123456789',
      nombre: 'Juan Perez',
      ingresoBaseCotizacion: 2000000,
    });

    expect(prisma.planilla.upsert).toHaveBeenCalled();
    expect(result.pin).toMatch(/^\d{9}$/);
    expect(result.urlPago).toContain('mock.pagosimple.local');
    expect(result.urlConfirmacionMock).toBe('/planilla/1/pagosimple/mock-confirmacion');
  });

  it('confirma un pago mock con el PIN correcto', async () => {
    prisma.cuentaCobro.findUnique.mockResolvedValue({
      codigoTercero: 'T-001',
      estado: 'BORRADOR',
      valorCobrado: 5000000,
    });
    prisma.planilla.findUnique.mockResolvedValue({
      id: BigInt(1),
      pinPagoSimple: '834729123',
      pinExpiraAt: new Date(Date.now() + 60_000),
      estadoPago: 'PENDIENTE',
    });
    prisma.planilla.update.mockResolvedValue({
      id: BigInt(1),
      estadoPago: 'PAGADA',
    });

    const result = await service.confirmarPagoSimpleMock(BigInt(1), 'T-001', {
      pin: '834729123',
    });

    expect(prisma.planilla.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { cuentaCobroId: BigInt(1) },
        data: expect.objectContaining({
          estadoPago: 'PAGADA',
        }),
      }),
    );
    expect(result.estadoPago).toBe('PAGADA');
  });

  it('incrementa intentos y rechaza un PIN invalido', async () => {
    prisma.cuentaCobro.findUnique.mockResolvedValue({
      codigoTercero: 'T-001',
      estado: 'BORRADOR',
      valorCobrado: 5000000,
    });
    prisma.planilla.findUnique.mockResolvedValue({
      id: BigInt(1),
      pinPagoSimple: '834729123',
      pinExpiraAt: new Date(Date.now() + 60_000),
      estadoPago: 'PENDIENTE',
    });
    prisma.planilla.update.mockResolvedValue({});

    await expect(
      service.confirmarPagoSimpleMock(BigInt(1), 'T-001', { pin: '111111111' }),
    ).rejects.toBeInstanceOf(BadRequestException);

    expect(prisma.planilla.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { cuentaCobroId: BigInt(1) },
        data: expect.objectContaining({
          intentosPagoSimple: { increment: 1 },
        }),
      }),
    );
  });
});
