import { Injectable, OnModuleInit } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit {
  constructor() {
    const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
    super({ adapter });
  }

  async onModuleInit() {
    await this.$connect();
    await this.sincronizarEnumEstadoCuentaCobro();
  }

  private async sincronizarEnumEstadoCuentaCobro() {
    const labels = await this.$queryRawUnsafe<Array<{ enumlabel: string }>>(
      `
        SELECT e.enumlabel
        FROM pg_enum e
        INNER JOIN pg_type t ON t.oid = e.enumtypid
        WHERE t.typname = 'EstadoCuentaCobro'
      `,
    );

    const valores = new Set(labels.map((row) => row.enumlabel));
    const tieneLiquidada = valores.has('LIQUIDADA');
    const tieneLegacy = valores.has('APROBADA_FINAL');

    if (tieneLegacy && !tieneLiquidada) {
      await this.$executeRawUnsafe(
        `ALTER TYPE "EstadoCuentaCobro" RENAME VALUE 'APROBADA_FINAL' TO 'LIQUIDADA'`,
      );
    }
  }
}
