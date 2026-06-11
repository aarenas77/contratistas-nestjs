import { Injectable } from '@nestjs/common';
import { TextItem } from './text-item';
import { RutExtraidoDto } from '../dto/rut-extraido.dto';

/**
 * Parser POSICIONAL del Formulario 001 (RUT) de la DIAN.
 *
 * Es una unidad pura: recibe los fragmentos de texto con coordenadas (extraídos
 * por {@link PdfTextExtractor}) y los mapea a {@link RutExtraidoDto} anclando
 * cada valor a su casilla por la posición de la etiqueta correspondiente.
 *
 * No depende de pdfjs ni de I/O, por lo que se testea con un fixture de items.
 */
@Injectable()
export class RutPdfParser {
  parse(items: TextItem[]): RutExtraidoDto {
    const dv = this.digitos(
      this.valoresDebajo(items, '6. DV', '12. Dirección seccional'),
    );

    const direccion =
      this.texto(this.valoresDebajo(items, '41. Dirección principal')) || null;

    const pais = this.valoresDebajo(items, '38. País', '39. Departamento');
    const depto = this.valoresDebajo(
      items,
      '39. Departamento',
      '40. Ciudad/Municipio',
    );
    const ciudad = this.valoresDebajo(items, '40. Ciudad/Municipio');

    return {
      codigoVerificacion: dv ? Number(dv) : null,
      tipoDocumento:
        this.soloTexto(
          this.valoresDebajo(
            items,
            '25. Tipo de documento',
            '26. Número de Identificación',
          ),
        ) || null,
      numeroIdentificacion: this.digitos(
        this.valoresDebajo(items, '26. Número de Identificación'),
      ),
      nit:
        this.digitos(
          this.valoresDebajo(items, '5. Número de Identificación', '6. DV'),
        ) || null,
      primerApellido:
        this.soloTexto(
          this.valoresDebajo(
            items,
            '31. Primer apellido',
            '32. Segundo apellido',
          ),
        ) || null,
      segundoApellido:
        this.soloTexto(
          this.valoresDebajo(
            items,
            '32. Segundo apellido',
            '33. Primer nombre',
          ),
        ) || null,
      primerNombre:
        this.soloTexto(
          this.valoresDebajo(items, '33. Primer nombre', '34. Otros nombres'),
        ) || null,
      segundoNombre:
        this.soloTexto(this.valoresDebajo(items, '34. Otros nombres')) || null,
      razonSocial:
        this.soloTexto(this.valoresDebajo(items, '35. Razón social')) || null,
      nombreComercial:
        this.soloTexto(
          this.valoresDebajo(items, '36. Nombre comercial', '37. Sigla'),
        ) || null,
      tipoContribuyente:
        this.soloTexto(
          this.valoresDebajo(
            items,
            '24. Tipo de contribuyente',
            '25. Tipo de documento',
          ),
        ) || null,
      pais: this.soloTexto(pais) || null,
      departamento: this.soloTexto(depto) || null,
      ciudad: this.soloTexto(ciudad) || null,
      direccion,
      correoElectronico: this.buscarEmail(items),
      telefono1:
        this.digitos(
          this.valoresEnFila(items, '44. Teléfono 1', '45. Teléfono 2'),
        ) || null,
      telefono2:
        this.digitos(this.valoresEnFila(items, '45. Teléfono 2')) || null,
      actividadEconomicaPrincipal:
        this.digitos(
          this.valoresDebajo(items, '46. Código', '47. Fecha inicio actividad'),
        ) || null,
      actividadEconomicaSecundaria:
        this.digitos(
          this.valoresDebajo(items, '48. Código', '49. Fecha inicio actividad'),
        ) || null,
      responsabilidadesTributarias: this.buscarResponsabilidades(items),
      numeroFormulario:
        this.digitos(this.valoresDerecha(items, '4. Número de formulario')) ||
        null,
      codigoDepartamento: this.digitos(depto) || null,
      codigoPais: this.digitos(pais) || null,
    };
  }

  // --- localización de etiquetas y valores -------------------------------

  private etiqueta(items: TextItem[], prefijo: string): TextItem | undefined {
    return items.find((i) => i.str.trim().startsWith(prefijo));
  }

  /** Valores en la fila inmediatamente debajo de la etiqueta, dentro de su columna. */
  private valoresDebajo(
    items: TextItem[],
    etiqueta: string,
    etiquetaDerecha?: string,
  ): TextItem[] {
    const label = this.etiqueta(items, etiqueta);
    if (!label) return [];
    const xMin = label.x - 6;
    const xMax = etiquetaDerecha
      ? (this.etiqueta(items, etiquetaDerecha)?.x ?? Infinity) - 6
      : Infinity;

    // Los valores caen ~11-13 unidades bajo su etiqueta; la siguiente fila de
    // etiquetas está ~24 abajo. La ventana (-18, -3) toma solo la fila de valor,
    // de modo que una casilla vacía no capture las etiquetas de abajo.
    const debajo = items.filter(
      (i) =>
        i.y < label.y - 3 && i.y > label.y - 18 && i.x >= xMin && i.x < xMax,
    );
    if (!debajo.length) return [];
    const yFila = Math.max(...debajo.map((i) => i.y));
    return debajo
      .filter((i) => Math.abs(i.y - yFila) <= 3)
      .sort((a, b) => a.x - b.x);
  }

  /** Valores en la MISMA fila de la etiqueta, a su derecha, dentro de su columna. */
  private valoresEnFila(
    items: TextItem[],
    etiqueta: string,
    etiquetaDerecha?: string,
  ): TextItem[] {
    const label = this.etiqueta(items, etiqueta);
    if (!label) return [];
    const xMin = label.x + label.width;
    const xMax = etiquetaDerecha
      ? (this.etiqueta(items, etiquetaDerecha)?.x ?? Infinity)
      : Infinity;
    return items
      .filter((i) => Math.abs(i.y - label.y) <= 4 && i.x >= xMin && i.x < xMax)
      .sort((a, b) => a.x - b.x);
  }

  /** Valor a la derecha de la etiqueta en su misma fila (campos de encabezado). */
  private valoresDerecha(items: TextItem[], etiqueta: string): TextItem[] {
    return this.valoresEnFila(items, etiqueta);
  }

  // --- normalización de valores ------------------------------------------

  /** Une todos los fragmentos como texto. */
  private texto(items: TextItem[]): string {
    return items
      .map((i) => i.str.trim())
      .join(' ')
      .replace(/\s+/g, ' ')
      .trim();
  }

  /** Texto excluyendo fragmentos que son solo dígitos sueltos (códigos de casilla). */
  private soloTexto(items: TextItem[]): string {
    return this.texto(items.filter((i) => !/^\d+$/.test(i.str.trim())));
  }

  /** Concatena solo los dígitos de los fragmentos (los RUT escriben dígito por dígito). */
  private digitos(items: TextItem[]): string {
    return items
      .map((i) => i.str)
      .join('')
      .replace(/\D/g, '');
  }

  private buscarEmail(items: TextItem[]): string | null {
    const texto = items.map((i) => i.str).join(' ');
    const match = texto.match(/[\w.+%-]+@[\w.-]+\.\w+/);
    return match ? match[0] : null;
  }

  /** Códigos de responsabilidad tributaria: líneas que inician con "NN- ...". */
  private buscarResponsabilidades(items: TextItem[]): string[] | null {
    const codigos = new Set<string>();
    for (const item of items) {
      const m = item.str.trim().match(/^(\d{2})\s*-/);
      if (m) codigos.add(m[1]);
    }
    return codigos.size > 0 ? [...codigos] : null;
  }
}
