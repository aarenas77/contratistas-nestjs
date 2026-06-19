export enum EstadoContrato {
  ELABORADO = 'ELABORADO',
  BORRADOR = 'BORRADOR',
  EN_EJECUCION = 'EN EJECUCION',
  FINALIZADO = 'FINALIZADO',
  INHABILITADO = 'INHABILITADO',
}

const ESTADOS_CONTRATO_LEGACY: Record<string, EstadoContrato> = {
  A: EstadoContrato.ELABORADO,
  I: EstadoContrato.INHABILITADO,
};

export function normalizarEstadoContrato(value: string): EstadoContrato {
  return ESTADOS_CONTRATO_LEGACY[value] ?? (value as EstadoContrato);
}

export function estadosContratoParaFiltro(value: EstadoContrato): string[] {
  switch (value) {
    case EstadoContrato.ELABORADO:
      return [EstadoContrato.ELABORADO, 'A'];
    case EstadoContrato.INHABILITADO:
      return [EstadoContrato.INHABILITADO, 'I'];
    default:
      return [value];
  }
}
