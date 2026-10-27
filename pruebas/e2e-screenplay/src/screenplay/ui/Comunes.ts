import { By, PageElement, PageElements } from '@serenity-js/web';

/**
 * Localiza un campo de formulario por el texto de su <label> (empieza por `etiqueta`).
 * Las etiquetas de TaskFlow añaden "* (obligatorio)" al final, por eso se usa starts-with.
 */
export const campoConEtiqueta = (etiqueta: string) =>
    PageElement.located(
        By.xpath(`//*[@id = //label[starts-with(normalize-space(.), "${etiqueta}")]/@for]`),
    ).describedAs(`el campo «${etiqueta}»`);

/** Elementos compartidos por todas las páginas (ventanas modales, avisos, confirmaciones). */
export const Comunes = {
    ventanaModal: () =>
        PageElement.located(By.role('dialog')).describedAs('la ventana modal'),

    ventanaDeConfirmacion: () =>
        PageElement.located(By.role('alertdialog')).describedAs('la ventana de confirmación'),

    botonEnVentanaDeConfirmacion: (texto: string) =>
        PageElement.located(By.role('button', { name: texto, exact: true }))
            .of(Comunes.ventanaDeConfirmacion())
            .describedAs(`el botón «${texto}» de la confirmación`),

    /** Avisos emergentes (toasts) de éxito/información: role=status dentro de la región aria-live */
    avisos: () =>
        PageElements.located(By.css('[aria-live="polite"][aria-atomic="false"] > [role="status"]'))
            .describedAs('los avisos emergentes'),

    /** Avisos emergentes de error: role=alert dentro de la región aria-live */
    avisosDeError: () =>
        PageElements.located(By.css('[aria-live="polite"][aria-atomic="false"] > [role="alert"]'))
            .describedAs('los avisos de error'),

    botonDeshacer: () =>
        PageElement.located(By.role('button', { name: 'Deshacer', exact: true }))
            .of(PageElement.located(By.css('[aria-live="polite"][aria-atomic="false"]')))
            .describedAs('el botón «Deshacer» del aviso'),

    alerta: () =>
        PageElement.located(By.css('main [role="alert"], [role="dialog"] [role="alert"]')).describedAs('la alerta de error'),

    encabezadoPrincipal: () =>
        PageElement.located(By.css('h1')).describedAs('el encabezado principal'),

    raizDelDocumento: () =>
        PageElement.located(By.css('html')).describedAs('el documento'),
};
