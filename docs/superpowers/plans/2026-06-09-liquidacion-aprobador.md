# Liquidación automática de cuentas de cobro (rol APROBADOR) — Plan de Implementación

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Renombrar el estado `APROBADA_FINAL` a `LIQUIDADA` y hacer que la cuenta de cobro pase a `LIQUIDADA` cuando (a) el aprobador aprueba la última sección pendiente y todas quedan en `APROBADO`, o (b) el aprobador llama al endpoint global `/aprobador/cuentas-cobro/:id/aprobar` y todas las secciones ya están `APROBADO`.

**Architecture:** Se agregan dos métodos privados a `AprobadorService`: `verificarTodasSeccionesAprobadas` (revisa las 5 secciones, ignorando las que no tienen registros) y `liquidarSiCorresponde` (si todas están aprobadas, cambia `cuentaCobro.estado` a `LIQUIDADA` y registra el historial). Estos se invocan desde cada `aprobarSeccionXxx` (auto-liquidación) y desde `aprobar()` (liquidación explícita, con validación previa).

**Tech Stack:** NestJS, Prisma (PostgreSQL), Jest.

---

## Task 1: Migración Prisma — renombrar `APROBADA_FINAL` a `LIQUIDADA`

**Files:**
- Modify: `prisma/schema.prisma`
- Create: `prisma/migrations/20260609000000_rename_aprobada_final_to_liquidada/migration.sql`

- [ ] **Step 1: Editar el enum en el schema**

En `prisma/schema.prisma`, dentro de `enum EstadoCuentaCobro` (líneas 20-30), reemplazar:

```prisma
enum EstadoCuentaCobro {
  BORRADOR
  RADICADA
  EN_REVISION_SUPERVISOR
  DEVUELTA_CONTRATISTA
  APROBADA_SUPERVISOR
  EN_REVISION_APROBADOR
  RECHAZADA_APROBADOR
  APROBADA_FINAL
  ENVIADA_CONTABILIDAD
}
```

por:

```prisma
enum EstadoCuentaCobro {
  BORRADOR
  RADICADA
  EN_REVISION_SUPERVISOR
  DEVUELTA_CONTRATISTA
  APROBADA_SUPERVISOR
  EN_REVISION_APROBADOR
  RECHAZADA_APROBADOR
  LIQUIDADA
  ENVIADA_CONTABILIDAD
}
```

- [ ] **Step 2: Crear la migración SQL manualmente**

Crear el directorio `prisma/migrations/20260609000000_rename_aprobada_final_to_liquidada/` con el archivo `migration.sql`:

```sql
-- RenameEnumValue
ALTER TYPE "EstadoCuentaCobro" RENAME VALUE 'APROBADA_FINAL' TO 'LIQUIDADA';
```

- [ ] **Step 3: Aplicar la migración y regenerar el cliente Prisma**

Run: `npx prisma migrate dev`
Expected: la migración `20260609000000_rename_aprobada_final_to_liquidada` se marca como aplicada y el cliente Prisma se regenera sin errores (el tipo `EstadoCuentaCobro` ahora expone `LIQUIDADA` en vez de `APROBADA_FINAL`).

- [ ] **Step 4: Commit**

```bash
git add prisma/schema.prisma prisma/migrations/20260609000000_rename_aprobada_final_to_liquidada
git commit -m "feat(prisma): renombrar estado APROBADA_FINAL a LIQUIDADA"
```

---

## Task 2: Actualizar el mapeo legado de estados en `cuentas-cobro.service.ts`

**Files:**
- Modify: `src/cuentas-cobro/cuentas-cobro/cuentas-cobro.service.ts:15`

- [ ] **Step 1: Actualizar la clave del mapeo**

En `src/cuentas-cobro/cuentas-cobro/cuentas-cobro.service.ts`, el objeto de mapeo (líneas 12-17) tiene:

```ts
  APROBADA_SUPERVISOR:    { idEstado: 4, estado: 'APROBADA_SUPERVISOR' },
  EN_REVISION_APROBADOR:  { idEstado: 5, estado: 'EN_REVISION_APROBADOR' },
  RECHAZADA_APROBADOR:    { idEstado: 6, estado: 'RECHAZADA' },
  APROBADA_FINAL:         { idEstado: 7, estado: 'APROBADA' },
  ENVIADA_CONTABILIDAD:   { idEstado: 8, estado: 'ENVIADA_CONTABILIDAD' },
```

Reemplazar por:

```ts
  APROBADA_SUPERVISOR:    { idEstado: 4, estado: 'APROBADA_SUPERVISOR' },
  EN_REVISION_APROBADOR:  { idEstado: 5, estado: 'EN_REVISION_APROBADOR' },
  RECHAZADA_APROBADOR:    { idEstado: 6, estado: 'RECHAZADA' },
  LIQUIDADA:              { idEstado: 7, estado: 'APROBADA' },
  ENVIADA_CONTABILIDAD:   { idEstado: 8, estado: 'ENVIADA_CONTABILIDAD' },
```

- [ ] **Step 2: Verificar que no quedan referencias a `APROBADA_FINAL`**

Run: `grep -rn "APROBADA_FINAL" src prisma`
Expected: sin resultados (0 coincidencias).

- [ ] **Step 3: Commit**

```bash
git add src/cuentas-cobro/cuentas-cobro/cuentas-cobro.service.ts
git commit -m "feat(cuentas-cobro): actualizar mapeo legado a estado LIQUIDADA"
```

---

## Task 3: Helpers de verificación/liquidación + integración en sección "informe de actividades"

**Files:**
- Modify: `src/aprobador/aprobador/aprobador.service.ts`
- Test: `src/aprobador/aprobador/aprobador.service.spec.ts`

- [ ] **Step 1: Ampliar el mock de Prisma en el spec**

En `src/aprobador/aprobador/aprobador.service.spec.ts`, reemplazar el `mockPrismaService` (líneas 5-10):

```ts
const mockPrismaService = {
  cuentaCobro: {
    findMany: jest.fn(),
    count: jest.fn(),
  },
};
```

por:

```ts
const mockPrismaService = {
  cuentaCobro: {
    findMany: jest.fn(),
    count: jest.fn(),
    findUniqueOrThrow: jest.fn(),
  },
  $transaction: jest.fn(),
};
```

- [ ] **Step 2: Escribir los tests fallidos para `aprobarSeccionInformeActividades`**

Agregar al final del archivo, antes del último `});` que cierra el `describe('AprobadorService', ...)`:

```ts
  describe('aprobarSeccionInformeActividades', () => {
    const id = BigInt(10);
    const codigoTercero = 'APR001';
    const usuarioNombre = 'Ana Aprobadora';

    const cuentaEnRevision = {
      id,
      codigoTerceroAprobador: codigoTercero,
      estado: 'EN_REVISION_APROBADOR',
    };

    function buildTx(overrides: Record<string, any> = {}) {
      return {
        actividad: {
          updateMany: jest.fn().mockResolvedValue({ count: 1 }),
          count: jest.fn().mockResolvedValue(0),
        },
        planilla: { findUnique: jest.fn().mockResolvedValue(null) },
        checklistRetefuente: { count: jest.fn().mockResolvedValue(0) },
        otroGasto: { count: jest.fn().mockResolvedValue(0) },
        ejecucionFisica: { findUnique: jest.fn().mockResolvedValue(null) },
        cuentaCobro: { update: jest.fn().mockResolvedValue({ ...cuentaEnRevision, estado: 'LIQUIDADA' }) },
        historialEstado: { create: jest.fn().mockResolvedValue({}) },
        ...overrides,
      };
    }

    it('aprueba la sección y liquida la cuenta cuando es la única sección con datos', async () => {
      mockPrismaService.cuentaCobro.findUniqueOrThrow.mockResolvedValue(cuentaEnRevision);
      const tx = buildTx();
      mockPrismaService.$transaction.mockImplementation(async (cb) => cb(tx));

      const result = await service.aprobarSeccionInformeActividades(id, codigoTercero, usuarioNombre);

      expect(tx.cuentaCobro.update).toHaveBeenCalledWith({
        where: { id },
        data: { estado: 'LIQUIDADA' },
      });
      expect(tx.historialEstado.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          cuentaCobroId: id,
          estadoAnterior: 'EN_REVISION_APROBADOR',
          estadoNuevo: 'LIQUIDADA',
          usuarioId: codigoTercero,
          usuarioNombre,
        }),
      });
      expect(result).toMatchObject({
        mensaje: 'Informe de actividades aprobado por el aprobador',
        seccion: 'INFORME_ACTIVIDADES',
        estado: 'APROBADO',
        cuentaLiquidada: true,
      });
    });

    it('aprueba la sección sin liquidar si quedan secciones pendientes', async () => {
      mockPrismaService.cuentaCobro.findUniqueOrThrow.mockResolvedValue(cuentaEnRevision);
      const tx = buildTx({
        checklistRetefuente: { count: jest.fn().mockResolvedValue(2) },
      });
      mockPrismaService.$transaction.mockImplementation(async (cb) => cb(tx));

      const result = await service.aprobarSeccionInformeActividades(id, codigoTercero, usuarioNombre);

      expect(tx.cuentaCobro.update).not.toHaveBeenCalled();
      expect(result).toMatchObject({
        seccion: 'INFORME_ACTIVIDADES',
        estado: 'APROBADO',
        cuentaLiquidada: false,
      });
    });
  });
```

- [ ] **Step 3: Ejecutar los tests para verificar que fallan**

Run: `npx jest src/aprobador/aprobador/aprobador.service.spec.ts -t "aprobarSeccionInformeActividades"`
Expected: FAIL — `result.cuentaLiquidada` es `undefined` (no coincide con `true`/`false`), porque el método aún no llama a ningún helper de liquidación.

- [ ] **Step 4: Implementar los helpers `verificarTodasSeccionesAprobadas` y `liquidarSiCorresponde`**

En `src/aprobador/aprobador/aprobador.service.ts`, justo después del método `activarRevisionAprobador` (que termina en la línea 153 con `}`), agregar:

```ts

  private async verificarTodasSeccionesAprobadas(tx: any, id: bigint): Promise<boolean> {
    const [actividadesPendientes, planilla, retencionesPendientes, gastosPendientes, ejecucion] = await Promise.all([
      tx.actividad.count({ where: { cuentaCobroId: id, estadoRevisionAprobador: { not: 'APROBADO' } } }),
      tx.planilla.findUnique({ where: { cuentaCobroId: id } }),
      tx.checklistRetefuente.count({ where: { cuentaCobroId: id, estadoRevisionAprobador: { not: 'APROBADO' } } }),
      tx.otroGasto.count({ where: { cuentaCobroId: id, estadoRevisionAprobador: { not: 'APROBADO' } } }),
      tx.ejecucionFisica.findUnique({ where: { cuentaCobroId: id } }),
    ]);

    if (actividadesPendientes > 0 || retencionesPendientes > 0 || gastosPendientes > 0) {
      return false;
    }
    if (planilla && planilla.estadoRevisionAprobador !== 'APROBADO') {
      return false;
    }
    if (ejecucion && ejecucion.estadoRevisionAprobador !== 'APROBADO') {
      return false;
    }
    return true;
  }

  private async liquidarSiCorresponde(tx: any, id: bigint, codigoTercero: string, usuarioNombre: string): Promise<boolean> {
    const todasAprobadas = await this.verificarTodasSeccionesAprobadas(tx, id);
    if (!todasAprobadas) {
      return false;
    }

    await tx.cuentaCobro.update({
      where: { id },
      data: { estado: 'LIQUIDADA' },
    });
    await tx.historialEstado.create({
      data: {
        cuentaCobroId: id,
        estadoAnterior: 'EN_REVISION_APROBADOR',
        estadoNuevo: 'LIQUIDADA',
        usuarioId: codigoTercero,
        usuarioNombre,
        observacion: 'Cuenta de cobro liquidada automáticamente al aprobar todas las secciones',
      },
    });
    return true;
  }
```

- [ ] **Step 5: Integrar el helper en `aprobarSeccionInformeActividades`**

Reemplazar el método (líneas 155-168 actuales):

```ts
  async aprobarSeccionInformeActividades(id: bigint, codigoTercero: string, usuarioNombre: string) {
    const cuenta = await this.validarPermisoSeccionAprobador(id, codigoTercero);
    return this.prisma.$transaction(async (tx) => {
      await this.activarRevisionAprobador(tx, id, codigoTercero, usuarioNombre, cuenta.estado);
      const result = await tx.actividad.updateMany({
        where: { cuentaCobroId: id },
        data: { estadoRevisionAprobador: 'APROBADO', observacionRevisionAprobador: null },
      });
      if (result.count === 0) {
        throw new BadRequestException('No hay actividades registradas en esta cuenta');
      }
      return { mensaje: 'Informe de actividades aprobado por el aprobador', seccion: 'INFORME_ACTIVIDADES', estado: 'APROBADO' };
    });
  }
```

por:

```ts
  async aprobarSeccionInformeActividades(id: bigint, codigoTercero: string, usuarioNombre: string) {
    const cuenta = await this.validarPermisoSeccionAprobador(id, codigoTercero);
    return this.prisma.$transaction(async (tx) => {
      await this.activarRevisionAprobador(tx, id, codigoTercero, usuarioNombre, cuenta.estado);
      const result = await tx.actividad.updateMany({
        where: { cuentaCobroId: id },
        data: { estadoRevisionAprobador: 'APROBADO', observacionRevisionAprobador: null },
      });
      if (result.count === 0) {
        throw new BadRequestException('No hay actividades registradas en esta cuenta');
      }
      const cuentaLiquidada = await this.liquidarSiCorresponde(tx, id, codigoTercero, usuarioNombre);
      return { mensaje: 'Informe de actividades aprobado por el aprobador', seccion: 'INFORME_ACTIVIDADES', estado: 'APROBADO', cuentaLiquidada };
    });
  }
```

- [ ] **Step 6: Ejecutar los tests y verificar que pasan**

Run: `npx jest src/aprobador/aprobador/aprobador.service.spec.ts`
Expected: PASS — todos los tests, incluidos los dos nuevos.

- [ ] **Step 7: Commit**

```bash
git add src/aprobador/aprobador/aprobador.service.ts src/aprobador/aprobador/aprobador.service.spec.ts
git commit -m "feat(aprobador): liquidar cuenta automaticamente al completar secciones (informe de actividades)"
```

---

## Task 4: Integrar auto-liquidación en la sección "planilla" (sección opcional con `findUnique`)

**Files:**
- Modify: `src/aprobador/aprobador/aprobador.service.ts`
- Test: `src/aprobador/aprobador/aprobador.service.spec.ts`

- [ ] **Step 1: Escribir los tests fallidos para `aprobarSeccionPlanilla`**

Agregar dentro de `describe('AprobadorService', ...)`, después del bloque `describe('aprobarSeccionInformeActividades', ...)`:

```ts
  describe('aprobarSeccionPlanilla', () => {
    const id = BigInt(11);
    const codigoTercero = 'APR001';
    const usuarioNombre = 'Ana Aprobadora';

    const cuentaEnRevision = {
      id,
      codigoTerceroAprobador: codigoTercero,
      estado: 'EN_REVISION_APROBADOR',
    };

    function buildTx(overrides: Record<string, any> = {}) {
      return {
        actividad: { count: jest.fn().mockResolvedValue(0) },
        planilla: {
          findUnique: jest.fn().mockResolvedValue({ estadoRevisionAprobador: 'APROBADO' }),
          update: jest.fn().mockResolvedValue({}),
        },
        checklistRetefuente: { count: jest.fn().mockResolvedValue(0) },
        otroGasto: { count: jest.fn().mockResolvedValue(0) },
        ejecucionFisica: { findUnique: jest.fn().mockResolvedValue(null) },
        cuentaCobro: { update: jest.fn().mockResolvedValue({ ...cuentaEnRevision, estado: 'LIQUIDADA' }) },
        historialEstado: { create: jest.fn().mockResolvedValue({}) },
        ...overrides,
      };
    }

    beforeEach(() => {
      mockPrismaService.cuentaCobro.findUniqueOrThrow.mockResolvedValue(cuentaEnRevision);
    });

    it('aprueba la sección y liquida la cuenta cuando es la última sección pendiente', async () => {
      (mockPrismaService as any).planilla = { findUnique: jest.fn().mockResolvedValue({ id: BigInt(1) }) };
      const tx = buildTx();
      mockPrismaService.$transaction.mockImplementation(async (cb) => cb(tx));

      const result = await service.aprobarSeccionPlanilla(id, codigoTercero, usuarioNombre);

      expect(tx.planilla.update).toHaveBeenCalledWith({
        where: { cuentaCobroId: id },
        data: { estadoRevisionAprobador: 'APROBADO', observacionRevisionAprobador: null },
      });
      expect(tx.cuentaCobro.update).toHaveBeenCalledWith({
        where: { id },
        data: { estado: 'LIQUIDADA' },
      });
      expect(result).toMatchObject({
        mensaje: 'Pago de planilla aprobado por el aprobador',
        seccion: 'PLANILLA',
        estado: 'APROBADO',
        cuentaLiquidada: true,
      });
    });

    it('no liquida si la planilla recién aprobada todavía no refleja APROBADO en la verificación', async () => {
      (mockPrismaService as any).planilla = { findUnique: jest.fn().mockResolvedValue({ id: BigInt(1) }) };
      const tx = buildTx({
        planilla: {
          findUnique: jest.fn().mockResolvedValue({ estadoRevisionAprobador: 'PENDIENTE' }),
          update: jest.fn().mockResolvedValue({}),
        },
      });
      mockPrismaService.$transaction.mockImplementation(async (cb) => cb(tx));

      const result = await service.aprobarSeccionPlanilla(id, codigoTercero, usuarioNombre);

      expect(tx.cuentaCobro.update).not.toHaveBeenCalled();
      expect(result).toMatchObject({
        seccion: 'PLANILLA',
        estado: 'APROBADO',
        cuentaLiquidada: false,
      });
    });
  });
```

> Nota: `service.aprobarSeccionPlanilla` llama primero a `this.prisma.planilla.findUnique` (fuera de la transacción) para validar que exista la planilla. Por eso el test asigna `(mockPrismaService as any).planilla.findUnique` antes de llamar al servicio.

- [ ] **Step 2: Ejecutar los tests para verificar que fallan**

Run: `npx jest src/aprobador/aprobador/aprobador.service.spec.ts -t "aprobarSeccionPlanilla"`
Expected: FAIL — `result.cuentaLiquidada` es `undefined`.

- [ ] **Step 3: Integrar el helper en `aprobarSeccionPlanilla`**

Reemplazar el método (líneas 185-199 actuales):

```ts
  async aprobarSeccionPlanilla(id: bigint, codigoTercero: string, usuarioNombre: string) {
    const cuenta = await this.validarPermisoSeccionAprobador(id, codigoTercero);
    const planilla = await this.prisma.planilla.findUnique({ where: { cuentaCobroId: id } });
    if (!planilla) {
      throw new BadRequestException('No hay planilla de seguridad social registrada en esta cuenta');
    }
    return this.prisma.$transaction(async (tx) => {
      await this.activarRevisionAprobador(tx, id, codigoTercero, usuarioNombre, cuenta.estado);
      await tx.planilla.update({
        where: { cuentaCobroId: id },
        data: { estadoRevisionAprobador: 'APROBADO', observacionRevisionAprobador: null },
      });
      return { mensaje: 'Pago de planilla aprobado por el aprobador', seccion: 'PLANILLA', estado: 'APROBADO' };
    });
  }
```

por:

```ts
  async aprobarSeccionPlanilla(id: bigint, codigoTercero: string, usuarioNombre: string) {
    const cuenta = await this.validarPermisoSeccionAprobador(id, codigoTercero);
    const planilla = await this.prisma.planilla.findUnique({ where: { cuentaCobroId: id } });
    if (!planilla) {
      throw new BadRequestException('No hay planilla de seguridad social registrada en esta cuenta');
    }
    return this.prisma.$transaction(async (tx) => {
      await this.activarRevisionAprobador(tx, id, codigoTercero, usuarioNombre, cuenta.estado);
      await tx.planilla.update({
        where: { cuentaCobroId: id },
        data: { estadoRevisionAprobador: 'APROBADO', observacionRevisionAprobador: null },
      });
      const cuentaLiquidada = await this.liquidarSiCorresponde(tx, id, codigoTercero, usuarioNombre);
      return { mensaje: 'Pago de planilla aprobado por el aprobador', seccion: 'PLANILLA', estado: 'APROBADO', cuentaLiquidada };
    });
  }
```

- [ ] **Step 4: Ejecutar los tests y verificar que pasan**

Run: `npx jest src/aprobador/aprobador/aprobador.service.spec.ts`
Expected: PASS — todos los tests.

- [ ] **Step 5: Commit**

```bash
git add src/aprobador/aprobador/aprobador.service.ts src/aprobador/aprobador/aprobador.service.spec.ts
git commit -m "feat(aprobador): liquidar cuenta automaticamente al aprobar seccion de planilla"
```

---

## Task 5: Integrar auto-liquidación en retenciones, gastos adicionales y ejecución física

**Files:**
- Modify: `src/aprobador/aprobador/aprobador.service.ts`
- Test: `src/aprobador/aprobador/aprobador.service.spec.ts`

- [ ] **Step 1: Escribir un test fallido para `aprobarSeccionEjecucionFisica`**

Agregar dentro de `describe('AprobadorService', ...)`, después del bloque `describe('aprobarSeccionPlanilla', ...)`:

```ts
  describe('aprobarSeccionEjecucionFisica', () => {
    const id = BigInt(12);
    const codigoTercero = 'APR001';
    const usuarioNombre = 'Ana Aprobadora';

    const cuentaEnRevision = {
      id,
      codigoTerceroAprobador: codigoTercero,
      estado: 'EN_REVISION_APROBADOR',
    };

    it('aprueba la sección y liquida la cuenta cuando es la última sección pendiente', async () => {
      mockPrismaService.cuentaCobro.findUniqueOrThrow.mockResolvedValue(cuentaEnRevision);
      (mockPrismaService as any).ejecucionFisica = { findUnique: jest.fn().mockResolvedValue({ id: BigInt(1) }) };

      const tx = {
        actividad: { count: jest.fn().mockResolvedValue(0) },
        planilla: { findUnique: jest.fn().mockResolvedValue(null) },
        checklistRetefuente: { count: jest.fn().mockResolvedValue(0) },
        otroGasto: { count: jest.fn().mockResolvedValue(0) },
        ejecucionFisica: {
          findUnique: jest.fn().mockResolvedValue({ estadoRevisionAprobador: 'APROBADO' }),
          update: jest.fn().mockResolvedValue({}),
        },
        cuentaCobro: { update: jest.fn().mockResolvedValue({ ...cuentaEnRevision, estado: 'LIQUIDADA' }) },
        historialEstado: { create: jest.fn().mockResolvedValue({}) },
      };
      mockPrismaService.$transaction.mockImplementation(async (cb) => cb(tx));

      const result = await service.aprobarSeccionEjecucionFisica(id, codigoTercero, usuarioNombre);

      expect(tx.ejecucionFisica.update).toHaveBeenCalledWith({
        where: { cuentaCobroId: id },
        data: { estadoRevisionAprobador: 'APROBADO', observacionRevisionAprobador: null },
      });
      expect(tx.cuentaCobro.update).toHaveBeenCalledWith({
        where: { id },
        data: { estado: 'LIQUIDADA' },
      });
      expect(result).toMatchObject({
        mensaje: 'Ejecución física aprobada por el aprobador',
        seccion: 'EJECUCION_FISICA',
        estado: 'APROBADO',
        cuentaLiquidada: true,
      });
    });
  });
```

- [ ] **Step 2: Ejecutar el test para verificar que falla**

Run: `npx jest src/aprobador/aprobador/aprobador.service.spec.ts -t "aprobarSeccionEjecucionFisica"`
Expected: FAIL — `result.cuentaLiquidada` es `undefined`.

- [ ] **Step 3: Integrar el helper en `aprobarSeccionRetenciones`**

Reemplazar el método (líneas 217-230 actuales):

```ts
  async aprobarSeccionRetenciones(id: bigint, codigoTercero: string, usuarioNombre: string) {
    const cuenta = await this.validarPermisoSeccionAprobador(id, codigoTercero);
    return this.prisma.$transaction(async (tx) => {
      await this.activarRevisionAprobador(tx, id, codigoTercero, usuarioNombre, cuenta.estado);
      const result = await tx.checklistRetefuente.updateMany({
        where: { cuentaCobroId: id },
        data: { estadoRevisionAprobador: 'APROBADO', observacionRevisionAprobador: null },
      });
      if (result.count === 0) {
        throw new BadRequestException('No hay ítems de retenciones registrados en esta cuenta');
      }
      return { mensaje: 'Retenciones aprobadas por el aprobador', seccion: 'RETENCIONES', estado: 'APROBADO' };
    });
  }
```

por:

```ts
  async aprobarSeccionRetenciones(id: bigint, codigoTercero: string, usuarioNombre: string) {
    const cuenta = await this.validarPermisoSeccionAprobador(id, codigoTercero);
    return this.prisma.$transaction(async (tx) => {
      await this.activarRevisionAprobador(tx, id, codigoTercero, usuarioNombre, cuenta.estado);
      const result = await tx.checklistRetefuente.updateMany({
        where: { cuentaCobroId: id },
        data: { estadoRevisionAprobador: 'APROBADO', observacionRevisionAprobador: null },
      });
      if (result.count === 0) {
        throw new BadRequestException('No hay ítems de retenciones registrados en esta cuenta');
      }
      const cuentaLiquidada = await this.liquidarSiCorresponde(tx, id, codigoTercero, usuarioNombre);
      return { mensaje: 'Retenciones aprobadas por el aprobador', seccion: 'RETENCIONES', estado: 'APROBADO', cuentaLiquidada };
    });
  }
```

- [ ] **Step 4: Integrar el helper en `aprobarSeccionGastosAdicionales`**

Reemplazar el método (líneas 247-260 actuales):

```ts
  async aprobarSeccionGastosAdicionales(id: bigint, codigoTercero: string, usuarioNombre: string) {
    const cuenta = await this.validarPermisoSeccionAprobador(id, codigoTercero);
    return this.prisma.$transaction(async (tx) => {
      await this.activarRevisionAprobador(tx, id, codigoTercero, usuarioNombre, cuenta.estado);
      const result = await tx.otroGasto.updateMany({
        where: { cuentaCobroId: id },
        data: { estadoRevisionAprobador: 'APROBADO', observacionRevisionAprobador: null },
      });
      if (result.count === 0) {
        throw new BadRequestException('No hay gastos adicionales registrados en esta cuenta');
      }
      return { mensaje: 'Gastos adicionales aprobados por el aprobador', seccion: 'GASTOS_ADICIONALES', estado: 'APROBADO' };
    });
  }
```

por:

```ts
  async aprobarSeccionGastosAdicionales(id: bigint, codigoTercero: string, usuarioNombre: string) {
    const cuenta = await this.validarPermisoSeccionAprobador(id, codigoTercero);
    return this.prisma.$transaction(async (tx) => {
      await this.activarRevisionAprobador(tx, id, codigoTercero, usuarioNombre, cuenta.estado);
      const result = await tx.otroGasto.updateMany({
        where: { cuentaCobroId: id },
        data: { estadoRevisionAprobador: 'APROBADO', observacionRevisionAprobador: null },
      });
      if (result.count === 0) {
        throw new BadRequestException('No hay gastos adicionales registrados en esta cuenta');
      }
      const cuentaLiquidada = await this.liquidarSiCorresponde(tx, id, codigoTercero, usuarioNombre);
      return { mensaje: 'Gastos adicionales aprobados por el aprobador', seccion: 'GASTOS_ADICIONALES', estado: 'APROBADO', cuentaLiquidada };
    });
  }
```

- [ ] **Step 5: Integrar el helper en `aprobarSeccionEjecucionFisica`**

Reemplazar el método (líneas 277-291 actuales):

```ts
  async aprobarSeccionEjecucionFisica(id: bigint, codigoTercero: string, usuarioNombre: string) {
    const cuenta = await this.validarPermisoSeccionAprobador(id, codigoTercero);
    const ejecucion = await this.prisma.ejecucionFisica.findUnique({ where: { cuentaCobroId: id } });
    if (!ejecucion) {
      throw new BadRequestException('No hay ejecución física registrada en esta cuenta');
    }
    return this.prisma.$transaction(async (tx) => {
      await this.activarRevisionAprobador(tx, id, codigoTercero, usuarioNombre, cuenta.estado);
      await tx.ejecucionFisica.update({
        where: { cuentaCobroId: id },
        data: { estadoRevisionAprobador: 'APROBADO', observacionRevisionAprobador: null },
      });
      return { mensaje: 'Ejecución física aprobada por el aprobador', seccion: 'EJECUCION_FISICA', estado: 'APROBADO' };
    });
  }
```

por:

```ts
  async aprobarSeccionEjecucionFisica(id: bigint, codigoTercero: string, usuarioNombre: string) {
    const cuenta = await this.validarPermisoSeccionAprobador(id, codigoTercero);
    const ejecucion = await this.prisma.ejecucionFisica.findUnique({ where: { cuentaCobroId: id } });
    if (!ejecucion) {
      throw new BadRequestException('No hay ejecución física registrada en esta cuenta');
    }
    return this.prisma.$transaction(async (tx) => {
      await this.activarRevisionAprobador(tx, id, codigoTercero, usuarioNombre, cuenta.estado);
      await tx.ejecucionFisica.update({
        where: { cuentaCobroId: id },
        data: { estadoRevisionAprobador: 'APROBADO', observacionRevisionAprobador: null },
      });
      const cuentaLiquidada = await this.liquidarSiCorresponde(tx, id, codigoTercero, usuarioNombre);
      return { mensaje: 'Ejecución física aprobada por el aprobador', seccion: 'EJECUCION_FISICA', estado: 'APROBADO', cuentaLiquidada };
    });
  }
```

- [ ] **Step 6: Ejecutar los tests y verificar que pasan**

Run: `npx jest src/aprobador/aprobador/aprobador.service.spec.ts`
Expected: PASS — todos los tests.

- [ ] **Step 7: Commit**

```bash
git add src/aprobador/aprobador/aprobador.service.ts src/aprobador/aprobador/aprobador.service.spec.ts
git commit -m "feat(aprobador): liquidar cuenta automaticamente en retenciones, gastos adicionales y ejecucion fisica"
```

---

## Task 6: Endpoint global `/aprobador/cuentas-cobro/:id/aprobar` exige todas las secciones aprobadas

**Files:**
- Modify: `src/aprobador/aprobador/aprobador.service.ts:63-91`
- Modify: `src/aprobador/aprobador/aprobador.controller.ts:28-37`
- Test: `src/aprobador/aprobador/aprobador.service.spec.ts`

- [ ] **Step 1: Escribir los tests fallidos para `aprobar`**

Agregar dentro de `describe('AprobadorService', ...)`, después del bloque `describe('aprobarSeccionEjecucionFisica', ...)`:

```ts
  describe('aprobar', () => {
    const id = BigInt(20);
    const codigoTercero = 'APR001';
    const usuarioNombre = 'Ana Aprobadora';

    const cuentaEnRevision = {
      id,
      codigoTerceroAprobador: codigoTercero,
      estado: 'EN_REVISION_APROBADOR',
    };

    function buildTx(overrides: Record<string, any> = {}) {
      return {
        actividad: { count: jest.fn().mockResolvedValue(0) },
        planilla: { findUnique: jest.fn().mockResolvedValue(null) },
        checklistRetefuente: { count: jest.fn().mockResolvedValue(0) },
        otroGasto: { count: jest.fn().mockResolvedValue(0) },
        ejecucionFisica: { findUnique: jest.fn().mockResolvedValue(null) },
        cuentaCobro: { update: jest.fn().mockResolvedValue({ ...cuentaEnRevision, estado: 'LIQUIDADA' }) },
        historialEstado: { create: jest.fn().mockResolvedValue({}) },
        ...overrides,
      };
    }

    it('lanza BadRequestException si quedan secciones sin aprobar', async () => {
      mockPrismaService.cuentaCobro.findUniqueOrThrow.mockResolvedValue(cuentaEnRevision);
      const tx = buildTx({ actividad: { count: jest.fn().mockResolvedValue(1) } });
      mockPrismaService.$transaction.mockImplementation(async (cb) => cb(tx));

      await expect(service.aprobar(id, codigoTercero, usuarioNombre)).rejects.toThrow(BadRequestException);
      expect(tx.cuentaCobro.update).not.toHaveBeenCalled();
    });

    it('cambia el estado a LIQUIDADA cuando todas las secciones están aprobadas', async () => {
      mockPrismaService.cuentaCobro.findUniqueOrThrow.mockResolvedValue(cuentaEnRevision);
      const tx = buildTx();
      mockPrismaService.$transaction.mockImplementation(async (cb) => cb(tx));

      const result = await service.aprobar(id, codigoTercero, usuarioNombre);

      expect(tx.cuentaCobro.update).toHaveBeenCalledWith({
        where: { id },
        data: { estado: 'LIQUIDADA' },
      });
      expect(tx.historialEstado.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          cuentaCobroId: id,
          estadoAnterior: 'EN_REVISION_APROBADOR',
          estadoNuevo: 'LIQUIDADA',
          usuarioId: codigoTercero,
          usuarioNombre,
          observacion: 'Cuenta de cobro liquidada por el aprobador',
        }),
      });
      expect(result.estado).toBe('LIQUIDADA');
      expect(result.mensaje).toBe('Cuenta de cobro liquidada');
    });
  });
```

Agregar también el import de `BadRequestException` al inicio del spec si no está presente:

```ts
import { BadRequestException } from '@nestjs/common';
```

- [ ] **Step 2: Ejecutar los tests para verificar que fallan**

Run: `npx jest src/aprobador/aprobador/aprobador.service.spec.ts -t "aprobar"`
Expected: FAIL — el primer test no lanza `BadRequestException` (el método actual no valida secciones); el segundo espera `estado: 'LIQUIDADA'` pero el método actual produce `'APROBADA_FINAL'`.

- [ ] **Step 3: Reescribir `aprobar()`**

Reemplazar el método (líneas 63-91 actuales):

```ts
  async aprobar(id: bigint, codigoTercero: string, usuarioNombre: string) {
    const cuenta = await this.prisma.cuentaCobro.findUniqueOrThrow({ where: { id } });

    if (cuenta.codigoTerceroAprobador !== codigoTercero) {
      throw new ForbiddenException('No tienes permisos para aprobar esta cuenta de cobro');
    }

    if (cuenta.estado !== 'EN_REVISION_APROBADOR') {
      throw new BadRequestException('Solo se puede aprobar una cuenta en estado EN_REVISION_APROBADOR');
    }

    return this.prisma.$transaction(async (tx) => {
      const actualizada = await tx.cuentaCobro.update({
        where: { id },
        data: { estado: 'APROBADA_FINAL' },
      });
      await tx.historialEstado.create({
        data: {
          cuentaCobroId: id,
          estadoAnterior: 'EN_REVISION_APROBADOR',
          estadoNuevo: 'APROBADA_FINAL',
          usuarioId: codigoTercero,
          usuarioNombre,
          observacion: 'Cuenta de cobro aprobada definitivamente por el aprobador',
        },
      });
      return { ...actualizada, mensaje: 'Cuenta de cobro aprobada definitivamente' };
    });
  }
```

por:

```ts
  async aprobar(id: bigint, codigoTercero: string, usuarioNombre: string) {
    const cuenta = await this.prisma.cuentaCobro.findUniqueOrThrow({ where: { id } });

    if (cuenta.codigoTerceroAprobador !== codigoTercero) {
      throw new ForbiddenException('No tienes permisos para aprobar esta cuenta de cobro');
    }

    if (cuenta.estado !== 'EN_REVISION_APROBADOR') {
      throw new BadRequestException('Solo se puede aprobar una cuenta en estado EN_REVISION_APROBADOR');
    }

    return this.prisma.$transaction(async (tx) => {
      const todasAprobadas = await this.verificarTodasSeccionesAprobadas(tx, id);
      if (!todasAprobadas) {
        throw new BadRequestException('No se puede liquidar la cuenta: hay secciones que aún no están aprobadas');
      }

      const actualizada = await tx.cuentaCobro.update({
        where: { id },
        data: { estado: 'LIQUIDADA' },
      });
      await tx.historialEstado.create({
        data: {
          cuentaCobroId: id,
          estadoAnterior: 'EN_REVISION_APROBADOR',
          estadoNuevo: 'LIQUIDADA',
          usuarioId: codigoTercero,
          usuarioNombre,
          observacion: 'Cuenta de cobro liquidada por el aprobador',
        },
      });
      return { ...actualizada, mensaje: 'Cuenta de cobro liquidada' };
    });
  }
```

- [ ] **Step 4: Actualizar la descripción del endpoint en el controller**

En `src/aprobador/aprobador/aprobador.controller.ts`, reemplazar (líneas 28-37):

```ts
  @Post('cuentas-cobro/:id/aprobar')
  @Roles(Rol.APROBADOR)
  @HttpCode(200)
  @ApiOperation({
    summary: 'Aprobar definitivamente una cuenta de cobro',
    description: 'Cambia el estado de EN_REVISION_APROBADOR a APROBADA_FINAL. El aprobador debe estar asignado a la cuenta.',
  })
  aprobar(@Param('id') id: string, @CurrentUser() user: JwtPayload) {
    return this.service.aprobar(BigInt(id), user.codigoTercero, user.nombre);
  }
```

por:

```ts
  @Post('cuentas-cobro/:id/aprobar')
  @Roles(Rol.APROBADOR)
  @HttpCode(200)
  @ApiOperation({
    summary: 'Liquidar una cuenta de cobro',
    description: 'Cambia el estado de EN_REVISION_APROBADOR a LIQUIDADA. Requiere que todas las secciones de la cuenta estén en estado APROBADO. El aprobador debe estar asignado a la cuenta.',
  })
  aprobar(@Param('id') id: string, @CurrentUser() user: JwtPayload) {
    return this.service.aprobar(BigInt(id), user.codigoTercero, user.nombre);
  }
```

- [ ] **Step 5: Ejecutar todos los tests del módulo aprobador**

Run: `npx jest src/aprobador`
Expected: PASS — todos los tests.

- [ ] **Step 6: Commit**

```bash
git add src/aprobador/aprobador/aprobador.service.ts src/aprobador/aprobador/aprobador.controller.ts src/aprobador/aprobador/aprobador.service.spec.ts
git commit -m "feat(aprobador): el endpoint aprobar liquida la cuenta validando que todas las secciones esten aprobadas"
```

---

## Task 7: Actualizar `docs/endpoints.md`

**Files:**
- Modify: `docs/endpoints.md`

- [ ] **Step 1: Actualizar la tabla de transiciones de estado (línea 25)**

Buscar la línea:

```
APROBADA_FINAL | ENVIADA_CONTABILIDAD
```

y reemplazarla por:

```
LIQUIDADA | ENVIADA_CONTABILIDAD
```

- [ ] **Step 2: Actualizar la tabla de endpoints del módulo Aprobador (línea 858)**

Buscar:

```
| `POST` | `/aprobador/cuentas-cobro/:id/aprobar` | `APROBADOR` | Aprueba definitivamente la cuenta (→ APROBADA_FINAL) |
```

y reemplazar por:

```
| `POST` | `/aprobador/cuentas-cobro/:id/aprobar` | `APROBADOR` | Liquida la cuenta si todas las secciones están aprobadas (→ LIQUIDADA) |
```

- [ ] **Step 3: Actualizar la sección de detalle del endpoint `/aprobador/cuentas-cobro/:id/aprobar` (alrededor de la línea 916-931)**

Buscar el bloque:

```
### `POST /aprobador/cuentas-cobro/:id/aprobar`

Sin body. La cuenta debe estar en estado `EN_REVISION_APROBADOR`.
```

y la respuesta de ejemplo que contiene:

```
  "estado": "APROBADA_FINAL",
```

Reemplazar el texto introductorio por:

```
### `POST /aprobador/cuentas-cobro/:id/aprobar`

Sin body. La cuenta debe estar en estado `EN_REVISION_APROBADOR` y todas sus secciones (informe de actividades, planilla, retenciones, gastos adicionales, ejecución física) deben estar en estado `APROBADO` (las secciones sin registros se ignoran). Si alguna sección no está aprobada, retorna `400 Bad Request`.
```

y el campo `"estado"` del ejemplo de respuesta por:

```
  "estado": "LIQUIDADA",
```

- [ ] **Step 4: Actualizar la descripción del flujo del endpoint de secciones (alrededor de la línea 957-975)**

Buscar el bloque que describe `POST /aprobador/cuentas-cobro/:id/secciones/{seccion}/aprobar` y, después de la línea:

```
Sin body. Si la cuenta está en `APROBADA_SUPERVISOR`, pasa automáticamente a `EN_REVISION_APROBADOR`.
```

agregar una línea nueva:

```
Si al aprobar esta sección **todas** las secciones de la cuenta quedan en `APROBADO` (las secciones sin registros se ignoran), la cuenta pasa automáticamente a `LIQUIDADA` y la respuesta incluye `"cuentaLiquidada": true`.
```

- [ ] **Step 5: Actualizar el resumen del flujo del aprobador (alrededor de la línea 1024-1029)**

Buscar:

```
5. APROBADOR    →  GET  /aprobador/cuentas-cobro                (lista cuentas pendientes de aprobación)
                →  POST /aprobador/cuentas-cobro/:id/secciones/{seccion}/aprobar|rechazar
                →  POST /aprobador/cuentas-cobro/:id/aprobar    (cuenta → APROBADA_FINAL)
```

y reemplazar la tercera línea por:

```
                →  POST /aprobador/cuentas-cobro/:id/aprobar    (cuenta → LIQUIDADA, requiere todas las secciones aprobadas)
```

- [ ] **Step 6: Verificar que no quedan referencias a `APROBADA_FINAL` en la documentación**

Run: `grep -rn "APROBADA_FINAL" docs`
Expected: sin resultados (0 coincidencias), salvo en documentos históricos como `docs/nuevo-backend-arquitectura.md` y `docs/nuevo-backend-inicio.md` (son notas de diseño previas, no documentación de la API actual — no es necesario modificarlos).

- [ ] **Step 7: Commit**

```bash
git add docs/endpoints.md
git commit -m "docs: documentar liquidacion automatica y endpoint aprobar -> LIQUIDADA"
```

---

## Resumen de validación final

- [ ] **Run completo de la suite del módulo**

Run: `npx jest src/aprobador src/cuentas-cobro`
Expected: PASS — todos los tests verdes.

- [ ] **Verificación manual del enum**

Run: `npx prisma studio` (opcional) o revisar `node_modules/.prisma/client/index.d.ts` para confirmar que `EstadoCuentaCobro` contiene `LIQUIDADA` y no `APROBADA_FINAL`.
