import { ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { PasswordChangeGuard } from './password-change.guard';

function contextConUsuario(user: unknown): ExecutionContext {
  return {
    getHandler: () => ({}),
    getClass: () => ({}),
    switchToHttp: () => ({
      getRequest: () => ({ user }),
    }),
  } as unknown as ExecutionContext;
}

describe('PasswordChangeGuard', () => {
  let reflector: Reflector;
  let guard: PasswordChangeGuard;

  beforeEach(() => {
    reflector = new Reflector();
    guard = new PasswordChangeGuard(reflector);
  });

  it('bloquea cuando el usuario debe cambiar la contraseña y la ruta no está exenta', () => {
    jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(undefined);

    expect(() =>
      guard.canActivate(contextConUsuario({ mustChangePassword: true })),
    ).toThrow(ForbiddenException);
  });

  it('permite cuando el usuario no tiene cambio pendiente', () => {
    jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(undefined);

    expect(
      guard.canActivate(contextConUsuario({ mustChangePassword: false })),
    ).toBe(true);
  });

  it('permite rutas exentas aunque haya cambio pendiente', () => {
    jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(true);

    expect(
      guard.canActivate(contextConUsuario({ mustChangePassword: true })),
    ).toBe(true);
  });
});
