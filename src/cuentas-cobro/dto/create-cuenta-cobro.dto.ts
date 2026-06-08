import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsDateString, IsInt, IsNumber, IsPositive } from 'class-validator';

export class CreateCuentaCobroDto {
  @ApiProperty({ example: 39492 })
  @IsInt()
  @Type(() => Number)
  codigoContrato: number;

  @ApiProperty({ example: '2026-01-01' })
  @IsDateString()
  fechaInicio: string;

  @ApiProperty({ example: '2026-01-31' })
  @IsDateString()
  fechaFin: string;

  @ApiProperty({ example: 5000000 })
  @IsNumber()
  @IsPositive()
  valorCobrado: number;
}
