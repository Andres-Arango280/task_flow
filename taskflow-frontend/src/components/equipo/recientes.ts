// Proyectos abiertos recientemente (se guardan solo en este navegador)
export interface ProyectoReciente {
  id: string;
  nombre: string;
  equipoNombre: string;
}

const CLAVE = 'taskflow:recientes';
const MAXIMO = 5;

export function leerRecientes(): ProyectoReciente[] {
  try {
    const datos: unknown = JSON.parse(localStorage.getItem(CLAVE) ?? '[]');
    if (!Array.isArray(datos)) return [];
    return datos
      .filter(
        (d): d is ProyectoReciente =>
          typeof d === 'object' && d !== null && typeof d.id === 'string' && typeof d.nombre === 'string',
      )
      .map((d) => ({ id: d.id, nombre: d.nombre, equipoNombre: typeof d.equipoNombre === 'string' ? d.equipoNombre : '' }))
      .slice(0, MAXIMO);
  } catch {
    return [];
  }
}

function guardar(lista: ProyectoReciente[]) {
  try {
    localStorage.setItem(CLAVE, JSON.stringify(lista.slice(0, MAXIMO)));
  } catch {
    // Sin almacenamiento disponible: la lista de recientes simplemente no se recuerda
  }
}

export function registrarReciente(proyecto: ProyectoReciente) {
  guardar([proyecto, ...leerRecientes().filter((p) => p.id !== proyecto.id)]);
}

export function quitarRecientes(ids: string[]) {
  guardar(leerRecientes().filter((p) => !ids.includes(p.id)));
}
