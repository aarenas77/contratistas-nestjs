/**
 * Modelos de comando para generar el archivo PILA. Son el equivalente directo
 * de `GenerarPlanillaSeguridadSocialCommand` y `AportanteIndependienteCommand`
 * del backend legacy. Los datos de identidad/ubicación viven en `aportante`;
 * los datos financieros y de entidades viven en el comando (se resuelven en el
 * servidor a partir de la seguridad social del contratista).
 */

export interface AportanteIndependienteCommand {
  tipoDocumento?: string | null;
  numeroDocumento: string;
  digitoVerificacion?: number | null;
  nombreCompleto?: string | null;
  primerNombre?: string | null;
  segundoNombre?: string | null;
  primerApellido?: string | null;
  segundoApellido?: string | null;
  codigoDepartamento: string;
  codigoMunicipio: string;
  /** Código ARL del aportante en formato PagoSimple (ej. `14-11`). */
  codigoArl?: string | null;
}

export interface GenerarPlanillaSeguridadSocialCommand {
  aportante: AportanteIndependienteCommand;
  /** Periodo de pago en formato `yyyy-MM`. */
  periodoPago: string;
  /** IBC / salario base; se redondea a entero (HALF_UP) antes de usarse. */
  salario: number;
  numeroRadicacion?: string | null;
  modalidadPlanilla?: string | null;
  tipoPlanilla?: string | null;
  formaPresentacion?: string | null;
  tipoAportante?: string | null;
  codigoOperador?: string | null;
  tipoCotizante?: string | null;
  subtipoCotizante?: string | null;
  diasCotizados?: number | null;
  claseRiesgo?: number | null;
  codigoAfp: string;
  codigoEps: string;
  codigoCcf?: string | null;
  exonerado?: boolean | null;
  /** Actividad económica de riesgos, numérica de máximo 7 dígitos. */
  actividadEconomicaRiesgos: string;
}

/** Archivo plano PILA generado: nombre y contenido (encabezado + "\n" + detalle). */
export interface PlanillaPilaArchivo {
  nombreArchivo: string;
  contenido: string;
}
