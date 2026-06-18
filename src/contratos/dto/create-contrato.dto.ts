import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsDateString,
  IsEnum,
  IsInt,
  IsNumber,
  IsOptional,
  IsPositive,
  IsString,
} from 'class-validator';

export enum TipoPlazo {
  D = 'D',
  M = 'M',
  A = 'A',
}

export class CreateContratoDto {
  @ApiProperty({ example: '0433-2026', description: 'Número de contrato (consecutivo)' })
  @IsString()
  consecutivo: string;

  @ApiProperty({ example: 'Prestación de servicios profesionales...', description: 'Objeto del contrato' })
  @IsString()
  descripcion: string;

  @ApiProperty({ example: '743', description: 'Código del tercero contratista' })
  @IsString()
  codigoTercero: string;

  @ApiProperty({ example: 16800000, description: 'Valor del contrato' })
  @IsNumber()
  @IsPositive()
  valor: number;

  @ApiProperty({ example: '2026-01-27', description: 'Fecha de elaboración' })
  @IsDateString()
  fechaElaboracion: string;

  @ApiProperty({ example: 120, description: 'Plazo' })
  @IsInt()
  @IsPositive()
  @Type(() => Number)
  plazoDias: number;

  @ApiProperty({ enum: TipoPlazo, example: TipoPlazo.D, description: 'Tipo de plazo: D=Días, M=Meses, A=Años' })
  @IsEnum(TipoPlazo)
  tipoPlazo: TipoPlazo;

  @ApiProperty({ example: 617, description: 'Compromiso (consecutivo de compromiso)' })
  @IsInt()
  @Type(() => Number)
  consecutivoCompromiso: number;

  @ApiPropertyOptional({ example: 9, description: 'Centro de costos (código de dependencia)' })
  @IsOptional()
  @IsInt()
  @Type(() => Number)
  codigoDependencia?: number;

  @ApiPropertyOptional({ example: '2026-02-02', description: 'Fecha de inicio' })
  @IsOptional()
  @IsDateString()
  fechaInicioSecop?: string;

  @ApiPropertyOptional({ example: '2026-06-03', description: 'Fecha de fin' })
  @IsOptional()
  @IsDateString()
  fechaFin?: string;

  @ApiPropertyOptional({ example: '2026-01-27', description: 'Fecha de aprobación' })
  @IsOptional()
  @IsDateString()
  fechaAprobacion?: string;

  @ApiPropertyOptional({ example: '10034', description: 'Código del tercero supervisor' })
  @IsOptional()
  @IsString()
  idSupervisor?: string;
}
