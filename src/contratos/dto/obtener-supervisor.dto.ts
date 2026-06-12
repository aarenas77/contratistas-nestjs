import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsInt, Min } from 'class-validator';

export class ObtenerSupervisorDto {
  @ApiProperty({ example: 39492, description: 'Código del contrato a consultar' })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  codigoContrato: number;
}
