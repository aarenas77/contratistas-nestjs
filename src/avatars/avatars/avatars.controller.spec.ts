import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { AvatarsController } from './avatars.controller';
import { AvatarsService } from './avatars.service';

describe('AvatarsController', () => {
  let controller: AvatarsController;
  let service: { getRandom: jest.Mock };

  beforeEach(async () => {
    service = { getRandom: jest.fn() };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [AvatarsController],
      providers: [{ provide: AvatarsService, useValue: service }],
    }).compile();

    controller = module.get<AvatarsController>(AvatarsController);
  });

  it('devuelve la URL aleatoria del servicio', () => {
    service.getRandom.mockReturnValue({
      url: 'http://test-host/static/avatars/avatar-01.png',
    });

    expect(controller.random()).toEqual({
      url: 'http://test-host/static/avatars/avatar-01.png',
    });
  });

  it('lanza 404 cuando no hay avatares disponibles', () => {
    service.getRandom.mockReturnValue(null);

    expect(() => controller.random()).toThrow(NotFoundException);
  });
});
