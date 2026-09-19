/**
 * Pruebas funcionales de extremo a extremo de ambas aplicaciones con Playwright (Chromium).
 * Cada prueba corre en un contexto nuevo del navegador (IndexedDB limpia) y ejercita las
 * reglas de negocio a través de la interfaz, tal como lo haría una persona.
 *
 *   npm run build:pages      (una vez, para tener _site actualizado)
 *   npm run pruebas          -> imprime el resultado y deja capturas de las fallas en evidencias/pruebas/
 *
 * Opcional: PRUEBA=<regex> npm run pruebas   corre solo las pruebas cuyo nombre coincida.
 *           BASE=<url> npm run pruebas      corre contra otra URL (p. ej. el sitio publicado en GitHub Pages).
 */
import { chromium } from 'playwright';
import { spawn } from 'node:child_process';
import { mkdirSync, readFileSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import assert from 'node:assert/strict';

const raiz = resolve(import.meta.dirname, '..');
const salida = resolve(raiz, 'evidencias/pruebas');
mkdirSync(salida, { recursive: true });

const puerto = 8091;
// BASE=https://sergiocaballeroo.github.io/tarea2-ia-ui npm run pruebas   -> prueba el sitio publicado
const base = (process.env.BASE ?? `http://localhost:${puerto}/tarea2-ia-ui`).replace(/\/$/, '');
const BIB = `${base}/biblioteca/#`;
const CLI = `${base}/clinica/#`;

const servidor = process.env.BASE
  ? null
  : spawn(process.execPath, [resolve(raiz, 'scripts/servir-local.mjs')], { env: { ...process.env, PORT: String(puerto) }, stdio: 'ignore' });
if (servidor) await new Promise((r) => setTimeout(r, 1200));

// ---------- utilidades de fechas (mismas reglas que las apps) ----------
function aISO(d) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}
function hoyISO() {
  return aISO(new Date());
}
function sumarDias(iso, n) {
  const [y, m, d] = iso.split('-').map(Number);
  return aISO(new Date(y, m - 1, d + n));
}
function diaSemana(iso) {
  const [y, m, d] = iso.split('-').map(Number);
  return new Date(y, m - 1, d).getDay();
}
/** Primera fecha a partir de mañana en que el médico atiende. */
function proximaFecha(dias, desde = hoyISO(), saltar = 0) {
  let f = desde;
  let encontradas = 0;
  for (let i = 0; i < 90; i++) {
    f = sumarDias(f, 1);
    if (dias.includes(diaSemana(f))) {
      if (encontradas === saltar) return f;
      encontradas++;
    }
  }
  throw new Error('sin fecha disponible');
}

// ---------- mini arnés de pruebas ----------
const navegador = await chromium.launch();
const resultados = [];
const filtro = process.env.PRUEBA ? new RegExp(process.env.PRUEBA, 'i') : null;
let contexto, pagina, erroresConsola;

async function prueba(nombre, fn, opciones = {}) {
  if (filtro && !filtro.test(nombre)) return;
  contexto = await navegador.newContext({
    viewport: opciones.viewport ?? { width: 1366, height: 820 },
    locale: 'es-MX',
    timezoneId: 'America/Mexico_City',
    acceptDownloads: true,
  });
  pagina = await contexto.newPage();
  pagina.setDefaultTimeout(8000);
  erroresConsola = [];
  pagina.on('pageerror', (e) => erroresConsola.push(`pageerror: ${e.message}`));
  pagina.on('console', (m) => {
    if (m.type() === 'error' && !/favicon|ngsw|service worker/i.test(m.text())) erroresConsola.push(m.text());
  });
  const inicio = Date.now();
  try {
    await fn(pagina);
    if (erroresConsola.length) throw new Error(`Errores en consola: ${erroresConsola.join(' | ')}`);
    resultados.push({ nombre, ok: true, ms: Date.now() - inicio });
    console.log(`  ok   ${nombre}`);
  } catch (e) {
    const archivo = `${resultados.length + 1}-${nombre.replace(/[^a-z0-9]+/gi, '-').toLowerCase()}.png`;
    await pagina.screenshot({ path: resolve(salida, archivo), fullPage: true }).catch(() => {});
    const detalle = e.message.split('\n').filter((l) => l.trim()).slice(0, 4).join(' / ').slice(0, 400);
    resultados.push({ nombre, ok: false, error: detalle, captura: archivo, ms: Date.now() - inicio });
    console.log(`  FALLA ${nombre}\n        ${detalle}`);
  } finally {
    await contexto.close();
  }
}

// ---------- helpers de interfaz ----------
const snackbar = (p) => p.locator('.mat-mdc-snack-bar-label');
async function esperarSnack(p, texto) {
  const s = snackbar(p).filter({ hasText: texto }).first();
  await s.waitFor({ state: 'visible' });
  return (await s.textContent()).trim();
}
async function cerrarSnacks(p) {
  const botones = p.locator('.mat-mdc-snack-bar-action');
  for (let i = await botones.count(); i > 0; i--) await botones.first().click({ timeout: 1000 }).catch(() => {});
}
/** Navega y espera a que el componente de esa ruta esté en pantalla (con hash routing no hay recarga y el
 *  componente anterior sigue visible mientras se descarga el chunk de la nueva ruta). */
async function ir(p, url) {
  await p.goto(url, { waitUntil: 'load', timeout: 20000 });
  const ruta = (url.split('#/')[1] ?? '').split('?')[0].split('/')[0];
  const esBib = url.includes('/biblioteca/');
  const conocidas = ['libros', 'socios', 'prestamos', 'vencidos', 'ajustes', 'servicios', 'equipo', 'contacto', 'agendar', 'mis-citas', 'recepcion'];
  const componente = !ruta ? (esBib ? 'app-dashboard' : 'app-inicio') : conocidas.includes(ruta) ? `app-${ruta}` : '*';
  await p.locator(`router-outlet + ${componente}`).first().waitFor({ timeout: 20000 });
}
/** Texto de un elemento con espacios normalizados (la plantilla genera saltos y espacios dobles). */
async function texto(loc) {
  return (await loc.textContent()).replace(/\s+/g, ' ').trim();
}
/** Los botones de icono no tienen aria-label: su nombre accesible es la ligadura del icono (edit, delete...). */
const botonIcono = (ambito, icono) => ambito.locator(`button:has(mat-icon:text-is("${icono}"))`).first();
const dialogo = (p) => p.locator('mat-dialog-container');
async function llenar(p, etiqueta, valor, ambito) {
  const campo = (ambito ?? p).getByLabel(etiqueta, { exact: false }).first();
  await campo.fill(String(valor));
}
async function elegirOpcion(p, etiqueta, opcion, ambito) {
  const combo = (ambito ?? p).getByRole('combobox', { name: etiqueta }).first();
  await combo.click();
  const panel = p.locator('.mat-mdc-select-panel');
  await panel.waitFor();
  await panel.getByRole('option', { name: opcion, exact: true }).click();
  await panel.waitFor({ state: 'hidden' }).catch(() => {});
}
async function elegirAutocompletado(p, etiqueta, texto, opcion) {
  const campo = dialogo(p).getByRole('combobox', { name: etiqueta });
  await campo.click();
  await campo.fill(texto);
  await p.locator('mat-option').filter({ hasText: opcion }).first().click();
}
async function filaTabla(p, t) {
  return p.locator('table tr.mat-mdc-row').filter({ hasText: t }).first();
}
/** Opciones visibles del autocompletado ligado a un campo (evita contar el panel del campo anterior). */
async function opcionesDe(p, campo) {
  const panel = await campo.getAttribute('aria-controls');
  if (!panel) return [];
  return p.locator(`#${panel} mat-option`).allTextContents();
}
async function textoTarjeta(p, texto) {
  const tarjeta = p.locator('mat-card').filter({ hasText: texto }).first();
  return (await tarjeta.locator('.valor').textContent()).trim();
}

// ---------- flujos de la biblioteca ----------
async function cargarDemo(p) {
  await ir(p, `${BIB}/ajustes`);
  await p.getByRole('button', { name: /Cargar datos de demostración/ }).click();
  await esperarSnack(p, 'Datos de demostración cargados');
  await cerrarSnacks(p);
}
async function nuevoPrestamo(p, socio, libro) {
  await ir(p, `${BIB}/prestamos`);
  await p.getByRole('button', { name: /Nuevo préstamo/ }).click();
  await dialogo(p).waitFor();
  await elegirAutocompletado(p, 'Socio', socio, socio);
  await elegirAutocompletado(p, 'Libro', libro, libro);
  await dialogo(p).getByRole('button', { name: 'Registrar préstamo' }).click();
}
async function registrarLibro(p, datos) {
  await ir(p, `${BIB}/libros`);
  await p.getByRole('button', { name: /Nuevo libro/ }).click();
  const d = dialogo(p);
  await d.waitFor();
  await llenar(p, 'Título', datos.titulo, d);
  await llenar(p, 'Autor', datos.autor, d);
  await llenar(p, 'ISBN', datos.isbn, d);
  if (datos.ejemplares) await llenar(p, 'Ejemplares totales', datos.ejemplares, d);
  await d.getByRole('button', { name: 'Registrar libro' }).click();
}
async function registrarSocio(p, datos) {
  await ir(p, `${BIB}/socios`);
  await p.getByRole('button', { name: /Nuevo socio/ }).click();
  const d = dialogo(p);
  await d.waitFor();
  await llenar(p, 'Nombre completo', datos.nombre, d);
  await llenar(p, 'Correo electrónico', datos.email, d);
  if (datos.telefono) await llenar(p, 'Teléfono', datos.telefono, d);
  await d.getByRole('button', { name: 'Registrar socio' }).click();
}

console.log('\nBIBLIOTECA');

await prueba('B01 Inicio vacío muestra bienvenida y contadores en cero', async (p) => {
  await ir(p, `${BIB}/`);
  await p.getByText('La biblioteca está vacía').waitFor();
  assert.equal(await textoTarjeta(p, 'Títulos en catálogo'), '0');
  assert.equal(await textoTarjeta(p, 'Préstamos activos'), '0');
  await p.getByText('Sin movimientos registrados').waitFor();
});

await prueba('B02 Datos demo: contadores del inicio y badge de vencidos', async (p) => {
  await cargarDemo(p);
  await ir(p, `${BIB}/`);
  assert.equal(await textoTarjeta(p, 'Títulos en catálogo'), '10');
  assert.equal(await textoTarjeta(p, 'Ejemplares disponibles'), '19', '22 ejemplares totales menos 3 prestados');
  assert.equal(await textoTarjeta(p, 'Socios activos'), '4');
  assert.equal(await textoTarjeta(p, 'Préstamos activos'), '3');
  assert.equal(await textoTarjeta(p, 'Préstamos vencidos'), '1');
  assert.equal((await p.locator('.badge-vencidos').textContent()).trim(), '1');
  assert.equal(await p.locator('table tr.mat-mdc-row').count(), 4, 'últimos movimientos');
});

await prueba('B03 Datos demo persisten tras recargar la página', async (p) => {
  await cargarDemo(p);
  await ir(p, `${BIB}/libros`);
  await p.reload({ waitUntil: 'networkidle' });
  await p.getByText('10 de 10 títulos').waitFor();
});

await prueba('B04 Cargar demo dos veces se rechaza', async (p) => {
  await cargarDemo(p);
  await p.getByRole('button', { name: /Cargar datos de demostración/ }).click();
  await esperarSnack(p, 'Ya hay datos');
});

await prueba('B05 Registrar libro nuevo aparece en catálogo con ejemplares completos', async (p) => {
  await registrarLibro(p, { titulo: 'Libro de prueba', autor: 'Autora Prueba', isbn: '9781234567897', ejemplares: 2 });
  await esperarSnack(p, 'Libro registrado');
  const fila = await filaTabla(p, 'Libro de prueba');
  await fila.waitFor();
  assert.match(await texto(fila), /2 \/ 2/);
  await p.getByText('1 de 1 títulos').waitFor();
});

await prueba('B06 ISBN duplicado se rechaza', async (p) => {
  await cargarDemo(p);
  await registrarLibro(p, { titulo: 'Otro', autor: 'Alguien', isbn: '9780132350884' });
  await esperarSnack(p, 'Ya existe un libro con el ISBN 9780132350884');
  await dialogo(p).waitFor({ state: 'visible' });
});

await prueba('B07 Formulario de libro valida campos obligatorios e ISBN', async (p) => {
  await ir(p, `${BIB}/libros`);
  await p.getByRole('button', { name: /Nuevo libro/ }).click();
  const d = dialogo(p);
  const boton = d.getByRole('button', { name: 'Registrar libro' });
  assert.equal(await boton.isDisabled(), true, 'botón deshabilitado con formulario vacío');
  await llenar(p, 'Título', 'X', d);
  await llenar(p, 'Autor', 'Y', d);
  await llenar(p, 'ISBN', 'abc', d);
  await d.getByLabel('Editorial').click();
  await d.getByText('Usa 10 o 13 dígitos').waitFor();
  assert.equal(await boton.isDisabled(), true);
  await llenar(p, 'ISBN', '978-0-13-235088-4', d);
  assert.equal(await boton.isDisabled(), false);
});

await prueba('B08 Editar libro: no permite menos ejemplares que los prestados', async (p) => {
  await cargarDemo(p);
  // Cien años de soledad: 3 ejemplares, 1 prestado. Se presta otro para tener 2 prestados.
  await nuevoPrestamo(p, 'Carlos Díaz Ejemplo', 'Cien años de soledad');
  await esperarSnack(p, 'Préstamo registrado');
  await cerrarSnacks(p);
  await ir(p, `${BIB}/libros`);
  const fila = await filaTabla(p, 'Cien años de soledad');
  assert.match(await texto(fila), /1 \/ 3/);
  await botonIcono(fila, 'edit').click();
  const d = dialogo(p);
  await llenar(p, 'Ejemplares totales', 1, d);
  await d.getByRole('button', { name: 'Guardar cambios' }).click();
  await esperarSnack(p, 'No puedes tener menos de 2 ejemplares');
  await cerrarSnacks(p);
  await llenar(p, 'Ejemplares totales', 5, d);
  await d.getByRole('button', { name: 'Guardar cambios' }).click();
  await esperarSnack(p, 'Libro actualizado');
  assert.match(await texto(await filaTabla(p, 'Cien años de soledad')), /3 \/ 5/, 'disponibles se recalculan');
});

await prueba('B09 Filtros del catálogo: búsqueda, categoría y disponibilidad', async (p) => {
  await cargarDemo(p);
  await ir(p, `${BIB}/libros`);
  await p.getByLabel('Buscar por título').fill('rulfo');
  await p.getByText('1 de 10 títulos').waitFor();
  await (await filaTabla(p, 'Pedro Páramo')).waitFor();
  await p.getByLabel('Buscar por título').fill('');
  await elegirOpcion(p, 'Disponibilidad', 'Sin ejemplares disponibles');
  await p.getByText('1 de 10 títulos').waitFor();
  await (await filaTabla(p, 'A Brief History of Time')).waitFor();
  await elegirOpcion(p, 'Disponibilidad', 'Todos');
  await elegirOpcion(p, 'Categoría', 'Tecnología');
  await p.getByText('3 de 10 títulos').waitFor();
});

await prueba('B10 Registrar socio asigna código, fecha de alta y estado activo', async (p) => {
  await registrarSocio(p, { nombre: 'Socio Prueba', email: 'socio@prueba.test', telefono: '5512345678' });
  await esperarSnack(p, 'Socio registrado');
  const fila = await filaTabla(p, 'Socio Prueba');
  const t = await texto(fila);
  assert.match(t, /S-0001/);
  assert.match(t, new RegExp(`Alta: ${hoyISO()}`));
  assert.match(t, /Activo/);
  assert.match(t, /0 \/ 3/);
});

await prueba('B11 Códigos de socio siguen siendo únicos tras eliminar uno intermedio', async (p) => {
  for (const n of ['Socio Alfa', 'Socio Beta', 'Socio Gamma']) {
    await registrarSocio(p, { nombre: n, email: `${n.split(' ')[1].toLowerCase()}@prueba.test` });
    await esperarSnack(p, 'Socio registrado');
    await cerrarSnacks(p);
  }
  const beta = await filaTabla(p, 'Socio Beta');
  await botonIcono(beta, 'delete').click();
  await dialogo(p).getByRole('button', { name: 'Eliminar' }).click();
  await esperarSnack(p, 'Socio eliminado');
  await cerrarSnacks(p);
  await registrarSocio(p, { nombre: 'Socio Delta', email: 'delta@prueba.test' });
  await esperarSnack(p, 'Socio registrado');
  const codigos = await p.locator('table tr.mat-mdc-row code').allTextContents();
  assert.equal(new Set(codigos).size, codigos.length, `códigos repetidos: ${codigos.join(', ')}`);
  assert.match(await texto(await filaTabla(p, 'Socio Delta')), /S-0004/);
});

await prueba('B12 Préstamo válido: descuenta ejemplar y calcula vencimiento a 14 días', async (p) => {
  await cargarDemo(p);
  await nuevoPrestamo(p, 'Ana Torres Ejemplo', 'Clean Code');
  await esperarSnack(p, 'Préstamo registrado');
  const fila = p.locator('table tr.mat-mdc-row').filter({ hasText: 'Clean Code' }).filter({ hasText: 'Ana Torres' });
  const t = await texto(fila);
  assert.match(t, new RegExp(hoyISO()));
  assert.match(t, new RegExp(sumarDias(hoyISO(), 14)));
  assert.match(t, /Al corriente/);
  await ir(p, `${BIB}/libros`);
  assert.match(await texto(await filaTabla(p, 'Clean Code')), /2 \/ 4/);
  await ir(p, `${BIB}/socios`);
  assert.match(await texto(await filaTabla(p, 'Ana Torres')), /2 \/ 3/);
});

await prueba('B13 Regla: límite de préstamos simultáneos por socio', async (p) => {
  await cargarDemo(p);
  // Ana ya tiene 1. Con límite 3 puede tomar 2 más; el tercero se rechaza.
  for (const libro of ['Clean Code', 'Effective Java']) {
    await nuevoPrestamo(p, 'Ana Torres Ejemplo', libro);
    await esperarSnack(p, 'Préstamo registrado');
    await cerrarSnacks(p);
  }
  await nuevoPrestamo(p, 'Ana Torres Ejemplo', 'Cálculo');
  await esperarSnack(p, 'ya tiene 3 préstamos activos (límite 3)');
  await dialogo(p).waitFor({ state: 'visible' });
});

await prueba('B14 Regla: socio con préstamo vencido no puede tomar otro', async (p) => {
  await cargarDemo(p);
  await nuevoPrestamo(p, 'María López Ejemplo', 'Clean Code');
  await esperarSnack(p, 'tiene préstamos vencidos');
});

await prueba('B15 Regla: libro sin ejemplares no aparece para prestar', async (p) => {
  await cargarDemo(p);
  await ir(p, `${BIB}/prestamos`);
  await p.getByRole('button', { name: /Nuevo préstamo/ }).click();
  const campo = dialogo(p).getByRole('combobox', { name: 'Libro' });
  await campo.click();
  await campo.fill('Brief History');
  await p.waitForTimeout(400);
  assert.deepEqual(await opcionesDe(p, campo), [], 'A Brief History of Time está agotado');
});

await prueba('B16 Regla: socio inactivo no aparece para prestar', async (p) => {
  await cargarDemo(p);
  await ir(p, `${BIB}/socios`);
  await (await filaTabla(p, 'Carlos Díaz')).locator('mat-slide-toggle button').click();
  await esperarSnack(p, 'Socio desactivado');
  await cerrarSnacks(p);
  await ir(p, `${BIB}/`);
  assert.equal(await textoTarjeta(p, 'Socios activos'), '3');
  await ir(p, `${BIB}/prestamos`);
  await p.getByRole('button', { name: /Nuevo préstamo/ }).click();
  const campo = dialogo(p).getByRole('combobox', { name: 'Socio' });
  await campo.click();
  await campo.fill('Carlos');
  await p.waitForTimeout(400);
  assert.deepEqual(await opcionesDe(p, campo), []);
});

await prueba('B17 Desactivar socio con préstamos activos se rechaza y el interruptor no cambia', async (p) => {
  await cargarDemo(p);
  await ir(p, `${BIB}/socios`);
  const fila = await filaTabla(p, 'Ana Torres');
  await fila.locator('mat-slide-toggle button').click();
  await esperarSnack(p, 'No se puede desactivar');
  await p.waitForTimeout(300);
  const interruptor = fila.locator('mat-slide-toggle button');
  assert.match(await texto(fila), /Activo/);
  assert.equal(await interruptor.getAttribute('aria-checked'), 'true', 'el interruptor queda visualmente apagado aunque el socio sigue activo (se corrige solo al recargar)');
});

await prueba('B18 Eliminar socio o libro con préstamos activos se rechaza', async (p) => {
  await cargarDemo(p);
  await ir(p, `${BIB}/socios`);
  await botonIcono(await filaTabla(p, 'Ana Torres'), 'delete').click();
  await dialogo(p).getByRole('button', { name: 'Eliminar' }).click();
  await esperarSnack(p, 'No se puede eliminar: el socio tiene préstamos activos');
  await cerrarSnacks(p);
  await ir(p, `${BIB}/libros`);
  await botonIcono(await filaTabla(p, 'Cien años de soledad'), 'delete').click();
  await dialogo(p).getByRole('button', { name: 'Eliminar' }).click();
  await esperarSnack(p, 'No se puede eliminar: el libro tiene préstamos activos');
  await p.getByText('10 de 10 títulos').waitFor();
});

await prueba('B19 Devolver préstamo vencido cobra multa y libera el ejemplar', async (p) => {
  await cargarDemo(p);
  await ir(p, `${BIB}/vencidos`);
  assert.equal(await textoTarjeta(p, 'Préstamos vencidos'), '1');
  assert.match(await textoTarjeta(p, 'Multas acumuladas'), /60/);
  const fila = await filaTabla(p, 'María López');
  assert.match(await texto(fila), /6/);
  await fila.getByRole('button', { name: 'Devolver' }).click();
  await dialogo(p).getByText(/multa de \$60\.00 MXN por 6 día/).waitFor();
  await dialogo(p).getByRole('button', { name: 'Registrar devolución' }).click();
  await esperarSnack(p, 'Multa: $60.00');
  await p.getByText('No hay préstamos vencidos').waitFor();
  assert.equal(await p.locator('.badge-vencidos').count(), 0, 'badge desaparece');
  await ir(p, `${BIB}/libros`);
  assert.match(await texto(await filaTabla(p, 'A Brief History')), /1 \/ 1/);
  await ir(p, `${BIB}/prestamos`);
  await p.getByRole('radio', { name: 'Devueltos' }).or(p.getByText('Devueltos', { exact: true })).first().click();
  const devuelto = p.locator('table tr.mat-mdc-row').filter({ hasText: 'María López' });
  assert.match(await texto(devuelto), /Devuelto con multa/);
  assert.match(await texto(devuelto), new RegExp(`Devuelto: ${hoyISO()}`));
});

await prueba('B20 Devolver préstamo al corriente no cobra multa', async (p) => {
  await cargarDemo(p);
  await ir(p, `${BIB}/prestamos`);
  const fila = await filaTabla(p, 'Ana Torres');
  await fila.getByRole('button', { name: 'Devolver' }).click();
  const mensaje = await dialogo(p).textContent();
  assert.doesNotMatch(mensaje, /multa/i);
  await dialogo(p).getByRole('button', { name: 'Registrar devolución' }).click();
  await esperarSnack(p, 'Devolución registrada sin multa');
  await ir(p, `${BIB}/`);
  assert.equal(await textoTarjeta(p, 'Préstamos activos'), '2');
});

await prueba('B21 Renovar extiende 14 días; renovar vencido está deshabilitado', async (p) => {
  await cargarDemo(p);
  await ir(p, `${BIB}/prestamos`);
  const ana = await filaTabla(p, 'Ana Torres');
  const nueva = sumarDias(hoyISO(), 11 + 14);
  await botonIcono(ana, 'update').click();
  await esperarSnack(p, `Nueva fecha de vencimiento: ${nueva}`);
  assert.match(await texto(ana), new RegExp(nueva));
  const maria = await filaTabla(p, 'María López');
  assert.equal(await botonIcono(maria, 'update').isDisabled(), true);
});

await prueba('B22 Estados visuales: vence en 1 d, vencido (6 d), al corriente', async (p) => {
  await cargarDemo(p);
  await ir(p, `${BIB}/prestamos`);
  assert.match(await texto(await filaTabla(p, 'Luis Ramírez')), /Vence en 1 d/);
  assert.match(await texto(await filaTabla(p, 'María López')), /Vencido \(6 d\)/);
  assert.match(await texto(await filaTabla(p, 'Ana Torres')), /Al corriente/);
  assert.match(await texto(await filaTabla(p, 'María López')), /\$60\.00/);
});

await prueba('B23 Ajustes: reglas nuevas se aplican a préstamos y multas', async (p) => {
  await cargarDemo(p);
  await ir(p, `${BIB}/ajustes`);
  await llenar(p, 'Días de préstamo', 7);
  await llenar(p, 'Multa por día', 5);
  await llenar(p, 'Nombre de la biblioteca', 'Biblioteca Prueba');
  await p.getByRole('button', { name: 'Guardar reglas' }).click();
  await esperarSnack(p, 'Reglas guardadas');
  await cerrarSnacks(p);
  assert.equal((await p.locator('.marca-titulo').textContent()).trim(), 'Biblioteca Prueba');
  await ir(p, `${BIB}/vencidos`);
  assert.match(await textoTarjeta(p, 'Multas acumuladas'), /30/, '6 días x 5 MXN');
  await ir(p, `${BIB}/prestamos`);
  await p.getByRole('button', { name: /Nuevo préstamo/ }).click();
  await dialogo(p).getByText(`Vence el ${sumarDias(hoyISO(), 7)}`).waitFor();
  await dialogo(p).getByText('7 días de préstamo').waitFor();
});

await prueba('B24 Ajustes: reglas guardadas sobreviven a cargar la demostración', async (p) => {
  await ir(p, `${BIB}/ajustes`);
  await llenar(p, 'Días de préstamo', 7);
  await p.getByRole('button', { name: 'Guardar reglas' }).click();
  await esperarSnack(p, 'Reglas guardadas');
  await cerrarSnacks(p);
  await p.getByRole('button', { name: /Cargar datos de demostración/ }).click();
  await esperarSnack(p, 'Datos de demostración cargados');
  await p.waitForTimeout(400);
  assert.equal(await p.getByLabel('Días de préstamo').inputValue(), '7', 'la demo sobrescribió las reglas del usuario');
});

await prueba('B25 Botón Nuevo préstamo del inicio abre el diálogo en Préstamos', async (p) => {
  await cargarDemo(p);
  await ir(p, `${BIB}/`);
  await p.getByRole('link', { name: /Nuevo préstamo/ }).click();
  await dialogo(p).getByText('Nuevo préstamo').waitFor();
  assert.match(p.url(), /#\/prestamos$/, 'el parámetro ?nuevo se limpia de la URL');
});

await prueba('B26 Exportar CSV del catálogo descarga archivo con encabezados y filas', async (p) => {
  await cargarDemo(p);
  await ir(p, `${BIB}/libros`);
  const [descarga] = await Promise.all([p.waitForEvent('download'), p.getByRole('button', { name: /Exportar CSV/ }).click()]);
  assert.equal(descarga.suggestedFilename(), 'catalogo-libros.csv');
  const ruta = resolve(salida, 'tmp-catalogo.csv');
  await descarga.saveAs(ruta);
  const lineas = readFileSync(ruta, 'utf8').split('\r\n');
  assert.match(lineas[0], /"ISBN","Título","Autor"/);
  assert.equal(lineas.length, 11, '1 encabezado + 10 libros');
});

await prueba('B27 Respaldo JSON: exportar, borrar todo e importar restaura los datos', async (p) => {
  await cargarDemo(p);
  const [descarga] = await Promise.all([p.waitForEvent('download'), p.getByRole('button', { name: /Exportar respaldo/ }).click()]);
  assert.match(descarga.suggestedFilename(), /^biblioteca-respaldo-\d{4}-\d{2}-\d{2}\.json$/);
  const ruta = resolve(salida, 'tmp-respaldo.json');
  await descarga.saveAs(ruta);
  const datos = JSON.parse(readFileSync(ruta, 'utf8'));
  assert.equal(datos.libros.length, 10);
  assert.equal(datos.prestamos.length, 4);
  await p.getByRole('button', { name: /Borrar todo/ }).click();
  await dialogo(p).getByRole('button', { name: 'Borrar todo' }).click();
  await esperarSnack(p, 'Datos eliminados');
  await cerrarSnacks(p);
  await ir(p, `${BIB}/`);
  await p.getByText('La biblioteca está vacía').waitFor();
  await ir(p, `${BIB}/ajustes`);
  await p.locator('input[type=file]').setInputFiles(ruta);
  await dialogo(p).getByRole('button', { name: 'Importar' }).click();
  await esperarSnack(p, 'Respaldo importado');
  await ir(p, `${BIB}/`);
  assert.equal(await textoTarjeta(p, 'Títulos en catálogo'), '10');
  assert.equal(await textoTarjeta(p, 'Préstamos vencidos'), '1');
});

await prueba('B28 Importar archivo inválido muestra error y conserva los datos', async (p) => {
  await cargarDemo(p);
  const ruta = resolve(salida, 'tmp-invalido.json');
  writeFileSync(ruta, JSON.stringify({ hola: 1 }));
  await p.locator('input[type=file]').setInputFiles(ruta);
  await dialogo(p).getByRole('button', { name: 'Importar' }).click();
  await esperarSnack(p, 'no tiene el formato de respaldo esperado');
  await ir(p, `${BIB}/`);
  assert.equal(await textoTarjeta(p, 'Títulos en catálogo'), '10');
});

await prueba('B29 Ruta desconocida redirige al inicio', async (p) => {
  await ir(p, `${BIB}/no-existe`);
  await p.getByRole('heading', { name: 'Inicio' }).waitFor();
});

await prueba(
  'B30 Móvil: menú lateral oculto, se abre con el botón y navega',
  async (p) => {
    await ir(p, `${BIB}/`);
    const menu = p.locator('mat-sidenav');
    await p.waitForTimeout(300);
    assert.doesNotMatch(await menu.getAttribute('class'), /mat-drawer-opened/, 'menú cerrado en móvil');
    await p.getByRole('button', { name: 'Menú' }).click();
    await p.getByRole('link', { name: 'Libros' }).click();
    await p.getByRole('heading', { name: 'Catálogo de libros' }).waitFor();
    await p.waitForTimeout(400);
    assert.doesNotMatch(await menu.getAttribute('class'), /mat-drawer-opened/, 'el menú se cierra al navegar');
  },
  { viewport: { width: 390, height: 800 } },
);

await prueba('B31 Accesibilidad: los botones de icono tienen nombre accesible', async (p) => {
  await cargarDemo(p);
  await ir(p, `${BIB}/socios`);
  const sinNombre = await p.locator('table button:has(mat-icon)').evaluateAll((bs) =>
    bs.filter((b) => !b.getAttribute('aria-label') && !b.getAttribute('aria-labelledby') && b.textContent.trim() === b.querySelector('mat-icon')?.textContent.trim())
      .map((b) => b.querySelector('mat-icon').textContent.trim()),
  );
  assert.deepEqual([...new Set(sinNombre)], [], `botones de icono sin aria-label (el tooltip no da nombre a lectores de pantalla): ${[...new Set(sinNombre)].join(', ')}`);
});

// ---------- flujos de la clínica ----------
const MEDICOS = {
  m1: { nombre: 'Dra. Alejandra Prueba Morales', esp: 'Medicina general', dias: [1, 2, 3, 4, 5], horarios: 12, primero: '08:00' },
  m3: { nombre: 'Dra. Fernanda Ejemplo Ríos', esp: 'Pediatría', dias: [1, 3, 5], horarios: 12, primero: '09:00' },
  m4: { nombre: 'Dr. Miguel Muestra Ortega', esp: 'Odontología', dias: [2, 4, 6], horarios: 10, primero: '10:00' },
};
const PACIENTE = { nombre: 'Paciente Prueba Uno', telefono: '5511112222', email: 'paciente@prueba.test', motivo: 'Revisión de prueba' };

async function elegirFechaCalendario(p, fechaISO) {
  const [y, m, d] = fechaISO.split('-').map(Number);
  const entrada = p.locator('input[matinput][readonly]').first();
  await p.locator('mat-datepicker-toggle button').first().click();
  const calendario = p.locator('mat-calendar');
  await calendario.waitFor();
  await calendario.locator('.mat-calendar-body-cell').first().waitFor();
  for (let intento = 0; intento < 4; intento++) {
    const celda = calendario.locator(`.mat-calendar-body-cell:not(.mat-calendar-body-disabled)`).filter({ hasText: new RegExp(`^\\s*${d}\\s*$`) });
    if ((await celda.count()) > 0) {
      await celda.first().click();
      await calendario.waitFor({ state: 'hidden' });
      const valor = await entrada.inputValue();
      assert.equal(valor, `${d}/${m}/${y}`, `el campo de fecha muestra ${valor}, se esperaba ${d}/${m}/${y}`);
      return;
    }
    await calendario.locator('.mat-calendar-next-button').click();
    await p.waitForTimeout(200);
  }
  throw new Error(`no se encontró la fecha ${fechaISO} en el calendario`);
}
const pasoActivo = (p) => p.locator('.mat-vertical-content-container-active');

/** Recorre los 4 pasos y devuelve el folio. Si `soloHastaHorarios`, se detiene en el paso 3. */
async function agendar(p, medicoId, fechaISO, hora, paciente = PACIENTE, opciones = {}) {
  const m = MEDICOS[medicoId];
  if (!opciones.continuar) {
    await ir(p, `${CLI}/agendar`);
    await p.reload({ waitUntil: 'load' });
    await p.locator('router-outlet + *').first().waitFor();
  }
  await pasoActivo(p).getByRole('button', { name: m.esp }).click();
  await pasoActivo(p).getByRole('button', { name: 'Continuar' }).click();
  await pasoActivo(p).getByRole('button', { name: m.nombre }).click();
  await pasoActivo(p).getByRole('button', { name: 'Continuar' }).click();
  await elegirFechaCalendario(p, fechaISO);
  await pasoActivo(p).locator('.grid-horas').waitFor();
  if (opciones.soloHastaHorarios) return null;
  await pasoActivo(p).locator('button.hora', { hasText: hora }).click();
  await pasoActivo(p).getByRole('button', { name: 'Continuar' }).click();
  const paso = pasoActivo(p);
  await paso.getByLabel('Nombre completo').fill(paciente.nombre);
  await paso.getByLabel('Teléfono').fill(paciente.telefono);
  await paso.getByLabel('Correo electrónico').fill(paciente.email);
  await paso.getByLabel('Motivo').fill(paciente.motivo);
  await paso.getByRole('button', { name: 'Confirmar cita' }).click();
  if (opciones.esperarError) return null;
  const folio = (await p.locator('.folio').first().textContent()).trim();
  return folio;
}

console.log('\nCLÍNICA');

await prueba('C01 Inicio, servicios y equipo muestran el contenido esperado', async (p) => {
  await ir(p, `${CLI}/`);
  await p.getByRole('link', { name: 'Agendar cita' }).first().waitFor();
  await ir(p, `${CLI}/servicios`);
  for (const e of ['Medicina general', 'Pediatría', 'Odontología', 'Ginecología', 'Nutrición']) await p.getByText(e).first().waitFor();
  await ir(p, `${CLI}/equipo`);
  for (const m of Object.values(MEDICOS)) await p.getByText(m.nombre).first().waitFor();
  await ir(p, `${CLI}/contacto`);
  await p.getByText('Av. Ejemplo 123').first().waitFor();
});

await prueba('C02 Agendar cita completa genera folio y comprobante', async (p) => {
  const fecha = proximaFecha(MEDICOS.m1.dias);
  const folio = await agendar(p, 'm1', fecha, '08:00');
  assert.match(folio, /^CIT-[A-Z2-9]{6}$/);
  const tarjeta = p.locator('mat-card.confirmacion');
  await tarjeta.getByText('¡Cita agendada!').waitFor();
  assert.match(await texto(tarjeta), new RegExp(MEDICOS.m1.nombre));
  assert.match(await texto(tarjeta), /08:00 h/);
  assert.match(await texto(tarjeta), new RegExp(PACIENTE.nombre));
});

await prueba('C03 Horarios se generan según el horario del médico y la duración', async (p) => {
  await agendar(p, 'm1', proximaFecha(MEDICOS.m1.dias), null, PACIENTE, { soloHastaHorarios: true });
  const horas = await pasoActivo(p).locator('button.hora').allTextContents();
  assert.deepEqual(horas.map((h) => h.trim()), ['08:00', '08:30', '09:00', '09:30', '10:00', '10:30', '11:00', '11:30', '12:00', '12:30', '13:00', '13:30']);
  await agendar(p, 'm4', proximaFecha(MEDICOS.m4.dias), null, PACIENTE, { soloHastaHorarios: true });
  const horas45 = await pasoActivo(p).locator('button.hora').allTextContents();
  assert.equal(horas45.length, 10, 'odontología: 45 min de 10:00 a 18:00');
  assert.equal(horas45[0].trim(), '10:00');
  assert.equal(horas45.at(-1).trim(), '16:45');
});

await prueba('C04 Calendario solo habilita días en que atiende el médico y no antes de mañana', async (p) => {
  await ir(p, `${CLI}/agendar`);
  await pasoActivo(p).getByRole('button', { name: MEDICOS.m3.esp }).click();
  await pasoActivo(p).getByRole('button', { name: 'Continuar' }).click();
  await pasoActivo(p).getByRole('button', { name: MEDICOS.m3.nombre }).click();
  await pasoActivo(p).getByRole('button', { name: 'Continuar' }).click();
  await p.locator('mat-datepicker-toggle button').first().click();
  const calendario = p.locator('mat-calendar');
  await calendario.waitFor();
  const hoyCelda = calendario.locator('.mat-calendar-body-cell:has(.mat-calendar-body-today)');
  if ((await hoyCelda.count()) > 0) assert.match(await hoyCelda.getAttribute('class'), /mat-calendar-body-disabled/, 'hoy debe estar deshabilitado');
  const habilitadas = await calendario.locator('.mat-calendar-body-cell:not(.mat-calendar-body-disabled)').allTextContents();
  // Todas las habilitadas del mes visible deben caer en lunes, miércoles o viernes.
  const titulo = await calendario.locator('.mat-calendar-period-button').textContent();
  const [y, m] = hoyISO().split('-').map(Number);
  for (const t of habilitadas) {
    const d = Number(t.trim());
    const fecha = new Date(y, m - 1, d);
    assert.ok([1, 3, 5].includes(fecha.getDay()), `día ${d} (${titulo.trim()}) no es L/M/V`);
    assert.ok(aISO(fecha) > hoyISO(), `día ${d} no es posterior a hoy`);
  }
});

await prueba('C05 Horario ocupado queda deshabilitado para otro paciente', async (p) => {
  const fecha = proximaFecha(MEDICOS.m1.dias);
  await agendar(p, 'm1', fecha, '09:00');
  await p.getByRole('button', { name: 'Agendar otra cita' }).click();
  await agendar(p, 'm1', fecha, null, PACIENTE, { soloHastaHorarios: true, continuar: true });
  const ocupado = pasoActivo(p).locator('button.hora', { hasText: '09:00' });
  await pasoActivo(p).locator('button.hora.ocupada').first().waitFor({ timeout: 4000 }).catch(() => {});
  assert.equal(await ocupado.isDisabled(), true, 'el horario 09:00 debería aparecer ocupado');
  assert.match(await ocupado.getAttribute('class'), /ocupada/);
  assert.equal(await pasoActivo(p).locator('button.hora:not([disabled])').count(), 11);
});

await prueba('C06 Mismo teléfono, mismo médico y día en otra hora se rechaza', async (p) => {
  const fecha = proximaFecha(MEDICOS.m1.dias);
  const folio = await agendar(p, 'm1', fecha, '08:00');
  await p.getByRole('button', { name: 'Agendar otra cita' }).click();
  await agendar(p, 'm1', fecha, '10:00', PACIENTE, { continuar: true, esperarError: true });
  const t = await esperarSnack(p, 'Ya existe una cita para este teléfono');
  assert.match(t, new RegExp(folio));
  assert.equal(await p.locator('mat-card.confirmacion').count(), 0);
});

await prueba('C07 Formulario del paciente valida teléfono, correo y campos obligatorios', async (p) => {
  const fecha = proximaFecha(MEDICOS.m1.dias);
  await agendar(p, 'm1', fecha, null, PACIENTE, { soloHastaHorarios: true });
  await pasoActivo(p).locator('button.hora', { hasText: '08:00' }).click();
  await pasoActivo(p).getByRole('button', { name: 'Continuar' }).click();
  const paso = pasoActivo(p);
  const boton = paso.getByRole('button', { name: 'Confirmar cita' });
  assert.equal(await boton.isDisabled(), true);
  await paso.getByLabel('Nombre completo').fill('Alguien');
  await paso.getByLabel('Teléfono').fill('123456789');
  await paso.getByLabel('Correo electrónico').fill('no-es-correo');
  await paso.getByLabel('Motivo').fill('x');
  await paso.getByLabel('Nombre completo').click();
  await paso.getByText('Necesitamos 10 dígitos').waitFor();
  await paso.getByText('Correo no válido').waitFor();
  assert.equal(await boton.isDisabled(), true);
  await paso.getByLabel('Teléfono').fill('5511112222');
  await paso.getByLabel('Correo electrónico').fill('ok@prueba.test');
  assert.equal(await boton.isDisabled(), false);
});

await prueba('C08 Preselección por URL (?especialidad=&medico=) llega al paso de fecha', async (p) => {
  await ir(p, `${CLI}/agendar?especialidad=pediatria&medico=m3`);
  const seleccionadas = p.locator('button.opcion.seleccionada');
  await seleccionadas.first().waitFor();
  const textos = await seleccionadas.allTextContents();
  assert.ok(textos.some((t) => t.includes('Pediatría')), 'especialidad preseleccionada');
  assert.ok(textos.some((t) => t.includes(MEDICOS.m3.nombre)), 'médico preseleccionado');
});

await prueba('C09 Mis citas: consulta con folio y teléfono; teléfono incorrecto se rechaza', async (p) => {
  const fecha = proximaFecha(MEDICOS.m1.dias);
  const folio = await agendar(p, 'm1', fecha, '08:00');
  await ir(p, `${CLI}/mis-citas`);
  await p.getByLabel('Folio').fill(folio.toLowerCase());
  await p.getByLabel('Teléfono').fill('55 9999 9999');
  await p.getByRole('button', { name: 'Buscar cita' }).click();
  await esperarSnack(p, 'No encontramos una cita');
  await cerrarSnacks(p);
  await p.getByLabel('Teléfono').fill('55 1111 2222');
  await p.getByRole('button', { name: 'Buscar cita' }).click();
  const detalle = p.locator('mat-card.detalle');
  await detalle.waitFor();
  const t = await texto(detalle);
  assert.match(t, new RegExp(folio));
  assert.match(t, /Programada/);
  assert.match(t, /08:00 h/);
  assert.match(t, new RegExp(PACIENTE.motivo));
});

await prueba('C10 Cancelar cita libera el horario y ya no se puede volver a cancelar', async (p) => {
  const fecha = proximaFecha(MEDICOS.m1.dias);
  const folio = await agendar(p, 'm1', fecha, '08:30');
  await ir(p, `${CLI}/mis-citas`);
  await p.getByLabel('Folio').fill(folio);
  await p.getByLabel('Teléfono').fill(PACIENTE.telefono);
  await p.getByRole('button', { name: 'Buscar cita' }).click();
  p.once('dialog', (d) => d.accept());
  await p.getByRole('button', { name: 'Cancelar cita' }).click();
  await esperarSnack(p, 'Tu cita fue cancelada');
  await p.waitForTimeout(500);
  const detalle = p.locator('mat-card.detalle');
  assert.match(await texto(detalle), /Cancelada/, 'la tarjeta sigue mostrando la cita como Programada después de cancelarla');
  assert.equal(await detalle.getByRole('button', { name: 'Cancelar cita' }).count(), 0, 'el botón Cancelar cita sigue visible tras cancelar');
  // El horario 08:30 vuelve a estar libre.
  await agendar(p, 'm1', fecha, null, PACIENTE, { soloHastaHorarios: true });
  assert.equal(await pasoActivo(p).locator('button.hora', { hasText: '08:30' }).isDisabled(), false);
});

await prueba('C11 Cita persiste tras recargar y se puede descargar el .ics', async (p) => {
  const fecha = proximaFecha(MEDICOS.m1.dias);
  const folio = await agendar(p, 'm1', fecha, '11:00');
  await p.reload({ waitUntil: 'networkidle' });
  await ir(p, `${CLI}/mis-citas`);
  await p.getByLabel('Folio').fill(folio);
  await p.getByLabel('Teléfono').fill(PACIENTE.telefono);
  await p.getByRole('button', { name: 'Buscar cita' }).click();
  await p.locator('mat-card.detalle').waitFor();
  const [descarga] = await Promise.all([p.waitForEvent('download'), p.getByRole('button', { name: /Agregar al calendario/ }).click()]);
  assert.equal(descarga.suggestedFilename(), `cita-${folio}.ics`);
  const ruta = resolve(salida, 'tmp-cita.ics');
  await descarga.saveAs(ruta);
  const ics = readFileSync(ruta, 'utf8');
  assert.match(ics, new RegExp(`DTSTART:${fecha.replace(/-/g, '')}T110000`), `ics: ${ics.replace(/\r?\n/g, ' ')}`);
  assert.match(ics, new RegExp(`DTEND:${fecha.replace(/-/g, '')}T113000`));
});

async function cargarDemoClinica(p) {
  await ir(p, `${CLI}/recepcion`);
  await p.getByRole('button', { name: 'Más opciones' }).click();
  await p.getByRole('menuitem', { name: /Cargar citas de demostración/ }).click();
  const t = await esperarSnack(p, 'citas de demostración cargadas');
  await cerrarSnacks(p);
  await p.waitForTimeout(300);
  return Number(t.match(/(\d+) citas/)[1]);
}

await prueba('C12 Recepción: demo carga citas y el panel muestra las de hoy con resumen', async (p) => {
  const n = await cargarDemoClinica(p);
  assert.ok(n > 20, `se esperaban varias citas, hubo ${n}`);
  const filas = p.locator('table tr.mat-mdc-row');
  const hoyCount = await filas.count();
  assert.ok(hoyCount > 0, 'hoy debe tener citas');
  const chips = await p.locator('.resumen .chip').allTextContents();
  const suma = chips.reduce((s, c) => s + Number(c.trim().split(' ')[0]), 0);
  assert.equal(suma, hoyCount, 'el resumen debe sumar las filas del día');
  // Orden por hora.
  const horas = await filas.locator('td:first-child').allTextContents();
  assert.deepEqual(horas, [...horas].sort());
});

await prueba('C13 Recepción: navegar de día y filtrar por médico y estado', async (p) => {
  await cargarDemoClinica(p);
  await botonIcono(p, 'chevron_right').click();
  await p.getByText(new RegExp(String(Number(sumarDias(hoyISO(), 1).split('-')[2])))).first().waitFor();
  await p.getByRole('button', { name: 'Hoy' }).click();
  await p.locator('.fecha-larga').filter({ hasText: new RegExp(`\\b${Number(hoyISO().split('-')[2])} de `) }).waitFor();
  await p.waitForTimeout(300);
  const total = await p.locator('table tr.mat-mdc-row').count();
  await elegirOpcion(p, 'Médico', MEDICOS.m1.nombre);
  const filasMedico = p.locator('table tr.mat-mdc-row');
  const nMedico = await filasMedico.count();
  assert.ok(nMedico <= total);
  for (const t of await filasMedico.allTextContents()) assert.match(t, new RegExp(MEDICOS.m1.nombre));
  await elegirOpcion(p, 'Médico', 'Todos');
  // Filtra por el primer estado presente hoy según el resumen (p. ej. "3 Programada").
  const estadoHoy = (await p.locator('.resumen .chip').first().textContent()).trim().split(' ').slice(1).join(' ');
  await elegirOpcion(p, 'Estado', estadoHoy);
  const filas = await p.locator('table tr.mat-mdc-row').allTextContents();
  assert.ok(filas.length > 0);
  for (const t of filas) assert.match(t, new RegExp(estadoHoy));
});

await prueba('C14 Recepción: confirmar, marcar atendida, agregar nota y cancelar con motivo', async (p) => {
  await cargarDemoClinica(p);
  await elegirOpcion(p, 'Estado', 'Programada');
  await p.locator('table tr.mat-mdc-row').first().waitFor();
  await p.waitForTimeout(500);
  const folio = (await p.locator('table tr.mat-mdc-row .sub').first().textContent()).split('·')[1].trim();
  const fila = p.locator('table tr.mat-mdc-row').filter({ hasText: folio });
  await botonIcono(fila, 'task_alt').click();
  await esperarSnack(p, `Cita ${folio}: confirmada`);
  await cerrarSnacks(p);
  await elegirOpcion(p, 'Estado', 'Todos');
  const filaFolio = p.locator('table tr.mat-mdc-row').filter({ hasText: folio });
  assert.match(await texto(filaFolio), /Confirmada/);
  assert.equal(await botonIcono(filaFolio, 'task_alt').count(), 0);
  p.once('dialog', (d) => d.accept('Paciente avisó retraso'));
  await botonIcono(filaFolio, 'edit_note').click();
  await esperarSnack(p, 'Nota guardada');
  await cerrarSnacks(p);
  assert.match(await texto(filaFolio), /Nota: Paciente avisó retraso/);
  await botonIcono(filaFolio, 'how_to_reg').click();
  await esperarSnack(p, `Cita ${folio}: atendida`);
  await cerrarSnacks(p);
  assert.match(await texto(filaFolio), /Atendida/);
  assert.equal(await filaFolio.locator('mat-icon:text-is("event_busy")').count(), 0, 'atendida no se puede cancelar');
  // Cancelar otra cita programada o confirmada con motivo.
  const folioOtra = (await p.locator('table tr.mat-mdc-row').filter({ has: p.locator('mat-icon:text-is("event_busy")') }).first().locator('.sub').first().textContent()).split('·')[1].trim();
  const otra = p.locator('table tr.mat-mdc-row').filter({ hasText: folioOtra });
  p.once('dialog', (d) => d.accept('Sin motivo'));
  await botonIcono(otra, 'event_busy').click();
  await esperarSnack(p, 'Cita cancelada');
  const cancelada = p.locator('table tr.mat-mdc-row').filter({ hasText: folioOtra });
  assert.match(await texto(cancelada), /Cancelada/);
  assert.match(await texto(cancelada), /Nota: Sin motivo/);
});

await prueba('C15 Recepción: exportar CSV del día y borrar todas las citas', async (p) => {
  await cargarDemoClinica(p);
  const [descarga] = await Promise.all([p.waitForEvent('download'), p.getByRole('button', { name: /Exportar CSV/ }).click()]);
  assert.equal(descarga.suggestedFilename(), `citas-${hoyISO()}.csv`);
  const ruta = resolve(salida, 'tmp-citas.csv');
  await descarga.saveAs(ruta);
  const lineas = readFileSync(ruta, 'utf8').split('\r\n');
  assert.equal(lineas.length - 1, await p.locator('table tr.mat-mdc-row').count());
  p.once('dialog', (d) => d.accept());
  await p.getByRole('button', { name: 'Más opciones' }).click();
  await p.getByRole('menuitem', { name: /Borrar todas las citas/ }).click();
  await esperarSnack(p, 'Citas eliminadas');
  await p.getByText('No hay citas para esta fecha').waitFor();
});

await prueba('C16 Cita agendada por paciente aparece en recepción ese día', async (p) => {
  const fecha = proximaFecha(MEDICOS.m1.dias);
  const folio = await agendar(p, 'm1', fecha, '12:00');
  await ir(p, `${CLI}/recepcion`);
  const dias = Math.round((new Date(fecha) - new Date(hoyISO())) / 86400000);
  for (let i = 0; i < dias; i++) await botonIcono(p, 'chevron_right').click();
  const fila = p.locator('table tr.mat-mdc-row').filter({ hasText: folio });
  await fila.waitFor();
  assert.match(await texto(fila), /12:00/);
  assert.match(await texto(fila), /Programada/);
});

await prueba(
  'C17 Móvil: menú hamburguesa navega a Agendar',
  async (p) => {
    await ir(p, `${CLI}/`);
    assert.equal(await p.locator('nav.enlaces').count(), 0, 'en móvil no hay barra de enlaces');
    await p.getByRole('button', { name: 'Abrir menú' }).click();
    await p.locator('mat-sidenav').getByRole('link', { name: 'Agendar cita' }).click();
    await p.getByRole('heading', { name: 'Agendar cita' }).waitFor();
  },
  { viewport: { width: 390, height: 800 } },
);

await prueba('C18 Accesibilidad: botones de icono de recepción tienen nombre accesible', async (p) => {
  await cargarDemoClinica(p);
  const sinNombre = await p.locator('button:has(mat-icon)').evaluateAll((bs) =>
    bs.filter((b) => !b.getAttribute('aria-label') && !b.getAttribute('aria-labelledby') && b.textContent.trim() === b.querySelector('mat-icon')?.textContent.trim())
      .map((b) => b.querySelector('mat-icon').textContent.trim()),
  );
  assert.deepEqual([...new Set(sinNombre)], [], `botones de icono sin aria-label: ${[...new Set(sinNombre)].join(', ')}`);
});

await prueba('C19 Ruta desconocida redirige al inicio', async (p) => {
  await ir(p, `${CLI}/lo-que-sea`);
  await p.getByText('Atención médica cercana').first().waitFor();
});


// ---------- segunda ronda: casos límite, entradas raras, concurrencia, PWA ----------

/** Inserta registros directamente en IndexedDB (la app debe haber abierto la base antes). */
async function insertarEnIDB(p, nombreDB, tabla, registros) {
  await p.evaluate(
    ([nombreDB, tabla, registros]) =>
      new Promise((res, rej) => {
        const req = indexedDB.open(nombreDB);
        req.onerror = () => rej(req.error);
        req.onsuccess = () => {
          const db = req.result;
          const tx = db.transaction(tabla, 'readwrite');
          const st = tx.objectStore(tabla);
          for (const r of registros) st.add(r);
          tx.oncomplete = () => { db.close(); res(); };
          tx.onerror = () => rej(tx.error);
        };
      }),
    [nombreDB, tabla, registros],
  );
}
async function leerIDB(p, nombreDB, tabla) {
  return p.evaluate(
    ([nombreDB, tabla]) =>
      new Promise((res, rej) => {
        const req = indexedDB.open(nombreDB);
        req.onerror = () => rej(req.error);
        req.onsuccess = () => {
          const db = req.result;
          const q = db.transaction(tabla).objectStore(tabla).getAll();
          q.onsuccess = () => { db.close(); res(q.result); };
          q.onerror = () => rej(q.error);
        };
      }),
    [nombreDB, tabla],
  );
}
/** Elige una fecha (pasada o futura) navegando el calendario de Material que ya está abierto. */
async function elegirEnCalendario(p, fechaISO) {
  const [y, m, d] = fechaISO.split('-').map(Number);
  const calendario = p.locator('mat-calendar');
  await calendario.waitFor();
  await calendario.locator('.mat-calendar-body-cell').first().waitFor();
  const meses = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];
  for (let i = 0; i < 12; i++) {
    const periodo = (await calendario.locator('.mat-calendar-period-button').textContent()).toLowerCase();
    const mesVisible = meses.findIndex((x) => periodo.includes(x));
    const anioVisible = Number(periodo.match(/\d{4}/)[0]);
    if (mesVisible === m - 1 && anioVisible === y) {
      await calendario.locator('.mat-calendar-body-cell:not(.mat-calendar-body-disabled)').filter({ hasText: new RegExp(`^\\s*${d}\\s*$`) }).first().click();
      await calendario.waitFor({ state: 'hidden' });
      return;
    }
    const adelante = anioVisible < y || (anioVisible === y && mesVisible < m - 1);
    await calendario.locator(adelante ? '.mat-calendar-next-button' : '.mat-calendar-previous-button').click();
    await p.waitForTimeout(150);
  }
  throw new Error(`no se pudo llegar a ${fechaISO}`);
}
async function abrirDialogoPrestamo(p, socio, libro) {
  await ir(p, `${BIB}/prestamos`);
  await p.getByRole('button', { name: /Nuevo préstamo/ }).click();
  await dialogo(p).waitFor();
  if (socio) await elegirAutocompletado(p, 'Socio', socio, socio);
  if (libro) await elegirAutocompletado(p, 'Libro', libro, libro);
}

console.log('\nBIBLIOTECA (segunda ronda)');

await prueba('B32 Préstamo con fecha pasada: vence hoy no cuenta como vencido y permite renovar', async (p) => {
  await cargarDemo(p);
  await abrirDialogoPrestamo(p, 'Carlos Díaz Ejemplo', 'Clean Code');
  await dialogo(p).locator('mat-datepicker-toggle button').click();
  await elegirEnCalendario(p, sumarDias(hoyISO(), -14));
  await dialogo(p).getByText(`Vence el ${hoyISO()}`).waitFor();
  await dialogo(p).getByRole('button', { name: 'Registrar préstamo' }).click();
  await esperarSnack(p, 'Préstamo registrado');
  await cerrarSnacks(p);
  const fila = p.locator('table tr.mat-mdc-row').filter({ hasText: 'Carlos Díaz' }).filter({ hasText: 'Clean Code' });
  const t = await texto(fila);
  assert.match(t, /Vence hoy/);
  assert.match(t, /\$0\.00/);
  assert.equal(await botonIcono(fila, 'update').isDisabled(), false, 'vence hoy: todavía se puede renovar');
  assert.equal(await p.locator('.badge-vencidos').count() && (await p.locator('.badge-vencidos').textContent()).trim(), '1', 'solo el vencido de la demo');
  // Carlos puede tomar otro libro: vence hoy no es vencido.
  await nuevoPrestamo(p, 'Carlos Díaz Ejemplo', 'Cálculo');
  await esperarSnack(p, 'Préstamo registrado');
});

await prueba('B33 Préstamo con fecha 15 días atrás nace vencido con 1 día y multa de 10', async (p) => {
  await cargarDemo(p);
  await abrirDialogoPrestamo(p, 'Carlos Díaz Ejemplo', 'Clean Code');
  await dialogo(p).locator('mat-datepicker-toggle button').click();
  await elegirEnCalendario(p, sumarDias(hoyISO(), -15));
  await dialogo(p).getByRole('button', { name: 'Registrar préstamo' }).click();
  await esperarSnack(p, 'Préstamo registrado');
  await cerrarSnacks(p);
  const fila = p.locator('table tr.mat-mdc-row').filter({ hasText: 'Carlos Díaz' }).filter({ hasText: 'Clean Code' });
  const t = await texto(fila);
  assert.match(t, /Vencido \(1 d\)/);
  assert.match(t, /\$10\.00/);
  assert.equal(await botonIcono(fila, 'update').isDisabled(), true);
  assert.equal((await p.locator('.badge-vencidos').textContent()).trim(), '2');
});

await prueba('B34 Fecha de préstamo escrita a mano en formato local (d/M/aaaa) se interpreta bien', async (p) => {
  await cargarDemo(p);
  await abrirDialogoPrestamo(p, 'Carlos Díaz Ejemplo', 'Clean Code');
  const campo = dialogo(p).getByLabel('Fecha de préstamo');
  const mostrado = await campo.inputValue(); // así muestra la app la fecha de hoy, p. ej. 18/9/2026
  const [dd, mm, aaaa] = mostrado.split('/').map(Number);
  assert.equal(`${aaaa}-${String(mm).padStart(2, '0')}-${String(dd).padStart(2, '0')}`, hoyISO(), `el campo muestra ${mostrado}`);
  // Escribir 4 días antes en el mismo formato que muestra el campo.
  const objetivo = sumarDias(hoyISO(), -4);
  const [y, m, d] = objetivo.split('-').map(Number);
  await campo.fill(`${d}/${m}/${y}`);
  await campo.blur();
  await p.waitForTimeout(300);
  const esperado = sumarDias(objetivo, 14);
  const resumen = await texto(dialogo(p).locator('.resumen'));
  const boton = dialogo(p).getByRole('button', { name: 'Registrar préstamo' });
  assert.ok(
    resumen.includes(`Vence el ${esperado}`) && !(await boton.isDisabled()),
    `al escribir ${d}/${m}/${y} el diálogo muestra "${resumen}" y el botón ${(await boton.isDisabled()) ? 'queda deshabilitado' : 'sigue habilitado'} (se esperaba vencer el ${esperado})`,
  );
});

await prueba('B35 Fecha de préstamo futura no se acepta', async (p) => {
  await cargarDemo(p);
  await abrirDialogoPrestamo(p, 'Carlos Díaz Ejemplo', 'Clean Code');
  await dialogo(p).locator('mat-datepicker-toggle button').click();
  const calendario = p.locator('mat-calendar');
  await calendario.locator('.mat-calendar-body-cell').first().waitFor();
  // Todas las celdas posteriores a hoy deben estar deshabilitadas en el mes visible.
  const hoyCelda = calendario.locator('.mat-calendar-body-cell:has(.mat-calendar-body-today)');
  assert.doesNotMatch(await hoyCelda.getAttribute('class'), /mat-calendar-body-disabled/, 'hoy debe estar habilitado');
  const dia = Number(hoyISO().split('-')[2]);
  const habilitadas = (await calendario.locator('.mat-calendar-body-cell:not(.mat-calendar-body-disabled)').allTextContents()).map((x) => Number(x.trim()));
  assert.ok(habilitadas.every((x) => x <= dia), `hay días futuros habilitados: ${habilitadas.filter((x) => x > dia)}`);
});

await prueba('B36 Socio o libro escritos sin elegir de la lista no permiten registrar', async (p) => {
  await cargarDemo(p);
  await abrirDialogoPrestamo(p);
  const socio = dialogo(p).getByRole('combobox', { name: 'Socio' });
  await socio.click();
  await socio.fill('Ana Torres Ejemplo');
  await p.keyboard.press('Escape');
  const libro = dialogo(p).getByRole('combobox', { name: 'Libro' });
  await libro.click();
  await libro.fill('Clean Code');
  await p.keyboard.press('Escape');
  await dialogo(p).getByLabel('Fecha de préstamo').click();
  assert.equal(await dialogo(p).getByRole('button', { name: 'Registrar préstamo' }).isDisabled(), true);
  await dialogo(p).getByText('Selecciona un socio de la lista').waitFor();
});

await prueba('B37 Cambiar ISBN de un libro a uno existente se rechaza', async (p) => {
  await cargarDemo(p);
  await ir(p, `${BIB}/libros`);
  await botonIcono(await filaTabla(p, 'Pedro Páramo'), 'edit').click();
  const d = dialogo(p);
  await llenar(p, 'ISBN', '9780132350884', d);
  await d.getByRole('button', { name: 'Guardar cambios' }).click();
  await esperarSnack(p, 'Ya existe un libro con el ISBN 9780132350884');
  await d.waitFor({ state: 'visible' });
});

await prueba('B38 ISBN igual con y sin guiones se detecta como duplicado', async (p) => {
  await cargarDemo(p);
  await registrarLibro(p, { titulo: 'Clean Code (otra edición)', autor: 'Robert C. Martin', isbn: '978-0-13-235088-4' });
  const snack = await snackbar(p).first().textContent();
  assert.match(snack, /Ya existe un libro con el ISBN/, `se registró un segundo "Clean Code" con el mismo ISBN escrito con guiones (mensaje: "${snack.trim()}")`);
});

await prueba('B39 Ejemplares totales y año no aceptan decimales', async (p) => {
  await ir(p, `${BIB}/libros`);
  await p.getByRole('button', { name: /Nuevo libro/ }).click();
  const d = dialogo(p);
  await llenar(p, 'Título', 'Decimales', d);
  await llenar(p, 'Autor', 'Alguien', d);
  await llenar(p, 'ISBN', '9781111111111', d);
  await llenar(p, 'Ejemplares totales', '2.5', d);
  const boton = d.getByRole('button', { name: 'Registrar libro' });
  assert.equal(await boton.isDisabled(), true, 'con 2.5 ejemplares el botón debería estar deshabilitado');
});

await prueba('B40 Título o nombre con solo espacios no se aceptan', async (p) => {
  await ir(p, `${BIB}/libros`);
  await p.getByRole('button', { name: /Nuevo libro/ }).click();
  const d = dialogo(p);
  await llenar(p, 'Título', '   ', d);
  await llenar(p, 'Autor', '   ', d);
  await llenar(p, 'ISBN', '9781111111111', d);
  assert.equal(await d.getByRole('button', { name: 'Registrar libro' }).isDisabled(), true, 'título y autor en blanco pasan la validación');
});

await prueba('B41 Editar socio conserva código, fecha de alta y estado', async (p) => {
  await cargarDemo(p);
  await ir(p, `${BIB}/socios`);
  const fila = await filaTabla(p, 'Luis Ramírez');
  const antes = await texto(fila);
  const codigo = antes.match(/S-\d{4}/)[0];
  const alta = antes.match(/Alta: (\d{4}-\d{2}-\d{2})/)[1];
  await botonIcono(fila, 'edit').click();
  const d = dialogo(p);
  await d.getByText(`Editar socio ${codigo}`).waitFor();
  await llenar(p, 'Nombre completo', 'Luis Ramírez Editado', d);
  await elegirOpcion(p, 'Tipo de socio', 'Externo', d);
  await d.getByRole('button', { name: 'Guardar cambios' }).click();
  await esperarSnack(p, 'Socio actualizado');
  const despues = await texto(await filaTabla(p, 'Luis Ramírez Editado'));
  assert.match(despues, new RegExp(codigo));
  assert.match(despues, new RegExp(`Alta: ${alta}`));
  assert.match(despues, /externo/);
  assert.match(despues, /1 \/ 3/, 'sigue con su préstamo activo');
  assert.match(despues, /Activo/);
});

await prueba('B42 Reducir ejemplares al número prestado deja el libro agotado y fuera del préstamo', async (p) => {
  await cargarDemo(p);
  await ir(p, `${BIB}/libros`);
  await botonIcono(await filaTabla(p, 'Clean Code'), 'edit').click();
  await llenar(p, 'Ejemplares totales', 1, dialogo(p));
  await dialogo(p).getByRole('button', { name: 'Guardar cambios' }).click();
  await esperarSnack(p, 'Libro actualizado');
  await cerrarSnacks(p);
  assert.match(await texto(await filaTabla(p, 'Clean Code')), /0 \/ 1/);
  await elegirOpcion(p, 'Disponibilidad', 'Sin ejemplares disponibles');
  await p.getByText('2 de 10 títulos').waitFor();
  await nuevoPrestamo(p, 'Carlos Díaz Ejemplo', 'Cálculo');
  await esperarSnack(p, 'Préstamo registrado');
  await ir(p, `${BIB}/`);
  await p.waitForTimeout(300);
  assert.equal(await textoTarjeta(p, 'Ejemplares disponibles'), '15', '19 menos 3 de Clean Code menos 1 de Cálculo');
});

await prueba('B43 Reactivar un socio inactivo vuelve a permitirle préstamos', async (p) => {
  await cargarDemo(p);
  await ir(p, `${BIB}/socios`);
  const fila = await filaTabla(p, 'Carlos Díaz');
  await fila.locator('mat-slide-toggle button').click();
  await esperarSnack(p, 'Socio desactivado');
  await cerrarSnacks(p);
  assert.match(await texto(fila), /Inactivo/);
  await fila.locator('mat-slide-toggle button').click();
  await esperarSnack(p, 'Socio activado');
  await cerrarSnacks(p);
  assert.match(await texto(fila), /Activo/);
  await nuevoPrestamo(p, 'Carlos Díaz Ejemplo', 'Clean Code');
  await esperarSnack(p, 'Préstamo registrado');
});

await prueba('B44 Búsqueda de préstamos por código de socio y filtro Todos', async (p) => {
  await cargarDemo(p);
  await ir(p, `${BIB}/prestamos`);
  await p.locator('mat-button-toggle', { hasText: 'Todos' }).click();
  await p.locator('table tr.mat-mdc-row').nth(3).waitFor();
  assert.equal(await p.locator('table tr.mat-mdc-row').count(), 4);
  await p.getByLabel('Buscar por libro o socio').fill('S-0004');
  await p.waitForTimeout(200);
  assert.equal(await p.locator('table tr.mat-mdc-row').count(), 1);
  assert.match(await texto(p.locator('table tr.mat-mdc-row').first()), /Carlos Díaz.*Devuelto con multa/);
  await p.getByLabel('Buscar por libro o socio').fill('zzzz');
  await p.getByText('No hay préstamos que mostrar').waitFor();
});

await prueba('B45 Ajustes: valores inválidos deshabilitan Guardar y el botón queda inactivo sin cambios', async (p) => {
  await ir(p, `${BIB}/ajustes`);
  const boton = p.getByRole('button', { name: 'Guardar reglas' });
  await p.waitForTimeout(300);
  assert.equal(await boton.isDisabled(), true, 'sin cambios');
  await llenar(p, 'Días de préstamo', 0);
  assert.equal(await boton.isDisabled(), true, 'días = 0');
  await llenar(p, 'Días de préstamo', 10);
  await llenar(p, 'Multa por día', -1);
  assert.equal(await boton.isDisabled(), true, 'multa negativa');
  await llenar(p, 'Multa por día', 0);
  assert.equal(await boton.isDisabled(), false, 'multa 0 es válida');
  await boton.click();
  await esperarSnack(p, 'Reglas guardadas');
  await p.waitForTimeout(300);
  assert.equal(await boton.isDisabled(), true, 'vuelve a quedar sin cambios');
});

await prueba('B46 Eliminar socio con historial devuelto elimina también su historial', async (p) => {
  await cargarDemo(p);
  await ir(p, `${BIB}/socios`);
  await botonIcono(await filaTabla(p, 'Carlos Díaz'), 'delete').click();
  await dialogo(p).getByRole('button', { name: 'Eliminar' }).click();
  await esperarSnack(p, 'Socio eliminado');
  await ir(p, `${BIB}/prestamos`);
  await p.locator('mat-button-toggle', { hasText: 'Todos' }).click();
  await p.waitForTimeout(300);
  assert.equal(await p.locator('table tr.mat-mdc-row').count(), 3);
  assert.equal(await p.locator('table tr.mat-mdc-row').filter({ hasText: 'eliminado' }).count(), 0);
});

await prueba('B47 Dos pestañas: el segundo préstamo del último ejemplar se rechaza', async (p) => {
  await cargarDemo(p);
  const p2 = await contexto.newPage();
  p2.on('pageerror', (e) => erroresConsola.push(`pageerror(p2): ${e.message}`));
  // Domain-Driven Design tiene 1 ejemplar. Ambas pestañas abren el diálogo con él elegido.
  await abrirDialogoPrestamo(p, 'Ana Torres Ejemplo', 'Domain-Driven Design');
  await abrirDialogoPrestamo(p2, 'Carlos Díaz Ejemplo', 'Domain-Driven Design');
  await dialogo(p).getByRole('button', { name: 'Registrar préstamo' }).click();
  await esperarSnack(p, 'Préstamo registrado');
  await dialogo(p2).getByRole('button', { name: 'Registrar préstamo' }).click();
  await esperarSnack(p2, 'No hay ejemplares disponibles de "Domain-Driven Design"');
  await p2.close();
  await ir(p, `${BIB}/libros`);
  assert.match(await texto(await filaTabla(p, 'Domain-Driven Design')), /0 \/ 1/);
});

await prueba('B48 Los datos de una pestaña aparecen en la otra sin recargar (liveQuery)', async (p) => {
  await cargarDemo(p);
  const p2 = await contexto.newPage();
  await ir(p2, `${BIB}/`);
  assert.equal(await textoTarjeta(p2, 'Préstamos activos'), '3');
  await nuevoPrestamo(p, 'Carlos Díaz Ejemplo', 'Clean Code');
  await esperarSnack(p, 'Préstamo registrado');
  await p2.locator('mat-card').filter({ hasText: 'Préstamos activos' }).locator('.valor').filter({ hasText: '4' }).waitFor({ timeout: 5000 });
  await p2.close();
});

await prueba('B49 Enter en el diálogo registra y Escape lo cierra sin guardar', async (p) => {
  await ir(p, `${BIB}/socios`);
  await p.getByRole('button', { name: /Nuevo socio/ }).click();
  const d = dialogo(p);
  await llenar(p, 'Nombre completo', 'Con Enter', d);
  await llenar(p, 'Correo electrónico', 'enter@prueba.test', d);
  await d.getByLabel('Correo electrónico').press('Enter');
  await esperarSnack(p, 'Socio registrado');
  await cerrarSnacks(p);
  await d.waitFor({ state: 'hidden' });
  await p.getByRole('button', { name: /Nuevo socio/ }).click();
  await llenar(p, 'Nombre completo', 'Con Escape', dialogo(p));
  await p.keyboard.press('Escape');
  await dialogo(p).waitFor({ state: 'hidden' });
  await p.getByText('1 de 1 socios').waitFor();
});

await prueba('B50 PWA: cerrar la pestaña y volver sin conexión abre la biblioteca con sus datos', async (p) => {
  await ir(p, `${BIB}/`);
  await p.evaluate(() => navigator.serviceWorker.ready.then(() => undefined));
  // El service worker de Angular precarga los archivos del manifiesto (ngsw.json) tras activarse;
  // se le da el tiempo que tardaría un uso normal de la app antes de cerrar la pestaña.
  await p.waitForFunction(
    async () => {
      const manifiesto = await fetch('ngsw.json').then((r) => r.json());
      const cache = (await caches.keys()).find((n) => n.endsWith(':assets:app:cache'));
      return !!cache && (await (await caches.open(cache)).keys()).length >= manifiesto.assetGroups[0].urls.length;
    },
    null,
    { timeout: 90000, polling: 1000 },
  );
  await cargarDemo(p);
  await p.waitForTimeout(15000);
  // El usuario cierra la pestaña y más tarde vuelve a abrir la app sin internet.
  await p.close();
  await new Promise((r) => setTimeout(r, 10000));
  await contexto.setOffline(true);
  try {
    const p2 = await contexto.newPage();
    await p2.goto(`${BIB}/libros`, { waitUntil: 'load', timeout: 20000 });
    await p2.getByText('10 de 10 títulos').waitFor({ timeout: 15000 });
    assert.equal(await p2.title(), 'Libros | Biblioteca');
    await p2.close();
  } finally {
    await contexto.setOffline(false);
  }
});

// ---------- clínica, segunda ronda ----------
console.log('\nCLÍNICA (segunda ronda)');

await prueba('C20 Cambiar de especialidad reinicia médico, fecha y hora', async (p) => {
  const fecha = proximaFecha(MEDICOS.m1.dias);
  await agendar(p, 'm1', fecha, null, PACIENTE, { soloHastaHorarios: true });
  await pasoActivo(p).locator('button.hora', { hasText: '08:00' }).click();
  await pasoActivo(p).getByRole('button', { name: 'Continuar' }).click();
  // Regresar al paso 1 y elegir otra especialidad.
  await p.locator('.mat-step-header').nth(0).click();
  await pasoActivo(p).getByRole('button', { name: MEDICOS.m3.esp }).click();
  await pasoActivo(p).getByRole('button', { name: 'Continuar' }).click();
  const medicos = await pasoActivo(p).locator('button.opcion').allTextContents();
  assert.equal(medicos.length, 1);
  assert.match(medicos[0], new RegExp(MEDICOS.m3.nombre));
  assert.equal(await pasoActivo(p).locator('button.opcion.seleccionada').count(), 0, 'ningún médico preseleccionado');
  assert.equal(await pasoActivo(p).getByRole('button', { name: 'Continuar' }).isDisabled(), true);
});

await prueba('C21 Enlaces de Servicios y Equipo preseleccionan especialidad y médico', async (p) => {
  await ir(p, `${CLI}/servicios`);
  await p.locator('mat-card').filter({ hasText: 'Odontología' }).getByRole('link', { name: 'Agendar' }).click();
  await p.locator('button.opcion.seleccionada').filter({ hasText: 'Odontología' }).waitFor();
  await ir(p, `${CLI}/equipo`);
  await p.getByRole('link', { name: /Agendar con Dra\. Fernanda/ }).click();
  await p.locator('button.opcion.seleccionada').filter({ hasText: MEDICOS.m3.nombre }).waitFor({ state: 'attached' });
  await p.locator('button.opcion.seleccionada').filter({ hasText: 'Pediatría' }).waitFor();
});

await prueba('C22 Nombre o motivo con solo espacios no se aceptan', async (p) => {
  const fecha = proximaFecha(MEDICOS.m1.dias);
  await agendar(p, 'm1', fecha, null, PACIENTE, { soloHastaHorarios: true });
  await pasoActivo(p).locator('button.hora', { hasText: '08:00' }).click();
  await pasoActivo(p).getByRole('button', { name: 'Continuar' }).click();
  const paso = pasoActivo(p);
  await paso.getByLabel('Nombre completo').fill('   ');
  await paso.getByLabel('Teléfono').fill(PACIENTE.telefono);
  await paso.getByLabel('Correo electrónico').fill(PACIENTE.email);
  await paso.getByLabel('Motivo').fill('   ');
  assert.equal(await paso.getByRole('button', { name: 'Confirmar cita' }).isDisabled(), true, 'nombre y motivo en blanco pasan la validación');
});

await prueba('C23 Fecha de nacimiento futura no se acepta', async (p) => {
  const fecha = proximaFecha(MEDICOS.m1.dias);
  await agendar(p, 'm1', fecha, null, PACIENTE, { soloHastaHorarios: true });
  await pasoActivo(p).locator('button.hora', { hasText: '08:00' }).click();
  await pasoActivo(p).getByRole('button', { name: 'Continuar' }).click();
  const paso = pasoActivo(p);
  await paso.getByLabel('Nombre completo').fill(PACIENTE.nombre);
  await paso.getByLabel('Teléfono').fill(PACIENTE.telefono);
  await paso.getByLabel('Correo electrónico').fill(PACIENTE.email);
  await paso.getByLabel('Motivo').fill(PACIENTE.motivo);
  await paso.getByLabel('Fecha de nacimiento').fill(sumarDias(hoyISO(), 365));
  assert.equal(await paso.getByRole('button', { name: 'Confirmar cita' }).isDisabled(), true, 'una fecha de nacimiento futura pasa la validación');
});

await prueba('C24 Dos pestañas eligen el mismo horario: la segunda recibe "acaba de ocuparse"', async (p) => {
  const fecha = proximaFecha(MEDICOS.m1.dias);
  const p2 = await contexto.newPage();
  p2.on('pageerror', (e) => erroresConsola.push(`pageerror(p2): ${e.message}`));
  const otro = { ...PACIENTE, nombre: 'Paciente Prueba Dos', telefono: '5533334444' };
  // Ambas llegan al paso 4 con 10:00 elegido antes de que alguna confirme.
  for (const [pag, pac] of [[p, PACIENTE], [p2, otro]]) {
    await agendar(pag, 'm1', fecha, null, pac, { soloHastaHorarios: true });
    await pasoActivo(pag).locator('button.hora', { hasText: '10:00' }).click();
    await pasoActivo(pag).getByRole('button', { name: 'Continuar' }).click();
    const paso = pasoActivo(pag);
    await paso.getByLabel('Nombre completo').fill(pac.nombre);
    await paso.getByLabel('Teléfono').fill(pac.telefono);
    await paso.getByLabel('Correo electrónico').fill(pac.email);
    await paso.getByLabel('Motivo').fill(pac.motivo);
  }
  await pasoActivo(p).getByRole('button', { name: 'Confirmar cita' }).click();
  await p.locator('mat-card.confirmacion').waitFor();
  // La segunda pestaña recibe el aviso y regresa al paso 3 con el horario 10:00 marcado como ocupado.
  await esperarSnack(p2, 'acaba de ocuparse');
  await pasoActivo(p2).locator('button.hora.ocupada', { hasText: '10:00' }).waitFor();
  assert.equal(await pasoActivo(p2).getByRole('button', { name: 'Continuar' }).isDisabled(), true, 'sin hora no debe poder continuar');
  assert.equal(await p2.locator('mat-card.confirmacion').count(), 0);
  assert.equal(await p2.locator('mat-card.confirmacion').count(), 0);
  await p2.close();
  const citas = await leerIDB(p, 'clinica-db', 'citas');
  assert.equal(citas.filter((c) => c.fecha === fecha && c.hora === '10:00' && c.medicoId === 'm1').length, 1);
});

await prueba('C24b Si el horario se ocupa mientras se llenan los datos, avisa y regresa a elegir hora', async (p) => {
  const fecha = proximaFecha(MEDICOS.m1.dias);
  await agendar(p, 'm1', fecha, null, PACIENTE, { soloHastaHorarios: true });
  await pasoActivo(p).locator('button.hora', { hasText: '08:30' }).click();
  await pasoActivo(p).getByRole('button', { name: 'Continuar' }).click();
  await pasoActivo(p).getByLabel('Nombre completo').fill(PACIENTE.nombre);
  // Otra pestaña toma 08:30.
  const p2 = await contexto.newPage();
  await agendar(p2, 'm1', fecha, '08:30', { ...PACIENTE, telefono: '5599990000' });
  await p2.close();
  await esperarSnack(p, 'acaba de ocuparse');
  await pasoActivo(p).locator('button.hora.ocupada', { hasText: '08:30' }).waitFor();
  assert.equal(await pasoActivo(p).getByRole('button', { name: 'Continuar' }).isDisabled(), true, 'sin hora no debe poder continuar');
});

await prueba('C25 Doble clic en Confirmar cita crea una sola cita', async (p) => {
  const fecha = proximaFecha(MEDICOS.m1.dias);
  await agendar(p, 'm1', fecha, null, PACIENTE, { soloHastaHorarios: true });
  await pasoActivo(p).locator('button.hora', { hasText: '11:00' }).click();
  await pasoActivo(p).getByRole('button', { name: 'Continuar' }).click();
  const paso = pasoActivo(p);
  await paso.getByLabel('Nombre completo').fill(PACIENTE.nombre);
  await paso.getByLabel('Teléfono').fill(PACIENTE.telefono);
  await paso.getByLabel('Correo electrónico').fill(PACIENTE.email);
  await paso.getByLabel('Motivo').fill(PACIENTE.motivo);
  const boton = paso.getByRole('button', { name: 'Confirmar cita' });
  await boton.evaluate((b) => { b.click(); b.click(); b.click(); });
  await p.locator('mat-card.confirmacion').waitFor();
  await p.waitForTimeout(800);
  const citas = await leerIDB(p, 'clinica-db', 'citas');
  assert.equal(citas.length, 1, `se crearon ${citas.length} citas`);
});

await prueba('C26 Día con todos los horarios ocupados muestra aviso y no permite continuar', async (p) => {
  const fecha = proximaFecha(MEDICOS.m1.dias);
  await ir(p, `${CLI}/agendar`);
  const horas = ['08:00', '08:30', '09:00', '09:30', '10:00', '10:30', '11:00', '11:30', '12:00', '12:30', '13:00', '13:30'];
  await insertarEnIDB(p, 'clinica-db', 'citas', horas.map((hora, i) => ({
    folio: `LLENO-${String(i + 1).padStart(3, '0')}`, especialidadId: 'general', medicoId: 'm1', fecha, hora,
    pacienteNombre: `Paciente Lleno ${i + 1}`, pacienteTelefono: `55000001${String(i).padStart(2, '0')}`, pacienteEmail: `lleno${i}@correo.test`,
    motivo: 'Prueba', primeraVez: false, estado: i % 2 ? 'confirmada' : 'programada', creadaEn: new Date().toISOString(),
  })));
  await agendar(p, 'm1', fecha, null, PACIENTE, { soloHastaHorarios: true }).catch(() => {});
  await pasoActivo(p).getByText('No hay horarios libres ese día').waitFor();
  assert.equal(await pasoActivo(p).getByRole('button', { name: 'Continuar' }).isDisabled(), true);
  // Otro día del mismo médico sí tiene horarios.
  await pasoActivo(p).locator('mat-datepicker-toggle button').click();
  await elegirEnCalendario(p, proximaFecha(MEDICOS.m1.dias, hoyISO(), 1));
  await pasoActivo(p).locator('.grid-horas').waitFor();
  assert.equal(await pasoActivo(p).locator('button.hora:not([disabled])').count(), 12);
});

await prueba('C27 Cita cancelada en recepción: el paciente la ve cancelada con el motivo y no puede volver a cancelar', async (p) => {
  const fecha = proximaFecha(MEDICOS.m1.dias);
  const folio = await agendar(p, 'm1', fecha, '12:30');
  // El paciente deja abierta su tarjeta.
  await ir(p, `${CLI}/mis-citas`);
  await p.getByLabel('Folio').fill(folio);
  await p.getByLabel('Teléfono').fill(PACIENTE.telefono);
  await p.getByRole('button', { name: 'Buscar cita' }).click();
  await p.locator('mat-card.detalle').waitFor();
  // Recepción la cancela en otra pestaña.
  const p2 = await contexto.newPage();
  await ir(p2, `${CLI}/recepcion`);
  const dias = Math.round((new Date(fecha) - new Date(hoyISO())) / 86400000);
  for (let i = 0; i < dias; i++) await botonIcono(p2, 'chevron_right').click();
  const fila = p2.locator('table tr.mat-mdc-row').filter({ hasText: folio });
  await fila.waitFor();
  p2.once('dialog', (d) => d.accept('Médico no disponible'));
  await botonIcono(fila, 'event_busy').click();
  await esperarSnack(p2, 'Cita cancelada');
  await p2.close();
  // El paciente intenta cancelar con la tarjeta desactualizada.
  p.once('dialog', (d) => d.accept());
  await p.getByRole('button', { name: 'Cancelar cita' }).click();
  await esperarSnack(p, 'La cita ya estaba cancelada');
  await cerrarSnacks(p);
  await p.getByRole('button', { name: 'Buscar cita' }).click();
  await p.waitForTimeout(300);
  const t = await texto(p.locator('mat-card.detalle'));
  assert.match(t, /Cancelada/);
  assert.match(t, /Médico no disponible/);
  assert.equal(await p.getByRole('button', { name: 'Cancelar cita' }).count(), 0);
  // El horario 12:30 vuelve a estar libre.
  await agendar(p, 'm1', fecha, null, PACIENTE, { soloHastaHorarios: true });
  assert.equal(await pasoActivo(p).locator('button.hora', { hasText: '12:30' }).isDisabled(), false);
});

await prueba('C28 Cargar la demo dos veces no duplica horarios ocupados', async (p) => {
  const n1 = await cargarDemoClinica(p);
  const antes = (await leerIDB(p, 'clinica-db', 'citas')).length;
  assert.equal(antes, n1, 'el mensaje debe coincidir con lo guardado');
  const n2 = await cargarDemoClinica(p);
  assert.ok(n2 > 0);
  const citas = await leerIDB(p, 'clinica-db', 'citas');
  const lotes = {};
  for (const c of citas) lotes[c.folio.split('-')[1]] = (lotes[c.folio.split('-')[1]] ?? 0) + 1;
  assert.equal(citas.length, n1 + n2, `snacks: ${n1} y ${n2}; lotes en la base: ${JSON.stringify(lotes)}`);
  const claves = citas.filter((c) => c.estado !== 'cancelada').map((c) => `${c.medicoId}|${c.fecha}|${c.hora}`);
  assert.equal(new Set(claves).size, claves.length, 'hay dos citas activas en el mismo horario del mismo médico');
  const folios = citas.map((c) => c.folio);
  assert.equal(new Set(folios).size, folios.length, 'folios repetidos');
});

await prueba('C29 Recepción: búsqueda por teléfono y por folio, y fecha sin citas', async (p) => {
  await cargarDemoClinica(p);
  const primera = p.locator('table tr.mat-mdc-row').first();
  const [telefono, folio] = (await primera.locator('.sub').first().textContent()).split('·').map((x) => x.trim());
  await p.getByLabel('Buscar paciente o folio').fill(folio);
  assert.equal(await p.locator('table tr.mat-mdc-row').count(), 1);
  await p.getByLabel('Buscar paciente o folio').fill(telefono);
  assert.ok((await p.locator('table tr.mat-mdc-row').count()) >= 1);
  for (const t of await p.locator('table tr.mat-mdc-row').allTextContents()) assert.match(t, new RegExp(telefono));
  await p.getByLabel('Buscar paciente o folio').fill('');
  for (let i = 0; i < 20; i++) await botonIcono(p, 'chevron_right').click();
  await p.getByText('No hay citas para esta fecha').waitFor();
  assert.equal(await p.locator('.resumen .chip').count(), 0);
  assert.equal(await p.getByRole('button', { name: /Exportar CSV/ }).isDisabled(), true);
});

await prueba('C30 Agendar otra cita reinicia el flujo y el formulario', async (p) => {
  const fecha = proximaFecha(MEDICOS.m1.dias);
  await agendar(p, 'm1', fecha, '13:00');
  await p.getByRole('button', { name: 'Agendar otra cita' }).click();
  await pasoActivo(p).getByRole('button', { name: MEDICOS.m1.esp }).waitFor();
  assert.equal(await p.locator('button.opcion.seleccionada').count(), 0);
  assert.equal(await pasoActivo(p).getByRole('button', { name: 'Continuar' }).isDisabled(), true);
  await agendar(p, 'm1', fecha, null, PACIENTE, { soloHastaHorarios: true, continuar: true });
  await pasoActivo(p).locator('button.hora', { hasText: '13:30' }).click();
  await pasoActivo(p).getByRole('button', { name: 'Continuar' }).click();
  assert.equal(await pasoActivo(p).getByLabel('Nombre completo').inputValue(), '', 'el nombre del paciente anterior sigue en el formulario');
  assert.equal(await pasoActivo(p).getByLabel('Teléfono').inputValue(), '');
});

await prueba('C31 ICS de odontología dura 45 minutos', async (p) => {
  const fecha = proximaFecha(MEDICOS.m4.dias);
  await agendar(p, 'm4', fecha, '10:45');
  const [descarga] = await Promise.all([p.waitForEvent('download'), p.getByRole('button', { name: /Agregar al calendario/ }).click()]);
  const ruta = resolve(salida, 'tmp-odonto.ics');
  await descarga.saveAs(ruta);
  const ics = readFileSync(ruta, 'utf8');
  assert.match(ics, new RegExp(`DTSTART:${fecha.replace(/-/g, '')}T104500`));
  assert.match(ics, new RegExp(`DTEND:${fecha.replace(/-/g, '')}T113000`));
});


// ---------- resumen ----------
await navegador.close();
servidor?.kill();
for (const f of readdirSync(salida)) if (f.startsWith('tmp-')) rmSync(resolve(salida, f));

const ok = resultados.filter((r) => r.ok).length;
const fallas = resultados.filter((r) => !r.ok);
console.log(`\nResultado: ${ok} de ${resultados.length} pruebas pasaron.`);
if (fallas.length) {
  console.log('\nFallas:');
  for (const f of fallas) console.log(`- ${f.nombre}\n  ${f.error}\n  captura: evidencias/pruebas/${f.captura}`);
}
const reporte = [
  `# Resultado de pruebas funcionales (${new Date().toISOString().slice(0, 16).replace('T', ' ')})`,
  '',
  `${ok} de ${resultados.length} pruebas pasaron.`,
  '',
  '| Prueba | Resultado | Detalle |',
  '|---|---|---|',
  ...resultados.map((r) => `| ${r.nombre} | ${r.ok ? 'OK' : 'FALLA'} | ${r.ok ? '' : r.error.replace(/\|/g, '/')} |`),
  '',
].join('\n');
writeFileSync(resolve(salida, 'resultado.md'), reporte);
process.exit(fallas.length ? 1 : 0);
