import { IsNotEmpty, IsUUID } from 'class-validator';

export class CreateListaDto {
  @IsNotEmpty()
  nombre: string;

  @IsUUID()
  proyectoId: string;
}