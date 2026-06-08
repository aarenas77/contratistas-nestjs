import { Test, TestingModule } from '@nestjs/testing';
import { ChecklistRetefuenteService } from './checklist-retefuente.service';
import { PrismaService } from '../../prisma/prisma/prisma.service';

describe('ChecklistRetefuenteService', () => {
  let service: ChecklistRetefuenteService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ChecklistRetefuenteService,
        { provide: PrismaService, useValue: {} },
      ],
    }).compile();

    service = module.get<ChecklistRetefuenteService>(ChecklistRetefuenteService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
