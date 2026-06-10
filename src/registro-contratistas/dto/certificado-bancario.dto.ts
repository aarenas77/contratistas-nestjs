import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString } from 'class-validator';

/**
 * Forma del objeto `certificadoBancario` que devuelve el endpoint legacy.
 */
export class CertificadoBancarioDto {
  @ApiProperty({ example: 'BANCOLOMBIA' })
  @IsOptional()
  @IsString()
  entidadBancaria?: string | null;

  @ApiPropertyOptional({ example: '1', description: 'Tipo de cuenta (ej. 1=ahorros, 2=corriente)' })
  @IsOptional()
  @IsString()
  tipoCuenta?: string | null;

  @ApiProperty({ example: '36593235038' })
  @IsOptional()
  @IsString()
  numeroCuenta?: string | null;
}
