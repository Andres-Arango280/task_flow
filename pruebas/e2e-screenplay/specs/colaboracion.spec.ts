import { estaVisible } from '../src/screenplay/expectativas';
import { notes, Wait } from '@serenity-js/core';
import { contain, Ensure, equals, isPresent, not } from '@serenity-js/assertions';
import { GetRequest, LastResponse, Send } from '@serenity-js/rest';
import { describe, it } from '../src/screenplay/test';
import {
    AbrirTablero, AnadirMiembroPorApi, AvisoVisible, CrearEquipoPorApi, CrearProyectoPorApi, CrearTareaPorApi, credencialesPara,
    EncabezadoPrincipal, EquiposVisibles, IniciarSesion, MoverTarea, NotasDeTaskFlow, nombreUnico, PaginaTablero,
    PrepararCuentaPorApi, TitulosDeTareasEn,
} from '../src/screenplay';
import { containAtLeastOneItemThat, includes } from '@serenity-js/assertions';

describe('Colaboración entre actores', () => {

    it('SP-16 Beto (miembro) ve la tarea que creó Ana y el cambio de columna que ella hace', async ({ actorCalled }) => {
        const beto = credencialesPara('Beto');
        const equipo = nombreUnico('Equipo Compartido');

        await actorCalled('Beto').attemptsTo(PrepararCuentaPorApi.con(beto));

        await actorCalled('Ana').attemptsTo(
            PrepararCuentaPorApi.con(credencialesPara('Ana')),
            CrearEquipoPorApi.llamado(equipo),
            AnadirMiembroPorApi.conCorreo(beto.email),
            CrearProyectoPorApi.llamado(nombreUnico('Proyecto Compartido')),
            CrearTareaPorApi.titulada('Preparar la demo del sprint'),
        );
        const proyectoDeAna = await actorCalled('Ana').answer(notes<NotasDeTaskFlow>().get('proyectoId'));

        await actorCalled('Beto').attemptsTo(
            IniciarSesion.conSusCredenciales(),
            Ensure.eventually(EquiposVisibles(), contain(equipo)),
            AbrirTablero.conId(proyectoDeAna),
            Wait.until(PaginaTablero.barraDeProgreso(), estaVisible()),
            Ensure.eventually(TitulosDeTareasEn('Por Hacer'), contain('Preparar la demo del sprint')),
        );

        await actorCalled('Ana').attemptsTo(
            IniciarSesion.conSusCredenciales(),
            AbrirTablero.conId(proyectoDeAna),
            Wait.until(PaginaTablero.barraDeProgreso(), estaVisible()),
            MoverTarea.llamada('Preparar la demo del sprint').aLaColumna('Hecho'),
        );

        await actorCalled('Beto').attemptsTo(
            AbrirTablero.conId(proyectoDeAna),
            Wait.until(PaginaTablero.barraDeProgreso(), estaVisible()),
            Ensure.eventually(TitulosDeTareasEn('Hecho'), contain('Preparar la demo del sprint')),
            Ensure.that(TitulosDeTareasEn('Por Hacer'), not(contain('Preparar la demo del sprint'))),
        );
    });

    it('SP-17 Carla (usuaria ajena al equipo) no puede ver el tablero de Ana', async ({ actorCalled }) => {
        const equipo = nombreUnico('Equipo Privado');

        await actorCalled('Ana').attemptsTo(
            PrepararCuentaPorApi.con(credencialesPara('Ana')),
            CrearEquipoPorApi.llamado(equipo),
            CrearProyectoPorApi.llamado(nombreUnico('Proyecto Secreto')),
            CrearTareaPorApi.titulada('Tarea confidencial'),
        );
        const proyectoDeAna = await actorCalled('Ana').answer(notes<NotasDeTaskFlow>().get('proyectoId'));

        await actorCalled('Carla').attemptsTo(
            PrepararCuentaPorApi.con(credencialesPara('Carla')),

            // La API le niega el acceso
            Send.a(GetRequest.to(`/tareas?proyectoId=${proyectoDeAna}`)),
            Ensure.that(LastResponse.status(), equals(403)),

            // Y la interfaz tampoco le muestra nada
            IniciarSesion.conSusCredenciales(),
            Ensure.that(EquiposVisibles(), not(contain(equipo))),
            AbrirTablero.conId(proyectoDeAna),
            Ensure.eventually(EncabezadoPrincipal(), equals('No tienes acceso a este proyecto')),
            Ensure.eventually(AvisoVisible.deError(), containAtLeastOneItemThat(includes('No tienes acceso a este proyecto'))),
            Ensure.that(PaginaTablero.regionDeColumnas(), not(isPresent())),
            Ensure.that(PaginaTablero.tarjeta('Tarea confidencial'), not(isPresent())),
        );
    });
});
