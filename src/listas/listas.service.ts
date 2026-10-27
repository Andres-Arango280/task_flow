import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Lista } from './entities/lista.entity';
import { Proyecto } from '../proyectos/entities/proyecto.entity';
import { usuarioPerteneceAEquipo } from '../equipos/equipos.service';

@Injectable()
export class ListasService {
  constructor(
    @InjectRepository(Lista) private readonly listaRepository: Repository<Lista>,
    @InjectRepository(Proyecto) private readonly proyectoRepository: Repository<Proyecto>,
  ) {}

  async obtenerListasPorProyecto(proyectoId: string, userId: string): Promise<Lista[]> {
    const proyecto = await this.proyectoRepository.findOne({
      where: { id: proyectoId },
      relations: { equipo: { miembros: true } },
    });

    if (!proyecto) {
      throw new NotFoundException('Proyecto no encontrado');
    }

    if (!usuarioPerteneceAEquipo(proyecto.equipo, userId)) {
      throw new ForbiddenException('No tienes acceso a este proyecto');
    }

    return this.listaRepository.find({
      where: { proyectoId },
      order: { orden: 'ASC', createdAt: 'ASC' },
    });
  }
}
