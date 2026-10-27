// Soporte para pruebas de componentes: estilos reales de la app + mount de React
import '@testing-library/cypress/add-commands';
import 'cypress-mochawesome-reporter/register';
import { mount } from 'cypress/react';
import '../../src/index.css';
import './commands';

Cypress.Commands.add('mount', mount);
