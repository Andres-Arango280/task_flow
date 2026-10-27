import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { Equipo } from './entities/equipo.entity';
import { CreateEquipoDto } from './dto/equipo.dto';
import { Usuario } from '../usuarios/entities/usuario.entity';

export function usuarioPerteneceAEquipo(equipo: Equipo, userId: string): boolean {
  const esLider = equipo.liderId === userId;
  const esMiembro = (equipo.miembros ?? []).some((miembro) => miembro.id === userId);
  return esLider || esMiembro;
}

@Injectable()
export class EquiposService {
  constructor(
    @InjectRepository(Equipo)
    private equipoRepository: Repository<Equipo>,
    @InjectRepository(Usuario)
    private usuarioRepository: Repository<Usuario>,
  ) {}

  private async getEquipoOrThrow(equipoId: string) {
    const equipo = await this.equipoRepository.findOne({
      where: { id: equipoId },
      relations: { lider: true, miembros: true },
    });

    if (!equipo) {
      throw new NotFoundException('Equipo no encontrado');
    }

    return equipo;
  }

  private assertUsuarioTieneAcceso(equipo: Equipo, userId: string) {
    if (!usuarioPerteneceAEquipo(equipo, userId)) {
      throw new ForbiddenException('No tienes acceso a este equipo');
    }
  }

  private assertRequesterEsLider(equipo: Equipo, requesterId: string, accion: 'agregar' | 'eliminar') {
    if (equipo.liderId !== requesterId) {
      throw new ForbiddenException(
        accion === 'agregar'
          ? 'Solo el líder puede agregar miembros'
          : 'Solo el líder puede eliminar miembros',
      );
    }
  }

  // Obtener todos los equipos donde el usuario es líder o miembro
  async findByUser(userId: string) {
    // Primero se buscan los ids: si se filtra por miembros y se carga la relación
    // en la misma consulta, TypeORM solo devolvería el miembro filtrado.
    const filas = await this.equipoRepository
      .createQueryBuilder('equipo')
      .leftJoin('equipo.miembros', 'miembro')
      .where('equipo.liderId = :userId', { userId })
      .orWhere('miembro.id = :userId', { userId })
      .select('equipo.id', 'id')
      .distinct(true)
      .getRawMany<{ id: string }>();

    if (filas.length === 0) {
      return [];
    }

    return this.equipoRepository.find({
      where: { id: In(filas.map((fila) => fila.id)) },
      relations: { lider: true, miembros: true },
      order: { createdAt: 'ASC' },
    });
  }

  // Obtener detalles de un equipo específico
  async findById(equipoId: string, userId: string) {
    const equipo = await this.getEquipoOrThrow(equipoId);
    this.assertUsuarioTieneAcceso(equipo, userId);
    return equipo;
  }

  // Obtener miembros de un equipo
  async getMiembros(equipoId: string, userId: string) {
    const equipo = await this.getEquipoOrThrow(equipoId);
    this.assertUsuarioTieneAcceso(equipo, userId);

    return {
      lider: equipo.lider,
      miembros: equipo.miembros,
    };
  }

  async create(dto: CreateEquipoDto, userId: string) {
    const nuevoEquipo = this.equipoRepository.create({
      nombre: dto.nombre,
      liderId: userId,
      miembros: [{ id: userId } as Usuario],
    });
    const guardado = await this.equipoRepository.save(nuevoEquipo);
    return this.getEquipoOrThrow(guardado.id);
  }

  async addMiembro(equipoId: string, userId: string, requesterId: string) {
    const equipo = await this.getEquipoOrThrow(equipoId);
    this.assertRequesterEsLider(equipo, requesterId, 'agregar');

    const usuario = await this.usuarioRepository.findOneBy({ id: userId });
    if (!usuario) {
      throw new NotFoundException('Usuario no encontrado');
    }

    const yaEsMiembro = equipo.miembros.some((m) => m.id === userId);
    if (yaEsMiembro) {
      throw new ConflictException('El usuario ya es miembro del equipo');
    }

    equipo.miembros.push(usuario);
    await this.equipoRepository.save(equipo);
    return this.getEquipoOrThrow(equipoId);
  }

  async removeMiembro(equipoId: string, userId: string, requesterId: string) {
    const equipo = await this.getEquipoOrThrow(equipoId);
    this.assertRequesterEsLider(equipo, requesterId, 'eliminar');

    if (userId === equipo.liderId) {
      throw new BadRequestException('El líder no puede eliminarse del equipo');
    }

    equipo.miembros = equipo.miembros.filter((m) => m.id !== userId);
    await this.equipoRepository.save(equipo);
    return this.getEquipoOrThrow(equipoId);
  }

  async eliminar(equipoId: string, requesterId: string) {
    const equipo = await this.getEquipoOrThrow(equipoId);
    if (equipo.liderId !== requesterId) {
      throw new ForbiddenException('Solo el líder puede eliminar el equipo');
    }

    // Los proyectos, listas y tareas se eliminan en cascada
    await this.equipoRepository.remove(equipo);
    return { id: equipoId, eliminado: true };
  }
}
