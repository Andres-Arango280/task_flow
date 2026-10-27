import { api } from './api';
import type { Equipo, Usuario } from '../types';

export const equiposService = {
  async getAll(): Promise<Equipo[]> {
    const response = await api.get('/equipos');
    return response.data;
  },

  async getById(id: string): Promise<Equipo> {
    const response = await api.get(`/equipos/${id}`);
    return response.data;
  },

  async getMiembros(id: string): Promise<{ lider: Usuario; miembros: Usuario[] }> {
    const response = await api.get(`/equipos/${id}/miembros`);
    return response.data;
  },

  async create(nombre: string): Promise<Equipo> {
    const response = await api.post('/equipos', { nombre });
    return response.data;
  },

  async addMiembro(equipoId: string, usuarioId: string): Promise<Equipo> {
    const response = await api.post(`/equipos/${equipoId}/miembros`, {
      userId: usuarioId,
    });
    return response.data;
  },

  async removeMiembro(equipoId: string, usuarioId: string): Promise<Equipo> {
    const response = await api.delete(`/equipos/${equipoId}/miembros/${usuarioId}`);
    return response.data;
  },

  async eliminar(equipoId: string): Promise<void> {
    await api.delete(`/equipos/${equipoId}`);
  },
};
