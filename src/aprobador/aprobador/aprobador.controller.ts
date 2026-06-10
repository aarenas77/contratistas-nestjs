import { Body, Controller, Get, HttpCode, Param, Post, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { AprobadorService } from './aprobador.service';
import { ListarCuentasAprobadorDto } from '../dto/listar-cuentas-aprobador.dto';
import { RechazarCuentaAprobadorDto } from '../dto/rechazar-cuenta-aprobador.dto';
import { RechazarSeccionAprobadorDto } from '../dto/rechazar-seccion-aprobador.dto';
import { CurrentUser } from '../../auth/decorators/current-user.decorator';
import { Roles } from '../../auth/decorators/roles.decorator';
import { Rol } from '../../auth/interfaces/jwt-payload.interface';
import type { JwtPayload } from '../../auth/interfaces/jwt-payload.interface';

@ApiTags('Aprobador')
@ApiBearerAuth()
@Controller('aprobador')
export class AprobadorController {
  constructor(private readonly service: AprobadorService) {}

  @Get('cuentas-cobro')
  @Roles(Rol.APROBADOR)
  @ApiOperation({
    summary: 'Listar cuentas de cobro asignadas al aprobador',
    description: 'Retorna las cuentas en estado APROBADA_SUPERVISOR o EN_REVISION_APROBADOR asignadas al aprobador autenticado.',
  })
  listarParaAprobacion(@CurrentUser() user: JwtPayload, @Query() dto: ListarCuentasAprobadorDto) {
    return this.service.listarParaAprobacion(user.codigoTercero, dto);
  }

  @Post('cuentas-cobro/:id/aprobar')
  @Roles(Rol.APROBADOR)
  @HttpCode(200)
  @ApiOperation({
    summary: 'Liquidar una cuenta de cobro',
    description: 'Cambia el estado de EN_REVISION_APROBADOR a LIQUIDADA. Requiere que todas las secciones de la cuenta estén en estado APROBADO. El aprobador debe estar asignado a la cuenta.',
  })
  aprobar(@Param('id') id: string, @CurrentUser() user: JwtPayload) {
    return this.service.aprobar(BigInt(id), user.codigoTercero, user.nombre);
  }

  @Post('cuentas-cobro/:id/rechazar')
  @Roles(Rol.APROBADOR)
  @HttpCode(200)
  @ApiOperation({
    summary: 'Rechazar una cuenta de cobro',
    description: 'Cambia el estado a RECHAZADA_APROBADOR. Requiere una observación/justificación.',
  })
  rechazar(
    @Param('id') id: string,
    @CurrentUser() user: JwtPayload,
    @Body() dto: RechazarCuentaAprobadorDto,
  ) {
    return this.service.rechazar(BigInt(id), user.codigoTercero, user.nombre, dto.observacion);
  }

  // ─── Revisión por Secciones ───────────────────────────────────────────────

  @Post('cuentas-cobro/:id/secciones/informe-actividades/aprobar')
  @Roles(Rol.APROBADOR)
  @HttpCode(200)
  @ApiOperation({ summary: 'Aprobar la sección de informe de actividades (aprobador)' })
  aprobarInformeActividades(@Param('id') id: string, @CurrentUser() user: JwtPayload) {
    return this.service.aprobarSeccionInformeActividades(BigInt(id), user.codigoTercero, user.nombre);
  }

  @Post('cuentas-cobro/:id/secciones/informe-actividades/rechazar')
  @Roles(Rol.APROBADOR)
  @HttpCode(200)
  @ApiOperation({ summary: 'Rechazar la sección de informe de actividades (aprobador)' })
  rechazarInformeActividades(
    @Param('id') id: string,
    @CurrentUser() user: JwtPayload,
    @Body() dto: RechazarSeccionAprobadorDto,
  ) {
    return this.service.rechazarSeccionInformeActividades(BigInt(id), user.codigoTercero, user.nombre, dto.justificacion);
  }

  @Post('cuentas-cobro/:id/secciones/planilla/aprobar')
  @Roles(Rol.APROBADOR)
  @HttpCode(200)
  @ApiOperation({ summary: 'Aprobar la sección de pago de planilla (aprobador)' })
  aprobarPlanilla(@Param('id') id: string, @CurrentUser() user: JwtPayload) {
    return this.service.aprobarSeccionPlanilla(BigInt(id), user.codigoTercero, user.nombre);
  }

  @Post('cuentas-cobro/:id/secciones/planilla/rechazar')
  @Roles(Rol.APROBADOR)
  @HttpCode(200)
  @ApiOperation({ summary: 'Rechazar la sección de pago de planilla (aprobador)' })
  rechazarPlanilla(
    @Param('id') id: string,
    @CurrentUser() user: JwtPayload,
    @Body() dto: RechazarSeccionAprobadorDto,
  ) {
    return this.service.rechazarSeccionPlanilla(BigInt(id), user.codigoTercero, user.nombre, dto.justificacion);
  }

  @Post('cuentas-cobro/:id/secciones/retenciones/aprobar')
  @Roles(Rol.APROBADOR)
  @HttpCode(200)
  @ApiOperation({ summary: 'Aprobar la sección de retenciones (aprobador)' })
  aprobarRetenciones(@Param('id') id: string, @CurrentUser() user: JwtPayload) {
    return this.service.aprobarSeccionRetenciones(BigInt(id), user.codigoTercero, user.nombre);
  }

  @Post('cuentas-cobro/:id/secciones/retenciones/rechazar')
  @Roles(Rol.APROBADOR)
  @HttpCode(200)
  @ApiOperation({ summary: 'Rechazar la sección de retenciones (aprobador)' })
  rechazarRetenciones(
    @Param('id') id: string,
    @CurrentUser() user: JwtPayload,
    @Body() dto: RechazarSeccionAprobadorDto,
  ) {
    return this.service.rechazarSeccionRetenciones(BigInt(id), user.codigoTercero, user.nombre, dto.justificacion);
  }

  @Post('cuentas-cobro/:id/secciones/gastos-adicionales/aprobar')
  @Roles(Rol.APROBADOR)
  @HttpCode(200)
  @ApiOperation({ summary: 'Aprobar la sección de gastos adicionales (aprobador)' })
  aprobarGastosAdicionales(@Param('id') id: string, @CurrentUser() user: JwtPayload) {
    return this.service.aprobarSeccionGastosAdicionales(BigInt(id), user.codigoTercero, user.nombre);
  }

  @Post('cuentas-cobro/:id/secciones/gastos-adicionales/rechazar')
  @Roles(Rol.APROBADOR)
  @HttpCode(200)
  @ApiOperation({ summary: 'Rechazar la sección de gastos adicionales (aprobador)' })
  rechazarGastosAdicionales(
    @Param('id') id: string,
    @CurrentUser() user: JwtPayload,
    @Body() dto: RechazarSeccionAprobadorDto,
  ) {
    return this.service.rechazarSeccionGastosAdicionales(BigInt(id), user.codigoTercero, user.nombre, dto.justificacion);
  }

  @Post('cuentas-cobro/:id/secciones/ejecucion-fisica/aprobar')
  @Roles(Rol.APROBADOR)
  @HttpCode(200)
  @ApiOperation({ summary: 'Aprobar la sección de ejecución física (aprobador)' })
  aprobarEjecucionFisica(@Param('id') id: string, @CurrentUser() user: JwtPayload) {
    return this.service.aprobarSeccionEjecucionFisica(BigInt(id), user.codigoTercero, user.nombre);
  }

  @Post('cuentas-cobro/:id/secciones/ejecucion-fisica/rechazar')
  @Roles(Rol.APROBADOR)
  @HttpCode(200)
  @ApiOperation({ summary: 'Rechazar la sección de ejecución física (aprobador)' })
  rechazarEjecucionFisica(
    @Param('id') id: string,
    @CurrentUser() user: JwtPayload,
    @Body() dto: RechazarSeccionAprobadorDto,
  ) {
    return this.service.rechazarSeccionEjecucionFisica(BigInt(id), user.codigoTercero, user.nombre, dto.justificacion);
  }
}
