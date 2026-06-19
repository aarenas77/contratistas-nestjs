import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { ContratosService } from './contratos.service';
import { ListarContratosDto } from './dto/listar-contratos.dto';
import { ListarContratosAdminDto } from './dto/listar-contratos-admin.dto';
import { ObtenerSupervisorDto } from './dto/obtener-supervisor.dto';
import { CreateContratoDto } from './dto/create-contrato.dto';
import { UpdateContratoDto } from './dto/update-contrato.dto';
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
    description:
      'Retorna los contratos asociados al codigoTercero del usuario en sesion. Formato compatible con el legacy.',
  })
  listar(@CurrentUser() user: JwtPayload, @Query() dto: ListarContratosDto) {
    return this.service.listar(user.codigoTercero, dto);
  }

  @Get('admin')
  @Roles(Rol.ABOGADO)
  @ApiOperation({
    summary: 'Listar todos los contratos (rol ABOGADO o ADMINISTRADOR)',
    description:
      'Lista todos los contratos del sistema, con paginacion y filtros opcionales por codigoTercero y estado.',
  })
  listarTodos(@Query() dto: ListarContratosAdminDto) {
    return this.service.listarTodos(dto);
  }

  @Get('contratistas')
  @Roles(Rol.ABOGADO)
  @ApiOperation({
    summary: 'Listar contratistas para el formulario de contrato',
    description:
      'Devuelve los usuarios con rol CONTRATISTA activos (codigoTercero, nombre, identificacion) para el desplegable.',
  })
  listarContratistas() {
    return this.service.listarContratistas();
  }

  @Get('tipos-plazo')
  @Roles(Rol.ABOGADO)
  @ApiOperation({
    summary: 'Listar tipos de plazo disponibles',
    description:
      'Devuelve las opciones del desplegable Tipo de Plazo: D=Dias, M=Meses, A=Anos.',
  })
  tiposPlazo() {
    return this.service.tiposPlazo();
  }

  @Get('supervisor')
  @Roles(Rol.CONTRATISTA)
  @ApiOperation({
    summary: 'Consultar el supervisor asociado a un contrato',
    description:
      'Recibe el codigoContrato por query param y devuelve el nombre del supervisor y su codigo tercero.',
  })
  obtenerSupervisor(@Query() dto: ObtenerSupervisorDto) {
    return this.service.obtenerSupervisor(dto.codigoContrato);
  }

  @Post()
  @Roles(Rol.ABOGADO)
  @ApiOperation({
    summary: 'Crear un contrato (rol ABOGADO o ADMINISTRADOR)',
    description:
      'Crea un contrato. El codigoContrato se autogenera y el contrato queda en estado ELABORADO.',
  })
  crear(@Body() dto: CreateContratoDto) {
    return this.service.crear(dto);
  }

  @Patch(':codigoContrato')
  @Roles(Rol.ABOGADO)
  @ApiOperation({
    summary: 'Editar un contrato (rol ABOGADO o ADMINISTRADOR)',
  })
  actualizar(
    @Param('codigoContrato', ParseIntPipe) codigoContrato: number,
    @Body() dto: UpdateContratoDto,
  ) {
    return this.service.actualizar(codigoContrato, dto);
  }

  @Delete(':codigoContrato')
  @Roles(Rol.ABOGADO)
  @ApiOperation({
    summary: 'Inhabilitar un contrato (rol ABOGADO o ADMINISTRADOR)',
    description: 'Cambia el estado del contrato a INHABILITADO.',
  })
  eliminar(@Param('codigoContrato', ParseIntPipe) codigoContrato: number) {
    return this.service.eliminar(codigoContrato);
  }

  @Post(':codigoContrato/clonar')
  @Roles(Rol.ABOGADO)
  @ApiOperation({
    summary: 'Clonar un contrato (rol ABOGADO o ADMINISTRADOR)',
    description:
      'Crea una copia del encabezado del contrato con un nuevo codigoContrato. No copia las cuentas de cobro.',
  })
  clonar(@Param('codigoContrato', ParseIntPipe) codigoContrato: number) {
    return this.service.clonar(codigoContrato);
  }
}
