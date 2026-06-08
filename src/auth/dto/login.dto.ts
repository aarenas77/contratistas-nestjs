import { ApiProperty } from '@nestjs/swagger';
import { IsString } from 'class-validator';

export class LoginDto {
  @ApiProperty({ example: 'usuario123' })
  @IsString()
  username: string;

  @ApiProperty({ example: 'contraseña123' })
  @IsString()
  password: string;
}
