import { BadRequestException, ForbiddenException, NotFoundException } from '@nestjs/common';
import { TareasService } from './tareas.service';

// Principios FIRST aplicados:
// - Fast: repositorios TypeORM simulados, sin BD real.
// - Isolated: mocks recreados en cada caso (beforeEach).
// - Repeatable: datos deterministas.
// - Self-validating: asserts explícitos sobre resultado y efectos.
// - Timely: cubre control de acceso, validaciones y flujos felices.
//
// Tipo de mock:
// - Stub: findOne/findOneBy devuelven entidades controladas.
// - Spy: verificamos create/save/update y sus argumentos.

describe('Regression - TareasService', () => {
  // AAA + fluent-style assertions (Jest equivalent for this TypeScript stack)
  let service: TareasService;
  let tareaRepository: {
    findOne: jest.Mock;
    find: jest.Mock;
    create: jest.Mock;
    save: jest.Mock;
    update: jest.Mock;
  };
  let listaRepository: { findOne: jest.Mock; findOneBy: jest.Mock };
  let proyectoRepository: { findOne: jest.Mock };
  let usuarioRepository: { findBy: jest.Mock };

  // Datos de referencia: líder u-lider, miembro u-miembro; u-externo no pertenece al equipo
  const crearProyecto = (id = 'p1') => ({
    id,
    nombre: 'Proyecto',
    equipoId: 'e1',
    equipo: { id: 'e1', liderId: 'u-lider', miembros: [{ id: 'u-miembro' }] },
  });
  const listaP1 = { id: 'l1', nombre: 'Por Hacer', orden: 0, proyectoId: 'p1' };
  const lista2P1 = { id: 'l2', nombre: 'En Progreso', orden: 1, proyectoId: 'p1' };
  const listaP2 = { id: 'l9', nombre: 'Por Hacer', orden: 0, proyectoId: 'p2' };
  const crearTarea = (overrides: Record<string, any> = {}) => ({
    id: 't1',
    titulo: 'Tarea',
    listaId: 'l1',
    lista: { ...listaP1 },
    asignados: [],
    ...overrides,
  });

  beforeEach(() => {
    tareaRepository = {
      findOne: jest.fn(),
      find: jest.fn(),
      create: jest.fn().mockImplementation((entidad) => ({ ...entidad })),
      save: jest.fn(),
      update: jest.fn().mockResolvedValue({ affected: 1 }),
    };
    listaRepository = { findOne: jest.fn(), findOneBy: jest.fn() };
    proyectoRepository = { findOne: jest.fn() };
    usuarioRepository = { findBy: jest.fn() };

    service = new TareasService(
      tareaRepository as any,
      listaRepository as any,
      proyectoRepository as any,
      usuarioRepository as any,
    );
  });

  // ========================
  // findByProyecto
  // ========================
  describe('findByProyecto', () => {
    it('debe lanzar NotFoundException al intentar obtener tareas de un proyecto inexistente', async () => {
      // Arrange
      proyectoRepository.findOne.mockResolvedValue(null);

      // Act + Assert
      await expect(service.findByProyecto('p1', 'u-miembro')).rejects.toThrow(NotFoundException);
      expect(tareaRepository.find).not.toHaveBeenCalled();
    });

    it('debe lanzar ForbiddenException cuando el usuario no es miembro del equipo del proyecto', async () => {
      // Arrange
      proyectoRepository.findOne.mockResolvedValue(crearProyecto());

      // Act + Assert
      await expect(service.findByProyecto('p1', 'u-externo')).rejects.toThrow(ForbiddenException);
      expect(tareaRepository.find).not.toHaveBeenCalled();
    });

    it('debe devolver las tareas del proyecto cuando el usuario es miembro', async () => {
      // Arrange
      const tareas = [crearTarea(), crearTarea({ id: 't2', titulo: 'Otra' })];
      proyectoRepository.findOne.mockResolvedValue(crearProyecto());
      tareaRepository.find.mockResolvedValue(tareas);

      // Act
      const resultado = await service.findByProyecto('p1', 'u-miembro');

      // Assert
      expect(resultado).toEqual(tareas);
      expect(proyectoRepository.findOne).toHaveBeenCalledWith(
        expect.objectContaining({ where: { id: 'p1' } }),
      );
      expect(tareaRepository.find).toHaveBeenCalledWith(
        expect.objectContaining({ where: { lista: { proyectoId: 'p1' } } }),
      );
    });

    it('debe permitir al líder obtener las tareas aunque no figure en miembros', async () => {
      // Arrange
      proyectoRepository.findOne.mockResolvedValue(crearProyecto());
      tareaRepository.find.mockResolvedValue([]);

      // Act
      const resultado = await service.findByProyecto('p1', 'u-lider');

      // Assert
      expect(resultado).toEqual([]);
    });
  });

  // ========================
  // create
  // ========================
  describe('create', () => {
    it('debe lanzar NotFoundException al crear una tarea con una lista inexistente', async () => {
      // Arrange
      listaRepository.findOneBy.mockResolvedValue(null);

      // Act + Assert
      await expect(
        service.create({ titulo: 't', listaId: 'l-404' }, 'u-miembro'),
      ).rejects.toThrow('Lista no encontrada');
      expect(listaRepository.findOneBy).toHaveBeenCalledWith({ id: 'l-404' });
      expect(tareaRepository.save).not.toHaveBeenCalled();
    });

    it('debe lanzar BadRequestException cuando no se envía proyectoId ni listaId', async () => {
      // Act + Assert
      await expect(service.create({ titulo: 't' }, 'u-miembro')).rejects.toThrow(
        BadRequestException,
      );
      await expect(service.create({ titulo: 't' }, 'u-miembro')).rejects.toThrow(
        'Debes enviar proyectoId o listaId',
      );
      expect(tareaRepository.save).not.toHaveBeenCalled();
    });

    it('debe lanzar NotFoundException cuando el proyecto no tiene listas', async () => {
      // Arrange
      listaRepository.findOne.mockResolvedValue(null);

      // Act + Assert
      await expect(
        service.create({ titulo: 't', proyectoId: 'p1' }, 'u-miembro'),
      ).rejects.toThrow(NotFoundException);
      await expect(
        service.create({ titulo: 't', proyectoId: 'p1' }, 'u-miembro'),
      ).rejects.toThrow('No hay listas creadas para este proyecto');
    });

    it('debe lanzar BadRequestException cuando la lista no pertenece al proyecto indicado', async () => {
      // Arrange
      listaRepository.findOneBy.mockResolvedValue(listaP2);
      proyectoRepository.findOne.mockResolvedValue(crearProyecto('p2'));

      // Act + Assert
      await expect(
        service.create({ titulo: 't', listaId: 'l9', proyectoId: 'p1' }, 'u-miembro'),
      ).rejects.toThrow('La lista no pertenece al proyecto indicado');
      expect(tareaRepository.save).not.toHaveBeenCalled();
    });

    it('no debe revelar si la lista existe cuando el usuario no tiene acceso a su proyecto', async () => {
      // Arrange
      listaRepository.findOneBy.mockResolvedValue(listaP2);
      proyectoRepository.findOne.mockResolvedValue(crearProyecto('p2'));

      // Act + Assert
      await expect(
        service.create({ titulo: 't', listaId: 'l9', proyectoId: 'p1' }, 'u-externo'),
      ).rejects.toThrow(ForbiddenException);
      expect(tareaRepository.save).not.toHaveBeenCalled();
    });

    it('debe lanzar ForbiddenException cuando el usuario no pertenece al equipo del proyecto', async () => {
      // Arrange
      listaRepository.findOneBy.mockResolvedValue(listaP1);
      proyectoRepository.findOne.mockResolvedValue(crearProyecto());

      // Act + Assert
      await expect(
        service.create({ titulo: 't', listaId: 'l1' }, 'u-externo'),
      ).rejects.toThrow(ForbiddenException);
      expect(tareaRepository.save).not.toHaveBeenCalled();
    });

    it('debe lanzar BadRequestException al asignar usuarios que no son miembros del equipo', async () => {
      // Arrange
      listaRepository.findOneBy.mockResolvedValue(listaP1);
      proyectoRepository.findOne.mockResolvedValue(crearProyecto());

      // Act + Assert
      await expect(
        service.create(
          { titulo: 't', listaId: 'l1', asignados: ['u-miembro', 'u-externo'] },
          'u-miembro',
        ),
      ).rejects.toThrow('Solo se pueden asignar miembros del equipo');
      expect(usuarioRepository.findBy).not.toHaveBeenCalled();
      expect(tareaRepository.save).not.toHaveBeenCalled();
    });

    it('debe crear la tarea en la lista indicada con asignados válidos y devolverla recargada', async () => {
      // Arrange
      const usuarios = [{ id: 'u-miembro' }, { id: 'u-lider' }];
      const tareaRecargada = crearTarea({ titulo: 'Nueva', asignados: usuarios });
      listaRepository.findOneBy.mockResolvedValue(listaP1);
      proyectoRepository.findOne.mockResolvedValue(crearProyecto());
      usuarioRepository.findBy.mockResolvedValue(usuarios);
      tareaRepository.save.mockResolvedValue({ id: 't1' });
      tareaRepository.findOne.mockResolvedValue(tareaRecargada);

      // Act
      const resultado = await service.create(
        {
          titulo: 'Nueva',
          descripcion: 'desc',
          listaId: 'l1',
          proyectoId: 'p1',
          asignados: ['u-miembro', 'u-lider', 'u-miembro'],
        },
        'u-miembro',
      );

      // Assert
      expect(usuarioRepository.findBy).toHaveBeenCalledTimes(1);
      expect(tareaRepository.create).toHaveBeenCalledWith({
        titulo: 'Nueva',
        descripcion: 'desc',
        listaId: 'l1',
        asignados: usuarios,
      });
      expect(tareaRepository.save).toHaveBeenCalledTimes(1);
      expect(tareaRepository.findOne).toHaveBeenCalledWith(
        expect.objectContaining({ where: { id: 't1' } }),
      );
      expect(resultado).toEqual(tareaRecargada);
    });

    it('debe crear la tarea en la primera lista del proyecto cuando solo se envía proyectoId', async () => {
      // Arrange
      listaRepository.findOne.mockResolvedValue(listaP1);
      proyectoRepository.findOne.mockResolvedValue(crearProyecto());
      tareaRepository.save.mockResolvedValue({ id: 't1' });
      tareaRepository.findOne.mockResolvedValue(crearTarea());

      // Act
      const resultado = await service.create({ titulo: 'Tarea', proyectoId: 'p1' }, 'u-lider');

      // Assert
      expect(listaRepository.findOne).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { proyectoId: 'p1' },
          order: expect.objectContaining({ orden: 'ASC' }),
        }),
      );
      expect(listaRepository.findOneBy).not.toHaveBeenCalled();
      expect(tareaRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({ listaId: 'l1', asignados: [] }),
      );
      expect(usuarioRepository.findBy).not.toHaveBeenCalled();
      expect(resultado).toHaveProperty('id', 't1');
    });
  });

  // ========================
  // moverTarea
  // ========================
  describe('moverTarea', () => {
    it('debe lanzar NotFoundException al mover una tarea que no existe', async () => {
      // Arrange
      tareaRepository.findOne.mockResolvedValue(null);

      // Act + Assert
      await expect(service.moverTarea('t-404', 'l2', 'u-miembro')).rejects.toThrow(
        'Tarea no encontrada',
      );
      expect(tareaRepository.update).not.toHaveBeenCalled();
    });

    it('debe lanzar NotFoundException cuando la lista destino no existe', async () => {
      // Arrange
      tareaRepository.findOne.mockResolvedValue(crearTarea());
      listaRepository.findOneBy.mockResolvedValue(null);

      // Act + Assert
      await expect(service.moverTarea('t1', 'l-404', 'u-miembro')).rejects.toThrow(
        'Lista destino no encontrada',
      );
      expect(tareaRepository.update).not.toHaveBeenCalled();
    });

    it('debe lanzar BadRequestException al mover una tarea a una lista de otro proyecto', async () => {
      // Arrange
      tareaRepository.findOne.mockResolvedValue(crearTarea());
      listaRepository.findOneBy.mockResolvedValue(listaP2);

      // Act + Assert
      await expect(service.moverTarea('t1', 'l9', 'u-miembro')).rejects.toThrow(
        BadRequestException,
      );
      expect(tareaRepository.update).not.toHaveBeenCalled();
    });

    it('debe lanzar ForbiddenException cuando el usuario no pertenece al equipo', async () => {
      // Arrange
      tareaRepository.findOne.mockResolvedValue(crearTarea());
      listaRepository.findOneBy.mockResolvedValue(lista2P1);
      proyectoRepository.findOne.mockResolvedValue(crearProyecto());

      // Act + Assert
      await expect(service.moverTarea('t1', 'l2', 'u-externo')).rejects.toThrow(
        'No tienes acceso a esta tarea',
      );
      expect(tareaRepository.update).not.toHaveBeenCalled();
    });

    it('debe mover la tarea a otra lista del mismo proyecto y devolverla recargada', async () => {
      // Arrange
      const tareaMovida = crearTarea({ listaId: 'l2', lista: { ...lista2P1 } });
      tareaRepository.findOne
        .mockResolvedValueOnce(crearTarea())
        .mockResolvedValueOnce(tareaMovida);
      listaRepository.findOneBy.mockResolvedValue(lista2P1);
      proyectoRepository.findOne.mockResolvedValue(crearProyecto());

      // Act
      const resultado = await service.moverTarea('t1', 'l2', 'u-miembro');

      // Assert
      expect(listaRepository.findOneBy).toHaveBeenCalledWith({ id: 'l2' });
      expect(tareaRepository.update).toHaveBeenCalledWith('t1', { listaId: 'l2' });
      expect(resultado).toEqual(tareaMovida);
    });
  });

  // ========================
  // asignarMiembros
  // ========================
  describe('asignarMiembros', () => {
    it('debe lanzar NotFoundException al asignar miembros a una tarea inexistente', async () => {
      // Arrange
      tareaRepository.findOne.mockResolvedValue(null);

      // Act + Assert
      await expect(service.asignarMiembros('t-404', ['u-miembro'], 'u-lider')).rejects.toThrow(
        NotFoundException,
      );
      expect(tareaRepository.save).not.toHaveBeenCalled();
    });

    it('debe lanzar ForbiddenException cuando el usuario no pertenece al equipo', async () => {
      // Arrange
      tareaRepository.findOne.mockResolvedValue(crearTarea());
      proyectoRepository.findOne.mockResolvedValue(crearProyecto());

      // Act + Assert
      await expect(
        service.asignarMiembros('t1', ['u-miembro'], 'u-externo'),
      ).rejects.toThrow(ForbiddenException);
      expect(tareaRepository.save).not.toHaveBeenCalled();
    });

    it('debe lanzar BadRequestException al asignar un usuario que no es miembro del equipo', async () => {
      // Arrange
      tareaRepository.findOne.mockResolvedValue(crearTarea());
      proyectoRepository.findOne.mockResolvedValue(crearProyecto());

      // Act + Assert
      await expect(
        service.asignarMiembros('t1', ['u-externo'], 'u-lider'),
      ).rejects.toThrow(BadRequestException);
      expect(usuarioRepository.findBy).not.toHaveBeenCalled();
      expect(tareaRepository.save).not.toHaveBeenCalled();
    });

    it('debe asignar miembros válidos (incluido el líder) y devolver la tarea recargada', async () => {
      // Arrange
      const usuarios = [{ id: 'u-miembro' }, { id: 'u-lider' }];
      const tareaActualizada = crearTarea({ asignados: usuarios });
      tareaRepository.findOne
        .mockResolvedValueOnce(crearTarea())
        .mockResolvedValueOnce(tareaActualizada);
      proyectoRepository.findOne.mockResolvedValue(crearProyecto());
      usuarioRepository.findBy.mockResolvedValue(usuarios);
      tareaRepository.save.mockImplementation(async (t) => t);

      // Act
      const resultado = await service.asignarMiembros(
        't1',
        ['u-miembro', 'u-lider', 'u-miembro'],
        'u-miembro',
      );

      // Assert
      expect(proyectoRepository.findOne).toHaveBeenCalledWith(
        expect.objectContaining({ where: { id: 'p1' } }),
      );
      expect(usuarioRepository.findBy).toHaveBeenCalledTimes(1);
      expect(tareaRepository.save).toHaveBeenCalledWith(
        expect.objectContaining({ id: 't1', asignados: usuarios }),
      );
      expect(resultado).toEqual(tareaActualizada);
    });

    it('debe permitir vaciar los asignados enviando un arreglo vacío', async () => {
      // Arrange
      tareaRepository.findOne
        .mockResolvedValueOnce(crearTarea({ asignados: [{ id: 'u-miembro' }] }))
        .mockResolvedValueOnce(crearTarea({ asignados: [] }));
      proyectoRepository.findOne.mockResolvedValue(crearProyecto());
      tareaRepository.save.mockImplementation(async (t) => t);

      // Act
      const resultado = await service.asignarMiembros('t1', [], 'u-lider');

      // Assert
      expect(usuarioRepository.findBy).not.toHaveBeenCalled();
      expect(tareaRepository.save).toHaveBeenCalledWith(
        expect.objectContaining({ asignados: [] }),
      );
      expect(resultado.asignados).toEqual([]);
    });
  });
});
