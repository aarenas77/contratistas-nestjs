import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString } from 'class-validator';
import { DatosExtraidosDto } from './datos-extraidos.dto';

/**
 * Payload de `POST /registro-contratistas/finalizar`. Reenvía los datos
 * extraídos (flujo stateless). El `codigoTercero` NO viaja desde el cliente: se
 * resuelve server-side desde la identificación del RUT vía el módulo de
 * presupuesto, para evitar que un cliente inyecte el tercero de otra persona.
 *
 * EPS/AFP son opcionales: si el frontend ya los trae, se respeta el valor
 * manual; lo que falte se completa consultando PagoSimple.
 */
export class FinalizarRegistroDto extends DatosExtraidosDto {
  @ApiPropertyOptional({
    example: 'EPS SURA',
    description: 'EPS capturada manualmente; si se envía, tiene prioridad.',
  })
  @IsOptional()
  @IsString()
  eps?: string | null;

  @ApiPropertyOptional({
    example: 'PORVENIR',
    description: 'AFP capturada manualmente; si se envía, tiene prioridad.',
  })
  @IsOptional()
  @IsString()
  afp?: string | null;
}
