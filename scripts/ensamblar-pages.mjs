/**
 * Ensambla las dos aplicaciones compiladas en una sola carpeta `_site`
 * lista para publicarse en GitHub Pages:
 *
 *   _site/
 *     index.html        -> portada con enlaces a ambas apps
 *     .nojekyll         -> evita que Pages ignore archivos que empiezan con "_"
 *     biblioteca/       -> dist/biblioteca/browser
 *     clinica/          -> dist/clinica/browser
 */
import { cpSync, mkdirSync, rmSync, writeFileSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';

const raiz = resolve(import.meta.dirname, '..');
const salida = resolve(raiz, '_site');

const apps = [
  { nombre: 'biblioteca', origen: resolve(raiz, 'dist/biblioteca/browser') },
  { nombre: 'clinica', origen: resolve(raiz, 'dist/clinica/browser') },
];

for (const app of apps) {
  if (!existsSync(app.origen)) {
    console.error(`No existe ${app.origen}. Ejecuta primero "npm run build:pages".`);
    process.exit(1);
  }
}

rmSync(salida, { recursive: true, force: true });
mkdirSync(salida, { recursive: true });
for (const app of apps) {
  cpSync(app.origen, resolve(salida, app.nombre), { recursive: true });
}
writeFileSync(resolve(salida, '.nojekyll'), '');
writeFileSync(
  resolve(salida, 'index.html'),
  `<!doctype html>
<html lang="es-MX">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Tarea 2: Herramientas de IA para interfaces de usuario</title>
<style>
  body { margin: 0; font-family: Roboto, system-ui, sans-serif; background: #f4f6f9; color: #1c1b1f; }
  main { max-width: 900px; margin: 0 auto; padding: 48px 16px; }
  h1 { font-size: 28px; margin: 0 0 8px; }
  p.sub { color: #555; margin: 0 0 32px; }
  .apps { display: grid; gap: 16px; grid-template-columns: repeat(auto-fit, minmax(280px, 1fr)); }
  a.app { display: block; padding: 24px; border-radius: 16px; background: #fff; box-shadow: 0 1px 3px rgba(0,0,0,.12); text-decoration: none; color: inherit; border-top: 6px solid var(--c); }
  a.app:hover { box-shadow: 0 4px 12px rgba(0,0,0,.15); }
  a.app h2 { margin: 0 0 8px; font-size: 20px; }
  a.app p { margin: 0 0 12px; color: #555; }
  a.app span { color: var(--c); font-weight: 600; }
  footer { margin-top: 40px; font-size: 13px; color: #777; }
</style>
</head>
<body>
<main>
  <h1>Herramientas de IA para el desarrollo de interfaces de usuario</h1>
  <p class="sub">Tarea 2. Implementaciones generadas con Claude Code, construidas con Angular 21 y Angular Material, publicadas con GitHub Actions en GitHub Pages.</p>
  <div class="apps">
    <a class="app" href="biblioteca/" style="--c:#005cbb">
      <h2>Biblioteca (aplicación de escritorio)</h2>
      <p>Gestión de préstamos de libros. PWA instalable en Windows, macOS y Linux; funciona sin conexión y guarda los datos en IndexedDB.</p>
      <span>Abrir biblioteca &rarr;</span>
    </a>
    <a class="app" href="clinica/" style="--c:#006874">
      <h2>Clínica (aplicación web)</h2>
      <p>Sitio de un consultorio multiespecialidad con agenda de citas en línea y panel de recepción.</p>
      <span>Abrir clínica &rarr;</span>
    </a>
  </div>
  <footer>Código fuente: <a href="https://github.com/sergiocaballeroo/tarea2-ia-ui">github.com/sergiocaballeroo/tarea2-ia-ui</a></footer>
</main>
</body>
</html>
`,
);
console.log(`Sitio ensamblado en ${salida}`);
