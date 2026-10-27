import { HttpException, HttpStatus } from '@nestjs/common';

interface Registro {
  fallos: number;
  inicio: number;
  bloqueadoHasta?: number;
}

// Protección contra fuerza bruta: tras N intentos fallidos sobre la misma cuenta
// se bloquea el login de esa cuenta durante unos minutos (en memoria, por correo).
export class LimitadorIntentos {
  private readonly registros = new Map<string, Registro>();

  constructor(
    private readonly maxIntentos = Number(process.env.LOGIN_MAX_INTENTOS ?? 5),
    private readonly ventanaMs = Number(process.env.LOGIN_BLOQUEO_MINUTOS ?? 15) * 60_000,
    private readonly ahora: () => number = Date.now,
  ) {}

  private clave(email: string) {
    return email.trim().toLowerCase();
  }

  comprobar(email: string) {
    const registro = this.registros.get(this.clave(email));
    if (!registro?.bloqueadoHasta) return;

    const restanteMs = registro.bloqueadoHasta - this.ahora();
    if (restanteMs <= 0) {
      this.registros.delete(this.clave(email));
      return;
    }
    const minutos = Math.ceil(restanteMs / 60_000);
    throw new HttpException(
      `Demasiados intentos fallidos. Por seguridad, espera ${minutos} minuto(s) antes de volver a intentarlo.`,
      HttpStatus.TOO_MANY_REQUESTS,
    );
  }

  registrarFallo(email: string) {
    const clave = this.clave(email);
    const momento = this.ahora();
    const registro = this.registros.get(clave);

    if (!registro || momento - registro.inicio > this.ventanaMs) {
      this.registros.set(clave, { fallos: 1, inicio: momento });
      return;
    }

    registro.fallos += 1;
    if (registro.fallos >= this.maxIntentos) {
      registro.bloqueadoHasta = momento + this.ventanaMs;
    }
  }

  limpiar(email: string) {
    this.registros.delete(this.clave(email));
  }
}
