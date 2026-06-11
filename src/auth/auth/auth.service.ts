import {
  Injectable,
  UnauthorizedException,
  ConflictException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../../prisma/prisma/prisma.service';
import { LoginDto } from '../dto/login.dto';
import { CreateUserDto } from '../dto/create-user.dto';
import { DevTokenDto } from '../dto/dev-token.dto';
import { CambiarPasswordDto } from '../dto/cambiar-password.dto';
import { JwtPayload, Rol } from '../interfaces/jwt-payload.interface';

@Injectable()
export class AuthService {
  constructor(
    private readonly jwt: JwtService,
    private readonly prisma: PrismaService,
  ) {}

  async login(dto: LoginDto) {
    const user = await this.prisma.usuario.findUnique({
      where: { username: dto.username },
    });

    if (!user || !user.activo) {
      throw new UnauthorizedException('Credenciales inválidas');
    }

    const passwordMatch = await bcrypt.compare(dto.password, user.passwordHash);
    if (!passwordMatch) {
      throw new UnauthorizedException('Credenciales inválidas');
    }

    const payload: JwtPayload = {
      sub: String(user.id),
      nombre: user.nombre,
      codigoTercero: user.codigoTercero,
      userIdentification: user.userIdentification,
      rol: user.rol as Rol,
      mustChangePassword: user.mustChangePassword,
    };

    return {
      accessToken: this.jwt.sign(payload),
      user: {
        nombre: user.nombre,
        codigoTercero: user.codigoTercero,
        rol: user.rol,
        mustChangePassword: user.mustChangePassword,
      },
    };
  }

  async createUser(dto: CreateUserDto) {
    const passwordHash = await bcrypt.hash(dto.password, 10);

    try {
      const user = await this.prisma.usuario.create({
        data: {
          username: dto.username,
          passwordHash,
          nombre: dto.nombre,
          email: dto.email,
          codigoTercero: dto.codigoTercero,
          userIdentification: dto.userIdentification,
          rol: dto.rol,
        },
      });

      const { passwordHash: _, ...result } = user;
      return result;
    } catch {
      throw new ConflictException('El username o email ya está en uso');
    }
  }

  /**
   * Cambia la contraseña del usuario autenticado. Valida la contraseña actual,
   * baja el flag `mustChangePassword` y emite un token nuevo ya habilitado.
   */
  async cambiarPassword(userId: string, dto: CambiarPasswordDto) {
    const user = await this.prisma.usuario.findUnique({
      where: { id: BigInt(userId) },
    });

    if (!user || !user.activo) {
      throw new UnauthorizedException('Usuario no encontrado.');
    }

    const passwordMatch = await bcrypt.compare(
      dto.passwordActual,
      user.passwordHash,
    );
    if (!passwordMatch) {
      throw new UnauthorizedException('La contraseña actual es incorrecta.');
    }

    if (dto.passwordActual === dto.passwordNueva) {
      throw new BadRequestException(
        'La nueva contraseña debe ser distinta de la actual.',
      );
    }

    const passwordHash = await bcrypt.hash(dto.passwordNueva, 10);
    const actualizado = await this.prisma.usuario.update({
      where: { id: user.id },
      data: { passwordHash, mustChangePassword: false },
    });

    const payload: JwtPayload = {
      sub: String(actualizado.id),
      nombre: actualizado.nombre,
      codigoTercero: actualizado.codigoTercero,
      userIdentification: actualizado.userIdentification,
      rol: actualizado.rol as Rol,
      mustChangePassword: false,
    };

    return {
      mensaje: 'Contraseña actualizada correctamente.',
      accessToken: this.jwt.sign(payload),
    };
  }

  devToken(dto: DevTokenDto): { accessToken: string } {
    if (process.env.NODE_ENV !== 'development') {
      throw new ForbiddenException('Solo disponible en entorno de desarrollo');
    }

    const payload: JwtPayload = {
      sub: `dev-${dto.rol.toLowerCase()}-${Date.now()}`,
      nombre: dto.nombre,
      userIdentification: dto.userIdentification ?? dto.codigoTercero,
      codigoTercero: dto.codigoTercero,
      rol: dto.rol,
      mustChangePassword: false,
    };

    return { accessToken: this.jwt.sign(payload) };
  }
}
