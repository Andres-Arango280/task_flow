import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Lista } from './entities/lista.entity';
import { Proyecto } from '../proyectos/entities/proyecto.entity';
import { ListasController } from './listas.controller';
import { ListasService } from './listas.service';

@Module({
  imports: [TypeOrmModule.forFeature([Lista, Proyecto])],
  controllers: [ListasController],
  providers: [ListasService],
  exports: [ListasService],
})
export class ListasModule {}
