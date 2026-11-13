// Munib · the page an invite to a khatm opens, at /k/ABC234 (Read together).
// With Munib installed the app opens straight to the invite; otherwise this page shows what the
// khatm is and how to join. It reads only the public preview (title, note, counts: no names).

const PREVIEW = 'https://skuhimrzjddujzwdedot.supabase.co/rest/v1/rpc/khatm_preview';
// The publishable key ships in the app too; row-level security and the function's rules do the protecting.
const KEY = 'sb_publishable_JWfeg2nuIB6XrdtTCzzpzA_b952cZJk';
const APP_STORE_URL = ''; // set once Munib is live on the App Store

const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);

async function preview(code) {
  const r = await Promise.race([
    fetch(PREVIEW, { method: 'POST', headers: { 'Content-Type': 'application/json', apikey: KEY, Authorization: `Bearer ${KEY}` }, body: JSON.stringify({ p_code: code }) }),
    new Promise((_, no) => setTimeout(() => no(new Error('timeout')), 5000)),
  ]);
  if (!r.ok) throw new Error(String(r.status));
  return r.json();
}

module.exports = async (req, res) => {
  const code = String((req.query || {}).code || '').toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 8);
  let k = null;
  try {
    if (code.length === 6) k = await preview(code);
  } catch (e) {}
  const cta = APP_STORE_URL || '/';
  const app = `munib://k/${code}`;
  const title = k ? `Join “${k.title}” · Read together on Munib` : 'Read together · Munib';
  const desc = k ? `${k.members} ${k.members === 1 ? 'person is' : 'people are'} reading the whole Quran together. ${k.done} of 30 juz finished. Pick a juz and read with them.` : 'Read the whole Quran together with your family on Munib.';
  const bar = Array.from({ length: 30 }, (_, i) => `<i class="${k && i < k.done ? 'on' : ''}"></i>`).join('');
  const html = `<!doctype html>
<html lang="en"><head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="robots" content="noindex">
<title>${esc(title)}</title>
<meta name="description" content="${esc(desc)}">
<meta property="og:type" content="website">
<meta property="og:site_name" content="Munib">
<meta property="og:title" content="${esc(title)}">
<meta property="og:description" content="${esc(desc)}">
<meta property="og:image" content="https://${esc(req.headers['x-forwarded-host'] || req.headers.host || 'getmunib.com')}/og.png">
<link rel="icon" type="image/png" href="/favicon.png">
<link rel="apple-touch-icon" href="/apple-touch-icon.png">
<link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Bricolage+Grotesque:opsz,wght@12..96,600;12..96,700;12..96,800&family=Literata:ital,opsz,wght@0,7..72,400;1,7..72,400&family=Noto+Naskh+Arabic:wght@400&display=swap" rel="stylesheet">
<style>
:root { --paper: #FAFAF8; --card: #F1F3EF; --ink: #18181A; --muted: #5E625F; --line: #E2E4DF; --accent: #1F6E52; --display: 'Bricolage Grotesque', system-ui, sans-serif; --read: Literata, Georgia, serif; }
* { box-sizing: border-box; }
body { margin: 0; background: var(--paper); color: var(--ink); font-family: var(--read); font-size: 18px; line-height: 1.6; }
.wrap { max-width: 560px; margin: 0 auto; padding: 0 16px; }
header { display: flex; align-items: center; justify-content: space-between; padding: 18px 0; }
.brand { font-family: var(--display); font-weight: 800; font-size: 26px; letter-spacing: -0.04em; color: var(--ink); text-decoration: none; }
.brand i { font-style: normal; color: var(--accent); }
.eyebrow { font-family: var(--display); font-weight: 700; font-size: 12px; letter-spacing: .14em; color: var(--accent); margin: 28px 0 8px; }
h1 { font-family: var(--display); font-size: clamp(32px, 9vw, 44px); line-height: 1.05; letter-spacing: -0.03em; margin: 0 0 12px; overflow-wrap: anywhere; }
.note { font-style: italic; color: var(--muted); margin: 0 0 20px; }
.card { background: var(--card); border-radius: 20px; padding: 20px; margin-bottom: 22px; }
.card p { margin: 0 0 14px; }
.bar { display: flex; gap: 3px; }
.bar i { flex: 1; height: 8px; border-radius: 3px; background: #DCE0DA; }
.bar i.on { background: var(--accent); }
.btn { display: flex; align-items: center; justify-content: center; min-height: 52px; border-radius: 12px; font-family: var(--display); font-weight: 700; font-size: 16px; text-decoration: none; margin-bottom: 10px; }
.dark { background: var(--ink); color: var(--paper); }
.light { border: 1.5px solid var(--ink); color: var(--ink); }
.code { font-family: var(--display); font-weight: 600; font-size: 15px; color: var(--muted); margin: 18px 0 40px; }
.code b { font-weight: 800; letter-spacing: .2em; color: var(--ink); }
footer { font-family: var(--display); font-size: 13px; color: var(--muted); padding: 0 0 40px; display: flex; gap: 18px; flex-wrap: wrap; }
footer a { color: var(--muted); }
</style>
</head><body><div class="wrap">
<header><a class="brand" href="/">munib<i>.</i></a></header>
<main>
${k ? `
<div class="eyebrow">YOU’RE INVITED TO READ TOGETHER</div>
<h1>${esc(k.title)}</h1>
${k.intention ? `<p class="note">${esc(k.intention)}</p>` : ''}
<div class="card">
  <p>${k.members} ${k.members === 1 ? 'person is' : 'people are'} reading the whole Quran together. ${k.done} of 30 juz finished${k.open ? `, ${k.open} still open to pick` : ''}.</p>
  <div class="bar">${bar}</div>
</div>
<a class="btn dark" href="${esc(app)}">Open in Munib</a>
<a class="btn light" href="${esc(cta)}">Get Munib on iPhone</a>
<p class="code">Already have Munib? Go to You → Read together → Join with a code, and enter <b>${esc(code)}</b></p>
` : `
<div class="eyebrow">READ TOGETHER</div>
<h1>We couldn’t find that khatm</h1>
<p class="note">Check the link or code with whoever sent it. It may have been deleted.</p>
<a class="btn dark" href="/">About Munib</a>
`}
</main>
<footer><a href="/privacy.html">Privacy</a><a href="/terms.html">Terms</a><a href="/support.html">Support</a></footer>
</div></body></html>`;
  res.statusCode = k ? 200 : 404;
  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  res.setHeader('Cache-Control', 'public, s-maxage=60, stale-while-revalidate=300');
  res.end(html);
};
