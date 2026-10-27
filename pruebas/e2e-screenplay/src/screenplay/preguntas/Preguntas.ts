import { Question } from '@serenity-js/core';
import { Attribute, Page, Text } from '@serenity-js/web';
import { Comunes, PaginaEquipo, PaginaInicioSesion, PaginaMisEquipos, PaginaRegistro, PaginaTablero } from '../ui';

/**
 * Preguntas (Questions): consultan el estado del sistema desde el punto de vista del actor.
 * Las aserciones de los escenarios se hacen siempre sobre estas preguntas.
 */

export const MensajeDeError = {
    delInicioDeSesion: () => Text.of(PaginaInicioSesion.mensajeDeError()).describedAs('el mensaje de error del inicio de sesión'),
    delRegistro: () => Text.of(PaginaRegistro.mensajeDeError()).describedAs('el mensaje de error del registro'),
    deLaVentanaDeInvitacion: () => Text.of(PaginaEquipo.errorEnVentana()).describedAs('el error mostrado en la ventana de invitación'),
    delTitulo: () => Text.of(PaginaTablero.errorDeTitulo()).describedAs('el error del título de la tarea'),
};

export const MensajeDeCuentaCreada = () =>
    Text.of(PaginaInicioSesion.mensajeCuentaCreada()).describedAs('el mensaje de cuenta creada');

export const TitulosDeTareasEn = (columna: string) =>
    Text.ofAll(PaginaTablero.titulosDeTareasEn(columna)).describedAs(`los títulos de las tareas en «${columna}»`);

export const TitulosDeTareasVisibles = () =>
    Text.ofAll(PaginaTablero.titulosDeTareasVisibles()).describedAs('los títulos de las tareas visibles');

export const ColumnasDelTablero = () =>
    Text.ofAll(PaginaTablero.nombresDeColumnas()).describedAs('las columnas del tablero');

export const ProgresoDelProyecto = () =>
    Attribute.called('aria-valuenow').of(PaginaTablero.barraDeProgreso()).as(Number).describedAs('el progreso del proyecto (%)');

export const ContadorDeResultados = () =>
    Text.of(PaginaTablero.contadorDeResultados()).describedAs('el contador de resultados de búsqueda');

export const MiembrosDelEquipo = () =>
    Text.ofAll(PaginaEquipo.correosDeMiembros()).describedAs('los correos de los miembros del equipo');

export const EquiposVisibles = () =>
    Text.ofAll(PaginaMisEquipos.nombresDeEquipos()).describedAs('los equipos que ve el actor');

export const TituloDeLaPagina = () =>
    Page.current().title().describedAs('el título de la pestaña');

export const UrlActual = () =>
    Page.current().url().pathname.describedAs('la ruta actual');

export const EncabezadoPrincipal = () =>
    Text.of(Comunes.encabezadoPrincipal()).describedAs('el encabezado principal');

export const AvisoVisible = {
    deExito: () => Text.ofAll(Comunes.avisos()).describedAs('los avisos emergentes'),
    deError: () => Text.ofAll(Comunes.avisosDeError()).describedAs('los avisos de error'),
};

export const ModoDeContraste = () =>
    Attribute.called('data-contraste').of(Comunes.raizDelDocumento()).describedAs('el modo de contraste activo');

export const TamanoDeTexto = () =>
    Attribute.called('data-texto').of(Comunes.raizDelDocumento()).describedAs('el tamaño de texto activo');

/** Pregunta compuesta: lee una clave del almacenamiento local del navegador del actor */
export const ValorEnAlmacenamientoLocal = (clave: string) =>
    Question.about(`el valor «${clave}» del almacenamiento local`, async actor => {
        const pagina = await actor.answer(Page.current());
        return pagina.executeScript((k: string) => window.localStorage.getItem(k), clave) as Promise<string | null>;
    });
