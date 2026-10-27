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
import { Equipo } from '../../equipos/entities/equipo.entity';
import { Lista } from '../../listas/entities/lista.entity';

@Entity('proyectos')
export class Proyecto {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 255 })
  nombre: string;

  @ManyToOne(() => Equipo, (equipo) => equipo.proyectos, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'equipoId' })
  equipo: Equipo;

  @Index()
  @Column({ type: 'uuid' })
  equipoId: string;

  @OneToMany(() => Lista, (lista) => lista.proyecto)
  listas: Lista[];

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
