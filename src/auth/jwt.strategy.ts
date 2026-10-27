import { Injectable, NotFoundException, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { UsuariosService } from '../usuarios/usuarios.service';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    private readonly configService: ConfigService,
    private readonly usuariosService: UsuariosService,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: configService.getOrThrow<string>('JWT_SECRET'),
    });
  }

  async validate(payload: any) {
    // Si la cuenta ya no existe (p. ej. se eliminó), el token deja de ser válido: 401
    const usuario = await this.usuariosService.findById(payload.sub ?? payload.id).catch((error) => {
      if (error instanceof NotFoundException) {
        throw new UnauthorizedException('La sesión ya no es válida. Vuelve a iniciar sesión.');
      }
      throw error;
    });
    return {
      id: usuario.id,
      email: usuario.email,
      nombre: usuario.nombre,
    };
  }
}