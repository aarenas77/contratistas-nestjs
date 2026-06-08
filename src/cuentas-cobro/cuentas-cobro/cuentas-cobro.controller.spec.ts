import { Test, TestingModule } from '@nestjs/testing';
import { CuentasCobroController } from './cuentas-cobro.controller';
import { CuentasCobroService } from './cuentas-cobro.service';

describe('CuentasCobroController', () => {
  let controller: CuentasCobroController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [CuentasCobroController],
      providers: [{ provide: CuentasCobroService, useValue: {} }],
    }).compile();

    controller = module.get<CuentasCobroController>(CuentasCobroController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
