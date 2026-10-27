import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Proyecto } from './entities/proyecto.entity';
import { Lista } from '../listas/entities/lista.entity';
import { Equipo } from '../equipos/entities/equipo.entity';
import { usuarioPerteneceAEquipo } from '../equipos/equipos.service';
import { CreateProyectoDto } from './dto/proyecto.dto';

export const LISTAS_POR_DEFECTO = ['Por Hacer', 'En Progreso', 'Hecho'];

@Injectable()
export class ProyectosService {
  constructor(
    @InjectRepository(Proyecto)
    private proyectoRepository: Repository<Proyecto>,
    @InjectRepository(Lista)
    private listaRepository: Repository<Lista>,
    @InjectRepository(Equipo)
    private equipoRepository: Repository<Equipo>,
  ) {}

  private async getEquipoConAcceso(equipoId: string, userId: string) {
    const equipo = await this.equipoRepository.findOne({
      where: { id: equipoId },
      relations: { miembros: true },
    });

    if (!equipo) {
      throw new NotFoundException('Equipo no encontrado');
    }

    if (!usuarioPerteneceAEquipo(equipo, userId)) {
      throw new ForbiddenException('No tienes acceso a este equipo');
    }

    return equipo;
  }

  // Obtener proyectos de un equipo
  async findByEquipo(equipoId: string, userId: string) {
    await this.getEquipoConAcceso(equipoId, userId);

    return this.proyectoRepository.find({
      where: { equipoId },
      order: { createdAt: 'ASC' },
    });
  }

  async findById(proyectoId: string, userId: string) {
    const proyecto = await this.proyectoRepository.findOne({
      where: { id: proyectoId },
      relations: { equipo: { lider: true, miembros: true } },
    });

    if (!proyecto) {
      throw new NotFoundException('Proyecto no encontrado');
    }

    if (!usuarioPerteneceAEquipo(proyecto.equipo, userId)) {
      throw new ForbiddenException('No tienes acceso a este proyecto');
    }

    return proyecto;
  }

  async crearProyecto(dto: CreateProyectoDto, userId: string) {
    await this.getEquipoConAcceso(dto.equipoId, userId);

    const nuevoProyecto = this.proyectoRepository.create({
      nombre: dto.nombre,
      equipoId: dto.equipoId,
    });
    const proyectoGuardado = await this.proyectoRepository.save(nuevoProyecto);

    const listasDefault = LISTAS_POR_DEFECTO.map((nombre, orden) =>
      this.listaRepository.create({ nombre, orden, proyectoId: proyectoGuardado.id }),
    );
    await this.listaRepository.save(listasDefault);

    return proyectoGuardado;
  }

  async eliminar(proyectoId: string, userId: string) {
    const proyecto = await this.proyectoRepository.findOne({
      where: { id: proyectoId },
      relations: { equipo: true },
    });
    if (!proyecto) {
      throw new NotFoundException('Proyecto no encontrado');
    }
    if (proyecto.equipo.liderId !== userId) {
      throw new ForbiddenException('Solo el líder del equipo puede eliminar proyectos');
    }

    // Las listas y tareas se eliminan en cascada
    await this.proyectoRepository.remove(proyecto);
    return { id: proyectoId, eliminado: true };
  }
}
