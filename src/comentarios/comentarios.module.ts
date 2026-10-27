import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Comentario } from './entities/comentario.entity';
import { ComentariosController } from './comentarios.controller';
import { ComentariosService } from './comentarios.service';

@Module({
  imports: [TypeOrmModule.forFeature([Comentario])],
  controllers: [ComentariosController],
  providers: [ComentariosService],
})
export class ComentariosModule {}
