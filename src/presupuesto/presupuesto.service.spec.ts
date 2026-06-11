import { NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { PresupuestoService } from './presupuesto.service';
import { PrismaService } from '../prisma/prisma/prisma.service';
import { PRESUPUESTO_GATEWAY } from './presupuesto.gateway';
import { PrecargarDto } from './dto/precargar.dto';

const tx = {
  precargaTercero: { upsert: jest.fn() },
  contrato: { upsert: jest.fn() },
  cuentaCobro: { deleteMany: jest.fn(), createMany: jest.fn() },
};

const mockPrisma = {
  $transaction: jest.fn(),
  contrato: { findMany: jest.fn() },
};

const mockGateway = {
  obtenerTerceroPorIdentificacion: jest.fn(),
};

const dto: PrecargarDto = {
  numeroIdentificacion: '1036662102',
  tipoIdentificacion: 'CC',
  codigoTercero: '123456',
  nombre: 'Brandel Otero',
  contratos: [
    {
      codigoContrato: 39492,
      codigoTercero: '123456',
      consecutivo: 'CO-2026-001',
      descripcion: 'Mantenimiento de equipos',
      valor: 60000000,
      totalPago: 60000000,
      estado: 'A',
      fechaElaboracion: '2026-01-01',
      fechaAprobacion: '2026-01-15',
      fechaRegistro: '2026-01-02',
      fechaInicioSecop: '2026-01-01',
      fechaFin: '2026-12-31',
      tipoPlazo: 'D',
      plazoDias: 365,
      consecutivoCompromiso: 1,
      estadoCompromiso: 'A',
      numeroActaInicioString: 12,
      saldoDisponibleOtrosGastos: 0,
      idSupervisor: 'SUP-001',
      codigoDependencia: 11,
      codigoMempresa: 9999999999,
      cuentas: [
        {
          idPago: 1,
          ticket: 1,
          contrato: 'CO-2026-001',
          codigoContrato: 39492,
          codigoTercero: '123456',
          codigoTerceroSupervisor: 'SUP-001',
          codigoTerceroAprobador: 'APR-001',
          idEstado: 0,
          estado: 'BORRADOR',
          fechaInicio: '2026-01-01',
          fechaFin: '2026-01-31',
          fechaSolicitud: '2026-01-05T12:00:00.000Z',
          valorSolicitud: 5000000,
          disponibleParaRadicar: true,
        },
      ],
    },
  ],
};

describe('PresupuestoService', () => {
  let service: PresupuestoService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PresupuestoService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: PRESUPUESTO_GATEWAY, useValue: mockGateway },
      ],
    }).compile();

    service = module.get(PresupuestoService);
    jest.clearAllMocks();
    mockPrisma.$transaction.mockImplementation(
      (cb: (prismaTx: typeof tx) => unknown) => cb(tx),
    );
  });

  describe('precargar', () => {
    it('hace upsert de la precarga del tercero por numeroIdentificacion', async () => {
      await service.precargar(dto);

      expect(tx.precargaTercero.upsert).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { numeroIdentificacion: '1036662102' },
          create: expect.objectContaining({
            numeroIdentificacion: '1036662102',
            codigoTercero: '123456',
            nombre: 'Brandel Otero',
            tipoIdentificacion: 'CC',
          }),
          update: expect.objectContaining({ codigoTercero: '123456' }),
        }),
      );
    });

    it('hace upsert del contrato con el codigoTercero del tercero', async () => {
      await service.precargar(dto);

      expect(tx.contrato.upsert).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { codigoContrato: 39492 },
          create: expect.objectContaining({
            codigoContrato: 39492,
            consecutivo: 'CO-2026-001',
            descripcion: 'Mantenimiento de equipos',
            codigoTercero: '123456',
          }),
        }),
      );
    });

    it('reemplaza las cuentas del contrato y las crea en estado BORRADOR (idempotente)', async () => {
      await service.precargar(dto);

      expect(tx.cuentaCobro.deleteMany).toHaveBeenCalledWith({
        where: { codigoContrato: 39492 },
      });
      expect(tx.cuentaCobro.createMany).toHaveBeenCalledWith({
        data: [
          expect.objectContaining({
            codigoContrato: 39492,
            codigoTercero: '123456',
            estado: 'BORRADOR',
            codigoTerceroSupervisor: 'SUP-001',
            codigoTerceroAprobador: 'APR-001',
            fechaSolicitud: new Date('2026-01-05T12:00:00.000Z'),
            valorCobrado: 5000000,
          }),
        ],
      });
    });

    it('mapea los campos extendidos del contrato y la cuenta sin perder compatibilidad', async () => {
      await service.precargar(dto);

      expect(tx.contrato.upsert).toHaveBeenCalledWith(
        expect.objectContaining({
          create: expect.objectContaining({
            codigoTercero: '123456',
            estado: 'A',
            fechaAprobacion: new Date('2026-01-15'),
            fechaInicioSecop: new Date('2026-01-01'),
            tipoPlazo: 'D',
            numeroActaInicio: 12,
            saldoDisponibleOtrosGastos: 0,
            codigoDependencia: 11,
            codigoMempresa: BigInt(9999999999),
          }),
        }),
      );

      expect(tx.cuentaCobro.createMany).toHaveBeenCalledWith(
        expect.objectContaining({
          data: [
            expect.objectContaining({
              codigoTerceroSupervisor: 'SUP-001',
              codigoTerceroAprobador: 'APR-001',
              fechaSolicitud: new Date('2026-01-05T12:00:00.000Z'),
              valorCobrado: 5000000,
            }),
          ],
        }),
      );
    });
  });

  describe('consultarTercero', () => {
    it('devuelve el tercero y sus contratos cuando está precargado', async () => {
      mockGateway.obtenerTerceroPorIdentificacion.mockResolvedValue({
        codigoTercero: '123456',
        nombre: 'Brandel Otero',
      });
      mockPrisma.contrato.findMany.mockResolvedValue([
        {
          codigoContrato: 39492,
          consecutivo: 'CO-2026-001',
          descripcion: 'Mantenimiento de equipos',
        },
      ]);

      const result = await service.consultarTercero('1036662102');

      expect(result.codigoTercero).toBe('123456');
      expect(result.nombre).toBe('Brandel Otero');
      expect(result.contratos).toHaveLength(1);
      expect(mockPrisma.contrato.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: { codigoTercero: '123456' } }),
      );
    });

    it('lanza NotFoundException cuando la cédula no está precargada', async () => {
      mockGateway.obtenerTerceroPorIdentificacion.mockResolvedValue(null);

      await expect(service.consultarTercero('9999999')).rejects.toBeInstanceOf(
        NotFoundException,
      );
    });
  });
});
