import { defineConfig } from '@playwright/test';
import type { SerenityFixtures, SerenityWorkerFixtures } from '@serenity-js/playwright-test';

/**
 * Configuración de Playwright Test + Serenity/JS para las pruebas Screenplay de TaskFlow.
 * - Frontend (Vite): http://localhost:5173 · Backend (NestJS): http://localhost:3000
 * - Navegador: Google Chrome instalado (channel 'chrome'), sin descargar navegadores.
 */
export default defineConfig<SerenityFixtures, SerenityWorkerFixtures>({
    testDir: './specs',
    outputDir: './test-results',
    timeout: 90_000,
    expect: { timeout: 10_000 },
    fullyParallel: false,
    workers: Number(process.env.WORKERS ?? 2),
    // 1 reintento solo para absorber recargas ajenas del servidor de desarrollo (Vite HMR); los casos reintentados se marcan como «flaky» en el resumen
    retries: Number(process.env.RETRIES ?? 1),
    reporter: [
        ['line'],
        ['html', { outputFolder: 'reportes/playwright-html', open: 'never' }],
        ['json', { outputFile: 'reportes/resultados-playwright.json' }],
        ['@serenity-js/playwright-test', {
            crew: [
                ['@serenity-js/console-reporter', { theme: 'auto' }],
                ['@serenity-js/serenity-bdd', { specDirectory: './specs' }],
                ['@serenity-js/core:ArtifactArchiver', { outputDirectory: './target/site/serenity' }],
            ],
        }],
    ],
    use: {
        baseURL: process.env.TASKFLOW_URL ?? 'http://localhost:5173',
        channel: 'chrome',
        headless: true,
        viewport: { width: 1280, height: 720 },
        locale: 'es-ES',
        screenshot: 'on',
        video: 'on',
        // Traza completa (DOM + red + consola) de cada prueba; sin capturas dentro de la traza para que pese menos (ya hay vídeo)
        trace: { mode: 'on', screenshots: false, snapshots: true, sources: true },
        actionTimeout: 15_000,
        navigationTimeout: 30_000,

        // Serenity/JS
        defaultActorName: 'Ana',
        interactionTimeout: 15_000,
        cueTimeout: 10_000,
        crew: [
            // Fotógrafo de Serenity/JS: por defecto fotografía los fallos (más estable cuando la máquina está cargada);
            // con FOTOS=interacciones fotografía cada interacción para la documentación viva.
            ['@serenity-js/web:Photographer', {
                strategy: process.env.FOTOS === 'interacciones' ? 'TakePhotosOfInteractions' : 'TakePhotosOfFailures',
            }],
        ],
    },
});
