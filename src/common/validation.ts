import { BadRequestException, ValidationError, ValidationPipe } from '@nestjs/common';

// Campos con artículo femenino para concordar "válido/válida"
const FEMENINOS = new Set(['password', 'descripcion', 'listaId', 'nuevaListaId']);

const CAMPOS: Record<string, string> = {
  nombre: 'El nombre',
  email: 'El correo electrónico',
  password: 'La contraseña',
  titulo: 'El título',
  descripcion: 'La descripción',
  equipoId: 'El equipo',
  proyectoId: 'El proyecto',
  listaId: 'La lista',
  nuevaListaId: 'La lista destino',
  userId: 'El usuario',
  usuarioId: 'El usuario',
  miembros: 'Los miembros',
  asignados: 'Los asignados',
};

function traducir(error: ValidationError, restriccion: string, original: string): string {
  const campo = CAMPOS[error.property] ?? `El campo "${error.property}"`;
  const limite = original.match(/\d+/)?.[0];
  const valido = FEMENINOS.has(error.property) ? 'válida' : 'válido';
  // class-validator nombra la regla "isUuid" (no "isUUID")
  switch (restriccion.toLowerCase()) {
    case 'isnotempty':
      return `${campo} es obligatorio`;
    case 'isemail':
      return `${campo} no tiene un formato válido (ejemplo: nombre@correo.com)`;
    case 'minlength':
      return `${campo} debe tener al menos ${limite} caracteres`;
    case 'maxlength':
      return `${campo} no puede superar ${limite} caracteres`;
    case 'isuuid':
      return `${campo} no es un identificador válido`;
    case 'isstring':
      return `${campo} debe ser texto`;
    case 'isarray':
      return `${campo} debe ser una lista`;
    case 'matches':
      return original === 'letra'
        ? `${campo} debe contener al menos una letra`
        : original === 'numero'
          ? `${campo} debe contener al menos un número`
          : `${campo} no tiene el formato correcto`;
    case 'whitelistvalidation':
      return `El campo "${error.property}" no está permitido`;
    default:
      return `${campo} no es ${valido}`;
  }
}

export function mensajesDeValidacion(errores: ValidationError[]): string[] {
  return errores.flatMap((error) =>
    Object.entries(error.constraints ?? {}).map(([restriccion, original]) =>
      traducir(error, restriccion, original),
    ),
  );
}

export function crearValidationPipe() {
  return new ValidationPipe({
    whitelist: true,
    exceptionFactory: (errores) => new BadRequestException(mensajesDeValidacion(errores)),
  });
}
