import { ConflictException, ForbiddenException, NotFoundException } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { EquiposService } from './equipos.service';
import { Equipo } from './entities/equipo.entity';
import { Usuario } from '../usuarios/entities/usuario.entity';

// ========================
// PRUEBAS DE CAJA NEGRA - EQUIPOS (E2E)
// ========================
// Estas pruebas validan el comportamiento de los endpoints de equipos
// desde la perspectiva del usuario (entrada/salida visible)

const juan = { id: 'user-1', nombre: 'Juan', email: 'juan@example.com' } as Usuario;
const maria = { id: 'user-2', nombre: 'María', email: 'maria@example.com' } as Usuario;
const pedro = { id: 'user-3', nombre: 'Pedro', email: 'pedro@example.com' } as Usuario;

const crearEquipo = (lider: Usuario, miembros: Usuario[]): Equipo =>
  ({
    id: 'equipo-1',
    nombre: 'Backend Team',
    liderId: lider.id,
    lider,
    miembros: [...miembros],
  }) as Equipo;

const idsDe = (equipo: Equipo) => equipo.miembros.map((m) => m.id);

describe('Regression - Equipos E2E Tests (Black Box)', () => {
  // AAA + fluent-style assertions (Jest equivalent for this TypeScript stack)
  let service: EquiposService;
  let equipoRepository: { findOne: jest.Mock; find: jest.Mock; save: jest.Mock };
  let usuarioRepository: { findOneBy: jest.Mock };

  beforeEach(async () => {
    equipoRepository = {
      findOne: jest.fn(),
      find: jest.fn(),
      save: jest.fn().mockImplementation(async (e: Equipo) => e),
    };
    usuarioRepository = {
      findOneBy: jest.fn(),
    };

    const moduleRef = await Test.createTestingModule({
      providers: [
        EquiposService,
        { provide: getRepositoryToken(Equipo), useValue: equipoRepository },
        { provide: getRepositoryToken(Usuario), useValue: usuarioRepository },
      ],
    }).compile();

    service = moduleRef.get(EquiposService);
  });

  // ========================
  // POST /equipos/:id/miembros - ADD MIEMBRO
  // ========================
  describe('Agregar miembro a equipo (Caja Negra)', () => {
    // Escenario 1: Agregar miembro exitosamente
    it('debe agregar un miembro y retornar el equipo actualizado', async () => {
      // Arrange
      equipoRepository.findOne
        .mockResolvedValueOnce(crearEquipo(juan, [juan]))
        .mockResolvedValueOnce(crearEquipo(juan, [juan, maria]));
      usuarioRepository.findOneBy.mockResolvedValue(maria);

      // Act
      const resultado = await service.addMiembro('equipo-1', 'user-2', 'user-1');

      // Assert
      expect(resultado).toHaveProperty('id', 'equipo-1');
      expect(resultado).toHaveProperty('nombre', 'Backend Team');
      expect(resultado).toHaveProperty('liderId', 'user-1');
      expect(idsDe(resultado)).toContain('user-1');
      expect(idsDe(resultado)).toContain('user-2');
      expect(resultado.miembros).toHaveLength(2);
    });

    // Escenario 2: Equipo no encontrado (404)
    it('debe retornar 404 si el equipo no existe', async () => {
      // Arrange
      equipoRepository.findOne.mockResolvedValue(null);

      // Act + Assert
      try {
        await service.addMiembro('equipo-no-existe', 'user-2', 'user-1');
        throw new Error('Debería haber lanzado una excepción');
      } catch (error: any) {
        expect(error instanceof NotFoundException).toBe(true);
        expect(error.message).toBe('Equipo no encontrado');
      }
    });

    // Escenario 3: Solicitante no es líder (403)
    it('debe retornar 403 si el solicitante no es el líder', async () => {
      // Arrange
      equipoRepository.findOne.mockResolvedValue(crearEquipo(juan, [juan, maria]));

      // Act + Assert
      try {
        await service.addMiembro('equipo-1', 'user-3', 'user-2');
        throw new Error('Debería haber lanzado una excepción');
      } catch (error: any) {
        expect(error instanceof ForbiddenException).toBe(true);
        expect(error.message).toBe('Solo el líder puede agregar miembros');
      }
    });

    // Escenario 4: Usuario ya es miembro (409 Conflict)
    it('debe retornar 409 si el usuario ya es miembro del equipo', async () => {
      // Arrange
      equipoRepository.findOne.mockResolvedValue(crearEquipo(juan, [juan, maria]));
      usuarioRepository.findOneBy.mockResolvedValue(maria);

      // Act + Assert
      try {
        await service.addMiembro('equipo-1', 'user-2', 'user-1');
        throw new Error('Debería haber lanzado una excepción');
      } catch (error: any) {
        expect(error instanceof ConflictException).toBe(true);
        expect(error.message).toBe('El usuario ya es miembro del equipo');
      }
    });

    // Escenario 5: Usuario a agregar no existe (404)
    it('debe retornar 404 si el usuario a agregar no existe', async () => {
      // Arrange
      equipoRepository.findOne.mockResolvedValue(crearEquipo(juan, [juan]));
      usuarioRepository.findOneBy.mockResolvedValue(null);

      // Act + Assert
      try {
        await service.addMiembro('equipo-1', 'user-404', 'user-1');
        throw new Error('Debería haber lanzado una excepción');
      } catch (error: any) {
        expect(error instanceof NotFoundException).toBe(true);
        expect(error.message).toBe('Usuario no encontrado');
      }
    });

    // Escenario 6: Validar que no se guarda si hay error
    it('no debe guardar cambios si el usuario no tiene permisos', async () => {
      // Arrange
      equipoRepository.findOne.mockResolvedValue(crearEquipo(juan, [juan]));

      // Act
      await expect(service.addMiembro('equipo-1', 'user-2', 'user-999')).rejects.toThrow(ForbiddenException);

      // Assert
      expect(equipoRepository.save).not.toHaveBeenCalled();
    });
  });

  // ========================
  // DELETE /equipos/:id/miembros/:userId - REMOVE MIEMBRO
  // ========================
  describe('Eliminar miembro de equipo (Caja Negra)', () => {
    // Escenario 1: Eliminar miembro exitosamente
    it('debe eliminar un miembro y retornar el equipo actualizado', async () => {
      // Arrange
      equipoRepository.findOne
        .mockResolvedValueOnce(crearEquipo(juan, [juan, maria, pedro]))
        .mockResolvedValueOnce(crearEquipo(juan, [juan, pedro]));

      // Act
      const resultado = await service.removeMiembro('equipo-1', 'user-2', 'user-1');

      // Assert
      expect(resultado).toHaveProperty('id', 'equipo-1');
      expect(idsDe(resultado)).toContain('user-1');
      expect(idsDe(resultado)).toContain('user-3');
      expect(idsDe(resultado)).not.toContain('user-2');
      expect(resultado.miembros).toHaveLength(2);
    });

    // Escenario 2: Equipo no encontrado (404)
    it('debe retornar 404 si el equipo no existe', async () => {
      // Arrange
      equipoRepository.findOne.mockResolvedValue(null);

      // Act + Assert
      try {
        await service.removeMiembro('equipo-no-existe', 'user-2', 'user-1');
        throw new Error('Debería haber lanzado una excepción');
      } catch (error: any) {
        expect(error instanceof NotFoundException).toBe(true);
        expect(error.message).toBe('Equipo no encontrado');
      }
    });

    // Escenario 3: Solicitante no es líder (403)
    it('debe retornar 403 si el solicitante no es el líder', async () => {
      // Arrange
      equipoRepository.findOne.mockResolvedValue(crearEquipo(juan, [juan, maria]));

      // Act + Assert
      try {
        await service.removeMiembro('equipo-1', 'user-2', 'user-2');
        throw new Error('Debería haber lanzado una excepción');
      } catch (error: any) {
        expect(error instanceof ForbiddenException).toBe(true);
        expect(error.message).toBe('Solo el líder puede eliminar miembros');
      }
    });

    // Escenario 4: Usuario no es miembro (no causa error)
    it('debe manejar silenciosamente si el usuario a eliminar no es miembro', async () => {
      // Arrange
      equipoRepository.findOne.mockResolvedValue(crearEquipo(juan, [juan, maria]));

      // Act
      const resultado = await service.removeMiembro('equipo-1', 'user-999', 'user-1');

      // Assert
      expect(equipoRepository.save).toHaveBeenCalledTimes(1);
      expect(idsDe(resultado)).toContain('user-1');
      expect(idsDe(resultado)).toContain('user-2');
    });

    // Escenario 5: Validar que no se guarda si hay error
    it('no debe guardar cambios si el usuario no tiene permisos', async () => {
      // Arrange
      equipoRepository.findOne.mockResolvedValue(crearEquipo(juan, [juan, maria]));

      // Act
      await expect(service.removeMiembro('equipo-1', 'user-2', 'user-999')).rejects.toThrow(ForbiddenException);

      // Assert
      expect(equipoRepository.save).not.toHaveBeenCalled();
    });
  });

  // ========================
  // GET /equipos/:id/miembros - GET MIEMBROS
  // ========================
  describe('Obtener miembros de equipo (Caja Negra)', () => {
    // Escenario 1: Obtener miembros exitosamente
    it('debe retornar lista de miembros y líder si el usuario tiene acceso', async () => {
      // Arrange
      equipoRepository.findOne.mockResolvedValue(crearEquipo(juan, [juan, maria]));

      // Act
      const resultado = await service.getMiembros('equipo-1', 'user-2');

      // Assert
      expect(resultado).toHaveProperty('lider');
      expect(resultado).toHaveProperty('miembros');
      expect(resultado.miembros).toHaveLength(2);
      expect(resultado.lider.nombre).toBe('Juan');
      expect(resultado.miembros.map((m) => m.email)).toEqual(['juan@example.com', 'maria@example.com']);
    });

    // Escenario 2: Equipo no encontrado (404)
    it('debe retornar 404 si el equipo no existe', async () => {
      // Arrange
      equipoRepository.findOne.mockResolvedValue(null);

      // Act + Assert
      try {
        await service.getMiembros('equipo-no-existe', 'user-1');
        throw new Error('Debería haber lanzado una excepción');
      } catch (error: any) {
        expect(error instanceof NotFoundException).toBe(true);
      }
    });

    // Escenario 3: Usuario no tiene acceso (403)
    it('debe retornar 403 si el usuario no es miembro del equipo', async () => {
      // Arrange
      equipoRepository.findOne.mockResolvedValue(crearEquipo(juan, [juan]));

      // Act + Assert
      try {
        await service.getMiembros('equipo-1', 'user-999');
        throw new Error('Debería haber lanzado una excepción');
      } catch (error: any) {
        expect(error instanceof ForbiddenException).toBe(true);
        expect(error.message).toBe('No tienes acceso a este equipo');
      }
    });
  });

  // ========================
  // GET /equipos/:id - DETALLE DE EQUIPO
  // ========================
  describe('Obtener detalle de equipo (Caja Negra)', () => {
    it('debe retornar el equipo si el usuario es miembro', async () => {
      // Arrange
      const equipo = crearEquipo(juan, [juan, maria]);
      equipoRepository.findOne.mockResolvedValue(equipo);

      // Act
      const resultado = await service.findById('equipo-1', 'user-2');

      // Assert
      expect(resultado).toBe(equipo);
    });

    it('debe retornar 403 si el usuario no pertenece al equipo', async () => {
      // Arrange
      equipoRepository.findOne.mockResolvedValue(crearEquipo(juan, [juan]));

      // Act + Assert
      await expect(service.findById('equipo-1', 'user-999')).rejects.toThrow(ForbiddenException);
    });
  });

  // ========================
  // Validaciones de entrada
  // ========================
  describe('Validaciones de entrada (Caja Negra)', () => {
    // IDs vacíos
    it('debe manejar IDs vacíos correctamente', async () => {
      // Arrange
      equipoRepository.findOne.mockResolvedValue(null);

      // Act + Assert
      await expect(service.addMiembro('', 'user-2', 'user-1')).rejects.toThrow(NotFoundException);
    });

    // IDs muy largos
    it('debe manejar IDs muy largos', async () => {
      // Arrange
      const largeId = 'a'.repeat(1000);
      equipoRepository.findOne.mockResolvedValue(null);

      // Act
      await expect(service.addMiembro(largeId, 'user-2', 'user-1')).rejects.toThrow(NotFoundException);

      // Assert
      expect(equipoRepository.findOne).toHaveBeenCalledWith({
        where: { id: largeId },
        relations: { lider: true, miembros: true },
      });
    });

    // Valores null
    it('debe manejar valores null en parámetros', async () => {
      // Arrange
      equipoRepository.findOne.mockResolvedValue(null);

      // Act + Assert
      await expect(service.addMiembro(null as any, 'user-2', 'user-1')).rejects.toThrow(NotFoundException);
      expect(equipoRepository.save).not.toHaveBeenCalled();
    });
  });
});
