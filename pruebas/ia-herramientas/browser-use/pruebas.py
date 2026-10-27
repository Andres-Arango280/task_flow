"""
Pruebas de TaskFlow con Browser Use (agente de navegador dirigido por un LLM) usando un modelo
local de Ollama (llama3.1:8b), sin claves de pago.

Uso:  .venv\\Scripts\\python pruebas.py            (todos los casos)
      .venv\\Scripts\\python pruebas.py BU-02      (un caso)

Cada caso define la tarea en lenguaje natural para el agente, y la VERIFICACIÓN la hace este script
en código (URL final, texto del resultado, consulta a la API), para no depender solo de lo que diga el modelo.
Las evidencias se guardan en ../../evidencias/ia-herramientas/browser-use/.
"""
from __future__ import annotations

import asyncio
import json
import os
import platform
import shutil
import sys
import time
import urllib.error
import urllib.request
from datetime import datetime, timezone
from pathlib import Path

# Browser Use limita cada evento interno a 30 s por defecto. Con la máquina cargada (Ollama y otras suites
# en paralelo) Chrome tarda más en arrancar, así que se amplían los límites ANTES de importar la librería.
for variable, segundos in {
    'TIMEOUT_BrowserStartEvent': '180', 'TIMEOUT_BrowserLaunchEvent': '180',
    'TIMEOUT_BrowserStateRequestEvent': '120', 'TIMEOUT_NavigateToUrlEvent': '90',
    'TIMEOUT_ScreenshotEvent': '60', 'TIMEOUT_TypeTextEvent': '60', 'TIMEOUT_ClickElementEvent': '45',
}.items():
    os.environ.setdefault(variable, segundos)

from browser_use import Agent, Browser
from browser_use.llm import ChatOllama
from browser_use.tools.service import Tools

# ---------- ajustes para un modelo local pequeño (8B) ----------
# El prompt de sistema por defecto de Browser Use ocupa ~30 KB e incluye ejemplos de comercio electrónico que
# llama3.1:8b tendía a copiar literalmente (buscaba "laptops", hablaba de Amazon/eBay) en lugar de seguir la tarea.
# Browser Use permite sustituirlo (override_system_message), reducir el esquema de salida (flash_mode) y limitar
# las acciones disponibles (Tools(exclude_actions=...)); con eso el modelo tiene menos opciones donde confundirse.
MODO_COMPACTO = os.environ.get('BU_MODO_COMPACTO', '1') != '0'
ACCIONES_EXCLUIDAS = [
    'search', 'go_back', 'upload_file', 'switch', 'close', 'extract', 'search_page', 'find_elements', 'send_keys', 'find_text',
    'screenshot', 'save_as_pdf', 'dropdown_options', 'select_dropdown', 'write_file', 'replace_file', 'read_file', 'evaluate',
]
PROMPT_SISTEMA_COMPACTO = """You control a real web browser to complete ONE specific task given in <user_request>.
Each step you receive the browser state: the current URL and the interactive elements, one per line, as "[index]<tag>text</tag>".
Only the indexes shown in square brackets exist. Text without an index is not clickable.

Respond ONLY with a JSON object with exactly these keys:
{"memory": "<one short sentence: what you have done so far>", "action": [ {<exactly one action>} ]}

Available actions (choose exactly one per response):
- {"navigate": {"url": "<url>", "new_tab": false}}
- {"input": {"index": <n>, "text": "<text>", "clear": true}}   -> types text into the field with that index
- {"click": {"index": <n>}}                                      -> clicks the element with that index
- {"wait": {"seconds": 2}}
- {"scroll": {"down": true, "pages": 1}}
- {"done": {"text": "<final answer, in Spanish>", "success": true}} -> finish; put the requested information in "text"

Rules:
1. Follow the steps of the task literally and in order. Do not add steps.
2. Use only indexes present in the CURRENT browser state. Never invent indexes, websites, products, searches or data.
3. Do not navigate anywhere that the task does not mention. There is no shopping, no search engine, no other site.
4. As soon as the information requested by the task is visible in the browser state, call "done" with it. If the task cannot be completed, call "done" with success=false and explain what you saw.
"""

# La consola de Windows usa cp1252: el modelo puede devolver símbolos fuera de ese juego de caracteres
for flujo in (sys.stdout, sys.stderr):
    try:
        flujo.reconfigure(encoding='utf-8', errors='replace')
    except Exception:  # noqa: BLE001
        pass

RAIZ = Path(__file__).resolve().parent
EVID = (RAIZ / '..' / '..' / 'evidencias' / 'ia-herramientas' / 'browser-use').resolve()
SALIDAS = RAIZ / 'salidas'
UI = os.environ.get('TASKFLOW_URL', 'http://localhost:5173')
API = os.environ.get('TASKFLOW_API_URL', 'http://localhost:3000')
MODELO = os.environ.get('OLLAMA_MODEL', 'llama3.1:8b')
HOST = os.environ.get('OLLAMA_HOST_URL', 'http://localhost:11434')
CHROME = os.environ.get('CHROME_PATH', 'C:/Program Files/Google/Chrome/Application/chrome.exe')
MAX_PASOS = int(os.environ.get('BU_MAX_PASOS', '10'))


# ---------- utilidades de API (preparación de datos y verificación) ----------
def api(metodo: str, ruta: str, cuerpo: dict | None = None, token: str | None = None):
    datos = json.dumps(cuerpo).encode() if cuerpo is not None else None
    req = urllib.request.Request(API + ruta, data=datos, method=metodo)
    req.add_header('Content-Type', 'application/json')
    if token:
        req.add_header('Authorization', f'Bearer {token}')
    try:
        with urllib.request.urlopen(req, timeout=15) as r:
            return r.status, json.loads(r.read() or b'null')
    except urllib.error.HTTPError as e:
        return e.code, json.loads(e.read() or b'null')


def usuario_unico(prefijo: str) -> dict:
    marca = int(time.time() * 1000)
    return {'nombre': f'Usuario {prefijo} {str(marca)[-6:]}', 'email': f'{prefijo}.{marca}@taskflow-browseruse.test', 'password': 'Clave-Segura-123'}


def registrar(usuario: dict) -> dict:
    estado, cuerpo = api('POST', '/auth/register', usuario)
    assert estado == 201, f'registro {estado}: {cuerpo}'
    estado, login = api('POST', '/auth/login', {'email': usuario['email'], 'password': usuario['password']})
    assert estado in (200, 201), f'login {estado}: {login}'
    token = login['access_token']
    _, yo = api('GET', '/usuarios/me', token=token)
    return {'token': token, 'user': {'id': yo['id'], 'nombre': yo['nombre'], 'email': yo['email']}}


def storage_state_con_sesion(sesion: dict) -> str:
    """Archivo storage_state (formato Playwright) con la sesión tal como la guarda la app (localStorage)."""
    ruta = SALIDAS / 'storage-state.json'
    ruta.write_text(json.dumps({
        'cookies': [],
        'origins': [{'origin': UI, 'localStorage': [
            {'name': 'access_token', 'value': sesion['token']},
            {'name': 'user', 'value': json.dumps(sesion['user'])},
        ]}],
    }), encoding='utf-8')
    return str(ruta)


# ---------- navegador ----------
CHROMIUM_PLAYWRIGHT = Path(os.environ.get('LOCALAPPDATA', '')) / 'ms-playwright' / 'chromium-1223' / 'chrome-win64' / 'chrome.exe'


class ChromeCdp:
    """
    Lanza Chromium en modo headless con --remote-debugging-port y espera a que el endpoint CDP responda.
    Browser Use lanza el navegador él mismo, pero su espera del CDP está fija en 30 s y, con la máquina
    cargada (Ollama y otras suites a la vez), Chrome tardaba más y el agente abortaba. Lanzándolo aquí y
    conectando con Browser(cdp_url=...) controlamos la espera (hasta 180 s) sin tocar la librería.
    """

    def __init__(self) -> None:
        import socket
        with socket.socket() as s:
            s.bind(('127.0.0.1', 0))
            self.puerto = s.getsockname()[1]
        self.perfil = Path(os.environ.get('TEMP', '.')) / f'taskflow-browseruse-{self.puerto}'
        self.proceso = None
        self.ejecutable = str(CHROMIUM_PLAYWRIGHT if CHROMIUM_PLAYWRIGHT.exists() else CHROME)

    def iniciar(self, espera_max: float = 180) -> str:
        import subprocess
        self.proceso = subprocess.Popen([
            self.ejecutable, '--headless=new', f'--remote-debugging-port={self.puerto}', f'--user-data-dir={self.perfil}',
            '--no-first-run', '--no-default-browser-check', '--disable-gpu', '--disable-extensions', '--disable-background-networking',
            '--disable-sync', '--lang=es-ES', '--window-size=1280,720', 'about:blank',
        ], stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
        inicio = time.time()
        while time.time() - inicio < espera_max:
            try:
                with urllib.request.urlopen(f'http://127.0.0.1:{self.puerto}/json/version', timeout=2) as r:
                    json.loads(r.read())
                    print(f'   navegador listo en {time.time() - inicio:.1f} s (CDP :{self.puerto})')
                    return f'http://127.0.0.1:{self.puerto}'
            except Exception:  # noqa: BLE001
                time.sleep(0.5)
        self.detener()
        raise TimeoutError(f'Chromium no expuso el CDP en {espera_max} s')

    def detener(self) -> None:
        if self.proceso and self.proceso.poll() is None:
            self.proceso.terminate()
            try:
                self.proceso.wait(timeout=10)
            except Exception:  # noqa: BLE001
                self.proceso.kill()
        shutil.rmtree(self.perfil, ignore_errors=True)


async def abrir_sesion_en_navegador(navegador: Browser, sesion: dict) -> None:
    """Deja la sesión en localStorage tal como la guarda la aplicación (useAuthStore)."""
    pagina = await navegador.get_current_page() or await navegador.new_page()
    await pagina.goto(f'{UI}/login')
    await asyncio.sleep(1)
    await pagina.evaluate(
        f"() => {{ localStorage.setItem('access_token', {json.dumps(sesion['token'])}); "
        f"localStorage.setItem('user', {json.dumps(json.dumps(sesion['user']))}); return 'ok'; }}"
    )


# ---------- ejecución de un caso ----------
async def ejecutar_caso(caso: dict) -> dict:
    inicio = time.time()
    contexto = caso['preparar']() if caso.get('preparar') else {}
    tarea = caso['tarea'](contexto)
    llm = ChatOllama(model=MODELO, host=HOST, timeout=900)
    carpeta_conv = SALIDAS / f"{caso['id']}-conversacion"
    shutil.rmtree(carpeta_conv, ignore_errors=True)
    resultado = {'id': caso['id'], 'nombre': caso['nombre'], 'tipo': caso['tipo'], 'objetivo': caso['objetivo'], 'esperado': caso['esperado'], 'tarea': tarea}
    historial = None
    chrome = ChromeCdp()
    navegador = None
    try:
        navegador = Browser(cdp_url=chrome.iniciar(), headless=True)
        await navegador.start()
        if caso.get('con_sesion'):
            await abrir_sesion_en_navegador(navegador, contexto['sesion'])
        compacto = dict(
            tools=Tools(exclude_actions=ACCIONES_EXCLUIDAS),
            override_system_message=PROMPT_SISTEMA_COMPACTO,
            flash_mode=True,             # salida solo {memory, action}
            enable_planning=False,
            max_actions_per_step=1,
        ) if MODO_COMPACTO else dict(use_thinking=False, max_actions_per_step=2)
        agente = Agent(
            task=tarea,
            llm=llm,
            browser=navegador,
            use_vision=False,            # llama3.1:8b no procesa imágenes: el agente trabaja con el DOM
            use_judge=False,             # el juicio lo hace este script en código
            max_failures=3,
            llm_timeout=600,             # el límite por defecto (75 s) es corto para un modelo local compartido
            **compacto,
            save_conversation_path=str(carpeta_conv),
            generate_gif=str(SALIDAS / f"{caso['id']}.gif"),
        )
        historial = await agente.run(max_steps=MAX_PASOS)
        final = historial.final_result()
        urls = [u for u in historial.urls() if u]
        acciones = historial.model_actions()
        errores = [e for e in historial.errors() if e]
        verificacion = caso['verificar'](contexto, final or '', urls, historial)
        resultado.update({
            'final_result': final,
            'urls': urls,
            'pasos': historial.number_of_steps(),
            'acciones': acciones,
            'errores': errores,
            'is_done': historial.is_done(),
            'is_successful': historial.is_successful(),
            'verificacion': verificacion,
        })
        historial.save_to_file(str(SALIDAS / f"{caso['id']}-historial-completo.json"))
        # capturas que tomó el agente en cada paso
        capturas = []
        for i, ruta in enumerate(historial.screenshot_paths() or []):
            if ruta and Path(ruta).exists():
                destino = SALIDAS / f"{caso['id']}-paso-{i + 1:02d}.png"
                shutil.copyfile(ruta, destino)
                capturas.append(destino.name)
        resultado['capturas'] = capturas
        resultado['estado'] = 'Aprobado' if verificacion['ok'] else 'Fallido'
        resultado['obtenido'] = (
            f"{'Conforme' if verificacion['ok'] else 'No conforme'}: {verificacion['detalle']} "
            f"El agente ejecutó {historial.number_of_steps()} pasos ({len(acciones)} acciones) y terminó con "
            f"final_result={json.dumps(final, ensure_ascii=False)[:400]}."
            + (f" Errores del agente: {'; '.join(str(e)[:160] for e in errores)}" if errores else '')
        )
    except Exception as exc:  # noqa: BLE001 — se documenta el fallo real
        resultado['estado'] = 'Fallido'
        resultado['obtenido'] = f'No conforme: excepción durante la ejecución del agente: {type(exc).__name__}: {str(exc)[:500]}'
        resultado['errores'] = [str(exc)]
    finally:
        try:
            if navegador is not None:
                await navegador.stop()
        except Exception:  # noqa: BLE001
            pass
        chrome.detener()
    resultado['duracionSeg'] = round(time.time() - inicio, 1)
    (SALIDAS / f"{caso['id']}-historial.json").write_text(json.dumps(resultado, ensure_ascii=False, indent=2, default=str), encoding='utf-8')
    print(f"[{caso['id']}] {resultado['estado']} en {resultado['duracionSeg']} s — {resultado['obtenido'][:200]}")
    return resultado


# ---------- casos ----------
def preparar_login() -> dict:
    usuario = usuario_unico('bu-login')
    sesion = registrar(usuario)
    return {'usuario': usuario, 'sesion': sesion}


def preparar_equipo() -> dict:
    usuario = usuario_unico('bu-equipo')
    sesion = registrar(usuario)
    nombre = f'Equipo BrowserUse {int(time.time() * 1000)}'
    return {'usuario': usuario, 'sesion': sesion, 'nombre_equipo': nombre}


def verificar_bu01(_ctx, final, urls, _h):
    texto = final.lower()
    faltan = [t for t in ['iniciar sesión', 'correo', 'contraseña'] if t not in texto]
    return {'ok': not faltan, 'detalle': 'el resultado menciona el título y las dos etiquetas.' if not faltan else f'el resultado no menciona: {faltan}.'}


def verificar_bu02(ctx, final, urls, _h):
    en_inicio = any(u.rstrip('/') == UI.rstrip('/') for u in urls)
    menciona = 'mis equipos' in final.lower()
    ok = en_inicio or menciona
    return {'ok': ok, 'detalle': f"URL final en «/»: {en_inicio}; el resultado menciona «Mis equipos»: {menciona}."}


def verificar_bu03(ctx, final, urls, _h):
    _, equipos = api('GET', '/equipos', token=ctx['sesion']['token'])
    nombres = [e.get('nombre') for e in (equipos or [])]
    ok = ctx['nombre_equipo'] in nombres
    return {'ok': ok, 'detalle': f"GET /equipos devolvió {nombres}; se esperaba «{ctx['nombre_equipo']}»."}


def verificar_bu04(ctx, final, urls, _h):
    texto = final.lower()
    ok = 'no son correctos' in texto or ('correo' in texto and 'contraseña' in texto and ('incorrect' in texto or 'error' in texto))
    sigue_en_login = bool(urls) and urls[-1].endswith('/login')
    return {'ok': ok and sigue_en_login, 'detalle': f"mensaje de error reportado: {ok}; última URL /login: {sigue_en_login}."}


CASOS = [
    {
        'id': 'BU-01', 'tipo': 'exploratorio',
        'nombre': 'Describir el formulario de inicio de sesión',
        'objetivo': 'Comprobar que el agente navega a /login y lee correctamente el título y las etiquetas de los campos del formulario.',
        'esperado': 'El resultado final menciona «Iniciar sesión» y las etiquetas «Correo electrónico» y «Contraseña».',
        'tarea': lambda _c: f"Go to {UI}/login . Read the page and finish immediately with a short answer in Spanish that lists: the main heading (h1) text, the exact label of every text field, and the text of the submit button. Do not click anything.",
        'verificar': verificar_bu01,
    },
    {
        'id': 'BU-02', 'tipo': 'exitoso',
        'nombre': 'Iniciar sesión con credenciales válidas',
        'objetivo': 'Comprobar que el agente completa el inicio de sesión con unas credenciales dadas y llega a «Mis equipos».',
        'esperado': 'La URL final es «/» y/o el resultado menciona «Mis equipos».',
        'preparar': preparar_login,
        'tarea': lambda c: (
            f"Steps, in order, one per response:\n"
            f"1. navigate to {UI}/login\n"
            f"2. input the text {c['usuario']['email']} into the <input type=email> (the field under 'Correo electrónico')\n"
            f"3. input the text {c['usuario']['password']} into the <input type=password> (the field under 'Contraseña'; it has a DIFFERENT index than the email field)\n"
            f"4. click the <button type=submit> whose text is 'Iniciar sesión' (NOT the 'Mostrar contraseña' button)\n"
            f"5. wait 2 seconds\n"
            f"6. done: report in Spanish the current URL and the first heading text of the page you landed on."
        ),
        'verificar': verificar_bu02,
    },
    {
        'id': 'BU-03', 'tipo': 'exitoso',
        'nombre': 'Crear un equipo con la sesión iniciada',
        'objetivo': 'Comprobar que el agente, con la sesión ya iniciada, crea un equipo desde la interfaz y que el equipo existe en la API.',
        'esperado': 'GET /equipos devuelve un equipo con el nombre indicado en la tarea.',
        'preparar': preparar_equipo,
        'con_sesion': True,
        'tarea': lambda c: (
            f"You are already logged in. Steps, in order, one per response:\n"
            f"1. navigate to {UI}/\n"
            f"2. click the <button> whose text is 'Nuevo equipo'\n"
            f"3. a dialog opens with one <input>: input the text {c['nombre_equipo']} into that <input>\n"
            f"4. click the <button type=submit> whose text is 'Crear equipo'\n"
            f"5. wait 2 seconds\n"
            f"6. done: report in Spanish whether the text '{c['nombre_equipo']}' is now visible on the page."
        ),
        'verificar': verificar_bu03,
    },
    {
        'id': 'BU-04', 'tipo': 'error',
        'nombre': 'Inicio de sesión con contraseña incorrecta',
        'objetivo': 'Comprobar que el agente detecta y reporta el mensaje de error visible cuando la contraseña es incorrecta.',
        'esperado': 'El resultado contiene «El correo o la contraseña no son correctos» y la URL sigue siendo /login.',
        'preparar': preparar_login,
        'tarea': lambda c: (
            f"Steps, in order, one per response:\n"
            f"1. navigate to {UI}/login\n"
            f"2. input the text {c['usuario']['email']} into the <input type=email> (the field under 'Correo electrónico')\n"
            f"3. input the text ClaveIncorrecta-999 into the <input type=password> (the field under 'Contraseña'; it has a DIFFERENT index than the email field)\n"
            f"4. click the <button type=submit> whose text is 'Iniciar sesión' (NOT the 'Mostrar contraseña' button)\n"
            f"5. wait 2 seconds\n"
            f"6. done: copy literally, in Spanish, the error message text that now appears on the page (it starts with 'El correo o la contraseña'), and the current URL."
        ),
        'verificar': verificar_bu04,
    },
]


async def main() -> int:
    SALIDAS.mkdir(parents=True, exist_ok=True)
    seleccion = sys.argv[1:] or [c['id'] for c in CASOS]
    inicio = time.time()
    resultados = []
    for caso in CASOS:
        if caso['id'] in seleccion:
            resultados.append(await ejecutar_caso(caso))
        else:
            # Caso no seleccionado en esta corrida: se conserva el resultado de la última ejecución guardada
            previo = SALIDAS / f"{caso['id']}-historial.json"
            if previo.exists():
                resultados.append(json.loads(previo.read_text(encoding='utf-8')))

    # ---------- evidencias ----------
    EVID.mkdir(parents=True, exist_ok=True)
    for sub in ('salidas', 'capturas', 'gif'):
        shutil.rmtree(EVID / sub, ignore_errors=True)
        (EVID / sub).mkdir(parents=True, exist_ok=True)
    casos = []
    for r in resultados:
        evidencia = []
        for nombre in (f"{r['id']}-historial.json", f"{r['id']}-historial-completo.json"):
            if (SALIDAS / nombre).exists():
                shutil.copyfile(SALIDAS / nombre, EVID / 'salidas' / nombre)
                evidencia.append(f'salidas/{nombre}')
        conv = SALIDAS / f"{r['id']}-conversacion"
        if conv.exists():
            shutil.copytree(conv, EVID / 'salidas' / conv.name, dirs_exist_ok=True)
            evidencia.append(f'salidas/{conv.name}/')
        for cap in r.get('capturas', []):
            shutil.copyfile(SALIDAS / cap, EVID / 'capturas' / cap)
            evidencia.append(f'capturas/{cap}')
        gif = SALIDAS / f"{r['id']}.gif"
        if gif.exists():
            shutil.copyfile(gif, EVID / 'gif' / gif.name)
            evidencia.append(f'gif/{gif.name}')
        casos.append({k: r.get(k) for k in ('id', 'nombre', 'tipo', 'objetivo', 'esperado', 'tarea', 'obtenido', 'estado', 'duracionSeg', 'pasos', 'final_result', 'urls')} | {'evidencia': evidencia})

    import importlib.metadata as md
    resumen = {
        'area': 'Pruebas con IA — Browser Use',
        'herramienta': f"Browser Use {md.version('browser-use')} (Python {platform.python_version()})",
        'modelo': f'Ollama {MODELO} (local, sin coste; use_vision=False)',
        'proposito': 'Automatización de navegador dirigida por un agente LLM: la prueba se describe en lenguaje natural y el agente decide qué acciones ejecutar sobre el DOM; la verificación se hace en código contra la URL, el texto final y la API.',
        'configuracion': {
            'llm': f'ChatOllama(model={MODELO}, host={HOST}, timeout=900)',
            'navegador': f'Chromium headless lanzado por el script con --remote-debugging-port (ejecutable {CHROMIUM_PLAYWRIGHT if CHROMIUM_PLAYWRIGHT.exists() else CHROME}) y conectado con Browser(cdp_url=...); en BU-03 la sesión se inyecta en localStorage antes de arrancar el agente',
            'agente': (f'Agent(use_vision=False, use_judge=False, max_failures=3, llm_timeout=600, generate_gif, save_conversation_path); max_steps={MAX_PASOS}; '
                       + ('modo compacto para modelo 8B: override_system_message (prompt corto sin ejemplos), flash_mode=True, enable_planning=False, max_actions_per_step=1, Tools sin ' + str(len(ACCIONES_EXCLUIDAS)) + ' acciones (quedan navigate, click, input, wait, scroll, done)' if MODO_COMPACTO else 'prompt de sistema por defecto, use_thinking=False, max_actions_per_step=2')),
            'instalacion': 'python -m venv .venv && .venv\\Scripts\\pip install browser-use==0.13.11',
        },
        'comando': 'cd pruebas/ia-herramientas/browser-use && .venv\\Scripts\\python pruebas.py',
        'fecha': datetime.now(timezone.utc).isoformat(),
        'totales': {
            'total': len(casos),
            'aprobados': sum(c['estado'] == 'Aprobado' for c in casos),
            'fallidos': sum(c['estado'] != 'Aprobado' for c in casos),
            'duracionSeg': round(time.time() - inicio, 1),
        },
        'casos': casos,
        'aportes': [
            'La prueba se expresa como una tarea en lenguaje natural; el agente localiza los elementos por sí mismo a partir del DOM, sin selectores escritos a mano.',
            'Tolera cambios de interfaz (textos, posiciones) mientras la intención siga siendo reconocible, lo que reduce el mantenimiento de localizadores.',
            'Produce evidencia rica por sí solo: historial de acciones y razonamiento, capturas por paso y GIF del recorrido.',
            'Es útil para pruebas exploratorias y de humo guiadas, y para generar ideas de casos a partir de lo que el agente "ve".',
        ],
        'limitaciones': [
            'Con un modelo local de 8B la ejecución es lenta (decenas de segundos a minutos por paso) y puede desviarse de la tarea o inventar el resultado; por eso la verificación se hace siempre en código.',
            'Sin visión (use_vision=False) el agente depende del árbol DOM/accesibilidad: elementos sin etiqueta o con texto ambiguo le cuestan más.',
            'El resultado no es determinista: la misma tarea puede requerir distinto número de pasos en dos ejecuciones; no sirve como prueba de regresión estricta sin aserciones externas.',
            'Las credenciales viajan dentro del prompt al modelo (aquí local); con modelos en la nube habría que usar sensitive_data.',
        ],
    }
    (EVID / 'resumen.json').write_text(json.dumps(resumen, ensure_ascii=False, indent=2, default=str), encoding='utf-8')
    print(f"\nResumen: {resumen['totales']['aprobados']}/{resumen['totales']['total']} aprobados → {EVID / 'resumen.json'}")
    return 0 if resumen['totales']['fallidos'] == 0 else 1


if __name__ == '__main__':
    sys.exit(asyncio.run(main()))
