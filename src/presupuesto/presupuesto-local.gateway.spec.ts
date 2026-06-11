import { Test, TestingModule } from '@nestjs/testing';
import { PresupuestoLocalGateway } from './presupuesto-local.gateway';
import { PrismaService } from '../prisma/prisma/prisma.service';

const mockPrisma = {
  precargaTercero: {
    findUnique: jest.fn(),
  },
};

describe('PresupuestoLocalGateway', () => {
  let gateway: PresupuestoLocalGateway;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PresupuestoLocalGateway,
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile();

    gateway = module.get(PresupuestoLocalGateway);
    jest.clearAllMocks();
  });

  describe('obtenerTerceroPorIdentificacion', () => {
    it('devuelve el codigoTercero y nombre cuando la cédula está precargada', async () => {
      mockPrisma.precargaTercero.findUnique.mockResolvedValue({
        codigoTercero: '123456',
        nombre: 'Brandel Otero',
      });

      const tercero =
        await gateway.obtenerTerceroPorIdentificacion('1036662102');

      expect(tercero).toEqual({
        codigoTercero: '123456',
        nombre: 'Brandel Otero',
      });
      expect(mockPrisma.precargaTercero.findUnique).toHaveBeenCalledWith({
        where: { numeroIdentificacion: '1036662102' },
        select: { codigoTercero: true, nombre: true },
      });
    });

    it('devuelve null cuando la cédula no está precargada', async () => {
      mockPrisma.precargaTercero.findUnique.mockResolvedValue(null);

      const tercero = await gateway.obtenerTerceroPorIdentificacion('9999999');

      expect(tercero).toBeNull();
    });
  });
});
