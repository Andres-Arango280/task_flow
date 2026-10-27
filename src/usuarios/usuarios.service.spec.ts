import { ConflictException, NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { UsuariosService } from './usuarios.service';
import { Usuario } from './entities/usuario.entity';
import { Equipo } from '../equipos/entities/equipo.entity';

describe('Regression - UsuariosService', () => {
  // AAA + fluent-style assertions (Jest equivalent for this TypeScript stack)
  let service: UsuariosService;
  let usuarioRepositoryMock: {
    create: jest.Mock;
    save: jest.Mock;
    findOneBy: jest.Mock;
    createQueryBuilder: jest.Mock;
    update: jest.Mock;
    remove: jest.Mock;
  };
  let equipoRepositoryMock: { count: jest.Mock };
  let queryBuilderMock: {
    addSelect: jest.Mock;
    where: jest.Mock;
    getOne: jest.Mock;
  };

  beforeEach(async () => {
    // Query builder encadenable (Stub)
    queryBuilderMock = {
      addSelect: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      getOne: jest.fn(),
    };

    usuarioRepositoryMock = {
      create: jest.fn(),
      save: jest.fn(),
      findOneBy: jest.fn(),
      createQueryBuilder: jest.fn().mockReturnValue(queryBuilderMock),
      update: jest.fn(),
      remove: jest.fn(),
    };
    equipoRepositoryMock = { count: jest.fn() };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UsuariosService,
        { provide: getRepositoryToken(Usuario), useValue: usuarioRepositoryMock },
        { provide: getRepositoryToken(Equipo), useValue: equipoRepositoryMock },
      ],
    }).compile();

    service = module.get<UsuariosService>(UsuariosService);
  });

  it('debe crear y devolver un usuario con el payload guardado', async () => {
    // Arrange
    const dto = { nombre: 'A', email: 'a@a.com', password: 'x' };
    const entidad = { ...dto };
    const usuarioGuardado = { id: 'u1', nombre: 'A', email: 'a@a.com' };
    usuarioRepositoryMock.create.mockReturnValue(entidad);
    usuarioRepositoryMock.save.mockResolvedValue(usuarioGuardado);

    // Act
    const res = await service.create(dto);

    // Assert
    expect(usuarioRepositoryMock.create).toHaveBeenCalledWith(dto);
    expect(usuarioRepositoryMock.save).toHaveBeenCalledWith(entidad);
    expect(res).toEqual(usuarioGuardado);
  });

  it('debe devolver un usuario por id cuando existe', async () => {
    // Arrange
    const usuario = { id: 'u1', nombre: 'A', email: 'a@a.com' };
    usuarioRepositoryMock.findOneBy.mockResolvedValue(usuario);

    // Act
    const res = await service.findById('u1');

    // Assert
    expect(usuarioRepositoryMock.findOneBy).toHaveBeenCalledWith({ id: 'u1' });
    expect(res).toEqual(usuario);
  });

  it('debe lanzar NotFoundException al buscar un usuario por id cuando no existe', async () => {
    // Arrange
    usuarioRepositoryMock.findOneBy.mockResolvedValue(null);

    // Act + Assert
    await expect(service.findById('no-existe')).rejects.toThrow(NotFoundException);
    expect(usuarioRepositoryMock.findOneBy).toHaveBeenCalledWith({ id: 'no-existe' });
  });

  it('debe devolver un usuario por email sin exponer el campo contraseña', async () => {
    // Arrange
    const usuario = { id: 'u2', nombre: 'B', email: 'b@b.com' };
    queryBuilderMock.getOne.mockResolvedValue(usuario);

    // Act
    const res = await service.findByEmail('b@b.com');

    // Assert
    expect(usuarioRepositoryMock.createQueryBuilder).toHaveBeenCalledWith('usuario');
    expect(queryBuilderMock.addSelect).not.toHaveBeenCalled();
    expect(queryBuilderMock.where).toHaveBeenCalledWith(
      'LOWER(usuario.email) = LOWER(:email)',
      { email: 'b@b.com' },
    );
    expect(res).toEqual(usuario);
    expect(res).not.toHaveProperty('password');
  });

  it('debe lanzar NotFoundException al buscar por email cuando no existe', async () => {
    // Arrange
    queryBuilderMock.getOne.mockResolvedValue(null);

    // Act + Assert
    await expect(service.findByEmail('nadie@x.com')).rejects.toThrow(NotFoundException);
  });

  it('debe incluir la contraseña al buscar por email en crudo (solo autenticación)', async () => {
    // Arrange
    const usuario = { id: 'u3', nombre: 'C', email: 'c@c.com', password: 'hash' };
    queryBuilderMock.getOne.mockResolvedValue(usuario);

    // Act
    const res = await service.findByEmailRaw('C@C.com');

    // Assert
    expect(queryBuilderMock.addSelect).toHaveBeenCalledWith('usuario.password');
    expect(queryBuilderMock.where).toHaveBeenCalledWith(
      'LOWER(usuario.email) = LOWER(:email)',
      { email: 'C@C.com' },
    );
    expect(res).toEqual(usuario);
  });

  it('debe devolver null (sin lanzar) al buscar por email en crudo cuando no existe', async () => {
    // Arrange
    queryBuilderMock.getOne.mockResolvedValue(null);

    // Act
    const res = await service.findByEmailRaw('nadie@x.com');

    // Assert
    expect(res).toBeNull();
  });

  it('debe actualizar el nombre del perfil sin espacios sobrantes', async () => {
    // Arrange
    usuarioRepositoryMock.findOneBy
      .mockResolvedValueOnce({ id: 'u1', nombre: 'A', email: 'a@a.com' })
      .mockResolvedValueOnce({ id: 'u1', nombre: 'Ana', email: 'a@a.com' });

    // Act
    const res = await service.actualizarPerfil('u1', '  Ana  ');

    // Assert
    expect(usuarioRepositoryMock.update).toHaveBeenCalledWith('u1', { nombre: 'Ana' });
    expect(res.nombre).toBe('Ana');
  });

  it('debe impedir eliminar la cuenta si el usuario lidera equipos', async () => {
    // Arrange
    usuarioRepositoryMock.findOneBy.mockResolvedValue({ id: 'u1' });
    equipoRepositoryMock.count.mockResolvedValue(2);

    // Act + Assert
    await expect(service.eliminarCuenta('u1')).rejects.toThrow(ConflictException);
    expect(usuarioRepositoryMock.remove).not.toHaveBeenCalled();
  });

  it('debe eliminar la cuenta cuando el usuario no lidera equipos', async () => {
    // Arrange
    const usuario = { id: 'u1' };
    usuarioRepositoryMock.findOneBy.mockResolvedValue(usuario);
    equipoRepositoryMock.count.mockResolvedValue(0);

    // Act
    const res = await service.eliminarCuenta('u1');

    // Assert
    expect(usuarioRepositoryMock.remove).toHaveBeenCalledWith(usuario);
    expect(res).toEqual({ id: 'u1', eliminado: true });
  });
});
