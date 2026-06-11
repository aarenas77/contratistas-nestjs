/**
 * Fragmento de texto de un PDF con su posición en la página.
 * `x`/`y` son las coordenadas del sistema PDF (y crece hacia arriba).
 */
export interface TextItem {
  str: string;
  x: number;
  y: number;
  width: number;
}
