import { CertificadoBancarioParser } from './certificado-bancario.parser';

describe('CertificadoBancarioParser', () => {
  const parser = new CertificadoBancarioParser();

  // Texto representativo de un certificado de Bancolombia con capa de texto.
  // (La muestra real en docs/ es una imagen; este texto refleja su contenido.)
  const bancolombia = [
    'Certificación Bancaria',
    'Miércoles, 03 de junio de 2026',
    'A quien le interese',
    'Bancolombia S.A. se permite informar que ALEJANDRO ARENAS GOMEZ',
    'identificado(a) con CC 1001725743, a la fecha de expedición de esta certificación, tiene con',
    'el Banco los siguientes productos:',
    'Producto No. Producto Fecha Apertura aaaa-mm-dd Estado Saldo',
    'Cuenta de ahorros 41200025782 2019-02-26 Activo *****',
  ].join('\n');

  it('extrae entidad, tipo y número de cuenta de Bancolombia', () => {
    const result = parser.parse(bancolombia);
    expect(result.entidadBancaria).toBe('BANCOLOMBIA');
    expect(result.tipoCuenta).toBe('1');
    expect(result.numeroCuenta).toBe('41200025782');
  });

  it('reconoce cuenta corriente como tipo 2', () => {
    const texto = bancolombia.replace('Cuenta de ahorros', 'Cuenta corriente');
    const result = parser.parse(texto);
    expect(result.tipoCuenta).toBe('2');
    expect(result.numeroCuenta).toBe('41200025782');
  });

  it('banco no reconocido: entidad null pero intenta número genérico', () => {
    const texto =
      'Banco XYZ certifica que el titular tiene la cuenta de ahorros No. 1234567890 activa.';
    const result = parser.parse(texto);
    expect(result.entidadBancaria).toBeNull();
    expect(result.tipoCuenta).toBe('1');
    expect(result.numeroCuenta).toBe('1234567890');
  });
});
