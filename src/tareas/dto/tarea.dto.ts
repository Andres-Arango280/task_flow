import { IsArray, IsString, IsNotEmpty, IsOptional, IsUUID, MaxLength } from 'class-validator';

export class CreateTareaDto {
  @IsNotEmpty()
  @IsString()
  @MaxLength(255)
  titulo: string;

  @IsOptional()
  @IsString()
  @MaxLength(5000)
  descripcion?: string;

  @IsOptional()
  @IsUUID()
  proyectoId?: string;

  @IsOptional()
  @IsUUID()
  listaId?: string;

  @IsArray()
  @IsOptional()
  @IsUUID('all', { each: true })
  asignados?: string[];
}

export class MoverTareaDto {
  @IsUUID()
  nuevaListaId: string;
}

export class AsignarMiembrosDto {
  @IsArray()
  @IsUUID('all', { each: true })
  miembros: string[];
}

export class ActualizarTareaDto {
  @IsOptional()
  @IsNotEmpty()
  @IsString()
  @MaxLength(255)
  titulo?: string;

  @IsOptional()
  @IsString()
  @MaxLength(5000)
  descripcion?: string;
}
