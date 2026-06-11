import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform, Type } from 'class-transformer';
import {
  IsArray,
  IsBoolean,
  IsDateString,
  IsInt,
  IsNumber,
  IsOptional,
  IsPositive,
  IsString,
  ValidateNested,
} from 'class-validator';

export class PrecargaCuentaDto {
  @ApiPropertyOptional({ example: 1, description: 'Id generado por la BD' })
  @IsOptional()
  @IsInt()
  idPago?: number;

  @ApiPropertyOptional({ example: 1, description: 'Consecutivo de la cuenta' })
  @IsOptional()
  @IsInt()
  ticket?: number;

  @ApiPropertyOptional({ example: 'CO-2026-001' })
  @IsOptional()
  @IsString()
  contrato?: string;

  @ApiProperty({ example: 39492 })
  @IsInt()
  codigoContrato: number;

  @ApiPropertyOptional({ example: '123456' })
  @IsOptional()
  @IsString()
  codigoTercero?: string;

  @ApiPropertyOptional({ example: '123457', nullable: true })
  @IsOptional()
  @Transform(({ value }) => (value === null || value === undefined ? value : String(value)))
  @IsString()
  codigoTerceroSupervisor?: string | null;

  @ApiPropertyOptional({ example: '123458', nullable: true })
  @IsOptional()
  @Transform(({ value }) => (value === null || value === undefined ? value : String(value)))
  @IsString()
  codigoTerceroAprobador?: string | null;

  @ApiPropertyOptional({ example: 1, description: 'Estado legacy del listado' })
  @IsOptional()
  @IsInt()
  idEstado?: number;

  @ApiPropertyOptional({ example: 'BORRADOR' })
  @IsOptional()
  @IsString()
  estado?: string;

  @ApiProperty({ example: '2026-01-01' })
  @IsDateString()
  fechaInicio: string;

  @ApiProperty({ example: '2026-01-31' })
  @IsDateString()
  fechaFin: string;

  @ApiPropertyOptional({ example: '2026-01-15T12:00:00.000Z', nullable: true })
  @IsOptional()
  @IsDateString()
  fechaSolicitud?: string | null;

  @ApiPropertyOptional({ example: 5000000 })
  @IsOptional()
  @IsNumber()
  @IsPositive()
  valorSolicitud?: number;

  @ApiPropertyOptional({ example: 5000000 })
  @IsOptional()
  @IsNumber()
  @IsPositive()
  valorCobrado?: number;

  @ApiPropertyOptional({
    example: false,
    description: 'Campo derivado del listado, se acepta para simetría',
  })
  @IsOptional()
  @IsBoolean()
  disponibleParaRadicar?: boolean;
}

export class PrecargaContratoDto {
  @ApiProperty({ example: 39492 })
  @IsInt()
  codigoContrato: number;

  @ApiPropertyOptional({ example: '123456' })
  @IsOptional()
  @IsString()
  codigoTercero?: string;

  @ApiProperty({ example: 'CO-2026-001' })
  @IsString()
  consecutivo: string;

  @ApiProperty({ example: 'Mantenimiento de equipos' })
  @IsString()
  descripcion: string;

  @ApiProperty({ example: 60000000 })
  @IsNumber()
  @IsPositive()
  valor: number;

  @ApiPropertyOptional({
    example: 60000000,
    description: 'Por defecto = valor',
  })
  @IsOptional()
  @IsNumber()
  totalPago?: number;

  @ApiPropertyOptional({ example: 'A' })
  @IsOptional()
  @IsString()
  estado?: string;

  @ApiPropertyOptional({ example: '2026-01-01' })
  @IsOptional()
  @IsDateString()
  fechaElaboracion?: string;

  @ApiPropertyOptional({ example: '2026-01-10', nullable: true })
  @IsOptional()
  @IsDateString()
  fechaAprobacion?: string | null;

  @ApiPropertyOptional({ example: '2026-01-01' })
  @IsOptional()
  @IsDateString()
  fechaRegistro?: string;

  @ApiPropertyOptional({ example: '2026-01-01', nullable: true })
  @IsOptional()
  @IsDateString()
  fechaInicioSecop?: string | null;

  @ApiPropertyOptional({ example: '2026-12-31' })
  @IsOptional()
  @IsDateString()
  fechaFin?: string;

  @ApiPropertyOptional({ example: 'D' })
  @IsOptional()
  @IsString()
  tipoPlazo?: string;

  @ApiPropertyOptional({ example: 365 })
  @IsOptional()
  @IsInt()
  plazoDias?: number;

  @ApiPropertyOptional({ example: 1 })
  @IsOptional()
  @IsInt()
  consecutivoCompromiso?: number;

  @ApiPropertyOptional({ example: 'A' })
  @IsOptional()
  @IsString()
  estadoCompromiso?: string;

  @ApiPropertyOptional({ example: 12, nullable: true })
  @IsOptional()
  @IsInt()
  numeroActaInicioString?: number | null;

  @ApiPropertyOptional({ example: 0 })
  @IsOptional()
  @IsNumber()
  saldoDisponibleOtrosGastos?: number;

  @ApiPropertyOptional({ description: 'codigoTercero del supervisor asignado' })
  @IsOptional()
  @IsString()
  idSupervisor?: string;

  @ApiPropertyOptional({ example: 1, nullable: true })
  @IsOptional()
  @IsInt()
  codigoDependencia?: number | null;

  @ApiPropertyOptional({ example: 9999999999 })
  @IsOptional()
  @IsNumber()
  codigoMempresa?: number;

  @ApiProperty({ type: [PrecargaCuentaDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => PrecargaCuentaDto)
  cuentas: PrecargaCuentaDto[];
}

export class PrecargarDto {
  @ApiProperty({ example: '1036662102' })
  @IsString()
  numeroIdentificacion: string;

  @ApiPropertyOptional({ example: 'CC' })
  @IsOptional()
  @IsString()
  tipoIdentificacion?: string;

  @ApiProperty({ example: '123456' })
  @IsString()
  codigoTercero: string;

  @ApiPropertyOptional({ example: 'Brandel Otero' })
  @IsOptional()
  @IsString()
  nombre?: string;

  @ApiProperty({ type: [PrecargaContratoDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => PrecargaContratoDto)
  contratos: PrecargaContratoDto[];
}
