import { Actor, Cast, TakeNotes } from '@serenity-js/core';
import { BrowseTheWebWithPlaywright } from '@serenity-js/playwright';
import { CallAnApi } from '@serenity-js/rest';
import type { Browser, BrowserContextOptions } from 'playwright';
import { URL_API } from './Elenco';

/**
 * Elenco (Cast) para los escenarios Gherkin ejecutados con Cucumber.
 * A diferencia del elenco de Playwright Test, aquí no existe una «página principal» inyectada,
 * así que todos los actores (Ana, Beto, Carla…) reciben su propio contexto de navegador aislado.
 * Mantienen las mismas habilidades que en la suite Screenplay: navegar, llamar a la API y tomar notas.
 */
export class ElencoGherkin implements Cast {
    constructor(
        private readonly browser: Browser,
        private readonly opcionesDeContexto: BrowserContextOptions,
    ) {}

    prepare(actor: Actor): Actor {
        return actor.whoCan(
            BrowseTheWebWithPlaywright.using(this.browser, this.opcionesDeContexto, { defaultNavigationWaitUntil: 'load' }),
            CallAnApi.at(URL_API),
            TakeNotes.usingAnEmptyNotepad(),
        );
    }
}
