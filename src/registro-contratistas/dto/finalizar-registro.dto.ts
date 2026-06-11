import { DatosExtraidosDto } from './datos-extraidos.dto';

/**
 * Payload de `POST /registro-contratistas/finalizar`. Reenvía los datos
 * extraídos (flujo stateless). El `codigoTercero` NO viaja desde el cliente: se
 * resuelve server-side desde la identificación del RUT vía el módulo de
 * presupuesto, para evitar que un cliente inyecte el tercero de otra persona.
 */
export class FinalizarRegistroDto extends DatosExtraidosDto {}
