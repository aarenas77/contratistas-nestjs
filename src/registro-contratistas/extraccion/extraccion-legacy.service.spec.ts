import { BadGatewayException } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { Test, TestingModule } from '@nestjs/testing';
import { of, throwError } from 'rxjs';
import { ExtraccionLegacyService } from './extraccion-legacy.service';

const mockHttp = {
  post: jest.fn(),
};

const pdf = (nombre: string): Express.Multer.File =>
  ({
    fieldname: nombre,
    originalname: `${nombre}.pdf`,
    mimetype: 'application/pdf',
    buffer: Buffer.from('%PDF-1.4 test'),
    size: 13,
  }) as unknown as Express.Multer.File;

describe('ExtraccionLegacyService', () => {
  let service: ExtraccionLegacyService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ExtraccionLegacyService,
        { provide: HttpService, useValue: mockHttp },
      ],
    }).compile();

    service = module.get<ExtraccionLegacyService>(ExtraccionLegacyService);
    jest.clearAllMocks();
    process.env.GESTION_CONTRATISTAS_URL = 'https://legacy.test';
    process.env.LEGACY_EXTRACCION_PATH = '/extraer';
    process.env.LEGACY_API_TOKEN = 'token-123';
  });

  it('mapea la respuesta del legacy al contrato interno', async () => {
    mockHttp.post.mockReturnValue(
      of({
        data: {
          rut: { numeroIdentificacion: '1036662102', primerNombre: 'BRANDEL', primerApellido: 'OTERO' },
          certificadoBancario: { entidadBancaria: 'BANCOLOMBIA', tipoCuenta: '1', numeroCuenta: '36593235038' },
        },
      }),
    );

    const result = await service.extraer(pdf('rut'), pdf('certificadoBancario'));

    expect(result.rut.numeroIdentificacion).toBe('1036662102');
    expect(result.rut.primerNombre).toBe('BRANDEL');
    expect(result.certificadoBancario.entidadBancaria).toBe('BANCOLOMBIA');
    expect(result.certificadoBancario.numeroCuenta).toBe('36593235038');
  });

  it('envía Authorization Bearer y arma la URL completa', async () => {
    mockHttp.post.mockReturnValue(of({ data: { rut: { numeroIdentificacion: '1' }, certificadoBancario: {} } }));

    await service.extraer(pdf('rut'), pdf('certificadoBancario'));

    expect(mockHttp.post).toHaveBeenCalledWith(
      'https://legacy.test/extraer',
      expect.any(FormData),
      expect.objectContaining({
        headers: expect.objectContaining({ Authorization: 'Bearer token-123' }),
      }),
    );
  });

  it('convierte un fallo del legacy en BadGatewayException', async () => {
    mockHttp.post.mockReturnValue(throwError(() => new Error('connection refused')));

    await expect(service.extraer(pdf('rut'), pdf('certificadoBancario'))).rejects.toBeInstanceOf(
      BadGatewayException,
    );
  });

  it('falla con BadGatewayException si no hay URL base configurada', async () => {
    delete process.env.GESTION_CONTRATISTAS_URL;

    await expect(service.extraer(pdf('rut'), pdf('certificadoBancario'))).rejects.toBeInstanceOf(
      BadGatewayException,
    );
  });
});
