import { Body, Controller, Get, HttpCode, Post, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { PresupuestoService } from './presupuesto.service';
import { PrecargarDto } from './dto/precargar.dto';
import { Public } from '../auth/decorators/public.decorator';
import { Roles } from '../auth/decorators/roles.decorator';
import { Rol } from '../auth/interfaces/jwt-payload.interface';

@ApiTags('Presupuesto (precarga temporal)')
@Controller('presupuesto')
export class PresupuestoController {
  constructor(private readonly service: PresupuestoService) {}

  @Post('precarga')
  @Roles(Rol.ADMINISTRADOR)
  @ApiBearerAuth()
  @HttpCode(201)
  @ApiOperation({
    summary:
      'Precarga un tercero con sus contratos y cuentas (simula presupuesto)',
    description:
      'Stub temporal hasta la integración real con el módulo de presupuesto. ' +
      'Idempotente: re-cargar la misma cédula actualiza en vez de duplicar.',
  })
  precargar(@Body() dto: PrecargarDto) {
    return this.service.precargar(dto);
  }

  @Get('tercero')
  @Public()
  @ApiOperation({
    summary:
      'Consulta el tercero precargado y sus contratos por número de identificación',
    description:
      'Lo usa el wizard de registro para mostrar los contratos antes de finalizar.',
  })
  consultarTercero(
    @Query('numeroIdentificacion') numeroIdentificacion: string,
  ) {
    return this.service.consultarTercero(numeroIdentificacion);
  }
}
