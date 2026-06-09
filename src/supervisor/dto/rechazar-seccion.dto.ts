import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, MaxLength } from 'class-validator';

export class RechazarSeccionDto {
  @ApiProperty({
    example: 'Las actividades descritas no corresponden al objeto del contrato.',
    description: 'Justificación del rechazo de la sección. Obligatorio, máximo 1000 caracteres.',
    maxLength: 1000,
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(1000)
  justificacion: string;
}
