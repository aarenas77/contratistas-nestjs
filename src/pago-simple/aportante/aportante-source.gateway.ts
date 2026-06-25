/**
 * Puerto que resuelve los datos del aportante necesarios para la planilla PILA.
 * Equivale a `AportanteIndependientePagoSimpleRepositoryPort` del legacy. La
 * implementación real leerá las tablas replicadas desde Oracle
 * (`MAESTRO_TERCEROS`, `SEGURIDAD_SOCIAL_CONTRATISTA`, catálogos EPS/AFP/CCF/ARL);
 * mientras esas tablas no existan se usa un mock determinista. Se inyecta por
 * token, igual que `PAGO_SIMPLE_GATEWAY` y `PRESUPUESTO_GATEWAY`.
 */
export const APORTANTE_SOURCE_GATEWAY = Symbol('APORTANTE_SOURCE_GATEWAY');

/**
 * Datos del aportante ya normalizados al formato PagoSimple/PILA. Es el
 * equivalente de `DatosAportanteIndependientePagoSimple`. Identidad y ubicación
 * + datos financieros y de entidades (resueltos desde la seguridad social).
 */
export interface DatosAportante {
  codigoTercero: string;
  /** `MAESTRO_TERCEROS.CODIGO_APORTANTE`; null si aún no se ha vinculado. */
  idAportante: number | null;
  tipoDocumento: string;
  numeroDocumento: string;
  digitoVerificacion: number;
  nombreCompleto: string | null;
  primerNombre: string | null;
  segundoNombre: string | null;
  primerApellido: string | null;
  segundoApellido: string | null;
  codigoDepartamento: string | null;
  codigoMunicipio: string | null;
  email: string | null;
  telefono: string | null;
  celular: string | null;
  direccion: string | null;
  codigoActividadEconomica: string | null;
  codigoArl: string | null;
  ibc: number | null;
  codigoAfp: string | null;
  codigoEps: string | null;
  codigoCcf: string | null;
  claseRiesgo: number | null;
  tipoCotizante: string | null;
  subtipoCotizante: string | null;
  actividadEconomicaRiesgos: string | null;
}

export interface AportanteSourceGateway {
  /** Resuelve los datos del aportante por código de tercero; null si no existe. */
  obtenerDatosAportante(codigoTercero: string): Promise<DatosAportante | null>;
  /** Persiste el `idAportante` obtenido de PagoSimple tras crear el aportante. */
  guardarIdAportante(codigoTercero: string, idAportante: number): Promise<void>;
}
