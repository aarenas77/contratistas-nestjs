import { Test, TestingModule } from '@nestjs/testing';
import { ActividadesService } from './actividades.service';
import { PrismaService } from '../../prisma/prisma/prisma.service';

describe('ActividadesService', () => {
  let service: ActividadesService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ActividadesService,
        { provide: PrismaService, useValue: {} },
      ],
    }).compile();

    service = module.get<ActividadesService>(ActividadesService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
