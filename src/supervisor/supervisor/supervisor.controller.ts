import { Body, Controller, Get, HttpCode, Param, Post, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { SupervisorService } from './supervisor.service';
import { ListarCuentasSupervisorDto } from '../dto/listar-cuentas-supervisor.dto';
import { RechazarCuentaDto } from '../dto/rechazar-cuenta.dto';
import { CurrentUser } from '../../auth/decorators/current-user.decorator';
import { Roles } from '../../auth/decorators/roles.decorator';
import { Rol } from '../../auth/interfaces/jwt-payload.interface';
import type { JwtPayload } from '../../auth/interfaces/jwt-payload.interface';

@ApiTags('Supervisor')
@ApiBearerAuth()
@Controller('supervisor')
export class SupervisorController {
  constructor(private readonly service: SupervisorService) {}

  @Get('cuentas-cobro')
  @Roles(Rol.SUPERVISOR)
  @ApiOperation({
    summary: 'Listar cuentas de cobro radicadas asignadas al supervisor',
    description: 'Retorna las cuentas en estado RADICADA donde el supervisor autenticado está asignado.',
  })
  listarRadicadas(@CurrentUser() user: JwtPayload, @Query() dto: ListarCuentasSupervisorDto) {
    return this.service.listarRadicadas(user.codigoTercero, dto);
  }

  @Post('cuentas-cobro/:id/aprobar')
  @Roles(Rol.SUPERVISOR)
  @HttpCode(200)
  @ApiOperation({
    summary: 'Aprobar una cuenta de cobro radicada',
    description: 'Cambia el estado de RADICADA a APROBADA_SUPERVISOR. El supervisor debe estar asignado a la cuenta.',
  })
  aprobar(@Param('id') id: string, @CurrentUser() user: JwtPayload) {
    return this.service.aprobar(BigInt(id), user.codigoTercero, user.nombre);
  }

  @Post('cuentas-cobro/:id/rechazar')
  @Roles(Rol.SUPERVISOR)
  @HttpCode(200)
  @ApiOperation({
    summary: 'Rechazar (devolver) una cuenta de cobro radicada',
    description: 'Cambia el estado de RADICADA a DEVUELTA_CONTRATISTA. Requiere una observación/justificación.',
  })
  rechazar(
    @Param('id') id: string,
    @CurrentUser() user: JwtPayload,
    @Body() dto: RechazarCuentaDto,
  ) {
    return this.service.rechazar(BigInt(id), user.codigoTercero, user.nombre, dto.observacion);
  }
}
