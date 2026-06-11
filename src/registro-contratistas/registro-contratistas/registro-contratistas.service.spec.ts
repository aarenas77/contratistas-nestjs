import {
  ConflictException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import * as bcrypt from 'bcrypt';
import { RegistroContratistasService } from './registro-contratistas.service';
import { PrismaService } from '../../prisma/prisma/prisma.service';
import { ExtraccionService } from '../extraccion/extraccion.service';
import { RutExtraidoDto } from '../dto/rut-extraido.dto';
import { FinalizarRegistroDto } from '../dto/finalizar-registro.dto';
import { PRESUPUESTO_GATEWAY } from '../../presupuesto/presupuesto.gateway';

const mockPrismaService = {
  usuario: {
    findFirst: jest.fn(),
    findUnique: jest.fn(),
    create: jest.fn(),
  },
};

const mockExtraccion = {
  extraer: jest.fn(),
};

const mockGateway = {
  obtenerTerceroPorIdentificacion: jest.fn(),
};

const rutBase: RutExtraidoDto = {
  numeroIdentificacion: '1036662102',
  primerNombre: 'BRANDEL',
  segundoNombre: 'DANIEL',
  primerApellido: 'OTERO',
  segundoApellido: 'ARANGO',
  correoElectronico: 'comercial@industriasoteros.com.co',
};

describe('RegistroContratistasService', () => {
  let service: RegistroContratistasService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RegistroContratistasService,
        { provide: PrismaService, useValue: mockPrismaService },
        { provide: ExtraccionService, useValue: mockExtraccion },
        { provide: PRESUPUESTO_GATEWAY, useValue: mockGateway },
      ],
    }).compile();

    service = module.get<RegistroContratistasService>(
      RegistroContratistasService,
    );
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('generarUsername', () => {
    it('genera primernombre.primerapellido normalizado sin acentos', async () => {
      mockPrismaService.usuario.findUnique.mockResolvedValue(null);

      const username = await service.generarUsername({
        ...rutBase,
        primerNombre: 'José',
        primerApellido: 'Núñez',
      });

      expect(username).toBe('jose.nunez');
    });

    it('agrega sufijo numérico cuando el username ya existe', async () => {
      mockPrismaService.usuario.findUnique
        .mockResolvedValueOnce({ id: 1n }) // brandel.otero ocupado
        .mockResolvedValueOnce(null); // brandel.otero.2 libre

      const username = await service.generarUsername(rutBase);

      expect(username).toBe('brandel.otero.2');
    });

    it('usa la identificación como respaldo cuando no hay nombre ni razón social', async () => {
      mockPrismaService.usuario.findUnique.mockResolvedValue(null);

      const username = await service.generarUsername({
        numeroIdentificacion: '999',
        primerNombre: null,
        primerApellido: null,
        razonSocial: null,
        nombreComercial: null,
      });

      expect(username).toBe('contratista.999');
    });
  });

  describe('generarPassword', () => {
    it('genera 14 caracteres con mayúscula, minúscula, dígito y símbolo', () => {
      for (let i = 0; i < 50; i++) {
        const pass = service.generarPassword();
        expect(pass).toHaveLength(14);
        expect(pass).toMatch(/[A-Z]/);
        expect(pass).toMatch(/[a-z]/);
        expect(pass).toMatch(/[0-9]/);
        expect(pass).toMatch(/[!@#$%&*?]/);
      }
    });
  });

  describe('finalizar', () => {
    const dto: FinalizarRegistroDto = {
      rut: rutBase,
      certificadoBancario: {
        entidadBancaria: 'BANCOLOMBIA',
        tipoCuenta: '1',
        numeroCuenta: '36593235038',
      },
    };

    it('resuelve el codigoTercero real desde el gateway y crea el usuario', async () => {
      mockGateway.obtenerTerceroPorIdentificacion.mockResolvedValue({
        codigoTercero: '123456',
        nombre: 'Brandel Otero',
      });
      mockPrismaService.usuario.findFirst.mockResolvedValue(null);
      mockPrismaService.usuario.findUnique.mockResolvedValue(null);
      mockPrismaService.usuario.create.mockImplementation(({ data }: any) =>
        Promise.resolve({ id: 10n, ...data }),
      );

      const result = await service.finalizar(dto);

      expect(mockGateway.obtenerTerceroPorIdentificacion).toHaveBeenCalledWith(
        '1036662102',
      );
      expect(mockPrismaService.usuario.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            username: 'brandel.otero',
            nombre: 'BRANDEL DANIEL OTERO ARANGO',
            email: 'comercial@industriasoteros.com.co',
            codigoTercero: '123456',
            userIdentification: '1036662102',
            rol: 'CONTRATISTA',
            mustChangePassword: true,
          }),
        }),
      );
      expect(result.username).toBe('brandel.otero');
      expect(typeof result.password).toBe('string');
      expect(result.password.length).toBeGreaterThanOrEqual(6);
      expect(result.usuario.rol).toBe('CONTRATISTA');
    });

    it('lanza UnprocessableEntityException si la cédula no está precargada en presupuesto', async () => {
      mockGateway.obtenerTerceroPorIdentificacion.mockResolvedValue(null);

      await expect(service.finalizar(dto)).rejects.toBeInstanceOf(
        UnprocessableEntityException,
      );
      expect(mockPrismaService.usuario.create).not.toHaveBeenCalled();
    });

    it('hashea la contraseña antes de persistir (no guarda texto plano)', async () => {
      mockGateway.obtenerTerceroPorIdentificacion.mockResolvedValue({
        codigoTercero: '123456',
        nombre: null,
      });
      mockPrismaService.usuario.findFirst.mockResolvedValue(null);
      mockPrismaService.usuario.findUnique.mockResolvedValue(null);
      let hashGuardado = '';
      mockPrismaService.usuario.create.mockImplementation(({ data }: any) => {
        hashGuardado = data.passwordHash;
        return Promise.resolve({ id: 10n, ...data });
      });

      const result = await service.finalizar(dto);

      expect(hashGuardado).not.toBe(result.password);
      await expect(bcrypt.compare(result.password, hashGuardado)).resolves.toBe(
        true,
      );
    });

    it('lanza ConflictException si ya existe usuario con esa identificación o correo', async () => {
      mockGateway.obtenerTerceroPorIdentificacion.mockResolvedValue({
        codigoTercero: '123456',
        nombre: null,
      });
      mockPrismaService.usuario.findFirst.mockResolvedValue({ id: 5n });

      await expect(service.finalizar(dto)).rejects.toBeInstanceOf(
        ConflictException,
      );
      expect(mockPrismaService.usuario.create).not.toHaveBeenCalled();
    });
  });
});
