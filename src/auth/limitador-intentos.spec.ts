import { HttpException } from '@nestjs/common';
import { LimitadorIntentos } from './limitador-intentos';

describe('Regression - LimitadorIntentos (fuerza bruta en login)', () => {
  // AAA + fluent-style assertions (Jest equivalent for this TypeScript stack)
  let ahora: number;
  let limitador: LimitadorIntentos;

  beforeEach(() => {
    ahora = 1_000_000;
    limitador = new LimitadorIntentos(3, 60_000, () => ahora);
  });

  it('debe permitir intentos mientras no se alcance el máximo', () => {
    // Arrange
    limitador.registrarFallo('ana@test.com');
    limitador.registrarFallo('ana@test.com');

    // Act + Assert
    expect(() => limitador.comprobar('ana@test.com')).not.toThrow();
  });

  it('debe bloquear con 429 al alcanzar el máximo de fallos, sin distinguir mayúsculas', () => {
    // Arrange
    limitador.registrarFallo('ana@test.com');
    limitador.registrarFallo('ANA@test.com');
    limitador.registrarFallo(' ana@test.com ');

    // Act + Assert
    try {
      limitador.comprobar('ana@test.com');
      fail('debía bloquear');
    } catch (error) {
      expect(error).toBeInstanceOf(HttpException);
      expect((error as HttpException).getStatus()).toBe(429);
    }
  });

  it('no debe afectar a otras cuentas', () => {
    // Arrange
    for (let i = 0; i < 3; i++) limitador.registrarFallo('ana@test.com');

    // Act + Assert
    expect(() => limitador.comprobar('beto@test.com')).not.toThrow();
  });

  it('debe desbloquear la cuenta cuando pasa el tiempo de bloqueo', () => {
    // Arrange
    for (let i = 0; i < 3; i++) limitador.registrarFallo('ana@test.com');

    // Act
    ahora += 60_001;

    // Assert
    expect(() => limitador.comprobar('ana@test.com')).not.toThrow();
  });

  it('debe reiniciar el contador tras un login correcto', () => {
    // Arrange
    limitador.registrarFallo('ana@test.com');
    limitador.registrarFallo('ana@test.com');

    // Act
    limitador.limpiar('ana@test.com');
    limitador.registrarFallo('ana@test.com');

    // Assert
    expect(() => limitador.comprobar('ana@test.com')).not.toThrow();
  });
});
