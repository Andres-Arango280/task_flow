import { DataTable, Then, When } from '@cucumber/cucumber';
import { actorInTheSpotlight } from '@serenity-js/core';
import { Ensure, equals, includes, property } from '@serenity-js/assertions';
import {
    AbrirEquipo, AbrirTablero, BuscarPersonaParaInvitar, ColumnasDelTablero, CrearEquipo, CrearProyecto, credencialesPara,
    InvitarMiembro, MensajeDeError, MiembrosDelEquipo, nombreUnico,
} from '../../src/screenplay';
import { actorDe, contexto, credencialesDe } from '../support/contexto';

/** Pasos de la característica «Equipos y proyectos» */

const nombreDelEquipo = () => {
    if (!contexto.equipo) throw new Error('El escenario todavía no ha creado ningún equipo.');
    return contexto.equipo;
};
const nombreDelProyecto = () => {
    if (!contexto.proyecto) throw new Error('El escenario todavía no ha creado ningún proyecto.');
    return contexto.proyecto;
};
/** Primera columna de una tabla de datos Gherkin como lista de textos */
const columna = (tabla: DataTable): string[] => tabla.raw().map((fila) => fila[0].trim());

When('{word} crea el equipo {string}', async (quien: string, equipo: string) => {
    // La base de datos es compartida: el nombre se hace único con un sufijo
    contexto.equipo = nombreUnico(equipo);
    await actorDe(quien).attemptsTo(CrearEquipo.llamado(contexto.equipo));
});

When('{word} abre el equipo {string}', async (quien: string, _equipo: string) => {
    await actorDe(quien).attemptsTo(AbrirEquipo.llamado(nombreDelEquipo()));
});

When('{word} invita a {word} por su correo', async (quien: string, invitado: string) => {
    await actorDe(quien).attemptsTo(InvitarMiembro.conCorreo(credencialesDe(invitado).email));
});

When('{word} busca para invitar a un correo que no está registrado', async (quien: string) => {
    contexto.correoInexistente = credencialesPara('Nadie').email;
    await actorDe(quien).attemptsTo(BuscarPersonaParaInvitar.conCorreo(contexto.correoInexistente));
});

When('{word} crea el proyecto {string}', async (quien: string, proyecto: string) => {
    contexto.proyecto = nombreUnico(proyecto);
    await actorDe(quien).attemptsTo(CrearProyecto.llamado(contexto.proyecto));
});

When('{word} abre el tablero del proyecto {string}', async (quien: string, _proyecto: string) => {
    await actorDe(quien).attemptsTo(AbrirTablero.delProyecto(nombreDelProyecto()));
});

/** Tabla de datos con los nombres de los actores; se comparan sus correos con los miembros visibles */
Then('{word} observa solamente los miembros:', async (quien: string, tabla: DataTable) => {
    const correos = columna(tabla).map((nombre) => credencialesDe(nombre).email);
    await actorDe(quien).attemptsTo(Ensure.eventually(MiembrosDelEquipo(), equals(correos)));
});

Then('{word} observa en la ventana de invitación el error {string}', async (quien: string, texto: string) => {
    await actorDe(quien).attemptsTo(
        Ensure.eventually(MensajeDeError.deLaVentanaDeInvitacion(), includes(`${texto} ${contexto.correoInexistente ?? ''}`.trim())),
    );
});

Then('el equipo sigue teniendo {int} miembro(s)', async (cantidad: number) => {
    await actorInTheSpotlight().attemptsTo(Ensure.that(MiembrosDelEquipo(), property('length', equals(cantidad))));
});

Then('{word} observa solamente las columnas:', async (quien: string, tabla: DataTable) => {
    await actorDe(quien).attemptsTo(Ensure.eventually(ColumnasDelTablero(), equals(columna(tabla))));
});
