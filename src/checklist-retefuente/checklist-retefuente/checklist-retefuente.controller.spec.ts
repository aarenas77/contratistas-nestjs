import { Test, TestingModule } from '@nestjs/testing';
import { ChecklistRetefuenteController } from './checklist-retefuente.controller';

describe('ChecklistRetefuenteController', () => {
  let controller: ChecklistRetefuenteController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [ChecklistRetefuenteController],
    }).compile();

    controller = module.get<ChecklistRetefuenteController>(ChecklistRetefuenteController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
