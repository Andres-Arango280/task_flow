#!/usr/bin/env node
// Valida contra la aplicación en ejecución los XPath del Object Repository de Katalon que dependen de
// datos (tarjeta de equipo, tarjeta de proyecto, tarjeta de tarea, aviso de éxito y requisitos de contraseña), sin Katalon Studio.
// Usa Playwright (instalado en pruebas/e2e-screenplay) y el Chrome del sistema.
//
// Uso (desde la raíz del repositorio, con backend :3000 y frontend :5173 en marcha):
//   node pruebas/katalon/validar-xpaths.cjs
// Resultado: pruebas/evidencias/katalon/validacion-xpaths.json
'use strict';
const fs = require('fs');
const path = require('path');
const { chromium } = require(path.join(__dirname, '..', 'e2e-screenplay', 'node_modules', 'playwright'));

const API = process.env.API_URL || 'http://localhost:3000';
const WEB = process.env.WEB_URL || 'http://localhost:5173';
const CHROME = process.env.CHROME_PATH || 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const OR = path.join(__dirname, 'TaskFlow-Katalon', 'Object Repository');
const SALIDA = path.join(__dirname, '..', 'evidencias', 'katalon', 'validacion-xpaths.json');

async function api(metodo, ruta, cuerpo, token) {
  const r = await fetch(API + ruta, {
    method: metodo,
    headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
    body: cuerpo ? JSON.stringify(cuerpo) : undefined,
  });
  const texto = await r.text();
  return { status: r.status, body: texto ? JSON.parse(texto) : null };
}

/** Lee el XPath de un .rs y sustituye los parámetros ${x} */
function xpath(objeto, parametros = {}) {
  const xml = fs.readFileSync(path.join(OR, `${objeto}.rs`), 'utf8');
  const m = xml.match(/<key>XPATH<\/key>\s*<value>([^<]*)<\/value>/);
  if (!m) throw new Error(`Sin XPATH en ${objeto}`);
  const valor = m[1].replace(/&quot;/g, '"').replace(/&apos;/g, "'").replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&amp;/g, '&');
  return valor.replace(/\$\{(\w+)\}/g, (_, k) => parametros[k]);
}

(async () => {
  const marca = Date.now();
  const email = `katalon.xpath.${marca}@correo-pruebas.com`;
  const password = 'Clave123';
  const reg = await api('POST', '/auth/register', { nombre: 'Validador XPath', email, password });
  const { access_token: token } = (await api('POST', '/auth/login', { email, password })).body;
  const equipo = (await api('POST', '/equipos', { nombre: `Equipo XPath ${marca}` }, token)).body;
  const proyecto = (await api('POST', '/proyectos', { nombre: `Proyecto XPath ${marca}`, equipoId: equipo.id }, token)).body;
  const listas = (await api('GET', `/listas/proyecto/${proyecto.id}`, null, token)).body;
  const porHacer = listas.find((l) => l.nombre === 'Por Hacer');
  const titulo = 'Tarea XPath Katalon';
  await api('POST', '/tareas', { titulo, descripcion: 'Descripción de prueba', listaId: porHacer.id }, token);

  const navegador = await chromium.launch({ executablePath: CHROME, headless: true });
  const page = await navegador.newPage();
  const resultados = [];
  const comprobar = async (objeto, parametros, esperado = 1) => {
    const xp = xpath(objeto, parametros);
    const loc = page.locator(`xpath=${xp}`);
    await loc.first().waitFor({ state: 'attached', timeout: 10000 }).catch(() => {});
    const n = await loc.count();
    const visible = n > 0 ? await loc.first().isVisible() : false;
    resultados.push({ objeto, parametros, xpath: xp, coincidencias: n, visible, ok: n === esperado });
  };
  try {
    await page.goto(`${WEB}/login`);
    await page.evaluate(([t, u]) => {
      localStorage.setItem('access_token', t);
      localStorage.setItem('user', JSON.stringify(u));
    }, [token, { id: reg.body.id, nombre: reg.body.nombre, email }]);

    // Página de inicio
    await page.goto(`${WEB}/`);
    await comprobar('Page_Inicio/link_EquipoPorNombre', { nombre: equipo.nombre });
    await comprobar('Page_Inicio/link_EquipoLider', { nombre: equipo.nombre });
    await comprobar('Page_Inicio/link_EquipoPorNombre', { nombre: 'Equipo que no existe' }, 0);

    // Vista del equipo: tarjeta de proyecto
    await page.goto(`${WEB}/equipos/${equipo.id}`);
    await comprobar('Page_Equipo/link_ProyectoPorNombre', { nombre: proyecto.nombre });
    await comprobar('Page_Equipo/link_ProyectoPorNombre', { nombre: 'Proyecto que no existe' }, 0);

    // Tablero
    await page.goto(`${WEB}/proyectos/${proyecto.id}`);
    await comprobar('Page_Tablero/btn_AbrirDetalle', { titulo });
    await comprobar('Page_Tablero/card_Tarea', { titulo });
    await comprobar('Page_Tablero/card_TareaEnColumna', { titulo, columna: 'Por Hacer' });
    await comprobar('Page_Tablero/card_TareaEnColumna', { titulo, columna: 'Hecho' }, 0);

    // Aviso de éxito ("Listo"): mover la tarea desde el detalle
    await page.locator(`xpath=${xpath('Page_Tablero/btn_AbrirDetalle', { titulo })}`).click();
    await page.getByRole('dialog').getByLabel('Columna').selectOption({ label: 'Hecho' });
    await comprobar('Comunes/toast_Exito', { texto: 'movida a Hecho' });

    // Requisitos de contraseña del registro
    const p2 = await navegador.newPage();
    await p2.goto(`${WEB}/register`);
    await p2.getByLabel(/Nombre completo/).fill('Usuario Contrasena Corta');
    await p2.getByLabel(/Correo electrónico/).fill(`katalon.corta.${marca}@correo-pruebas.com`);
    await p2.getByLabel(/^Contraseña/).fill('abc');
    await p2.getByLabel(/Confirmar contraseña/).fill('abc');
    const req = async (requisito, estado) => {
      const xp = xpath('Page_Registro/li_RequisitoConEstado', { requisito, estado });
      const n = await p2.locator(`xpath=${xp}`).count();
      resultados.push({ objeto: 'Page_Registro/li_RequisitoConEstado', parametros: { requisito, estado, contrasena: 'abc' }, xpath: xp, coincidencias: n, ok: n === 1 });
    };
    await req('Al menos 8 caracteres', 'pendiente');
    await req('Al menos una letra', 'cumplido');
    await req('Al menos un número', 'pendiente');
    await p2.getByRole('button', { name: 'Crear cuenta' }).click();
    const xpAlerta = xpath('Page_Registro/alert_Error');
    await p2.locator(`xpath=${xpAlerta}`).first().waitFor({ timeout: 10000 });
    const alerta = (await p2.locator(`xpath=${xpAlerta}`).first().textContent())?.trim();
    resultados.push({ objeto: 'Page_Registro/alert_Error', parametros: { contrasena: 'abc' }, texto: alerta, ok: alerta === 'La contraseña debe tener al menos 8 caracteres, con al menos una letra y un número.' });
  } finally {
    await navegador.close();
    // Limpieza: elimina el usuario de prueba (y con él sus datos asociados si la API lo permite)
    await api('DELETE', `/equipos/${equipo.id}`, null, token).catch(() => {});
    await api('DELETE', '/usuarios/me', null, token).catch(() => {});
  }
  const ok = resultados.every((r) => r.ok);
  fs.writeFileSync(SALIDA, JSON.stringify({ fecha: new Date().toISOString(), herramienta: 'Playwright (validación de XPath de Katalon sin Katalon Studio)', ok, resultados }, null, 2) + '\n');
  for (const r of resultados) console.log(`${r.ok ? 'OK  ' : 'FALLA'} ${r.objeto} ${JSON.stringify(r.parametros)} → ${r.coincidencias ?? r.texto}`);
  console.log(ok ? '\nTodos los XPath validados.' : '\nHay XPath que no coinciden.');
  process.exit(ok ? 0 : 1);
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
