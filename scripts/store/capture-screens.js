const { chromium } = require('playwright');
const http = require('http'), fs = require('fs'), path = require('path');
const root = '/tmp/webx', out = process.argv[2] + '/tour';
fs.mkdirSync(out, { recursive: true });
const srv = http.createServer((q, r) => { let p = path.join(root, decodeURIComponent(q.url.split('?')[0])); if (!fs.existsSync(p) || fs.statSync(p).isDirectory()) p = path.join(root, 'index.html');
  const ext = path.extname(p); r.setHeader('Content-Type', {'.js':'application/javascript','.html':'text/html','.css':'text/css','.ttf':'font/ttf','.png':'image/png','.json':'application/json'}[ext] || 'application/octet-stream'); fs.createReadStream(p).pipe(r); }).listen(8099);
const shots = [
  ['feed', '/?sky=day', 0],
  ['deeds', '/prayer?sky=day', 330],
  ['prayer', '/prayer?sky=maghrib', 0],
  ['pray', '/pray/learn?at=ruku', 0],
  ['learn', '/learn/112', 0],
  ['ask', '/ask?sky=day', 0],
  ['gathering', '/gathering', 0],
  ['tasbeeh', '/tasbeeh', 0],
  ['qibla', '/qibla?h=118', 0],
  ['ramadan', '/ramadan?ramadan=12', 0],
  ['repeat', '/repeat?s=2', 0],
];
(async () => {
  const b = await chromium.launch();
  for (const [name, url, scroll] of shots) {
    const ctx = await b.newContext({ viewport: { width: 440, height: 956 }, deviceScaleFactor: 3, timezoneId: 'Europe/London', geolocation: { latitude: 51.56, longitude: 0.07 }, permissions: ['geolocation'] });
    await ctx.addInitScript(() => { const d = new Date(); const k = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
      localStorage.setItem('ayat.prefs.v1', JSON.stringify({ mood: 'anxious', feedMode: 'foryou', moodAsked: true, onboarded: true, firstRun: 'done', journeySkipped: true, sound: false, firstName: 'Saj', explained: ['salah','dhikr','qibla','dua','duaothers','khatm','ummah','ramadan','surahs'], tips: ['pages','mood','aa','ask','search','search2','aa2'], pagesTipSeen: true, aiConsent: true,
        today: { day: k, done: ['fajr','dhuhr','asr','selfdua'], cheered: false },
        tasbeeh: { phrase: 'subhanallah', count: 21, target: 33, set: false, day: d.toISOString().slice(0,10), today: 21, total: 1240 },
        prayer: { method: 'MoonsightingCommittee', asr: 'standard', loc: { lat: 51.56, lon: 0.07, label: 'Ilford', at: Date.now() }, alerts: { fajr: true, dhuhr: false, asr: false, maghrib: true, isha: false } } }));
      localStorage.setItem('ayat.progress.v1', JSON.stringify({ readings: 0, ayat: {}, days: { [k]: 6 }, mem: {} })); });
    const p = await ctx.newPage(); p.on('pageerror', e => console.log(name, 'ERR', e.message.slice(0, 120)));
    await p.goto('http://localhost:8099' + url); await p.waitForTimeout(4500);
    if (scroll) { await p.mouse.wheel(0, scroll); await p.waitForTimeout(600); }
    await p.screenshot({ path: `${out}/../store/raw/${name}.png` });
    await ctx.close();
  }
  await b.close(); srv.close();
})();
