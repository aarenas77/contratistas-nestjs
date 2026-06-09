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
        data: {
          cuentaCobroId: id,
          estadoAnterior: 'RADICADA',
          estadoNuevo: 'APROBADA_SUPERVISOR',
          usuarioId: codigoTercero,
          usuarioNombre,
          observacion: 'Cuenta de cobro aprobada por el supervisor',
        },
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

    it('lanza BadRequestException si el estado no es RADICADA', async () => {
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

    it('retorna la cuenta actualizada con mensaje', async () => {
      mockPrismaService.cuentaCobro.findUniqueOrThrow.mockResolvedValue(cuentaRadicada);

      const cuentaActualizada = {
        ...cuentaRadicada,
        estado: 'DEVUELTA_CONTRATISTA',
        observaciones: observacion,
      };

      mockPrismaService.$transaction.mockImplementation(async (cb) => {
        return cb({
          cuentaCobro: { update: jest.fn().mockResolvedValue(cuentaActualizada) },
          historialEstado: { create: jest.fn().mockResolvedValue({}) },
        });
      });

      const result = await service.rechazar(id, codigoTercero, usuarioNombre, observacion);

      expect(result.estado).toBe('DEVUELTA_CONTRATISTA');
      expect(result.mensaje).toBe('Cuenta de cobro devuelta al contratista');
    });
  });
});
