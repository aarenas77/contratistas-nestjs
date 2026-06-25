import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString } from 'class-validator';

/** Query de `GET /registro-contratistas/seguridad-social`. */
export class ConsultarSeguridadSocialDto {
  @ApiProperty({ example: 'CC', description: 'Tipo de documento (CC, NIT, …)' })
  @IsString()
  @IsNotEmpty()
  tipoDocumento: string;

  @ApiProperty({ example: '15436453', description: 'Número de documento' })
  @IsString()
  @IsNotEmpty()
  documento: string;
}
