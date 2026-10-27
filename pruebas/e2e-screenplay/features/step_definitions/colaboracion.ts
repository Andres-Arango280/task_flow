import { Given, Then, When } from '@cucumber/cucumber';
import { actorCalled, notes } from '@serenity-js/core';
import { contain, Ensure, equals, isPresent, not } from '@serenity-js/assertions';
import { GetRequest, LastResponse, Send } from '@serenity-js/rest';
import {
    AbrirTablero, credencialesPara, EquiposVisibles, NotasDeTaskFlow, PaginaTablero, PrepararCuentaPorApi,
} from '../../src/screenplay';
import { actorDe, contexto, nombreDe } from '../support/contexto';

/** Pasos de la característica «Control de acceso entre usuarios» (multi-actor: Ana y Carla, siempre por nombre) */

/** El id del proyecto lo recuerda la actriz que lo creó (en sus notas); otro actor lo consulta así */
const proyectoDe = (nombre: string) => actorCalled(nombreDe(nombre)).answer(notes<NotasDeTaskFlow>().get('proyectoId'));

Given('{word} tiene una cuenta creada por API y no pertenece al equipo de {word}', async (nombre: string, _propietaria: string) => {
    contexto.credenciales[nombre] = credencialesPara(nombre);
    await actorCalled(nombre).attemptsTo(PrepararCuentaPorApi.con(contexto.credenciales[nombre]));
});

When('{word} consulta por API las tareas del proyecto de {word}', async (quien: string, propietaria: string) => {
    const proyectoId = await proyectoDe(propietaria);
    await actorDe(quien).attemptsTo(Send.a(GetRequest.to(`/tareas?proyectoId=${proyectoId}`)));
});

When('{word} intenta abrir el tablero del proyecto de {word}', async (quien: string, propietaria: string) => {
    const proyectoId = await proyectoDe(propietaria);
    await actorDe(quien).attemptsTo(AbrirTablero.conId(proyectoId));
});

Then('la API responde a {word} con el estado {int}', async (quien: string, estado: number) => {
    await actorDe(quien).attemptsTo(Ensure.that(LastResponse.status(), equals(estado)));
});

Then('{word} no observa el equipo de {word} en {string}', async (quien: string, _propietaria: string, _pagina: string) => {
    if (!contexto.equipo) throw new Error('El escenario todavía no ha creado ningún equipo.');
    await actorDe(quien).attemptsTo(Ensure.that(EquiposVisibles(), not(contain(contexto.equipo))));
});

Then('{word} no observa el tablero ni la tarea {string}', async (quien: string, tarea: string) => {
    await actorDe(quien).attemptsTo(
        Ensure.that(PaginaTablero.regionDeColumnas(), not(isPresent())),
        Ensure.that(PaginaTablero.tarjeta(tarea), not(isPresent())),
    );
});
