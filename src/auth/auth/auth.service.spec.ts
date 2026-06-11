import { Test, TestingModule } from '@nestjs/testing';
import {
  UnauthorizedException,
  BadRequestException,
} from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { AuthService } from './auth.service';
import { PrismaService } from '../../prisma/prisma/prisma.service';
import { JwtService } from '@nestjs/jwt';

const mockPrisma = {
  usuario: {
    findUnique: jest.fn(),
    update: jest.fn(),
  },
};

const mockJwt = {
  sign: jest.fn(() => 'signed-token'),
};

describe('AuthService', () => {
  let service: AuthService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: JwtService, useValue: mockJwt },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('login', () => {
    it('propaga mustChangePassword en el payload del token y en la respuesta', async () => {
      const passwordHash = await bcrypt.hash('temporal', 10);
      mockPrisma.usuario.findUnique.mockResolvedValue({
        id: 7n,
        username: 'brandel.otero',
        passwordHash,
        nombre: 'Brandel Otero',
        codigoTercero: '123456',
        userIdentification: '1036662102',
        rol: 'CONTRATISTA',
        activo: true,
        mustChangePassword: true,
      });

      const result = await service.login({
        username: 'brandel.otero',
        password: 'temporal',
      });

      expect(result.user.mustChangePassword).toBe(true);
      expect(mockJwt.sign).toHaveBeenCalledWith(
        expect.objectContaining({ mustChangePassword: true }),
      );
    });
  });

  describe('cambiarPassword', () => {
    const usuario = (mustChangePassword: boolean) => ({
      id: 7n,
      username: 'brandel.otero',
      nombre: 'Brandel Otero',
      codigoTercero: '123456',
      userIdentification: '1036662102',
      rol: 'CONTRATISTA',
      activo: true,
      mustChangePassword,
    });

    it('cambia la contraseña, baja el flag y devuelve un token nuevo', async () => {
      const passwordHash = await bcrypt.hash('Temporal1!', 10);
      mockPrisma.usuario.findUnique.mockResolvedValue({
        ...usuario(true),
        passwordHash,
      });
      mockPrisma.usuario.update.mockImplementation(({ data }: any) =>
        Promise.resolve({ ...usuario(false), ...data }),
      );

      const result = await service.cambiarPassword('7', {
        passwordActual: 'Temporal1!',
        passwordNueva: 'NuevaClave9#',
      });

      const updateArg = mockPrisma.usuario.update.mock.calls[0][0];
      expect(updateArg.data.mustChangePassword).toBe(false);
      await expect(
        bcrypt.compare('NuevaClave9#', updateArg.data.passwordHash),
      ).resolves.toBe(true);
      expect(result.accessToken).toBe('signed-token');
      expect(mockJwt.sign).toHaveBeenCalledWith(
        expect.objectContaining({ mustChangePassword: false }),
      );
    });

    it('rechaza si la contraseña actual es incorrecta', async () => {
      const passwordHash = await bcrypt.hash('Temporal1!', 10);
      mockPrisma.usuario.findUnique.mockResolvedValue({
        ...usuario(true),
        passwordHash,
      });

      await expect(
        service.cambiarPassword('7', {
          passwordActual: 'incorrecta',
          passwordNueva: 'NuevaClave9#',
        }),
      ).rejects.toBeInstanceOf(UnauthorizedException);
      expect(mockPrisma.usuario.update).not.toHaveBeenCalled();
    });

    it('rechaza si la nueva contraseña es igual a la actual', async () => {
      const passwordHash = await bcrypt.hash('Temporal1!', 10);
      mockPrisma.usuario.findUnique.mockResolvedValue({
        ...usuario(true),
        passwordHash,
      });

      await expect(
        service.cambiarPassword('7', {
          passwordActual: 'Temporal1!',
          passwordNueva: 'Temporal1!',
        }),
      ).rejects.toBeInstanceOf(BadRequestException);
      expect(mockPrisma.usuario.update).not.toHaveBeenCalled();
    });
  });
});
