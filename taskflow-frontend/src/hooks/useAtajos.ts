import { useEffect, useRef } from 'react';
import { usePreferencias } from '../store/usePreferencias';

export interface Atajo {
  tecla: string;
  descripcion: string;
  ambito: string;
}

// Lista única que se muestra en la ayuda y en el panel de atajos (tecla "?")
export const ATAJOS: Atajo[] = [
  { tecla: '?', descripcion: 'Mostrar los atajos de teclado', ambito: 'Global' },
  { tecla: 'i', descripcion: 'Ir al inicio (mis equipos)', ambito: 'Global' },
  { tecla: 'h', descripcion: 'Abrir la ayuda', ambito: 'Global' },
  { tecla: 'Esc', descripcion: 'Cerrar la ventana abierta', ambito: 'Global' },
  { tecla: 'e', descripcion: 'Crear un equipo nuevo', ambito: 'Inicio' },
  { tecla: 'p', descripcion: 'Crear un proyecto nuevo', ambito: 'Equipo' },
  { tecla: 'm', descripcion: 'Invitar a un miembro (solo líder)', ambito: 'Equipo' },
  { tecla: 'n', descripcion: 'Crear una tarea nueva', ambito: 'Tablero' },
  { tecla: '/', descripcion: 'Buscar tareas', ambito: 'Tablero' },
];

function escribiendo(evento: KeyboardEvent) {
  const objetivo = evento.target as HTMLElement | null;
  if (!objetivo) return false;
  const etiqueta = objetivo.tagName;
  return etiqueta === 'INPUT' || etiqueta === 'TEXTAREA' || etiqueta === 'SELECT' || objetivo.isContentEditable;
}

// Registra atajos de una sola tecla; se ignoran mientras se escribe o si hay una ventana abierta
export function useAtajos(mapa: Record<string, () => void>) {
  const activos = usePreferencias((p) => p.atajosTeclado);
  const ref = useRef(mapa);
  ref.current = mapa;

  useEffect(() => {
    if (!activos) return;
    const alPulsar = (evento: KeyboardEvent) => {
      if (evento.ctrlKey || evento.metaKey || evento.altKey || escribiendo(evento)) return;
      if (document.querySelector('[role="dialog"], [role="alertdialog"]')) return;
      const accion = ref.current[evento.key];
      if (accion) {
        evento.preventDefault();
        accion();
      }
    };
    window.addEventListener('keydown', alPulsar);
    return () => window.removeEventListener('keydown', alPulsar);
  }, [activos]);
}
