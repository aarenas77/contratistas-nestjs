import { ApiProperty } from '@nestjs/swagger';
import { IsString, Matches } from 'class-validator';

export class ConfirmarPagoSimpleMockDto {
  @ApiProperty({ example: '834729123', description: 'PIN generado por el endpoint de prueba' })
  @IsString()
  @Matches(/^\d{9}$/, { message: 'El PIN debe contener exactamente 9 dígitos' })
  pin: string;
}
