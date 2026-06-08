import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsEnum, IsOptional, IsEmail, MinLength } from 'class-validator';
import { Rol } from '../interfaces/jwt-payload.interface';

export class CreateUserDto {
  @ApiProperty({ example: 'maria.supervisora' })
  @IsString()
  username: string;

  @ApiProperty({ example: 'Contrasena123!' })
  @IsString()
  @MinLength(6)
  password: string;

  @ApiProperty({ example: 'María Supervisora' })
  @IsString()
  nombre: string;

  @ApiProperty({ example: 'maria@empresa.com', required: false })
  @IsOptional()
  @IsEmail()
  email?: string;

  @ApiProperty({ example: '99999', description: 'Código emitido por el sistema de terceros' })
  @IsString()
  codigoTercero: string;

  @ApiProperty({ example: '12345678', description: 'Cédula o NIT' })
  @IsString()
  userIdentification: string;

  @ApiProperty({ enum: Rol, example: Rol.SUPERVISOR })
  @IsEnum(Rol)
  rol: Rol;
}
