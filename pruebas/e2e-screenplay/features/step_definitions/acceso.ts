import { Then, When } from '@cucumber/cucumber';
import { actorCalled, Wait } from '@serenity-js/core';
import { Ensure, equals, includes } from '@serenity-js/assertions';
import { Navigate, Value } from '@serenity-js/web';
import {
    credencialesPara, EncabezadoPrincipal, IntentarIniciarSesion, MensajeDeCuentaCreada, MensajeDeError, PaginaInicioSesion,
    RegistrarseEnTaskFlow, UrlActual,
} from '../../src/screenplay';
import { credencialesDe } from '../support/contexto';

/** Pasos de la característica «Acceso a TaskFlow»: registro, inicio de sesión y rutas protegidas */

const Cuando = When;
const Entonces = Then;

Cuando('{word} se registra desde el formulario con sus datos', async (nombre: string) => {
    await actorCalled(nombre).attemptsTo(RegistrarseEnTaskFlow.con(credencialesDe(nombre)));
});

Cuando('{word} intenta registrarse de nuevo con el mismo correo', async (nombre: string) => {
    const credenciales = credencialesDe(nombre);
    await actorCalled(nombre).attemptsTo(RegistrarseEnTaskFlow.con({ ...credenciales, nombre: `Otra ${nombre}` }));
});

Cuando('{word} intenta iniciar sesión con su correo y una contraseña equivocada', async (nombre: string) => {
    await actorCalled(nombre).attemptsTo(IntentarIniciarSesion.con(credencialesDe(nombre).email, 'contraseña-equivocada'));
});

Cuando('{word} intenta iniciar sesión con un correo no registrado', async (nombre: string) => {
    // Correo único: así el intento fallido no activa el bloqueo de 5 intentos de ninguna cuenta real
    await actorCalled(nombre).attemptsTo(IntentarIniciarSesion.con(credencialesPara('Nadie').email, credencialesDe(nombre).password));
});

Cuando('{word} intenta abrir la ruta {string}', async (nombre: string, ruta: string) => {
    await actorCalled(nombre).attemptsTo(Navigate.to(ruta));
});

Entonces('{word} es redirigida al inicio de sesión con el aviso {string}', async (nombre: string, aviso: string) => {
    await actorCalled(nombre).attemptsTo(
        Wait.until(UrlActual(), equals('/login')),
        Ensure.eventually(MensajeDeCuentaCreada(), includes(aviso)),
    );
});

Entonces('el correo de {word} aparece precargado en el formulario de inicio de sesión', async (nombre: string) => {
    await actorCalled(nombre).attemptsTo(
        Ensure.that(Value.of(PaginaInicioSesion.correo()), equals(credencialesDe(nombre).email)),
    );
});

Entonces('{word} llega a la página {string}', async (nombre: string, encabezado: string) => {
    await actorCalled(nombre).attemptsTo(
        Ensure.eventually(EncabezadoPrincipal(), equals(encabezado)),
        Ensure.that(UrlActual(), equals('/')),
    );
});

Entonces('{word} ve en el formulario de registro el error {string}', async (nombre: string, texto: string) => {
    await actorCalled(nombre).attemptsTo(Ensure.eventually(MensajeDeError.delRegistro(), includes(texto)));
});

Entonces('{word} ve en el formulario de inicio de sesión el error {string}', async (nombre: string, texto: string) => {
    await actorCalled(nombre).attemptsTo(Ensure.eventually(MensajeDeError.delInicioDeSesion(), includes(texto)));
});
