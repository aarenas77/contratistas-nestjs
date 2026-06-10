import {
  BadRequestException,
  Body,
  Controller,
  HttpCode,
  Post,
  UploadedFiles,
  UseInterceptors,
} from '@nestjs/common';
import { FileFieldsInterceptor } from '@nestjs/platform-express';
import { ApiBody, ApiConsumes, ApiOperation, ApiTags } from '@nestjs/swagger';
import { RegistroContratistasService } from './registro-contratistas.service';
import { Public } from '../../auth/decorators/public.decorator';
import { DatosExtraidosDto } from '../dto/datos-extraidos.dto';
import { FinalizarRegistroDto } from '../dto/finalizar-registro.dto';

const MAX_PDF_BYTES = 10 * 1024 * 1024;

type ArchivosRegistro = {
  rut?: Express.Multer.File[];
  certificadoBancario?: Express.Multer.File[];
};

@ApiTags('Registro de Contratistas')
@Controller('registro-contratistas')
export class RegistroContratistasController {
  constructor(private readonly service: RegistroContratistasService) {}

  @Post('extraer')
  @Public()
  @HttpCode(200)
  @UseInterceptors(
    FileFieldsInterceptor([
      { name: 'rut', maxCount: 1 },
      { name: 'certificadoBancario', maxCount: 1 },
    ]),
  )
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      required: ['rut', 'certificadoBancario'],
      properties: {
        rut: { type: 'string', format: 'binary', description: 'PDF del RUT (max 10 MB)' },
        certificadoBancario: {
          type: 'string',
          format: 'binary',
          description: 'PDF de la certificación bancaria (max 10 MB)',
        },
      },
    },
  })
  @ApiOperation({
    summary: 'Extrae la información del RUT y la certificación bancaria a partir de los PDFs',
  })
  extraer(@UploadedFiles() archivos: ArchivosRegistro): Promise<DatosExtraidosDto> {
    const rut = this.validarArchivo(archivos?.rut?.[0], 'rut');
    const certificado = this.validarArchivo(
      archivos?.certificadoBancario?.[0],
      'certificadoBancario',
    );
    return this.service.extraer(rut, certificado);
  }

  @Post('codigo-tercero-temporal')
  @Public()
  @HttpCode(200)
  @ApiOperation({
    summary: 'Genera un código de tercero temporal (placeholder hasta la integración de precarga)',
  })
  async generarCodigoTerceroTemporal(): Promise<{ codigoTercero: string }> {
    const codigoTercero = await this.service.generarCodigoTerceroTemporal();
    return { codigoTercero };
  }

  @Post('finalizar')
  @Public()
  @HttpCode(201)
  @ApiOperation({
    summary: 'Finaliza el registro: crea el usuario contratista y devuelve sus credenciales',
    description:
      'Devuelve username y password en texto plano una sola vez para que el correo de bienvenida ' +
      'sea enviado por el sistema invocante.',
  })
  finalizar(@Body() dto: FinalizarRegistroDto) {
    return this.service.finalizar(dto);
  }

  private validarArchivo(
    file: Express.Multer.File | undefined,
    campo: string,
  ): Express.Multer.File {
    if (!file) {
      throw new BadRequestException(`El archivo "${campo}" es obligatorio.`);
    }
    if (file.size > MAX_PDF_BYTES) {
      throw new BadRequestException(`El archivo "${campo}" supera el tamaño máximo de 10 MB.`);
    }
    if (file.mimetype !== 'application/pdf') {
      throw new BadRequestException(`El archivo "${campo}" debe ser un PDF.`);
    }
    return file;
  }
}
