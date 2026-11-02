// Munib · a page for any ayah (or a short run of ayat), at /93/1 or /93/1-4.
// Shared from the app so that anyone without Munib can read and hear the ayah, then get the app.
// The page is built on the server so WhatsApp, iMessage and Google see the real ayah and translation.
// Text comes from the Quran Foundation via Munib's `qf` function, with the quran-json dataset as a fallback.

const SURAHS = require('./_surahs.json'); // [name, arabic name, meaning, ayat, 'makkah' | 'madinah']
const QF = 'https://skuhimrzjddujzwdedot.supabase.co/functions/v1/qf';
const APP_STORE_URL = ''; // set once Munib is live on the App Store; until then the button goes to the home page

const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
const DIGITS = '٠١٢٣٤٥٦٧٨٩';
const arNum = (n) => String(n).replace(/\d/g, (d) => DIGITS[+d]);
const pad = (n) => String(n).padStart(3, '0');
// The web font lacks a few Uthmani-specific marks; swap them for the standard ones (the app shows full Uthmani).
const webArabic = (t) => t.replace(/ۡ/g, 'ْ').replace(/ٗ/g, 'ً').replace(/ُۢ/g, 'ٌ').replace(/[ۢۖۗۚۘۛ]/g, '');

async function withTimeout(p, ms) { return Promise.race([p, new Promise((_, no) => setTimeout(() => no(new Error('timeout')), ms))]); }

async function chapter(s) {
  try {
    const r = await withTimeout(fetch(QF, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ s, lang: 'en' }) }), 4000);
    if (r.ok) { const d = await r.json(); if (d.ayat && d.ayat.length) return d.ayat.map((a) => ({ n: a.n, ar: a.ar, tr: a.tr })); }
  } catch (e) {}
  const r = await withTimeout(fetch(`https://cdn.jsdelivr.net/npm/quran-json@3.1.2/dist/chapters/en/${s}.json`), 5000);
  const d = await r.json();
  return d.verses.map((v) => ({ n: v.id, ar: v.text, tr: v.translation }));
}

function notFound(res) {
  res.statusCode = 404; res.setHeader('Content-Type', 'text/html; charset=utf-8');
  res.end('<!doctype html><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Not found · Munib</title><body style="font-family:system-ui;padding:40px;background:#FAFAF8;color:#18181A"><h1>That ayah doesn’t exist.</h1><p><a href="/" style="color:#1F6E52">Go to Munib</a></p>');
}

module.exports = async (req, res) => {
  const q = req.query || {};
  const s = parseInt(q.s, 10);
  const m = String(q.a || '1').match(/^(\d{1,3})(?:-(\d{1,3}))?$/);
  if (!(s >= 1 && s <= 114) || !m) return notFound(res);
  const [name, arName, meaning, count, place] = SURAHS[s - 1];
  const from = parseInt(m[1], 10), to = Math.min(parseInt(m[2] || m[1], 10), from + 9);
  if (from < 1 || to < from || to > count) return notFound(res);

  let ayat;
  try { ayat = (await chapter(s)).filter((a) => a.n >= from && a.n <= to); } catch (e) { ayat = []; }
  if (!ayat.length) { res.statusCode = 503; res.setHeader('Retry-After', '30'); return res.end('Please try again in a moment.'); }

  const ref = from === to ? `${s}:${from}` : `${s}:${from}–${to}`;
  const path = from === to ? `/${s}/${from}` : `/${s}/${from}-${to}`;
  const host = req.headers['x-forwarded-host'] || req.headers.host || 'getmunib.com';
  const origin = `https://${host}`;
  const trText = ayat.map((a) => a.tr).join(' ');
  const desc = trText.length > 180 ? trText.slice(0, 177).replace(/\s+\S*$/, '') + '…' : trText;
  const revealed = place === 'madinah' ? 'Madinah' : 'Makkah';
  const prev = from > 1 ? `/${s}/${from - 1}` : s > 1 ? `/${s - 1}/${SURAHS[s - 2][3]}` : null;
  const next = to < count ? `/${s}/${to + 1}` : s < 114 ? `/${s + 1}/1` : null;
  const cta = APP_STORE_URL || '/';
  const audio = ayat.map((a) => `https://verses.quran.com/Alafasy/mp3/${pad(s)}${pad(a.n)}.mp3`);

  const html = `<!doctype html>
<html lang="en"><head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(name)} ${esc(ref)} · Munib</title>
<meta name="description" content="${esc(desc)}">
<link rel="canonical" href="${origin}${path}">
<meta property="og:type" content="article">
<meta property="og:site_name" content="Munib">
<meta property="og:title" content="${esc(name)} ${esc(ref)} · ${esc(meaning)}">
<meta property="og:description" content="${esc(desc)}">
<meta property="og:url" content="${origin}${path}">
<meta property="og:image" content="${origin}/og.png">
<meta name="twitter:card" content="summary_large_image">
<link rel="icon" type="image/png" href="/favicon.png">
<link rel="apple-touch-icon" href="/apple-touch-icon.png">
<link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Bricolage+Grotesque:opsz,wght@12..96,600;12..96,700;12..96,800&family=Literata:opsz,wght@7..72,400&family=Noto+Naskh+Arabic:wght@400;600&display=swap" rel="stylesheet">
<style>
:root { --paper: #FAFAF8; --card: #F1F3EF; --ink: #18181A; --muted: #5E625F; --line: #E2E4DF; --accent: #1F6E52; --display: 'Bricolage Grotesque', system-ui, sans-serif; --read: Literata, Georgia, serif; --ar: 'Noto Naskh Arabic', serif; }
* { box-sizing: border-box; }
body { margin: 0; background: var(--paper); color: var(--ink); font-family: var(--read); font-size: 18px; line-height: 1.6; }
a { color: var(--accent); }
.wrap { max-width: 680px; margin: 0 auto; padding: 0 16px; }
header { display: flex; align-items: center; justify-content: space-between; padding: 18px 0; }
.brand { font-family: var(--display); font-weight: 800; font-size: 26px; letter-spacing: -0.04em; color: var(--ink); text-decoration: none; }
.brand i { font-style: normal; color: var(--accent); }
.get { font-family: var(--display); font-weight: 700; font-size: 15px; color: var(--paper); background: var(--ink); padding: 10px 16px; border-radius: 10px; text-decoration: none; }
.card { background: var(--card); border-radius: 22px; padding: 28px 22px; position: relative; overflow: hidden; }
.chip { display: flex; align-items: center; gap: 12px; font-family: var(--display); font-weight: 600; font-size: 15px; color: var(--muted); flex-wrap: wrap; }
.chip b { background: var(--accent); color: #fff; padding: 4px 10px; border-radius: 8px; font-weight: 700; }
.ar { font-family: var(--ar); font-size: clamp(28px, 7vw, 40px); line-height: 2.1; direction: rtl; text-align: right; margin: 22px 0 8px; }
.ar .m { color: var(--accent); font-size: .8em; }
.ar .w.on { color: var(--accent); }
hr { border: 0; height: 2px; background: var(--line); margin: 18px 0; }
.tr p { margin: 0 0 10px; font-size: 19px; }
.tr sup { font-family: var(--display); font-weight: 700; color: var(--accent); font-size: 12px; margin-right: 4px; }
.by { font-family: var(--display); font-weight: 600; font-size: 14px; color: var(--muted); margin-top: 14px; }
.play { display: inline-flex; align-items: center; gap: 10px; margin-top: 18px; min-height: 48px; padding: 0 20px; border-radius: 12px; border: 1.5px solid var(--ink); background: transparent; color: var(--ink); font-family: var(--display); font-weight: 700; font-size: 16px; cursor: pointer; }
.play svg { width: 16px; height: 16px; }
.nav { display: flex; justify-content: space-between; gap: 12px; margin: 18px 0 28px; font-family: var(--display); font-weight: 700; font-size: 15px; }
.nav a { text-decoration: none; padding: 10px 0; }
.cta { border: 1.5px solid var(--line); border-radius: 22px; padding: 24px 22px; margin-bottom: 36px; }
.cta h2 { font-family: var(--display); font-size: 26px; line-height: 1.15; letter-spacing: -0.02em; margin: 0 0 8px; }
.cta p { margin: 0 0 18px; color: var(--muted); }
.cta a.btn { display: inline-flex; align-items: center; min-height: 48px; padding: 0 22px; border-radius: 12px; background: var(--ink); color: var(--paper); font-family: var(--display); font-weight: 700; text-decoration: none; }
footer { font-family: var(--display); font-size: 13px; color: var(--muted); padding: 0 0 40px; display: flex; gap: 18px; flex-wrap: wrap; }
footer a { color: var(--muted); }
</style>
</head><body><div class="wrap">
<header><a class="brand" href="/">munib<i>.</i></a><a class="get" href="${esc(cta)}">Get the app</a></header>
<main>
<article class="card">
  <div class="chip"><b>${esc(ref)}</b><span>${esc(name)} · ${esc(meaning)}</span><span lang="ar" style="font-family:var(--ar)">${esc(arName)}</span></div>
  <div class="ar" lang="ar">${ayat.map((a, i) => webArabic(a.ar).split(/\s+/).map((w) => `<span class="w" data-a="${i}">${esc(w)}</span>`).join(' ') + ` <span class="m">﴿${arNum(a.n)}﴾</span>`).join(' ')}</div>
  <hr>
  <div class="tr">${ayat.map((a) => `<p>${ayat.length > 1 ? `<sup>${a.n}</sup>` : ''}${esc(a.tr)}</p>`).join('')}</div>
  <div class="by">Translation: Saheeh International · Revealed in ${revealed}</div>
  <button class="play" id="play" type="button"><svg viewBox="0 0 16 16" aria-hidden="true"><path d="M4 2.5v11l9-5.5z" fill="currentColor"/></svg><span>Listen · Mishary Alafasy</span></button>
</article>
<nav class="nav">${prev ? `<a href="${prev}">← Previous ayah</a>` : '<span></span>'}${next ? `<a href="${next}">Next ayah →</a>` : ''}</nav>
<section class="cta">
  <h2>Read the whole of ${esc(name)} in Munib.</h2>
  <p>Munib is a new way to read the Quran: one ayah at a time, recited aloud, with translation and word meanings. Start with one minute a day.</p>
  <a class="btn" href="${esc(cta)}">Get Munib on iPhone</a>
</section>
</main>
<footer><span>Quran text and recitation via the Quran Foundation</span><a href="/privacy.html">Privacy</a><a href="/terms.html">Terms</a><a href="/support.html">Support</a></footer>
</div>
<script>
(function () {
  var files = ${JSON.stringify(audio)}, i = -1, el = new Audio(), btn = document.getElementById('play'), label = btn.querySelector('span'), playing = false;
  function mark() { document.querySelectorAll('.ar .w').forEach(function (w) { w.classList.toggle('on', playing && +w.dataset.a === i); }); }
  function next() { i++; if (i >= files.length) { stop(); return; } el.src = files[i]; el.play().catch(stop); mark(); }
  function stop() { playing = false; i = -1; el.pause(); label.textContent = 'Listen · Mishary Alafasy'; mark(); }
  el.addEventListener('ended', next);
  btn.addEventListener('click', function () { if (playing) return stop(); playing = true; label.textContent = 'Pause'; next(); });
})();
</script>
</body></html>`;
  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  res.setHeader('Cache-Control', 'public, s-maxage=86400, stale-while-revalidate=518400');
  res.end(html);
};
