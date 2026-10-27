import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { TareasService } from './tareas.service';

// Regresión de la edición y eliminación de tareas (endpoints PATCH /tareas/:id y DELETE /tareas/:id)
describe('Regression - TareasService - actualizar y eliminar', () => {
  // AAA + fluent-style assertions (Jest equivalent for this TypeScript stack)
  let service: TareasService;
  let tareaRepository: { findOne: jest.Mock; update: jest.Mock; remove: jest.Mock };
  let proyectoRepository: { findOne: jest.Mock };

  const proyecto = {
    id: 'p1',
    equipoId: 'e1',
    equipo: { id: 'e1', liderId: 'u-lider', miembros: [{ id: 'u-miembro' }] },
  };
  const crearTarea = (overrides: Record<string, unknown> = {}) => ({
    id: 't1',
    titulo: 'Original',
    descripcion: 'Desc',
    listaId: 'l1',
    lista: { id: 'l1', proyectoId: 'p1' },
    asignados: [],
    ...overrides,
  });

  beforeEach(() => {
    tareaRepository = {
      findOne: jest.fn(),
      update: jest.fn().mockResolvedValue({ affected: 1 }),
      remove: jest.fn().mockResolvedValue(undefined),
    };
    proyectoRepository = { findOne: jest.fn().mockResolvedValue(proyecto) };
    service = new TareasService(tareaRepository as any, {} as any, proyectoRepository as any, {} as any);
  });

  it('debe actualizar el título (sin espacios sobrantes) y la descripción de una tarea', async () => {
    // Arrange
    const actualizada = crearTarea({ titulo: 'Nuevo', descripcion: 'Otra' });
    tareaRepository.findOne.mockResolvedValueOnce(crearTarea()).mockResolvedValueOnce(actualizada);

    // Act
    const resultado = await service.actualizar('t1', { titulo: '  Nuevo  ', descripcion: 'Otra' }, 'u-miembro');

    // Assert
    expect(tareaRepository.update).toHaveBeenCalledWith('t1', { titulo: 'Nuevo', descripcion: 'Otra' });
    expect(resultado).toBe(actualizada);
  });

  it('no debe llamar a update si no se envía ningún cambio', async () => {
    // Arrange
    tareaRepository.findOne.mockResolvedValue(crearTarea());

    // Act
    await service.actualizar('t1', {}, 'u-lider');

    // Assert
    expect(tareaRepository.update).not.toHaveBeenCalled();
  });

  it('debe lanzar ForbiddenException al editar una tarea de un equipo ajeno', async () => {
    // Arrange
    tareaRepository.findOne.mockResolvedValue(crearTarea());

    // Act + Assert
    await expect(service.actualizar('t1', { titulo: 'X' }, 'u-externo')).rejects.toThrow(ForbiddenException);
    expect(tareaRepository.update).not.toHaveBeenCalled();
  });

  it('debe lanzar NotFoundException al editar una tarea inexistente', async () => {
    // Arrange
    tareaRepository.findOne.mockResolvedValue(null);

    // Act + Assert
    await expect(service.actualizar('t404', { titulo: 'X' }, 'u-lider')).rejects.toThrow(NotFoundException);
  });

  it('debe eliminar la tarea cuando el usuario pertenece al equipo', async () => {
    // Arrange
    const tarea = crearTarea();
    tareaRepository.findOne.mockResolvedValue(tarea);

    // Act
    const resultado = await service.eliminar('t1', 'u-miembro');

    // Assert
    expect(tareaRepository.remove).toHaveBeenCalledWith(tarea);
    expect(resultado).toEqual({ id: 't1', eliminado: true });
  });

  it('debe lanzar ForbiddenException al eliminar una tarea de un equipo ajeno', async () => {
    // Arrange
    tareaRepository.findOne.mockResolvedValue(crearTarea());

    // Act + Assert
    await expect(service.eliminar('t1', 'u-externo')).rejects.toThrow(ForbiddenException);
    expect(tareaRepository.remove).not.toHaveBeenCalled();
  });
});
