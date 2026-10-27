import { create } from 'zustand';

export type TamanoTexto = 'normal' | 'grande' | 'muy-grande';

export interface Preferencias {
  tamanoTexto: TamanoTexto;
  altoContraste: boolean;
  reducirAnimaciones: boolean;
  atajosTeclado: boolean;
}

export const PREFERENCIAS_POR_DEFECTO: Preferencias = {
  tamanoTexto: 'normal',
  altoContraste: false,
  reducirAnimaciones: false,
  atajosTeclado: true,
};

const CLAVE = 'taskflow:preferencias';

function leer(): Preferencias {
  try {
    return { ...PREFERENCIAS_POR_DEFECTO, ...JSON.parse(localStorage.getItem(CLAVE) ?? '{}') };
  } catch {
    return PREFERENCIAS_POR_DEFECTO;
  }
}

export function aplicarPreferencias(p: Preferencias) {
  const raiz = document.documentElement;
  raiz.dataset.texto = p.tamanoTexto;
  raiz.dataset.contraste = p.altoContraste ? 'alto' : 'normal';
  raiz.dataset.animaciones = p.reducirAnimaciones ? 'reducidas' : 'normales';
}

function guardar(p: Preferencias) {
  try {
    localStorage.setItem(CLAVE, JSON.stringify(p));
  } catch {
    // Sin almacenamiento disponible: las preferencias duran solo esta sesión
  }
  aplicarPreferencias(p);
}

interface EstadoPreferencias extends Preferencias {
  cambiar: (cambios: Partial<Preferencias>) => void;
  restablecer: () => void;
}

export const usePreferencias = create<EstadoPreferencias>((set, get) => ({
  ...leer(),
  cambiar: (cambios) => {
    const { tamanoTexto, altoContraste, reducirAnimaciones, atajosTeclado } = get();
    const nuevas = { tamanoTexto, altoContraste, reducirAnimaciones, atajosTeclado, ...cambios };
    guardar(nuevas);
    set(nuevas);
  },
  restablecer: () => {
    guardar(PREFERENCIAS_POR_DEFECTO);
    set(PREFERENCIAS_POR_DEFECTO);
  },
}));

aplicarPreferencias(leer());
