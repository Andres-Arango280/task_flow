import { api } from './api';
import type { AuthResponse, LoginCredentials, RegisterData, Usuario } from '../types';

export const authService = {
  async register(data: RegisterData): Promise<Usuario> {
    const response = await api.post('/auth/register', data);
    return response.data;
  },

  async login(credentials: LoginCredentials): Promise<AuthResponse> {
    const response = await api.post('/auth/login', credentials);
    return response.data;
  },

  async getProfile(): Promise<Usuario> {
    const response = await api.get('/usuarios/me');
    return response.data;
  },

  // ✅ NUEVO: Buscar usuario por email
  async searchByEmail(email: string): Promise<Usuario> {
    const response = await api.get('/usuarios', { params: { email: email.trim() } });
    return response.data;
  },

  async actualizarPerfil(nombre: string): Promise<Usuario> {
    const response = await api.patch('/usuarios/me', { nombre });
    return response.data;
  },

  async eliminarCuenta(): Promise<void> {
    await api.delete('/usuarios/me');
  },
};
