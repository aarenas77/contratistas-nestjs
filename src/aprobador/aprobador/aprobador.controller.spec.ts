import { Test, TestingModule } from '@nestjs/testing';
import { AprobadorController } from './aprobador.controller';

describe('AprobadorController', () => {
  let controller: AprobadorController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [AprobadorController],
    }).compile();

    controller = module.get<AprobadorController>(AprobadorController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
