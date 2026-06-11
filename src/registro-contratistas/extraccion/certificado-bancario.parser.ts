import { Injectable } from '@nestjs/common';
import { CertificadoBancarioDto } from '../dto/certificado-bancario.dto';
import { BancoMatcher, tipoCuentaDesdeTexto } from './bancos/banco-matcher';
import { BancolombiaBanco } from './bancos/bancolombia.banco';

/**
 * Parser de certificados bancarios basado en texto. Recorre un registro de
 * bancos conocidos; agregar uno nuevo es añadir un {@link BancoMatcher} a la lista.
 *
 * Es una unidad pura: recibe el texto ya extraído del PDF.
 */
@Injectable()
export class CertificadoBancarioParser {
  private readonly bancos: BancoMatcher[] = [new BancolombiaBanco()];

  parse(texto: string): CertificadoBancarioDto {
    const limpio = texto.replace(/\s+/g, ' ').trim();

    const banco = this.bancos.find((b) => b.detecta(limpio));
    if (banco) return banco.extrae(limpio);

    // Banco no reconocido: extracción genérica best-effort.
    return {
      entidadBancaria: null,
      tipoCuenta: tipoCuentaDesdeTexto(limpio),
      numeroCuenta: this.numeroGenerico(limpio),
    };
  }

  private numeroGenerico(texto: string): string | null {
    const match = texto.match(
      /(?:cuenta|producto|n[úu]mero)\D{0,20}?(\d{8,17})/i,
    );
    return match ? match[1] : null;
  }
}
