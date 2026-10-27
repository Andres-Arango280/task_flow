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
import { contexto, credencialesDe } from '../support/contexto';

/**
 * Pasos compartidos por varias características: disponibilidad de la app, cuentas y datos
 * de preparación (por API), inicio de sesión y aserciones generales (avisos, título, ruta…).
 * Cada paso delega en las tareas, interacciones y preguntas Screenplay de src/screenplay/.
 */

const Dado = Given;
const Cuando = When;
const Entonces = Then;

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

// ---------- Antecedentes y preparación de datos ----------

Dado('que la aplicación TaskFlow está disponible', async () => {
    await actorCalled('Ana').attemptsTo(ComprobarQueTaskFlowResponde());
});

Dado('que {word} es una persona nueva sin cuenta en TaskFlow', (nombre: string) => {
    contexto.credenciales[nombre] = credencialesPara(nombre);
});

Dado('que {word} ya tiene una cuenta registrada en TaskFlow', async (nombre: string) => {
    contexto.credenciales[nombre] = credencialesPara(nombre);
    await actorCalled(nombre).attemptsTo(RegistrarUsuarioPorApi.con(contexto.credenciales[nombre]));
});

Dado('que {word} tiene una cuenta y un equipo creados por API', async (nombre: string) => {
    contexto.credenciales[nombre] = credencialesPara(nombre);
    contexto.equipo = nombreUnico('Equipo QA');
    await actorCalled(nombre).attemptsTo(
        PrepararCuentaPorApi.con(contexto.credenciales[nombre]),
        CrearEquipoPorApi.llamado(contexto.equipo),
    );
});

Dado('que {word} tiene una cuenta, un equipo y un proyecto vacío creados por API', async (nombre: string) => {
    contexto.credenciales[nombre] = credencialesPara(nombre);
    contexto.equipo = nombreUnico('Equipo Kanban');
    contexto.proyecto = nombreUnico('Proyecto Tablero');
    await actorCalled(nombre).attemptsTo(
        PrepararCuentaPorApi.con(contexto.credenciales[nombre]),
        CrearEquipoPorApi.llamado(contexto.equipo),
        CrearProyectoPorApi.llamado(contexto.proyecto),
    );
});

Dado('que {word} tiene una cuenta, un equipo y un proyecto con la tarea {string} creados por API', async (nombre: string, tarea: string) => {
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

Dado('que {word} ha iniciado sesión en TaskFlow', async (nombre: string) => {
    if (!contexto.credenciales[nombre]) {
        // Sin cuenta previa en el escenario: se crea por API y se inicia sesión por la interfaz
        contexto.credenciales[nombre] = credencialesPara(nombre);
        await actorCalled(nombre).attemptsTo(RegistrarUsuarioPorApi.con(contexto.credenciales[nombre]));
    }
    await actorCalled(nombre).attemptsTo(IniciarSesion.conSusCredenciales());
});

Dado('que {word} no ha iniciado sesión en TaskFlow', async (nombre: string) => {
    await actorCalled(nombre).attemptsTo(
        Navigate.to('/login'),
        OlvidarSesionDelNavegador(),
    );
});

Cuando('{word} inicia sesión con sus credenciales', async (nombre: string) => {
    await actorCalled(nombre).attemptsTo(IniciarSesion.conSusCredenciales());
});

// ---------- Navegación de preparación ----------

Dado('que {word} está en la página de su equipo', async (nombre: string) => {
    await actorCalled(nombre).attemptsTo(AbrirEquipo.conId(misNotas().get('equipoId')));
});

Dado('que {word} está viendo el tablero de su proyecto', async (nombre: string) => {
    await actorCalled(nombre).attemptsTo(
        AbrirTablero.conId(misNotas().get('proyectoId')),
        Wait.until(PaginaTablero.barraDeProgreso(), estaVisible()),
    );
});

// ---------- Aserciones generales ----------

Entonces('{word} ve el aviso {string}', async (nombre: string, texto: string) => {
    await actorCalled(nombre).attemptsTo(
        Ensure.eventually(AvisoVisible.deExito(), containAtLeastOneItemThat(includes(texto))),
    );
});

Entonces('{word} ve un aviso de error {string}', async (nombre: string, texto: string) => {
    await actorCalled(nombre).attemptsTo(
        Ensure.eventually(AvisoVisible.deError(), containAtLeastOneItemThat(includes(texto))),
    );
});

Entonces('el título de la pestaña es {string}', async (titulo: string) => {
    await actorInTheSpotlight().attemptsTo(Ensure.eventually(TituloDeLaPagina(), equals(titulo)));
});

Entonces('el título de la pestaña termina en {string}', async (sufijo: string) => {
    await actorInTheSpotlight().attemptsTo(Ensure.eventually(TituloDeLaPagina(), endsWith(sufijo)));
});

Entonces('el encabezado principal es {string}', async (texto: string) => {
    await actorInTheSpotlight().attemptsTo(Ensure.eventually(EncabezadoPrincipal(), equals(texto)));
});

Entonces('el encabezado principal que ve {word} es {string}', async (nombre: string, texto: string) => {
    await actorCalled(nombre).attemptsTo(Ensure.eventually(EncabezadoPrincipal(), equals(texto)));
});

Entonces('{word} permanece en la ruta {string}', async (nombre: string, ruta: string) => {
    await actorCalled(nombre).attemptsTo(Ensure.that(UrlActual(), equals(ruta)));
});

Entonces('{word} es redirigida a la ruta {string}', async (nombre: string, ruta: string) => {
    await actorCalled(nombre).attemptsTo(Wait.until(UrlActual(), equals(ruta)));
});

Entonces('la ruta actual contiene {string}', async (fragmento: string) => {
    await actorInTheSpotlight().attemptsTo(Ensure.that(UrlActual(), includes(fragmento)));
});

Entonces('el navegador de {word} guarda un token de acceso', async (nombre: string) => {
    await actorCalled(nombre).attemptsTo(Ensure.that(ValorEnAlmacenamientoLocal('access_token'), isPresent()));
});

Entonces('el navegador de {word} no guarda ningún token de acceso', async (nombre: string) => {
    await actorCalled(nombre).attemptsTo(Ensure.that(ValorEnAlmacenamientoLocal('access_token'), not(isPresent())));
});

/** Sirve como contexto («Y el progreso del proyecto es 0 %») y como aserción final: Cucumber no distingue Dado/Entonces */
Entonces('el progreso del proyecto es {int} %', async (porcentaje: number) => {
    await actorInTheSpotlight().attemptsTo(Ensure.eventually(ProgresoDelProyecto(), equals(porcentaje)));
});

export { credencialesDe };
