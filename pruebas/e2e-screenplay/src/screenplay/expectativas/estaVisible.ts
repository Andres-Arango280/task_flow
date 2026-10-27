import { Expectation } from '@serenity-js/core';
import { PageElement } from '@serenity-js/web';

/**
 * Expectativa propia: el elemento está renderizado y visible para Playwright
 * (aunque haya que desplazarse para verlo).
 *
 * Se usa en lugar de `isVisible()` de Serenity/JS porque esta exige además que el elemento
 * esté dentro del viewport y sin nada encima, lo que produce falsos negativos cuando un aviso
 * emergente tapa el centro del elemento o cuando el texto agrandado lo empuja fuera de pantalla.
 */
export const estaVisible = Expectation.define(
    'estaVisible',
    'become visible',
    async (actual: PageElement) => {
        if (! await actual.isPresent()) {
            return false;
        }
        const localizador = await actual.nativeElement() as unknown as { isVisible(): Promise<boolean> };
        return localizador.isVisible();
    },
);
