import { Controller, Get, Param, ParseUUIDPipe, Req, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { ListasService } from './listas.service';

@Controller('listas')
@UseGuards(JwtAuthGuard)
export class ListasController {
  constructor(private readonly listasService: ListasService) {}

  @Get('proyecto/:id')
  obtenerListasPorProyecto(@Param('id', ParseUUIDPipe) id: string, @Req() req) {
    return this.listasService.obtenerListasPorProyecto(id, req.user.id);
  }
}
