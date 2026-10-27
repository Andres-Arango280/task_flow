import { useEffect, useRef, useState } from 'react';

// Vuelve a pedir los datos cada cierto tiempo (solo con la pestaña visible)
// para que se vean los cambios hechos por otros miembros del equipo.
export function useActualizacionPeriodica(recargar: () => Promise<unknown>, intervaloMs = 15000, activo = true) {
  const [ultimaActualizacion, setUltimaActualizacion] = useState<number | null>(null);
  const [ahora, setAhora] = useState(() => Date.now());
  const ref = useRef(recargar);
  ref.current = recargar;

  useEffect(() => {
    if (!activo) return;
    const reloj = window.setInterval(() => setAhora(Date.now()), 5000);
    const temporizador = window.setInterval(async () => {
      if (document.visibilityState !== 'visible' || !navigator.onLine) return;
      try {
        await ref.current();
        setUltimaActualizacion(Date.now());
      } catch {
        // El error se comunica cuando el usuario realiza una acción
      }
    }, intervaloMs);
    return () => {
      window.clearInterval(reloj);
      window.clearInterval(temporizador);
    };
  }, [intervaloMs, activo]);

  const marcarActualizado = () => {
    const momento = Date.now();
    setUltimaActualizacion(momento);
    setAhora(momento);
  };

  const segundos = ultimaActualizacion === null ? null : Math.max(0, Math.round((ahora - ultimaActualizacion) / 1000));
  const textoActualizacion =
    segundos === null ? 'Sincronizando…' : segundos < 5 ? 'Actualizado ahora' : `Actualizado hace ${segundos} s`;

  return { marcarActualizado, textoActualizacion };
}
