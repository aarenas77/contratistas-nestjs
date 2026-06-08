import { Type } from 'class-transformer';
import { IsInt, IsOptional, Max, Min } from 'class-validator';

export class ListarCuentasCobroDto {
  @IsInt()
  @Min(1)
  @Type(() => Number)
  codigoContrato: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  @Type(() => Number)
  page?: number = 0;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(50)
  @Type(() => Number)
  size?: number = 10;
}
