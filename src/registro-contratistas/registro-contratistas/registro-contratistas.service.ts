import {
  ConflictException,
  Inject,
  Injectable,
  UnprocessableEntityException,
} from '@nestjs/common';
import { randomInt } from 'crypto';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../../prisma/prisma/prisma.service';
import { ExtraccionService } from '../extraccion/extraccion.service';
import { DatosExtraidosDto } from '../dto/datos-extraidos.dto';
import { FinalizarRegistroDto } from '../dto/finalizar-registro.dto';
import { RutExtraidoDto } from '../dto/rut-extraido.dto';
import { Rol } from '../../auth/interfaces/jwt-payload.interface';
import { PRESUPUESTO_GATEWAY } from '../../presupuesto/presupuesto.gateway';
import type { PresupuestoGateway } from '../../presupuesto/presupuesto.gateway';
import { PAGO_SIMPLE_GATEWAY } from '../../pago-simple/pago-simple.gateway';
import type {
  PagoSimpleGateway,
  SeguridadSocialSnapshot,
} from '../../pago-simple/pago-simple.gateway';

@Injectable()
export class RegistroContratistasService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly extraccion: ExtraccionService,
    @Inject(PRESUPUESTO_GATEWAY)
    private readonly presupuesto: PresupuestoGateway,
    @Inject(PAGO_SIMPLE_GATEWAY)
    private readonly pagoSimple: PagoSimpleGateway,
  ) {}

  /**
   * Consulta aislada de seguridad social en PagoSimple. Devuelve `null` si no
   * hay datos o si el proveedor falla.
   */
  consultarSeguridadSocial(
    tipoDocumento: string,
    documento: string,
  ): Promise<SeguridadSocialSnapshot | null> {
    return this.pagoSimple.consultarSeguridadSocial(tipoDocumento, documento);
  }

  /** Paso 1: extrae la información del RUT y la certificación bancaria. */
  extraer(
    rut: Express.Multer.File,
    certificado: Express.Multer.File,
  ): Promise<DatosExtraidosDto> {
    return this.extraccion.extraer(rut, certificado);
  }

  /** Paso final: crea el usuario contratista y devuelve sus credenciales. */
  async finalizar(dto: FinalizarRegistroDto) {
    const { rut } = dto;

    // El codigoTercero lo resuelve presupuesto a partir de la identificación del
    // RUT; nunca llega desde el cliente. Si el contratista no está precargado,
    // no hay nada que registrar.
    const tercero = await this.presupuesto.obtenerTerceroPorIdentificacion(
      rut.numeroIdentificacion,
    );
    if (!tercero) {
      throw new UnprocessableEntityException(
        'Este contratista no está pre-registrado en presupuesto. Contacte al área de presupuesto.',
      );
    }

    const yaExiste = await this.prisma.usuario.findFirst({
      where: {
        OR: [
          { userIdentification: rut.numeroIdentificacion },
          ...(rut.correoElectronico ? [{ email: rut.correoElectronico }] : []),
        ],
      },
      select: { id: true },
    });
    if (yaExiste) {
      throw new ConflictException(
        'Ya existe un usuario registrado con esa identificación o correo.',
      );
    }

    const nombre = this.derivarNombre(rut);
    const username = await this.generarUsername(rut);
    const password = this.generarPassword();
    const passwordHash = await bcrypt.hash(password, 10);
    const seguridadSocial = await this.resolverSeguridadSocial(dto);

    let usuario;
    try {
      usuario = await this.prisma.usuario.create({
        data: {
          username,
          passwordHash,
          nombre,
          email: rut.correoElectronico ?? null,
          codigoTercero: tercero.codigoTercero,
          userIdentification: rut.numeroIdentificacion,
          rol: Rol.CONTRATISTA,
          // La contraseña generada es temporal: el contratista debe cambiarla
          // en su primer inicio de sesión.
          mustChangePassword: true,
          ...seguridadSocial,
        },
      });
    } catch {
      throw new ConflictException('El username o email ya está en uso.');
    }

    // password en texto plano: se devuelve UNA sola vez para el envío del correo.
    return {
      username,
      password,
      usuario: {
        id: String(usuario.id),
        nombre: usuario.nombre,
        email: usuario.email,
        codigoTercero: usuario.codigoTercero,
        rol: usuario.rol,
      },
    };
  }

  /**
   * Aplica las reglas de seguridad social: el valor manual del frontend tiene
   * prioridad; lo que falte (EPS o AFP) se completa desde PagoSimple, de donde
   * también se prefieren las fechas y el régimen. Si PagoSimple falla, se
   * persiste lo disponible sin romper el registro.
   */
  private async resolverSeguridadSocial(dto: FinalizarRegistroDto) {
    const manualEps = dto.eps?.trim() || null;
    const manualAfp = dto.afp?.trim() || null;

    // Solo se consulta el proveedor si falta EPS o AFP.
    if (manualEps && manualAfp) {
      return {
        eps: manualEps,
        afp: manualAfp,
        origenSeguridadSocial: 'MANUAL',
      };
    }

    const snapshot = await this.consultarSeguridadSocial(
      this.mapearTipoDocumento(dto.rut.tipoDocumento),
      dto.rut.numeroIdentificacion,
    );

    return {
      eps: manualEps ?? snapshot?.eps ?? null,
      epsFechaAfiliacion: snapshot?.epsFechaAfiliacion ?? null,
      afp: manualAfp ?? snapshot?.afp ?? null,
      afpFechaAfiliacion: snapshot?.afpFechaAfiliacion ?? null,
      tipoAfiliado: snapshot?.tipoAfiliado ?? null,
      origenSeguridadSocial:
        manualEps || manualAfp ? 'MANUAL' : snapshot ? 'PAGOSIMPLE' : null,
      seguridadSocialConsultadaAt: new Date(),
    };
  }

  /** Traduce el tipo de documento del RUT (texto) al código que usa PagoSimple. */
  private mapearTipoDocumento(tipoDocumento?: string | null): string {
    const t = (tipoDocumento ?? '').toLowerCase();
    if (t.includes('nit')) return 'NIT';
    if (t.includes('extranjer')) return 'CE';
    if (t.includes('pasaporte')) return 'PA';
    return 'CC';
  }

  /** Nombre legible: persona natural usa nombres+apellidos; jurídica, la razón social. */
  private derivarNombre(rut: RutExtraidoDto): string {
    const nombrePersona = [
      rut.primerNombre,
      rut.segundoNombre,
      rut.primerApellido,
      rut.segundoApellido,
    ]
      .filter((parte): parte is string => !!parte && parte.trim().length > 0)
      .join(' ')
      .trim();

    return (
      nombrePersona ||
      rut.razonSocial?.trim() ||
      rut.nombreComercial?.trim() ||
      'Contratista'
    );
  }

  /**
   * Genera `primernombre.primerapellido` normalizado. Si ya existe, agrega un
   * sufijo numérico (`.2`, `.3`, …) hasta encontrar uno libre.
   */
  async generarUsername(rut: RutExtraidoDto): Promise<string> {
    const primera =
      this.normalizar(rut.primerNombre) || this.normalizar(rut.razonSocial);
    const segunda =
      this.normalizar(rut.primerApellido) ||
      this.normalizar(rut.nombreComercial);

    let base = [primera, segunda].filter((p) => p.length > 0).join('.');
    if (!base) {
      base = `contratista.${rut.numeroIdentificacion}`;
    }

    let candidato = base;
    let sufijo = 1;
    while (await this.usernameExiste(candidato)) {
      sufijo++;
      candidato = `${base}.${sufijo}`;
    }
    return candidato;
  }

  private async usernameExiste(username: string): Promise<boolean> {
    const existe = await this.prisma.usuario.findUnique({
      where: { username },
      select: { id: true },
    });
    return existe !== null;
  }

  /** Minúsculas, sin acentos, sin caracteres no alfanuméricos. */
  private normalizar(valor?: string | null): string {
    if (!valor) return '';
    return valor
      .normalize('NFD')
      .replace(/[̀-ͯ]/g, '') // elimina diacríticos
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '')
      .trim();
  }

  /**
   * Contraseña aleatoria segura: 14 caracteres garantizando al menos una
   * mayúscula, una minúscula, un dígito y un símbolo.
   */
  generarPassword(): string {
    const mayus = 'ABCDEFGHJKLMNPQRSTUVWXYZ';
    const minus = 'abcdefghijkmnpqrstuvwxyz';
    const digitos = '23456789';
    const simbolos = '!@#$%&*?';
    const todos = mayus + minus + digitos + simbolos;

    const obligatorios = [
      this.elegir(mayus),
      this.elegir(minus),
      this.elegir(digitos),
      this.elegir(simbolos),
    ];

    const resto = Array.from({ length: 10 }, () => this.elegir(todos));
    return this.mezclar([...obligatorios, ...resto]).join('');
  }

  private elegir(charset: string): string {
    return charset[randomInt(charset.length)];
  }

  private mezclar(chars: string[]): string[] {
    for (let i = chars.length - 1; i > 0; i--) {
      const j = randomInt(i + 1);
      [chars[i], chars[j]] = [chars[j], chars[i]];
    }
    return chars;
  }
}
