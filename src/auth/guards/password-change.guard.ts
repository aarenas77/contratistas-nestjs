import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { IS_PUBLIC_KEY } from '../decorators/public.decorator';
import { ALLOW_PASSWORD_CHANGE_KEY } from '../decorators/allow-password-change.decorator';
import { JwtPayload } from '../interfaces/jwt-payload.interface';

/**
 * Bloquea cualquier ruta protegida mientras el usuario tenga una contraseña
 * temporal pendiente de cambio (`mustChangePassword`). Se exceptúan las rutas
 * públicas y las marcadas con `@AllowPasswordChange()`.
 */
@Injectable()
export class PasswordChangeGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const exento = this.reflector.getAllAndOverride<boolean>(
      ALLOW_PASSWORD_CHANGE_KEY,
      [context.getHandler(), context.getClass()],
    );
    if (exento) return true;

    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (isPublic) return true;

    const user = context.switchToHttp().getRequest().user as
      | JwtPayload
      | undefined;

    if (user?.mustChangePassword) {
      throw new ForbiddenException(
        'Debe cambiar su contraseña temporal antes de continuar.',
      );
    }

    return true;
  }
}
