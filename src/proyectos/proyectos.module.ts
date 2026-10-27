import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ProyectosController } from './proyectos.controller';
import { ProyectosService } from './proyectos.service';
import { Proyecto } from './entities/proyecto.entity';
import { Lista } from '../listas/entities/lista.entity';
import { Equipo } from '../equipos/entities/equipo.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Proyecto, Lista, Equipo])],
  controllers: [ProyectosController],
  providers: [ProyectosService],
  exports: [ProyectosService],
})
export class ProyectosModule {}