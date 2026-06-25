import { parsearFechaPagoSimple } from './pago-simple.fechas';

describe('parsearFechaPagoSimple', () => {
  it('parsea formato yyyyMMdd', () => {
    expect(parsearFechaPagoSimple('20200115')).toEqual(
      new Date(Date.UTC(2020, 0, 15)),
    );
  });

  it('parsea formato yyyy-MM-dd', () => {
    expect(parsearFechaPagoSimple('2020-01-15')).toEqual(
      new Date(Date.UTC(2020, 0, 15)),
    );
  });

  it('devuelve null para vacío o nulo', () => {
    expect(parsearFechaPagoSimple(null)).toBeNull();
    expect(parsearFechaPagoSimple(undefined)).toBeNull();
    expect(parsearFechaPagoSimple('')).toBeNull();
  });

  it('devuelve null para formatos no reconocidos', () => {
    expect(parsearFechaPagoSimple('15/01/2020')).toBeNull();
    expect(parsearFechaPagoSimple('abc')).toBeNull();
  });

  it('devuelve null para fechas imposibles', () => {
    expect(parsearFechaPagoSimple('20201301')).toBeNull(); // mes 13
    expect(parsearFechaPagoSimple('2020-02-30')).toBeNull(); // 30 de feb
  });
});
