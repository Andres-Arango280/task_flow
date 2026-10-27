import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { ProyectosService } from './proyectos.service';

// ========================
// PRUEBAS DE CAJA NEGRA - PROYECTOS (E2E)
// ========================
// Estas pruebas validan el comportamiento de los endpoints de proyectos
// desde la perspectiva del usuario (entrada/salida visible)

describe('Regression - Proyectos E2E Tests (Black Box)', () => {
  // AAA + fluent-style assertions (Jest equivalent for this TypeScript stack)
  let service: ProyectosService;
  let proyectoRepository: any;
  let listaRepository: any;
  let equipoRepository: any;

  const equipoBase = (miembros: string[] = ['user-1'], liderId = 'user-1') => ({
    id: 'equipo-1',
    nombre: 'Backend Team',
    liderId,
    miembros: miembros.map((id) => ({ id })),
  });

  beforeEach(() => {
    proyectoRepository = {
      findOne: jest.fn(),
      find: jest.fn(),
      create: jest.fn().mockImplementation((entidad) => ({ ...entidad })),
      save: jest.fn(),
    };

    listaRepository = {
      create: jest.fn().mockImplementation((entidad) => ({ ...entidad })),
      save: jest.fn().mockImplementation(async (listas) => listas),
    };

    equipoRepository = {
      findOne: jest.fn(),
      find: jest.fn(),
    };

    service = new ProyectosService(
      proyectoRepository as any,
      listaRepository as any,
      equipoRepository as any,
    );
  });

  // ========================
  // POST /proyectos - CREATE PROYECTO
  // ========================
  describe('Crear proyecto (Caja Negra)', () => {
    // Escenario 1: Crear proyecto exitosamente
    it('debe crear un proyecto y retornarlo con ID', async () => {
      const proyectoGuardado = {
        id: 'proyecto-1',
        nombre: 'Q1 2025 Sprint',
        equipoId: 'equipo-1',
      };

      equipoRepository.findOne.mockResolvedValue(equipoBase(['user-1', 'user-2']));
      proyectoRepository.save.mockResolvedValue(proyectoGuardado);

      const resultado = await service.crearProyecto(
        { nombre: 'Q1 2025 Sprint', equipoId: 'equipo-1' },
        'user-2',
      );

      expect(resultado).toHaveProperty('id', 'proyecto-1');
      expect(resultado).toHaveProperty('nombre', 'Q1 2025 Sprint');
      expect(resultado).toHaveProperty('equipoId', 'equipo-1');
    });

    // Escenario 2: Crear listas default automáticamente
    it('debe crear tres listas default (Por Hacer, En Progreso, Hecho)', async () => {
      equipoRepository.findOne.mockResolvedValue(equipoBase());
      proyectoRepository.save.mockResolvedValue({ id: 'proyecto-1', nombre: 'Sprint', equipoId: 'equipo-1' });

      await service.crearProyecto({ nombre: 'Sprint', equipoId: 'equipo-1' }, 'user-1');

      expect(listaRepository.save).toHaveBeenCalledWith([
        expect.objectContaining({ nombre: 'Por Hacer', orden: 0, proyectoId: 'proyecto-1' }),
        expect.objectContaining({ nombre: 'En Progreso', orden: 1, proyectoId: 'proyecto-1' }),
        expect.objectContaining({ nombre: 'Hecho', orden: 2, proyectoId: 'proyecto-1' }),
      ]);
    });

    // Escenario 3: Equipo no existe (404)
    it('debe retornar 404 si el equipo no existe', async () => {
      equipoRepository.findOne.mockResolvedValue(null);

      try {
        await service.crearProyecto({ nombre: 'Sprint', equipoId: 'equipo-no-existe' }, 'user-1');
        throw new Error('Debería haber lanzado una excepción');
      } catch (error: any) {
        expect(error instanceof NotFoundException).toBe(true);
        expect(error.message).toBe('Equipo no encontrado');
      }
    });

    // Escenario 4: Usuario no pertenece al equipo (403)
    it('debe retornar 403 si el usuario no pertenece al equipo', async () => {
      equipoRepository.findOne.mockResolvedValue(equipoBase(['user-1', 'user-3']));

      try {
        await service.crearProyecto({ nombre: 'Sprint', equipoId: 'equipo-1' }, 'user-2');
        throw new Error('Debería haber lanzado una excepción');
      } catch (error: any) {
        expect(error instanceof ForbiddenException).toBe(true);
        expect(error.message).toBe('No tienes acceso a este equipo');
      }
    });

    // Escenario 5: Líder del equipo puede crear proyecto
    it('el líder del equipo debe poder crear proyectos', async () => {
      // El líder no figura en miembros: el acceso se concede por liderId
      equipoRepository.findOne.mockResolvedValue(equipoBase([], 'user-1'));
      proyectoRepository.save.mockResolvedValue({ id: 'proyecto-2', nombre: 'Sprint 2', equipoId: 'equipo-1' });

      const resultado = await service.crearProyecto(
        { nombre: 'Sprint 2', equipoId: 'equipo-1' },
        'user-1',
      );

      expect(resultado).toHaveProperty('id');
      expect(listaRepository.save).toHaveBeenCalled();
    });

    // Escenario 6: No se crean listas si hay error de acceso
    it('no debe crear listas si el usuario no tiene acceso', async () => {
      equipoRepository.findOne.mockResolvedValue(equipoBase());

      await expect(
        service.crearProyecto({ nombre: 'Sprint', equipoId: 'equipo-1' }, 'user-999'),
      ).rejects.toThrow(ForbiddenException);

      expect(proyectoRepository.save).not.toHaveBeenCalled();
      expect(listaRepository.save).not.toHaveBeenCalled();
    });

    // Escenario 7: Nombre de proyecto vacío (la validación la hace el ValidationPipe, no el servicio)
    it('debe manejar nombres de proyecto vacíos', async () => {
      equipoRepository.findOne.mockResolvedValue(equipoBase());
      proyectoRepository.save.mockResolvedValue({ id: 'proyecto-1', nombre: '', equipoId: 'equipo-1' });

      const resultado = await service.crearProyecto({ nombre: '', equipoId: 'equipo-1' }, 'user-1');

      expect(resultado.nombre).toBe('');
    });
  });

  // ========================
  // GET /proyectos?equipoId=X - FIND BY EQUIPO
  // ========================
  describe('Obtener proyectos de equipo (Caja Negra)', () => {
    // Escenario 1: Obtener proyectos exitosamente
    it('debe retornar lista de proyectos del equipo', async () => {
      const proyectos = [
        { id: 'proyecto-1', nombre: 'Sprint 1', equipoId: 'equipo-1' },
        { id: 'proyecto-2', nombre: 'Sprint 2', equipoId: 'equipo-1' },
      ];

      equipoRepository.findOne.mockResolvedValue(equipoBase(['user-1', 'user-2']));
      proyectoRepository.find.mockResolvedValue(proyectos);

      const resultado = await service.findByEquipo('equipo-1', 'user-1');

      expect(proyectoRepository.find).toHaveBeenCalledWith(
        expect.objectContaining({ where: { equipoId: 'equipo-1' } }),
      );
      expect(resultado).toHaveLength(2);
      expect(resultado[0]).toHaveProperty('nombre', 'Sprint 1');
      expect(resultado[1]).toHaveProperty('nombre', 'Sprint 2');
    });

    // Escenario 2: Equipo no existe (404)
    it('debe retornar 404 si el equipo no existe', async () => {
      equipoRepository.findOne.mockResolvedValue(null);

      await expect(service.findByEquipo('equipo-no-existe', 'user-1')).rejects.toThrow(
        NotFoundException,
      );
      expect(proyectoRepository.find).not.toHaveBeenCalled();
    });

    // Escenario 3: Usuario no tiene acceso (403)
    it('debe retornar 403 si el usuario no tiene acceso al equipo', async () => {
      equipoRepository.findOne.mockResolvedValue(equipoBase());

      await expect(service.findByEquipo('equipo-1', 'user-999')).rejects.toThrow(
        ForbiddenException,
      );
      expect(proyectoRepository.find).not.toHaveBeenCalled();
    });

    // Escenario 4: Equipo sin proyectos
    it('debe retornar array vacío si el equipo no tiene proyectos', async () => {
      equipoRepository.findOne.mockResolvedValue(equipoBase());
      proyectoRepository.find.mockResolvedValue([]);

      const resultado = await service.findByEquipo('equipo-1', 'user-1');

      expect(resultado).toHaveLength(0);
    });
  });

  // ========================
  // GET /proyectos/:id - GET BY ID
  // ========================
  describe('Obtener proyecto por ID (Caja Negra)', () => {
    // Escenario 1: Obtener proyecto exitosamente
    it('debe retornar datos del proyecto con acceso', async () => {
      const proyecto = {
        id: 'proyecto-1',
        nombre: 'Sprint 1',
        equipoId: 'equipo-1',
        equipo: equipoBase(['user-1', 'user-2']),
      };
      proyectoRepository.findOne.mockResolvedValue(proyecto);

      const resultado = await service.findById('proyecto-1', 'user-2');

      expect(proyectoRepository.findOne).toHaveBeenCalledWith(
        expect.objectContaining({ where: { id: 'proyecto-1' } }),
      );
      expect(resultado).toHaveProperty('id', 'proyecto-1');
      expect(resultado).toHaveProperty('nombre', 'Sprint 1');
    });

    // Escenario 2: Proyecto no existe (404)
    it('debe retornar 404 si el proyecto no existe', async () => {
      proyectoRepository.findOne.mockResolvedValue(null);

      try {
        await service.findById('proyecto-no-existe', 'user-1');
        throw new Error('Debería haber lanzado una excepción');
      } catch (error: any) {
        expect(error instanceof NotFoundException).toBe(true);
        expect(error.message).toBe('Proyecto no encontrado');
      }
    });

    // Escenario 3: Usuario no tiene acceso (403)
    it('debe retornar 403 si el usuario no tiene acceso al proyecto', async () => {
      proyectoRepository.findOne.mockResolvedValue({
        id: 'proyecto-1',
        nombre: 'Sprint 1',
        equipoId: 'equipo-1',
        equipo: equipoBase(),
      });

      try {
        await service.findById('proyecto-1', 'user-999');
        throw new Error('Debería haber lanzado una excepción');
      } catch (error: any) {
        expect(error instanceof ForbiddenException).toBe(true);
        expect(error.message).toBe('No tienes acceso a este proyecto');
      }
    });
  });

  // ========================
  // Validaciones de entrada
  // ========================
  describe('Validaciones de entrada (Caja Negra)', () => {
    // IDs vacíos: el repositorio no encuentra el equipo
    it('debe manejar equipoId vacío en crearProyecto', async () => {
      equipoRepository.findOne.mockResolvedValue(null);

      await expect(
        service.crearProyecto({ nombre: 'Sprint', equipoId: '' }, 'user-1'),
      ).rejects.toThrow(NotFoundException);
      expect(proyectoRepository.save).not.toHaveBeenCalled();
    });

    // Nombre con caracteres especiales
    it('debe aceptar nombres con caracteres especiales', async () => {
      const nombre = 'Sprint #1 & Q1 2025 (Updated)';
      equipoRepository.findOne.mockResolvedValue(equipoBase());
      proyectoRepository.save.mockImplementation(async (p) => ({ id: 'proyecto-1', ...p }));

      const resultado = await service.crearProyecto({ nombre, equipoId: 'equipo-1' }, 'user-1');

      expect(proyectoRepository.create).toHaveBeenCalledWith({ nombre, equipoId: 'equipo-1' });
      expect(resultado.nombre).toBe(nombre);
    });

    // Nombre muy largo
    it('debe aceptar nombres muy largos', async () => {
      const longName = 'a'.repeat(255);
      equipoRepository.findOne.mockResolvedValue(equipoBase());
      proyectoRepository.save.mockImplementation(async (p) => ({ id: 'proyecto-1', ...p }));

      const resultado = await service.crearProyecto(
        { nombre: longName, equipoId: 'equipo-1' },
        'user-1',
      );

      expect(resultado.nombre).toBe(longName);
    });
  });
});
