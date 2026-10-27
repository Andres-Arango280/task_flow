import type { Browser, BrowserContextOptions, Page, TestInfo, ViewportSize } from '@playwright/test';
import { useFixtures } from '@serenity-js/playwright-test';
import { Elenco } from './actores';

interface DependenciasDelElenco {
    browser: Browser;
    page: Page;
    contextOptions: BrowserContextOptions;
    baseURL: string | undefined;
    viewport: ViewportSize | null;
}

/**
 * API de pruebas con el elenco de TaskFlow inyectado como fixture «actors».
 * Ana usa la página de Playwright; el resto de actores, contextos de navegador propios (con vídeo).
 */
export const { describe, it, beforeEach, afterEach } = useFixtures<object>({
    actors: async (
        { browser, page, contextOptions, baseURL, viewport }: DependenciasDelElenco,
        use: (elenco: Elenco) => Promise<void>,
        testInfo: TestInfo,
    ) => {
        await use(new Elenco(browser, page, {
            ...contextOptions,
            baseURL,
            viewport,
            locale: 'es-ES',
            recordVideo: { dir: testInfo.outputPath('videos-otros-actores'), size: { width: 1280, height: 720 } },
        }));
    },
} as any);
