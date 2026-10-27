import { defineConfig } from '@playwright/test';

/**
 * Proyecto Playwright mínimo para los Test Agents (Planner, Generator, Healer).
 * TaskFlow: frontend http://localhost:5173 · API http://localhost:3000
 */
export default defineConfig({
  testDir: './tests',
  outputDir: './test-results',
  timeout: 60_000,
  expect: { timeout: 10_000 },
  fullyParallel: false,
  workers: 1,
  retries: 0,
  reporter: [
    ['list'],
    ['html', { outputFolder: 'reportes/html', open: 'never' }],
    ['json', { outputFile: 'reportes/resultados.json' }],
  ],
  use: {
    baseURL: process.env.TASKFLOW_URL ?? 'http://localhost:5173',
    channel: 'chrome',
    headless: true,
    viewport: { width: 1280, height: 720 },
    locale: 'es-ES',
    screenshot: 'on',
    trace: 'retain-on-failure',
  },
});
