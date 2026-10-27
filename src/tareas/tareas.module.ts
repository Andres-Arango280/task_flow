import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Tarea } from './entities/tarea.entity';
import { Lista } from '../listas/entities/lista.entity';
import { Proyecto } from '../proyectos/entities/proyecto.entity';
import { Usuario } from '../usuarios/entities/usuario.entity';
import { TareasController } from './tareas.controller';
import { TareasService } from './tareas.service';

@Module({
  imports: [TypeOrmModule.forFeature([Tarea, Lista, Proyecto, Usuario])],
  controllers: [TareasController],
  providers: [TareasService],
})
export class TareasModule {}
