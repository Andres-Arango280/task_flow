import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { EquiposService } from './equipos.service';

// Regresión de DELETE /equipos/:id (solo el líder; proyectos, listas y tareas en cascada)
describe('Regression - EquiposService - eliminar', () => {
  // AAA + fluent-style assertions (Jest equivalent for this TypeScript stack)
  let service: EquiposService;
  let equipoRepository: { findOne: jest.Mock; remove: jest.Mock };

  const crearEquipo = () => ({
    id: 'e1',
    nombre: 'Equipo',
    liderId: 'u-lider',
    lider: { id: 'u-lider' },
    miembros: [{ id: 'u-lider' }, { id: 'u-miembro' }],
  });

  beforeEach(() => {
    equipoRepository = { findOne: jest.fn(), remove: jest.fn().mockResolvedValue(undefined) };
    service = new EquiposService(equipoRepository as any, {} as any);
  });

  it('debe eliminar el equipo cuando lo solicita su líder', async () => {
    // Arrange
    const equipo = crearEquipo();
    equipoRepository.findOne.mockResolvedValue(equipo);

    // Act
    const resultado = await service.eliminar('e1', 'u-lider');

    // Assert
    expect(equipoRepository.remove).toHaveBeenCalledWith(equipo);
    expect(resultado).toEqual({ id: 'e1', eliminado: true });
  });

  it('debe lanzar ForbiddenException si un miembro que no es líder intenta eliminarlo', async () => {
    // Arrange
    equipoRepository.findOne.mockResolvedValue(crearEquipo());

    // Act + Assert
    await expect(service.eliminar('e1', 'u-miembro')).rejects.toThrow(ForbiddenException);
    expect(equipoRepository.remove).not.toHaveBeenCalled();
  });

  it('debe lanzar NotFoundException si el equipo no existe', async () => {
    // Arrange
    equipoRepository.findOne.mockResolvedValue(null);

    // Act + Assert
    await expect(service.eliminar('e404', 'u-lider')).rejects.toThrow(NotFoundException);
  });
});
