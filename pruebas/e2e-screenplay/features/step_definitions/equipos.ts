import { Then, When } from '@cucumber/cucumber';
import { actorCalled, actorInTheSpotlight } from '@serenity-js/core';
import { Ensure, equals, includes, property } from '@serenity-js/assertions';
import {
    AbrirEquipo, AbrirTablero, BuscarPersonaParaInvitar, ColumnasDelTablero, CrearEquipo, CrearProyecto, credencialesPara,
    InvitarMiembro, MensajeDeError, MiembrosDelEquipo, nombreUnico,
} from '../../src/screenplay';
import { contexto, credencialesDe } from '../support/contexto';

/** Pasos de la característica «Equipos y proyectos» */

const Cuando = When;
const Entonces = Then;

const nombreDelEquipo = () => {
    if (!contexto.equipo) throw new Error('El escenario todavía no ha creado ningún equipo.');
    return contexto.equipo;
};
const nombreDelProyecto = () => {
    if (!contexto.proyecto) throw new Error('El escenario todavía no ha creado ningún proyecto.');
    return contexto.proyecto;
};

Cuando('{word} crea el equipo {string}', async (nombre: string, equipo: string) => {
    // La base de datos es compartida: el nombre se hace único con un sufijo
    contexto.equipo = nombreUnico(equipo);
    await actorCalled(nombre).attemptsTo(CrearEquipo.llamado(contexto.equipo));
});

Cuando('{word} abre el equipo {string}', async (nombre: string, _equipo: string) => {
    await actorCalled(nombre).attemptsTo(AbrirEquipo.llamado(nombreDelEquipo()));
});

Cuando('{word} invita a {word} por su correo', async (nombre: string, invitado: string) => {
    await actorCalled(nombre).attemptsTo(InvitarMiembro.conCorreo(credencialesDe(invitado).email));
});

Cuando('{word} busca para invitar a un correo que no está registrado', async (nombre: string) => {
    contexto.correoInexistente = credencialesPara('Nadie').email;
    await actorCalled(nombre).attemptsTo(BuscarPersonaParaInvitar.conCorreo(contexto.correoInexistente));
});

Cuando('{word} crea el proyecto {string}', async (nombre: string, proyecto: string) => {
    contexto.proyecto = nombreUnico(proyecto);
    await actorCalled(nombre).attemptsTo(CrearProyecto.llamado(contexto.proyecto));
});

Cuando('{word} abre el tablero del proyecto {string}', async (nombre: string, _proyecto: string) => {
    await actorCalled(nombre).attemptsTo(AbrirTablero.delProyecto(nombreDelProyecto()));
});

Entonces('los miembros del equipo son solo {word}', async (nombre: string) => {
    await actorInTheSpotlight().attemptsTo(Ensure.eventually(MiembrosDelEquipo(), equals([credencialesDe(nombre).email])));
});

Entonces('los miembros del equipo son {word} y {word}', async (primero: string, segundo: string) => {
    await actorInTheSpotlight().attemptsTo(
        Ensure.eventually(MiembrosDelEquipo(), equals([credencialesDe(primero).email, credencialesDe(segundo).email])),
    );
});

Entonces('{word} ve en la ventana de invitación el error {string}', async (nombre: string, texto: string) => {
    await actorCalled(nombre).attemptsTo(
        Ensure.eventually(MensajeDeError.deLaVentanaDeInvitacion(), includes(`${texto} ${contexto.correoInexistente ?? ''}`.trim())),
    );
});

Entonces('el equipo sigue teniendo {int} miembro(s)', async (cantidad: number) => {
    await actorInTheSpotlight().attemptsTo(Ensure.that(MiembrosDelEquipo(), property('length', equals(cantidad))));
});

Entonces('las columnas del tablero son {string}, {string} y {string}', async (primera: string, segunda: string, tercera: string) => {
    await actorInTheSpotlight().attemptsTo(Ensure.eventually(ColumnasDelTablero(), equals([primera, segunda, tercera])));
});
