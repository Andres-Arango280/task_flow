import { IsNotEmpty, IsString, IsUUID, MaxLength } from 'class-validator';

export class CreateProyectoDto {
  @IsNotEmpty()
  @IsString()
  @MaxLength(255)
  nombre: string;

  @IsUUID()
  equipoId: string;
}
