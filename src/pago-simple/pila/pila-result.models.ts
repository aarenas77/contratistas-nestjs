/**
 * Modelos de dominio (ya mapeados, sin la forma cruda del proveedor) que
 * devuelve el flujo de planilla PILA. Equivalen a `AportanteIndependiente`,
 * `ValidacionPlanillaPila`, `TotalesPlanillaPila` y `UrlPagoPlanillaPila`.
 */

/** Aportante vinculado/consultado en PagoSimple, con su token de autorización. */
export interface AportanteVinculado {
  idAportante: number | null;
  tipoDocumento: string;
  numeroDocumento: string;
  nombre: string | null;
  estado: string | null;
  authToken: string | null;
}

export interface PlanillaValidationDetail {
  code: string | null;
  description: string | null;
}

export interface PlanillaValidation {
  payrollCode: number | null;
  payrollNumber: number | null;
  numberErrorsContributor: number;
  numberErrorsCompany: number;
  numberWarnings: number;
  detailErrorsContributor: PlanillaValidationDetail[];
  detailErrorsCompany: PlanillaValidationDetail[];
  detailWarnings: PlanillaValidationDetail[];
}

export interface ValidacionPlanillaPila {
  validationStatus: string | null;
  payrollValidations: PlanillaValidation[];
}

export interface TotalAdministradorPlanilla {
  identification: string | null;
  verificationDigit: number | null;
  administratorCode: string | null;
  administratorName: string | null;
  administratorType: string | null;
  affiliates: string | null;
  totalWithoutArrear: number;
  arrearValue: number;
  total: number;
}

export interface TotalesPlanillaPila {
  documentType: string | null;
  documentNumber: string | null;
  verificationDigit: string | null;
  reportDate: string | null;
  contributorName: string | null;
  payrollNumber: number | null;
  quotePeriod: string | null;
  servicePeriod: string | null;
  affiliatesNumber: number | null;
  limitDate: string | null;
  payrollStatus: string | null;
  administratorTotalValue: TotalAdministradorPlanilla[];
  totalWithoutArrear: number;
  arrearValue: number;
  totalToPay: number;
}

export interface UrlPagoPlanillaPila {
  urlPago: string | null;
  mensaje: string | null;
  descripcion: string | null;
}
