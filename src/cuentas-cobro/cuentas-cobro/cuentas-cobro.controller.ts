import { Controller, Get, Post, Body, Param, Query } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { CuentasCobroService } from './cuentas-cobro.service';
import { CreateCuentaCobroDto } from '../dto/create-cuenta-cobro.dto';
import { ListarCuentasCobroDto } from '../dto/listar-cuentas-cobro.dto';
import { CurrentUser } from '../../auth/decorators/current-user.decorator';
import { Roles } from '../../auth/decorators/roles.decorator';
import { Rol } from '../../auth/interfaces/jwt-payload.interface';
import type { JwtPayload } from '../../auth/interfaces/jwt-payload.interface';

@ApiTags('Cuentas de Cobro')
@ApiBearerAuth()
@Controller('cuentas-cobro')
export class CuentasCobroController {
  constructor(private readonly service: CuentasCobroService) {}

  @Post()
  @Roles(Rol.CONTRATISTA)
  @ApiOperation({ summary: 'Crear una cuenta de cobro' })
  create(@CurrentUser() user: JwtPayload, @Body() dto: CreateCuentaCobroDto) {
    return this.service.create(dto, user.codigoTercero);
  }

  @Get()
  @Roles(Rol.CONTRATISTA)
  @ApiOperation({
    summary: 'Listar cuentas de cobro por contrato',
    description: 'Retorna las cuentas de cobro del contratista autenticado para un contrato específico.',
  })
  listar(@CurrentUser() user: JwtPayload, @Query() dto: ListarCuentasCobroDto) {
    return this.service.listar(user.codigoTercero, dto);
  }

  @Get(':id')
  @Roles(Rol.CONTRATISTA, Rol.SUPERVISOR, Rol.APROBADOR)
  @ApiOperation({ summary: 'Obtener detalle de una cuenta de cobro' })
  findOne(@Param('id') id: string) {
    return this.service.findOne(BigInt(id));
  }
}
