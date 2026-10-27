import { Interaction } from '@serenity-js/core';
import { BrowseTheWebWithPlaywright, PlaywrightPage } from '@serenity-js/playwright';
import { PaginaTablero } from '../ui';

/**
 * Interacción personalizada: arrastra una tarjeta entre columnas usando el teclado,
 * igual que una persona usuaria de teclado/lector de pantalla
 * (Tab hasta el asa ⇒ Espacio para levantar ⇒ flechas ⇒ Espacio para soltar).
 * Usa la API nativa de Playwright porque Serenity/JS no trae una interacción de arrastre accesible.
 */
export const ArrastrarTareaConTeclado = {
    llamada: (titulo: string) => ({
        columnasALaDerecha: (columnas: number) =>
            Interaction.where(`#actor arrastra con el teclado la tarea «${titulo}» ${columnas} columna(s) a la derecha`, async actor => {
                const pagina = await BrowseTheWebWithPlaywright.as(actor).currentPage() as PlaywrightPage;
                const nativa = await pagina.nativePage();
                const asa = await actor.answer(PaginaTablero.asaDeArrastre(titulo));
                const localizador = await (asa as any).nativeElement();
                await localizador.focus();
                await nativa.keyboard.press('Space');
                for (let i = 0; i < columnas; i++) {
                    await nativa.keyboard.press('ArrowRight');
                }
                await nativa.keyboard.press('Space');
            }),
    }),
};
