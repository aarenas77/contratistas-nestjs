import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsArray, IsIn, IsInt, IsOptional, IsString, Max, Min, ValidateNested } from 'class-validator';

export class RespuestaItemDto {
  @ApiProperty({ example: 1, minimum: 1, maximum: 6 })
  @IsInt()
  @Min(1)
  @Max(6)
  @Type(() => Number)
  idChecklist: number;

  @ApiProperty({ example: 1, enum: [0, 1, null], nullable: true })
  @IsIn([0, 1, null])
  kaNlCumple: 0 | 1 | null;

  @ApiProperty({ example: 'Observación opcional', required: false })
  @IsOptional()
  @IsString()
  observacion?: string;
}

export class ActualizarChecklistDto {
  @ApiProperty({ type: [RespuestaItemDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => RespuestaItemDto)
  respuestas: RespuestaItemDto[];
}
