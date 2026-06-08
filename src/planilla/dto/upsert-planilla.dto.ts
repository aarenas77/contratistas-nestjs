import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsDateString, IsInt, IsNumber, IsPositive, IsString, Min } from 'class-validator';

export class UpsertPlanillaDto {
  @ApiProperty({ example: 12345 })
  @IsInt()
  @Min(1)
  @Type(() => Number)
  plantillaPagoNo: number;

  @ApiProperty({ example: '2026-01-31' })
  @IsDateString()
  fechaPago: string;

  @ApiProperty({ example: 'ENERO 2026', description: 'Mes y año del periodo pagado' })
  @IsString()
  periodoPagado: string;

  @ApiProperty({ example: 5000000 })
  @IsNumber()
  @IsPositive()
  @Type(() => Number)
  ingresoBaseCotizacion: number;

  @ApiProperty({ example: 212500 })
  @IsNumber()
  @IsPositive()
  @Type(() => Number)
  aporteSalud: number;

  @ApiProperty({ example: 200000 })
  @IsNumber()
  @IsPositive()
  @Type(() => Number)
  aportePension: number;

  @ApiProperty({ example: 10000 })
  @IsNumber()
  @IsPositive()
  @Type(() => Number)
  aporteArl: number;

  @ApiProperty({ example: 422500 })
  @IsNumber()
  @IsPositive()
  @Type(() => Number)
  valorPagado: number;
}
