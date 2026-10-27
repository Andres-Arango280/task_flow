import { Answerable, notes, q, Question, Task } from '@serenity-js/core';
import { Ensure, equals } from '@serenity-js/assertions';
import { GetRequest, LastResponse, PostRequest, Send } from '@serenity-js/rest';
import { Credenciales, NotasDeTaskFlow } from '../datos/DatosDePrueba';
import { AutenticarLlamadasApi } from '../interacciones';

/**
 * Tareas que preparan datos (arrange) directamente contra la API REST de TaskFlow,
 * para que los escenarios se centren en el comportamiento que validan en la interfaz.
 */

const misNotas = () => notes<NotasDeTaskFlow>();

/** Resuelve un objeto cuyas propiedades pueden ser preguntas (p. ej. valores de las notas del actor) */
const cuerpo = (descripcion: string, propiedades: Record<string, Answerable<unknown>>) =>
    Question.about(descripcion, async actor => {
        const resultado: Record<string, unknown> = {};
        for (const [clave, valor] of Object.entries(propiedades)) {
            resultado[clave] = await actor.answer(valor);
        }
        return resultado;
    });

export const RegistrarUsuarioPorApi = {
    con: (credenciales: Credenciales) =>
        Task.where(`#actor se registra por API como ${credenciales.email}`,
            Send.a(PostRequest.to('/auth/register').with(credenciales)),
            Ensure.that(LastResponse.status(), equals(201)),
            misNotas().set('credenciales', credenciales),
            misNotas().set('usuarioId', LastResponse.body<{ id: string }>().id),
        ),
};

export const IniciarSesionPorApi = () =>
    Task.where(`#actor obtiene un token de acceso por API`,
        Send.a(PostRequest.to('/auth/login').with(cuerpo('las credenciales del actor', {
            email: misNotas().get('credenciales').email,
            password: misNotas().get('credenciales').password,
        }))),
        Ensure.that(LastResponse.status(), equals(201)),
        misNotas().set('token', LastResponse.body<{ access_token: string }>().access_token),
        AutenticarLlamadasApi.con(misNotas().get('token')),
    );

/** Atajo habitual: registrarse y quedar autenticado contra la API */
export const PrepararCuentaPorApi = {
    con: (credenciales: Credenciales) =>
        Task.where(`#actor prepara su cuenta ${credenciales.email} por API`,
            RegistrarUsuarioPorApi.con(credenciales),
            IniciarSesionPorApi(),
        ),
};

export const CrearEquipoPorApi = {
    llamado: (nombre: string) =>
        Task.where(`#actor crea por API el equipo «${nombre}»`,
            Send.a(PostRequest.to('/equipos').with({ nombre })),
            Ensure.that(LastResponse.status(), equals(201)),
            misNotas().set('equipoId', LastResponse.body<{ id: string }>().id),
        ),
};

export const AnadirMiembroPorApi = {
    conCorreo: (email: string) =>
        Task.where(`#actor añade por API a ${email} a su equipo`,
            Send.a(GetRequest.to(`/usuarios?email=${encodeURIComponent(email)}`)),
            Ensure.that(LastResponse.status(), equals(200)),
            Send.a(PostRequest.to(q`/equipos/${ misNotas().get('equipoId') }/miembros`)
                .with(cuerpo('el usuario a añadir', { userId: LastResponse.body<{ id: string }>().id }))),
            Ensure.that(LastResponse.status(), equals(201)),
        ),
};

export const CrearProyectoPorApi = {
    llamado: (nombre: string) =>
        Task.where(`#actor crea por API el proyecto «${nombre}»`,
            Send.a(PostRequest.to('/proyectos').with(cuerpo('el nuevo proyecto', {
                nombre,
                equipoId: misNotas().get('equipoId'),
            }))),
            Ensure.that(LastResponse.status(), equals(201)),
            misNotas().set('proyectoId', LastResponse.body<{ id: string }>().id),
        ),
};

export const CrearTareaPorApi = {
    titulada: (titulo: string, descripcion?: string) =>
        Task.where(`#actor crea por API la tarea «${titulo}»`,
            Send.a(PostRequest.to('/tareas').with(cuerpo('la nueva tarea', {
                titulo,
                ...(descripcion ? { descripcion } : {}),
                proyectoId: misNotas().get('proyectoId'),
            }))),
            Ensure.that(LastResponse.status(), equals(201)),
            misNotas().set('tareaId', LastResponse.body<{ id: string }>().id),
        ),
};
