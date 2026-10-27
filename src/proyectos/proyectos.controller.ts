import { Body, Controller, Post, Get, Query, Param, UseGuards, Req, BadRequestException, ParseUUIDPipe, Delete } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { ProyectosService } from './proyectos.service';
import { CreateProyectoDto } from './dto/proyecto.dto';

@Controller('proyectos')
@UseGuards(JwtAuthGuard)
export class ProyectosController {
  constructor(private proyectosService: ProyectosService) {}

  // GET /proyectos?equipoId=X - Obtener proyectos de un equipo
  @Get()
  getByEquipo(@Query('equipoId', new ParseUUIDPipe({ optional: true })) equipoId: string, @Req() req) {
    if (!equipoId) {
      throw new BadRequestException('Debes proporcionar equipoId');
    }
    return this.proyectosService.findByEquipo(equipoId, req.user.id);
  }

  // GET /proyectos/:id - Obtener un proyecto específico
  @Get(':id')
  getById(@Param('id', ParseUUIDPipe) id: string, @Req() req) {
    return this.proyectosService.findById(id, req.user.id);
  }

  // POST /proyectos - Crear proyecto (ya existe)
  @Post()
  create(@Body() dto: CreateProyectoDto, @Req() req) {
    return this.proyectosService.crearProyecto(dto, req.user.id);
  }

  // DELETE /proyectos/:id - Eliminar proyecto (solo el líder del equipo)
  @Delete(':id')
  eliminar(@Param('id', ParseUUIDPipe) id: string, @Req() req) {
    return this.proyectosService.eliminar(id, req.user.id);
  }
}
