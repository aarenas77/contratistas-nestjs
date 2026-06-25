import { DatosAportante } from '../aportante/aportante-source.gateway';
import { PlanillaPilaArchivo } from './planilla-pila.types';
import {
  AportanteVinculado,
  TotalesPlanillaPila,
  UrlPagoPlanillaPila,
  ValidacionPlanillaPila,
} from './pila-result.models';

/**
 * Frontera con PagoSimple PILA para el flujo de planilla. Encapsula el login,
 * la sesión y la autorización del aportante (igual que el adapter legacy hace
 * por caso de uso), exponiendo operaciones de alto nivel. Se inyecta por token
 * para intercambiar la implementación HTTP real por un mock según el ambiente.
 */
export const PAGO_SIMPLE_PILA_GATEWAY = Symbol('PAGO_SIMPLE_PILA_GATEWAY');

export interface ValidarPlanillaInput {
  archivo: PlanillaPilaArchivo;
  datos: DatosAportante;
  isUgpp: boolean;
  isNoveltiesPlanillaN: boolean;
  fileType: string;
}

export interface PagoSimplePilaGateway {
  /**
   * Vincula el aportante: si `datos.idAportante` existe lo autoriza y consulta;
   * si no, lo crea, autoriza y consulta. Devuelve el aportante con su
   * `authToken` y el `idAportante` (existente o recién creado).
   */
  vincularAportante(datos: DatosAportante): Promise<AportanteVinculado>;

  /** Valida la planilla a partir del archivo plano PILA generado localmente. */
  validarPlanilla(input: ValidarPlanillaInput): Promise<ValidacionPlanillaPila>;

  /** Consulta los totales de una planilla ya validada. */
  consultarTotales(
    numeroPlanilla: string,
    datos: DatosAportante,
  ): Promise<TotalesPlanillaPila>;

  /** Genera la URL de pago PSE de una planilla. */
  generarUrlPago(
    numeroPlanilla: string,
    datos: DatosAportante,
  ): Promise<UrlPagoPlanillaPila>;
}
