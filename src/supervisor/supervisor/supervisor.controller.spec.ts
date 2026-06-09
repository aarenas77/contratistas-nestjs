import { Test, TestingModule } from '@nestjs/testing';
import { SupervisorController } from './supervisor.controller';
import { SupervisorService } from './supervisor.service';
import { RechazarCuentaDto } from '../dto/rechazar-cuenta.dto';
import { Rol } from '../../auth/interfaces/jwt-payload.interface';
import type { JwtPayload } from '../../auth/interfaces/jwt-payload.interface';

const mockSupervisorService = {
  listarRadicadas: jest.fn(),
  aprobar: jest.fn(),
  rechazar: jest.fn(),
};

const mockUser: JwtPayload = {
  sub: 'user-id-1',
  nombre: 'Juan Supervisor',
  codigoTercero: 'SUP001',
  userIdentification: '12345678',
  rol: Rol.SUPERVISOR,
};

describe('SupervisorController', () => {
  let controller: SupervisorController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [SupervisorController],
      providers: [{ provide: SupervisorService, useValue: mockSupervisorService }],
    }).compile();

    controller = module.get<SupervisorController>(SupervisorController);
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('aprobar', () => {
    it('llama a service.aprobar con los argumentos correctos y retorna el resultado', async () => {
      const expected = { id: '1', estado: 'APROBADA_SUPERVISOR', mensaje: 'Cuenta de cobro aprobada por el supervisor' };
      mockSupervisorService.aprobar.mockResolvedValue(expected);

      const result = await controller.aprobar('1', mockUser);

      expect(mockSupervisorService.aprobar).toHaveBeenCalledWith(
        BigInt('1'),
        mockUser.codigoTercero,
        mockUser.nombre,
      );
      expect(result).toBe(expected);
    });
  });

  describe('rechazar', () => {
    it('llama a service.rechazar con los argumentos correctos y retorna el resultado', async () => {
      const dto: RechazarCuentaDto = { observacion: 'Falta planilla' };
      const expected = { id: '2', estado: 'DEVUELTA_CONTRATISTA', mensaje: 'Cuenta de cobro devuelta al contratista' };
      mockSupervisorService.rechazar.mockResolvedValue(expected);

      const result = await controller.rechazar('2', mockUser, dto);

      expect(mockSupervisorService.rechazar).toHaveBeenCalledWith(
        BigInt('2'),
        mockUser.codigoTercero,
        mockUser.nombre,
        dto.observacion,
      );
      expect(result).toBe(expected);
    });
  });
});
