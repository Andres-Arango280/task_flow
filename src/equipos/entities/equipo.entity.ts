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
import { Usuario } from '../../usuarios/entities/usuario.entity';
import { Proyecto } from '../../proyectos/entities/proyecto.entity';

@Entity('equipos')
export class Equipo {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 255 })
  nombre: string;

  @ManyToOne(() => Usuario, (usuario) => usuario.equiposLiderados, {
    onDelete: 'SET NULL',
  })
  @JoinColumn({ name: 'liderId' })
  lider: Usuario;

  @Index()
  @Column({ type: 'uuid', nullable: true })
  liderId: string;

  @ManyToMany(() => Usuario, { cascade: ['insert'] })
  @JoinTable({
    name: 'equipo_miembros',
    joinColumn: { name: 'equipoId', referencedColumnName: 'id' },
    inverseJoinColumn: { name: 'usuarioId', referencedColumnName: 'id' },
  })
  miembros: Usuario[];

  @OneToMany(() => Proyecto, (proyecto) => proyecto.equipo)
  proyectos: Proyecto[];

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
