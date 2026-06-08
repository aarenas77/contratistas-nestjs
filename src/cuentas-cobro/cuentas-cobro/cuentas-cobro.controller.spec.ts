import { Test, TestingModule } from '@nestjs/testing';
import { CuentasCobroController } from './cuentas-cobro.controller';

describe('CuentasCobroController', () => {
  let controller: CuentasCobroController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [CuentasCobroController],
    }).compile();

    controller = module.get<CuentasCobroController>(CuentasCobroController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
