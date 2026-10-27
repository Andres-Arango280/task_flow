import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  OneToMany,
} from 'typeorm';
import { Equipo } from '../../equipos/entities/equipo.entity';
import { Comentario } from '../../comentarios/entities/comentario.entity';

@Entity('usuarios')
export class Usuario {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 255 })
  nombre: string;

  @Column({ type: 'varchar', length: 255, unique: true })
  email: string;

  @Column({ type: 'varchar', length: 255, select: false })
  password: string;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @OneToMany(() => Equipo, (equipo) => equipo.lider)
  equiposLiderados: Equipo[];

  @OneToMany(() => Comentario, (comentario) => comentario.autor)
  comentarios: Comentario[];
}
