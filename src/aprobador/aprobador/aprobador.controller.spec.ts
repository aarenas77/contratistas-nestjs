import { Test, TestingModule } from '@nestjs/testing';
import { AprobadorController } from './aprobador.controller';
import { AprobadorService } from './aprobador.service';
import { ListarCuentasAprobadorDto } from '../dto/listar-cuentas-aprobador.dto';
import { Rol } from '../../auth/interfaces/jwt-payload.interface';
import type { JwtPayload } from '../../auth/interfaces/jwt-payload.interface';

const mockAprobadorService = {
  listarParaAprobacion: jest.fn(),
};

const mockUser: JwtPayload = {
  sub: 'user-id-1',
  nombre: 'Ana Aprobadora',
  codigoTercero: 'APR001',
  userIdentification: '87654321',
  rol: Rol.APROBADOR,
};

describe('AprobadorController', () => {
  let controller: AprobadorController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [AprobadorController],
      providers: [{ provide: AprobadorService, useValue: mockAprobadorService }],
    }).compile();

    controller = module.get<AprobadorController>(AprobadorController);
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('listarParaAprobacion', () => {
    it('llama a service.listarParaAprobacion con el dto y retorna el resultado', async () => {
      const dto: ListarCuentasAprobadorDto = { page: 0, size: 10 };
      const expected = {
        success: true,
        message: 'Se encontraron 3 cuenta(s) pendiente(s) de aprobación',
        data: [],
        totalElementos: 3,
      };
      mockAprobadorService.listarParaAprobacion.mockResolvedValue(expected);

      const result = await controller.listarParaAprobacion(mockUser, dto);

      expect(mockAprobadorService.listarParaAprobacion).toHaveBeenCalledWith(mockUser.codigoTercero, dto);
      expect(result).toBe(expected);
    });

    it('pasa dto con codigoContrato al service', async () => {
      const dto: ListarCuentasAprobadorDto = { codigoContrato: 39492, page: 0, size: 5 };
      mockAprobadorService.listarParaAprobacion.mockResolvedValue({ success: true, data: [] });

      await controller.listarParaAprobacion(mockUser, dto);

      expect(mockAprobadorService.listarParaAprobacion).toHaveBeenCalledWith(mockUser.codigoTercero, dto);
    });
  });
});
