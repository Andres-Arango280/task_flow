import { Answerable, Interaction } from '@serenity-js/core';
import { CallAnApi } from '@serenity-js/rest';

/**
 * Interacción personalizada: añade el encabezado «Authorization: Bearer <token>»
 * a todas las llamadas que el actor haga a la API a partir de ahora.
 */
export const AutenticarLlamadasApi = {
    con: (token: Answerable<string>) =>
        Interaction.where(`#actor autentica sus llamadas a la API`, async actor => {
            const valor = await actor.answer(token);
            CallAnApi.as(actor).modifyConfig(config => {
                config.headers.common = { ...(config.headers.common as object), Authorization: `Bearer ${valor}` } as any;
            });
        }),
};
