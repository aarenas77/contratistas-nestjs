import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException, ForbiddenException } from '@nestjs/common';
import { SupervisorService } from './supervisor.service';
import { PrismaService } from '../../prisma/prisma/prisma.service';

const mockPrismaService = {
  cuentaCobro: {
    findUniqueOrThrow: jest.fn(),
    update: jest.fn(),
    findMany: jest.fn(),
    count: jest.fn(),
  },
  actividad: { count: jest.fn(), updateMany: jest.fn() },
  planilla: { count: jest.fn(), findUnique: jest.fn(), update: jest.fn() },
  checklistRetefuente: { count: jest.fn(), updateMany: jest.fn() },
  otroGasto: { count: jest.fn(), updateMany: jest.fn() },
  ejecucionFisica: {
    count: jest.fn(),
    findUnique: jest.fn(),
    update: jest.fn(),
    upsert: jest.fn(),
  },
  historialEstado: {
    create: jest.fn(),
  },
  $transaction: jest.fn(),
};

describe('SupervisorService', () => {
  let service: SupervisorService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SupervisorService,
        { provide: PrismaService, useValue: mockPrismaService },
      ],
    }).compile();

    service = module.get<SupervisorService>(SupervisorService);
    jest.clearAllMocks();

    // Por defecto ninguna sección está rechazada
    mockPrismaService.actividad.count.mockResolvedValue(0);
    mockPrismaService.planilla.count.mockResolvedValue(0);
    mockPrismaService.checklistRetefuente.count.mockResolvedValue(0);
    mockPrismaService.otroGasto.count.mockResolvedValue(0);
    mockPrismaService.ejecucionFisica.count.mockResolvedValue(0);

    // Por defecto la ejecución física ya tiene porcentaje digitado
    mockPrismaService.ejecucionFisica.findUnique.mockResolvedValue({ porcentaje: 85 });
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('aprobar', () => {
    const id = BigInt(1);
    const codigoTercero = 'SUP001';
    const usuarioNombre = 'Juan Supervisor';

    const cuentaRadicada = {
      id,
      estado: 'RADICADA',
      codigoTerceroSupervisor: 'SUP001',
    };

    it('lanza ForbiddenException si el supervisor no está asignado a la cuenta', async () => {
      mockPrismaService.cuentaCobro.findUniqueOrThrow.mockResolvedValue({
        ...cuentaRadicada,
        codigoTerceroSupervisor: 'OTRO',
      });

      await expect(service.aprobar(id, codigoTercero, usuarioNombre)).rejects.toThrow(
        ForbiddenException,
      );
    });

    it('lanza ForbiddenException si codigoTerceroSupervisor es null', async () => {
      mockPrismaService.cuentaCobro.findUniqueOrThrow.mockResolvedValue({
        ...cuentaRadicada,
        codigoTerceroSupervisor: null,
      });

      await expect(service.aprobar(id, codigoTercero, usuarioNombre)).rejects.toThrow(
        ForbiddenException,
      );
    });

    it('lanza BadRequestException si el estado no es RADICADA', async () => {
      mockPrismaService.cuentaCobro.findUniqueOrThrow.mockResolvedValue({
        ...cuentaRadicada,
        estado: 'BORRADOR',
      });

      await expect(service.aprobar(id, codigoTercero, usuarioNombre)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('lanza BadRequestException si hay al menos una sección rechazada', async () => {
      mockPrismaService.cuentaCobro.findUniqueOrThrow.mockResolvedValue(cuentaRadicada);
      mockPrismaService.planilla.count.mockResolvedValue(1);

      await expect(service.aprobar(id, codigoTercero, usuarioNombre)).rejects.toThrow(
        BadRequestException,
      );
      expect(mockPrismaService.$transaction).not.toHaveBeenCalled();
    });

    it('lanza BadRequestException si no se ha digitado el porcentaje de ejecución física', async () => {
      mockPrismaService.cuentaCobro.findUniqueOrThrow.mockResolvedValue(cuentaRadicada);
      mockPrismaService.ejecucionFisica.findUnique.mockResolvedValue(null);

      await expect(service.aprobar(id, codigoTercero, usuarioNombre)).rejects.toThrow(
        BadRequestException,
      );
      expect(mockPrismaService.$transaction).not.toHaveBeenCalled();
    });

    it('lanza BadRequestException si el porcentaje de ejecución física es null', async () => {
      mockPrismaService.cuentaCobro.findUniqueOrThrow.mockResolvedValue(cuentaRadicada);
      mockPrismaService.ejecucionFisica.findUnique.mockResolvedValue({ porcentaje: null });

      await expect(service.aprobar(id, codigoTercero, usuarioNombre)).rejects.toThrow(
        BadRequestException,
      );
      expect(mockPrismaService.$transaction).not.toHaveBeenCalled();
    });

    it('ejecuta la transaccion y retorna la cuenta con mensaje', async () => {
      mockPrismaService.cuentaCobro.findUniqueOrThrow.mockResolvedValue(cuentaRadicada);

      const cuentaActualizada = { ...cuentaRadicada, estado: 'APROBADA_SUPERVISOR' };
      mockPrismaService.$transaction.mockImplementation(async (cb) => {
        const tx = {
          cuentaCobro: { update: jest.fn().mockResolvedValue(cuentaActualizada) },
          historialEstado: { create: jest.fn().mockResolvedValue({}) },
        };
        return cb(tx);
      });

      const result = await service.aprobar(id, codigoTercero, usuarioNombre);

      expect(result.estado).toBe('APROBADA_SUPERVISOR');
      expect(result.mensaje).toBe('Cuenta de cobro aprobada por el supervisor');
    });

    it('en la transaccion actualiza estado a APROBADA_SUPERVISOR y crea historial', async () => {
      mockPrismaService.cuentaCobro.findUniqueOrThrow.mockResolvedValue(cuentaRadicada);

      const mockUpdate = jest.fn().mockResolvedValue({ ...cuentaRadicada, estado: 'APROBADA_SUPERVISOR' });
      const mockCreate = jest.fn().mockResolvedValue({});

      mockPrismaService.$transaction.mockImplementation(async (cb) => {
        return cb({
          cuentaCobro: { update: mockUpdate },
          historialEstado: { create: mockCreate },
        });
      });

      await service.aprobar(id, codigoTercero, usuarioNombre);

      expect(mockUpdate).toHaveBeenCalledWith({
        where: { id },
        data: { estado: 'APROBADA_SUPERVISOR' },
      });
      expect(mockCreate).toHaveBeenCalledWith({
        data: expect.objectContaining({
          cuentaCobroId: id,
          estadoAnterior: 'RADICADA',
          estadoNuevo: 'APROBADA_SUPERVISOR',
          usuarioId: codigoTercero,
          usuarioNombre,
        }),
      });
    });
  });

  describe('rechazar', () => {
    const id = BigInt(2);
    const codigoTercero = 'SUP001';
    const usuarioNombre = 'Juan Supervisor';
    const observacion = 'Falta planilla de seguridad social';

    const cuentaRadicada = {
      id,
      estado: 'RADICADA',
      codigoTerceroSupervisor: 'SUP001',
    };

    it('lanza ForbiddenException si el supervisor no está asignado a la cuenta', async () => {
      mockPrismaService.cuentaCobro.findUniqueOrThrow.mockResolvedValue({
        ...cuentaRadicada,
        codigoTerceroSupervisor: 'OTRO',
      });

      await expect(service.rechazar(id, codigoTercero, usuarioNombre, observacion)).rejects.toThrow(
        ForbiddenException,
      );
    });

    it('lanza BadRequestException si el estado no es RADICADA ni DEVUELTA_CONTRATISTA', async () => {
      mockPrismaService.cuentaCobro.findUniqueOrThrow.mockResolvedValue({
        ...cuentaRadicada,
        estado: 'APROBADA_SUPERVISOR',
      });

      await expect(service.rechazar(id, codigoTercero, usuarioNombre, observacion)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('en la transaccion actualiza estado, observaciones y crea historial', async () => {
      mockPrismaService.cuentaCobro.findUniqueOrThrow.mockResolvedValue(cuentaRadicada);

      const mockUpdate = jest.fn().mockResolvedValue({
        ...cuentaRadicada,
        estado: 'DEVUELTA_CONTRATISTA',
        observaciones: observacion,
      });
      const mockCreate = jest.fn().mockResolvedValue({});

      mockPrismaService.$transaction.mockImplementation(async (cb) => {
        return cb({
          cuentaCobro: { update: mockUpdate },
          historialEstado: { create: mockCreate },
        });
      });

      await service.rechazar(id, codigoTercero, usuarioNombre, observacion);

      expect(mockUpdate).toHaveBeenCalledWith({
        where: { id },
        data: { estado: 'DEVUELTA_CONTRATISTA', observaciones: observacion },
      });
      expect(mockCreate).toHaveBeenCalledWith({
        data: {
          cuentaCobroId: id,
          estadoAnterior: 'RADICADA',
          estadoNuevo: 'DEVUELTA_CONTRATISTA',
          usuarioId: codigoTercero,
          usuarioNombre,
          observacion,
        },
      });
    });

    it('permite el rechazo global cuando la cuenta ya está en DEVUELTA_CONTRATISTA', async () => {
      mockPrismaService.cuentaCobro.findUniqueOrThrow.mockResolvedValue({
        ...cuentaRadicada,
        estado: 'DEVUELTA_CONTRATISTA',
      });

      const mockCreate = jest.fn().mockResolvedValue({});
      mockPrismaService.$transaction.mockImplementation(async (cb) => {
        return cb({
          cuentaCobro: {
            update: jest.fn().mockResolvedValue({
              ...cuentaRadicada,
              estado: 'DEVUELTA_CONTRATISTA',
              observaciones: observacion,
            }),
          },
          historialEstado: { create: mockCreate },
        });
      });

      const result = await service.rechazar(id, codigoTercero, usuarioNombre, observacion);

      expect(result.estado).toBe('DEVUELTA_CONTRATISTA');
      expect(mockCreate).toHaveBeenCalledWith({
        data: expect.objectContaining({
          estadoAnterior: 'DEVUELTA_CONTRATISTA',
          estadoNuevo: 'DEVUELTA_CONTRATISTA',
        }),
      });
    });
  });

  describe('rechazarSeccionPlanilla (subsanación)', () => {
    const id = BigInt(3);
    const codigoTercero = 'SUP001';
    const usuarioNombre = 'Juan Supervisor';
    const justificacion = 'La planilla no corresponde al período';

    const cuentaRadicada = { id, estado: 'RADICADA', codigoTerceroSupervisor: 'SUP001' };

    it('lanza BadRequestException si la cuenta no está en revisión (RADICADA/DEVUELTA)', async () => {
      mockPrismaService.cuentaCobro.findUniqueOrThrow.mockResolvedValue({
        ...cuentaRadicada,
        estado: 'APROBADA_SUPERVISOR',
      });

      await expect(
        service.rechazarSeccionPlanilla(id, codigoTercero, usuarioNombre, justificacion),
      ).rejects.toThrow(BadRequestException);
    });

    it('desde RADICADA marca la planilla RECHAZADO y devuelve la cuenta al contratista', async () => {
      mockPrismaService.cuentaCobro.findUniqueOrThrow.mockResolvedValue(cuentaRadicada);
      mockPrismaService.planilla.findUnique.mockResolvedValue({ id: BigInt(10) });

      const txPlanillaUpdate = jest.fn().mockResolvedValue({});
      const txCuentaUpdate = jest.fn().mockResolvedValue({});
      const txHistorialCreate = jest.fn().mockResolvedValue({});
      mockPrismaService.$transaction.mockImplementation(async (cb) =>
        cb({
          planilla: { update: txPlanillaUpdate },
          cuentaCobro: { update: txCuentaUpdate },
          historialEstado: { create: txHistorialCreate },
        }),
      );

      const result = await service.rechazarSeccionPlanilla(id, codigoTercero, usuarioNombre, justificacion);

      expect(txPlanillaUpdate).toHaveBeenCalledWith({
        where: { cuentaCobroId: id },
        data: { estadoRevision: 'RECHAZADO', observacionRevision: justificacion },
      });
      expect(txCuentaUpdate).toHaveBeenCalledWith({
        where: { id },
        data: { estado: 'DEVUELTA_CONTRATISTA' },
      });
      expect(txHistorialCreate).toHaveBeenCalledWith({
        data: expect.objectContaining({
          estadoAnterior: 'RADICADA',
          estadoNuevo: 'DEVUELTA_CONTRATISTA',
        }),
      });
      expect(result.estado).toBe('RECHAZADO');
    });

    it('desde DEVUELTA_CONTRATISTA solo marca la planilla, sin nueva transición de estado', async () => {
      mockPrismaService.cuentaCobro.findUniqueOrThrow.mockResolvedValue({
        ...cuentaRadicada,
        estado: 'DEVUELTA_CONTRATISTA',
      });
      mockPrismaService.planilla.findUnique.mockResolvedValue({ id: BigInt(10) });

      const txPlanillaUpdate = jest.fn().mockResolvedValue({});
      const txCuentaUpdate = jest.fn().mockResolvedValue({});
      const txHistorialCreate = jest.fn().mockResolvedValue({});
      mockPrismaService.$transaction.mockImplementation(async (cb) =>
        cb({
          planilla: { update: txPlanillaUpdate },
          cuentaCobro: { update: txCuentaUpdate },
          historialEstado: { create: txHistorialCreate },
        }),
      );

      await service.rechazarSeccionPlanilla(id, codigoTercero, usuarioNombre, justificacion);

      expect(txPlanillaUpdate).toHaveBeenCalled();
      expect(txCuentaUpdate).not.toHaveBeenCalled();
      expect(txHistorialCreate).not.toHaveBeenCalled();
    });
  });

  describe('digitarEjecucionFisica', () => {
    const id = BigInt(4);
    const codigoTercero = 'SUP001';
    const porcentaje = 85.5;
    const justificacion = 'Avance verificado en visita de obra';

    const cuentaRadicada = { id, estado: 'RADICADA', codigoTerceroSupervisor: 'SUP001' };

    it('lanza ForbiddenException si el supervisor no está asignado a la cuenta', async () => {
      mockPrismaService.cuentaCobro.findUniqueOrThrow.mockResolvedValue({
        ...cuentaRadicada,
        codigoTerceroSupervisor: 'OTRO',
      });

      await expect(
        service.digitarEjecucionFisica(id, codigoTercero, porcentaje, justificacion),
      ).rejects.toThrow(ForbiddenException);
      expect(mockPrismaService.ejecucionFisica.upsert).not.toHaveBeenCalled();
    });

    it('lanza BadRequestException si el estado no es RADICADA ni DEVUELTA_CONTRATISTA', async () => {
      mockPrismaService.cuentaCobro.findUniqueOrThrow.mockResolvedValue({
        ...cuentaRadicada,
        estado: 'APROBADA_SUPERVISOR',
      });

      await expect(
        service.digitarEjecucionFisica(id, codigoTercero, porcentaje, justificacion),
      ).rejects.toThrow(BadRequestException);
      expect(mockPrismaService.ejecucionFisica.upsert).not.toHaveBeenCalled();
    });

    it('hace upsert del porcentaje y justificación y retorna el mensaje', async () => {
      mockPrismaService.cuentaCobro.findUniqueOrThrow.mockResolvedValue(cuentaRadicada);
      mockPrismaService.ejecucionFisica.upsert.mockResolvedValue({});

      const result = await service.digitarEjecucionFisica(
        id,
        codigoTercero,
        porcentaje,
        justificacion,
      );

      expect(mockPrismaService.ejecucionFisica.upsert).toHaveBeenCalledWith({
        where: { cuentaCobroId: id },
        create: { cuentaCobroId: id, porcentaje, justificacion },
        update: { porcentaje, justificacion },
      });
      expect(result).toEqual({
        mensaje: 'Porcentaje de ejecución física registrado',
        seccion: 'EJECUCION_FISICA',
        porcentaje,
        justificacion,
      });
    });
  });
});
