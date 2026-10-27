import {
  Body,
  Controller,
  Post,
  Patch,
  Delete,
  Get,
  Param,
  Query,
  UseGuards,
  Req,
  BadRequestException,
  ParseUUIDPipe,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { TareasService } from './tareas.service';
import { ActualizarTareaDto, AsignarMiembrosDto, CreateTareaDto, MoverTareaDto } from './dto/tarea.dto';

@Controller('tareas')
@UseGuards(JwtAuthGuard)
export class TareasController {
  constructor(private tareasService: TareasService) {}

  // GET /tareas?proyectoId=X - Obtener todas las tareas de un proyecto
  @Get()
  getByProyecto(@Query('proyectoId', new ParseUUIDPipe({ optional: true })) proyectoId: string, @Req() req) {
    if (!proyectoId) {
      throw new BadRequestException('Debes proporcionar proyectoId');
    }
    return this.tareasService.findByProyecto(proyectoId, req.user.id);
  }

  // POST /tareas - Crear tarea (ya existe)
  @Post()
  create(@Body() dto: CreateTareaDto, @Req() req) {
    return this.tareasService.create(dto, req.user.id);
  }

  // PATCH /tareas/:id/mover - Mover tarea (ya existe)
  @Patch(':id/mover')
  mover(@Param('id', ParseUUIDPipe) id: string, @Body() dto: MoverTareaDto, @Req() req) {
    return this.tareasService.moverTarea(id, dto.nuevaListaId, req.user.id);
  }

  // PATCH /tareas/:id/asignar - Asignar miembros (ya existe)
  @Patch(':id/asignar')
  asignarMiembros(@Param('id', ParseUUIDPipe) id: string, @Body() dto: AsignarMiembrosDto, @Req() req) {
    return this.tareasService.asignarMiembros(id, dto.miembros, req.user.id);
  }

  // PATCH /tareas/:id - Editar título o descripción
  @Patch(':id')
  actualizar(@Param('id', ParseUUIDPipe) id: string, @Body() dto: ActualizarTareaDto, @Req() req) {
    return this.tareasService.actualizar(id, dto, req.user.id);
  }

  // DELETE /tareas/:id - Eliminar tarea
  @Delete(':id')
  eliminar(@Param('id', ParseUUIDPipe) id: string, @Req() req) {
    return this.tareasService.eliminar(id, req.user.id);
  }
}
