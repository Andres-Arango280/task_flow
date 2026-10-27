/// <reference types="cypress" />
/// <reference types="@testing-library/cypress" />
import type { UsuarioPrueba, Sesion } from './commands';
import type { mount } from 'cypress/react';

declare global {
  namespace Cypress {
    interface Chainable {
      api(
        method: string,
        ruta: string,
        opciones?: { token?: string; body?: unknown; qs?: Record<string, string> },
      ): Chainable<Response<any>>;
      registrarPorApi(usuario: UsuarioPrueba): Chainable<UsuarioPrueba & { id: string }>;
      tokenPorApi(usuario: UsuarioPrueba): Chainable<string>;
      loginPorApi(usuario: UsuarioPrueba): Chainable<Sesion>;
      usuarioConToken(prefijo?: string): Chainable<{ usuario: UsuarioPrueba & { id: string }; token: string }>;
      crearEquipoApi(token: string, nombre: string): Chainable<any>;
      agregarMiembroApi(token: string, equipoId: string, userId: string): Chainable<any>;
      crearProyectoApi(token: string, equipoId: string, nombre: string): Chainable<any>;
      listasApi(token: string, proyectoId: string): Chainable<any[]>;
      crearTareaApi(token: string, datos: Record<string, unknown>): Chainable<any>;
      escenarioProyecto(prefijo?: string): Chainable<{
        usuario: UsuarioPrueba & { id: string };
        token: string;
        equipo: any;
        proyecto: any;
        listas: any[];
      }>;
      registrarCaso(id: string, obtenido: string, res?: Response<unknown>): Chainable<null>;
      aviso(texto: string | RegExp): Chainable<JQuery<HTMLElement>>;
      esperarBackend(intentosRestantes?: number): Chainable<unknown>;
      mount: typeof mount;
    }
  }
}
