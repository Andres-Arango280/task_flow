// Configuración de Cucumber para los escenarios Gherkin de TaskFlow (Serenity/JS + Playwright).
// Los archivos .feature están en features/, los pasos en features/step_definitions/ y la
// configuración de Serenity/JS (actores, navegador, informes) en features/support/.
// tsx compila los .ts al vuelo (esbuild) usando tsconfig.cucumber.json (CommonJS)
process.env.TSX_TSCONFIG_PATH = process.env.TSX_TSCONFIG_PATH || 'tsconfig.cucumber.json';

module.exports = {
    default: {
        requireModule: ['tsx/cjs'],
        require: ['features/support/**/*.ts', 'features/step_definitions/**/*.ts'],
        paths: ['features/**/*.feature'],
        format: [
            '@serenity-js/cucumber',
            'json:reportes/gherkin/cucumber.json',
            'html:reportes/gherkin/cucumber.html',
        ],
        formatOptions: { specDirectory: './features' },
        // Un escenario a la vez: la base de datos es compartida y así los vídeos/capturas quedan ordenados
        parallel: 0,
    },
};
