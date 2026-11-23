// node walk.js <name> <startPath> '<json actions>' [prefsJson]
const { chromium } = require('playwright');
const http = require('http'), fs = require('fs'), path = require('path');
const root = process.env.ROOT || '/tmp/webx', out = __dirname + '/shots'; fs.mkdirSync(out, { recursive: true });
const srv = http.createServer((q, r) => { let p = path.join(root, decodeURIComponent(q.url.split('?')[0])); if (!fs.existsSync(p) || fs.statSync(p).isDirectory()) p = path.join(root, 'index.html');
  const ext = path.extname(p); r.setHeader('Content-Type', {'.js':'application/javascript','.html':'text/html','.css':'text/css','.ttf':'font/ttf','.png':'image/png','.jpg':'image/jpeg','.json':'application/json','.mp3':'audio/mpeg'}[ext] || 'application/octet-stream'); fs.createReadStream(p).pipe(r); }).listen(0);
(async () => {
  const [name, start, acts, prefs] = process.argv.slice(2);
  const port = srv.address().port;
  const b = await chromium.launch();
  const ctx = await b.newContext({ viewport: { width: +(process.env.W||393), height: +(process.env.H||852) }, deviceScaleFactor: 1, geolocation: { latitude: 51.56, longitude: 0.07 }, permissions: ['geolocation'] });
  if (prefs) await ctx.addInitScript((p) => { const o = JSON.parse(p); for (const k in o) localStorage.setItem(k, typeof o[k] === 'string' ? o[k] : JSON.stringify(o[k])); }, prefs);
  const p = await ctx.newPage();
  const errs = []; p.on('pageerror', (e) => errs.push('PAGEERR ' + e.message.slice(0, 200))); p.on('console', (m) => { if (m.type() === 'error') errs.push('CONSOLE ' + m.text().slice(0, 160)); });
  await p.goto(`http://localhost:${port}${start}`); await p.waitForTimeout(3500);
  let i = 0;
  const snap = async (label) => { const f = `${out}/${name}-${String(i++).padStart(2, '0')}.png`; await p.screenshot({ path: f }); const t = (await p.evaluate(() => document.body.innerText)).replace(/\n+/g, ' | ').slice(0, 420); console.log(`[${path.basename(f)}] ${label}: ${t}`); };
  await snap('start');
  for (const a of JSON.parse(acts || '[]')) {
    const [k, ...rest] = a.split(':'); const v = rest.join(':');
    try {
      if (k === 'click') await p.getByText(v, { exact: false }).first().click({ timeout: 4000 });
      else if (k === 'clickx') await p.getByText(v, { exact: true }).first().click({ timeout: 4000 });
      else if (k === 'last') await p.getByText(v, { exact: false }).last().click({ timeout: 4000 });
      else if (k === 'type') await p.keyboard.type(v);
      else if (k === 'fill') await p.locator('input,textarea').first().fill(v);
      else if (k === 'wait') await p.waitForTimeout(+v);
      else if (k === 'scroll') await p.mouse.wheel(0, +v);
      else if (k === 'goto') await p.goto(`http://localhost:${port}${v}`);
      else if (k === 'xy') { const [x, y] = v.split(',').map(Number); await p.mouse.click(x, y); }
      else if (k === 'move') { const [x, y] = v.split(',').map(Number); await p.mouse.move(x, y); }
      else if (k === 'key') await p.keyboard.press(v);
    } catch (e) { console.log('  !! failed', a, e.message.split('\n')[0].slice(0, 120)); }
    await p.waitForTimeout(k === 'wait' ? 100 : 1300); await snap(a);
  }
  if (errs.length) console.log('ERRORS:\n' + [...new Set(errs)].slice(0, 12).join('\n'));
  await b.close(); srv.close();
})();
