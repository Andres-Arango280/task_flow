import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { Tarea } from './entities/tarea.entity';
import { Lista } from '../listas/entities/lista.entity';
import { Proyecto } from '../proyectos/entities/proyecto.entity';
import { Usuario } from '../usuarios/entities/usuario.entity';
import { usuarioPerteneceAEquipo } from '../equipos/equipos.service';
import { ActualizarTareaDto, CreateTareaDto } from './dto/tarea.dto';

@Injectable()
export class TareasService {
  constructor(
    @InjectRepository(Tarea) private tareaRepository: Repository<Tarea>,
    @InjectRepository(Lista) private listaRepository: Repository<Lista>,
    @InjectRepository(Proyecto) private proyectoRepository: Repository<Proyecto>,
    @InjectRepository(Usuario) private usuarioRepository: Repository<Usuario>,
  ) {}

  private async getProyectoConAcceso(proyectoId: string, userId: string, mensaje: string) {
    const proyecto = await this.proyectoRepository.findOne({
      where: { id: proyectoId },
      relations: { equipo: { miembros: true } },
    });
    if (!proyecto) {
      throw new NotFoundException('Proyecto no encontrado');
    }

    if (!usuarioPerteneceAEquipo(proyecto.equipo, userId)) {
      throw new ForbiddenException(mensaje);
    }

    return proyecto;
  }

  private async getListaOrThrow(listaId: string, mensaje = 'Lista no encontrada') {
    const lista = await this.listaRepository.findOneBy({ id: listaId });
    if (!lista) {
      throw new NotFoundException(mensaje);
    }
    return lista;
  }

  private async getTareaOrThrow(tareaId: string) {
    const tarea = await this.tareaRepository.findOne({
      where: { id: tareaId },
      relations: { asignados: true, lista: true },
    });
    if (!tarea) {
      throw new NotFoundException('Tarea no encontrada');
    }
    return tarea;
  }

  // Los asignados deben ser miembros (o el líder) del equipo del proyecto
  private async getAsignadosValidos(ids: string[], proyecto: Proyecto) {
    const unicos = [...new Set(ids)];
    const fueraDelEquipo = unicos.filter((id) => !usuarioPerteneceAEquipo(proyecto.equipo, id));
    if (fueraDelEquipo.length > 0) {
      throw new BadRequestException('Solo se pueden asignar miembros del equipo');
    }
    return unicos.length > 0 ? this.usuarioRepository.findBy({ id: In(unicos) }) : [];
  }

  // Obtener todas las tareas de un proyecto
  async findByProyecto(proyectoId: string, userId: string) {
    await this.getProyectoConAcceso(proyectoId, userId, 'No tienes acceso a este proyecto');

    return this.tareaRepository.find({
      where: { lista: { proyectoId } },
      relations: { lista: true, asignados: true },
      order: { createdAt: 'ASC' },
    });
  }

  async create(dto: CreateTareaDto, userId: string) {
    let lista: Lista | null;
    if (dto.listaId) {
      lista = await this.getListaOrThrow(dto.listaId);
    } else if (dto.proyectoId) {
      lista = await this.listaRepository.findOne({
        where: { proyectoId: dto.proyectoId },
        order: { orden: 'ASC', createdAt: 'ASC' },
      });
      if (!lista) {
        throw new NotFoundException('No hay listas creadas para este proyecto');
      }
    } else {
      throw new BadRequestException('Debes enviar proyectoId o listaId');
    }

    const proyecto = await this.getProyectoConAcceso(
      lista.proyectoId,
      userId,
      'No tienes acceso a este proyecto',
    );

    if (dto.proyectoId && dto.proyectoId !== lista.proyectoId) {
      throw new BadRequestException('La lista no pertenece al proyecto indicado');
    }
    const asignados = await this.getAsignadosValidos(dto.asignados ?? [], proyecto);

    const tarea = this.tareaRepository.create({
      titulo: dto.titulo,
      descripcion: dto.descripcion,
      listaId: lista.id,
      asignados,
    });
    const guardada = await this.tareaRepository.save(tarea);
    return this.getTareaOrThrow(guardada.id);
  }

  async moverTarea(tareaId: string, nuevaListaId: string, userId: string) {
    const tarea = await this.getTareaOrThrow(tareaId);
    const listaDestino = await this.getListaOrThrow(nuevaListaId, 'Lista destino no encontrada');

    if (listaDestino.proyectoId !== tarea.lista.proyectoId) {
      throw new BadRequestException('No se puede mover una tarea a otro proyecto');
    }

    await this.getProyectoConAcceso(listaDestino.proyectoId, userId, 'No tienes acceso a esta tarea');

    await this.tareaRepository.update(tarea.id, { listaId: listaDestino.id });
    return this.getTareaOrThrow(tarea.id);
  }

  async asignarMiembros(tareaId: string, miembros: string[], userId: string) {
    const tarea = await this.getTareaOrThrow(tareaId);
    const proyecto = await this.getProyectoConAcceso(
      tarea.lista.proyectoId,
      userId,
      'No tienes acceso a esta tarea',
    );

    tarea.asignados = await this.getAsignadosValidos(miembros, proyecto);
    await this.tareaRepository.save(tarea);
    return this.getTareaOrThrow(tarea.id);
  }

  async actualizar(tareaId: string, dto: ActualizarTareaDto, userId: string) {
    const tarea = await this.getTareaOrThrow(tareaId);
    await this.getProyectoConAcceso(tarea.lista.proyectoId, userId, 'No tienes acceso a esta tarea');

    const cambios: Partial<Tarea> = {};
    if (dto.titulo !== undefined) {
      cambios.titulo = dto.titulo.trim();
    }
    if (dto.descripcion !== undefined) {
      cambios.descripcion = dto.descripcion;
    }
    if (Object.keys(cambios).length > 0) {
      await this.tareaRepository.update(tarea.id, cambios);
    }
    return this.getTareaOrThrow(tarea.id);
  }

  async eliminar(tareaId: string, userId: string) {
    const tarea = await this.getTareaOrThrow(tareaId);
    await this.getProyectoConAcceso(tarea.lista.proyectoId, userId, 'No tienes acceso a esta tarea');

    await this.tareaRepository.remove(tarea);
    return { id: tareaId, eliminado: true };
  }
}
