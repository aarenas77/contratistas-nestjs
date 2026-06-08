import { Controller, Get, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { SupervisorService } from './supervisor.service';
import { ListarCuentasSupervisorDto } from '../dto/listar-cuentas-supervisor.dto';
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
}
