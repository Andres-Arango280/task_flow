import { useEffect, useState } from 'react';

// Guarda automáticamente lo escrito en un formulario para no perderlo al cerrar la ventana
export function useBorrador<T>(clave: string, inicial: T) {
  const claveCompleta = `taskflow:borrador:${clave}`;
  const [valor, setValor] = useState<T>(() => {
    try {
      const guardado = localStorage.getItem(claveCompleta);
      return guardado ? (JSON.parse(guardado) as T) : inicial;
    } catch {
      return inicial;
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem(claveCompleta, JSON.stringify(valor));
    } catch {
      // Sin almacenamiento: el borrador solo vive en memoria
    }
  }, [claveCompleta, valor]);

  const descartar = () => {
    try {
      localStorage.removeItem(claveCompleta);
    } catch {
      // nada que limpiar
    }
    setValor(inicial);
  };

  return [valor, setValor, descartar] as const;
}
