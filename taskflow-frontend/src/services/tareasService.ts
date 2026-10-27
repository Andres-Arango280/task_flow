import { api } from './api';
import type { Tarea } from '../types';

export const tareasService = {
  async getByProyecto(proyectoId: string): Promise<Tarea[]> {
    const response = await api.get(`/tareas?proyectoId=${proyectoId}`);
    return response.data;
  },

  async create(data: {
    titulo: string;
    descripcion?: string;
    listaId: string;
    asignados?: string[];
  }): Promise<Tarea> {
    const response = await api.post('/tareas', data);
    return response.data;
  },

  async mover(tareaId: string, nuevaListaId: string): Promise<Tarea> {
    const response = await api.patch(`/tareas/${tareaId}/mover`, { nuevaListaId });
    return response.data;
  },

  async asignarMiembros(tareaId: string, miembros: string[]): Promise<Tarea> {
    const response = await api.patch(`/tareas/${tareaId}/asignar`, { miembros });
    return response.data;
  },

  async actualizar(tareaId: string, cambios: { titulo?: string; descripcion?: string }): Promise<Tarea> {
    const response = await api.patch(`/tareas/${tareaId}`, cambios);
    return response.data;
  },

  async eliminar(tareaId: string): Promise<void> {
    await api.delete(`/tareas/${tareaId}`);
  },
};
