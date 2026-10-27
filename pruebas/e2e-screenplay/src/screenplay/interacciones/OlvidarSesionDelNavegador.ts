import { Interaction } from '@serenity-js/core';
import { Page } from '@serenity-js/web';

/**
 * Interacción personalizada: borra el almacenamiento local y de sesión del navegador del actor
 * (token y usuario), simulando a alguien que no ha iniciado sesión.
 */
export const OlvidarSesionDelNavegador = () =>
    Interaction.where(`#actor borra la sesión guardada en su navegador`, async actor => {
        const pagina = await actor.answer(Page.current());
        await pagina.executeScript(() => {
            window.localStorage.clear();
            window.sessionStorage.clear();
        });
    });
