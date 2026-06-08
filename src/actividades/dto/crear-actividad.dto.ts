import { ApiProperty } from '@nestjs/swagger';
import { IsDateString, IsNotEmpty, IsString } from 'class-validator';

export class CrearActividadDto {
  @ApiProperty({ example: 'Reunión de seguimiento con el equipo técnico' })
  @IsString()
  @IsNotEmpty()
  descripcion: string;

  @ApiProperty({ example: '2026-01-15' })
  @IsDateString()
  fechaActividad: string;

  @ApiProperty({ type: 'string', format: 'binary', description: 'Archivo adjunto (max 10 MB)' })
  archivo: any;
}
