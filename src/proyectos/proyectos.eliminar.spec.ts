import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { ProyectosService } from './proyectos.service';

// Regresión de DELETE /proyectos/:id (solo el líder del equipo; listas y tareas en cascada)
describe('Regression - ProyectosService - eliminar', () => {
  // AAA + fluent-style assertions (Jest equivalent for this TypeScript stack)
  let service: ProyectosService;
  let proyectoRepository: { findOne: jest.Mock; remove: jest.Mock };

  const crearProyecto = () => ({
    id: 'p1',
    nombre: 'Proyecto',
    equipoId: 'e1',
    equipo: { id: 'e1', liderId: 'u-lider' },
  });

  beforeEach(() => {
    proyectoRepository = { findOne: jest.fn(), remove: jest.fn().mockResolvedValue(undefined) };
    service = new ProyectosService(proyectoRepository as any, {} as any, {} as any);
  });

  it('debe eliminar el proyecto cuando lo solicita el líder del equipo', async () => {
    // Arrange
    const proyecto = crearProyecto();
    proyectoRepository.findOne.mockResolvedValue(proyecto);

    // Act
    const resultado = await service.eliminar('p1', 'u-lider');

    // Assert
    expect(proyectoRepository.findOne).toHaveBeenCalledWith({ where: { id: 'p1' }, relations: { equipo: true } });
    expect(proyectoRepository.remove).toHaveBeenCalledWith(proyecto);
    expect(resultado).toEqual({ id: 'p1', eliminado: true });
  });

  it('debe lanzar ForbiddenException si quien elimina no es el líder', async () => {
    // Arrange
    proyectoRepository.findOne.mockResolvedValue(crearProyecto());

    // Act + Assert
    await expect(service.eliminar('p1', 'u-miembro')).rejects.toThrow(ForbiddenException);
    expect(proyectoRepository.remove).not.toHaveBeenCalled();
  });

  it('debe lanzar NotFoundException si el proyecto no existe', async () => {
    // Arrange
    proyectoRepository.findOne.mockResolvedValue(null);

    // Act + Assert
    await expect(service.eliminar('p404', 'u-lider')).rejects.toThrow(NotFoundException);
  });
});
