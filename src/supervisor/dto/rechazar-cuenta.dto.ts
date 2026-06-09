import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, MaxLength } from 'class-validator';

export class RechazarCuentaDto {
  @ApiProperty({
    example: 'Falta adjunto de planilla de seguridad social del mes de mayo.',
    description: 'Justificación del rechazo. Obligatorio, máximo 1000 caracteres.',
    maxLength: 1000,
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(1000)
  observacion: string;
}
