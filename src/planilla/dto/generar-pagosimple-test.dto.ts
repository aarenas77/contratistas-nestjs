import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsNumber, IsOptional, IsPositive, IsString } from 'class-validator';

export class GenerarPagoSimpleTestDto {
  @ApiPropertyOptional({ example: '123456789', description: 'Cédula o documento del aportante para el mock' })
  @IsOptional()
  @IsString()
  cedula?: string;

  @ApiPropertyOptional({ example: 'Juan Perez', description: 'Nombre del aportante para el mock' })
  @IsOptional()
  @IsString()
  nombre?: string;

  @ApiPropertyOptional({
    example: 2000000,
    description: 'Base de cotización a usar cuando la planilla todavía no existe',
  })
  @IsOptional()
  @IsNumber()
  @IsPositive()
  @Type(() => Number)
  ingresoBaseCotizacion?: number;
}
