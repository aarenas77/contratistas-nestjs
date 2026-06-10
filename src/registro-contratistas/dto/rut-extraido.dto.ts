import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsArray,
  IsInt,
  IsOptional,
  IsString,
} from 'class-validator';

/**
 * Forma del objeto `rut` que devuelve el endpoint legacy de extracción.
 * Los campos opcionales pueden venir como `null` para personas jurídicas o
 * cuando el legacy no los detecta; por eso casi todo es opcional.
 */
export class RutExtraidoDto {
  @ApiPropertyOptional({ example: 5 })
  @IsOptional()
  @IsInt()
  codigoVerificacion?: number | null;

  @ApiPropertyOptional({ example: 'Cédula de Ciudadanía' })
  @IsOptional()
  @IsString()
  tipoDocumento?: string | null;

  @ApiProperty({ example: '1036662102', description: 'Número de identificación (cédula o NIT)' })
  @IsString()
  numeroIdentificacion: string;

  @ApiPropertyOptional({ example: '1036662102' })
  @IsOptional()
  @IsString()
  nit?: string | null;

  @ApiPropertyOptional({ example: 'OTERO' })
  @IsOptional()
  @IsString()
  primerApellido?: string | null;

  @ApiPropertyOptional({ example: 'ARANGO' })
  @IsOptional()
  @IsString()
  segundoApellido?: string | null;

  @ApiPropertyOptional({ example: 'BRANDEL' })
  @IsOptional()
  @IsString()
  primerNombre?: string | null;

  @ApiPropertyOptional({ example: 'DANIEL' })
  @IsOptional()
  @IsString()
  segundoNombre?: string | null;

  @ApiPropertyOptional({ example: null })
  @IsOptional()
  @IsString()
  razonSocial?: string | null;

  @ApiPropertyOptional({ example: 'TALLER INDUSTRIAL OTEROS' })
  @IsOptional()
  @IsString()
  nombreComercial?: string | null;

  @ApiPropertyOptional({ example: 'Persona natural o sucesión ilíquida' })
  @IsOptional()
  @IsString()
  tipoContribuyente?: string | null;

  @ApiPropertyOptional({ example: 'COLOMBIA' })
  @IsOptional()
  @IsString()
  pais?: string | null;

  @ApiPropertyOptional({ example: 'Antioquia' })
  @IsOptional()
  @IsString()
  departamento?: string | null;

  @ApiPropertyOptional({ example: 'Itagui' })
  @IsOptional()
  @IsString()
  ciudad?: string | null;

  @ApiPropertyOptional({ example: 'CR   52       78   97' })
  @IsOptional()
  @IsString()
  direccion?: string | null;

  @ApiPropertyOptional({ example: 'comercial@industriasoteros.com.co' })
  @IsOptional()
  @IsString()
  correoElectronico?: string | null;

  @ApiPropertyOptional({ example: '6046006394' })
  @IsOptional()
  @IsString()
  telefono1?: string | null;

  @ApiPropertyOptional({ example: '3122305066' })
  @IsOptional()
  @IsString()
  telefono2?: string | null;

  @ApiPropertyOptional({ example: null })
  @IsOptional()
  @IsString()
  actividadEconomicaPrincipal?: string | null;

  @ApiPropertyOptional({ example: null })
  @IsOptional()
  @IsString()
  actividadEconomicaSecundaria?: string | null;

  @ApiPropertyOptional({ example: ['49'], type: [String] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  responsabilidadesTributarias?: string[] | null;

  @ApiPropertyOptional({ example: '141152791843' })
  @IsOptional()
  @IsString()
  numeroFormulario?: string | null;

  @ApiPropertyOptional({ example: '05' })
  @IsOptional()
  @IsString()
  codigoDepartamento?: string | null;

  @ApiPropertyOptional({ example: '169' })
  @IsOptional()
  @IsString()
  codigoPais?: string | null;
}
