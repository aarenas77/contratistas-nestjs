import { Test, TestingModule } from '@nestjs/testing';
import { ContratosService } from './contratos.service';
import { PrismaService } from '../prisma/prisma/prisma.service';
import { CreateContratoDto, TipoPlazo } from './dto/create-contrato.dto';
import { EstadoContrato } from './estado-contrato.enum';

const mockPrisma = {
  contrato: {
    aggregate: jest.fn(),
    create: jest.fn(),
    findUnique: jest.fn(),
    update: jest.fn(),
    findMany: jest.fn(),
    count: jest.fn(),
  },
  usuario: {
    findMany: jest.fn(),
    findFirst: jest.fn(),
  },
};

const createDto: CreateContratoDto = {
  consecutivo: '0433-2026',
  descripcion: 'Prestacion de servicios profesionales',
  codigoTercero: '743',
  valor: 16800000,
  fechaElaboracion: '2026-01-27',
  plazoDias: 120,
  tipoPlazo: TipoPlazo.D,
  consecutivoCompromiso: 617,
  codigoDependencia: 9,
};

describe('ContratosService', () => {
  let service: ContratosService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ContratosService,
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile();

    service = module.get(ContratosService);
    jest.clearAllMocks();

    mockPrisma.contrato.create.mockImplementation(async ({ data }) => ({
      ...data,
      fechaElaboracion: data.fechaElaboracion,
      fechaRegistro: data.fechaRegistro,
      fechaFin: data.fechaFin,
      fechaAprobacion: data.fechaAprobacion,
      fechaInicioSecop: data.fechaInicioSecop,
    }));
  });

  it('crea contratos con estado ELABORADO en `estado` y no en `estadoCompromiso`', async () => {
    mockPrisma.contrato.aggregate.mockResolvedValue({
      _max: { codigoContrato: 39492 },
    });

    const result = await service.crear(createDto);

    expect(mockPrisma.contrato.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          codigoContrato: 39493,
          estado: EstadoContrato.ELABORADO,
          estadoCompromiso: 'A',
          consecutivo: '0433-2026',
          codigoTercero: '743',
        }),
      }),
    );
    expect(result.estado).toBe(EstadoContrato.ELABORADO);
    expect(result.estadoCompromiso).toBe('A');
  });

  it('clona contratos con estado ELABORADO en `estado` y no en `estadoCompromiso`', async () => {
    mockPrisma.contrato.aggregate.mockResolvedValue({
      _max: { codigoContrato: 50000 },
    });
    mockPrisma.contrato.findUnique.mockResolvedValue({
      codigoContrato: 39492,
      consecutivo: '0433-2026',
      descripcion: 'Contrato original',
      codigoTercero: '743',
      valor: 16800000,
      totalPago: 16800000,
      estado: 'A',
      fechaElaboracion: new Date('2026-01-27'),
      fechaRegistro: new Date('2026-01-28'),
      fechaFin: new Date('2026-06-03'),
      fechaAprobacion: new Date('2026-01-27'),
      fechaInicioSecop: new Date('2026-02-02'),
      plazoDias: 120,
      tipoPlazo: 'D',
      consecutivoCompromiso: 617,
      estadoCompromiso: 'APROBADO',
      numeroActaInicio: 1,
      saldoDisponibleOtrosGastos: 0,
      idSupervisor: null,
      codigoDependencia: 9,
      codigoMempresa: BigInt('9999999999'),
    });

    const result = await service.clonar(39492);

    expect(mockPrisma.contrato.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          codigoContrato: 50001,
          consecutivo: '0433-2026 (COPIA)',
          descripcion: '[COPIA] Contrato original',
          estado: EstadoContrato.ELABORADO,
          estadoCompromiso: 'A',
          fechaAprobacion: null,
        }),
      }),
    );
    expect(result.estado).toBe(EstadoContrato.ELABORADO);
    expect(result.estadoCompromiso).toBe('A');
  });

  it('normaliza estados legacy al listar', async () => {
    mockPrisma.contrato.findMany.mockResolvedValue([
      {
        codigoContrato: 1,
        consecutivo: 'CON-001',
        descripcion: 'Contrato legado',
        codigoTercero: '743',
        valor: 1000,
        totalPago: 1000,
        estado: 'A',
        fechaElaboracion: new Date('2026-01-01'),
        fechaAprobacion: null,
        fechaFin: null,
        fechaRegistro: new Date('2026-01-02'),
        fechaInicioSecop: null,
        plazoDias: 30,
        tipoPlazo: 'D',
        consecutivoCompromiso: 1,
        estadoCompromiso: 'A',
        numeroActaInicio: null,
        saldoDisponibleOtrosGastos: 0,
        idSupervisor: null,
        codigoDependencia: null,
        codigoMempresa: BigInt('9999999999'),
      },
    ]);
    mockPrisma.contrato.count.mockResolvedValue(1);

    const result = await service.listar('743', {});

    expect(mockPrisma.contrato.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          codigoTercero: '743',
          estado: { notIn: [EstadoContrato.INHABILITADO, 'I'] },
        },
      }),
    );
    expect(result.response.body.content[0].estado).toBe(EstadoContrato.ELABORADO);
  });

  it('filtra por estado de contrato usando los valores canonicos y legacy', async () => {
    mockPrisma.contrato.findMany.mockResolvedValue([]);
    mockPrisma.contrato.count.mockResolvedValue(0);

    await service.listarTodos({ estado: EstadoContrato.ELABORADO });

    expect(mockPrisma.contrato.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          estado: { in: [EstadoContrato.ELABORADO, 'A'] },
        },
      }),
    );
  });

  it('filtra contratos inhabilitados usando el valor canonico y el legacy', async () => {
    mockPrisma.contrato.findMany.mockResolvedValue([]);
    mockPrisma.contrato.count.mockResolvedValue(0);

    await service.listarTodos({ estado: EstadoContrato.INHABILITADO });

    expect(mockPrisma.contrato.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          estado: { in: [EstadoContrato.INHABILITADO, 'I'] },
        },
      }),
    );
  });

  it('inhabilita contratos en vez de eliminarlos', async () => {
    mockPrisma.contrato.findUnique.mockResolvedValue({
      codigoContrato: 39492,
    });

    const result = await service.eliminar(39492);

    expect(mockPrisma.contrato.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: { estado: EstadoContrato.INHABILITADO },
      }),
    );
    expect(result.message).toBe('Contrato inhabilitado correctamente');
  });
});
