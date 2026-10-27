import {
  Entity,
  Index,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  OneToMany,
  CreateDateColumn,
  UpdateDateColumn,
  JoinColumn,
} from 'typeorm';
import { Proyecto } from '../../proyectos/entities/proyecto.entity';
import { Tarea } from '../../tareas/entities/tarea.entity';

@Entity('listas')
export class Lista {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 255 })
  nombre: string;

  @Column({ type: 'int', default: 0 })
  orden: number;

  @ManyToOne(() => Proyecto, (proyecto) => proyecto.listas, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'proyectoId' })
  proyecto: Proyecto;

  @Index()
  @Column({ type: 'uuid' })
  proyectoId: string;

  @OneToMany(() => Tarea, (tarea) => tarea.lista)
  tareas: Tarea[];

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
