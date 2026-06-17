import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsNumber, IsString, Max, MaxLength, Min } from 'class-validator';

export class DigitarEjecucionFisicaDto {
  @ApiProperty({
    example: 85.5,
    description: 'Porcentaje de ejecución física digitado por el supervisor (0 a 100).',
    minimum: 0,
    maximum: 100,
  })
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  @Max(100)
  porcentaje: number;

  @ApiProperty({
    example: 'Avance verificado en visita de obra del 10/06.',
    description: 'Justificación del porcentaje de ejecución física. Obligatorio, máximo 1000 caracteres.',
    maxLength: 1000,
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(1000)
  justificacion: string;
}
