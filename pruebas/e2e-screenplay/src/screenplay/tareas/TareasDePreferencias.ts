import { estaVisible } from '../expectativas';
import { Task, Wait } from '@serenity-js/core';
import { not } from '@serenity-js/assertions';
import { Click, Navigate } from '@serenity-js/web';
import { BarraDeNavegacion, Comunes, PaginaPreferencias } from '../ui';

export const AbrirPreferencias = () =>
    Task.where(`#actor abre sus preferencias`,
        Click.on(BarraDeNavegacion.enlace('Preferencias')),
        Wait.until(PaginaPreferencias.interruptorAltoContraste(), estaVisible()),
    );

export const CambiarPreferencias = {
    activandoAltoContraste: () =>
        Task.where(`#actor activa el alto contraste`,
            Click.on(PaginaPreferencias.interruptorAltoContraste()),
        ),
    conTamanoDeTexto: (etiqueta: 'Normal' | 'Grande' | 'Muy grande') =>
        Task.where(`#actor elige el tamaño de texto «${etiqueta}»`,
            Click.on(PaginaPreferencias.opcionTamanoTexto(etiqueta)),
        ),
};

export const RestablecerPreferencias = () =>
    Task.where(`#actor restablece los valores por defecto confirmando la acción`,
        Click.on(PaginaPreferencias.botonRestablecer()),
        Wait.until(Comunes.ventanaDeConfirmacion(), estaVisible()),
        Click.on(Comunes.botonEnVentanaDeConfirmacion('Restablecer')),
        Wait.until(Comunes.ventanaDeConfirmacion(), not(estaVisible())),
    );

export const VisitarPagina = {
    en: (ruta: string) =>
        Task.where(`#actor visita ${ruta}`, Navigate.to(ruta)),
};
