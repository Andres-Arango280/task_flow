import { Actor, Cast, TakeNotes } from '@serenity-js/core';
import { BrowseTheWebWithPlaywright } from '@serenity-js/playwright';
import { CallAnApi } from '@serenity-js/rest';
import type { Browser, BrowserContextOptions, Page } from '@playwright/test';

export const URL_API = process.env.TASKFLOW_API_URL ?? 'http://localhost:3000';

/**
 * Elenco (Cast) de TaskFlow:
 *  - «Ana», la líder del equipo: navega con la página principal de Playwright
 *    (así Playwright graba su vídeo, traza y captura).
 *  - «Beto», el miembro, y «Carla», la usuaria ajena: cada uno con su propio
 *    contexto de navegador aislado (sesión independiente) y vídeo propio.
 * Todos pueden llamar a la API REST (CallAnApi) para preparar datos y toman notas (TakeNotes).
 */
export class Elenco implements Cast {
    static readonly ACTOR_PRINCIPAL = 'Ana';

    constructor(
        private readonly browser: Browser,
        private readonly page: Page,
        private readonly opcionesDeContexto: BrowserContextOptions,
    ) {}

    prepare(actor: Actor): Actor {
        const navegar = actor.name === Elenco.ACTOR_PRINCIPAL
            ? BrowseTheWebWithPlaywright.usingPage(this.page, { defaultNavigationWaitUntil: 'load' })
            : BrowseTheWebWithPlaywright.using(this.browser, this.opcionesDeContexto, { defaultNavigationWaitUntil: 'load' });

        return actor.whoCan(
            navegar,
            CallAnApi.at(URL_API),
            TakeNotes.usingAnEmptyNotepad(),
        );
    }
}
