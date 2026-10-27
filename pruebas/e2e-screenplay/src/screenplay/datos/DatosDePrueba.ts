/**
 * Datos de prueba únicos por ejecución: la base de datos es compartida,
 * así que cada usuario/equipo/proyecto lleva un sufijo basado en Date.now().
 */
export interface Credenciales {
    nombre: string;
    email: string;
    password: string;
}

/** Lo que cada actor recuerda (TakeNotes) durante el escenario */
export interface NotasDeTaskFlow {
    credenciales: Credenciales;
    usuarioId: string;
    token: string;
    equipoId: string;
    proyectoId: string;
    tareaId: string;
}

let contador = 0;

export const sufijoUnico = (): string => `${Date.now()}${(contador++).toString().padStart(2, '0')}${Math.floor(Math.random() * 100)}`;

export const credencialesPara = (alias: string, nombreVisible?: string): Credenciales => {
    const sufijo = sufijoUnico();
    return {
        nombre: nombreVisible ?? `${alias} Screenplay ${sufijo}`,
        email: `${alias.toLowerCase()}.sp.${sufijo}@taskflow.test`,
        password: 'Clave-Segura-123',
    };
};

export const nombreUnico = (prefijo: string): string => `${prefijo} ${sufijoUnico()}`;
