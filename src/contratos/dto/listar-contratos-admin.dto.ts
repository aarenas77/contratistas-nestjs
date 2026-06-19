import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsInt, IsString, Min, Max, IsEnum } from 'class-validator';
import { Type } from 'class-transformer';
import { EstadoContrato } from '../estado-contrato.enum';

export class ListarContratosAdminDto {
  @ApiPropertyOptional({ example: 0, description: 'Número de página (base 0)', default: 0 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  page?: number = 0;

  @ApiPropertyOptional({ example: 10, description: 'Registros por página', default: 10 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(50)
  size?: number = 10;

  @ApiPropertyOptional({ example: '743', description: 'Filtrar por código de tercero contratista' })
  @IsOptional()
  @IsString()
  codigoTercero?: string;

  @ApiPropertyOptional({
    enum: EstadoContrato,
    example: EstadoContrato.ELABORADO,
    description: 'Filtrar por estado del contrato',
  })
  @IsOptional()
  @IsEnum(EstadoContrato)
  estado?: EstadoContrato;
}
