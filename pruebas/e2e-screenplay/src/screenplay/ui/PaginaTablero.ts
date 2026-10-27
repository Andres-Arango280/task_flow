import { By, PageElement, PageElements } from '@serenity-js/web';
import { Comunes } from './Comunes';

/** Página /proyectos/:id (tablero Kanban) */
export const PaginaTablero = {
    regionDeColumnas: () =>
        PageElement.located(By.role('region', { name: 'Columnas del tablero', exact: true })).describedAs('el tablero'),

    /** Cada columna es un <section aria-labelledby> ⇒ role=region con el nombre de la lista */
    columna: (nombre: string) =>
        PageElement.located(By.role('region', { name: nombre, exact: true }))
            .of(PaginaTablero.regionDeColumnas())
            .describedAs(`la columna «${nombre}»`),

    nombresDeColumnas: () =>
        PageElements.located(By.css('section[aria-labelledby] > header h2'))
            .of(PaginaTablero.regionDeColumnas())
            .describedAs('los nombres de las columnas'),

    titulosDeTareasEn: (columna: string) =>
        PageElements.located(By.css('[data-rfd-draggable-id] button[data-testid="abrir-tarea"] > span:first-child'))
            .of(PaginaTablero.columna(columna))
            .describedAs(`los títulos de las tareas en «${columna}»`),

    titulosDeTareasVisibles: () =>
        PageElements.located(By.css('[data-rfd-draggable-id] button[data-testid="abrir-tarea"] > span:first-child'))
            .of(PaginaTablero.regionDeColumnas())
            .describedAs('los títulos de las tareas visibles'),

    /** El botón principal de la tarjeta se nombra con su texto visible (WCAG 2.5.3): data-testid + título */
    tarjeta: (titulo: string) =>
        PageElement.located(By.xpath(`//button[@data-testid='abrir-tarea'][.//span[normalize-space()='${titulo}']]`))
            .describedAs(`la tarjeta «${titulo}»`),

    asaDeArrastre: (titulo: string) =>
        PageElement.located(By.css(`[aria-label="Arrastrar tarea ${titulo}"]`)).describedAs(`el asa de arrastre de «${titulo}»`),

    barraDeProgreso: () =>
        PageElement.located(By.role('progressbar')).describedAs('la barra de progreso'),

    botonNuevaTarea: () =>
        PageElement.located(By.role('button', { name: 'Nueva tarea', exact: true })).describedAs('el botón «Nueva tarea»'),

    tituloDeNuevaTarea: () =>
        PageElement.located(By.role('textbox', { name: /Título de la tarea/ })).of(Comunes.ventanaModal()).describedAs('el título de la nueva tarea'),
    descripcionDeNuevaTarea: () =>
        PageElement.located(By.role('textbox', { name: /Descripción/ })).of(Comunes.ventanaModal()).describedAs('la descripción de la nueva tarea'),
    botonCrearTarea: () =>
        PageElement.located(By.role('button', { name: 'Crear tarea', exact: true })).of(Comunes.ventanaModal()).describedAs('el botón «Crear tarea»'),
    errorDeTitulo: () =>
        PageElement.located(By.role('alert')).of(Comunes.ventanaModal()).describedAs('el error del título'),

    // Detalle de la tarea
    selectorDeColumna: () =>
        PageElement.located(By.role('combobox', { name: 'Columna', exact: true })).of(Comunes.ventanaModal()).describedAs('el selector de columna'),
    botonEliminar: () =>
        PageElement.located(By.role('button', { name: 'Eliminar', exact: true })).of(Comunes.ventanaModal()).describedAs('el botón «Eliminar»'),
    botonCerrarDetalle: () =>
        PageElement.located(By.role('button', { name: 'Cerrar', exact: true })).of(Comunes.ventanaModal()).describedAs('el botón «Cerrar» del detalle'),

    // Búsqueda y filtros
    buscador: () =>
        PageElement.located(By.role('searchbox', { name: 'Buscar tareas' })).describedAs('el buscador de tareas'),
    contadorDeResultados: () =>
        PageElement.located(By.cssContainingText('[role="search"] p', 'Mostrando')).describedAs('el contador de resultados'),
};
