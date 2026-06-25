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
import { PAGO_SIMPLE_GATEWAY } from '../../pago-simple/pago-simple.gateway';

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

const mockPagoSimple = {
  consultarSeguridadSocial: jest.fn(),
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
        { provide: PAGO_SIMPLE_GATEWAY, useValue: mockPagoSimple },
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

  describe('seguridad social en finalizar', () => {
    const dtoBase: FinalizarRegistroDto = {
      rut: rutBase,
      certificadoBancario: {
        entidadBancaria: 'BANCOLOMBIA',
        tipoCuenta: '1',
        numeroCuenta: '36593235038',
      },
    };

    const snapshot = {
      eps: 'EPS SURA',
      epsFechaAfiliacion: new Date(Date.UTC(2020, 0, 15)),
      afp: 'PORVENIR',
      afpFechaAfiliacion: new Date(Date.UTC(2021, 5, 1)),
      tipoAfiliado: 'C',
      origen: 'PAGOSIMPLE' as const,
    };

    let dataGuardada: any;

    beforeEach(() => {
      mockGateway.obtenerTerceroPorIdentificacion.mockResolvedValue({
        codigoTercero: '123456',
        nombre: null,
      });
      mockPrismaService.usuario.findFirst.mockResolvedValue(null);
      mockPrismaService.usuario.findUnique.mockResolvedValue(null);
      dataGuardada = undefined;
      mockPrismaService.usuario.create.mockImplementation(({ data }: any) => {
        dataGuardada = data;
        return Promise.resolve({ id: 10n, ...data });
      });
    });

    it('completa EPS y AFP desde PagoSimple cuando faltan', async () => {
      mockPagoSimple.consultarSeguridadSocial.mockResolvedValue(snapshot);

      await service.finalizar(dtoBase);

      expect(mockPagoSimple.consultarSeguridadSocial).toHaveBeenCalledWith(
        'CC',
        '1036662102',
      );
      expect(dataGuardada).toMatchObject({
        eps: 'EPS SURA',
        afp: 'PORVENIR',
        epsFechaAfiliacion: snapshot.epsFechaAfiliacion,
        afpFechaAfiliacion: snapshot.afpFechaAfiliacion,
        tipoAfiliado: 'C',
        origenSeguridadSocial: 'PAGOSIMPLE',
      });
    });

    it('respeta el valor manual y NO consulta PagoSimple cuando vienen EPS y AFP', async () => {
      await service.finalizar({
        ...dtoBase,
        eps: 'EPS MANUAL',
        afp: 'AFP MANUAL',
      });

      expect(mockPagoSimple.consultarSeguridadSocial).not.toHaveBeenCalled();
      expect(dataGuardada).toMatchObject({
        eps: 'EPS MANUAL',
        afp: 'AFP MANUAL',
        origenSeguridadSocial: 'MANUAL',
      });
    });

    it('completa solo lo faltante: EPS manual, AFP desde PagoSimple', async () => {
      mockPagoSimple.consultarSeguridadSocial.mockResolvedValue(snapshot);

      await service.finalizar({ ...dtoBase, eps: 'EPS MANUAL' });

      expect(mockPagoSimple.consultarSeguridadSocial).toHaveBeenCalled();
      expect(dataGuardada).toMatchObject({
        eps: 'EPS MANUAL',
        afp: 'PORVENIR',
        origenSeguridadSocial: 'MANUAL',
      });
    });

    it('no rompe el registro si PagoSimple no devuelve datos', async () => {
      mockPagoSimple.consultarSeguridadSocial.mockResolvedValue(null);

      const result = await service.finalizar(dtoBase);

      expect(result.username).toBe('brandel.otero');
      expect(dataGuardada).toMatchObject({
        eps: null,
        afp: null,
        origenSeguridadSocial: null,
      });
    });
  });
});
