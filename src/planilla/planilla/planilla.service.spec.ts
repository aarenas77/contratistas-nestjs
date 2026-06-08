import { Test, TestingModule } from '@nestjs/testing';
import { PlanillaService } from './planilla.service';
import { PrismaService } from '../../prisma/prisma/prisma.service';

describe('PlanillaService', () => {
  let service: PlanillaService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PlanillaService,
        { provide: PrismaService, useValue: {} },
      ],
    }).compile();

    service = module.get<PlanillaService>(PlanillaService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
