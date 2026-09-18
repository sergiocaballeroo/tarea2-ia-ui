/**
 * Servidor estático mínimo para revisar `_site` tal como quedará en GitHub Pages,
 * incluyendo el prefijo /tarea2-ia-ui/. No requiere dependencias.
 *
 *   npm run build:pages
 *   npm run preview      -> http://localhost:8080/tarea2-ia-ui/
 */
import { createServer } from 'node:http';
import { createReadStream, existsSync, statSync } from 'node:fs';
import { extname, join, normalize, resolve } from 'node:path';

const raiz = resolve(import.meta.dirname, '..', '_site');
const prefijo = '/tarea2-ia-ui';
const puerto = Number(process.env.PORT ?? 8080);

const tipos = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.webmanifest': 'application/manifest+json; charset=utf-8',
  '.png': 'image/png',
  '.ico': 'image/x-icon',
  '.svg': 'image/svg+xml',
  '.woff2': 'font/woff2',
  '.txt': 'text/plain; charset=utf-8',
};

if (!existsSync(raiz)) {
  console.error('No existe _site. Ejecuta primero "npm run build:pages".');
  process.exit(1);
}

createServer((req, res) => {
  let ruta = decodeURIComponent(new URL(req.url, 'http://localhost').pathname);
  if (ruta === '/') {
    res.writeHead(302, { Location: `${prefijo}/` });
    return res.end();
  }
  if (!ruta.startsWith(prefijo)) {
    res.writeHead(404);
    return res.end('No encontrado');
  }
  ruta = ruta.slice(prefijo.length) || '/';
  let archivo = normalize(join(raiz, ruta));
  if (!archivo.startsWith(raiz)) {
    res.writeHead(403);
    return res.end();
  }
  if (existsSync(archivo) && statSync(archivo).isDirectory()) archivo = join(archivo, 'index.html');
  if (!existsSync(archivo)) {
    res.writeHead(404);
    return res.end('No encontrado');
  }
  res.writeHead(200, { 'Content-Type': tipos[extname(archivo)] ?? 'application/octet-stream' });
  createReadStream(archivo).pipe(res);
}).listen(puerto, () => {
  console.log(`Sirviendo _site en http://localhost:${puerto}${prefijo}/`);
});
