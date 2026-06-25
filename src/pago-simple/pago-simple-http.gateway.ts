import { HttpService } from '@nestjs/axios';
import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { catchError, firstValueFrom, throwError, timeout } from 'rxjs';
import { AxiosError } from 'axios';
import {
  PagoSimpleGateway,
  SeguridadSocialSnapshot,
} from './pago-simple.gateway';
import {
  BduaRuafRegistro,
  BduaRuafResponse,
  PagoSimpleLoginResponse,
} from './dto/pago-simple-externo.dto';
import { parsearFechaPagoSimple } from './pago-simple.fechas';

interface PagoSimpleConfig {
  baseUrl: string;
  documentType: string;
  document: string;
  password: string;
  nit: string;
  company: string;
  secretKey: string;
  timeoutMs: number;
  tokenTtlMs: number;
}

/**
 * Implementación real del gateway: hace login en PagoSimple, cachea el token y
 * consulta BDUA/RUAF. Ante cualquier fallo (timeout, token inválido, respuesta
 * vacía o malformada) devuelve `null` para no romper el flujo que la invoca.
 */
@Injectable()
export class PagoSimpleHttpGateway implements PagoSimpleGateway {
  private readonly logger = new Logger(PagoSimpleHttpGateway.name);
  private tokenCache: { token: string; expiraEn: number } | null = null;

  constructor(
    private readonly http: HttpService,
    private readonly config: ConfigService,
  ) {}

  async consultarSeguridadSocial(
    tipoDocumento: string,
    documento: string,
  ): Promise<SeguridadSocialSnapshot | null> {
    const docType = this.normalizarTipoDocumento(tipoDocumento);
    try {
      const registro = await this.consultarConReintentoDeToken(
        docType,
        documento,
      );
      if (!registro) return null;
      return this.mapear(registro);
    } catch (error) {
      this.logger.warn(
        `Consulta de seguridad social falló para documento ${documento}: ${this.describirError(error)}`,
      );
      return null;
    }
  }

  /**
   * Consulta BDUA/RUAF y, si el token estaba vencido del lado del proveedor
   * (401/403), lo invalida y reintenta una sola vez con un token fresco.
   */
  private async consultarConReintentoDeToken(
    docType: string,
    documento: string,
  ): Promise<BduaRuafRegistro | null> {
    const token = await this.obtenerToken();
    try {
      return await this.consultarBdua(token, docType, documento);
    } catch (error) {
      if (!this.esTokenInvalido(error)) throw error;
      this.tokenCache = null;
      const tokenFresco = await this.obtenerToken();
      return this.consultarBdua(tokenFresco, docType, documento);
    }
  }

  private async obtenerToken(): Promise<string> {
    if (this.tokenCache && this.tokenCache.expiraEn > Date.now()) {
      return this.tokenCache.token;
    }

    const cfg = this.leerConfig();
    const respuesta = await this.post<PagoSimpleLoginResponse>(
      `${cfg.baseUrl}/auth/login`,
      {
        document_type: cfg.documentType,
        document: cfg.document,
        password: cfg.password,
        nit: cfg.nit,
        company: cfg.company,
        secret_key: cfg.secretKey,
      },
      cfg.timeoutMs,
    );

    const token = respuesta?.data?.token;
    if (!token) {
      throw new Error('Login de PagoSimple sin token en la respuesta');
    }

    this.tokenCache = { token, expiraEn: Date.now() + cfg.tokenTtlMs };
    return token;
  }

  private async consultarBdua(
    token: string,
    docType: string,
    documento: string,
  ): Promise<BduaRuafRegistro | null> {
    const cfg = this.leerConfig();
    const respuesta = await this.post<BduaRuafResponse>(
      `${cfg.baseUrl}/bdua-ruaf/data`,
      { document_type: docType, document: documento },
      cfg.timeoutMs,
      { nit: cfg.nit, token },
    );

    const data = respuesta?.data;
    // La respuesta puede traer cero o varios registros: nunca asumir uno solo.
    if (!Array.isArray(data) || data.length === 0) return null;
    return data[0];
  }

  private mapear(r: BduaRuafRegistro): SeguridadSocialSnapshot {
    return {
      eps: r.bdua_administrator_name?.trim() || null,
      epsFechaAfiliacion: parsearFechaPagoSimple(r.bdua_affiliate_date),
      afp: r.ruaf_administrator_name?.trim() || null,
      afpFechaAfiliacion: parsearFechaPagoSimple(r.ruaf_affiliate_date),
      tipoAfiliado: r.affiliate_type?.trim() || null,
      origen: 'PAGOSIMPLE',
    };
  }

  private async post<T>(
    url: string,
    body: unknown,
    timeoutMs: number,
    headers?: Record<string, string>,
  ): Promise<T> {
    const { data } = await firstValueFrom(
      this.http.post<T>(url, body, { headers }).pipe(
        timeout(timeoutMs),
        catchError((error: AxiosError) => throwError(() => error)),
      ),
    );
    return data;
  }

  private normalizarTipoDocumento(tipo: string): string {
    return (tipo ?? '').trim().toUpperCase();
  }

  private esTokenInvalido(error: unknown): boolean {
    const status = (error as AxiosError)?.response?.status;
    return status === 401 || status === 403;
  }

  private describirError(error: unknown): string {
    const axiosError = error as AxiosError;
    if (axiosError?.isAxiosError) {
      return axiosError.response
        ? `HTTP ${axiosError.response.status}`
        : (axiosError.code ?? axiosError.message);
    }
    return error instanceof Error ? error.message : String(error);
  }

  private leerConfig(): PagoSimpleConfig {
    const req = (clave: string): string => {
      const valor = this.config.get<string>(clave);
      if (!valor) {
        throw new Error(`Falta la variable de entorno ${clave}`);
      }
      return valor;
    };

    return {
      baseUrl: req('PAGOSIMPLE_BASE_URL').replace(/\/+$/, ''),
      documentType: req('PAGOSIMPLE_DOCUMENT_TYPE'),
      document: req('PAGOSIMPLE_DOCUMENT'),
      password: req('PAGOSIMPLE_PASSWORD'),
      nit: req('PAGOSIMPLE_NIT'),
      company: req('PAGOSIMPLE_COMPANY'),
      secretKey: req('PAGOSIMPLE_SECRET_KEY'),
      timeoutMs: Number(this.config.get('PAGOSIMPLE_TIMEOUT_MS') ?? 10000),
      tokenTtlMs: Number(
        this.config.get('PAGOSIMPLE_TOKEN_TTL_MS') ?? 50 * 60 * 1000,
      ),
    };
  }
}
