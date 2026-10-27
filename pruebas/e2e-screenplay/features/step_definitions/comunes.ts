import { Given, Then, When } from '@cucumber/cucumber';
import { actorCalled, actorInTheSpotlight, Interaction, notes, Wait } from '@serenity-js/core';
import { containAtLeastOneItemThat, endsWith, Ensure, equals, includes, isPresent, not } from '@serenity-js/assertions';
import { Navigate } from '@serenity-js/web';
import { estaVisible } from '../../src/screenplay/expectativas';
import {
    AbrirEquipo, AbrirTablero, AvisoVisible, CrearEquipoPorApi, CrearProyectoPorApi, CrearTareaPorApi, credencialesPara,
    EncabezadoPrincipal, IniciarSesion, nombreUnico, NotasDeTaskFlow, OlvidarSesionDelNavegador, PaginaTablero, PrepararCuentaPorApi,
    ProgresoDelProyecto, RegistrarUsuarioPorApi, TituloDeLaPagina, URL_API, UrlActual, ValorEnAlmacenamientoLocal,
} from '../../src/screenplay';
import { actorDe, contexto, credencialesDe } from '../support/contexto';

/**
 * Pasos compartidos por varias características: disponibilidad de la app, cuentas y datos
 * de preparación (por API), inicio de sesión y aserciones generales (mensajes, título, ruta…).
 * Convención del curso: el primer paso nombra al actor («Given Ana …») y los siguientes usan el
 * pronombre («When ella …», «Then ella observa …»). `{word}` acepta ambos (ver actorDe/credencialesDe).
 * Cada paso delega en las tareas, interacciones y preguntas Screenplay de src/screenplay/.
 */

const URL_FRONTEND = process.env.TASKFLOW_URL ?? 'http://localhost:5173';
const misNotas = () => notes<NotasDeTaskFlow>();

/** Interacción propia: comprueba que la API y el frontend responden antes de empezar */
const ComprobarQueTaskFlowResponde = () =>
    Interaction.where(`#actor comprueba que TaskFlow responde en ${URL_FRONTEND} y ${URL_API}`, async () => {
        const [front, api] = await Promise.all([
            fetch(URL_FRONTEND, { signal: AbortSignal.timeout(5000) }),
            fetch(`${URL_API}/usuarios/me`, { signal: AbortSignal.timeout(5000) }),
        ]);
        if (!front.ok) {
            throw new Error(`El frontend respondió ${front.status} en ${URL_FRONTEND}`);
        }
        if (api.status !== 401) {
            throw new Error(`La API respondió ${api.status} (se esperaba 401 sin token) en ${URL_API}/usuarios/me`);
        }
    });

// ---------- Background y preparación de datos ----------

Given('la aplicación TaskFlow está disponible', async () => {
    await actorCalled('Ana').attemptsTo(ComprobarQueTaskFlowResponde());
});

Given('{word} es una persona nueva sin cuenta en TaskFlow', (nombre: string) => {
    contexto.credenciales[nombre] = credencialesPara(nombre);
    actorCalled(nombre); // la pone en escena para que «ella» la refiera en los pasos siguientes
});

Given('{word} ya tiene una cuenta registrada en TaskFlow', async (nombre: string) => {
    contexto.credenciales[nombre] = credencialesPara(nombre);
    await actorCalled(nombre).attemptsTo(RegistrarUsuarioPorApi.con(contexto.credenciales[nombre]));
});

Given('{word} tiene una cuenta y un equipo creados por API', async (nombre: string) => {
    contexto.credenciales[nombre] = credencialesPara(nombre);
    contexto.equipo = nombreUnico('Equipo QA');
    await actorCalled(nombre).attemptsTo(
        PrepararCuentaPorApi.con(contexto.credenciales[nombre]),
        CrearEquipoPorApi.llamado(contexto.equipo),
    );
});

Given('{word} tiene una cuenta, un equipo y un proyecto vacío creados por API', async (nombre: string) => {
    contexto.credenciales[nombre] = credencialesPara(nombre);
    contexto.equipo = nombreUnico('Equipo Kanban');
    contexto.proyecto = nombreUnico('Proyecto Tablero');
    await actorCalled(nombre).attemptsTo(
        PrepararCuentaPorApi.con(contexto.credenciales[nombre]),
        CrearEquipoPorApi.llamado(contexto.equipo),
        CrearProyectoPorApi.llamado(contexto.proyecto),
    );
});

Given('{word} tiene una cuenta, un equipo y un proyecto con la tarea {string} creados por API', async (nombre: string, tarea: string) => {
    contexto.credenciales[nombre] = credencialesPara(nombre);
    contexto.equipo = nombreUnico('Equipo Privado');
    contexto.proyecto = nombreUnico('Proyecto Secreto');
    await actorCalled(nombre).attemptsTo(
        PrepararCuentaPorApi.con(contexto.credenciales[nombre]),
        CrearEquipoPorApi.llamado(contexto.equipo),
        CrearProyectoPorApi.llamado(contexto.proyecto),
        CrearTareaPorApi.titulada(tarea),
    );
});

// ---------- Sesión ----------

Given('{word} ha iniciado sesión en TaskFlow', async (quien: string) => {
    const actor = actorDe(quien);
    if (!contexto.credenciales[actor.name]) {
        // Sin cuenta previa en el escenario: se crea por API y se inicia sesión por la interfaz
        contexto.credenciales[actor.name] = credencialesPara(actor.name);
        await actor.attemptsTo(RegistrarUsuarioPorApi.con(contexto.credenciales[actor.name]));
    }
    await actor.attemptsTo(IniciarSesion.conSusCredenciales());
});

Given('{word} no ha iniciado sesión en TaskFlow', async (quien: string) => {
    await actorDe(quien).attemptsTo(
        Navigate.to('/login'),
        OlvidarSesionDelNavegador(),
    );
});

When('{word} inicia sesión con sus credenciales', async (quien: string) => {
    await actorDe(quien).attemptsTo(IniciarSesion.conSusCredenciales());
});

// ---------- Navegación de preparación ----------

Given('{word} está en la página de su equipo', async (quien: string) => {
    await actorDe(quien).attemptsTo(AbrirEquipo.conId(misNotas().get('equipoId')));
});

Given('{word} está viendo el tablero de su proyecto', async (quien: string) => {
    await actorDe(quien).attemptsTo(
        AbrirTablero.conId(misNotas().get('proyectoId')),
        Wait.until(PaginaTablero.barraDeProgreso(), estaVisible()),
    );
});

// ---------- Aserciones generales ----------

Then('{word} observa el mensaje {string}', async (quien: string, texto: string) => {
    await actorDe(quien).attemptsTo(
        Ensure.eventually(AvisoVisible.deExito(), containAtLeastOneItemThat(includes(texto))),
    );
});

Then('{word} observa el mensaje de error {string}', async (quien: string, texto: string) => {
    await actorDe(quien).attemptsTo(
        Ensure.eventually(AvisoVisible.deError(), containAtLeastOneItemThat(includes(texto))),
    );
});

Then('el título de la pestaña es {string}', async (titulo: string) => {
    await actorInTheSpotlight().attemptsTo(Ensure.eventually(TituloDeLaPagina(), equals(titulo)));
});

Then('el título de la pestaña termina en {string}', async (sufijo: string) => {
    await actorInTheSpotlight().attemptsTo(Ensure.eventually(TituloDeLaPagina(), endsWith(sufijo)));
});

Then('el encabezado principal es {string}', async (texto: string) => {
    await actorInTheSpotlight().attemptsTo(Ensure.eventually(EncabezadoPrincipal(), equals(texto)));
});

Then('{word} observa el encabezado {string}', async (quien: string, texto: string) => {
    await actorDe(quien).attemptsTo(Ensure.eventually(EncabezadoPrincipal(), equals(texto)));
});

Then('{word} permanece en la ruta {string}', async (quien: string, ruta: string) => {
    await actorDe(quien).attemptsTo(Ensure.that(UrlActual(), equals(ruta)));
});

Then('{word} es redirigida a la ruta {string}', async (quien: string, ruta: string) => {
    await actorDe(quien).attemptsTo(Wait.until(UrlActual(), equals(ruta)));
});

Then('la ruta actual contiene {string}', async (fragmento: string) => {
    await actorInTheSpotlight().attemptsTo(Ensure.that(UrlActual(), includes(fragmento)));
});

Then('su navegador guarda un token de acceso', async () => {
    await actorInTheSpotlight().attemptsTo(Ensure.that(ValorEnAlmacenamientoLocal('access_token'), isPresent()));
});

Then('su navegador no guarda ningún token de acceso', async () => {
    await actorInTheSpotlight().attemptsTo(Ensure.that(ValorEnAlmacenamientoLocal('access_token'), not(isPresent())));
});

/** Sirve como contexto («And el progreso del proyecto es 0 %») y como aserción final: Cucumber no distingue Given/Then */
Then('el progreso del proyecto es {int} %', async (porcentaje: number) => {
    await actorInTheSpotlight().attemptsTo(Ensure.eventually(ProgresoDelProyecto(), equals(porcentaje)));
});

export { credencialesDe };
