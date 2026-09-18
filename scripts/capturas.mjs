/**
 * Toma capturas de pantalla de ambas aplicaciones con Playwright (Chromium)
 * para usarlas como evidencia en el reporte. Requiere haber ejecutado
 * `npm run build:pages` y tener Chromium instalado: `npx playwright install chromium`.
 *
 *   npm run capturas   -> genera PNG en evidencias/capturas/
 */
import { chromium } from 'playwright';
import { spawn } from 'node:child_process';
import { mkdirSync } from 'node:fs';
import { resolve } from 'node:path';

const raiz = resolve(import.meta.dirname, '..');
const salida = resolve(raiz, 'evidencias/capturas');
mkdirSync(salida, { recursive: true });

const puerto = 8089;
const base = `http://localhost:${puerto}/tarea2-ia-ui`;
const servidor = spawn(process.execPath, [resolve(raiz, 'scripts/servir-local.mjs')], {
  env: { ...process.env, PORT: String(puerto) },
  stdio: 'inherit',
});
await new Promise((r) => setTimeout(r, 1500));

const navegador = await chromium.launch();
const contexto = await navegador.newContext({ viewport: { width: 1366, height: 820 }, locale: 'es-MX' });
const pagina = await contexto.newPage();
// En el stepper vertical solo el paso activo es visible; se acota la búsqueda a ese paso.
const pasoActivo = () => pagina.locator('.mat-vertical-content-container-active');

async function cerrarAvisos() {
  // Cierra cualquier snackbar visible para que no aparezca en la captura.
  const botones = pagina.locator('.mat-mdc-snack-bar-action');
  for (let i = await botones.count(); i > 0; i--) await botones.first().click().catch(() => {});
  await pagina.waitForTimeout(250);
}

async function captura(nombre, url, opciones = {}) {
  await pagina.goto(url, { waitUntil: 'networkidle' });
  await pagina.waitForTimeout(opciones.espera ?? 600);
  if (opciones.antes) await opciones.antes(pagina);
  await cerrarAvisos();
  await pagina.screenshot({ path: resolve(salida, `${nombre}.png`), fullPage: opciones.fullPage ?? false });
  console.log('Captura:', nombre);
}

try {
  // ---------- Biblioteca ----------
  await captura('00-portada-pages', `${base}/`);
  await captura('b01-inicio-vacio', `${base}/biblioteca/#/`);
  // Carga datos de demostración desde Ajustes.
  await pagina.goto(`${base}/biblioteca/#/ajustes`, { waitUntil: 'networkidle' });
  await pagina.getByRole('button', { name: /Cargar datos de demostración/ }).click();
  await pagina.waitForTimeout(800);
  await cerrarAvisos();
  await captura('b02-ajustes', `${base}/biblioteca/#/ajustes`);
  await captura('b03-inicio', `${base}/biblioteca/#/`);
  await captura('b04-libros', `${base}/biblioteca/#/libros`);
  await captura('b05-libros-dialogo', `${base}/biblioteca/#/libros`, {
    antes: async (p) => {
      await p.getByRole('button', { name: /Nuevo libro/ }).click();
      await p.waitForTimeout(500);
    },
  });
  await captura('b06-socios', `${base}/biblioteca/#/socios`);
  await captura('b07-prestamos', `${base}/biblioteca/#/prestamos`);
  await captura('b08-prestamo-dialogo', `${base}/biblioteca/#/prestamos`, {
    antes: async (p) => {
      await p.getByRole('button', { name: /Nuevo préstamo/ }).click();
      await p.waitForTimeout(400);
      await p.getByRole('combobox', { name: 'Socio' }).fill('Ana');
      await p.waitForTimeout(400);
      await p.getByRole('option').first().click();
      await p.getByRole('combobox', { name: 'Libro' }).fill('Clean');
      await p.waitForTimeout(400);
      await p.getByRole('option').first().click();
      await p.waitForTimeout(300);
    },
  });
  await captura('b09-vencidos', `${base}/biblioteca/#/vencidos`);
  await captura('b10-devolucion-confirmar', `${base}/biblioteca/#/vencidos`, {
    antes: async (p) => {
      await p.getByRole('button', { name: /Devolver/ }).first().click();
      await p.waitForTimeout(400);
    },
  });

  // ---------- Clínica ----------
  await captura('c01-inicio', `${base}/clinica/#/`, { fullPage: true });
  await captura('c02-servicios', `${base}/clinica/#/servicios`, { fullPage: true });
  await captura('c03-equipo', `${base}/clinica/#/equipo`, { fullPage: true });
  await captura('c04-contacto', `${base}/clinica/#/contacto`, { fullPage: true });
  await captura('c05-agendar-paso1', `${base}/clinica/#/agendar`);

  // Flujo completo de agendado.
  await pagina.goto(`${base}/clinica/#/agendar?especialidad=general&medico=m1`, { waitUntil: 'networkidle' });
  await pagina.waitForTimeout(500);
  await pasoActivo().getByRole('button', { name: 'Continuar' }).click();
  await pagina.waitForTimeout(300);
  await pasoActivo().getByRole('button', { name: 'Continuar' }).click();
  await pagina.waitForTimeout(300);
  await pagina.getByLabel('Open calendar').click();
  await pagina.waitForTimeout(400);
  // Elige la primera fecha habilitada del calendario.
  await pagina.locator('.mat-calendar-body-cell:not(.mat-calendar-body-disabled)').first().click();
  await pagina.waitForTimeout(600);
  await pagina.screenshot({ path: resolve(salida, 'c06-agendar-horarios.png') });
  console.log('Captura: c06-agendar-horarios');
  await pagina.locator('button.hora:not(.ocupada)').first().click();
  await pasoActivo().getByRole('button', { name: 'Continuar' }).click();
  await pagina.waitForTimeout(300);
  await pagina.getByLabel('Nombre completo del paciente').fill('Paciente Prueba Captura');
  await pagina.getByLabel('Teléfono (10 dígitos)').fill('5512345678');
  await pagina.getByLabel('Correo electrónico').fill('paciente@correo.test');
  await pagina.getByLabel('Motivo de la consulta').fill('Revisión general anual');
  await pagina.screenshot({ path: resolve(salida, 'c07-agendar-datos.png') });
  console.log('Captura: c07-agendar-datos');
  await pagina.getByRole('button', { name: 'Confirmar cita' }).click();
  await pagina.waitForTimeout(800);
  await pagina.screenshot({ path: resolve(salida, 'c08-agendar-confirmacion.png'), fullPage: true });
  console.log('Captura: c08-agendar-confirmacion');
  const folio = (await pagina.locator('.folio').textContent())?.trim() ?? '';

  await captura('c09-mis-citas', `${base}/clinica/#/mis-citas`, {
    antes: async (p) => {
      await p.getByLabel('Folio').fill(folio);
      await p.getByLabel('Teléfono').fill('5512345678');
      await p.getByRole('button', { name: /Buscar cita/ }).click();
      await p.waitForTimeout(600);
    },
  });

  // Recepción con datos demo.
  await pagina.goto(`${base}/clinica/#/recepcion`, { waitUntil: 'networkidle' });
  await pagina.getByRole('button', { name: 'Más opciones' }).click();
  await pagina.getByRole('menuitem', { name: /demostración/ }).click();
  await pagina.waitForTimeout(800);
  await cerrarAvisos();
  await captura('c10-recepcion', `${base}/clinica/#/recepcion`, { fullPage: true });

  // Vista móvil.
  await pagina.setViewportSize({ width: 390, height: 844 });
  await captura('c11-inicio-movil', `${base}/clinica/#/`);
  await captura('b11-biblioteca-movil', `${base}/biblioteca/#/prestamos`);
} finally {
  await navegador.close();
  servidor.kill();
}
