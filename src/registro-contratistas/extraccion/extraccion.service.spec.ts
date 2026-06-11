import { BadRequestException } from '@nestjs/common';
import { readFileSync } from 'fs';
import { join } from 'path';
import { ExtraccionService } from './extraccion.service';
import { PdfTextExtractor } from './pdf-text-extractor';
import { RutPdfParser } from './rut-pdf.parser';
import { CertificadoBancarioParser } from './certificado-bancario.parser';
import { TextItem } from './text-item';

const rutItems: TextItem[] = JSON.parse(
  readFileSync(
    join(process.cwd(), 'test/fixtures/rut-text-items.json'),
    'utf-8',
  ),
);

const textoBanco =
  'Bancolombia S.A. se permite informar... Cuenta de ahorros 41200025782 2019-02-26 Activo';

const file = (name: string): Express.Multer.File =>
  ({
    originalname: name,
    mimetype: 'application/pdf',
    buffer: Buffer.from('%PDF'),
  }) as any;

describe('ExtraccionService', () => {
  let service: ExtraccionService;
  let extractor: { extraerItems: jest.Mock; extraerTexto: jest.Mock };

  beforeEach(() => {
    extractor = { extraerItems: jest.fn(), extraerTexto: jest.fn() };
    service = new ExtraccionService(
      extractor,
      new RutPdfParser(),
      new CertificadoBancarioParser(),
    );
  });

  it('extrae RUT y certificado y arma el DTO combinado', async () => {
    extractor.extraerItems.mockResolvedValue(rutItems);
    extractor.extraerTexto.mockResolvedValue(textoBanco);

    const result = await service.extraer(file('rut.pdf'), file('banco.pdf'));

    expect(result.rut.numeroIdentificacion).toBe('1001725743');
    expect(result.rut.primerApellido).toBe('ARENAS');
    expect(result.certificadoBancario.entidadBancaria).toBe('BANCOLOMBIA');
    expect(result.certificadoBancario.numeroCuenta).toBe('41200025782');
  });

  it('rechaza el RUT si es una imagen (sin texto)', async () => {
    extractor.extraerItems.mockResolvedValue([]);
    extractor.extraerTexto.mockResolvedValue(textoBanco);

    await expect(
      service.extraer(file('rut.pdf'), file('banco.pdf')),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('rechaza el certificado bancario si es una imagen (sin texto)', async () => {
    extractor.extraerItems.mockResolvedValue(rutItems);
    extractor.extraerTexto.mockResolvedValue('   ');

    await expect(
      service.extraer(file('rut.pdf'), file('banco.pdf')),
    ).rejects.toBeInstanceOf(BadRequestException);
  });
});
