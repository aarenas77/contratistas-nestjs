import { CertificadoBancarioDto } from '../../dto/certificado-bancario.dto';
import { BancoMatcher, tipoCuentaDesdeTexto } from './banco-matcher';

/**
 * Parser del certificado bancario de Bancolombia.
 *
 * Formato observado: "...Bancolombia S.A. se permite informar que NOMBRE...
 * Cuenta de ahorros 41200025782 2019-02-26 Activo *****".
 */
export class BancolombiaBanco implements BancoMatcher {
  detecta(texto: string): boolean {
    return /bancolombia/i.test(texto);
  }

  extrae(texto: string): CertificadoBancarioDto {
    return {
      entidadBancaria: 'BANCOLOMBIA',
      tipoCuenta: tipoCuentaDesdeTexto(texto),
      numeroCuenta: this.numeroCuenta(texto),
    };
  }

  /** El número de cuenta es la primera secuencia larga de dígitos tras el tipo de cuenta. */
  private numeroCuenta(texto: string): string | null {
    const match = texto.match(
      /cuenta\s+(?:de\s+)?(?:ahorros?|corriente)\s*[:#]?\s*(\d{8,17})/i,
    );
    return match ? match[1] : null;
  }
}
