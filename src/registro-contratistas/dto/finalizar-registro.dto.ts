import { ApiProperty } from '@nestjs/swagger';
import { IsString } from 'class-validator';
import { DatosExtraidosDto } from './datos-extraidos.dto';

/**
 * Payload de `POST /registro-contratistas/finalizar`. Reenvía los datos
 * extraídos (flujo stateless) más el `codigoTercero` obtenido en el paso previo.
 */
export class FinalizarRegistroDto extends DatosExtraidosDto {
  @ApiProperty({ example: 'TMP-3f9a2c1b', description: 'Código de tercero (por ahora temporal)' })
  @IsString()
  codigoTercero: string;
}
