/**
 * Frontera externa con PagoSimple para la consulta de seguridad social
 * (EPS/AFP) vía BDUA/RUAF. Igual que `PRESUPUESTO_GATEWAY`, se inyecta por token
 * para poder intercambiar la implementación real (HTTP) por un mock según el
 * ambiente, sin que los consumidores se enteren.
 */
export const PAGO_SIMPLE_GATEWAY = Symbol('PAGO_SIMPLE_GATEWAY');

/** Origen de cada dato de seguridad social, para trazabilidad. */
export type OrigenSeguridadSocial = 'PAGOSIMPLE' | 'MANUAL';

/**
 * Foto del estado de seguridad social devuelta por PagoSimple, ya mapeada al
 * dominio (sin la forma externa del proveedor). Cualquier campo puede faltar.
 */
export interface SeguridadSocialSnapshot {
  /** EPS — `data[0].bdua_administrator_name`. */
  eps: string | null;
  /** Fecha de afiliación a EPS — `data[0].bdua_affiliate_date`. */
  epsFechaAfiliacion: Date | null;
  /** AFP — `data[0].ruaf_administrator_name`. */
  afp: string | null;
  /** Fecha de afiliación a AFP — `data[0].ruaf_affiliate_date`. */
  afpFechaAfiliacion: Date | null;
  /** Tipo de afiliado / régimen — `data[0].affiliate_type`. */
  tipoAfiliado: string | null;
  origen: 'PAGOSIMPLE';
}

export interface PagoSimpleGateway {
  /**
   * Consulta seguridad social por documento. Devuelve `null` cuando no hay
   * datos o cuando el proveedor falla: la consulta nunca debe romper el flujo
   * que la invoca.
   */
  consultarSeguridadSocial(
    tipoDocumento: string,
    documento: string,
  ): Promise<SeguridadSocialSnapshot | null>;
}
