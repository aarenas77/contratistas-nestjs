import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, MaxLength } from 'class-validator';

export class RechazarCuentaAprobadorDto {
  @ApiProperty({
    example: 'La cuenta no cumple con los requisitos de aprobación final.',
    description: 'Justificación del rechazo. Obligatorio, máximo 1000 caracteres.',
    maxLength: 1000,
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(1000)
  observacion: string;
}
