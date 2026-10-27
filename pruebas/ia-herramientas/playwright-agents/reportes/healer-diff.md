# Agente Healer — diagnóstico y corrección de `tests/healer-demo.spec.ts`

Flujo seguido (según `.claude/agents/playwright-test-healer.md`): ejecutar → depurar la prueba fallida →
investigar el error con el snapshot de la página → causa raíz → corregir el código → volver a ejecutar.

## 1. Ejecución inicial (`reportes/healer-antes.json`)

```
1 failed
  tests/healer-demo.spec.ts › Autenticación (healer) › Inicio de sesión con credenciales válidas (copia para el healer)
  status: timedOut — Test timeout of 60000ms exceeded.
  paso bloqueado: page.locator('#email').fill(...)  → waiting for locator('#email')
```

## 2. Investigación

Snapshot de accesibilidad de `/login` (`specs/exploracion/01-login.txt`):

```
- heading "Iniciar sesión" [level=1]
- textbox "Correo electrónico (obligatorio)"
- textbox "Contraseña (obligatorio)"
- button "Mostrar contraseña"
- button "Iniciar sesión"
```

No existe ningún elemento con `id="email"`, `id="password"` ni con la clase `btn-login`: la prueba dependía de
atributos de implementación que la interfaz no expone (o que cambiaron). Los campos sí tienen etiquetas
`<label>` visibles y el botón un nombre accesible estable.

## 3. Causa raíz

Localizadores frágiles acoplados a ids/clases CSS. Playwright recomienda localizar por rol y nombre accesible
o por etiqueta, que es lo que el usuario ve y lo que el snapshot expone.

## 4. Corrección aplicada (diff)

```diff
-    await page.locator('#email').fill(usuario.email);
-    await page.locator('#password').fill(usuario.password);
-    await page.locator('button.btn-login').click();
+    await page.getByLabel(/Correo electrónico/).fill(usuario.email);
+    await page.getByLabel(/^Contraseña/).fill(usuario.password);
+    await page.getByRole('button', { name: 'Iniciar sesión' }).click();
```

## 5. Verificación (`reportes/healer-despues.json`)

```
1 passed (7.6 s)
```

La prueba vuelve a pasar sin tocar la aplicación. La corrección es la misma que usan las pruebas generadas por
el Generator, así toda la suite comparte localizadores resistentes a cambios de estilo.
