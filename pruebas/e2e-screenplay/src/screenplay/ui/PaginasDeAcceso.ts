import { By, PageElement } from '@serenity-js/web';
import { campoConEtiqueta } from './Comunes';

/** Página /login */
export const PaginaInicioSesion = {
    correo: () => campoConEtiqueta('Correo electrónico'),
    contrasena: () => campoConEtiqueta('Contraseña'),
    botonIniciarSesion: () =>
        PageElement.located(By.role('button', { name: 'Iniciar sesión', exact: true })).describedAs('el botón «Iniciar sesión»'),
    mensajeCuentaCreada: () =>
        PageElement.located(By.cssContainingText('main [role="status"]', 'Cuenta creada')).describedAs('el mensaje «Cuenta creada»'),
    mensajeDeError: () =>
        PageElement.located(By.css('form [role="alert"]')).describedAs('el mensaje de error del inicio de sesión'),
};

/** Página /register */
export const PaginaRegistro = {
    nombreCompleto: () => campoConEtiqueta('Nombre completo'),
    correo: () => campoConEtiqueta('Correo electrónico'),
    contrasena: () => campoConEtiqueta('Contraseña'),
    confirmarContrasena: () => campoConEtiqueta('Confirmar contraseña'),
    botonCrearCuenta: () =>
        PageElement.located(By.role('button', { name: 'Crear cuenta', exact: true })).describedAs('el botón «Crear cuenta»'),
    mensajeDeError: () =>
        PageElement.located(By.css('form [role="alert"]')).describedAs('el mensaje de error del registro'),
};
