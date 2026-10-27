import { Body, Controller, Delete, Get, Patch, Req, UseGuards, Query, BadRequestException } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { UsuariosService } from './usuarios.service';
import { ActualizarPerfilDto } from './dto/usuario.dto';

@Controller('usuarios')
@UseGuards(JwtAuthGuard)
export class UsuariosController {
  constructor(private readonly usuariosService: UsuariosService) {}

  // GET /usuarios/me - Obtener perfil del usuario autenticado
  @Get('me')
  getProfile(@Req() req) {
    if (!req?.user?.id) {
      throw new BadRequestException('Usuario no autenticado');
    }
    return this.usuariosService.findById(req.user.id);
  }

  // PATCH /usuarios/me - Cambiar el nombre del perfil
  @Patch('me')
  actualizarPerfil(@Body() dto: ActualizarPerfilDto, @Req() req) {
    return this.usuariosService.actualizarPerfil(req.user.id, dto.nombre);
  }

  // DELETE /usuarios/me - Eliminar la propia cuenta
  @Delete('me')
  eliminarCuenta(@Req() req) {
    return this.usuariosService.eliminarCuenta(req.user.id);
  }

  // GET /usuarios?email=juan@example.com - Buscar usuario por email
  @Get()
  findByEmail(@Query('email') email: string) {
    if (!email) {
      throw new BadRequestException('Debes proporcionar un email');
    }
    return this.usuariosService.findByEmail(email);
  }
}