import { Test, TestingModule } from '@nestjs/testing';
import { AvatarsService } from './avatars.service';

describe('AvatarsService', () => {
  let service: AvatarsService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [AvatarsService],
    }).compile();

    service = module.get<AvatarsService>(AvatarsService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('getRandom', () => {
    it('devuelve una ruta relativa con un avatar del pool', () => {
      service.setAvatars(['avatar-01.png', 'avatar-02.png']);

      const result = service.getRandom();

      expect(result).not.toBeNull();
      expect([
        '/static/avatars/avatar-01.png',
        '/static/avatars/avatar-02.png',
      ]).toContain(result!.url);
    });

    it('siempre devuelve un avatar perteneciente al pool', () => {
      service.setAvatars(['a.png', 'b.png', 'c.png']);

      for (let i = 0; i < 50; i++) {
        const { url } = service.getRandom()!;
        expect(url).toMatch(/^\/static\/avatars\/(a|b|c)\.png$/);
      }
    });

    it('devuelve null cuando el pool está vacío', () => {
      service.setAvatars([]);

      expect(service.getRandom()).toBeNull();
    });
  });

  describe('loadAvatars', () => {
    it('devuelve lista vacía si el directorio no existe', () => {
      const avatars = service.loadAvatars('/ruta/que/no/existe');

      expect(avatars).toEqual([]);
    });

    it('filtra solo archivos de imagen', () => {
      const files = service.filterImages([
        'avatar-01.png',
        'avatar-02.jpg',
        'avatar-03.jpeg',
        'avatar-04.webp',
        'README.md',
        '.gitkeep',
        'notas.txt',
      ]);

      expect(files).toEqual([
        'avatar-01.png',
        'avatar-02.jpg',
        'avatar-03.jpeg',
        'avatar-04.webp',
      ]);
    });
  });
});
