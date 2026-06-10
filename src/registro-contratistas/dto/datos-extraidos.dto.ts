import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsObject, ValidateNested } from 'class-validator';
import { RutExtraidoDto } from './rut-extraido.dto';
import { CertificadoBancarioDto } from './certificado-bancario.dto';

/**
 * Respuesta del paso de extracción y, por el flujo stateless, también la base
 * del payload que el frontend reenvía al finalizar el registro.
 */
export class DatosExtraidosDto {
  @ApiProperty({ type: RutExtraidoDto })
  @IsObject()
  @ValidateNested()
  @Type(() => RutExtraidoDto)
  rut: RutExtraidoDto;

  @ApiProperty({ type: CertificadoBancarioDto })
  @IsObject()
  @ValidateNested()
  @Type(() => CertificadoBancarioDto)
  certificadoBancario: CertificadoBancarioDto;
}
