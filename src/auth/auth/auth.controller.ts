import { Controller, Post, Body, HttpCode, Get } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { AuthService } from './auth.service';
import { LoginDto } from '../dto/login.dto';
import { CreateUserDto } from '../dto/create-user.dto';
import { DevTokenDto } from '../dto/dev-token.dto';
import { CambiarPasswordDto } from '../dto/cambiar-password.dto';
import { Public } from '../decorators/public.decorator';
import { Roles } from '../decorators/roles.decorator';
import { CurrentUser } from '../decorators/current-user.decorator';
import { AllowPasswordChange } from '../decorators/allow-password-change.decorator';
import { Rol } from '../interfaces/jwt-payload.interface';
import type { JwtPayload } from '../interfaces/jwt-payload.interface';

@ApiTags('Auth')
@Controller('auth')
export class AuthController {
  constructor(private readonly service: AuthService) {}

  @Post('login')
  @Public()
  @HttpCode(200)
  @ApiOperation({ summary: 'Login con usuario y contraseña propios' })
  login(@Body() dto: LoginDto) {
    return this.service.login(dto);
  }

  @Post('usuarios')
  @Roles(Rol.APROBADOR)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Crear usuario (requiere rol APROBADOR o ADMINISTRADOR)',
    description:
      'Crea contratistas, supervisores, aprobadores o administradores. ' +
      'Para el primer usuario usa POST /auth/dev-token para obtener un token temporal.',
  })
  createUser(@Body() dto: CreateUserDto) {
    return this.service.createUser(dto);
  }

  @Get('usuarios/contratistas')
  @Roles(Rol.ABOGADO)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Listar usuarios con rol CONTRATISTA',
    description:
      'Devuelve los usuarios activos con rol CONTRATISTA para usarlos en el formulario de creación de contratos.',
  })
  listarContratistas() {
    return this.service.listarContratistas();
  }

  @Post('dev-token')
  @Public()
  @HttpCode(200)
  @ApiOperation({
    summary: '[SOLO DEV] Genera un token con cualquier rol sin autenticación',
    description: 'Solo funciona cuando NODE_ENV=development.',
  })
  devToken(@Body() dto: DevTokenDto) {
    return this.service.devToken(dto);
  }

  @Post('cambiar-password')
  @AllowPasswordChange()
  @HttpCode(200)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Cambia la contraseña del usuario autenticado',
    description:
      'Valida la contraseña actual, exige una nueva con buena complejidad, ' +
      'desactiva el cambio obligatorio y devuelve un token nuevo ya habilitado.',
  })
  cambiarPassword(
    @CurrentUser() user: JwtPayload,
    @Body() dto: CambiarPasswordDto,
  ) {
    return this.service.cambiarPassword(user.sub, dto);
  }

  @Get('me')
  @AllowPasswordChange()
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Retorna el usuario autenticado desde el token' })
  me(@CurrentUser() user: JwtPayload) {
    return user;
  }
}
