import { ConflictException, ForbiddenException, NotFoundException } from '@nestjs/common';
import { In } from 'typeorm';
import { EquiposService, usuarioPerteneceAEquipo } from './equipos.service';
import { Equipo } from './entities/equipo.entity';
import { Usuario } from '../usuarios/entities/usuario.entity';

// Principios FIRST aplicados:
// - Fast: pruebas unitarias sin base de datos real.
// - Isolated: cada prueba monta su propio equipo y sus propios mocks.
// - Repeatable: no dependen del orden ni de estado global.
// - Self-validating: cada caso termina con asserts concretos.
// - Timely: cubren los flujos críticos del servicio.
//
// Tipo de mock:
// - Stub: equipoRepository.findOne / usuarioRepository.findOneBy devuelven datos controlados.
// - Fake: save simula persistencia en memoria.
// - Spy: comprobamos si se invoca save y con qué contenido.

type RepoMock = {
  findOne: jest.Mock;
  find: jest.Mock;
  findOneBy: jest.Mock;
  create: jest.Mock;
  save: jest.Mock;
  createQueryBuilder: jest.Mock;
};

const crearRepoMock = (): RepoMock => ({
  findOne: jest.fn(),
  find: jest.fn(),
  findOneBy: jest.fn(),
  create: jest.fn(),
  save: jest.fn(),
  createQueryBuilder: jest.fn(),
});

const usuario = (id: string, nombre = `Nombre ${id}`): Usuario =>
  ({ id, nombre, email: `${id}@example.com` }) as Usuario;

const crearEquipo = (liderId: string, miembrosIds: string[], id = 'equipo-1'): Equipo =>
  ({
    id,
    nombre: 'Backend Team',
    liderId,
    lider: usuario(liderId),
    miembros: miembrosIds.map((m) => usuario(m)),
  }) as Equipo;

const idsDe = (equipo: Equipo) => equipo.miembros.map((m) => m.id);

describe('Regression - usuarioPerteneceAEquipo', () => {
  it('debe retornar true cuando el usuario es el líder', () => {
    // Arrange
    const equipo = crearEquipo('user-1', []);

    // Act + Assert
    expect(usuarioPerteneceAEquipo(equipo, 'user-1')).toBe(true);
  });

  it('debe retornar true cuando el usuario es miembro', () => {
    // Arrange
    const equipo = crearEquipo('user-1', ['user-1', 'user-2']);

    // Act + Assert
    expect(usuarioPerteneceAEquipo(equipo, 'user-2')).toBe(true);
  });

  it('debe retornar false cuando el usuario no es líder ni miembro', () => {
    // Arrange
    const equipo = crearEquipo('user-1', ['user-1', 'user-2']);

    // Act + Assert
    expect(usuarioPerteneceAEquipo(equipo, 'user-999')).toBe(false);
  });

  it('debe tolerar miembros sin cargar (undefined)', () => {
    // Arrange
    const equipo = { id: 'equipo-1', liderId: 'user-1' } as Equipo;

    // Act + Assert
    expect(usuarioPerteneceAEquipo(equipo, 'user-2')).toBe(false);
    expect(usuarioPerteneceAEquipo(equipo, 'user-1')).toBe(true);
  });
});

describe('Regression - EquiposService - findByUser', () => {
  let service: EquiposService;
  let equipoRepositoryMock: RepoMock;
  let usuarioRepositoryMock: RepoMock;
  let queryBuilderMock: Record<string, jest.Mock>;

  beforeEach(() => {
    equipoRepositoryMock = crearRepoMock();
    usuarioRepositoryMock = crearRepoMock();

    queryBuilderMock = {
      leftJoin: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      orWhere: jest.fn().mockReturnThis(),
      select: jest.fn().mockReturnThis(),
      distinct: jest.fn().mockReturnThis(),
      getRawMany: jest.fn(),
    };
    equipoRepositoryMock.createQueryBuilder.mockReturnValue(queryBuilderMock);

    service = new EquiposService(equipoRepositoryMock as any, usuarioRepositoryMock as any);
  });

  it('debe retornar los equipos donde el usuario es líder o miembro con sus relaciones', async () => {
    // Arrange
    const equipos = [
      crearEquipo('user-1', ['user-1'], 'equipo-1'),
      crearEquipo('user-2', ['user-2', 'user-1'], 'equipo-2'),
    ];
    queryBuilderMock.getRawMany.mockResolvedValue([{ id: 'equipo-1' }, { id: 'equipo-2' }]);
    equipoRepositoryMock.find.mockResolvedValue(equipos);

    // Act
    const resultado = await service.findByUser('user-1');

    // Assert
    expect(equipoRepositoryMock.createQueryBuilder).toHaveBeenCalledWith('equipo');
    expect(queryBuilderMock.leftJoin).toHaveBeenCalledWith('equipo.miembros', 'miembro');
    expect(queryBuilderMock.where).toHaveBeenCalledWith('equipo.liderId = :userId', { userId: 'user-1' });
    expect(queryBuilderMock.orWhere).toHaveBeenCalledWith('miembro.id = :userId', { userId: 'user-1' });
    expect(queryBuilderMock.select).toHaveBeenCalledWith('equipo.id', 'id');
    expect(queryBuilderMock.distinct).toHaveBeenCalledWith(true);
    expect(equipoRepositoryMock.find).toHaveBeenCalledWith({
      where: { id: In(['equipo-1', 'equipo-2']) },
      relations: { lider: true, miembros: true },
      order: { createdAt: 'ASC' },
    });
    expect(resultado).toBe(equipos);
  });

  it('debe retornar un arreglo vacío sin cargar relaciones cuando el usuario no pertenece a ningún equipo', async () => {
    // Arrange
    queryBuilderMock.getRawMany.mockResolvedValue([]);

    // Act
    const resultado = await service.findByUser('user-999');

    // Assert
    expect(resultado).toEqual([]);
    expect(equipoRepositoryMock.find).not.toHaveBeenCalled();
  });
});

describe('Regression - EquiposService - create', () => {
  let service: EquiposService;
  let equipoRepositoryMock: RepoMock;
  let usuarioRepositoryMock: RepoMock;

  beforeEach(() => {
    equipoRepositoryMock = crearRepoMock();
    usuarioRepositoryMock = crearRepoMock();
    service = new EquiposService(equipoRepositoryMock as any, usuarioRepositoryMock as any);
  });

  it('debe crear el equipo con el creador como líder y miembro, y retornarlo con relaciones', async () => {
    // Arrange
    const entidad = { nombre: 'Nuevo', liderId: 'user-1', miembros: [{ id: 'user-1' }] };
    const recargado = crearEquipo('user-1', ['user-1'], 'equipo-nuevo');
    equipoRepositoryMock.create.mockReturnValue(entidad);
    equipoRepositoryMock.save.mockResolvedValue({ ...entidad, id: 'equipo-nuevo' });
    equipoRepositoryMock.findOne.mockResolvedValue(recargado);

    // Act
    const resultado = await service.create({ nombre: 'Nuevo' }, 'user-1');

    // Assert
    expect(equipoRepositoryMock.create).toHaveBeenCalledWith({
      nombre: 'Nuevo',
      liderId: 'user-1',
      miembros: [{ id: 'user-1' }],
    });
    expect(equipoRepositoryMock.save).toHaveBeenCalledWith(entidad);
    expect(equipoRepositoryMock.findOne).toHaveBeenCalledWith({
      where: { id: 'equipo-nuevo' },
      relations: { lider: true, miembros: true },
    });
    expect(resultado).toBe(recargado);
  });
});

describe('Regression - EquiposService - addMiembro', () => {
  // AAA + fluent-style assertions (Jest equivalent for this TypeScript stack)
  let service: EquiposService;
  let equipoRepositoryMock: RepoMock;
  let usuarioRepositoryMock: RepoMock;

  beforeEach(() => {
    equipoRepositoryMock = crearRepoMock();
    usuarioRepositoryMock = crearRepoMock();
    equipoRepositoryMock.save.mockImplementation(async (e: Equipo) => e);

    service = new EquiposService(equipoRepositoryMock as any, usuarioRepositoryMock as any);
  });

  it('debe agregar un miembro cuando el solicitante es el líder del equipo', async () => {
    // Arrange
    const equipo = crearEquipo('user-1', ['user-1']);
    const recargado = crearEquipo('user-1', ['user-1', 'user-2']);
    equipoRepositoryMock.findOne.mockResolvedValueOnce(equipo).mockResolvedValueOnce(recargado);
    usuarioRepositoryMock.findOneBy.mockResolvedValue(usuario('user-2'));

    // Act
    const resultado = await service.addMiembro('equipo-1', 'user-2', 'user-1');

    // Assert
    expect(equipoRepositoryMock.findOne).toHaveBeenCalledWith({
      where: { id: 'equipo-1' },
      relations: { lider: true, miembros: true },
    });
    expect(usuarioRepositoryMock.findOneBy).toHaveBeenCalledWith({ id: 'user-2' });
    expect(idsDe(equipo)).toEqual(['user-1', 'user-2']);
    expect(equipoRepositoryMock.save).toHaveBeenCalledTimes(1);
    expect(equipoRepositoryMock.save).toHaveBeenCalledWith(equipo);
    expect(equipoRepositoryMock.findOne).toHaveBeenCalledTimes(2);
    expect(resultado).toBe(recargado);
  });

  it('debe lanzar NotFoundException cuando el equipo no existe', async () => {
    // Arrange
    equipoRepositoryMock.findOne.mockResolvedValue(null);

    // Act + Assert
    await expect(service.addMiembro('equipo-404', 'user-2', 'user-1')).rejects.toThrow(NotFoundException);
    await expect(service.addMiembro('equipo-404', 'user-2', 'user-1')).rejects.toThrow('Equipo no encontrado');
    expect(equipoRepositoryMock.save).not.toHaveBeenCalled();
  });

  it('debe lanzar NotFoundException cuando el usuario a agregar no existe', async () => {
    // Arrange
    equipoRepositoryMock.findOne.mockImplementation(async () => crearEquipo('user-1', ['user-1']));
    usuarioRepositoryMock.findOneBy.mockResolvedValue(null);

    // Act + Assert
    await expect(service.addMiembro('equipo-1', 'user-404', 'user-1')).rejects.toThrow(NotFoundException);
    await expect(service.addMiembro('equipo-1', 'user-404', 'user-1')).rejects.toThrow('Usuario no encontrado');
    expect(equipoRepositoryMock.save).not.toHaveBeenCalled();
  });

  it('debe lanzar ForbiddenException cuando el solicitante no es el líder del equipo', async () => {
    // Arrange
    equipoRepositoryMock.findOne.mockImplementation(async () => crearEquipo('user-1', ['user-1']));

    // Act + Assert
    await expect(service.addMiembro('equipo-1', 'user-2', 'user-3')).rejects.toThrow(ForbiddenException);
    await expect(service.addMiembro('equipo-1', 'user-2', 'user-3')).rejects.toThrow('Solo el líder puede agregar miembros');
    expect(usuarioRepositoryMock.findOneBy).not.toHaveBeenCalled();
    expect(equipoRepositoryMock.save).not.toHaveBeenCalled();
  });

  it('debe lanzar ConflictException cuando el usuario ya es miembro del equipo', async () => {
    // Arrange
    equipoRepositoryMock.findOne.mockImplementation(async () => crearEquipo('user-1', ['user-1', 'user-2']));
    usuarioRepositoryMock.findOneBy.mockResolvedValue(usuario('user-2'));

    // Act + Assert
    await expect(service.addMiembro('equipo-1', 'user-2', 'user-1')).rejects.toThrow(ConflictException);
    await expect(service.addMiembro('equipo-1', 'user-2', 'user-1')).rejects.toThrow('El usuario ya es miembro del equipo');
    expect(equipoRepositoryMock.save).not.toHaveBeenCalled();
  });

  it('debe validar que solo el líder puede autorizar la operación antes de persistir cambios', async () => {
    // Arrange
    const equipo = crearEquipo('user-1', ['user-1', 'user-2']);
    equipoRepositoryMock.findOne.mockResolvedValue(equipo);

    // Act + Assert
    await expect(service.addMiembro('equipo-1', 'user-2', 'user-3')).rejects.toThrow('Solo el líder puede agregar miembros');
    expect(idsDe(equipo)).toEqual(['user-1', 'user-2']);
    expect(equipoRepositoryMock.save).not.toHaveBeenCalled();
  });

  it('debe permitir múltiples inserciones consecutivas de miembros en el mismo equipo', async () => {
    // Arrange
    const equipo = crearEquipo('user-1', ['user-1']);
    equipoRepositoryMock.findOne.mockResolvedValue(equipo);
    usuarioRepositoryMock.findOneBy.mockImplementation(async ({ id }: { id: string }) => usuario(id));

    // Act
    await service.addMiembro('equipo-1', 'user-2', 'user-1');
    const resultado = await service.addMiembro('equipo-1', 'user-3', 'user-1');

    // Assert
    expect(equipoRepositoryMock.save).toHaveBeenCalledTimes(2);
    expect(idsDe(resultado)).toEqual(['user-1', 'user-2', 'user-3']);
  });
});
