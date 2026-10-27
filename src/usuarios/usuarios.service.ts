import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Usuario } from './entities/usuario.entity';
import { Equipo } from '../equipos/entities/equipo.entity';

@Injectable()
export class UsuariosService {
  constructor(
    @InjectRepository(Usuario)
    private usuarioRepository: Repository<Usuario>,
    @InjectRepository(Equipo)
    private equipoRepository: Repository<Equipo>,
  ) {}

  async create(dto: Partial<Usuario>) {
    const usuario = this.usuarioRepository.create(dto);
    return this.usuarioRepository.save(usuario);
  }

  async findById(id: string) {
    const usuario = await this.usuarioRepository.findOneBy({ id });
    if (!usuario) {
      throw new NotFoundException('Usuario no encontrado');
    }
    return usuario;
  }

  // Incluye el password (columna con select: false); solo para autenticación
  async findByEmailRaw(email: string) {
    return this.usuarioRepository
      .createQueryBuilder('usuario')
      .addSelect('usuario.password')
      .where('LOWER(usuario.email) = LOWER(:email)', { email })
      .getOne();
  }

  async findByEmail(email: string) {
    const usuario = await this.usuarioRepository
      .createQueryBuilder('usuario')
      .where('LOWER(usuario.email) = LOWER(:email)', { email })
      .getOne();
    if (!usuario) {
      throw new NotFoundException('Usuario no encontrado');
    }
    return usuario;
  }

  async actualizarPerfil(id: string, nombre: string) {
    await this.findById(id);
    await this.usuarioRepository.update(id, { nombre: nombre.trim() });
    return this.findById(id);
  }

  async eliminarCuenta(id: string) {
    const usuario = await this.findById(id);
    const equiposLiderados = await this.equipoRepository.count({ where: { liderId: id } });
    if (equiposLiderados > 0) {
      throw new ConflictException(
        `Eres líder de ${equiposLiderados} equipo(s). Elimínalos antes de borrar tu cuenta.`,
      );
    }

    // Se elimina también su pertenencia a equipos y sus asignaciones de tareas
    await this.usuarioRepository.remove(usuario);
    return { id, eliminado: true };
  }
}
