import { Wait } from '@serenity-js/core';
import { Ensure, equals, includes, isPresent, not } from '@serenity-js/assertions';
import { Navigate, Value } from '@serenity-js/web';
import { describe, it } from '../src/screenplay/test';
import {
    CancelarCierreDeSesion, CerrarSesion, credencialesPara, EncabezadoPrincipal, IniciarSesion, IntentarIniciarSesion,
    MensajeDeCuentaCreada, MensajeDeError, OlvidarSesionDelNavegador, PaginaInicioSesion, PaginaMisEquipos, RegistrarseEnTaskFlow, RegistrarUsuarioPorApi,
    TituloDeLaPagina, UrlActual, ValorEnAlmacenamientoLocal,
} from '../src/screenplay';

describe('Acceso a TaskFlow', () => {

    it('SP-01 Registro exitoso de una nueva usuaria e inicio de sesión', async ({ actorCalled }) => {
        const ana = credencialesPara('Ana');

        await actorCalled('Ana').attemptsTo(
            RegistrarseEnTaskFlow.con(ana),

            Wait.until(UrlActual(), equals('/login')),
            Ensure.eventually(MensajeDeCuentaCreada(), includes('Cuenta creada correctamente')),
            Ensure.that(Value.of(PaginaInicioSesion.correo()), equals(ana.email)),

            IniciarSesion.conSusCredenciales(),
            Ensure.that(UrlActual(), equals('/')),
            Ensure.that(TituloDeLaPagina(), equals('Mis equipos · TaskFlow')),
            Ensure.that(ValorEnAlmacenamientoLocal('access_token'), isPresent()),
        );
    });

    it('SP-02 Registro con un correo ya existente muestra un error', async ({ actorCalled }) => {
        const ana = credencialesPara('Ana');

        await actorCalled('Ana').attemptsTo(
            RegistrarUsuarioPorApi.con(ana),
            RegistrarseEnTaskFlow.con({ ...ana, nombre: 'Otra Ana' }),

            Ensure.eventually(MensajeDeError.delRegistro(), includes(`Ya existe una cuenta con el correo ${ana.email}`)),
            Ensure.that(UrlActual(), equals('/register')),
        );
    });

    it('SP-03 Registro con contraseñas que no coinciden es rechazado en el formulario', async ({ actorCalled }) => {
        const ana = credencialesPara('Ana');

        await actorCalled('Ana').attemptsTo(
            RegistrarseEnTaskFlow.con(ana, 'otra-clave-distinta'),

            Ensure.eventually(MensajeDeError.delRegistro(), includes('Las contraseñas no coinciden')),
            Ensure.that(UrlActual(), equals('/register')),
        );
    });

    it('SP-04 Inicio de sesión con contraseña incorrecta muestra una alerta', async ({ actorCalled }) => {
        const ana = credencialesPara('Ana');

        await actorCalled('Ana').attemptsTo(
            RegistrarUsuarioPorApi.con(ana),
            IntentarIniciarSesion.con(ana.email, 'contraseña-equivocada'),

            Ensure.eventually(MensajeDeError.delInicioDeSesion(), includes('El correo o la contraseña no son correctos')),
            Ensure.that(UrlActual(), equals('/login')),
            Ensure.that(ValorEnAlmacenamientoLocal('access_token'), not(isPresent())),
        );
    });

    it('SP-05 Una ruta protegida sin sesión redirige al inicio de sesión', async ({ actorCalled }) => {
        await actorCalled('Ana').attemptsTo(
            Navigate.to('/login'),
            OlvidarSesionDelNavegador(),
            Navigate.to('/proyectos/00000000-0000-0000-0000-000000000000'),
            Wait.until(UrlActual(), equals('/login')),
            Ensure.that(EncabezadoPrincipal(), equals('Iniciar sesión')),

            Navigate.to('/preferencias'),
            Wait.until(UrlActual(), equals('/login')),
            Ensure.that(TituloDeLaPagina(), equals('Iniciar sesión · TaskFlow')),
        );
    });

    it('SP-06 Cerrar sesión pide confirmación y después protege las rutas privadas', async ({ actorCalled }) => {
        const ana = credencialesPara('Ana');

        await actorCalled('Ana').attemptsTo(
            RegistrarUsuarioPorApi.con(ana),
            IniciarSesion.conSusCredenciales(),

            CancelarCierreDeSesion(),
            Ensure.that(UrlActual(), equals('/')),
            Ensure.that(PaginaMisEquipos.titulo(), isPresent()),

            CerrarSesion(),
            Ensure.that(UrlActual(), equals('/login')),
            Ensure.that(ValorEnAlmacenamientoLocal('access_token'), not(isPresent())),

            Navigate.to('/'),
            Wait.until(UrlActual(), equals('/login')),
        );
    });
});
