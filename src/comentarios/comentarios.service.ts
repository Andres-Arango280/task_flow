import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Comentario } from './entities/comentario.entity';

@Injectable()
export class ComentariosService {
  constructor(
    @InjectRepository(Comentario)
    private comentarioRepository: Repository<Comentario>,
  ) {}
}