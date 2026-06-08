import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  MaxFileSizeValidator,
  Param,
  ParseFilePipe,
  Post,
  Res,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiConsumes, ApiOperation, ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import type { Response } from 'express';
import { GastosService } from './gastos.service';
import { CrearGastoDto } from '../dto/crear-gasto.dto';
import { CurrentUser } from '../../auth/decorators/current-user.decorator';
import { Roles } from '../../auth/decorators/roles.decorator';
import { Rol } from '../../auth/interfaces/jwt-payload.interface';
import type { JwtPayload } from '../../auth/interfaces/jwt-payload.interface';

@ApiTags('Gastos Adicionales')
@ApiBearerAuth()
@Controller('gastos')
export class GastosController {
  constructor(private readonly service: GastosService) {}

  // IMPORTANTE: esta ruta va PRIMERO para evitar colisión con :cuentaCobroId
  @Get('adjunto/:adjuntoId')
  @Roles(Rol.CONTRATISTA)
  @ApiOperation({ summary: 'Descargar evidencia de un gasto' })
  async getAdjunto(
    @Param('adjuntoId') adjuntoId: string,
    @CurrentUser() user: JwtPayload,
    @Res() res: Response,
  ) {
    const adjunto = await this.service.getAdjunto(BigInt(adjuntoId), user.codigoTercero);
    res.set({
      'Content-Type': adjunto.mimeType ?? 'application/octet-stream',
      'Content-Disposition': `inline; filename*=UTF-8''${encodeURIComponent(adjunto.nombre)}`,
      'Content-Length': String(adjunto.tamanioBytes ?? 0),
    });
    res.send(adjunto.datos);
  }

  @Get(':cuentaCobroId')
  @Roles(Rol.CONTRATISTA)
  @ApiOperation({ summary: 'Listar gastos adicionales de una cuenta de cobro' })
  listar(@Param('cuentaCobroId') id: string, @CurrentUser() user: JwtPayload) {
    return this.service.listar(BigInt(id), user.codigoTercero);
  }

  @Post(':cuentaCobroId')
  @Roles(Rol.CONTRATISTA)
  @UseInterceptors(FileInterceptor('archivo'))
  @ApiConsumes('multipart/form-data')
  @ApiOperation({ summary: 'Agregar gasto adicional con evidencia' })
  crear(
    @Param('cuentaCobroId') id: string,
    @Body() dto: CrearGastoDto,
    @UploadedFile(
      new ParseFilePipe({
        validators: [new MaxFileSizeValidator({ maxSize: 10 * 1024 * 1024 })],
        fileIsRequired: true,
      }),
    )
    file: Express.Multer.File,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.service.crear(BigInt(id), dto, file, user.codigoTercero);
  }

  @Delete(':gastoId')
  @Roles(Rol.CONTRATISTA)
  @HttpCode(204)
  @ApiOperation({ summary: 'Eliminar gasto adicional y su evidencia' })
  eliminar(@Param('gastoId') id: string, @CurrentUser() user: JwtPayload) {
    return this.service.eliminar(BigInt(id), user.codigoTercero);
  }
}
