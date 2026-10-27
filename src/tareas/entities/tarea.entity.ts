import {
  Entity,
  Index,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  OneToMany,
  ManyToMany,
  JoinTable,
  CreateDateColumn,
  UpdateDateColumn,
  JoinColumn,
} from 'typeorm';
import { Lista } from '../../listas/entities/lista.entity';
import { Usuario } from '../../usuarios/entities/usuario.entity';
import { Comentario } from '../../comentarios/entities/comentario.entity';

@Entity('tareas')
export class Tarea {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 255 })
  titulo: string;

  @Column({ type: 'text', nullable: true })
  descripcion: string;

  @Column({ type: 'varchar', length: 50, default: 'pendiente' })
  estado: string;

  @Column({ type: 'varchar', length: 50, default: 'media' })
  prioridad: string;

  @ManyToOne(() => Lista, (lista) => lista.tareas, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'listaId' })
  lista: Lista;

  @Index()
  @Column({ type: 'uuid' })
  listaId: string;

  @ManyToMany(() => Usuario, { cascade: ['insert'] })
  @JoinTable({
    name: 'tarea_asignados',
    joinColumn: { name: 'tareaId', referencedColumnName: 'id' },
    inverseJoinColumn: { name: 'usuarioId', referencedColumnName: 'id' },
  })
  asignados: Usuario[];

  @OneToMany(() => Comentario, (comentario) => comentario.tarea)
  comentarios: Comentario[];

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
