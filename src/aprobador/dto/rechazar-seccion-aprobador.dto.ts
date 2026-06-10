import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, MaxLength } from 'class-validator';

export class RechazarSeccionAprobadorDto {
  @ApiProperty({
    example: 'La sección no cumple con los criterios de aprobación del aprobador.',
    description: 'Justificación del rechazo de la sección. Obligatorio, máximo 1000 caracteres.',
    maxLength: 1000,
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(1000)
  justificacion: string;
}
