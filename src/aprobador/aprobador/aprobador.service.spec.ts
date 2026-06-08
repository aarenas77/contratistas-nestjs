import { Test, TestingModule } from '@nestjs/testing';
import { AprobadorService } from './aprobador.service';

describe('AprobadorService', () => {
  let service: AprobadorService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [AprobadorService],
    }).compile();

    service = module.get<AprobadorService>(AprobadorService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
