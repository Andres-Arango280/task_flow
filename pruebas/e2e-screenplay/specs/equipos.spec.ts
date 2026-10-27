import { notes } from '@serenity-js/core';
import { contain, containAtLeastOneItemThat, Ensure, equals, includes, not, property } from '@serenity-js/assertions';
import { describe, it } from '../src/screenplay/test';
import {
    AbrirEquipo, AbrirTablero, AnadirMiembroPorApi, AvisoVisible, BuscarPersonaParaInvitar, ColumnasDelTablero, CrearEquipo,
    CrearEquipoPorApi, CrearProyecto, credencialesPara, DeshacerUltimaAccion, IniciarSesion, InvitarMiembro, MensajeDeError,
    MiembrosDelEquipo, NotasDeTaskFlow, nombreUnico, PrepararCuentaPorApi, ProgresoDelProyecto, QuitarMiembro, RegistrarUsuarioPorApi,
    TituloDeLaPagina, UrlActual,
} from '../src/screenplay';

describe('Gestión de equipos y proyectos', () => {

    it('SP-07 La líder crea un equipo e invita a un miembro registrado', async ({ actorCalled }) => {
        const ana = credencialesPara('Ana');
        const beto = credencialesPara('Beto');
        const equipo = nombreUnico('Equipo Backend');

        await actorCalled('Beto').attemptsTo(RegistrarUsuarioPorApi.con(beto));

        await actorCalled('Ana').attemptsTo(
            RegistrarUsuarioPorApi.con(ana),
            IniciarSesion.conSusCredenciales(),

            CrearEquipo.llamado(equipo),
            Ensure.eventually(AvisoVisible.deExito(), containAtLeastOneItemThat(includes(`Equipo «${equipo}» creado`))),

            AbrirEquipo.llamado(equipo),
            Ensure.that(TituloDeLaPagina(), equals(`${equipo} · TaskFlow`)),
            Ensure.that(MiembrosDelEquipo(), equals([ana.email])),

            InvitarMiembro.conCorreo(beto.email),
            Ensure.eventually(MiembrosDelEquipo(), equals([ana.email, beto.email])),
            Ensure.eventually(AvisoVisible.deExito(), containAtLeastOneItemThat(includes(`${beto.nombre} ahora es miembro del equipo`))),
        );
    });

    it('SP-08 Invitar un correo que no está registrado muestra un error en la ventana', async ({ actorCalled }) => {
        const ana = credencialesPara('Ana');
        const inexistente = credencialesPara('Nadie').email;

        await actorCalled('Ana').attemptsTo(
            PrepararCuentaPorApi.con(ana),
            CrearEquipoPorApi.llamado(nombreUnico('Equipo QA')),
            IniciarSesion.conSusCredenciales(),
            AbrirEquipo.conId(notes<NotasDeTaskFlow>().get('equipoId')),

            BuscarPersonaParaInvitar.conCorreo(inexistente),
            Ensure.eventually(MensajeDeError.deLaVentanaDeInvitacion(), includes(`No hay ningún usuario registrado con el correo ${inexistente}`)),
            Ensure.that(MiembrosDelEquipo(), property('length', equals(1))),
        );
    });

    it('SP-09 Crear un proyecto genera un tablero con las 3 columnas por defecto', async ({ actorCalled }) => {
        const ana = credencialesPara('Ana');
        const proyecto = nombreUnico('Proyecto API');

        await actorCalled('Ana').attemptsTo(
            PrepararCuentaPorApi.con(ana),
            CrearEquipoPorApi.llamado(nombreUnico('Equipo Web')),
            IniciarSesion.conSusCredenciales(),
            AbrirEquipo.conId(notes<NotasDeTaskFlow>().get('equipoId')),

            CrearProyecto.llamado(proyecto),
            Ensure.eventually(AvisoVisible.deExito(), containAtLeastOneItemThat(includes('creado con sus 3 listas'))),

            AbrirTablero.delProyecto(proyecto),
            Ensure.that(UrlActual(), includes('/proyectos/')),
            Ensure.eventually(ColumnasDelTablero(), equals(['Por Hacer', 'En Progreso', 'Hecho'])),
            Ensure.that(ProgresoDelProyecto(), equals(0)),
        );
    });

    it('SP-10 La líder quita a un miembro (con confirmación) y lo deshace desde el aviso', async ({ actorCalled }) => {
        const ana = credencialesPara('Ana');
        const beto = credencialesPara('Beto');

        await actorCalled('Beto').attemptsTo(RegistrarUsuarioPorApi.con(beto));

        await actorCalled('Ana').attemptsTo(
            PrepararCuentaPorApi.con(ana),
            CrearEquipoPorApi.llamado(nombreUnico('Equipo Móvil')),
            AnadirMiembroPorApi.conCorreo(beto.email),
            IniciarSesion.conSusCredenciales(),
            AbrirEquipo.conId(notes<NotasDeTaskFlow>().get('equipoId')),
            Ensure.eventually(MiembrosDelEquipo(), contain(beto.email)),

            QuitarMiembro.llamado(beto.nombre),
            Ensure.eventually(MiembrosDelEquipo(), not(contain(beto.email))),
            Ensure.eventually(AvisoVisible.deExito(), containAtLeastOneItemThat(includes(`${beto.nombre} ya no forma parte del equipo`))),

            DeshacerUltimaAccion(),
            Ensure.eventually(MiembrosDelEquipo(), contain(beto.email)),
            Ensure.eventually(AvisoVisible.deExito(), containAtLeastOneItemThat(includes(`${beto.nombre} ha vuelto al equipo`))),
        );
    });
});
