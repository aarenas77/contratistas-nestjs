import {
  Injectable,
  UnauthorizedException,
  ConflictException,
  ForbiddenException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../../prisma/prisma/prisma.service';
import { LoginDto } from '../dto/login.dto';
import { CreateUserDto } from '../dto/create-user.dto';
import { DevTokenDto } from '../dto/dev-token.dto';
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
    };

    return {
      accessToken: this.jwt.sign(payload),
      user: {
        nombre: user.nombre,
        codigoTercero: user.codigoTercero,
        rol: user.rol,
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
    };

    return { accessToken: this.jwt.sign(payload) };
  }
}
