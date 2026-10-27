import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { UsuariosController } from './usuarios.controller';
import { UsuariosService } from './usuarios.service';
import { Usuario } from './entities/usuario.entity';
import { Equipo } from '../equipos/entities/equipo.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Usuario, Equipo])],
  controllers: [UsuariosController],
  providers: [UsuariosService],
  exports: [UsuariosService],
})
export class UsuariosModule {}