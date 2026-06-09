import { Controller, Get, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { AprobadorService } from './aprobador.service';
import { ListarCuentasAprobadorDto } from '../dto/listar-cuentas-aprobador.dto';
import { Roles } from '../../auth/decorators/roles.decorator';
import { Rol } from '../../auth/interfaces/jwt-payload.interface';

@ApiTags('Aprobador')
@ApiBearerAuth()
@Controller('aprobador')
export class AprobadorController {
  constructor(private readonly service: AprobadorService) {}

  @Get('cuentas-cobro')
  @Roles(Rol.APROBADOR)
  @ApiOperation({
    summary: 'Listar cuentas de cobro aprobadas por el supervisor',
    description: 'Retorna las cuentas en estado APROBADA_SUPERVISOR pendientes de revisión del aprobador.',
  })
  listarParaAprobacion(@Query() dto: ListarCuentasAprobadorDto) {
    return this.service.listarParaAprobacion(dto);
  }
}
