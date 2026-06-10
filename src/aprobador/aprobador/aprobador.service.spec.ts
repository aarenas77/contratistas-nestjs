import { BadRequestException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { AprobadorService } from './aprobador.service';
import { PrismaService } from '../../prisma/prisma/prisma.service';

const mockPrismaService = {
  cuentaCobro: {
    findMany: jest.fn(),
    count: jest.fn(),
    findUniqueOrThrow: jest.fn(),
  },
  $transaction: jest.fn(),
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

    it('filtra por estados APROBADA_SUPERVISOR y EN_REVISION_APROBADOR', async () => {
      mockPrismaService.cuentaCobro.findMany.mockResolvedValue([]);
      mockPrismaService.cuentaCobro.count.mockResolvedValue(0);

      await service.listarParaAprobacion('APR001', dto);

      expect(mockPrismaService.cuentaCobro.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            estado: { in: ['APROBADA_SUPERVISOR', 'EN_REVISION_APROBADOR'] },
          }),
        }),
      );
    });

    it('aplica filtro codigoContrato cuando se proporciona', async () => {
      mockPrismaService.cuentaCobro.findMany.mockResolvedValue([]);
      mockPrismaService.cuentaCobro.count.mockResolvedValue(0);

      await service.listarParaAprobacion('APR001', { ...dto, codigoContrato: 39492 });

      expect(mockPrismaService.cuentaCobro.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ codigoContrato: 39492 }),
        }),
      );
    });

    it('usa page=0 y size=10 por defecto', async () => {
      mockPrismaService.cuentaCobro.findMany.mockResolvedValue([]);
      mockPrismaService.cuentaCobro.count.mockResolvedValue(0);

      await service.listarParaAprobacion('APR001', {});

      expect(mockPrismaService.cuentaCobro.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ skip: 0, take: 10 }),
      );
    });

    it('aplica paginacion correctamente con page=1 y size=5', async () => {
      mockPrismaService.cuentaCobro.findMany.mockResolvedValue([]);
      mockPrismaService.cuentaCobro.count.mockResolvedValue(0);

      await service.listarParaAprobacion('APR001', { page: 1, size: 5 });

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

      const result = await service.listarParaAprobacion('APR001', dto);

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

      const result = await service.listarParaAprobacion('APR001', dto);

      expect(result.data[0].idPago).toBe(999);
      expect(typeof result.data[0].idPago).toBe('number');
    });

    it('calcula primera=false cuando page > 0', async () => {
      mockPrismaService.cuentaCobro.findMany.mockResolvedValue([]);
      mockPrismaService.cuentaCobro.count.mockResolvedValue(15);

      const result = await service.listarParaAprobacion('APR001', { page: 1, size: 10 });

      expect(result.primera).toBe(false);
    });

    it('el mensaje incluye el total de cuentas encontradas', async () => {
      mockPrismaService.cuentaCobro.findMany.mockResolvedValue([]);
      mockPrismaService.cuentaCobro.count.mockResolvedValue(7);

      const result = await service.listarParaAprobacion('APR001', dto);

      expect(result.message).toContain('7');
    });
  });

  describe('aprobarSeccionInformeActividades', () => {
    const id = BigInt(10);
    const codigoTercero = 'APR001';
    const usuarioNombre = 'Ana Aprobadora';

    const cuentaEnRevision = {
      id,
      codigoTerceroAprobador: codigoTercero,
      estado: 'EN_REVISION_APROBADOR',
    };

    function buildTx(overrides: Record<string, any> = {}) {
      return {
        actividad: {
          updateMany: jest.fn().mockResolvedValue({ count: 1 }),
          count: jest.fn().mockResolvedValue(0),
        },
        planilla: { findUnique: jest.fn().mockResolvedValue(null) },
        checklistRetefuente: { count: jest.fn().mockResolvedValue(0) },
        otroGasto: { count: jest.fn().mockResolvedValue(0) },
        ejecucionFisica: { findUnique: jest.fn().mockResolvedValue(null) },
        cuentaCobro: { update: jest.fn().mockResolvedValue({ ...cuentaEnRevision, estado: 'LIQUIDADA' }) },
        historialEstado: { create: jest.fn().mockResolvedValue({}) },
        ...overrides,
      };
    }

    it('aprueba la sección sin liquidar la cuenta', async () => {
      mockPrismaService.cuentaCobro.findUniqueOrThrow.mockResolvedValue(cuentaEnRevision);
      const tx = buildTx();
      mockPrismaService.$transaction.mockImplementation(async (cb) => cb(tx));

      const result = await service.aprobarSeccionInformeActividades(id, codigoTercero, usuarioNombre);

      expect(tx.actividad.updateMany).toHaveBeenCalledWith({
        where: { cuentaCobroId: id },
        data: { estadoRevisionAprobador: 'APROBADO', observacionRevisionAprobador: null },
      });
      expect(tx.cuentaCobro.update).not.toHaveBeenCalled();
      expect(result).toMatchObject({
        mensaje: 'Informe de actividades aprobado por el aprobador',
        seccion: 'INFORME_ACTIVIDADES',
        estado: 'APROBADO',
      });
    });
  });

  describe('aprobarSeccionPlanilla', () => {
    const id = BigInt(11);
    const codigoTercero = 'APR001';
    const usuarioNombre = 'Ana Aprobadora';

    const cuentaEnRevision = {
      id,
      codigoTerceroAprobador: codigoTercero,
      estado: 'EN_REVISION_APROBADOR',
    };

    function buildTx(overrides: Record<string, any> = {}) {
      return {
        actividad: { count: jest.fn().mockResolvedValue(0) },
        planilla: {
          findUnique: jest.fn().mockResolvedValue({ estadoRevisionAprobador: 'APROBADO' }),
          update: jest.fn().mockResolvedValue({}),
        },
        checklistRetefuente: { count: jest.fn().mockResolvedValue(0) },
        otroGasto: { count: jest.fn().mockResolvedValue(0) },
        ejecucionFisica: { findUnique: jest.fn().mockResolvedValue(null) },
        cuentaCobro: { update: jest.fn().mockResolvedValue({ ...cuentaEnRevision, estado: 'LIQUIDADA' }) },
        historialEstado: { create: jest.fn().mockResolvedValue({}) },
        ...overrides,
      };
    }

    beforeEach(() => {
      mockPrismaService.cuentaCobro.findUniqueOrThrow.mockResolvedValue(cuentaEnRevision);
    });

    it('aprueba la sección sin liquidar la cuenta', async () => {
      (mockPrismaService as any).planilla = { findUnique: jest.fn().mockResolvedValue({ id: BigInt(1) }) };
      const tx = buildTx();
      mockPrismaService.$transaction.mockImplementation(async (cb) => cb(tx));

      const result = await service.aprobarSeccionPlanilla(id, codigoTercero, usuarioNombre);

      expect(tx.planilla.update).toHaveBeenCalledWith({
        where: { cuentaCobroId: id },
        data: { estadoRevisionAprobador: 'APROBADO', observacionRevisionAprobador: null },
      });
      expect(tx.cuentaCobro.update).not.toHaveBeenCalled();
      expect(result).toMatchObject({
        mensaje: 'Pago de planilla aprobado por el aprobador',
        seccion: 'PLANILLA',
        estado: 'APROBADO',
      });
    });
  });

  describe('aprobarSeccionEjecucionFisica', () => {
    const id = BigInt(12);
    const codigoTercero = 'APR001';
    const usuarioNombre = 'Ana Aprobadora';

    const cuentaEnRevision = {
      id,
      codigoTerceroAprobador: codigoTercero,
      estado: 'EN_REVISION_APROBADOR',
    };

    it('aprueba la sección sin liquidar la cuenta', async () => {
      mockPrismaService.cuentaCobro.findUniqueOrThrow.mockResolvedValue(cuentaEnRevision);
      (mockPrismaService as any).ejecucionFisica = { findUnique: jest.fn().mockResolvedValue({ id: BigInt(1) }) };

      const tx = {
        actividad: { count: jest.fn().mockResolvedValue(0) },
        planilla: { findUnique: jest.fn().mockResolvedValue(null) },
        checklistRetefuente: { count: jest.fn().mockResolvedValue(0) },
        otroGasto: { count: jest.fn().mockResolvedValue(0) },
        ejecucionFisica: {
          findUnique: jest.fn().mockResolvedValue({ estadoRevisionAprobador: 'APROBADO' }),
          update: jest.fn().mockResolvedValue({}),
        },
        cuentaCobro: { update: jest.fn().mockResolvedValue({ ...cuentaEnRevision, estado: 'LIQUIDADA' }) },
        historialEstado: { create: jest.fn().mockResolvedValue({}) },
      };
      mockPrismaService.$transaction.mockImplementation(async (cb) => cb(tx));

      const result = await service.aprobarSeccionEjecucionFisica(id, codigoTercero, usuarioNombre);

      expect(tx.ejecucionFisica.update).toHaveBeenCalledWith({
        where: { cuentaCobroId: id },
        data: { estadoRevisionAprobador: 'APROBADO', observacionRevisionAprobador: null },
      });
      expect(tx.cuentaCobro.update).not.toHaveBeenCalled();
      expect(result).toMatchObject({
        mensaje: 'Ejecución física aprobada por el aprobador',
        seccion: 'EJECUCION_FISICA',
        estado: 'APROBADO',
      });
    });
  });

  describe('aprobar', () => {
    const id = BigInt(20);
    const codigoTercero = 'APR001';
    const usuarioNombre = 'Ana Aprobadora';

    const cuentaEnRevision = {
      id,
      codigoTerceroAprobador: codigoTercero,
      estado: 'EN_REVISION_APROBADOR',
    };

    function buildTx(overrides: Record<string, any> = {}) {
      return {
        actividad: { count: jest.fn().mockResolvedValue(0) },
        planilla: { findUnique: jest.fn().mockResolvedValue(null) },
        checklistRetefuente: { count: jest.fn().mockResolvedValue(0) },
        otroGasto: { count: jest.fn().mockResolvedValue(0) },
        ejecucionFisica: { findUnique: jest.fn().mockResolvedValue(null) },
        cuentaCobro: { update: jest.fn().mockResolvedValue({ ...cuentaEnRevision, estado: 'LIQUIDADA' }) },
        historialEstado: { create: jest.fn().mockResolvedValue({}) },
        ...overrides,
      };
    }

    it('lanza BadRequestException si quedan secciones sin aprobar', async () => {
      mockPrismaService.cuentaCobro.findUniqueOrThrow.mockResolvedValue(cuentaEnRevision);
      const tx = buildTx({ actividad: { count: jest.fn().mockResolvedValue(1) } });
      mockPrismaService.$transaction.mockImplementation(async (cb) => cb(tx));

      await expect(service.aprobar(id, codigoTercero, usuarioNombre)).rejects.toThrow(BadRequestException);
      expect(tx.cuentaCobro.update).not.toHaveBeenCalled();
    });

    it('cambia el estado a LIQUIDADA cuando todas las secciones están aprobadas', async () => {
      mockPrismaService.cuentaCobro.findUniqueOrThrow.mockResolvedValue(cuentaEnRevision);
      const tx = buildTx();
      mockPrismaService.$transaction.mockImplementation(async (cb) => cb(tx));

      const result = await service.aprobar(id, codigoTercero, usuarioNombre);

      expect(tx.cuentaCobro.update).toHaveBeenCalledWith({
        where: { id },
        data: { estado: 'LIQUIDADA' },
      });
      expect(tx.historialEstado.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          cuentaCobroId: id,
          estadoAnterior: 'EN_REVISION_APROBADOR',
          estadoNuevo: 'LIQUIDADA',
          usuarioId: codigoTercero,
          usuarioNombre,
          observacion: 'Cuenta de cobro liquidada por el aprobador',
        }),
      });
      expect(result.estado).toBe('LIQUIDADA');
      expect(result.mensaje).toBe('Cuenta de cobro liquidada');
    });
  });
});
