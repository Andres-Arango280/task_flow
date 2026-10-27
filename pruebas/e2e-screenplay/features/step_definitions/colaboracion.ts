import { Given, Then, When } from '@cucumber/cucumber';
import { actorCalled, notes } from '@serenity-js/core';
import { contain, Ensure, equals, isPresent, not } from '@serenity-js/assertions';
import { GetRequest, LastResponse, Send } from '@serenity-js/rest';
import {
    AbrirTablero, credencialesPara, EquiposVisibles, NotasDeTaskFlow, PaginaTablero, PrepararCuentaPorApi,
} from '../../src/screenplay';
import { contexto } from '../support/contexto';

/** Pasos de la característica «Control de acceso entre usuarios» (multi-actor: Ana y Carla) */

const Dado = Given;
const Cuando = When;
const Entonces = Then;

/** El id del proyecto lo recuerda la actriz que lo creó (en sus notas); otro actor lo consulta así */
const proyectoDe = (nombre: string) => actorCalled(nombre).answer(notes<NotasDeTaskFlow>().get('proyectoId'));

Dado('que {word} tiene una cuenta creada por API y no pertenece al equipo de {word}', async (nombre: string, _propietaria: string) => {
    contexto.credenciales[nombre] = credencialesPara(nombre);
    await actorCalled(nombre).attemptsTo(PrepararCuentaPorApi.con(contexto.credenciales[nombre]));
});

Cuando('{word} consulta por API las tareas del proyecto de {word}', async (nombre: string, propietaria: string) => {
    const proyectoId = await proyectoDe(propietaria);
    await actorCalled(nombre).attemptsTo(Send.a(GetRequest.to(`/tareas?proyectoId=${proyectoId}`)));
});

Cuando('{word} intenta abrir el tablero del proyecto de {word}', async (nombre: string, propietaria: string) => {
    const proyectoId = await proyectoDe(propietaria);
    await actorCalled(nombre).attemptsTo(AbrirTablero.conId(proyectoId));
});

Entonces('la API responde a {word} con el estado {int}', async (nombre: string, estado: number) => {
    await actorCalled(nombre).attemptsTo(Ensure.that(LastResponse.status(), equals(estado)));
});

Entonces('{word} no ve el equipo de {word} en {string}', async (nombre: string, _propietaria: string, _pagina: string) => {
    if (!contexto.equipo) throw new Error('El escenario todavía no ha creado ningún equipo.');
    await actorCalled(nombre).attemptsTo(Ensure.that(EquiposVisibles(), not(contain(contexto.equipo))));
});

Entonces('{word} no ve el tablero ni la tarea {string}', async (nombre: string, tarea: string) => {
    await actorCalled(nombre).attemptsTo(
        Ensure.that(PaginaTablero.regionDeColumnas(), not(isPresent())),
        Ensure.that(PaginaTablero.tarjeta(tarea), not(isPresent())),
    );
});
