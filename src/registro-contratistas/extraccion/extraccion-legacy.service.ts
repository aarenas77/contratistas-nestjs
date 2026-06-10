import { BadGatewayException, Injectable, Logger } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';
import { DatosExtraidosDto } from '../dto/datos-extraidos.dto';
import { RutExtraidoDto } from '../dto/rut-extraido.dto';
import { CertificadoBancarioDto } from '../dto/certificado-bancario.dto';

/**
 * Cliente HTTP hacia el endpoint legacy que extrae los datos del RUT y de la
 * certificación bancaria a partir de los PDFs.
 *
 * Configurable por variables de entorno:
 *  - GESTION_CONTRATISTAS_URL: base del gateway legacy
 *  - LEGACY_EXTRACCION_PATH:   ruta del endpoint de extracción
 *  - LEGACY_API_TOKEN:         token de autenticación (Bearer)
 *
 * El mapeo de la respuesta cruda al contrato interno está aislado en
 * {@link ExtraccionLegacyService.mapearRespuestaLegacy} para poder ajustarlo
 * cuando se conozca el contrato exacto del legacy.
 */
@Injectable()
export class ExtraccionLegacyService {
  private readonly logger = new Logger(ExtraccionLegacyService.name);

  constructor(private readonly http: HttpService) {}

  async extraer(
    rut: Express.Multer.File,
    certificado: Express.Multer.File,
  ): Promise<DatosExtraidosDto> {
    const baseUrl = process.env.GESTION_CONTRATISTAS_URL;
    const path = process.env.LEGACY_EXTRACCION_PATH ?? '/contratistas/extraer-documentos';

    if (!baseUrl) {
      throw new BadGatewayException(
        'GESTION_CONTRATISTAS_URL no está configurada; no se puede extraer la información de los PDFs.',
      );
    }

    const form = new FormData();
    form.append(
      'rut',
      new Blob([new Uint8Array(rut.buffer)], { type: rut.mimetype }),
      rut.originalname,
    );
    form.append(
      'certificadoBancario',
      new Blob([new Uint8Array(certificado.buffer)], { type: certificado.mimetype }),
      certificado.originalname,
    );

    const token = process.env.LEGACY_API_TOKEN;
    const headers: Record<string, string> = {};
    if (token) {
      headers.Authorization = `Bearer ${token}`;
    }

    try {
      const { data } = await firstValueFrom(
        this.http.post(`${baseUrl}${path}`, form, { headers }),
      );
      return this.mapearRespuestaLegacy(data);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'error desconocido';
      this.logger.error(`Fallo al extraer documentos del legacy: ${message}`);
      throw new BadGatewayException(
        'No se pudo extraer la información de los documentos. Intenta nuevamente más tarde.',
      );
    }
  }

  /**
   * Transforma la respuesta cruda del legacy al contrato interno.
   *
   * AJUSTAR AQUÍ cuando se conozca el formato real: si el legacy ya devuelve la
   * forma `{ rut, certificadoBancario }` el mapeo es directo; de lo contrario
   * reasignar los nombres de campo correspondientes.
   */
  private mapearRespuestaLegacy(raw: any): DatosExtraidosDto {
    const rutRaw = raw?.rut ?? {};
    const bancoRaw = raw?.certificadoBancario ?? raw?.certificado ?? {};

    const rut: RutExtraidoDto = {
      codigoVerificacion: rutRaw.codigoVerificacion ?? null,
      tipoDocumento: rutRaw.tipoDocumento ?? null,
      numeroIdentificacion: rutRaw.numeroIdentificacion ?? rutRaw.nit ?? '',
      nit: rutRaw.nit ?? null,
      primerApellido: rutRaw.primerApellido ?? null,
      segundoApellido: rutRaw.segundoApellido ?? null,
      primerNombre: rutRaw.primerNombre ?? null,
      segundoNombre: rutRaw.segundoNombre ?? null,
      razonSocial: rutRaw.razonSocial ?? null,
      nombreComercial: rutRaw.nombreComercial ?? null,
      tipoContribuyente: rutRaw.tipoContribuyente ?? null,
      pais: rutRaw.pais ?? null,
      departamento: rutRaw.departamento ?? null,
      ciudad: rutRaw.ciudad ?? null,
      direccion: rutRaw.direccion ?? null,
      correoElectronico: rutRaw.correoElectronico ?? null,
      telefono1: rutRaw.telefono1 ?? null,
      telefono2: rutRaw.telefono2 ?? null,
      actividadEconomicaPrincipal: rutRaw.actividadEconomicaPrincipal ?? null,
      actividadEconomicaSecundaria: rutRaw.actividadEconomicaSecundaria ?? null,
      responsabilidadesTributarias: rutRaw.responsabilidadesTributarias ?? null,
      numeroFormulario: rutRaw.numeroFormulario ?? null,
      codigoDepartamento: rutRaw.codigoDepartamento ?? null,
      codigoPais: rutRaw.codigoPais ?? null,
    };

    const certificadoBancario: CertificadoBancarioDto = {
      entidadBancaria: bancoRaw.entidadBancaria ?? null,
      tipoCuenta: bancoRaw.tipoCuenta ?? null,
      numeroCuenta: bancoRaw.numeroCuenta ?? null,
    };

    return { rut, certificadoBancario };
  }
}
