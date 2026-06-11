import { SetMetadata } from '@nestjs/common';

export const ALLOW_PASSWORD_CHANGE_KEY = 'allowPasswordChange';

/**
 * Exime una ruta del `PasswordChangeGuard`: permite ejecutarla aunque el usuario
 * todavía tenga la contraseña temporal pendiente de cambio (p. ej. el propio
 * endpoint de cambio de contraseña o la consulta de perfil).
 */
export const AllowPasswordChange = () =>
  SetMetadata(ALLOW_PASSWORD_CHANGE_KEY, true);
