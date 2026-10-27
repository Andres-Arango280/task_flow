import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { LISTAS_POR_DEFECTO, ProyectosService } from './proyectos.service';

// Principios FIRST aplicados:
// - Fast: no uso de BD real ni red.
// - Isolated: cada caso crea su propio estado.
// - Repeatable: datos deterministas.
// - Self-validating: cada prueba hace assert explícito.
// - Timely: cubre los comportamientos críticos de negocio.
//
// Tipo de mock:
// - Fake: proyectoRepository.create/save simulan la entidad a guardar.
// - Stub: equipoRepository.findOne devuelve valores controlados.
// - Spy: observamos que listaRepository.save se invoca con los valores esperados.

type RepoMock = {
  findOne: jest.Mock;
  find: jest.Mock;
  create: jest.Mock;
  save: jest.Mock;
};

const crearRepoMock = (): RepoMock => ({
  findOne: jest.fn(),
  find: jest.fn(),
  // create devuelve la misma entidad recibida (comportamiento de TypeORM sin persistir)
  create: jest.fn().mockImplementation((entidad) => ({ ...entidad })),
  save: jest.fn(),
});

describe('Regression - ProyectosService - crearProyecto', () => {
  // AAA + fluent-style assertions (Jest equivalent for this TypeScript stack)
  let service: ProyectosService;
  let proyectoRepositoryMock: RepoMock;
  let listaRepositoryMock: RepoMock;
  let equipoRepositoryMock: RepoMock;

  beforeEach(() => {
    proyectoRepositoryMock = crearRepoMock();
    listaRepositoryMock = crearRepoMock();
    equipoRepositoryMock = crearRepoMock();

    listaRepositoryMock.save.mockImplementation(async (listas) => listas);

    service = new ProyectosService(
      proyectoRepositoryMock as any,
      listaRepositoryMock as any,
      equipoRepositoryMock as any,
    );
  });

  it('debe crear un proyecto cuando el usuario es miembro del equipo', async () => {
    // Arrange
    const equipo = { id: 'equipo-1', liderId: 'user-1', miembros: [{ id: 'user-1' }, { id: 'user-2' }] };
    const proyectoGuardado = { id: 'proyecto-1', nombre: 'Sprint 1', equipoId: 'equipo-1' };

    equipoRepositoryMock.findOne.mockResolvedValue(equipo);
    proyectoRepositoryMock.save.mockResolvedValue(proyectoGuardado);

    // Act
    const resultado = await service.crearProyecto(
      { nombre: 'Sprint 1', equipoId: 'equipo-1' },
      'user-2',
    );

    // Assert
    expect(equipoRepositoryMock.findOne).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: 'equipo-1' } }),
    );
    expect(proyectoRepositoryMock.create).toHaveBeenCalledWith({
      nombre: 'Sprint 1',
      equipoId: 'equipo-1',
    });
    expect(proyectoRepositoryMock.save).toHaveBeenCalledTimes(1);
    expect(listaRepositoryMock.save).toHaveBeenCalledWith([
      { nombre: 'Por Hacer', orden: 0, proyectoId: 'proyecto-1' },
      { nombre: 'En Progreso', orden: 1, proyectoId: 'proyecto-1' },
      { nombre: 'Hecho', orden: 2, proyectoId: 'proyecto-1' },
    ]);
    expect(resultado).toEqual(proyectoGuardado);
  });

  it('debe crear un proyecto cuando el usuario es el líder del equipo', async () => {
    // Arrange
    const equipo = { id: 'equipo-1', liderId: 'user-1', miembros: [] };
    const proyectoGuardado = { id: 'proyecto-2', nombre: 'Sprint 2', equipoId: 'equipo-1' };

    equipoRepositoryMock.findOne.mockResolvedValue(equipo);
    proyectoRepositoryMock.save.mockResolvedValue(proyectoGuardado);

    // Act
    const resultado = await service.crearProyecto(
      { nombre: 'Sprint 2', equipoId: 'equipo-1' },
      'user-1',
    );

    // Assert
    expect(proyectoRepositoryMock.save).toHaveBeenCalledTimes(1);
    expect(resultado).toEqual(proyectoGuardado);
  });

  it('debe lanzar NotFoundException cuando el equipo no existe', async () => {
    // Arrange
    equipoRepositoryMock.findOne.mockResolvedValue(null);

    // Act + Assert
    await expect(
      service.crearProyecto({ nombre: 'Sprint 1', equipoId: 'equipo-404' }, 'user-2'),
    ).rejects.toThrow(NotFoundException);
    await expect(
      service.crearProyecto({ nombre: 'Sprint 1', equipoId: 'equipo-404' }, 'user-2'),
    ).rejects.toThrow('Equipo no encontrado');
    expect(proyectoRepositoryMock.save).not.toHaveBeenCalled();
  });

  it('debe lanzar ForbiddenException cuando el usuario no pertenece al equipo', async () => {
    // Arrange
    const equipo = { id: 'equipo-1', liderId: 'user-1', miembros: [{ id: 'user-3' }] };
    equipoRepositoryMock.findOne.mockResolvedValue(equipo);

    // Act + Assert
    await expect(
      service.crearProyecto({ nombre: 'Sprint 1', equipoId: 'equipo-1' }, 'user-2'),
    ).rejects.toThrow(ForbiddenException);
    await expect(
      service.crearProyecto({ nombre: 'Sprint 1', equipoId: 'equipo-1' }, 'user-2'),
    ).rejects.toThrow('No tienes acceso a este equipo');
    expect(proyectoRepositoryMock.save).not.toHaveBeenCalled();
    expect(listaRepositoryMock.save).not.toHaveBeenCalled();
  });

  it('debe crear las tres listas por defecto cuando se guarda el proyecto', async () => {
    // Arrange
    const equipo = { id: 'equipo-1', liderId: 'user-1', miembros: [{ id: 'user-1' }, { id: 'user-2' }] };
    const proyectoGuardado = { id: 'proyecto-xyz', nombre: 'Test Project', equipoId: 'equipo-1' };

    equipoRepositoryMock.findOne.mockResolvedValue(equipo);
    proyectoRepositoryMock.save.mockResolvedValue(proyectoGuardado);

    // Act
    await service.crearProyecto({ nombre: 'Test Project', equipoId: 'equipo-1' }, 'user-2');

    // Assert
    expect(LISTAS_POR_DEFECTO).toEqual(['Por Hacer', 'En Progreso', 'Hecho']);
    expect(listaRepositoryMock.create).toHaveBeenCalledTimes(3);
    const listasGuardadas = listaRepositoryMock.save.mock.calls[0][0];
    expect(listasGuardadas).toHaveLength(3);
    expect(listasGuardadas).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ nombre: 'Por Hacer', proyectoId: 'proyecto-xyz' }),
        expect.objectContaining({ nombre: 'En Progreso', proyectoId: 'proyecto-xyz' }),
        expect.objectContaining({ nombre: 'Hecho', proyectoId: 'proyecto-xyz' }),
      ]),
    );
  });

  it('debe guardar el proyecto antes de crear las listas por defecto', async () => {
    // Arrange
    const equipo = { id: 'equipo-1', liderId: 'user-1', miembros: [{ id: 'user-1' }] };
    const proyectoGuardado = { id: 'proyecto-guardado-123', nombre: 'Orden de operaciones', equipoId: 'equipo-1' };
    let saveProyectoWasCalled = false;
    let saveListasWasCalled = false;

    equipoRepositoryMock.findOne.mockResolvedValue(equipo);
    proyectoRepositoryMock.save.mockImplementation(() => {
      saveProyectoWasCalled = true;
      expect(saveListasWasCalled).toBe(false);
      return Promise.resolve(proyectoGuardado);
    });
    listaRepositoryMock.save.mockImplementation((listas) => {
      saveListasWasCalled = true;
      expect(saveProyectoWasCalled).toBe(true);
      return Promise.resolve(listas);
    });

    // Act
    await service.crearProyecto({ nombre: 'Orden de operaciones', equipoId: 'equipo-1' }, 'user-1');

    // Assert
    expect(saveProyectoWasCalled).toBe(true);
    expect(saveListasWasCalled).toBe(true);
  });

  it('debe reconocer como miembro a un usuario identificado por UUID', async () => {
    // Arrange
    const liderId = '3f1c2b7a-0d4e-4c1a-9b8e-111111111111';
    const miembroId = '3f1c2b7a-0d4e-4c1a-9b8e-222222222222';
    const equipo = { id: 'equipo-1', liderId, miembros: [{ id: liderId }, { id: miembroId }] };
    const proyectoGuardado = { id: 'proyecto-1', nombre: 'Sprint 1', equipoId: 'equipo-1' };

    equipoRepositoryMock.findOne.mockResolvedValue(equipo);
    proyectoRepositoryMock.save.mockResolvedValue(proyectoGuardado);

    // Act
    const resultado = await service.crearProyecto(
      { nombre: 'Sprint 1', equipoId: 'equipo-1' },
      miembroId,
    );

    // Assert
    expect(resultado).toEqual(proyectoGuardado);
  });
});
