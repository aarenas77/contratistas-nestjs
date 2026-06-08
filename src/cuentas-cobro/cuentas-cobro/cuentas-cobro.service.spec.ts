import { Test, TestingModule } from '@nestjs/testing';
import { CuentasCobroService } from './cuentas-cobro.service';

describe('CuentasCobroService', () => {
  let service: CuentasCobroService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [CuentasCobroService],
    }).compile();

    service = module.get<CuentasCobroService>(CuentasCobroService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
