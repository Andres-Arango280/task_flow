import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import * as request from 'supertest';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { UsuariosService } from '../usuarios/usuarios.service';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';

jest.mock('bcrypt');

// ========================
// PRUEBAS DE CAJA NEGRA - AUTH (E2E)
// ========================
// Estas pruebas prueban el comportamiento del sistema sin conocer
// la implementación interna. Se validan inputs/outputs reales del endpoint
// (HTTP -> ValidationPipe -> AuthController -> AuthService), con la capa de
// persistencia (UsuariosService / TypeORM) y JwtService simulados.

describe('Regression - Auth E2E Tests (Black Box)', () => {
  // AAA + fluent-style assertions (Jest equivalent for this TypeScript stack)
  let app: INestApplication;
  let usuariosService: jest.Mocked<Pick<UsuariosService, 'findByEmailRaw' | 'create'>>;
  let jwtService: jest.Mocked<Pick<JwtService, 'signAsync'>>;

  const usuarioId = '3f1c2b7a-9d4e-4f6a-8b2c-1e5d7a9c0b11';

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      controllers: [AuthController],
      providers: [
        AuthService,
        {
          provide: UsuariosService,
          useValue: {
            findByEmailRaw: jest.fn(),
            create: jest.fn(),
          },
        },
        {
          provide: JwtService,
          useValue: {
            signAsync: jest.fn(),
          },
        },
      ],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(new ValidationPipe());
    await app.init();

    usuariosService = moduleFixture.get(UsuariosService);
    jwtService = moduleFixture.get(JwtService);
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  afterAll(async () => {
    await app.close();
  });

  // ========================
  // POST /auth/register - Caja Negra
  // ========================
  describe('POST /auth/register', () => {
    const validRegisterPayload = {
      nombre: 'Juan Pérez',
      email: 'juan@example.com',
      password: 'SecurePassword123!',
    };

    // Caso 1: Registro exitoso - Usuario nuevo
    it('debe registrar un usuario nuevo y devolver una respuesta sanitizada sin contraseña', async () => {
      // Arrange
      usuariosService.findByEmailRaw.mockResolvedValue(null);
      (bcrypt.hash as jest.Mock).mockResolvedValue('hashedPassword123');
      usuariosService.create.mockResolvedValue({
        id: usuarioId,
        nombre: validRegisterPayload.nombre,
        email: validRegisterPayload.email,
        password: 'hashedPassword123',
      } as any);

      // Act
      const res = await request(app.getHttpServer())
        .post('/auth/register')
        .send(validRegisterPayload);

      // Assert
      expect(res.status).toBe(201);
      expect(res.body).toEqual({
        id: usuarioId,
        nombre: 'Juan Pérez',
        email: 'juan@example.com',
      });
      expect(res.body).not.toHaveProperty('password');
    });

    // Caso 2: Email duplicado
    it('debe rechazar el registro cuando el email ya existe con 409 Conflict', async () => {
      // Arrange
      usuariosService.findByEmailRaw.mockResolvedValue({
        id: usuarioId,
        email: validRegisterPayload.email,
      } as any);

      // Act
      const res = await request(app.getHttpServer())
        .post('/auth/register')
        .send(validRegisterPayload);

      // Assert
      expect(res.status).toBe(409);
      expect(res.body.message).toContain('El email ya está registrado');
      expect(usuariosService.create).not.toHaveBeenCalled();
    });

    // Caso 3: Email vacío
    it('debe rechazar el registro cuando el email está vacío', async () => {
      // Arrange
      const invalidPayload = { ...validRegisterPayload, email: '' };

      // Act
      const res = await request(app.getHttpServer())
        .post('/auth/register')
        .send(invalidPayload);

      // Assert
      expect(res.status).toBe(400);
      expect(usuariosService.findByEmailRaw).not.toHaveBeenCalled();
      expect(usuariosService.create).not.toHaveBeenCalled();
    });

    // Caso 4: Contraseña muy corta
    it('debe rechazar el registro cuando la contraseña es demasiado corta', async () => {
      // Arrange
      const shortPasswordPayload = { ...validRegisterPayload, password: '123' };

      // Act
      const res = await request(app.getHttpServer())
        .post('/auth/register')
        .send(shortPasswordPayload);

      // Assert
      expect(res.status).toBe(400);
      expect(usuariosService.create).not.toHaveBeenCalled();
    });

    // Caso 5: Nombre vacío
    it('debe rechazar el registro cuando el nombre está vacío', async () => {
      // Arrange
      const noNamePayload = { ...validRegisterPayload, nombre: '' };

      // Act
      const res = await request(app.getHttpServer())
        .post('/auth/register')
        .send(noNamePayload);

      // Assert
      expect(res.status).toBe(400);
      expect(usuariosService.create).not.toHaveBeenCalled();
    });
  });

  // ========================
  // POST /auth/login - Caja Negra
  // ========================
  describe('POST /auth/login', () => {
    const validLoginPayload = {
      email: 'juan@example.com',
      password: 'SecurePassword123!',
    };

    const mockUsuario = {
      id: usuarioId,
      nombre: 'Juan Pérez',
      email: validLoginPayload.email,
      password: 'hashedPassword123',
    };

    // Caso 1: Login exitoso
    it('debe devolver un token de acceso válido cuando las credenciales son correctas', async () => {
      // Arrange
      usuariosService.findByEmailRaw.mockResolvedValue(mockUsuario as any);
      (bcrypt.compare as jest.Mock).mockResolvedValue(true);
      jwtService.signAsync.mockResolvedValue('mock.jwt.token.abc123');

      // Act
      const res = await request(app.getHttpServer())
        .post('/auth/login')
        .send(validLoginPayload);

      // Assert
      expect(res.status).toBe(201);
      expect(res.body).toHaveProperty('access_token');
      expect(typeof res.body.access_token).toBe('string');
      expect(res.body.access_token).toBeTruthy();
      expect(jwtService.signAsync).toHaveBeenCalledWith({
        sub: usuarioId,
        email: validLoginPayload.email,
        id: usuarioId,
      });
    });

    // Caso 2: Usuario no existe
    it('debe devolver 401 Unauthorized cuando el email no existe', async () => {
      // Arrange
      usuariosService.findByEmailRaw.mockResolvedValue(null);

      // Act
      const res = await request(app.getHttpServer())
        .post('/auth/login')
        .send(validLoginPayload);

      // Assert
      expect(res.status).toBe(401);
      expect(res.body.message).toContain('Credenciales inválidas');
    });

    // Caso 3: Contraseña incorrecta
    it('debe devolver 401 Unauthorized cuando la contraseña es incorrecta', async () => {
      // Arrange
      usuariosService.findByEmailRaw.mockResolvedValue(mockUsuario as any);
      (bcrypt.compare as jest.Mock).mockResolvedValue(false);

      // Act
      const res = await request(app.getHttpServer())
        .post('/auth/login')
        .send(validLoginPayload);

      // Assert
      expect(res.status).toBe(401);
      expect(res.body.message).toContain('Credenciales inválidas');
      expect(jwtService.signAsync).not.toHaveBeenCalled();
    });

    // Caso 4: Email vacío
    it('debe rechazar el login cuando el email está vacío', async () => {
      // Arrange
      const noEmailPayload = { ...validLoginPayload, email: '' };

      // Act
      const res = await request(app.getHttpServer())
        .post('/auth/login')
        .send(noEmailPayload);

      // Assert
      expect(res.status).toBe(400);
      expect(usuariosService.findByEmailRaw).not.toHaveBeenCalled();
    });

    // Caso 5: Contraseña vacía
    it('debe rechazar login sin contraseña', async () => {
      // Arrange
      const noPasswordPayload = { ...validLoginPayload, password: '' };

      // Act
      const res = await request(app.getHttpServer())
        .post('/auth/login')
        .send(noPasswordPayload);

      // Assert
      expect(res.status).toBe(400);
      expect(usuariosService.findByEmailRaw).not.toHaveBeenCalled();
    });

    // Caso 6: Token tiene estructura JWT correcta
    it('el token retornado debe ser un JWT válido', async () => {
      // Arrange
      const jwtToken =
        'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIzZjFjMmI3YS05ZDRlLTRmNmEtOGIyYy0xZTVkN2E5YzBiMTEifQ.abc123';
      usuariosService.findByEmailRaw.mockResolvedValue(mockUsuario as any);
      (bcrypt.compare as jest.Mock).mockResolvedValue(true);
      jwtService.signAsync.mockResolvedValue(jwtToken);

      // Act
      const res = await request(app.getHttpServer())
        .post('/auth/login')
        .send(validLoginPayload);

      // Assert
      expect(res.body.access_token).toBe(jwtToken);
      expect(res.body.access_token.split('.')).toHaveLength(3);
    });
  });

  // ========================
  // Casos de seguridad
  // ========================
  describe('Security Scenarios', () => {
    // Caso: SQL Injection en email
    it('debe rechazar caracteres de inyección SQL en el email', async () => {
      // Arrange
      const sqlInjectionPayload = {
        nombre: 'Attacker',
        email: "' OR '1'='1",
        password: 'password123',
      };

      // Act
      const res = await request(app.getHttpServer())
        .post('/auth/register')
        .send(sqlInjectionPayload);

      // Assert: la validación (IsEmail) lo rechaza antes de llegar a la BD.
      expect(res.status).toBe(400);
      expect(usuariosService.findByEmailRaw).not.toHaveBeenCalled();
      expect(usuariosService.create).not.toHaveBeenCalled();
    });

    // Caso: Contraseña no debe retornarse
    it('nunca debe retornar la contraseña en la respuesta', async () => {
      // Arrange
      usuariosService.findByEmailRaw.mockResolvedValue(null);
      (bcrypt.hash as jest.Mock).mockResolvedValue('hashedPassword123');
      usuariosService.create.mockResolvedValue({
        id: usuarioId,
        nombre: 'Juan',
        email: 'juan@example.com',
        password: 'hashedPassword123',
      } as any);

      // Act
      const res = await request(app.getHttpServer())
        .post('/auth/register')
        .send({
          nombre: 'Juan',
          email: 'juan@example.com',
          password: 'SecurePassword123!',
        });

      // Assert
      expect(res.status).toBe(201);
      expect(res.body).not.toHaveProperty('password');
      expect(JSON.stringify(res.body)).not.toContain('hashedPassword123');
    });
  });
});
