# TaskFlow: comparación antes y después de la refactorización

Generado: 27/10/2026, 12:33:08 a. m.. Versión anterior: commit `8b46dc0` (2026-09-23, «Fuckc»). Versión final: árbol de trabajo actual.

## 1. Métricas de código y pruebas

| Métrica | Antes | Después | Variación |
|---|---:|---:|---:|
| Archivos de código (backend + frontend + pruebas) | 66 | 184 | +118 |
| Líneas de código de la aplicación | 3.242 | 16.553 | +13.311 |
| Archivos de prueba | 13 | 59 | +46 |
| Líneas de código de prueba | 3.292 | 8.576 | +5.284 |
| Casos it()/test() automatizados | 142 | 373 | +231 |
| Escenarios Gherkin | 0 | 11 | +11 |
| Scripts npm (backend) | 12 | 28 | +16 |

Diff de `src/`, `taskflow-frontend/src/` y los package.json frente a 8b46dc0:  109 files changed, 6920 insertions(+), 2439 deletions(-). Archivos nuevos sin seguimiento en git (código, Cypress y pruebas/): 0.

### Líneas por carpeta

| Carpeta | Antes (archivos / líneas) | Después (archivos / líneas) |
|---|---:|---:|
| pruebas/accesibilidad | 0 / 0 | 10 / 4.886 |
| pruebas/comparacion | 0 / 0 | 1 / 235 |
| pruebas/despliegue | 0 / 0 | 1 / 264 |
| pruebas/e2e-screenplay | 0 / 0 | 56 / 7.001 |
| pruebas/ia-herramientas | 0 / 0 | 322 / 83.890 |
| pruebas/informe | 0 / 0 | 11 / 12.878 |
| pruebas/jest-a-resumen.js | 0 / 0 | 1 / 67 |
| pruebas/katalon | 0 / 0 | 143 / 4.970 |
| pruebas/rendimiento | 0 / 0 | 10 / 1.541 |
| pruebas/seguridad | 0 / 0 | 7 / 1.483 |
| pruebas/stagehand | 0 / 0 | 49 / 5.120 |
| src | 48 / 3.057 | 55 / 4.396 |
| taskflow-frontend/cypress | 0 / 0 | 34 / 3.113 |
| taskflow-frontend/src | 36 / 3.730 | 56 / 6.845 |

## 2. Dependencias

- **backend**: añadidas @nestjs/typeorm, helmet, pg, typeorm; eliminadas @hello-pangea/dnd, @nestjs/mongoose, mongodb, mongoose; actualizadas bcrypt: ^5.1.1 → ^6.0.0, class-validator: ^0.14.0 → ^0.14.4.
- **backendDev**: añadidas —; eliminadas @vitejs/plugin-react, vite; actualizadas —.
- **frontend**: añadidas —; eliminadas —; actualizadas —.
- **frontendDev**: añadidas @tailwindcss/vite, @testing-library/cypress, axe-core, cypress, cypress-axe, cypress-mochawesome-reporter; eliminadas autoprefixer, postcss; actualizadas —.

## 3. Características y controles (detectados en el código)

| Característica | Antes | Después |
|---|---|---|
| Base de datos | MongoDB + Mongoose | PostgreSQL + TypeORM (entidades, índices en claves foráneas) ✔ |
| Cabeceras de seguridad (helmet) | Sin helmet | helmet(): CSP, HSTS, nosniff, X-Frame-Options, Referrer-Policy ✔ |
| X-Powered-By | Expuesto | Desactivado ✔ |
| CORS | Abierto a cualquier origen (origin: true) | Limitado a FRONTEND_URL ✔ |
| Protección fuerza bruta | Sin límite de intentos | Bloqueo 15 min tras 5 fallos por cuenta (HTTP 429) ✔ |
| Secreto JWT | Valor por defecto en el código ('coco258') | getOrThrow sin valor por defecto; secreto de 64 caracteres en .env ✔ |
| Política de contraseñas | Mínimo 6 caracteres | Mínimo 8 caracteres con letra y número (backend y formulario) ✔ |
| Login resistente a enumeración por tiempo | bcrypt.compare solo si existe el correo | bcrypt.compare siempre (hash ficticio si el correo no existe) ✔ |
| Validación de entrada en español | Mensajes genéricos en inglés | Pipe propio con mensajes en español y traducción de reglas (isUuid, etc.) ✔ |
| Avisos (toasts) y manejo de errores en la interfaz | Errores solo en consola | Avisos en español con código de referencia, Deshacer y confirmaciones ✔ |
| Ayuda, preferencias y privacidad | No existían | Páginas de Ayuda (FAQ), Preferencias de accesibilidad y Privacidad ✔ |
| Búsqueda tolerante a errores | Sin búsqueda | Búsqueda de tareas/equipos tolerante a tildes y erratas ✔ |
| Accesibilidad (WCAG 2.5.3, landmarks, dnd accesible) | aria-label distinto del texto visible | Nombre accesible = texto visible; anuncios de arrastre en español; landmark main ✔ |
| Edición y eliminación (tareas, proyectos, equipos, cuenta) | Solo creación y movimiento | PATCH/DELETE de tareas, proyectos, equipos y cuenta propia ✔ |
| Índices en claves foráneas | Sin índices (p95 569 ms en REN-02) | @Index en listaId, proyectoId, equipoId, liderId, tareaId (p95 273 ms) ✔ |

## 4. Correcciones derivadas de las pruebas

| Id | Hallazgo | Origen | Corrección | Verificación |
|---|---|---|---|---|
| C-01 | Los errores de la interfaz solo se registraban en la consola; sin ayuda, sin deshacer, sin búsqueda, título de pestaña fijo, colores de columnas iguales y barra de progreso ficticia | Evaluación heurística GRIHO (IA) | Avisos en español con código de referencia y opción Deshacer, confirmaciones, página de Ayuda con preguntas frecuentes, Preferencias de accesibilidad, Privacidad, migas de pan, títulos por página, atajos de teclado, búsqueda tolerante a errores, borradores, actualización periódica | GRIHO 52,3 % → 93,4 %; recorridos UX-01..08; Screenplay SP-01..18 |
| C-02 | Un reset CSS fuera de capa anulaba todo el espaciado de Tailwind (tarjetas sin relleno, iconos sobre el texto) | Prueba de interfaz en navegador | Estilos base movidos a @layer base en index.css | Capturas de interfaz y regresión visual (VIS) |
| C-03 | Al recargar una página privada la aplicación expulsaba al login | Prueba E2E en navegador | La sesión se restaura de forma síncrona al crear el store (useAuthStore) | REG/UX de recarga; recorrido principal |
| C-04 | Faltaban cabeceras de seguridad, X-Powered-By expuesto y CORS abierto a cualquier origen | Revisión de seguridad | helmet (CSP, HSTS, nosniff, X-Frame-Options), X-Powered-By desactivado y CORS limitado a FRONTEND_URL | SEG-CONF-01..05 |
| C-05 | Sin protección frente a fuerza bruta en el login | Revisión de seguridad | Bloqueo de 15 min tras 5 intentos fallidos por cuenta (LimitadorIntentos) con HTTP 429 | SEG-AUTH (fuerza bruta) y pruebas unitarias del limitador |
| C-06 | Secreto JWT débil ('coco258') y valor por defecto en el código | Revisión de seguridad | Secreto aleatorio de 64 caracteres en .env y getOrThrow sin valor por defecto | SEG-AUTH (tokens manipulados / secretos adivinables) |
| C-07 | Error 500 en el login cuando la contraseña no es texto (p. ej. {"$ne": null}) | Pruebas de seguridad (inyección) | LoginDto con @IsString y @MaxLength(72): ahora 400 con mensaje en español | SEG-INY / SEG-VAL |
| C-08 | El token de un usuario eliminado devolvía 404 en lugar de 401 | Pruebas de seguridad | JwtStrategy convierte la cuenta inexistente en 401 | SEG-AUTH |
| C-09 | Enumeración de cuentas por tiempo de respuesta del login (7 ms vs 85 ms) | Pruebas de seguridad (SEG-AUTH-12) | Se ejecuta siempre bcrypt.compare (hash ficticio si el correo no existe) | SEG-AUTH-12 |
| C-10 | Se aceptaban contraseñas triviales (123456, password) | Pruebas de seguridad (SEG-AUTH-15) | Política: mínimo 8 caracteres con al menos una letra y un número (backend y formulario de registro) | SEG-AUTH-15; API-AUTH-03 |
| C-11 | .env con secretos versionado en git | Pruebas de seguridad | git rm --cached .env (queda ignorado); secreto JWT rotado. Pendiente: rotar la contraseña de PostgreSQL que quedó en el historial | git ls-files |
| C-12 | Dependencias vulnerables: backend producción 2 críticas y 10 altas; frontend 2 altas | npm audit (SEG-DEP) | bcrypt 6 y npm audit fix: backend producción 0 críticas / 3 altas (requieren NestJS 11+); frontend 0 altas | SEG-DEP-01..03 |
| C-13 | Faltaban índices en las claves foráneas | Pruebas de rendimiento | @Index en listaId, proyectoId, equipoId, liderId y tareaId | pg_indexes; escenarios REN |
| C-14 | Mensaje de validación genérico para identificadores inválidos (regla isUuid no traducida) | Cypress API-VAL-02 | Traductor de validación corregido y concordancia de género | API-VAL-02 |
| C-15 | Un 403 en el tablero se mostraba como error de conexión | Screenplay SP-17 | Mensaje específico 'No tienes acceso a este proyecto' | SP-17 |
| C-16 | Textos de Ayuda distintos de los botones reales; texto de progreso con concordancia incorrecta | Screenplay / Cypress | Textos alineados ('Invitar', 'Añadir al equipo', '1 de 4 tareas hechas') | SP / REG-KAN-10 |
| C-17 | Nombre accesible distinto del texto visible (WCAG 2.5.3) en tarjetas de tarea y equipo | axe-core (12 fallos) | Se eliminaron las aria-label: el nombre accesible es el texto visible; data-testid para las pruebas | A11Y / VIS-12 |
| C-18 | Instrucciones de arrastrar y soltar para lector de pantalla en inglés y con identificadores internos | Prueba de teclado TEC-11 | dragHandleUsageInstructions y anuncios en español con el título de la tarea y el nombre de la columna | TEC-11 |
| C-19 | Sin landmark main en Privacidad, salto de diseño (CLS) en el inicio, iconos sin texto en el menú móvil, aviso titulado 'Hecho' igual que la columna, sin meta descripción | axe-core, Lighthouse y revisión del equipo | main en Privacidad, esqueleto de carga, etiquetas visibles en móvil, aviso 'Listo', meta description | A11Y, Lighthouse |
| C-20 | El backend y Vite se reiniciaban al escribir archivos de prueba, causando fallos intermitentes | Ejecución de suites (estabilidad) | tsconfig excluye pruebas/ y Vite ignora las carpetas de resultados de Cypress | Ejecuciones finales estables |

## 5. Evolución de las suites (primera ejecución → ejecución final)

| Suite | Antes | Después | Comentario |
|---|---|---|---|
| Regresión backend (Jest) | 125/125 | 137/137 | Se añadieron 12 pruebas para las nuevas funciones (editar/eliminar tareas, proyectos, equipos y cuenta; limitador de intentos). Cobertura de líneas 91,5 %. |
| Cypress (API, regresión UI, componentes) | 121/122 | 122/122 | API-VAL-02 detectó el mensaje genérico para identificadores inválidos (C-14); corregido. |
| Seguridad | 43/53 | 49/53 | Corregidos: enumeración por tiempo, contraseñas triviales, error 500, token de usuario eliminado, .env versionado, dependencias del frontend. Quedan 4 riesgos documentados como mejoras (límite por IP, búsqueda por correo, CSP del frontend, NestJS 11). |
| Rendimiento | 5/6 | 6/6 | REN-02 bajó su p95 de 569 ms a 273 ms tras añadir índices a las claves foráneas (C-13). |
| UX, accesibilidad e interfaz | 54/67 | 68/68 | Corregidos nombre accesible ≠ texto visible (WCAG 2.5.3), anuncios de arrastrar y soltar en español, landmark main, etiquetas del menú móvil; se añadió VIS-15. |
| E2E Screenplay (Serenity/JS) | 18/18 | 18/18 | SP-17 se endureció para exigir el mensaje exacto de 403 (C-15). |
| E2E Katalon | — | Pendiente | 16 casos preparados; localizadores validados contra la app (14/14). Requiere ejecutar en Katalon Studio. |

## 6. Resultados finales por suite (evidencias reales)

| Suite | Herramienta | Casos | Aprobados | Fallidos | Fecha |
|---|---|---:|---:|---:|---|
| backend-jest | Jest 29.7.0 + ts-jest + Supertest | 137 | 137 | 0 | 2026-10-26 |
| cypress | Cypress 15.21.1 | 146 | 146 | 0 | 2026-10-26 |
| seguridad | Node.js v20.20.2 test runner (node:test) + fetch nativo; npm 10.8.2 audit; psql (PostgreSQL 18) para verificación de solo lectura | 53 | 48 | 5 | 2026-10-26 |
| rendimiento | autocannon 7.15.0 (API programática) sobre Node.js v20.20.2; monitor de CPU/memoria con PowerShell Get-Process | 6 | 6 | 0 | 2026-10-27 |
| ux-accesibilidad | axe-core 4.14.0, Lighthouse 12.8.2, Puppeteer 24.43.1 (puppeteer-core + Chrome instalado), pixelmatch 8.0.0 | 68 | 68 | 0 | 2026-10-27 |
| screenplay | Serenity/JS 3.48.2 + Playwright 1.63.0 | 18 | 18 | 0 | 2026-10-26 |
| gherkin | Cucumber 11.3.0 + Serenity/JS 3.48.2 (@serenity-js/cucumber) + Playwright 1.63.0 | 12 | 12 | 0 | 2026-10-26 |
| stagehand | Stagehand 3.7.3 + Ollama 0.40.7 (ollama/llama3.1:8b, local, sin coste) | 7 | 2 | 5 | 2026-10-27 |
| katalon | Katalon Studio | 16 | 0 | 0 | 2026-10-09 |

## 8. Extractos de código: antes y después

### Arranque de la API (seguridad HTTP y CORS)

**Antes** (`src/main.ts`):

```ts
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';
import * as dotenv from 'dotenv';

dotenv.config();

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  app.enableCors({
    origin: true,
    credentials: true,
  });

  app.useGlobalPipes(new ValidationPipe({ whitelist: true }));
  await app.listen(process.env.PORT || 3000);
}

bootstrap();
```

**Después** (`src/main.ts`):

```ts
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import helmet from 'helmet';
import { crearValidationPipe } from './common/validation';


async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // Cabeceras de seguridad HTTP (X-Content-Type-Options, X-Frame-Options, HSTS, CSP...)
  app.use(helmet());
  app.getHttpAdapter().getInstance().disable('x-powered-by');

  // Solo el frontend configurado puede llamar a la API desde el navegador
  const origenes = (process.env.FRONTEND_URL ?? 'http://localhost:5173')
    .split(',')
    .map((origen) => origen.trim());
  app.enableCors({
    origin: origenes,
    credentials: true,
  });

  app.useGlobalPipes(crearValidationPipe());
  await app.listen(process.env.PORT || 3000);
}

bootstrap();
```

### Servicio de autenticación (login)

**Antes** (`src/auth/auth.service.ts`):

```ts
import { Injectable, UnauthorizedException, ConflictException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { UsuariosService } from '../usuarios/usuarios.service';
import { RegisterDto, LoginDto } from './dto/auth.dto';

@Injectable()
export class AuthService {
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
      _id: usuario._id,
      nombre: usuario.nombre,
      email: usuario.email,
    };
  }

  async login(dto: LoginDto) {
    const usuario = await this.usuariosService.findByEmailRaw(dto.email);
    if (!usuario) {
      throw new UnauthorizedException('Credenciales inválidas');
    }

    const isPasswordValid = await bcrypt.compare(dto.password, usuario.password);
    if (!isPasswordValid) {
      throw new UnauthorizedException('Credenciales inválidas');
    }

    const payload = {
      sub: usuario._id,
      email: usuario.email,
      id: usuario._id,
    };

    return { access_token: await this.jwtService.signAsync(payload) };
  }
}
```

**Después** (`src/auth/auth.service.ts`):

```ts
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
```

### Validación del inicio de sesión (DTO)

**Antes** (`src/auth/dto/auth.dto.ts`):

```ts
import { IsEmail, IsNotEmpty, MinLength } from 'class-validator';

export class RegisterDto {
  @IsNotEmpty()
  nombre: string;

  @IsEmail()
  email: string;

  @MinLength(6)
  password: string;
}

export class LoginDto {
  @IsEmail()
  email: string;

  @IsNotEmpty()
  password: string;
}
```

**Después** (`src/auth/dto/auth.dto.ts`):

```ts
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

```

### Entidad/esquema de tarea

**Antes** (`src/tareas/schemas/tarea.schema.ts`):

```ts
import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

@Schema()
export class Tarea {
  @Prop({ required: true })
  titulo: string;

  @Prop()
  descripcion?: string;

  @Prop({ type: Types.ObjectId, ref: 'Lista', required: true })
  lista: Types.ObjectId;

  @Prop([{ type: Types.ObjectId, ref: 'Usuario' }])
  asignados: Types.ObjectId[];
}

export const TareaSchema = SchemaFactory.createForClass(Tarea);
```

**Después** (`src/tareas/entities/tarea.entity.ts`):

```ts
import {
  Entity,
  Index,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  OneToMany,
  ManyToMany,
  JoinTable,
  CreateDateColumn,
  UpdateDateColumn,
  JoinColumn,
} from 'typeorm';
import { Lista } from '../../listas/entities/lista.entity';
import { Usuario } from '../../usuarios/entities/usuario.entity';
import { Comentario } from '../../comentarios/entities/comentario.entity';

@Entity('tareas')
export class Tarea {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 255 })
  titulo: string;

  @Column({ type: 'text', nullable: true })
  descripcion: string;

  @Column({ type: 'varchar', length: 50, default: 'pendiente' })
  estado: string;

  @Column({ type: 'varchar', length: 50, default: 'media' })
  prioridad: string;

  @ManyToOne(() => Lista, (lista) => lista.tareas, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'listaId' })
  lista: Lista;

  @Index()
  @Column({ type: 'uuid' })
  listaId: string;

  @ManyToMany(() => Usuario, { cascade: ['insert'] })
  @JoinTable({
    name: 'tarea_asignados',
    joinColumn: { name: 'tareaId', referencedColumnName: 'id' },
    inverseJoinColumn: { name: 'usuarioId', referencedColumnName: 'id' },
  })
  asignados: Usuario[];

  @OneToMany(() => Comentario, (comentario) => comentario.tarea)
  comentarios: Comentario[];

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}

```

### Estado de sesión del frontend (restauración al recargar)

**Antes** (`taskflow-frontend/src/store/useAuthStore.ts`):

```ts
import { create } from 'zustand';
import type { Usuario } from '../types';

interface AuthState {
  user: Usuario | null;
  token: string | null;
  isAuthenticated: boolean;
  login: (user: Usuario, token: string) => void;
  logout: () => void;
  initialize: () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  token: null,
  isAuthenticated: false,

  login: (user, token) => {
    localStorage.setItem('access_token', token);
    localStorage.setItem('user', JSON.stringify(user));
    set({ user, token, isAuthenticated: true });
  },

  logout: () => {
    localStorage.removeItem('access_token');
    localStorage.removeItem('user');
    set({ user: null, token: null, isAuthenticated: false });
  },

  initialize: () => {
    const token = localStorage.getItem('access_token');
    const userStr = localStorage.getItem('user');
    if (token && userStr) {
      try {
        const user = JSON.parse(userStr);
        set({ user, token, isAuthenticated: true });
      } catch {
        localStorage.removeItem('access_token');
        localStorage.removeItem('user');
      }
    }
  },
}));
```

**Después** (`taskflow-frontend/src/store/useAuthStore.ts`):

```ts
import { create } from 'zustand';
import type { Usuario } from '../types';

interface AuthState {
  user: Usuario | null;
  token: string | null;
  isAuthenticated: boolean;
  login: (user: Usuario, token: string) => void;
  logout: () => void;
  initialize: () => void;
}

interface SesionGuardada {
  user: Usuario | null;
  token: string | null;
  isAuthenticated: boolean;
}

const SIN_SESION: SesionGuardada = { user: null, token: null, isAuthenticated: false };

// Lee la sesión guardada de forma síncrona para que, al recargar una página privada,
// no se redirija al login antes de haberla restaurado.
function leerSesion(): SesionGuardada {
  try {
    const token = localStorage.getItem('access_token');
    const userStr = localStorage.getItem('user');
    if (!token || !userStr) return SIN_SESION;
    const user = JSON.parse(userStr);
    // Sesiones guardadas con el formato antiguo (_id de MongoDB) ya no son válidas
    if (!user?.id) throw new Error('Sesión con formato antiguo');
    return { user, token, isAuthenticated: true };
  } catch {
    try {
      localStorage.removeItem('access_token');
      localStorage.removeItem('user');
    } catch {
      // Sin almacenamiento disponible
    }
    return SIN_SESION;
  }
}

export const useAuthStore = create<AuthState>((set) => ({
  ...leerSesion(),

  login: (user, token) => {
    localStorage.setItem('access_token', token);
    localStorage.setItem('user', JSON.stringify(user));
    set({ user, token, isAuthenticated: true });
  },

  logout: () => {
    localStorage.removeItem('access_token');
    localStorage.removeItem('user');
    set(SIN_SESION);
  },

  initialize: () => {
    set(leerSesion());
  },
}));

```
