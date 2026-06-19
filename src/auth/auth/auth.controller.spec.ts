import { Test, TestingModule } from '@nestjs/testing';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';

describe('AuthController', () => {
  let controller: AuthController;
  let service: { listarContratistas: jest.Mock };

  beforeEach(async () => {
    service = {
      listarContratistas: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [AuthController],
      providers: [{ provide: AuthService, useValue: service }],
    }).compile();

    controller = module.get<AuthController>(AuthController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  it('delegates contractor listing to AuthService', async () => {
    service.listarContratistas.mockResolvedValue({ success: true, data: [] });

    await expect(controller.listarContratistas()).resolves.toEqual({
      success: true,
      data: [],
    });
    expect(service.listarContratistas).toHaveBeenCalledTimes(1);
  });
});
