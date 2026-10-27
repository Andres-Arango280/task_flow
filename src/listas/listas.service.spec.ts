import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { ListasService } from './listas.service';

// Principios FIRST aplicados:
// - Fast: repositorios simulados, sin BD real.
// - Isolated: mocks recreados en cada caso.
// - Repeatable: datos deterministas.
// - Self-validating: asserts explícitos.
// - Timely: cubre acceso al proyecto y obtención de listas.

describe('Regression - ListasService', () => {
  // AAA + fluent-style assertions (Jest equivalent for this TypeScript stack)
  let service: ListasService;
  let listaRepositoryMock: { find: jest.Mock };
  let proyectoRepositoryMock: { findOne: jest.Mock };

  const proyectoConEquipo = {
    id: 'proyecto-1',
    equipoId: 'equipo-1',
    equipo: { id: 'equipo-1', liderId: 'user-1', miembros: [{ id: 'user-1' }, { id: 'user-2' }] },
  };

  beforeEach(() => {
    listaRepositoryMock = { find: jest.fn() };
    proyectoRepositoryMock = { findOne: jest.fn() };
    service = new ListasService(listaRepositoryMock as any, proyectoRepositoryMock as any);
  });

  it('debe devolver las listas del proyecto cuando existen', async () => {
    // Arrange
    const listas = [
      { id: 'l1', nombre: 'Por Hacer', orden: 0, proyectoId: 'proyecto-1' },
      { id: 'l2', nombre: 'En Progreso', orden: 1, proyectoId: 'proyecto-1' },
    ];
    proyectoRepositoryMock.findOne.mockResolvedValue(proyectoConEquipo);
    listaRepositoryMock.find.mockResolvedValue(listas);

    // Act
    const res = await service.obtenerListasPorProyecto('proyecto-1', 'user-2');

    // Assert
    expect(res).toEqual(listas);
    expect(listaRepositoryMock.find).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { proyectoId: 'proyecto-1' },
        order: expect.objectContaining({ orden: 'ASC' }),
      }),
    );
  });

  it('debe devolver un arreglo vacío cuando el proyecto no tiene listas', async () => {
    // Arrange
    proyectoRepositoryMock.findOne.mockResolvedValue(proyectoConEquipo);
    listaRepositoryMock.find.mockResolvedValue([]);

    // Act
    const res = await service.obtenerListasPorProyecto('proyecto-1', 'user-1');

    // Assert
    expect(res).toEqual([]);
  });

  it('debe lanzar NotFoundException cuando el proyecto no existe', async () => {
    // Arrange
    proyectoRepositoryMock.findOne.mockResolvedValue(null);

    // Act + Assert
    await expect(service.obtenerListasPorProyecto('proyecto-404', 'user-1')).rejects.toThrow(
      NotFoundException,
    );
    expect(listaRepositoryMock.find).not.toHaveBeenCalled();
  });

  it('debe lanzar ForbiddenException cuando el usuario no pertenece al equipo del proyecto', async () => {
    // Arrange
    proyectoRepositoryMock.findOne.mockResolvedValue(proyectoConEquipo);

    // Act + Assert
    await expect(service.obtenerListasPorProyecto('proyecto-1', 'user-999')).rejects.toThrow(
      ForbiddenException,
    );
    expect(listaRepositoryMock.find).not.toHaveBeenCalled();
  });
});
