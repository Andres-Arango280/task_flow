import { estaVisible } from '../src/screenplay/expectativas';
import { containAtLeastOneItemThat, Ensure, equals, includes } from '@serenity-js/assertions';
import { isSelected, Navigate } from '@serenity-js/web';
import { describe, it } from '../src/screenplay/test';
import {
    AbrirPreferencias, AvisoVisible, CambiarPreferencias, credencialesPara, IniciarSesion, ModoDeContraste, PaginaMisEquipos,
    PaginaPreferencias, RegistrarUsuarioPorApi, RestablecerPreferencias, TamanoDeTexto,
} from '../src/screenplay';
import { Wait } from '@serenity-js/core';

describe('Preferencias de accesibilidad', () => {

    it('SP-18 Activar alto contraste y texto grande, y restablecer los valores por defecto', async ({ actorCalled }) => {
        await actorCalled('Ana').attemptsTo(
            RegistrarUsuarioPorApi.con(credencialesPara('Ana')),
            IniciarSesion.conSusCredenciales(),
            AbrirPreferencias(),
            Ensure.that(ModoDeContraste(), equals('normal')),
            Ensure.that(TamanoDeTexto(), equals('normal')),

            CambiarPreferencias.activandoAltoContraste(),
            CambiarPreferencias.conTamanoDeTexto('Grande'),
            Ensure.eventually(ModoDeContraste(), equals('alto')),
            Ensure.eventually(TamanoDeTexto(), equals('grande')),
            Ensure.that(PaginaPreferencias.interruptorAltoContraste(), isSelected()),

            // Las preferencias se mantienen al navegar por la aplicación
            Navigate.to('/'),
            Wait.until(PaginaMisEquipos.titulo(), estaVisible()),
            Ensure.that(ModoDeContraste(), equals('alto')),

            AbrirPreferencias(),
            RestablecerPreferencias(),
            Ensure.eventually(ModoDeContraste(), equals('normal')),
            Ensure.eventually(TamanoDeTexto(), equals('normal')),
            Ensure.eventually(AvisoVisible.deExito(), containAtLeastOneItemThat(includes('Se restablecieron los valores por defecto'))),
            Ensure.eventually(PaginaPreferencias.avisoValoresPorDefecto(), estaVisible()),
        );
    });
});
