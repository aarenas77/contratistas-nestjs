import { Test, TestingModule } from '@nestjs/testing';
import { SupervisorService } from './supervisor.service';
import { PrismaService } from '../../prisma/prisma/prisma.service';

describe('SupervisorService', () => {
  let service: SupervisorService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SupervisorService,
        { provide: PrismaService, useValue: {} },
      ],
    }).compile();

    service = module.get<SupervisorService>(SupervisorService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
