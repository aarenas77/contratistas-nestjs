import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsEnum, IsOptional, IsNumber } from 'class-validator';
import { Rol } from '../interfaces/jwt-payload.interface';

export class DevTokenDto {
  @ApiProperty({ enum: Rol, example: Rol.ADMINISTRADOR })
  @IsEnum(Rol)
  rol: Rol;

  @ApiProperty({ example: 'María Supervisora' })
  @IsString()
  nombre: string;

  @ApiProperty({ example: '99999' })
  @IsString()
  codigoTercero: string;

  @ApiProperty({ example: '12345678', required: false })
  @IsOptional()
  @IsString()
  userIdentification?: string;

  @ApiProperty({ example: 1, required: false })
  @IsOptional()
  @IsNumber()
  companyId?: number;

  @ApiProperty({ example: 1, required: false })
  @IsOptional()
  @IsNumber()
  subsidiaryId?: number;
}
