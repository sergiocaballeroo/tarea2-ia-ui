import { chromium } from 'playwright';
const base = 'https://sergiocaballeroo.github.io/tarea2-ia-ui';
const conManifiesto = process.argv[2] === 'B';
const b = await chromium.launch(); const c = await b.newContext(); let p = await c.newPage();
await p.goto(`${base}/biblioteca/#/`, { waitUntil: 'load' });
await p.evaluate(() => navigator.serviceWorker.ready.then(() => undefined));
await p.waitForFunction(async () => {
  const t = await fetch('ngsw/state').then(r => r.text()).catch(() => '');
  const hash = t.match(/Latest manifest hash: ([0-9a-f]{40})/)?.[1]; if (!hash || /^ \* /m.test(t)) return false;
  const n = (await caches.keys()).find(x => x.includes(hash) && x.endsWith(':assets:app:cache')); if (!n) return false;
  return (await (await caches.open(n)).keys()).length >= 26;
}, null, { timeout: 90000, polling: 1000 });
if (conManifiesto) { const m = await p.evaluate(() => fetch('ngsw.json').then(r => r.json())); console.log('B: ngsw.json leído desde la página, timestamp', m.timestamp); }
await p.waitForTimeout(3000);
const estado = await p.evaluate(() => fetch('ngsw/state').then(r => r.text()));
console.log(process.argv[2], 'versiones:', (estado.match(/=== Version (\S+)/g) || []).map(v => v.slice(12, 20)), 'tareas:', (estado.match(/^ \* .*$/gm) || []).length);
await p.close();
await c.setOffline(true);
p = await c.newPage();
try { await p.goto(`${base}/biblioteca/#/libros`, { waitUntil: 'load', timeout: 20000 }); console.log(process.argv[2], 'offline OK:', JSON.stringify(await p.title())); } catch (e) { console.log(process.argv[2], 'offline falló:', e.message.split('\n')[0].slice(0, 60)); }
await b.close();
