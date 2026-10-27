import { Actor, actorCalled, actorInTheSpotlight } from '@serenity-js/core';
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

/**
 * Los escenarios nombran al actor en el primer paso («Given Ana …») y después usan el pronombre
 * («When ella …», «Then ella observa …»), como en el material de la clase. El pronombre se resuelve
 * al actor en escena (actorInTheSpotlight), es decir, el último que actuó.
 */
const PRONOMBRES = new Set(['ella', 'él', 'el', 'Ella', 'Él', 'El']);

export const esPronombre = (palabra: string): boolean => PRONOMBRES.has(palabra);

/** Nombre real del actor a partir de un nombre («Ana») o de un pronombre («ella») */
export const nombreDe = (palabra: string): string => (esPronombre(palabra) ? actorInTheSpotlight().name : palabra);

/** Actor a partir de un nombre o de un pronombre */
export const actorDe = (palabra: string): Actor => (esPronombre(palabra) ? actorInTheSpotlight() : actorCalled(palabra));

/** Credenciales de un actor dentro del escenario; falla con un mensaje claro si aún no se generaron */
export const credencialesDe = (palabra: string): Credenciales => {
    const nombre = nombreDe(palabra);
    const credenciales = contexto.credenciales[nombre];
    if (!credenciales) {
        throw new Error(`El escenario todavía no ha generado credenciales para «${nombre}». Añade un paso «Given ${nombre} …tiene una cuenta…» antes.`);
    }
    return credenciales;
};
