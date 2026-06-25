import { HttpService } from '@nestjs/axios';
import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AxiosError, AxiosRequestConfig } from 'axios';
import { catchError, firstValueFrom, throwError, timeout } from 'rxjs';
import { DatosAportante } from '../aportante/aportante-source.gateway';
import { PlanillaPilaException } from './planilla-pila.exception';
import {
  PagoSimplePilaGateway,
  ValidarPlanillaInput,
} from './pago-simple-pila.gateway';
import {
  AportanteVinculado,
  TotalesPlanillaPila,
  UrlPagoPlanillaPila,
  ValidacionPlanillaPila,
} from './pila-result.models';

interface PilaConfig {
  baseUrl: string;
  nit: string;
  documentType: string;
  document: string;
  password: string;
  company: string;
  secretKey: string;
  timeoutMs: number;
}

interface Sobre<T> {
  success?: boolean;
  code?: number;
  data?: T;
  message?: string;
  description?: string;
}

interface Session {
  token: string;
  sessionToken: string;
}

/**
 * Implementación real del flujo PILA contra PagoSimple. Encapsula login,
 * sesión y autorización del aportante por cada operación (igual que el adapter
 * legacy `PagoSimplePilaClientAdapter`). Sigue los contratos documentados en
 * `docs/documentacion migracion/07-pagosimple-planilla-extraccion.md` §4.
 *
 * NOTA: pendiente de validación contra un ambiente real de PagoSimple (no hay
 * credenciales sandbox aún). Los puntos donde el contrato no documenta la forma
 * exacta de la respuesta están marcados con `SUPUESTO`.
 */
@Injectable()
export class PagoSimplePilaHttpGateway implements PagoSimplePilaGateway {
  private readonly logger = new Logger(PagoSimplePilaHttpGateway.name);

  constructor(
    private readonly http: HttpService,
    private readonly config: ConfigService,
  ) {}

  async vincularAportante(datos: DatosAportante): Promise<AportanteVinculado> {
    const cfg = this.leerConfig();
    const session = await this.login(cfg);

    let idAportante = datos.idAportante;
    if (idAportante == null) {
      idAportante = await this.crearAportante(cfg, session, datos);
    }

    const authToken = await this.autorizar(cfg, session, idAportante, datos);
    const aportante = await this.consultarAportante(
      cfg,
      session,
      authToken,
      idAportante,
    );

    return {
      idAportante,
      tipoDocumento: aportante?.type_identification ?? datos.tipoDocumento,
      numeroDocumento:
        aportante?.identification_number ?? datos.numeroDocumento,
      nombre: aportante?.business_name ?? datos.nombreCompleto,
      estado: aportante?.status ?? null,
      authToken,
    };
  }

  async validarPlanilla(
    input: ValidarPlanillaInput,
  ): Promise<ValidacionPlanillaPila> {
    const cfg = this.leerConfig();
    const session = await this.login(cfg);
    const idAportante = this.requireIdAportante(input.datos);
    const authToken = await this.autorizar(
      cfg,
      session,
      idAportante,
      input.datos,
    );

    const form = new FormData();
    form.append(
      'execution_params',
      JSON.stringify({
        is_UGPP: input.isUgpp,
        is_novelties_planillaN: input.isNoveltiesPlanillaN,
        file_type: input.fileType,
      }),
    );
    form.append(
      'payroll_file',
      new Blob([input.archivo.contenido], { type: 'text/plain' }),
      input.archivo.nombreArchivo,
    );

    const data = await this.post<Sobre<ValidacionPlanillaPilaExterna>>(
      `${cfg.baseUrl}/payroll/validate`,
      form,
      cfg.timeoutMs,
      this.headersAutorizados(cfg, session, authToken),
    );

    const payload = data?.data;
    return {
      validationStatus: payload?.validation_status ?? null,
      payrollValidations: (payload?.payroll_validations ?? []).map((v) => ({
        payrollCode: v.payroll_code ?? null,
        payrollNumber: v.payroll_number ?? null,
        numberErrorsContributor: v.number_errors_contributor ?? 0,
        numberErrorsCompany: v.number_errors_company ?? 0,
        numberWarnings: v.number_warnings ?? 0,
        detailErrorsContributor: this.mapearDetalles(v.detail_errors_contributor),
        detailErrorsCompany: this.mapearDetalles(v.detail_errors_company),
        detailWarnings: this.mapearDetalles(v.detail_warnings),
      })),
    };
  }

  async consultarTotales(
    numeroPlanilla: string,
    datos: DatosAportante,
  ): Promise<TotalesPlanillaPila> {
    const cfg = this.leerConfig();
    const session = await this.login(cfg);
    const idAportante = this.requireIdAportante(datos);
    const authToken = await this.autorizar(cfg, session, idAportante, datos);

    const data = await this.get<Sobre<TotalesPlanillaPilaExterna>>(
      `${cfg.baseUrl}/payroll/total/${numeroPlanilla}`,
      cfg.timeoutMs,
      this.headersAutorizados(cfg, session, authToken),
    );

    const t = data?.data;
    return {
      documentType: t?.document_type ?? null,
      documentNumber: t?.document_number ?? null,
      verificationDigit: t?.verification_digit ?? null,
      reportDate: t?.report_date ?? null,
      contributorName: t?.contributor_name ?? null,
      payrollNumber: t?.payroll_number ?? null,
      quotePeriod: t?.quote_period ?? null,
      servicePeriod: t?.service_period ?? null,
      affiliatesNumber: t?.affiliates_number ?? null,
      limitDate: t?.limit_date ?? null,
      payrollStatus: t?.payroll_status ?? null,
      administratorTotalValue: (t?.administrator_total_value ?? []).map((a) => ({
        identification: a.identification ?? null,
        verificationDigit: a.verification_digit ?? null,
        administratorCode: a.administrator_code ?? null,
        administratorName: a.administrator_name ?? null,
        administratorType: a.administrator_type ?? null,
        affiliates: a.affiliates ?? null,
        totalWithoutArrear: a.total_without_arrear ?? 0,
        arrearValue: a.arrear_value ?? 0,
        total: a.total ?? 0,
      })),
      totalWithoutArrear: t?.total_without_arrear ?? 0,
      arrearValue: t?.arrear_value ?? 0,
      totalToPay: t?.total_to_pay ?? 0,
    };
  }

  async generarUrlPago(
    numeroPlanilla: string,
    datos: DatosAportante,
  ): Promise<UrlPagoPlanillaPila> {
    const cfg = this.leerConfig();
    const session = await this.login(cfg);
    const idAportante = this.requireIdAportante(datos);
    const authToken = await this.autorizar(cfg, session, idAportante, datos);

    const data = await this.get<Sobre<string>>(
      `${cfg.baseUrl}/payroll/payment/${numeroPlanilla}`,
      cfg.timeoutMs,
      this.headersAutorizados(cfg, session, authToken),
    );

    return {
      urlPago: typeof data?.data === 'string' ? data.data : null,
      mensaje: data?.message ?? null,
      descripcion: data?.description ?? null,
    };
  }

  private async login(cfg: PilaConfig): Promise<Session> {
    const data = await this.post<Sobre<{ token?: string; session_token?: string }>>(
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
      { 'Content-Type': 'application/json', Accept: 'application/json' },
    );

    const token = data?.data?.token;
    const sessionToken = data?.data?.session_token;
    if (!token || !sessionToken) {
      throw new PlanillaPilaException(
        'Login de PagoSimple PILA sin token/session_token en la respuesta',
      );
    }
    return { token, sessionToken };
  }

  private async crearAportante(
    cfg: PilaConfig,
    session: Session,
    datos: DatosAportante,
  ): Promise<number> {
    const body = this.contributorBody(datos);
    const data = await this.post<Sobre<{ id?: number } | number>>(
      `${cfg.baseUrl}/contributor`,
      body,
      cfg.timeoutMs,
      this.headersSesion(cfg, session),
    );
    // SUPUESTO: el contrato no documenta la respuesta de creación; se acepta
    // tanto `data.id` como `data` numérico directo.
    const payload = data?.data;
    const id =
      typeof payload === 'number'
        ? payload
        : (payload as { id?: number })?.id;
    if (id == null) {
      throw new PlanillaPilaException(
        'PagoSimple no devolvió el id del aportante creado',
      );
    }
    return id;
  }

  private async autorizar(
    cfg: PilaConfig,
    session: Session,
    idAportante: number,
    datos: DatosAportante,
  ): Promise<string> {
    const data = await this.get<Sobre<{ auth_token?: string }>>(
      `${cfg.baseUrl}/auth/${idAportante}/${datos.tipoDocumento}/${datos.numeroDocumento}`,
      cfg.timeoutMs,
      this.headersSesion(cfg, session),
    );
    const authToken = data?.data?.auth_token;
    if (!authToken) {
      throw new PlanillaPilaException(
        'PagoSimple no devolvió auth_token al autorizar el aportante',
      );
    }
    return authToken;
  }

  private async consultarAportante(
    cfg: PilaConfig,
    session: Session,
    authToken: string,
    idAportante: number,
  ): Promise<ContributorExterno | undefined> {
    const data = await this.get<Sobre<ContributorExterno>>(
      `${cfg.baseUrl}/contributor/independent/${idAportante}`,
      cfg.timeoutMs,
      this.headersAutorizados(cfg, session, authToken),
    );
    return data?.data;
  }

  private contributorBody(datos: DatosAportante) {
    return {
      economic_activity_code: datos.codigoActividadEconomica,
      classification_contributor_code: 'I',
      classification_contributor_id: 2,
      occupational_risk_administrator_code: datos.codigoArl,
      digit_verification: datos.digitoVerificacion,
      status: 'ACTIVE',
      presentation_format_id: 1,
      id: null,
      legal_nature_id: 2,
      identification_number: datos.numeroDocumento,
      pay_esap_min: false,
      business_name: datos.nombreCompleto,
      segment_id: 1,
      type_action_id: 5,
      type_contributor_id: 2,
      type_identification: datos.tipoDocumento,
      type_payer_pension_id: 1,
      type_person_id: 1,
      information_contact: {
        department_code: datos.codigoDepartamento,
        municipal_code: datos.codigoMunicipio,
        email: datos.email,
        extra_email: '',
        fax: datos.telefono,
        id: null,
        cell_phone_number: datos.celular,
        phone_number: datos.telefono,
        identification_number: datos.numeroDocumento,
        surname: datos.primerApellido,
        first_name: datos.primerNombre,
        second_surname: datos.segundoApellido ?? '',
        second_name: datos.segundoNombre ?? '',
        type_identification: datos.tipoDocumento,
        address_data: { full_address: datos.direccion },
      },
      extra_validation: {
        contributor_id: null,
        family_compensation_fund_benefit: 'N',
        sheet_duplication: 'S',
        exonerated_parafiscal_payment: 'S',
        id: null,
        new_income_withdrawal: 'N',
        replaces_contributing_health_administrator: 'N',
        replaces_contributing_names: 'S',
        replaces_contributor_upc_value: 'N',
        type_assisted_payment_voucher_id: 2,
        values_voucher: 'N',
      },
    };
  }

  private requireIdAportante(datos: DatosAportante): number {
    if (datos.idAportante == null) {
      throw new PlanillaPilaException(
        'El aportante no está vinculado: falta idAportante',
      );
    }
    return datos.idAportante;
  }

  private headersSesion(cfg: PilaConfig, session: Session) {
    return {
      nit: cfg.nit,
      token: session.token,
      session_token: session.sessionToken,
    };
  }

  private headersAutorizados(
    cfg: PilaConfig,
    session: Session,
    authToken: string,
  ) {
    return { ...this.headersSesion(cfg, session), auth_token: authToken };
  }

  private mapearDetalles(detalles: ExternalDetail[] | undefined) {
    return (detalles ?? []).map((d) => ({
      code: d?.code ?? null,
      description: d?.description ?? null,
    }));
  }

  private async post<T>(
    url: string,
    body: unknown,
    timeoutMs: number,
    headers: Record<string, string>,
  ): Promise<T> {
    return this.exec<T>({ method: 'post', url, data: body, headers }, timeoutMs);
  }

  private async get<T>(
    url: string,
    timeoutMs: number,
    headers: Record<string, string>,
  ): Promise<T> {
    return this.exec<T>({ method: 'get', url, headers }, timeoutMs);
  }

  private async exec<T>(
    config: AxiosRequestConfig,
    timeoutMs: number,
  ): Promise<T> {
    const { data } = await firstValueFrom(
      this.http.request<T>(config).pipe(
        timeout(timeoutMs),
        catchError((error: AxiosError) => throwError(() => error)),
      ),
    );
    return data;
  }

  private leerConfig(): PilaConfig {
    const req = (clave: string): string => {
      const valor = this.config.get<string>(clave);
      if (!valor) throw new Error(`Falta la variable de entorno ${clave}`);
      return valor;
    };
    return {
      baseUrl: req('PAGOSIMPLE_PILA_BASE_URL').replace(/\/+$/, ''),
      nit: req('PAGOSIMPLE_PILA_NIT'),
      documentType: req('PAGOSIMPLE_PILA_DOCUMENT_TYPE'),
      document: req('PAGOSIMPLE_PILA_DOCUMENT'),
      password: req('PAGOSIMPLE_PILA_PASSWORD'),
      company: req('PAGOSIMPLE_PILA_COMPANY'),
      secretKey: req('PAGOSIMPLE_PILA_SECRET_KEY'),
      timeoutMs: Number(this.config.get('PAGOSIMPLE_PILA_TIMEOUT_MS') ?? 15000),
    };
  }
}

interface ExternalDetail {
  code?: string;
  description?: string;
}

interface ValidacionPlanillaPilaExterna {
  validation_status?: string;
  payroll_validations?: Array<{
    payroll_code?: number;
    payroll_number?: number;
    number_errors_contributor?: number;
    number_errors_company?: number;
    number_warnings?: number;
    detail_errors_contributor?: ExternalDetail[];
    detail_errors_company?: ExternalDetail[];
    detail_warnings?: ExternalDetail[];
  }>;
}

interface TotalesPlanillaPilaExterna {
  document_type?: string;
  document_number?: string;
  verification_digit?: string;
  report_date?: string;
  contributor_name?: string;
  payroll_number?: number;
  quote_period?: string;
  service_period?: string;
  affiliates_number?: number;
  limit_date?: string;
  payroll_status?: string;
  administrator_total_value?: Array<{
    identification?: string;
    verification_digit?: number;
    administrator_code?: string;
    administrator_name?: string;
    administrator_type?: string;
    affiliates?: string;
    total_without_arrear?: number;
    arrear_value?: number;
    total?: number;
  }>;
  total_without_arrear?: number;
  arrear_value?: number;
  total_to_pay?: number;
}

interface ContributorExterno {
  id?: string;
  type_identification?: string;
  identification_number?: string;
  business_name?: string;
  status?: string;
}
