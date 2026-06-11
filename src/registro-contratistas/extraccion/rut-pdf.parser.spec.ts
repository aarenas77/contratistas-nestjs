import { readFileSync } from 'fs';
import { join } from 'path';
import { RutPdfParser } from './rut-pdf.parser';
import { TextItem } from './text-item';

// Items reales capturados de docs/141197188746.pdf (RUT de ALEJANDRO ARENAS GOMEZ).
const items: TextItem[] = JSON.parse(
  readFileSync(
    join(process.cwd(), 'test/fixtures/rut-text-items.json'),
    'utf-8',
  ),
);

describe('RutPdfParser', () => {
  const parser = new RutPdfParser();
  const rut = parser.parse(items);

  it('extrae identificación y dígito de verificación', () => {
    expect(rut.numeroIdentificacion).toBe('1001725743');
    expect(rut.nit).toBe('1001725743');
    expect(rut.codigoVerificacion).toBe(0);
  });

  it('separa correctamente apellidos y nombres (columnas)', () => {
    expect(rut.primerApellido).toBe('ARENAS');
    expect(rut.segundoApellido).toBe('GOMEZ');
    expect(rut.primerNombre).toBe('ALEJANDRO');
    expect(rut.segundoNombre).toBeNull();
  });

  it('extrae tipo de documento y de contribuyente', () => {
    expect(rut.tipoDocumento).toBe('Cédula de Ciudadanía');
    expect(rut.tipoContribuyente).toBe('Persona natural o sucesión ilíquida');
  });

  it('deja razón social y nombre comercial en null para persona natural', () => {
    expect(rut.razonSocial).toBeNull();
    expect(rut.nombreComercial).toBeNull();
  });

  it('extrae ubicación con sus códigos', () => {
    expect(rut.pais).toBe('COLOMBIA');
    expect(rut.codigoPais).toBe('169');
    expect(rut.departamento).toBe('Antioquia');
    expect(rut.codigoDepartamento).toBe('05');
    expect(rut.ciudad).toBe('Rionegro');
  });

  it('extrae dirección, correo y teléfonos', () => {
    expect(rut.direccion).toBe('CR 61 F # 42 - 47 CA Rionegro - Antioquia');
    expect(rut.correoElectronico).toBe('alegando79@hotmail.com');
    expect(rut.telefono1).toBe('3114262647');
    expect(rut.telefono2).toBe('3104946800');
  });

  it('extrae número de formulario y responsabilidades tributarias', () => {
    expect(rut.numeroFormulario).toBe('141197188746');
    expect(rut.responsabilidadesTributarias).toEqual(['05']);
  });

  it('extrae actividad económica principal', () => {
    expect(rut.actividadEconomicaPrincipal).toBe('0010');
  });
});
