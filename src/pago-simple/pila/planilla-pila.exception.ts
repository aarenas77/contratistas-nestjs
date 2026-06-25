import { BadRequestException } from '@nestjs/common';

/**
 * Error del dominio de planilla PILA. Equivale a `PagoSimplePilaException` del
 * backend legacy: cubre tanto datos de entrada inválidos como invariantes del
 * archivo plano (longitudes exactas). Se mapea a 400 porque, en la práctica,
 * todos los casos son corregibles desde el origen de datos o el request.
 */
export class PlanillaPilaException extends BadRequestException {
  constructor(mensaje: string) {
    super(mensaje);
  }
}
