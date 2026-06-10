import { Body, Controller, Get, Param, Patch } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { ChecklistRetefuenteService } from './checklist-retefuente.service';
import { ActualizarChecklistDto } from '../dto/actualizar-checklist.dto';
import { CurrentUser } from '../../auth/decorators/current-user.decorator';
import { Roles } from '../../auth/decorators/roles.decorator';
import { Rol } from '../../auth/interfaces/jwt-payload.interface';
import type { JwtPayload } from '../../auth/interfaces/jwt-payload.interface';

@ApiTags('Checklist Retefuente')
@ApiBearerAuth()
@Controller('checklist-retefuente')
export class ChecklistRetefuenteController {
  constructor(private readonly service: ChecklistRetefuenteService) {}

  @Get(':cuentaCobroId')
  @Roles(Rol.CONTRATISTA, Rol.SUPERVISOR, Rol.APROBADOR)
  @ApiOperation({ summary: 'Obtener checklist de retefuente (se inicializa si no existe)' })
  obtener(@Param('cuentaCobroId') id: string, @CurrentUser() user: JwtPayload) {
    return this.service.obtener(BigInt(id), user.codigoTercero, user.rol);
  }

  @Patch(':cuentaCobroId')
  @Roles(Rol.CONTRATISTA)
  @ApiOperation({ summary: 'Actualizar respuestas del checklist en bloque' })
  actualizar(
    @Param('cuentaCobroId') id: string,
    @Body() dto: ActualizarChecklistDto,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.service.actualizar(BigInt(id), dto, user.codigoTercero);
  }
}
