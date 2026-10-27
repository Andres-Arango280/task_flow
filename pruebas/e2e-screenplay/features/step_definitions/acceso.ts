import { Then, When } from '@cucumber/cucumber';
import { Wait } from '@serenity-js/core';
import { Ensure, equals, includes } from '@serenity-js/assertions';
import { Navigate, Value } from '@serenity-js/web';
import {
    credencialesPara, EncabezadoPrincipal, IntentarIniciarSesion, MensajeDeCuentaCreada, MensajeDeError, PaginaInicioSesion,
    RegistrarseEnTaskFlow, UrlActual,
} from '../../src/screenplay';
import { actorDe, credencialesDe } from '../support/contexto';

/** Pasos de la característica «Autenticación en TaskFlow»: registro, inicio de sesión y rutas protegidas */

When('{word} se registra desde el formulario con sus datos', async (quien: string) => {
    await actorDe(quien).attemptsTo(RegistrarseEnTaskFlow.con(credencialesDe(quien)));
});

When('{word} intenta registrarse de nuevo con el mismo correo', async (quien: string) => {
    const actor = actorDe(quien);
    const credenciales = credencialesDe(quien);
    await actor.attemptsTo(RegistrarseEnTaskFlow.con({ ...credenciales, nombre: `Otra ${actor.name}` }));
});

When('{word} intenta iniciar sesión con su correo y una contraseña equivocada', async (quien: string) => {
    await actorDe(quien).attemptsTo(IntentarIniciarSesion.con(credencialesDe(quien).email, 'contraseña-equivocada'));
});

When('{word} intenta iniciar sesión con un correo no registrado', async (quien: string) => {
    // Correo único: así el intento fallido no activa el bloqueo de 5 intentos de ninguna cuenta real
    await actorDe(quien).attemptsTo(IntentarIniciarSesion.con(credencialesPara('Nadie').email, credencialesDe(quien).password));
});

When('{word} intenta abrir la ruta {string}', async (quien: string, ruta: string) => {
    await actorDe(quien).attemptsTo(Navigate.to(ruta));
});

/** El mensaje de «cuenta creada» se muestra en la página de inicio de sesión tras la redirección */
Then('{word} es redirigida al inicio de sesión con el mensaje {string}', async (quien: string, mensaje: string) => {
    await actorDe(quien).attemptsTo(
        Wait.until(UrlActual(), equals('/login')),
        Ensure.eventually(MensajeDeCuentaCreada(), includes(mensaje)),
    );
});

Then('{word} observa su correo precargado en el formulario de inicio de sesión', async (quien: string) => {
    await actorDe(quien).attemptsTo(
        Ensure.that(Value.of(PaginaInicioSesion.correo()), equals(credencialesDe(quien).email)),
    );
});

Then('{word} observa la página {string}', async (quien: string, encabezado: string) => {
    await actorDe(quien).attemptsTo(
        Ensure.eventually(EncabezadoPrincipal(), equals(encabezado)),
        Ensure.that(UrlActual(), equals('/')),
    );
});

Then('{word} observa en el formulario de registro el error {string}', async (quien: string, texto: string) => {
    await actorDe(quien).attemptsTo(Ensure.eventually(MensajeDeError.delRegistro(), includes(texto)));
});

Then('{word} observa en el formulario de inicio de sesión el error {string}', async (quien: string, texto: string) => {
    await actorDe(quien).attemptsTo(Ensure.eventually(MensajeDeError.delInicioDeSesion(), includes(texto)));
});
