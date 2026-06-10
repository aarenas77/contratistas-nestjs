export enum Rol {
  CONTRATISTA = 'CONTRATISTA',
  SUPERVISOR = 'SUPERVISOR',
  APROBADOR = 'APROBADOR',
  ADMINISTRADOR = 'ADMINISTRADOR',
}

export interface JwtPayload {
  sub: string;
  nombre: string;
  codigoTercero: string;
  userIdentification: string;
  rol: Rol;
}
