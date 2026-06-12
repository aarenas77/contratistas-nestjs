import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import * as bcrypt from 'bcrypt';
import * as dotenv from 'dotenv';

dotenv.config();

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! });
const prisma = new PrismaClient({ adapter });

const usuarios = [
  {
    username: 'contratista',
    password: 'Contratista123!',
    nombre: 'Juan Contratista',
    email: 'contratista@cuentascobro.dev',
    codigoTercero: '743',
    userIdentification: '10000001',
    rol: 'CONTRATISTA' as const,
  },
  {
    username: 'supervisor',
    password: 'Supervisor123!',
    nombre: 'María Supervisora',
    email: 'supervisor@cuentascobro.dev',
    codigoTercero: '22222',
    userIdentification: '10000002',
    rol: 'SUPERVISOR' as const,
  },
  {
    username: 'aprobador',
    password: 'Aprobador123!',
    nombre: 'Carlos Aprobador',
    email: 'aprobador@cuentascobro.dev',
    codigoTercero: '33333',
    userIdentification: '10000003',
    rol: 'APROBADOR' as const,
  },
  {
    username: 'admin',
    password: 'admin',
    nombre: 'Administrador',
    email: 'admin@cuentascobro.dev',
    codigoTercero: '0',
    userIdentification: '10000004',
    rol: 'ADMINISTRADOR' as const,
  },
];

const contratos = [
  {
    codigoContrato: 39492,
    consecutivo: '0433-2026',
    descripcion:
      'CONTRATO 0433 DE 2026. PRESTACION DE SERVICIOS PROFESIONALES EN EL DESARROLLO DEL PROYECTO ESTRATEGIAS PARA GARANTIZAR EL ACCESO A LA EDUCACION Y FORTALECER LA PERMANENCIA EDUCATIVA DE LOS NIÑOS, NIÑAS, ADOLESCENTES, JOVENES Y ADULTOS DE BELLO. PLAZO 4 MESES. FORMA DE PAGO ACTAS PARCIALES PREVIA AUTORIZACION DEL SUPERVISOR.',
    codigoTercero: '743',
    valor: 16800000,
    totalPago: 16800000,
    estado: 'A',
    fechaElaboracion: new Date('2026-01-27'),
    fechaAprobacion: new Date('2026-01-27'),
    fechaFin: new Date('2026-06-03'),
    fechaRegistro: new Date('2026-01-28'),
    fechaInicioSecop: new Date('2026-02-02'),
    plazoDias: 120,
    tipoPlazo: 'D',
    consecutivoCompromiso: 617,
    estadoCompromiso: 'APROBADO',
    numeroActaInicio: 1,
    saldoDisponibleOtrosGastos: 0,
    idSupervisor: null,
    codigoDependencia: 9,
    codigoMempresa: BigInt('9999999999'),
  },
  {
    codigoContrato: 38489,
    consecutivo: '1315-2025',
    descripcion:
      'Contrato 1315 de 2025, Prestación de Servicios Profesionales en el desarrollo del proyecto "Creación de entornos Protectores con Fortalecimiento de la Convivencia Escolar, la salud Mental, la Inclusión y la Diversidad en la Comunidad Educativa del Municipio de Bello", plazo 4 meses y 20 dias, pago parcial.',
    codigoTercero: '743',
    valor: 18666666,
    totalPago: 18666666,
    estado: 'A',
    fechaElaboracion: new Date('2025-08-11'),
    fechaAprobacion: new Date('2025-08-11'),
    fechaFin: new Date('2025-12-30'),
    fechaRegistro: new Date('2025-08-12'),
    fechaInicioSecop: new Date('2025-08-11'),
    plazoDias: 140,
    tipoPlazo: 'D',
    consecutivoCompromiso: 3745,
    estadoCompromiso: 'EN PROC. DE RESERVA',
    numeroActaInicio: null,
    saldoDisponibleOtrosGastos: 0,
    idSupervisor: null,
    codigoDependencia: 9,
    codigoMempresa: BigInt('9999999999'),
  },
  {
    codigoContrato: 37479,
    consecutivo: '0564 de 2025',
    descripcion:
      'CONTRATO 0564 DE 2025. OBJETO CONTRATO PRESTACIÓN DE SERVICIOS PROFESIONALES EN EL DESARROLLO DEL PROYECTO "ESTRATEGIAS PARA GARANTIZAR EL ACCESO A LA EDUCACIÓN Y FORTALECER LA PERMANENCIA EDUCATIVA DE LOS NIÑOS, NIÑAS, ADOLESCENTES, JÓVENES Y ADULTOS BELLANITAS" PLAZO CUATRO MESES. FORMA DE PAGO ACTAS PARCIALES PREVIA AUTORIZACION DEL SUPERVISOR.',
    codigoTercero: '743',
    valor: 16000000,
    totalPago: 16000000,
    estado: 'A',
    fechaElaboracion: new Date('2025-02-11'),
    fechaAprobacion: new Date('2025-02-11'),
    fechaFin: new Date('2025-06-14'),
    fechaRegistro: new Date('2025-02-11'),
    fechaInicioSecop: new Date('2025-02-13'),
    plazoDias: 120,
    tipoPlazo: 'D',
    consecutivoCompromiso: 585,
    estadoCompromiso: 'EN PROC. DE RESERVA',
    numeroActaInicio: null,
    saldoDisponibleOtrosGastos: 0,
    idSupervisor: null,
    codigoDependencia: 9,
    codigoMempresa: BigInt('9999999999'),
  },
];

const cuentasCobro = [
  {
    codigoContrato: 39492,
    codigoTercero: '743',
    codigoTerceroSupervisor: '10034',
    estado: 'RADICADA' as const,
    fechaSolicitud: new Date('2026-02-10T10:00:00Z'),
    fechaInicio: new Date('2026-02-02'),
    fechaFin: new Date('2026-02-28'),
    valorCobrado: 4200000,
  },
  {
    codigoContrato: 39492,
    codigoTercero: '743',
    codigoTerceroSupervisor: '10034',
    estado: 'EN_REVISION_SUPERVISOR' as const,
    fechaSolicitud: new Date('2026-03-05T14:30:00Z'),
    fechaInicio: new Date('2026-03-01'),
    fechaFin: new Date('2026-03-31'),
    valorCobrado: 4200000,
  },
  {
    codigoContrato: 39492,
    codigoTercero: '743',
    codigoTerceroSupervisor: '10034',
    estado: 'DEVUELTA_CONTRATISTA' as const,
    fechaSolicitud: new Date('2026-04-03T09:15:00Z'),
    fechaInicio: new Date('2026-04-01'),
    fechaFin: new Date('2026-04-30'),
    valorCobrado: 4200000,
  },
  {
    codigoContrato: 39492,
    codigoTercero: '743',
    codigoTerceroSupervisor: null,
    estado: 'BORRADOR' as const,
    fechaSolicitud: null,
    fechaInicio: new Date('2026-05-01'),
    fechaFin: new Date('2026-05-31'),
    valorCobrado: 4200000,
  },
];

const LIMITE_GENERACION_MES = new Date(Date.UTC(2027, 5, 1));

type CuentaMensualSeed = {
  codigoContrato: number;
  codigoTercero: string;
  codigoTerceroSupervisor: string | null;
  codigoTerceroAprobador: string | null;
  estado: 'BORRADOR';
  fechaSolicitud: Date | null;
  fechaInicio: Date;
  fechaFin: Date;
  valorCobrado: number;
};

function inicioDelMesUtc(fecha: Date) {
  return new Date(Date.UTC(fecha.getUTCFullYear(), fecha.getUTCMonth(), 1));
}

function finDelMesUtc(fecha: Date) {
  return new Date(Date.UTC(fecha.getUTCFullYear(), fecha.getUTCMonth() + 1, 0));
}

function sumarMesesUtc(fecha: Date, meses: number) {
  return new Date(
    Date.UTC(fecha.getUTCFullYear(), fecha.getUTCMonth() + meses, 1),
  );
}

function minMes(a: Date, b: Date) {
  if (a.getUTCFullYear() < b.getUTCFullYear()) return a;
  if (a.getUTCFullYear() > b.getUTCFullYear()) return b;
  return a.getUTCMonth() <= b.getUTCMonth() ? a : b;
}

function ultimoMesCompletoDisponible(fechaFin: Date | null) {
  if (!fechaFin) {
    return LIMITE_GENERACION_MES;
  }

  const cierreMes = finDelMesUtc(fechaFin);
  const inicioMes = inicioDelMesUtc(fechaFin);

  if (fechaFin.getUTCDate() === cierreMes.getUTCDate()) {
    return inicioMes;
  }

  return sumarMesesUtc(inicioMes, -1);
}

function obtenerFechaInicioContrato(contrato: {
  fechaInicioSecop?: Date | null;
  fechaRegistro: Date;
  fechaElaboracion: Date;
}) {
  return (
    contrato.fechaInicioSecop ??
    contrato.fechaRegistro ??
    contrato.fechaElaboracion
  );
}

function generarCuentasMensuales(contrato: {
  codigoContrato: number;
  codigoTercero: string;
  totalPago: unknown;
  fechaFin: Date | null;
  fechaInicioSecop?: Date | null;
  fechaRegistro: Date;
  fechaElaboracion: Date;
  cuentasCobro: Array<{ fechaInicio: Date }>;
}): CuentaMensualSeed[] {
  const fechaInicioContrato = obtenerFechaInicioContrato(contrato);
  const mesInicio = inicioDelMesUtc(fechaInicioContrato);
  const mesFin = minMes(
    ultimoMesCompletoDisponible(contrato.fechaFin),
    LIMITE_GENERACION_MES,
  );

  if (mesFin.getTime() < mesInicio.getTime()) {
    return [];
  }

  const totalMeses =
    (mesFin.getUTCFullYear() - mesInicio.getUTCFullYear()) * 12 +
    (mesFin.getUTCMonth() - mesInicio.getUTCMonth()) +
    1;

  const totalPago = Number(contrato.totalPago);
  const totalCentavos = Math.round(totalPago * 100);
  const baseCentavos = Math.floor(totalCentavos / totalMeses);

  const existentesPorMes = new Set(
    contrato.cuentasCobro.map(
      (cc) =>
        `${cc.fechaInicio.getUTCFullYear()}-${cc.fechaInicio.getUTCMonth()}`,
    ),
  );

  const cuentas: CuentaMensualSeed[] = [];
  for (let indice = 0; indice < totalMeses; indice += 1) {
    const mesActual = sumarMesesUtc(mesInicio, indice);
    const claveMes = `${mesActual.getUTCFullYear()}-${mesActual.getUTCMonth()}`;

    if (existentesPorMes.has(claveMes)) {
      continue;
    }

    const fechaInicio = indice === 0 ? fechaInicioContrato : mesActual;
    const fechaFinMes = finDelMesUtc(mesActual);
    const esUltimoMes = indice === totalMeses - 1;
    const fechaFin =
      esUltimoMes &&
      contrato.fechaFin &&
      contrato.fechaFin.getTime() < fechaFinMes.getTime()
        ? contrato.fechaFin
        : fechaFinMes;

    const centavos =
      indice === totalMeses - 1
        ? totalCentavos - baseCentavos * (totalMeses - 1)
        : baseCentavos;

    cuentas.push({
      codigoContrato: contrato.codigoContrato,
      codigoTercero: contrato.codigoTercero,
      codigoTerceroSupervisor: null,
      codigoTerceroAprobador: null,
      estado: 'BORRADOR' as const,
      fechaSolicitud: null,
      fechaInicio,
      fechaFin,
      valorCobrado: Number((centavos / 100).toFixed(2)),
    });
  }

  return cuentas;
}

async function main() {
  console.log('Ejecutando seed de usuarios...\n');

  for (const u of usuarios) {
    const { password, ...data } = u;
    const passwordHash = await bcrypt.hash(password, 10);

    await prisma.usuario.upsert({
      where: { username: u.username },
      update: {
        passwordHash,
        nombre: u.nombre,
        codigoTercero: u.codigoTercero,
        activo: true,
      },
      create: { ...data, passwordHash },
    });

    console.log(
      `✓  ${u.rol.padEnd(12)} | usuario: ${u.username} | contraseña: ${password}`,
    );
  }

  console.log('\nEjecutando seed de contratos...\n');

  for (const c of contratos) {
    await prisma.contrato.upsert({
      where: { codigoContrato: c.codigoContrato },
      update: {
        descripcion: c.descripcion,
        estadoCompromiso: c.estadoCompromiso,
        codigoTercero: c.codigoTercero,
      },
      create: c,
    });

    console.log(
      `✓  Contrato ${c.codigoContrato} | ${c.consecutivo} | codigoTercero: ${c.codigoTercero}`,
    );
  }

  console.log('\nEjecutando seed de cuentas de cobro...\n');

  const cleanupWhere = { codigoContrato: 39492 };
  await prisma.$transaction([
    prisma.adjunto.deleteMany({ where: { cuentaCobro: cleanupWhere } }),
    prisma.actividad.deleteMany({ where: { cuentaCobro: cleanupWhere } }),
    prisma.otroGasto.deleteMany({ where: { cuentaCobro: cleanupWhere } }),
    prisma.checklistRetefuente.deleteMany({
      where: { cuentaCobro: cleanupWhere },
    }),
    prisma.planilla.deleteMany({ where: { cuentaCobro: cleanupWhere } }),
    prisma.ejecucionFisica.deleteMany({ where: { cuentaCobro: cleanupWhere } }),
    prisma.informeSupervision.deleteMany({
      where: { cuentaCobro: cleanupWhere },
    }),
    prisma.historialEstado.deleteMany({ where: { cuentaCobro: cleanupWhere } }),
    prisma.cuentaCobro.deleteMany({ where: cleanupWhere }),
  ]);

  for (const cc of cuentasCobro) {
    const created = await prisma.cuentaCobro.create({ data: cc });
    console.log(
      `✓  CuentaCobro id:${created.id} | ticket:${created.ticket} | contrato:${cc.codigoContrato} | estado:${cc.estado}`,
    );
  }

  console.log(
    '\nGenerando cuentas de cobro mensuales hasta junio de 2027...\n',
  );

  const contratosConCuentas = await prisma.contrato.findMany({
    include: {
      cuentasCobro: {
        select: {
          fechaInicio: true,
        },
      },
    },
    orderBy: {
      codigoContrato: 'asc',
    },
  });

  const cuentasMensuales = contratosConCuentas.flatMap((contrato) =>
    generarCuentasMensuales(contrato).map((cuenta) => ({
      ...cuenta,
      fechaInicio: new Date(cuenta.fechaInicio),
      fechaFin: new Date(cuenta.fechaFin),
    })),
  );

  if (cuentasMensuales.length > 0) {
    await prisma.cuentaCobro.createMany({
      data: cuentasMensuales,
    });
  }

  console.log(`Cuentas mensuales generadas: ${cuentasMensuales.length}`);

  console.log('\nSeed completado.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
