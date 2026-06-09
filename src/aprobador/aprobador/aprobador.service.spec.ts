import { Test, TestingModule } from '@nestjs/testing';
import { AprobadorService } from './aprobador.service';
import { PrismaService } from '../../prisma/prisma/prisma.service';

const mockPrismaService = {
  cuentaCobro: {
    findMany: jest.fn(),
    count: jest.fn(),
  },
};

describe('AprobadorService', () => {
  let service: AprobadorService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AprobadorService,
        { provide: PrismaService, useValue: mockPrismaService },
      ],
    }).compile();

    service = module.get<AprobadorService>(AprobadorService);
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('listarParaAprobacion', () => {
    const dto = { page: 0, size: 10 };

    it('filtra por estado APROBADA_SUPERVISOR', async () => {
      mockPrismaService.cuentaCobro.findMany.mockResolvedValue([]);
      mockPrismaService.cuentaCobro.count.mockResolvedValue(0);

      await service.listarParaAprobacion(dto);

      expect(mockPrismaService.cuentaCobro.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ estado: 'APROBADA_SUPERVISOR' }),
        }),
      );
    });

    it('aplica filtro codigoContrato cuando se proporciona', async () => {
      mockPrismaService.cuentaCobro.findMany.mockResolvedValue([]);
      mockPrismaService.cuentaCobro.count.mockResolvedValue(0);

      await service.listarParaAprobacion({ ...dto, codigoContrato: 39492 });

      expect(mockPrismaService.cuentaCobro.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ codigoContrato: 39492 }),
        }),
      );
    });

    it('usa page=0 y size=10 por defecto', async () => {
      mockPrismaService.cuentaCobro.findMany.mockResolvedValue([]);
      mockPrismaService.cuentaCobro.count.mockResolvedValue(0);

      await service.listarParaAprobacion({});

      expect(mockPrismaService.cuentaCobro.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ skip: 0, take: 10 }),
      );
    });

    it('aplica paginacion correctamente con page=1 y size=5', async () => {
      mockPrismaService.cuentaCobro.findMany.mockResolvedValue([]);
      mockPrismaService.cuentaCobro.count.mockResolvedValue(0);

      await service.listarParaAprobacion({ page: 1, size: 5 });

      expect(mockPrismaService.cuentaCobro.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ skip: 5, take: 5 }),
      );
    });

    it('retorna estructura de respuesta paginada correcta', async () => {
      const cuentaMock = {
        id: BigInt(1),
        ticket: 101,
        codigoContrato: 39492,
        codigoTercero: 'TER001',
        codigoTerceroSupervisor: 'SUP001',
        estado: 'APROBADA_SUPERVISOR',
        fechaInicio: new Date('2025-01-01'),
        fechaFin: new Date('2025-01-31'),
        fechaSolicitud: new Date('2025-01-15'),
        valorCobrado: 1500000,
        contrato: { consecutivo: 'CON-001', descripcion: 'Contrato de servicios' },
      };

      mockPrismaService.cuentaCobro.findMany.mockResolvedValue([cuentaMock]);
      mockPrismaService.cuentaCobro.count.mockResolvedValue(1);

      const result = await service.listarParaAprobacion(dto);

      expect(result.success).toBe(true);
      expect(result.totalElementos).toBe(1);
      expect(result.paginaActual).toBe(0);
      expect(result.tamañoPagina).toBe(10);
      expect(result.totalElementosPagina).toBe(1);
      expect(result.totalPaginas).toBe(1);
      expect(result.primera).toBe(true);
      expect(result.ultima).toBe(true);
      expect(result.data).toHaveLength(1);
      expect(result.data[0]).toMatchObject({
        idPago: 1,
        ticket: 101,
        codigoContrato: 39492,
        estado: 'APROBADA_SUPERVISOR',
      });
      expect(result.timestamp).toBeDefined();
    });

    it('mapea idPago como Number del BigInt id', async () => {
      const cuentaMock = {
        id: BigInt(999),
        ticket: 200,
        codigoContrato: 12345,
        codigoTercero: 'TER002',
        codigoTerceroSupervisor: 'SUP002',
        estado: 'APROBADA_SUPERVISOR',
        fechaInicio: new Date('2025-02-01'),
        fechaFin: new Date('2025-02-28'),
        fechaSolicitud: new Date('2025-02-10'),
        valorCobrado: 2000000,
        contrato: { consecutivo: 'CON-002', descripcion: 'Otro contrato' },
      };

      mockPrismaService.cuentaCobro.findMany.mockResolvedValue([cuentaMock]);
      mockPrismaService.cuentaCobro.count.mockResolvedValue(1);

      const result = await service.listarParaAprobacion(dto);

      expect(result.data[0].idPago).toBe(999);
      expect(typeof result.data[0].idPago).toBe('number');
    });

    it('calcula primera=false cuando page > 0', async () => {
      mockPrismaService.cuentaCobro.findMany.mockResolvedValue([]);
      mockPrismaService.cuentaCobro.count.mockResolvedValue(15);

      const result = await service.listarParaAprobacion({ page: 1, size: 10 });

      expect(result.primera).toBe(false);
    });

    it('el mensaje incluye el total de cuentas encontradas', async () => {
      mockPrismaService.cuentaCobro.findMany.mockResolvedValue([]);
      mockPrismaService.cuentaCobro.count.mockResolvedValue(7);

      const result = await service.listarParaAprobacion(dto);

      expect(result.message).toContain('7');
    });
  });
});
