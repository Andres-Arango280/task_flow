import { IsEmail, IsNotEmpty, IsString, Matches, MaxLength, MinLength } from 'class-validator';

// Política de contraseñas: mínimo 8 caracteres con al menos una letra y un número
export const CONTIENE_LETRA = /[A-Za-zÁÉÍÓÚÜÑáéíóúüñ]/;
export const CONTIENE_NUMERO = /\d/;

export class RegisterDto {
  @IsNotEmpty()
  @IsString()
  @MaxLength(255)
  nombre: string;

  @IsEmail()
  @MaxLength(255)
  email: string;

  @IsString()
  @MinLength(8)
  @MaxLength(72)
  @Matches(CONTIENE_LETRA, { message: 'letra' })
  @Matches(CONTIENE_NUMERO, { message: 'numero' })
  password: string;
}

export class LoginDto {
  @IsEmail()
  @MaxLength(255)
  email: string;

  @IsNotEmpty()
  @IsString()
  @MaxLength(72)
  password: string;
}
