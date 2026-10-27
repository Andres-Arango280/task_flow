import {
  Entity,
  Index,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  CreateDateColumn,
  UpdateDateColumn,
  JoinColumn,
} from 'typeorm';
import { Usuario } from '../../usuarios/entities/usuario.entity';
import { Tarea } from '../../tareas/entities/tarea.entity';

@Entity('comentarios')
export class Comentario {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'text' })
  contenido: string;

  @ManyToOne(() => Usuario, (usuario) => usuario.comentarios, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'autorId' })
  autor: Usuario;

  @Column({ type: 'uuid' })
  autorId: string;

  @ManyToOne(() => Tarea, (tarea) => tarea.comentarios, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'tareaId' })
  tarea: Tarea;

  @Index()
  @Column({ type: 'uuid' })
  tareaId: string;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
