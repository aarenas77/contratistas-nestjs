import { ConflictException, Injectable } from '@nestjs/common';
import { randomBytes, randomInt } from 'crypto';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../../prisma/prisma/prisma.service';
import { ExtraccionLegacyService } from '../extraccion/extraccion-legacy.service';
import { DatosExtraidosDto } from '../dto/datos-extraidos.dto';
import { FinalizarRegistroDto } from '../dto/finalizar-registro.dto';
import { RutExtraidoDto } from '../dto/rut-extraido.dto';
import { Rol } from '../../auth/interfaces/jwt-payload.interface';

@Injectable()
export class RegistroContratistasService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly extraccion: ExtraccionLegacyService,
  ) {}

  /** Paso 1: extrae la información del RUT y la certificación bancaria. */
  extraer(
    rut: Express.Multer.File,
    certificado: Express.Multer.File,
  ): Promise<DatosExtraidosDto> {
    return this.extraccion.extraer(rut, certificado);
  }

  /**
   * Genera un codigoTercero TEMPORAL único. Es un placeholder hasta que exista
   * la integración con el sistema de precarga real, que asignará el código
   * definitivo asociado a los contratos del contratista.
   */
  async generarCodigoTerceroTemporal(): Promise<string> {
    // Reintenta ante una colisión improbable con un código ya existente.
    for (let intento = 0; intento < 5; intento++) {
      const codigo = `TMP-${randomBytes(4).toString('hex')}`;
      const existe = await this.prisma.usuario.findFirst({
        where: { codigoTercero: codigo },
        select: { id: true },
      });
      if (!existe) return codigo;
    }
    throw new ConflictException('No se pudo generar un código de tercero único, intenta de nuevo.');
  }

  /** Paso final: crea el usuario contratista y devuelve sus credenciales. */
  async finalizar(dto: FinalizarRegistroDto) {
    const { rut } = dto;

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
      throw new ConflictException('Ya existe un usuario registrado con esa identificación o correo.');
    }

    const nombre = this.derivarNombre(rut);
    const username = await this.generarUsername(rut);
    const password = this.generarPassword();
    const passwordHash = await bcrypt.hash(password, 10);

    let usuario;
    try {
      usuario = await this.prisma.usuario.create({
        data: {
          username,
          passwordHash,
          nombre,
          email: rut.correoElectronico ?? null,
          codigoTercero: dto.codigoTercero,
          userIdentification: rut.numeroIdentificacion,
          rol: Rol.CONTRATISTA,
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

    return nombrePersona || rut.razonSocial?.trim() || rut.nombreComercial?.trim() || 'Contratista';
  }

  /**
   * Genera `primernombre.primerapellido` normalizado. Si ya existe, agrega un
   * sufijo numérico (`.2`, `.3`, …) hasta encontrar uno libre.
   */
  async generarUsername(rut: RutExtraidoDto): Promise<string> {
    const primera = this.normalizar(rut.primerNombre) || this.normalizar(rut.razonSocial);
    const segunda = this.normalizar(rut.primerApellido) || this.normalizar(rut.nombreComercial);

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
