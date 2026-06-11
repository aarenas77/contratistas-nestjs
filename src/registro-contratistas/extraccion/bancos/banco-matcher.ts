import { CertificadoBancarioDto } from '../../dto/certificado-bancario.dto';

/**
 * Contrato para agregar soporte de un banco al registro de parsers.
 * Cada banco decide si reconoce el texto del certificado y cómo extraer sus datos.
 */
export interface BancoMatcher {
  /** Devuelve true si el texto corresponde a un certificado de este banco. */
  detecta(texto: string): boolean;
  /** Extrae los datos bancarios del texto del certificado. */
  extrae(texto: string): CertificadoBancarioDto;
}

/** Ahorros → "1", Corriente → "2"; null si no se reconoce. */
export function tipoCuentaDesdeTexto(texto: string): string | null {
  if (/ahorros?/i.test(texto)) return '1';
  if (/corriente/i.test(texto)) return '2';
  return null;
}
