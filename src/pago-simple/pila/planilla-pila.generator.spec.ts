import { PlanillaPilaGeneratorService } from './planilla-pila.generator';
import { PlanillaPilaException } from './planilla-pila.exception';
import { GenerarPlanillaSeguridadSocialCommand } from './planilla-pila.types';

function comandoBase(): GenerarPlanillaSeguridadSocialCommand {
  return {
    aportante: {
      tipoDocumento: 'CC',
      numeroDocumento: '123456789',
      digitoVerificacion: 0,
      nombreCompleto: null,
      primerNombre: 'JUAN',
      segundoNombre: 'CARLOS',
      primerApellido: 'PEREZ',
      segundoApellido: 'GOMEZ',
      codigoDepartamento: '05',
      codigoMunicipio: '05001',
      codigoArl: '14-11',
    },
    periodoPago: '2026-06',
    salario: 2000000,
    numeroRadicacion: null,
    actividadEconomicaRiesgos: '0951000',
    claseRiesgo: 1,
    codigoAfp: '230201',
    codigoEps: 'EPS010',
    codigoCcf: '',
  };
}

describe('PlanillaPilaGeneratorService', () => {
  const generator = new PlanillaPilaGeneratorService();

  it('genera encabezado de 359 y detalle de 693 separados por salto de linea', () => {
    const archivo = generator.generar(comandoBase());
    const [encabezado, detalle, ...resto] = archivo.contenido.split('\n');

    expect(resto).toHaveLength(0);
    expect(encabezado).toHaveLength(359);
    expect(detalle).toHaveLength(693);
  });

  it('arma el nombre del archivo como {tipoDoc}{numeroDoc}_{periodoSinGuiones}.txt', () => {
    expect(generator.generar(comandoBase()).nombreArchivo).toBe(
      'CC123456789_202606.txt',
    );
  });

  it('escribe la cabecera fija, el nombre y el documento en sus posiciones', () => {
    const encabezado = generator.generar(comandoBase()).contenido.split('\n')[0];

    // "01" + modalidad "1" + number(1,4)
    expect(encabezado.startsWith('0110001')).toBe(true);
    // nombre completo (posiciones 8-207)
    expect(encabezado.substring(7, 30)).toBe('JUAN CARLOS PEREZ GOMEZ');
    // tipo documento (208-209) y numero documento (210-225)
    expect(encabezado.substring(207, 209)).toBe('CC');
    expect(encabezado.substring(209, 225)).toBe('123456789       ');
    // doble periodo de pago (305-311 y 312-318)
    expect(encabezado.substring(304, 311)).toBe('2026-06');
    expect(encabezado.substring(311, 318)).toBe('2026-06');
  });

  it('calcula IBC, tarifas y aportes con el redondeo PILA', () => {
    const detalle = generator.generar(comandoBase()).contenido.split('\n')[1];

    // salario (192-200) e IBC pension (202-210)
    expect(detalle.substring(191, 200)).toBe('002000000');
    expect(detalle.substring(201, 210)).toBe('002000000');
    // tarifa y aporte pension: 2.000.000 * 0.16 = 320.000
    expect(detalle.substring(237, 244)).toBe('0.16000');
    expect(detalle.substring(244, 253)).toBe('000320000');
    // tarifa y aporte salud: 2.000.000 * 0.125 = 250.000
    expect(detalle.substring(307, 314)).toBe('0.12500');
    expect(detalle.substring(314, 323)).toBe('000250000');
    // tarifa y aporte ARL clase 1: 2.000.000 * 0.00522 = 10.440 -> sube al
    // siguiente multiplo de 100 = 10.500
    expect(detalle.substring(380, 389)).toBe('0.0052200');
    expect(detalle.substring(398, 407)).toBe('000010500');
  });

  it('normaliza departamento, municipio (3 digitos) y actividad economica', () => {
    const detalle = generator.generar(comandoBase()).contenido.split('\n')[1];

    // departamento (32-33) y municipio PILA de 3 digitos (34-36)
    expect(detalle.substring(31, 33)).toBe('05');
    expect(detalle.substring(33, 36)).toBe('001');
    // exonerado (506) -> "N" por defecto, clase riesgo (513)
    expect(detalle.substring(505, 506)).toBe('N');
    expect(detalle.substring(512, 513)).toBe('1');
    // actividad economica de riesgos (687-693)
    expect(detalle.substring(686, 693)).toBe('0951000');
  });

  it('marca exonerado con "S" cuando el comando lo indica', () => {
    const detalle = generator
      .generar({ ...comandoBase(), exonerado: true })
      .contenido.split('\n')[1];
    expect(detalle.substring(505, 506)).toBe('S');
  });

  it('aplica la tarifa ARL segun la clase de riesgo', () => {
    const detalle = generator
      .generar({ ...comandoBase(), claseRiesgo: 5 })
      .contenido.split('\n')[1];
    // clase 5 -> 0.0696000 ; 2.000.000 * 0.0696 = 139.200
    expect(detalle.substring(380, 389)).toBe('0.0696000');
    expect(detalle.substring(398, 407)).toBe('000139200');
  });

  it('exige el primer nombre del aportante', () => {
    const comando = comandoBase();
    comando.aportante.primerNombre = null;
    expect(() => generator.generar(comando)).toThrow(PlanillaPilaException);
  });

  it('exige periodo de pago en formato yyyy-MM', () => {
    expect(() =>
      generator.generar({ ...comandoBase(), periodoPago: '202606' }),
    ).toThrow('formato yyyy-MM');
  });

  it('exige salario mayor a cero', () => {
    expect(() =>
      generator.generar({ ...comandoBase(), salario: 0 }),
    ).toThrow('mayor a cero');
  });
});
