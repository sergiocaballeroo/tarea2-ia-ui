# -*- coding: utf-8 -*-
"""
Replica desde cero el procedimiento de ejecución local (clone, npm install, npm run start) en una
carpeta temporal, guarda la salida REAL de cada comando y la renderiza como imagen tipo terminal.
Además toma capturas del navegador contra el servidor de desarrollo con Playwright.

    pip install pillow
    python scripts/capturas-ejecucion.py

Salida: evidencias/capturas/e01..e06 (PNG) y evidencias/ejecucion-local.log (texto).
"""
from __future__ import annotations

import os
import shutil
import subprocess
import sys
import tempfile
import time
from pathlib import Path

from PIL import Image, ImageDraw, ImageFont

RAIZ = Path(__file__).resolve().parent.parent
SALIDA = RAIZ / "evidencias" / "capturas"
LOG = RAIZ / "evidencias" / "ejecucion-local.log"
REPO = "https://github.com/sergiocaballeroo/tarea2-ia-ui.git"
PUERTO_BIB = 4200
PUERTO_CLI = 4300

ES_WINDOWS = os.name == "nt"
NPM = "npm.cmd" if ES_WINDOWS else "npm"
NPX = "npx.cmd" if ES_WINDOWS else "npx"


def correr(cmd: list[str], cwd: Path, timeout: int = 900) -> str:
    """Ejecuta un comando y devuelve su salida combinada (stdout + stderr)."""
    r = subprocess.run(cmd, cwd=cwd, capture_output=True, text=True, encoding="utf-8", errors="replace", timeout=timeout)
    return (r.stdout + r.stderr).strip()


def servir(cmd: list[str], cwd: Path, puerto: int, espera: int = 60) -> tuple[subprocess.Popen, str]:
    """Lanza ng serve en segundo plano y espera a que responda; devuelve el proceso y su salida."""
    log = cwd / f"serve-{puerto}.log"
    f = open(log, "w", encoding="utf-8")
    proc = subprocess.Popen(cmd, cwd=cwd, stdout=f, stderr=subprocess.STDOUT)
    import urllib.request

    for _ in range(espera):
        time.sleep(1)
        try:
            urllib.request.urlopen(f"http://localhost:{puerto}/", timeout=2)
            break
        except Exception:
            continue
    time.sleep(2)
    f.flush()
    return proc, log.read_text(encoding="utf-8", errors="replace").strip()


def limpiar_ansi(texto: str) -> str:
    import re

    texto = re.sub(r"\x1b\[[0-9;?]*[A-Za-z]", "", texto)
    return texto.replace("\r", "")


def render_terminal(titulo: str, bloques: list[tuple[str, str]], destino: Path, ancho_cols: int = 100) -> None:
    """Dibuja una ventana tipo terminal con pares (comando, salida). La salida es la real, sin editar."""
    lineas: list[tuple[str, str]] = []
    carpeta = "C:\\Users\\sergi\\Documents"
    for cmd, out in bloques:
        lineas.append(("cmd", f"PS {carpeta}> {cmd}"))
        if cmd.startswith("cd "):
            carpeta = carpeta + "\\" + cmd[3:].strip()
        for l in limpiar_ansi(out).splitlines():
            while len(l) > ancho_cols:
                lineas.append(("out", l[:ancho_cols]))
                l = l[ancho_cols:]
            lineas.append(("out", l))
        lineas.append(("out", ""))
    fuente = fuente_b = None
    for regular, negrita in (("CascadiaMono.ttf", "CascadiaMono.ttf"), ("consola.ttf", "consolab.ttf")):
        try:
            fuente = ImageFont.truetype(regular, 15)
            fuente_b = ImageFont.truetype(negrita, 15)
            break
        except OSError:
            continue
    if fuente is None:
        fuente = fuente_b = ImageFont.load_default()
    alto_linea = 21
    ancho = 1000
    alto = 48 + alto_linea * len(lineas) + 24
    img = Image.new("RGB", (ancho, alto), (12, 12, 12))
    d = ImageDraw.Draw(img)
    d.rectangle([0, 0, ancho, 34], fill=(32, 32, 32))
    d.text((12, 8), titulo, fill=(220, 220, 220), font=fuente_b)
    y = 48
    for tipo, l in lineas:
        color = (120, 220, 120) if tipo == "cmd" else (204, 204, 204)
        d.text((14, y), l, fill=color, font=fuente_b if tipo == "cmd" else fuente)
        y += alto_linea
    img.save(destino)
    print("Captura:", destino.name)


def main() -> None:
    SALIDA.mkdir(parents=True, exist_ok=True)
    tmp = Path(tempfile.mkdtemp(prefix="replica-"))
    print("Carpeta temporal:", tmp)
    registro: list[str] = []

    # 1) Versiones
    node_v = correr(["node", "--version"], tmp)
    npm_v = correr([NPM, "--version"], tmp)
    # 2) git clone
    out_clone = correr(["git", "clone", REPO], tmp)
    proyecto = tmp / "tarea2-ia-ui"
    # 3) npm install
    t0 = time.time()
    out_install = correr([NPM, "install"], proyecto)
    dur_install = time.time() - t0
    out_install_corto = "\n".join(out_install.splitlines()[-6:])
    registro += [f"$ node --version\n{node_v}", f"$ npm --version\n{npm_v}", f"$ git clone {REPO}\n{out_clone}",
                 f"$ npm install  ({dur_install:.0f} s)\n{out_install}"]

    render_terminal(
        "Windows PowerShell: clonar e instalar dependencias",
        [("node --version", node_v), ("npm --version", npm_v), (f"git clone {REPO}", out_clone),
         ("cd tarea2-ia-ui", ""), ("npm install", out_install_corto)],
        SALIDA / "e01-clone-install.png",
    )

    # 4) npm run start:biblioteca y start:clinica (no abren el navegador; se capturan con Playwright)
    proc_b, out_b = servir([NPM, "run", "start:biblioteca"], proyecto, PUERTO_BIB)
    proc_c, out_c = servir([NPM, "run", "start:clinica"], proyecto, PUERTO_CLI)
    registro += [f"$ npm run start:biblioteca\n{out_b}", f"$ npm run start:clinica\n{out_c}"]
    render_terminal("Windows PowerShell: servidor de desarrollo de la biblioteca",
                    [("npm run start:biblioteca", out_b)], SALIDA / "e02-start-biblioteca.png")
    render_terminal("Windows PowerShell: servidor de desarrollo de la clínica",
                    [("npm run start:clinica", out_c)], SALIDA / "e03-start-clinica.png")

    # 5) Capturas del navegador en localhost con Playwright (usa el Chromium del proyecto).
    guion = f"""
import {{ chromium }} from 'playwright';
const b = await chromium.launch();
const p = await b.newPage({{ viewport: {{ width: 1366, height: 820 }} }});
await p.goto('http://localhost:{PUERTO_BIB}/#/', {{ waitUntil: 'networkidle' }});
await p.waitForTimeout(800);
await p.screenshot({{ path: {str(SALIDA / 'e04-localhost-biblioteca.png')!r} }});
await p.goto('http://localhost:{PUERTO_BIB}/#/ajustes', {{ waitUntil: 'networkidle' }});
await p.getByRole('button', {{ name: /Cargar datos de demostración/ }}).click();
await p.waitForTimeout(600);
await p.goto('http://localhost:{PUERTO_BIB}/#/prestamos', {{ waitUntil: 'networkidle' }});
await p.waitForTimeout(600);
await p.screenshot({{ path: {str(SALIDA / 'e05-localhost-biblioteca-prestamos.png')!r} }});
await p.goto('http://localhost:{PUERTO_CLI}/#/', {{ waitUntil: 'networkidle' }});
await p.waitForTimeout(800);
await p.screenshot({{ path: {str(SALIDA / 'e06-localhost-clinica.png')!r} }});
await b.close();
console.log('capturas de navegador listas');
"""
    guion_path = proyecto / "scripts" / "_cap_local.mjs"
    guion_path.write_text(guion, encoding="utf-8")
    print(correr(["node", str(guion_path)], proyecto, timeout=180))
    guion_path.unlink(missing_ok=True)

    for pr in (proc_b, proc_c):
        pr.kill()
    if ES_WINDOWS:
        subprocess.run(["taskkill", "/F", "/IM", "node.exe", "/T"], capture_output=True)

    LOG.write_text("\n\n".join(registro), encoding="utf-8")
    print("Bitácora:", LOG)
    shutil.rmtree(tmp, ignore_errors=True)


if __name__ == "__main__":
    sys.exit(main())
