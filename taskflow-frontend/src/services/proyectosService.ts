import { api } from './api';
import type { Proyecto, Lista } from '../types';

export const proyectosService = {
  async getByEquipo(equipoId: string): Promise<Proyecto[]> {
    const response = await api.get(`/proyectos?equipoId=${equipoId}`);
    return response.data;
  },

  async getById(proyectoId: string): Promise<Proyecto> {
    const response = await api.get(`/proyectos/${proyectoId}`);
    return response.data;
  },

  async create(
    nombreOrPayload: string | { nombre: string; equipoId: string },
    equipoId?: string,
  ): Promise<Proyecto> {
    const payload =
      typeof nombreOrPayload === 'string'
        ? { nombre: nombreOrPayload, equipoId: equipoId ?? '' }
        : nombreOrPayload;

    const response = await api.post('/proyectos', payload);
    return response.data;
  },

  async getListas(proyectoId: string): Promise<Lista[]> {
    const response = await api.get(`/listas/proyecto/${proyectoId}`);
    return response.data;
  },

  async eliminar(proyectoId: string): Promise<void> {
    await api.delete(`/proyectos/${proyectoId}`);
  },
};
