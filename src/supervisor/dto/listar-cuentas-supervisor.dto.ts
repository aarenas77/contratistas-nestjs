import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsInt, IsOptional, Min } from 'class-validator';

export class ListarCuentasSupervisorDto {
  @ApiPropertyOptional({ example: 39492, description: 'Filtrar por código de contrato' })
  @IsOptional()
  @IsInt()
  @Type(() => Number)
  codigoContrato?: number;

  @ApiPropertyOptional({ example: 0 })
  @IsOptional()
  @IsInt()
  @Min(0)
  @Type(() => Number)
  page?: number;

  @ApiPropertyOptional({ example: 10 })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Type(() => Number)
  size?: number;
}
