/**
 * Formas crudas de request/response de PagoSimple. Se mantienen separadas del
 * dominio (`SeguridadSocialSnapshot`) a propósito: si el proveedor cambia su
 * contrato, el impacto queda contenido en el gateway HTTP y su mapeo.
 */

export interface PagoSimpleLoginRequest {
  document_type: string;
  document: string;
  password: string;
  nit: string;
  company: string;
  secret_key: string;
}

export interface PagoSimpleSobre<T> {
  success?: boolean;
  code?: number;
  data?: T;
  message?: string;
  description?: string;
}

export interface PagoSimpleLoginData {
  session_token?: string;
  token?: string;
}

export interface BduaRuafRequest {
  document_type: string;
  document: string;
}

export interface BduaRuafRegistro {
  affiliate_type?: string;
  document_type?: string;
  document?: string;
  first_last_name?: string;
  second_last_name?: string;
  first_name?: string;
  second_name?: string;
  bdua_eps_code?: string;
  bdua_administrator_nit?: string;
  bdua_administrator_name?: string;
  bdua_affiliate_date?: string;
  ruaf_afp_code?: string;
  ruaf_administrator_nit?: string;
  ruaf_administrator_name?: string;
  ruaf_affiliate_date?: string;
  is_pensionary?: string;
}

export type PagoSimpleLoginResponse = PagoSimpleSobre<PagoSimpleLoginData>;
export type BduaRuafResponse = PagoSimpleSobre<BduaRuafRegistro[]>;
