import { Injectable, UnauthorizedException, ConflictException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { UsuariosService } from '../usuarios/usuarios.service';
import { RegisterDto, LoginDto } from './dto/auth.dto';
import { LimitadorIntentos } from './limitador-intentos';

// Hash bcrypt válido (coste 10) de un valor aleatorio, usado cuando el correo no existe
const HASH_FICTICIO = '$2b$10$Iv7AH0xdXvQttNfzYpGMvucan7f3xBPZeMHj9fehKTskjXMUe.mHe';

@Injectable()
export class AuthService {
  private readonly limitador = new LimitadorIntentos();

  constructor(
    private readonly usuariosService: UsuariosService,
    private readonly jwtService: JwtService,
  ) {}

  async register(dto: RegisterDto) {
    const existe = await this.usuariosService.findByEmailRaw(dto.email);
    if (existe) {
      throw new ConflictException('El email ya está registrado');
    }

    const hashedPassword = await bcrypt.hash(dto.password, 10);
    const usuario = await this.usuariosService.create({
      nombre: dto.nombre,
      email: dto.email,
      password: hashedPassword,
    });

    return {
      id: usuario.id,
      nombre: usuario.nombre,
      email: usuario.email,
    };
  }

  async login(dto: LoginDto) {
    this.limitador.comprobar(dto.email);

    const usuario = await this.usuariosService.findByEmailRaw(dto.email);
    // Siempre se ejecuta bcrypt.compare (con un hash ficticio si el correo no existe)
    // para que el tiempo de respuesta no permita enumerar cuentas registradas.
    const isPasswordValid = await bcrypt.compare(dto.password, usuario?.password ?? HASH_FICTICIO);
    if (!usuario || !isPasswordValid) {
      this.limitador.registrarFallo(dto.email);
      throw new UnauthorizedException('Credenciales inválidas');
    }

    this.limitador.limpiar(dto.email);

    const payload = {
      sub: usuario.id,
      email: usuario.email,
      id: usuario.id,
    };

    return { access_token: await this.jwtService.signAsync(payload) };
  }
}