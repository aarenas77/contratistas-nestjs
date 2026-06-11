import { Injectable } from '@nestjs/common';
import { TextItem } from './text-item';

/**
 * Único límite de I/O con pdfjs-dist. Aísla la dependencia ESM (cargada con
 * `import()` dinámico) del resto del módulo, que trabaja con datos puros.
 *
 * - `extraerItems`: fragmentos con coordenadas (para parsing posicional del RUT).
 * - `extraerTexto`: texto reconstruido por líneas (para parsers bancarios).
 *
 * Si el PDF es una imagen/escaneo (sin capa de texto), ambos métodos devuelven
 * vacío; la validación de ese caso vive en el orquestador.
 */
@Injectable()
export class PdfTextExtractor {
  // pdfjs-dist v6 es ESM; se carga una sola vez vía import() dinámico.
  private static pdfjs: Promise<any> | null = null;

  private static cargar(): Promise<any> {
    if (!PdfTextExtractor.pdfjs) {
      PdfTextExtractor.pdfjs = import('pdfjs-dist/legacy/build/pdf.mjs');
    }
    return PdfTextExtractor.pdfjs;
  }

  async extraerItems(buffer: Buffer): Promise<TextItem[]> {
    const pdfjs = await PdfTextExtractor.cargar();
    const loadingTask = pdfjs.getDocument({
      data: new Uint8Array(buffer),
      useSystemFonts: true,
    });
    try {
      const doc = await loadingTask.promise;
      const page = await doc.getPage(1);
      const content = await page.getTextContent();
      return content.items
        .filter(
          (i: any) => typeof i.str === 'string' && i.str.trim().length > 0,
        )
        .map((i: any) => ({
          str: i.str,
          x: i.transform[4],
          y: i.transform[5],
          width: i.width,
        }));
    } finally {
      await loadingTask.destroy();
    }
  }

  /** Reconstruye el texto agrupando fragmentos por línea (y) y ordenando por x. */
  async extraerTexto(buffer: Buffer): Promise<string> {
    const items = await this.extraerItems(buffer);
    if (items.length === 0) return '';

    const lineas = [...items].sort((a, b) =>
      Math.abs(a.y - b.y) > 3 ? b.y - a.y : a.x - b.x,
    );

    const out: string[] = [];
    let yActual = lineas[0].y;
    let linea: string[] = [];
    for (const it of lineas) {
      if (Math.abs(it.y - yActual) > 3) {
        out.push(linea.join(' '));
        linea = [];
        yActual = it.y;
      }
      linea.push(it.str);
    }
    if (linea.length) out.push(linea.join(' '));
    return out.join('\n');
  }
}
