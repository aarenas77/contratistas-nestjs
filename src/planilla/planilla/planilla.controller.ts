import { Body, Controller, Get, Param, Post, Put } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { PlanillaService } from './planilla.service';
import { UpsertPlanillaDto } from '../dto/upsert-planilla.dto';
import { CurrentUser } from '../../auth/decorators/current-user.decorator';
import { Roles } from '../../auth/decorators/roles.decorator';
import { Rol } from '../../auth/interfaces/jwt-payload.interface';
import type { JwtPayload } from '../../auth/interfaces/jwt-payload.interface';
import { GenerarPagoSimpleTestDto } from '../dto/generar-pagosimple-test.dto';
import { ConfirmarPagoSimpleMockDto } from '../dto/confirmar-pagosimple-mock.dto';

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

  @Post(':cuentaCobroId/pagosimple/test')
  @Roles(Rol.CONTRATISTA)
  @ApiOperation({ summary: 'Generar un flujo mock de PagoSimple para una planilla' })
  generarPagoSimpleMock(
    @Param('cuentaCobroId') id: string,
    @Body() dto: GenerarPagoSimpleTestDto,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.service.generarPagoSimpleMock(BigInt(id), user.codigoTercero, dto);
  }

  @Post(':cuentaCobroId/pagosimple/mock-confirmacion')
  @Roles(Rol.CONTRATISTA)
  @ApiOperation({ summary: 'Confirmar manualmente el pago mock de PagoSimple' })
  confirmarPagoSimpleMock(
    @Param('cuentaCobroId') id: string,
    @Body() dto: ConfirmarPagoSimpleMockDto,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.service.confirmarPagoSimpleMock(BigInt(id), user.codigoTercero, dto);
  }
}
