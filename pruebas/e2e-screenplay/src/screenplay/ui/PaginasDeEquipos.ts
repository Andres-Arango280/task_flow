
import { By, PageElement, PageElements } from '@serenity-js/web';
import { campoConEtiqueta, Comunes } from './Comunes';

/** Página / («Mis equipos») */
export const PaginaMisEquipos = {
    titulo: () =>
        PageElement.located(By.role('heading', { name: 'Mis equipos', level: 1 })).describedAs('el título «Mis equipos»'),
    botonNuevoEquipo: () =>
        PageElement.located(By.role('button', { name: 'Nuevo equipo', exact: true })).describedAs('el botón «Nuevo equipo»'),
    nombreDelEquipo: () => campoConEtiqueta('Nombre del equipo').of(Comunes.ventanaModal()),
    botonCrearEquipo: () =>
        PageElement.located(By.role('button', { name: 'Crear equipo', exact: true }))
            .of(Comunes.ventanaModal())
            .describedAs('el botón «Crear equipo»'),
    /** La tarjeta no tiene aria-label (WCAG 2.5.3): se localiza por data-testid y el nombre visible del equipo */
    tarjetaDeEquipo: (nombre: string) =>
        PageElement.located(By.xpath(`//a[@data-testid='tarjeta-equipo'][.//h3[normalize-space()='${nombre}']]`))
            .describedAs(`la tarjeta del equipo ${nombre}`),
    nombresDeEquipos: () =>
        PageElements.located(By.css('section[aria-labelledby="titulo-equipos"] li h3')).describedAs('los nombres de los equipos'),
};

/** Página /equipos/:id */
export const PaginaEquipo = {
    migas: () =>
        PageElement.located(By.role('navigation', { name: 'Ruta de navegación' })).describedAs('la ruta de navegación'),
    botonNuevoProyecto: () =>
        PageElement.located(By.role('button', { name: 'Nuevo proyecto', exact: true })).describedAs('el botón «Nuevo proyecto»'),
    nombreDelProyecto: () => campoConEtiqueta('Nombre del proyecto').of(Comunes.ventanaModal()),
    botonCrearProyecto: () =>
        PageElement.located(By.role('button', { name: 'Crear proyecto', exact: true }))
            .of(Comunes.ventanaModal())
            .describedAs('el botón «Crear proyecto»'),
    /** La tarjeta de proyecto no tiene aria-label (WCAG 2.5.3): se localiza por data-testid y el nombre visible del proyecto */
    enlaceAlTablero: (proyecto: string) =>
        PageElement.located(By.xpath(`//a[@data-testid='tarjeta-proyecto'][.//span[normalize-space()='${proyecto}']]`))
            .describedAs(`el enlace al tablero ${proyecto}`),

    seccionMiembros: () =>
        PageElement.located(By.css('section[aria-labelledby="titulo-miembros"]')).describedAs('la sección de miembros'),
    botonInvitar: () =>
        PageElement.located(By.role('button', { name: 'Invitar', exact: true })).describedAs('el botón «Invitar»'),
    correoAInvitar: () => campoConEtiqueta('Correo electrónico').of(Comunes.ventanaModal()),
    botonBuscar: () =>
        PageElement.located(By.role('button', { name: 'Buscar', exact: true }))
            .of(Comunes.ventanaModal())
            .describedAs('el botón «Buscar»'),
    botonAnadirAlEquipo: () =>
        PageElement.located(By.role('button', { name: 'Añadir al equipo', exact: true }))
            .of(Comunes.ventanaModal())
            .describedAs('el botón «Añadir al equipo»'),
    errorEnVentana: () =>
        PageElement.located(By.role('alert')).of(Comunes.ventanaModal()).describedAs('el error de la ventana de invitación'),
    correosDeMiembros: () =>
        PageElements.located(By.css('li div.min-w-0 > p:nth-of-type(2)'))
            .of(PaginaEquipo.seccionMiembros())
            .describedAs('los correos de los miembros'),
    botonQuitarMiembro: (nombre: string) =>
        PageElement.located(By.role('button', { name: `Quitar a ${nombre} del equipo` }))
            .describedAs(`el botón para quitar a ${nombre}`),
};
