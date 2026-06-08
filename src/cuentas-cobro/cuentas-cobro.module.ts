import { Module } from '@nestjs/common';
import { CuentasCobroController } from './cuentas-cobro/cuentas-cobro.controller';
import { CuentasCobroService } from './cuentas-cobro/cuentas-cobro.service';

@Module({
  controllers: [CuentasCobroController],
  providers: [CuentasCobroService]
})
export class CuentasCobroModule {}
