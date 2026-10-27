import { create } from 'zustand';
import type { Usuario } from '../types';

interface AuthState {
  user: Usuario | null;
  token: string | null;
  isAuthenticated: boolean;
  login: (user: Usuario, token: string) => void;
  logout: () => void;
  initialize: () => void;
}

interface SesionGuardada {
  user: Usuario | null;
  token: string | null;
  isAuthenticated: boolean;
}

const SIN_SESION: SesionGuardada = { user: null, token: null, isAuthenticated: false };

// Lee la sesión guardada de forma síncrona para que, al recargar una página privada,
// no se redirija al login antes de haberla restaurado.
function leerSesion(): SesionGuardada {
  try {
    const token = localStorage.getItem('access_token');
    const userStr = localStorage.getItem('user');
    if (!token || !userStr) return SIN_SESION;
    const user = JSON.parse(userStr);
    // Sesiones guardadas con el formato antiguo (_id de MongoDB) ya no son válidas
    if (!user?.id) throw new Error('Sesión con formato antiguo');
    return { user, token, isAuthenticated: true };
  } catch {
    try {
      localStorage.removeItem('access_token');
      localStorage.removeItem('user');
    } catch {
      // Sin almacenamiento disponible
    }
    return SIN_SESION;
  }
}

export const useAuthStore = create<AuthState>((set) => ({
  ...leerSesion(),

  login: (user, token) => {
    localStorage.setItem('access_token', token);
    localStorage.setItem('user', JSON.stringify(user));
    set({ user, token, isAuthenticated: true });
  },

  logout: () => {
    localStorage.removeItem('access_token');
    localStorage.removeItem('user');
    set(SIN_SESION);
  },

  initialize: () => {
    set(leerSesion());
  },
}));
