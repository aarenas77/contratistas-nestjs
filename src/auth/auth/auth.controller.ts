import { Controller, Post, Body, HttpCode, Get } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { AuthService } from './auth.service';
import { LoginDto } from '../dto/login.dto';
import { CreateUserDto } from '../dto/create-user.dto';
import { DevTokenDto } from '../dto/dev-token.dto';
import { Public } from '../decorators/public.decorator';
import { Roles } from '../decorators/roles.decorator';
import { CurrentUser } from '../decorators/current-user.decorator';
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
    summary: 'Crear usuario (requiere rol APROBADOR)',
    description:
      'Crea contratistas, supervisores o aprobadores. ' +
      'Para el primer usuario usa POST /auth/dev-token para obtener un token APROBADOR temporal.',
  })
  createUser(@Body() dto: CreateUserDto) {
    return this.service.createUser(dto);
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

  @Get('me')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Retorna el usuario autenticado desde el token' })
  me(@CurrentUser() user: JwtPayload) {
    return user;
  }
}
