import { Controller, Get, Query } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { ContratosService } from './contratos.service';
import { ListarContratosDto } from './dto/listar-contratos.dto';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { Roles } from '../auth/decorators/roles.decorator';
import { Rol } from '../auth/interfaces/jwt-payload.interface';
import type { JwtPayload } from '../auth/interfaces/jwt-payload.interface';

@ApiTags('Contratos')
@ApiBearerAuth()
@Controller('contratos')
export class ContratosController {
  constructor(private readonly service: ContratosService) {}

  @Get()
  @Roles(Rol.CONTRATISTA)
  @ApiOperation({
    summary: 'Listar contratos del contratista autenticado',
    description: 'Retorna los contratos asociados al codigoTercero del usuario en sesión. Formato compatible con el legacy.',
  })
  listar(@CurrentUser() user: JwtPayload, @Query() dto: ListarContratosDto) {
    return this.service.listar(user.codigoTercero, dto);
  }
}
