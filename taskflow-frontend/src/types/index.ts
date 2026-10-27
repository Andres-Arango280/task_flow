// ============================================
// USUARIOS
// ============================================
export interface Usuario {
  id: string;
  nombre: string;
  email: string;
}

// ============================================
// EQUIPOS
// ============================================
export interface Equipo {
  id: string;
  nombre: string;
  liderId: string;
  lider: Usuario;
  miembros: Usuario[];
}

// ============================================
// PROYECTOS
// ============================================
export interface Proyecto {
  id: string;
  nombre: string;
  equipoId: string;
  equipo?: Equipo;
}

// ============================================
// LISTAS (Tablero Kanban)
// ============================================
export interface Lista {
  id: string;
  nombre: string;
  orden: number;
  proyectoId: string;
}

// ============================================
// TAREAS
// ============================================
export interface Tarea {
  id: string;
  titulo: string;
  descripcion?: string | null;
  listaId: string;
  lista?: Lista;
  asignados: Usuario[];
  createdAt?: string;
}

// ============================================
// AUTENTICACIÓN
// ============================================
export interface AuthResponse {
  access_token: string;
}

export interface LoginCredentials {
  email: string;
  password: string;
}

export interface RegisterData {
  nombre: string;
  email: string;
  password: string;
}
