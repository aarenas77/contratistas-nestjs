import { BadRequestException, Injectable } from '@nestjs/common';
import { PdfTextExtractor } from './pdf-text-extractor';
import { RutPdfParser } from './rut-pdf.parser';
import { CertificadoBancarioParser } from './certificado-bancario.parser';
import { DatosExtraidosDto } from '../dto/datos-extraidos.dto';

/**
 * Orquesta la extracción local de documentos del registro:
 * - RUT  → extracción posicional + {@link RutPdfParser}
 * - Banco→ extracción de texto + {@link CertificadoBancarioParser}
 *
 * Rechaza PDFs sin capa de texto (imágenes/escaneos) con un mensaje claro.
 * Reemplaza la antigua integración HTTP legacy.
 */
@Injectable()
export class ExtraccionService {
  constructor(
    private readonly extractor: PdfTextExtractor,
    private readonly rutParser: RutPdfParser,
    private readonly bancoParser: CertificadoBancarioParser,
  ) {}

  async extraer(
    rut: Express.Multer.File,
    certificado: Express.Multer.File,
  ): Promise<DatosExtraidosDto> {
    const rutItems = await this.intentar(
      () => this.extractor.extraerItems(rut.buffer),
      'RUT',
    );
    if (rutItems.length === 0) {
      throw new BadRequestException(this.mensajeSinTexto('RUT'));
    }
    const rutDto = this.rutParser.parse(rutItems);

    const textoBanco = await this.intentar(
      () => this.extractor.extraerTexto(certificado.buffer),
      'certificado bancario',
    );
    if (!textoBanco.trim()) {
      throw new BadRequestException(
        this.mensajeSinTexto('certificado bancario'),
      );
    }
    const bancoDto = this.bancoParser.parse(textoBanco);

    return { rut: rutDto, certificadoBancario: bancoDto };
  }

  private async intentar<T>(
    fn: () => Promise<T>,
    etiqueta: string,
  ): Promise<T> {
    try {
      return await fn();
    } catch {
      throw new BadRequestException(
        `No se pudo leer el PDF del ${etiqueta}. Verifica que el archivo no esté dañado.`,
      );
    }
  }

  private mensajeSinTexto(documento: string): string {
    return (
      `El ${documento} debe ser un PDF con texto seleccionable (no una imagen o ` +
      `escaneo). Descárgalo nuevamente desde el portal oficial y vuelve a intentarlo.`
    );
  }
}
