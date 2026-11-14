const { chromium } = require('playwright'); const http = require('http'); const fs = require('fs'); const path = require('path');
const ROOT = __dirname; const PAGE = process.env.PAGE || 'art.html'; /* PAGE=pose.html for the prayer positions */ const MIME = { '.html': 'text/html', '.js': 'text/javascript' };
const srv = http.createServer((q, r) => { const f = path.join(ROOT, decodeURIComponent(q.url.split('?')[0])); if (!fs.existsSync(f)) { r.writeHead(404); return r.end(); } r.writeHead(200, { 'content-type': MIME[path.extname(f)] || 'application/octet-stream' }); fs.createReadStream(fs.realpathSync(f)).pipe(r); });
srv.listen(0, '127.0.0.1', async () => {
  const port = srv.address().port;
  const b = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
  for (const name of process.argv.slice(2)) {
    const [VW, VH] = (process.env.SIZE || '1024x1024').split('x').map(Number); /* SIZE=1200x1500 for sky.html */
    const p = await b.newPage({ viewport: { width: VW, height: VH } });
    p.on('pageerror', (e) => console.log('ERR', e.message));
    await p.goto(`http://127.0.0.1:${port}/${PAGE}`); await p.waitForFunction(() => window.ready);
    await p.evaluate((n) => window.draw(n), name);
    await p.locator('canvas').screenshot({ path: `${ROOT}/${name}.png`, omitBackground: true });
    console.log('ok', name); await p.close();
  }
  await b.close(); srv.close();
});
