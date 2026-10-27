import { DataTable, Given, Then, When } from '@cucumber/cucumber';
import { actorCalled, actorInTheSpotlight } from '@serenity-js/core';
import { contain, Ensure, equals, includes, property } from '@serenity-js/assertions';
import {
    CrearTarea, CrearTareaPorApi, DeshacerUltimaAccion, EliminarTarea, MensajeDeError, MoverTarea, RellenarNuevaTarea,
    TitulosDeTareasEn, TitulosDeTareasVisibles,
} from '../../src/screenplay';
import { actorDe } from '../support/contexto';

/** Pasos de la característica «Tablero Kanban de tareas» */

const columna = (tabla: DataTable): string[] => tabla.raw().map((fila) => fila[0].trim());

/** Tabla de datos con los títulos de las tareas que se crean por API antes de abrir el tablero */
Given('existen por API las tareas en el proyecto de {word}:', async (nombre: string, tabla: DataTable) => {
    await actorCalled(nombre).attemptsTo(...columna(tabla).map((titulo) => CrearTareaPorApi.titulada(titulo)));
});

When('{word} crea la tarea {string} con la descripción {string}', async (quien: string, titulo: string, descripcion: string) => {
    await actorDe(quien).attemptsTo(CrearTarea.titulada(titulo, descripcion));
});

When('{word} crea la tarea {string}', async (quien: string, titulo: string) => {
    await actorDe(quien).attemptsTo(CrearTarea.titulada(titulo));
});

When('{word} mueve la tarea {string} a la columna {string}', async (quien: string, titulo: string, columnaDestino: string) => {
    await actorDe(quien).attemptsTo(MoverTarea.llamada(titulo).aLaColumna(columnaDestino));
});

When('{word} intenta crear una tarea sin título con la descripción {string}', async (quien: string, descripcion: string) => {
    await actorDe(quien).attemptsTo(RellenarNuevaTarea.con('', descripcion));
});

When('{word} elimina la tarea {string} confirmando la acción', async (quien: string, titulo: string) => {
    await actorDe(quien).attemptsTo(EliminarTarea.llamada(titulo));
});

When('{word} deshace la última acción desde el mensaje', async (quien: string) => {
    await actorDe(quien).attemptsTo(DeshacerUltimaAccion());
});

/** Tabla de datos: la columna debe contener exactamente esas tareas, en ese orden */
Then('{word} observa en la columna {string} solamente las tareas:', async (quien: string, nombreColumna: string, tabla: DataTable) => {
    await actorDe(quien).attemptsTo(Ensure.eventually(TitulosDeTareasEn(nombreColumna), equals(columna(tabla))));
});

Then('{word} observa en la columna {string} la tarea {string}', async (quien: string, nombreColumna: string, titulo: string) => {
    await actorDe(quien).attemptsTo(Ensure.eventually(TitulosDeTareasEn(nombreColumna), contain(titulo)));
});

Then('{word} observa en la ventana de nueva tarea el error {string}', async (quien: string, texto: string) => {
    await actorDe(quien).attemptsTo(Ensure.eventually(MensajeDeError.delTitulo(), includes(texto)));
});

Then('el tablero no muestra ninguna tarea', async () => {
    await actorInTheSpotlight().attemptsTo(Ensure.that(TitulosDeTareasVisibles(), property('length', equals(0))));
});

Then('{word} observa solamente la tarea {string} en el tablero', async (quien: string, titulo: string) => {
    await actorDe(quien).attemptsTo(Ensure.eventually(TitulosDeTareasVisibles(), equals([titulo])));
});
