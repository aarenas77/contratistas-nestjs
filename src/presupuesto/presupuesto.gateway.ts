/**
 * Costura de integración con el módulo de presupuesto. Hoy la implementa
 * `PresupuestoLocalGateway` (lee de la tabla `precarga_terceros`); cuando exista
 * la integración real, basta con cambiar el binding del token y borrar la tabla.
 */
export const PRESUPUESTO_GATEWAY = Symbol('PRESUPUESTO_GATEWAY');

export interface TerceroPresupuesto {
  codigoTercero: string;
  nombre: string | null;
}

export interface PresupuestoGateway {
  obtenerTerceroPorIdentificacion(
    numeroIdentificacion: string,
  ): Promise<TerceroPresupuesto | null>;
}
