import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsDateString, IsEnum, IsNumber, IsOptional, IsPositive, IsString, MaxLength } from 'class-validator';

export enum CodigoConcepto {
  ALIMENTACION = 'ALIMENTACION',
  TRANSPORTE = 'TRANSPORTE',
  ALOJAMIENTO = 'ALOJAMIENTO',
  OTROS = 'OTROS',
}

export class CrearGastoDto {
  @ApiProperty({ enum: CodigoConcepto })
  @IsEnum(CodigoConcepto)
  codigoConcepto: CodigoConcepto;

  @ApiProperty({ example: 50000 })
  @IsNumber()
  @IsPositive()
  @Type(() => Number)
  valor: number;

  @ApiProperty({ example: '2026-01-15' })
  @IsDateString()
  fecha: string;

  @ApiPropertyOptional({ example: 'Transporte al municipio de intervención' })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  observacion?: string;

  @ApiProperty({ type: 'string', format: 'binary', description: 'Evidencia del gasto (max 10 MB)' })
  archivo: any;
}
