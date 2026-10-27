import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { DatabaseModule } from './database/database.module';
import { AuthModule } from './auth/auth.module';
import { UsuariosModule } from './usuarios/usuarios.module';
import { EquiposModule } from './equipos/equipos.module';
import { ProyectosModule } from './proyectos/proyectos.module';
import { ListasModule } from './listas/listas.module';
import { TareasModule } from './tareas/tareas.module';
import { ComentariosModule } from './comentarios/comentarios.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    DatabaseModule,
    AuthModule,
    UsuariosModule,
    EquiposModule,
    ProyectosModule,
    ListasModule,
    TareasModule,
    ComentariosModule,
  ],
})
export class AppModule {}