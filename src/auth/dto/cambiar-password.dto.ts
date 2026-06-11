import { ApiProperty } from '@nestjs/swagger';
import { IsString, MinLength, Matches } from 'class-validator';

export class CambiarPasswordDto {
  @ApiProperty({
    example: 'K7m@5xQ2P!nL8v',
    description: 'Contraseña actual (la temporal entregada en el registro).',
  })
  @IsString()
  passwordActual: string;

  @ApiProperty({
    example: 'MiClaveSegura1!',
    description:
      'Nueva contraseña: mínimo 8 caracteres con mayúscula, minúscula, dígito y símbolo.',
  })
  @IsString()
  @MinLength(8, {
    message: 'La nueva contraseña debe tener al menos 8 caracteres.',
  })
  @Matches(/(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^\w\s])/, {
    message:
      'La nueva contraseña debe incluir mayúscula, minúscula, dígito y un símbolo.',
  })
  passwordNueva: string;
}
