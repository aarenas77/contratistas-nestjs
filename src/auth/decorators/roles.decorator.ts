import { SetMetadata } from '@nestjs/common';
import { Rol } from '../interfaces/jwt-payload.interface';

export const ROLES_KEY = 'roles';
export const Roles = (...roles: Rol[]) => {
  const requiredRoles = roles.includes(Rol.ADMINISTRADOR)
    ? roles
    : [...roles, Rol.ADMINISTRADOR];
  return SetMetadata(ROLES_KEY, requiredRoles);
};
