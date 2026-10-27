import { By, PageElement } from '@serenity-js/web';

/** Página /preferencias */
export const PaginaPreferencias = {
    interruptorAltoContraste: () =>
        PageElement.located(By.role('switch', { name: 'Alto contraste', exact: true })).describedAs('el interruptor «Alto contraste»'),
    opcionTamanoTexto: (etiqueta: string) =>
        PageElement.located(By.xpath(`//fieldset//label[starts-with(normalize-space(.), "${etiqueta}")]`))
            .describedAs(`la opción de tamaño «${etiqueta}»`),
    botonRestablecer: () =>
        PageElement.located(By.role('button', { name: 'Restablecer valores por defecto', exact: true }))
            .describedAs('el botón «Restablecer valores por defecto»'),
    avisoValoresPorDefecto: () =>
        PageElement.located(By.cssContainingText('span', 'Estás usando los valores por defecto')).describedAs('el aviso de valores por defecto'),
};

/** Barra de navegación principal (visible con sesión iniciada) */
export const BarraDeNavegacion = {
    barra: () =>
        PageElement.located(By.role('navigation', { name: 'Navegación principal' })).describedAs('la barra de navegación'),
    enlace: (texto: string) =>
        PageElement.located(By.role('link', { name: texto, exact: true })).of(BarraDeNavegacion.barra()).describedAs(`el enlace «${texto}»`),
    botonSalir: () =>
        PageElement.located(By.role('button', { name: 'Salir', exact: true })).of(BarraDeNavegacion.barra()).describedAs('el botón «Salir»'),
};
