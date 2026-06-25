/**
 * PagoSimple entrega fechas en `yyyyMMdd` o `yyyy-MM-dd`. Devuelve `null` ante
 * cualquier valor ausente o no reconocido (nunca lanza).
 */
export function parsearFechaPagoSimple(valor?: string | null): Date | null {
  if (!valor) return null;
  const limpio = valor.trim();

  const compacto = /^(\d{4})(\d{2})(\d{2})$/.exec(limpio);
  const guiones = /^(\d{4})-(\d{2})-(\d{2})$/.exec(limpio);
  const m = compacto ?? guiones;
  if (!m) return null;

  const [, anio, mes, dia] = m;
  const fecha = new Date(Date.UTC(Number(anio), Number(mes) - 1, Number(dia)));
  // Rechaza fechas imposibles (p.ej. mes 13) que Date "normalizaría".
  if (
    fecha.getUTCFullYear() !== Number(anio) ||
    fecha.getUTCMonth() !== Number(mes) - 1 ||
    fecha.getUTCDate() !== Number(dia)
  ) {
    return null;
  }
  return fecha;
}
