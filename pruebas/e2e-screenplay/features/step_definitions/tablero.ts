import { Given, Then, When } from '@cucumber/cucumber';
import { actorCalled, actorInTheSpotlight } from '@serenity-js/core';
import { contain, Ensure, equals, includes, property } from '@serenity-js/assertions';
import {
    CrearTarea, CrearTareaPorApi, DeshacerUltimaAccion, EliminarTarea, MensajeDeError, MoverTarea, RellenarNuevaTarea,
    TitulosDeTareasEn, TitulosDeTareasVisibles,
} from '../../src/screenplay';

/** Pasos de la característica «Tablero Kanban de tareas» */

const Dado = Given;
const Cuando = When;
const Entonces = Then;

Dado('que existen por API las tareas {string} y {string} en el proyecto de {word}', async (primera: string, segunda: string, nombre: string) => {
    await actorCalled(nombre).attemptsTo(
        CrearTareaPorApi.titulada(primera),
        CrearTareaPorApi.titulada(segunda),
    );
});

Cuando('{word} crea la tarea {string} con la descripción {string}', async (nombre: string, titulo: string, descripcion: string) => {
    await actorCalled(nombre).attemptsTo(CrearTarea.titulada(titulo, descripcion));
});

Cuando('{word} crea la tarea {string}', async (nombre: string, titulo: string) => {
    await actorCalled(nombre).attemptsTo(CrearTarea.titulada(titulo));
});

Cuando('{word} mueve la tarea {string} a la columna {string}', async (nombre: string, titulo: string, columna: string) => {
    await actorCalled(nombre).attemptsTo(MoverTarea.llamada(titulo).aLaColumna(columna));
});

Cuando('{word} intenta crear una tarea sin título con la descripción {string}', async (nombre: string, descripcion: string) => {
    await actorCalled(nombre).attemptsTo(RellenarNuevaTarea.con('', descripcion));
});

Cuando('{word} elimina la tarea {string} confirmando la acción', async (nombre: string, titulo: string) => {
    await actorCalled(nombre).attemptsTo(EliminarTarea.llamada(titulo));
});

Cuando('{word} deshace la última acción desde el aviso', async (nombre: string) => {
    await actorCalled(nombre).attemptsTo(DeshacerUltimaAccion());
});

Entonces('la columna {string} contiene las tareas {string} y {string}', async (columna: string, primera: string, segunda: string) => {
    await actorInTheSpotlight().attemptsTo(Ensure.eventually(TitulosDeTareasEn(columna), equals([primera, segunda])));
});

Entonces('la columna {string} contiene la tarea {string}', async (columna: string, titulo: string) => {
    await actorInTheSpotlight().attemptsTo(Ensure.eventually(TitulosDeTareasEn(columna), contain(titulo)));
});

Entonces('{word} ve en la ventana de nueva tarea el error {string}', async (nombre: string, texto: string) => {
    await actorCalled(nombre).attemptsTo(Ensure.eventually(MensajeDeError.delTitulo(), includes(texto)));
});

Entonces('el tablero no muestra ninguna tarea', async () => {
    await actorInTheSpotlight().attemptsTo(Ensure.that(TitulosDeTareasVisibles(), property('length', equals(0))));
});

Entonces('el tablero muestra únicamente la tarea {string}', async (titulo: string) => {
    await actorInTheSpotlight().attemptsTo(Ensure.eventually(TitulosDeTareasVisibles(), equals([titulo])));
});
