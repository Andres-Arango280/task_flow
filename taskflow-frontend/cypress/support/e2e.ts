// Soporte para pruebas E2E y de API
import '@testing-library/cypress/add-commands';
import 'cypress-mochawesome-reporter/register';
import 'cypress-axe';
import './commands';

// Antes de cada prueba se comprueba que la API está levantada (ver esperarBackend)
beforeEach(() => {
  cy.esperarBackend();
});
