import { BadRequestException, ForbiddenException, NotFoundException } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { EquiposService } from './equipos.service';
import { Equipo } from './entities/equipo.entity';
import { Usuario } from '../usuarios/entities/usuario.entity';

// Principios FIRST aplicados:
// - Fast: no hay acceso externo ni persistencia real.
// - Isolated: cada caso trabaja con un equipo independiente.
// - Repeatable: no depende del orden de ejecución.
// - Self-validating: cada prueba tiene expectativas directas.
// - Timely: cubre las reglas de negocio esenciales del servicio.
//
// Tipo de mock:
// - Stub: equipoRepository.findOne devuelve un equipo o null.
// - Fake: save simula la persistencia en memoria.
// - Spy: valida que save fue llamado y cuántas veces.

const usuario = (id: string): Usuario =>
  ({ id, nombre: `Nombre ${id}`, email: `${id}@example.com` }) as Usuario;

const crearEquipo = (liderId: string, miembrosIds: string[]): Equipo =>
  ({
    id: 'equipo-1',
    nombre: 'Backend Team',
    liderId,
    lider: usuario(liderId),
    miembros: miembrosIds.map((m) => usuario(m)),
  }) as Equipo;

const idsDe = (equipo: Equipo) => equipo.miembros.map((m) => m.id);

describe('Regression - EquiposService - removeMiembro', () => {
  // AAA + fluent-style assertions (Jest equivalent for this TypeScript stack)
  let service: EquiposService;
  let equipoRepositoryMock: { findOne: jest.Mock; save: jest.Mock };
  let usuarioRepositoryMock: { findOneBy: jest.Mock };

  beforeEach(async () => {
    equipoRepositoryMock = {
      findOne: jest.fn(),
      save: jest.fn().mockImplementation(async (e: Equipo) => e),
    };
    usuarioRepositoryMock = {
      findOneBy: jest.fn(),
    };

    const moduleRef = await Test.createTestingModule({
      providers: [
        EquiposService,
        { provide: getRepositoryToken(Equipo), useValue: equipoRepositoryMock },
        { provide: getRepositoryToken(Usuario), useValue: usuarioRepositoryMock },
      ],
    }).compile();

    service = moduleRef.get(EquiposService);
  });

  it('debe eliminar un miembro cuando el solicitante es el líder del equipo', async () => {
    // Arrange
    const equipo = crearEquipo('user-1', ['user-1', 'user-2', 'user-3']);
    const recargado = crearEquipo('user-1', ['user-1', 'user-3']);
    equipoRepositoryMock.findOne.mockResolvedValueOnce(equipo).mockResolvedValueOnce(recargado);

    // Act
    const resultado = await service.removeMiembro('equipo-1', 'user-2', 'user-1');

    // Assert
    expect(equipoRepositoryMock.findOne).toHaveBeenCalledWith({
      where: { id: 'equipo-1' },
      relations: { lider: true, miembros: true },
    });
    expect(idsDe(equipo)).toEqual(['user-1', 'user-3']);
    expect(equipoRepositoryMock.save).toHaveBeenCalledTimes(1);
    expect(equipoRepositoryMock.save).toHaveBeenCalledWith(equipo);
    expect(resultado).toBe(recargado);
  });

  it('debe lanzar NotFoundException cuando el equipo no existe', async () => {
    // Arrange
    equipoRepositoryMock.findOne.mockResolvedValue(null);

    // Act + Assert
    await expect(service.removeMiembro('equipo-404', 'user-2', 'user-1')).rejects.toThrow(NotFoundException);
    await expect(service.removeMiembro('equipo-404', 'user-2', 'user-1')).rejects.toThrow('Equipo no encontrado');
    expect(equipoRepositoryMock.save).not.toHaveBeenCalled();
  });

  it('debe lanzar ForbiddenException cuando el solicitante no es el líder del equipo', async () => {
    // Arrange
    const equipo = crearEquipo('user-1', ['user-1', 'user-2']);
    equipoRepositoryMock.findOne.mockResolvedValue(equipo);

    // Act + Assert
    await expect(service.removeMiembro('equipo-1', 'user-2', 'user-3')).rejects.toThrow(ForbiddenException);
    await expect(service.removeMiembro('equipo-1', 'user-2', 'user-3')).rejects.toThrow('Solo el líder puede eliminar miembros');
    expect(idsDe(equipo)).toEqual(['user-1', 'user-2']);
    expect(equipoRepositoryMock.save).not.toHaveBeenCalled();
  });

  it('debe lanzar BadRequestException cuando el líder intenta eliminarse a sí mismo', async () => {
    // Arrange
    const equipo = crearEquipo('user-1', ['user-1', 'user-2']);
    equipoRepositoryMock.findOne.mockResolvedValue(equipo);

    // Act + Assert
    await expect(service.removeMiembro('equipo-1', 'user-1', 'user-1')).rejects.toThrow(BadRequestException);
    expect(idsDe(equipo)).toEqual(['user-1', 'user-2']);
    expect(equipoRepositoryMock.save).not.toHaveBeenCalled();
  });

  it('debe manejar la eliminación de un usuario que no es miembro sin corromper el estado del equipo', async () => {
    // Arrange
    const equipo = crearEquipo('user-1', ['user-1', 'user-2']);
    equipoRepositoryMock.findOne.mockResolvedValue(equipo);

    // Act
    const resultado = await service.removeMiembro('equipo-1', 'user-999', 'user-1');

    // Assert
    expect(equipoRepositoryMock.save).toHaveBeenCalledTimes(1);
    expect(idsDe(resultado)).toEqual(['user-1', 'user-2']);
  });

  it('debe permitir múltiples eliminaciones consecutivas de miembros en el mismo equipo', async () => {
    // Arrange
    const equipo = crearEquipo('user-1', ['user-1', 'user-2', 'user-3', 'user-4']);
    equipoRepositoryMock.findOne.mockResolvedValue(equipo);

    // Act
    await service.removeMiembro('equipo-1', 'user-2', 'user-1');
    const resultado = await service.removeMiembro('equipo-1', 'user-3', 'user-1');

    // Assert
    expect(equipoRepositoryMock.save).toHaveBeenCalledTimes(2);
    expect(idsDe(resultado)).toEqual(['user-1', 'user-4']);
  });
});
