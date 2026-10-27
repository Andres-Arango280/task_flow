import { estaVisible } from '../src/screenplay/expectativas';
import { notes, Wait } from '@serenity-js/core';
import { contain, containAtLeastOneItemThat, Ensure, equals, includes, not, property } from '@serenity-js/assertions';
import { describe, it } from '../src/screenplay/test';
import {
    AbrirTablero, ArrastrarTareaConTeclado, AvisoVisible, BuscarTarea, ContadorDeResultados, CrearEquipoPorApi, CrearProyectoPorApi,
    CrearTarea, CrearTareaPorApi, credencialesPara, DeshacerUltimaAccion, EliminarTarea, IniciarSesion, MensajeDeError, MoverTarea,
    NotasDeTaskFlow, nombreUnico, PaginaTablero, PrepararCuentaPorApi, ProgresoDelProyecto, RellenarNuevaTarea, TitulosDeTareasEn,
    TitulosDeTareasVisibles,
} from '../src/screenplay';

const proyectoId = () => notes<NotasDeTaskFlow>().get('proyectoId');

/** Ana tiene cuenta, un equipo y un proyecto vacío, y está viendo su tablero */
const anaEnUnTableroVacio = (actorCalled: (nombre: string) => any) =>
    actorCalled('Ana').attemptsTo(
        PrepararCuentaPorApi.con(credencialesPara('Ana')),
        CrearEquipoPorApi.llamado(nombreUnico('Equipo Kanban')),
        CrearProyectoPorApi.llamado(nombreUnico('Proyecto Tablero')),
    );

const abrirSuTablero = () => [
    IniciarSesion.conSusCredenciales(),
    AbrirTablero.conId(proyectoId()),
    Wait.until(PaginaTablero.barraDeProgreso(), estaVisible()),
];

describe('Tablero Kanban', () => {

    it('SP-11 Crear tareas, mover una a «Hecho» y ver subir el progreso', async ({ actorCalled }) => {
        await anaEnUnTableroVacio(actorCalled);

        await actorCalled('Ana').attemptsTo(
            ...abrirSuTablero(),
            Ensure.that(ProgresoDelProyecto(), equals(0)),

            CrearTarea.titulada('Diseñar la pantalla de inicio', 'Wireframes y prototipo'),
            CrearTarea.titulada('Configurar la base de datos'),
            Ensure.eventually(TitulosDeTareasEn('Por Hacer'), equals(['Diseñar la pantalla de inicio', 'Configurar la base de datos'])),
            Ensure.that(ProgresoDelProyecto(), equals(0)),

            MoverTarea.llamada('Diseñar la pantalla de inicio').aLaColumna('Hecho'),
            Ensure.eventually(AvisoVisible.deExito(), containAtLeastOneItemThat(includes('movida a Hecho'))),
            Ensure.eventually(TitulosDeTareasEn('Hecho'), equals(['Diseñar la pantalla de inicio'])),
            Ensure.eventually(TitulosDeTareasEn('Por Hacer'), equals(['Configurar la base de datos'])),
            Ensure.eventually(ProgresoDelProyecto(), equals(50)),
        );
    });

    it('SP-12 Crear una tarea sin título muestra un error y no la crea', async ({ actorCalled }) => {
        await anaEnUnTableroVacio(actorCalled);

        await actorCalled('Ana').attemptsTo(
            ...abrirSuTablero(),
            RellenarNuevaTarea.con('', 'Solo descripción, sin título'),

            Ensure.eventually(MensajeDeError.delTitulo(), includes('Escribe un título para la tarea')),
            Ensure.that(TitulosDeTareasVisibles(), property('length', equals(0))),
        );
    });

    it('SP-13 Eliminar una tarea pide confirmación y se puede deshacer', async ({ actorCalled }) => {
        await anaEnUnTableroVacio(actorCalled);

        await actorCalled('Ana').attemptsTo(
            CrearTareaPorApi.titulada('Tarea temporal'),
            CrearTareaPorApi.titulada('Tarea que se queda'),
            ...abrirSuTablero(),
            Ensure.eventually(TitulosDeTareasEn('Por Hacer'), contain('Tarea temporal')),

            EliminarTarea.llamada('Tarea temporal'),
            Ensure.eventually(AvisoVisible.deExito(), containAtLeastOneItemThat(includes('Tarea "Tarea temporal" eliminada'))),
            Ensure.eventually(TitulosDeTareasVisibles(), equals(['Tarea que se queda'])),

            DeshacerUltimaAccion(),
            Ensure.eventually(TitulosDeTareasEn('Por Hacer'), contain('Tarea temporal')),
            Ensure.eventually(AvisoVisible.deExito(), containAtLeastOneItemThat(includes('Tarea "Tarea temporal" restaurada'))),
        );
    });

    it('SP-14 La búsqueda de tareas tolera tildes y errores de escritura', async ({ actorCalled }) => {
        await anaEnUnTableroVacio(actorCalled);

        await actorCalled('Ana').attemptsTo(
            CrearTareaPorApi.titulada('Configurar autenticación JWT'),
            CrearTareaPorApi.titulada('Diseñar pantalla de inicio'),
            CrearTareaPorApi.titulada('Revisar documentación', 'Actualizar el README'),
            ...abrirSuTablero(),
            Ensure.eventually(TitulosDeTareasVisibles(), property('length', equals(3))),

            BuscarTarea.con('autentificacion'),
            Ensure.eventually(TitulosDeTareasVisibles(), equals(['Configurar autenticación JWT'])),
            Ensure.eventually(ContadorDeResultados(), equals('Mostrando 1 de 3 tareas')),

            BuscarTarea.con('documetacion'),
            Ensure.eventually(TitulosDeTareasVisibles(), equals(['Revisar documentación'])),

            BuscarTarea.con('readme'),
            Ensure.eventually(TitulosDeTareasVisibles(), equals(['Revisar documentación'])),

            BuscarTarea.con('xyzxyz'),
            Ensure.eventually(TitulosDeTareasVisibles(), property('length', equals(0))),
            Ensure.eventually(ContadorDeResultados(), equals('Mostrando 0 de 3 tareas')),
        );
    });

    it('SP-15 Mover una tarea arrastrándola con el teclado hasta «Hecho»', async ({ actorCalled }) => {
        await anaEnUnTableroVacio(actorCalled);

        await actorCalled('Ana').attemptsTo(
            CrearTareaPorApi.titulada('Tarea arrastrada con teclado'),
            ...abrirSuTablero(),
            Ensure.eventually(TitulosDeTareasEn('Por Hacer'), equals(['Tarea arrastrada con teclado'])),

            ArrastrarTareaConTeclado.llamada('Tarea arrastrada con teclado').columnasALaDerecha(2),
            Ensure.eventually(TitulosDeTareasEn('Hecho'), equals(['Tarea arrastrada con teclado'])),
            Ensure.eventually(TitulosDeTareasEn('Por Hacer'), not(contain('Tarea arrastrada con teclado'))),
            Ensure.eventually(ProgresoDelProyecto(), equals(100)),
        );
    });
});
