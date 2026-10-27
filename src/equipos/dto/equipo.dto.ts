import { IsNotEmpty, IsOptional, IsString, IsUUID, MaxLength } from 'class-validator';

export class CreateEquipoDto {
  @IsNotEmpty()
  @IsString()
  @MaxLength(255)
  nombre: string;
}

export class AddMiembroDto {
  @IsOptional()
  @IsUUID()
  userId?: string;

  @IsOptional()
  @IsUUID()
  usuarioId?: string;
}
