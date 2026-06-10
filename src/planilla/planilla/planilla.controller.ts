import { Body, Controller, Get, Param, Put } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { PlanillaService } from './planilla.service';
import { UpsertPlanillaDto } from '../dto/upsert-planilla.dto';
import { CurrentUser } from '../../auth/decorators/current-user.decorator';
import { Roles } from '../../auth/decorators/roles.decorator';
import { Rol } from '../../auth/interfaces/jwt-payload.interface';
import type { JwtPayload } from '../../auth/interfaces/jwt-payload.interface';

@ApiTags('Planilla')
@ApiBearerAuth()
@Controller('planilla')
export class PlanillaController {
  constructor(private readonly service: PlanillaService) {}

  @Get(':cuentaCobroId')
  @Roles(Rol.CONTRATISTA, Rol.SUPERVISOR, Rol.APROBADOR)
  @ApiOperation({ summary: 'Obtener planilla de seguridad social de una cuenta de cobro' })
  obtener(@Param('cuentaCobroId') id: string, @CurrentUser() user: JwtPayload) {
    return this.service.obtener(BigInt(id), user.codigoTercero, user.rol);
  }

  @Put(':cuentaCobroId')
  @Roles(Rol.CONTRATISTA)
  @ApiOperation({ summary: 'Crear o actualizar planilla (upsert)' })
  upsert(
    @Param('cuentaCobroId') id: string,
    @Body() dto: UpsertPlanillaDto,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.service.upsert(BigInt(id), dto, user.codigoTercero);
  }
}
