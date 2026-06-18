export enum Rol {
  CONTRATISTA = 'CONTRATISTA',
  SUPERVISOR = 'SUPERVISOR',
  APROBADOR = 'APROBADOR',
  ADMINISTRADOR = 'ADMINISTRADOR',
  ABOGADO = 'ABOGADO',
}

export interface JwtPayload {
  sub: string;
  nombre: string;
  codigoTercero: string;
  userIdentification: string;
  rol: Rol;
  mustChangePassword?: boolean;
}
