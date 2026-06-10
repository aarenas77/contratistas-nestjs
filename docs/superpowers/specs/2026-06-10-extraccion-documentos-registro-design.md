# Diseño: Extracción propia de documentos en el registro de contratistas

**Fecha:** 2026-06-10
**Estado:** Aprobado (pendiente revisión final del spec)

## Contexto y problema

El endpoint `POST /registro-contratistas/extraer` se implementó inicialmente delegando la
extracción a un servicio legacy externo (HTTP). Esa integración nunca tuvo un contrato real:
ruta, nombres de campo y autenticación eran conjeturas, por lo que el endpoint fallaba siempre
con `BadGatewayException`.

**Decisión:** el JSON del legacy es solo la **referencia de salida**. Construimos nuestro propio
extractor que lee los PDFs (RUT y certificación bancaria) localmente y produce ese mismo JSON.
Se elimina toda la integración HTTP legacy.

Los PDFs son **digitales con texto seleccionable** (no escaneos), por lo que no se requiere OCR.

## Enfoque elegido: híbrido

Cada documento usa la técnica adecuada a su naturaleza:

- **RUT** → formulario estandarizado de la DIAN (Formulario 001), de layout fijo por columnas.
  Se usa **extracción posicional con `pdfjs-dist`**: cada fragmento de texto trae sus coordenadas
  `(x, y)`, lo que permite mapear cada valor a su casilla por **proximidad a su etiqueta**. Esto
  resuelve de raíz el problema de que el texto plano concatena campos adyacentes (p. ej.
  `ARENAS GOMEZ ALEJANDRO` en una sola línea). Es determinista, gratuito, sin latencia de red y
  **mantiene los datos PII/financieros dentro del servidor**.

- **Certificación bancaria** → formato variable por banco, pero estable dentro de cada banco.
  Se usa un **registro extensible de parsers por banco** basado en texto. Arranca con
  **Bancolombia**; agregar otro banco es añadir un parser al registro.

Se descartó: texto plano puro (frágil con nombres/variabilidad), plantilla de coordenadas
absolutas (innecesariamente rígida frente al anclaje por etiqueta), AcroForm (el RUT está
aplanado, sin campos interactivos) y extracción por LLM (costo, latencia y, sobre todo,
privacidad de datos PII/financieros enviados a un externo). El LLM queda como posible evolución
futura solo para el paso bancario si la variedad de bancos crece mucho.

## Arquitectura

El controller y los tres endpoints **no cambian** (`/extraer`, `/codigo-tercero-temporal`,
`/finalizar`). Solo cambia el motor de extracción que hay detrás.

Componentes nuevos (unidades aisladas, de propósito único y testeables de forma independiente):

```
src/registro-contratistas/extraccion/
├─ extraccion.service.ts              # orquestador (reemplaza extraccion-legacy.service.ts)
├─ rut-pdf.parser.ts                  # RUT → RutExtraidoDto (pdfjs posicional)
├─ certificado-bancario.parser.ts     # registro de bancos → CertificadoBancarioDto
└─ bancos/
   └─ bancolombia.banco.ts            # parser específico de Bancolombia
```

Se eliminan: `extraccion-legacy.service.ts`, `extraccion-legacy.service.spec.ts`, el import de
`HttpModule` en el módulo, y la variable `LEGACY_EXTRACCION_PATH` de `.env.example`.
(`GESTION_CONTRATISTAS_URL` y `LEGACY_API_TOKEN` dejan de usarse en esta feature; se pueden
conservar para otras integraciones.)

### `RutPdfParser`
`parse(buffer: Buffer): Promise<RutExtraidoDto>`

Algoritmo:
1. Cargar con pdfjs (`getDocument({ data })`), página 1, `getTextContent()` → ítems con
   `str`, `transform` (x = `transform[4]`, y = `transform[5]`) y `width`.
2. Normalizar a `{ text, x, y, width }`. Agrupar en líneas por `y` con tolerancia.
3. Para cada campo conocido, localizar su **etiqueta** (texto del formulario, p. ej.
   `31. Primer apellido`), tomar su posición y extraer el(los) ítem(s) de valor que caen
   **debajo** de la etiqueta (en PDF, `y` menor) y dentro de su **columna** (`x` entre esta
   etiqueta y la siguiente etiqueta a su derecha en la misma fila de etiquetas).
4. Construir `RutExtraidoDto`.

Campos a extraer y su casilla (verificado con la muestra `docs/141197188746.pdf`):

| Campo DTO | Casilla / fuente | Valor esperado en la muestra |
|---|---|---|
| `numeroFormulario` | 4 | `141197188746` |
| `numeroIdentificacion` / `nit` | 5 / 26 | `1001725743` |
| `codigoVerificacion` | 6 (DV) | `0` |
| `tipoContribuyente` | 24 | `Persona natural o sucesión ilíquida` |
| `tipoDocumento` | 25 | `Cédula de Ciudadanía` |
| `primerApellido` | 31 | `ARENAS` |
| `segundoApellido` | 32 | `GOMEZ` |
| `primerNombre` | 33 | `ALEJANDRO` |
| `segundoNombre` | 34 (Otros nombres) | `null` |
| `razonSocial` | 35 | `null` |
| `nombreComercial` | 36 | `null` |
| `pais` / `codigoPais` | 38 | `COLOMBIA` / `169` |
| `departamento` / `codigoDepartamento` | 39 | `Antioquia` / `05` |
| `ciudad` | 40 | `Rionegro` |
| `direccion` | 41 | `CR 61 F # 42 - 47 CA Rionegro - Antioquia` |
| `correoElectronico` | 42 | `alegando79@hotmail.com` |
| `telefono1` / `telefono2` | 44 / 45 | `3114262647` / `3104946800` |
| `responsabilidadesTributarias` | 53 | `["05"]` |
| `actividadEconomicaPrincipal` | 46 | `0010` |

### `CertificadoBancarioParser`
`parse(buffer: Buffer): Promise<CertificadoBancarioDto>`

1. Extraer el texto completo del PDF (vía pdfjs).
2. Recorrer un **registro de bancos**; cada banco expone `detecta(texto): boolean` y
   `extrae(texto): CertificadoBancarioDto`.
3. Si ningún banco coincide → extracción genérica best-effort (número de cuenta por regex) con
   `entidadBancaria: null`.

`BancolombiaBanco` (verificado con `docs/CERTIFICADO-BANCARIO-ALEJANDRO.pdf`):
- `detecta`: el texto contiene `Bancolombia`.
- `entidadBancaria`: `"BANCOLOMBIA"`.
- `tipoCuenta`: `Cuenta de ahorros` → `"1"`, `Cuenta corriente` → `"2"`.
- `numeroCuenta`: valor de la columna *No. Producto* → `"41200025782"`.

### `ExtraccionService` (orquestador)
`extraer(rut, certificado): Promise<DatosExtraidosDto>`
- Valida que cada archivo sea PDF (cabecera `%PDF`).
- Invoca `RutPdfParser` y `CertificadoBancarioParser`.
- Devuelve `{ rut, certificadoBancario }`.
- Reemplaza a `ExtraccionLegacyService`; `RegistroContratistasService` solo cambia la dependencia
  inyectada (misma firma `extraer`).

## Manejo de errores
- PDF ilegible/corrupto o sin texto → `BadRequestException` con mensaje claro indicando cuál
  archivo falló.
- Campo individual no encontrado → `null` (los DTO ya admiten `null`); **no** se aborta el
  request completo.
- Banco no reconocido → extracción genérica con `entidadBancaria: null`.

## Pruebas
- Copiar las muestras a `test/fixtures/`:
  `rut-ejemplo.pdf` (desde `docs/141197188746.pdf`) y
  `certificado-bancolombia.pdf` (desde `docs/CERTIFICADO-BANCARIO-ALEJANDRO.pdf`).
- `rut-pdf.parser.spec.ts`: parsea el fixture real y verifica los valores de la tabla anterior
  (NIT, apellidos/nombre separados correctamente, correo, teléfonos, formulario, depto/ciudad,
  responsabilidades).
- `certificado-bancario.parser.spec.ts`: verifica `BANCOLOMBIA` / `"1"` / `"41200025782"`.
- `registro-contratistas.service.spec.ts`: se adapta para inyectar `ExtraccionService` (mock)
  en lugar de `ExtraccionLegacyService`.
- Eliminar `extraccion-legacy.service.spec.ts`.

## Dependencias
- Agregar `pdfjs-dist` (usar el *legacy build* apto para Node). Si hay fricción ESM/CJS con
  ts-jest, cargar pdfjs vía `import()` dinámico o fijar una versión con build CommonJS.
- Sin OCR, sin servicios externos, sin LLM.

## Límite explícito / riesgos
- El anclaje por etiqueta asume el layout estándar del Formulario 001 de la DIAN. Si la DIAN
  cambia el formato, hay que ajustar las etiquetas ancla (cambio acotado y localizado).
- El parser bancario solo cubre Bancolombia inicialmente; otros bancos se agregan al registro.
- No se persisten datos bancarios ni campos extendidos del RUT (el modelo `Usuario` no tiene
  esas columnas); `finalizar` sigue insertando solo `nombre`, `email`, `userIdentification`,
  `codigoTercero` y `rol`, igual que antes.
