import { IsNotEmpty, IsString, MaxLength } from 'class-validator';

export class ActualizarPerfilDto {
  @IsNotEmpty()
  @IsString()
  @MaxLength(255)
  nombre: string;
}
