import { After, AfterAll, Before, BeforeAll, setDefaultTimeout } from '@cucumber/cucumber';
import type { ITestCaseHookParameter } from '@cucumber/cucumber';
import { actorInTheSpotlight, ArtifactArchiver, configure, Duration } from '@serenity-js/core';
import { ConsoleReporter } from '@serenity-js/console-reporter';
import { SerenityBDDReporter } from '@serenity-js/serenity-bdd';
import { Page, Photographer, TakePhotosOfFailures, TakePhotosOfInteractions } from '@serenity-js/web';
import { chromium } from 'playwright';
import type { Browser } from 'playwright';
import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { ElencoGherkin } from '../../src/screenplay';
import { reiniciarContexto } from './contexto';

/**
 * Configuración de Serenity/JS para los escenarios Gherkin (Cucumber):
 *  - un navegador Chrome (Playwright) compartido por toda la ejecución;
 *  - un contexto de navegador aislado por actor y por escenario (ElencoGherkin);
 *  - informes: consola, Serenity BDD (JSON → HTML con `serenity-bdd run`) y fotos de fallos
 *    (o de cada interacción con FOTOS=interacciones).
 */
const URL_FRONTEND = process.env.TASKFLOW_URL ?? 'http://localhost:5173';
const DIR_CAPTURAS = join(process.cwd(), 'reportes', 'gherkin', 'capturas');

setDefaultTimeout(120_000);

let navegador: Browser;

BeforeAll(async () => {
    navegador = await chromium.launch({
        channel: 'chrome',
        headless: process.env.HEADED !== '1',
    });

    configure({
        actors: new ElencoGherkin(navegador, {
            baseURL: URL_FRONTEND,
            locale: 'es-ES',
            viewport: { width: 1280, height: 720 },
            ...(process.env.VIDEO === '1'
                ? { recordVideo: { dir: join(process.cwd(), 'reportes', 'gherkin', 'videos'), size: { width: 1280, height: 720 } } }
                : {}),
        }),
        crew: [
            ConsoleReporter.forDarkTerminals(),
            SerenityBDDReporter.fromJSON({ specDirectory: './features' }),
            ArtifactArchiver.storingArtifactsAt('./target/site/serenity-gherkin'),
            Photographer.whoWill(process.env.FOTOS === 'interacciones' ? TakePhotosOfInteractions : TakePhotosOfFailures),
        ],
        interactionTimeout: Duration.ofSeconds(15),
        cueTimeout: Duration.ofSeconds(10),
    });
});

Before(() => {
    reiniciarContexto();
});

/** Captura final del escenario (estado de la pantalla del actor en escena) como evidencia GH-xx.png */
After(async (escenario: ITestCaseHookParameter) => {
    // El identificador del caso es la etiqueta @GH-xx del escenario (o del bloque Examples en un Scenario Outline)
    const id = escenario.pickle.tags.map((t) => t.name).find((t) => /^@GH-\d+$/.test(t))?.slice(1);
    if (!id) {
        return;
    }
    try {
        const actor = actorInTheSpotlight();
        const pagina = await actor.answer(Page.current());
        const base64 = await pagina.takeScreenshot();
        mkdirSync(DIR_CAPTURAS, { recursive: true });
        writeFileSync(join(DIR_CAPTURAS, `${id}.png`), Buffer.from(base64, 'base64'));
    } catch {
        // El actor no abrió ninguna página (escenario solo de API) o la página ya se cerró: no hay captura
    }
});

AfterAll(async () => {
    await navegador?.close();
});
