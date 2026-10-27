import { normalizar } from '../../lib/busqueda';

export type TipoColumna = 'pendiente' | 'progreso' | 'hecho' | 'otra';

export interface EstiloColumna {
  fondo: string;
  borde: string;
  punto: string;
  titulo: string;
  contador: string;
  etiqueta: string;
}

const NOMBRES: Record<Exclude<TipoColumna, 'otra'>, string[]> = {
  pendiente: ['por hacer', 'pendiente', 'pendientes', 'todo', 'to do', 'backlog'],
  progreso: ['en progreso', 'en curso', 'haciendo', 'in progress', 'doing'],
  hecho: ['hecho', 'hechas', 'terminado', 'terminada', 'completado', 'completada', 'done', 'finalizado'],
};

// Identifica el tipo de columna por su nombre (sin tildes ni mayúsculas)
export function tipoColumna(nombre: string): TipoColumna {
  const clave = normalizar(nombre);
  if (NOMBRES.hecho.includes(clave)) return 'hecho';
  if (NOMBRES.progreso.includes(clave)) return 'progreso';
  if (NOMBRES.pendiente.includes(clave)) return 'pendiente';
  return 'otra';
}

const ESTILOS: Record<TipoColumna, EstiloColumna> = {
  pendiente: {
    fondo: 'bg-slate-100',
    borde: 'border-slate-300 border-t-slate-500',
    punto: 'bg-slate-500',
    titulo: 'text-slate-800',
    contador: 'bg-slate-200 text-slate-800',
    etiqueta: 'bg-slate-100 text-slate-800 border-slate-300',
  },
  progreso: {
    fondo: 'bg-blue-50',
    borde: 'border-blue-200 border-t-blue-600',
    punto: 'bg-blue-600',
    titulo: 'text-blue-800',
    contador: 'bg-blue-100 text-blue-800',
    etiqueta: 'bg-blue-50 text-blue-800 border-blue-200',
  },
  hecho: {
    fondo: 'bg-green-50',
    borde: 'border-green-200 border-t-green-600',
    punto: 'bg-green-600',
    titulo: 'text-green-800',
    contador: 'bg-green-100 text-green-800',
    etiqueta: 'bg-green-50 text-green-800 border-green-200',
  },
  otra: {
    fondo: 'bg-purple-50',
    borde: 'border-purple-200 border-t-purple-600',
    punto: 'bg-purple-600',
    titulo: 'text-purple-800',
    contador: 'bg-purple-100 text-purple-800',
    etiqueta: 'bg-purple-50 text-purple-800 border-purple-200',
  },
};

export function estiloColumna(nombre: string): EstiloColumna {
  return ESTILOS[tipoColumna(nombre)];
}
