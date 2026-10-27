import { estaVisible } from '../expectativas';
import { Task, Wait } from '@serenity-js/core';
import { contain, isPresent, not } from '@serenity-js/assertions';
import { Clear, Click, Enter, Select, Text } from '@serenity-js/web';
import { Comunes, PaginaTablero } from '../ui';

/** Abre «Nueva tarea», escribe título (y descripción) y pulsa «Crear tarea». */
export const RellenarNuevaTarea = {
    con: (titulo: string, descripcion?: string) =>
        Task.where(`#actor rellena la nueva tarea «${titulo}»`,
            Wait.until(PaginaTablero.botonNuevaTarea(), estaVisible()),
            Click.on(PaginaTablero.botonNuevaTarea()),
            Wait.until(Comunes.ventanaModal(), estaVisible()),
            ...(titulo ? [Enter.theValue(titulo).into(PaginaTablero.tituloDeNuevaTarea())] : []),
            ...(descripcion ? [Enter.theValue(descripcion).into(PaginaTablero.descripcionDeNuevaTarea())] : []),
            Click.on(PaginaTablero.botonCrearTarea()),
        ),
};

export const CrearTarea = {
    titulada: (titulo: string, descripcion?: string) =>
        Task.where(`#actor crea la tarea «${titulo}»`,
            RellenarNuevaTarea.con(titulo, descripcion),
            Wait.until(PaginaTablero.tarjeta(titulo), estaVisible()),
        ),
};

export const AbrirDetalleDeTarea = {
    llamada: (titulo: string) =>
        Task.where(`#actor abre el detalle de la tarea «${titulo}»`,
            Click.on(PaginaTablero.tarjeta(titulo)),
            Wait.until(PaginaTablero.selectorDeColumna(), estaVisible()),
        ),
};

/** Mueve una tarea cambiando su columna desde el detalle (alternativa accesible al arrastre). */
export const MoverTarea = {
    llamada: (titulo: string) => ({
        aLaColumna: (columna: string) =>
            Task.where(`#actor mueve la tarea «${titulo}» a «${columna}»`,
                AbrirDetalleDeTarea.llamada(titulo),
                Select.option(columna).from(PaginaTablero.selectorDeColumna()),
                Wait.until(Text.ofAll(PaginaTablero.titulosDeTareasEn(columna)), contain(titulo)),
                Click.on(PaginaTablero.botonCerrarDetalle()),
                Wait.until(Comunes.ventanaModal(), not(isPresent())),
            ),
    }),
};

export const EliminarTarea = {
    llamada: (titulo: string) =>
        Task.where(`#actor elimina la tarea «${titulo}» confirmando la acción`,
            AbrirDetalleDeTarea.llamada(titulo),
            Click.on(PaginaTablero.botonEliminar()),
            Wait.until(Comunes.ventanaDeConfirmacion(), estaVisible()),
            Click.on(Comunes.botonEnVentanaDeConfirmacion('Eliminar tarea')),
            Wait.until(PaginaTablero.tarjeta(titulo), not(isPresent())),
        ),
};

/** Pulsa «Deshacer» en el aviso emergente de la última acción. */
export const DeshacerUltimaAccion = () =>
    Task.where(`#actor deshace la última acción desde el aviso`,
        Wait.until(Comunes.botonDeshacer(), estaVisible()),
        Click.on(Comunes.botonDeshacer()),
    );

export const BuscarTarea = {
    con: (texto: string) =>
        Task.where(`#actor busca «${texto}» en el tablero`,
            Clear.theValueOf(PaginaTablero.buscador()),
            Enter.theValue(texto).into(PaginaTablero.buscador()),
        ),
};
