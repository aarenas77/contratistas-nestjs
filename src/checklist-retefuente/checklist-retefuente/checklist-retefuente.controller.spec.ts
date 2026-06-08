import { Test, TestingModule } from '@nestjs/testing';
import { ChecklistRetefuenteController } from './checklist-retefuente.controller';
import { ChecklistRetefuenteService } from './checklist-retefuente.service';

describe('ChecklistRetefuenteController', () => {
  let controller: ChecklistRetefuenteController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [ChecklistRetefuenteController],
      providers: [{ provide: ChecklistRetefuenteService, useValue: {} }],
    }).compile();

    controller = module.get<ChecklistRetefuenteController>(ChecklistRetefuenteController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
