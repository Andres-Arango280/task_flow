import { estaVisible } from '../expectativas';
import { Answerable, q, Task, Wait } from '@serenity-js/core';
import { contain, not } from '@serenity-js/assertions';
import { Click, Enter, Navigate, Text } from '@serenity-js/web';
import { Comunes, PaginaEquipo, PaginaMisEquipos, PaginaTablero } from '../ui';

export const CrearEquipo = {
    llamado: (nombre: string) =>
        Task.where(`#actor crea el equipo «${nombre}»`,
            Wait.until(PaginaMisEquipos.botonNuevoEquipo(), estaVisible()),
            Click.on(PaginaMisEquipos.botonNuevoEquipo()),
            Wait.until(Comunes.ventanaModal(), estaVisible()),
            Enter.theValue(nombre).into(PaginaMisEquipos.nombreDelEquipo()),
            Click.on(PaginaMisEquipos.botonCrearEquipo()),
            Wait.until(PaginaMisEquipos.tarjetaDeEquipo(nombre), estaVisible()),
        ),
};

export const AbrirEquipo = {
    llamado: (nombre: string) =>
        Task.where(`#actor abre el equipo «${nombre}»`,
            Click.on(PaginaMisEquipos.tarjetaDeEquipo(nombre)),
            Wait.until(PaginaEquipo.migas(), estaVisible()),
        ),
    conId: (equipoId: Answerable<string>) =>
        Task.where(`#actor abre la página de su equipo`,
            Navigate.to(q`/equipos/${ equipoId }`),
            Wait.until(PaginaEquipo.migas(), estaVisible()),
        ),
};

/** Abre la ventana «Invitar», busca el correo y pulsa «Buscar» (sin presuponer que exista). */
export const BuscarPersonaParaInvitar = {
    conCorreo: (email: string) =>
        Task.where(`#actor busca a ${email} para invitarle`,
            Click.on(PaginaEquipo.botonInvitar()),
            Wait.until(Comunes.ventanaModal(), estaVisible()),
            Enter.theValue(email).into(PaginaEquipo.correoAInvitar()),
            Click.on(PaginaEquipo.botonBuscar()),
        ),
};

export const InvitarMiembro = {
    conCorreo: (email: string) =>
        Task.where(`#actor invita a ${email} a su equipo`,
            BuscarPersonaParaInvitar.conCorreo(email),
            Wait.until(PaginaEquipo.botonAnadirAlEquipo(), estaVisible()),
            Click.on(PaginaEquipo.botonAnadirAlEquipo()),
            Wait.until(Text.ofAll(PaginaEquipo.correosDeMiembros()), contain(email)),
        ),
};

export const QuitarMiembro = {
    llamado: (nombre: string) =>
        Task.where(`#actor quita a ${nombre} del equipo`,
            Click.on(PaginaEquipo.botonQuitarMiembro(nombre)),
            Wait.until(Comunes.ventanaDeConfirmacion(), estaVisible()),
            Click.on(Comunes.botonEnVentanaDeConfirmacion('Quitar del equipo')),
            Wait.until(Comunes.ventanaDeConfirmacion(), not(estaVisible())),
        ),
};

export const CrearProyecto = {
    llamado: (nombre: string) =>
        Task.where(`#actor crea el proyecto «${nombre}»`,
            Click.on(PaginaEquipo.botonNuevoProyecto()),
            Wait.until(Comunes.ventanaModal(), estaVisible()),
            Enter.theValue(nombre).into(PaginaEquipo.nombreDelProyecto()),
            Click.on(PaginaEquipo.botonCrearProyecto()),
            Wait.until(PaginaEquipo.enlaceAlTablero(nombre), estaVisible()),
        ),
};

export const AbrirTablero = {
    delProyecto: (nombre: string) =>
        Task.where(`#actor abre el tablero del proyecto «${nombre}»`,
            Click.on(PaginaEquipo.enlaceAlTablero(nombre)),
            Wait.until(PaginaTablero.barraDeProgreso(), estaVisible()),
        ),
    conId: (proyectoId: Answerable<string>) =>
        Task.where(`#actor abre directamente el tablero de un proyecto`,
            Navigate.to(q`/proyectos/${ proyectoId }`),
        ),
};
