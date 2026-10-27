import { estaVisible } from '../expectativas';
import { notes, Task, Wait } from '@serenity-js/core';
import { equals, not } from '@serenity-js/assertions';
import { Click, Enter, Navigate, Page } from '@serenity-js/web';
import { Credenciales, NotasDeTaskFlow } from '../datos/DatosDePrueba';
import { BarraDeNavegacion, Comunes, PaginaInicioSesion, PaginaMisEquipos, PaginaRegistro } from '../ui';

const misNotas = () => notes<NotasDeTaskFlow>();

/** Rellena y envía el formulario de registro. No presupone el resultado (sirve para casos exitosos y alternativos). */
export const RegistrarseEnTaskFlow = {
    con: (credenciales: Credenciales, confirmacion: string = credenciales.password) =>
        Task.where(`#actor se registra en TaskFlow como ${credenciales.email}`,
            Navigate.to('/register'),
            Wait.until(PaginaRegistro.nombreCompleto(), estaVisible()),
            Enter.theValue(credenciales.nombre).into(PaginaRegistro.nombreCompleto()),
            Enter.theValue(credenciales.email).into(PaginaRegistro.correo()),
            Enter.theValue(credenciales.password).into(PaginaRegistro.contrasena()),
            Enter.theValue(confirmacion).into(PaginaRegistro.confirmarContrasena()),
            Click.on(PaginaRegistro.botonCrearCuenta()),
            misNotas().set('credenciales', credenciales),
        ),
};

/** Rellena y envía el formulario de inicio de sesión con unas credenciales concretas. */
export const IntentarIniciarSesion = {
    con: (email: string, password: string) =>
        Task.where(`#actor intenta iniciar sesión como ${email}`,
            Navigate.to('/login'),
            Wait.until(PaginaInicioSesion.correo(), estaVisible()),
            Enter.theValue(email).into(PaginaInicioSesion.correo()),
            Enter.theValue(password).into(PaginaInicioSesion.contrasena()),
            Click.on(PaginaInicioSesion.botonIniciarSesion()),
        ),
};

/** Inicia sesión con las credenciales que el actor recuerda y espera a ver «Mis equipos». */
export const IniciarSesion = {
    conSusCredenciales: () =>
        Task.where(`#actor inicia sesión con sus credenciales`,
            Navigate.to('/login'),
            Wait.until(PaginaInicioSesion.correo(), estaVisible()),
            Enter.theValue(misNotas().get('credenciales').email).into(PaginaInicioSesion.correo()),
            Enter.theValue(misNotas().get('credenciales').password).into(PaginaInicioSesion.contrasena()),
            Click.on(PaginaInicioSesion.botonIniciarSesion()),
            Wait.until(PaginaMisEquipos.titulo(), estaVisible()),
        ),
};

/** Cierra la sesión desde la barra de navegación aceptando la confirmación. */
export const CerrarSesion = () =>
    Task.where(`#actor cierra su sesión`,
        Click.on(BarraDeNavegacion.botonSalir()),
        Wait.until(Comunes.ventanaDeConfirmacion(), estaVisible()),
        Click.on(Comunes.botonEnVentanaDeConfirmacion('Cerrar sesión')),
        Wait.until(Page.current().url().pathname, equals('/login')),
    );

/** Pulsa «Salir» pero se arrepiente y cancela. */
export const CancelarCierreDeSesion = () =>
    Task.where(`#actor pulsa «Salir» y cancela la confirmación`,
        Click.on(BarraDeNavegacion.botonSalir()),
        Wait.until(Comunes.ventanaDeConfirmacion(), estaVisible()),
        Click.on(Comunes.botonEnVentanaDeConfirmacion('Cancelar')),
        Wait.until(Comunes.ventanaDeConfirmacion(), not(estaVisible())),
    );
