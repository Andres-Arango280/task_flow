import { Credenciales } from '../../src/screenplay';

/**
 * Estado compartido entre los pasos de UN escenario (se reinicia en el hook Before).
 * Guarda los datos únicos generados para cada actor (credenciales) y los nombres
 * únicos de equipo/proyecto, para que un paso pueda referirse a lo que creó otro.
 */
export interface ContextoDelEscenario {
    credenciales: Record<string, Credenciales>;
    /** Nombre único del equipo creado en el escenario (por interfaz o por API) */
    equipo?: string;
    /** Nombre único del proyecto creado en el escenario */
    proyecto?: string;
    /** Correo no registrado usado en los escenarios alternativos */
    correoInexistente?: string;
}

export const contexto: ContextoDelEscenario = { credenciales: {} };

export const reiniciarContexto = (): void => {
    contexto.credenciales = {};
    delete contexto.equipo;
    delete contexto.proyecto;
    delete contexto.correoInexistente;
};

/** Credenciales de un actor dentro del escenario; falla con un mensaje claro si aún no se generaron */
export const credencialesDe = (nombre: string): Credenciales => {
    const credenciales = contexto.credenciales[nombre];
    if (!credenciales) {
        throw new Error(`El escenario todavía no ha generado credenciales para «${nombre}». Añade un paso «Dado que ${nombre} …tiene una cuenta…» antes.`);
    }
    return credenciales;
};
