const { chromium } = require('playwright');
const fs = require('fs');
const F = '/home/claude/ayat-app/node_modules/@expo-google-fonts';
const ART = '/home/claude/ayat-app/assets/art';
const RAW = __dirname + '/raw';
const TOPS = JSON.parse(fs.readFileSync(__dirname + '/tops.json', 'utf8'));
// [file, shot, top colour, bottom colour, headline (with *highlight*), sub, art, art position, tilt, highlight colour]
const S = [
  ['01', 'feed', '#0F7A57', '#063F2E', 'Replace doomscrolling<br>with *returning<br>to Allah*', 'A personalised For you page with 100% Islamic content.', 'star8', 'tr', -3, '#F5D27A'],
  ['02', 'deeds', '#E9A93A', '#B8661E', 'Your daily deeds,<br>*in one checklist*', 'Pray, read, remember, make dua. Just tick them off.', 'beads', 'br', 3, '#FFFFFF'],
  ['03', 'pray', '#3A7BD5', '#1D3F8A', 'Learn to pray,<br>*step by step*', 'Follow the pictures and the recitation, at your own pace.', 'hands', 'tl', -3, '#FFE08A'],
  ['04', 'learn', '#7B5BD6', '#3E2A86', 'Learn surahs,<br>*one ayah<br>at a time*', 'Listen, repeat, and say it yourself. Easiest first.', 'mushaf', 'br', 3, '#FFE08A'],
  ['05', 'ask', '#11998E', '#0A5C55', 'Ask anything<br>*about Islam*', 'Gentle, private answers with their sources.', 'hands', 'tr', -3, '#FFE08A'],
  ['06', 'together', '#C2577E', '#6E2448', 'Read the Quran<br>*together*', 'Start a family khatm or a group, and see what’s left to read.', 'globe', 'tr', -3, '#FFE08A'],
  ['07', 'prayer', '#2F6FA8', '#173E66', 'Prayer times,<br>*wherever<br>you are*', 'Or follow your own mosque’s jamaʿah times, with alerts.', 'crescent', 'tr', 3, '#FFE08A'],
  ['08', 'stories', '#3B3F8F', '#171A44', '*Bedtime stories*<br>from the Quran', 'True stories, read aloud, with a sleep timer.', 'moon', 'tr', -3, '#F5D27A'],
  ['09', 'ramadan', '#E26D4F', '#9A3424', 'Ramadan,<br>*planned for you*', 'Suhoor, iftar, tonight’s juz, and how to rest well.', 'dome', 'tr', 3, '#FFFFFF'],
  ['10', ['tasbeeh', 'qibla', 'repeat'], '#0F7A57', '#063F2E', 'All features,<br>*completely free*', 'Tasbeeh, Qibla, the Quran on repeat, and much more.', 'kaaba', 'none', 0, '#F5D27A'],
];
const pos = { none: 'display:none', tr: 'right:-150px;top:-120px', tl: 'left:-150px;top:-120px', br: 'right:-160px;top:820px', bl: 'left:-160px;top:820px' };
const star = (cx, cy, r, inner = 0.62) => { let d = ''; for (let i = 0; i < 16; i++) { const a = Math.PI / 8 * i - Math.PI / 2; const rr = i % 2 ? r * inner : r; d += (i ? 'L' : 'M') + (cx + Math.cos(a) * rr).toFixed(1) + ' ' + (cy + Math.sin(a) * rr).toFixed(1) + ' '; } return d + 'Z'; };
let lattice = ''; for (let y = 0, row = 0; y < 3000; y += 230, row++) for (let x = row % 2 ? 130 : 0; x < 1450; x += 260) lattice += `<path d="${star(x, y, 78, 0.7)}"/>`;
const dark = (h) => { const n = parseInt(h.slice(1), 16); return ((n >> 16) * 0.3 + ((n >> 8) & 255) * 0.59 + (n & 255) * 0.11) < 140; };
const phoneHtml = (shot, style) => `<div class="phone" style="${style}"><div class="screen" style="background:${TOPS[shot]}"><div class="status" style="color:${dark(TOPS[shot]) ? '#fff' : '#111'}"><span>9:41</span><span>●●● ▮</span></div><img src="file://${RAW}/${shot}.png"></div><div class="island"></div></div>`;
const multi = (shots) => `<div style="position:relative;height:2000px;margin-top:110px">
  ${phoneHtml(shots[0], 'position:absolute;left:10px;top:300px;transform:rotate(-8deg) scale(.58);transform-origin:top left')}
  ${phoneHtml(shots[2], 'position:absolute;right:10px;top:300px;transform:rotate(8deg) scale(.58);transform-origin:top right')}
  ${phoneHtml(shots[1], 'position:absolute;left:50%;margin-left:-450px;top:20px;transform:scale(.64);transform-origin:top center;z-index:2')}
</div>
<div class="chips">${['Your mosque’s jamaʿah alerts', 'Family circles', 'Live from Makkah', 'Find a dua', 'Listen offline', 'A gathering of dua', 'Tasbeeh', 'Qibla'].map((c) => `<span>${c}</span>`).join('')}</div>`;
const page = ([n, shot, a, b, h, sub, art, ap, tilt, hi]) => `<!doctype html><html><head><meta charset="utf-8"><style>
@font-face{font-family:B;src:url(file://${F}/bricolage-grotesque/800ExtraBold/BricolageGrotesque_800ExtraBold.ttf)}
@font-face{font-family:BM;src:url(file://${F}/bricolage-grotesque/500Medium/BricolageGrotesque_500Medium.ttf)}
html,body{margin:0;width:1320px;height:2868px;overflow:hidden}
.bg{position:absolute;inset:0;background:radial-gradient(120% 70% at 50% 0%, ${a} 0%, ${b} 75%)}
.glow{position:absolute;left:50%;top:1500px;width:1500px;height:1500px;margin-left:-750px;border-radius:50%;background:radial-gradient(circle, rgba(255,255,255,.22), rgba(255,255,255,0) 62%)}
svg.l{position:absolute;inset:0;opacity:.09}
.head{position:relative;padding:150px 96px 0}
h1{margin:0;font-family:B;font-size:138px;line-height:1.02;letter-spacing:-3.5px;color:#fff;text-shadow:0 6px 30px rgba(0,0,0,.18)}
h1 em{font-style:normal;color:${hi}}
p{margin:36px 40px 0 4px;font-family:BM;font-size:54px;line-height:1.25;color:rgba(255,255,255,.88)}

.stage{position:relative;width:900px;margin:90px auto 0}
.phone{position:relative;width:900px;height:2024px;border-radius:118px;background:#0B0E0D;padding:22px;box-sizing:border-box;transform:rotate(${tilt}deg);box-shadow:0 60px 120px rgba(0,0,0,.42),0 0 0 4px rgba(255,255,255,.18)}
.screen{width:100%;height:100%;border-radius:98px;overflow:hidden;display:flex;flex-direction:column}
.status{height:120px;flex:none;display:flex;align-items:center;justify-content:space-between;padding:22px 92px 0;box-sizing:border-box;font-family:BM;font-size:40px}
.phone img{width:100%;flex:1;min-height:0;object-fit:cover;object-position:top;display:block}
.island{position:absolute;top:44px;left:50%;width:240px;height:68px;margin-left:-120px;background:#0B0E0D;border-radius:40px}
.chips{position:absolute;left:80px;right:80px;bottom:150px;display:flex;flex-wrap:wrap;gap:22px;justify-content:center}
.chips span{font-family:BM;font-size:44px;color:#fff;background:rgba(255,255,255,.14);border:2px solid rgba(255,255,255,.28);border-radius:60px;padding:18px 34px}
.art{position:absolute;${pos[ap]};width:400px;z-index:2;filter:drop-shadow(0 40px 60px rgba(0,0,0,.4))}
</style></head><body>
<div class="bg"></div><div class="glow"></div>
<svg class="l" width="1320" height="2868" fill="none" stroke="#fff" stroke-width="3">${lattice}</svg>
<div class="head"><h1>${h.replace(/\*(.+?)\*/g, '<em>$1</em>')}</h1><p>${sub}</p></div>
${Array.isArray(shot) ? multi(shot) : `<div class="stage"><div class="phone"><div class="screen" style="background:${TOPS[shot]}"><div class="status" style="color:${dark(TOPS[shot]) ? '#fff' : '#111'}"><span>9:41</span><span>●●● ▮</span></div><img src="file://${RAW}/${shot}.png"></div><div class="island"></div></div>
<img class="art" src="file://${ART}/${art}.png"></div>`}
</body></html>`;
(async () => {
  fs.mkdirSync(__dirname + '/out', { recursive: true });
  const b = await chromium.launch();
  const p = await b.newPage({ viewport: { width: 1320, height: 2868 } });
  for (const s of S) {
    if (!(Array.isArray(s[1]) ? s[1] : [s[1]]).every((x) => fs.existsSync(`${RAW}/${x}.png`))) { console.log('skip', s[0]); continue; }
    fs.writeFileSync(`${__dirname}/s.html`, page(s));
    await p.goto(`file://${__dirname}/s.html`); await p.evaluate(() => document.fonts.ready); await p.waitForTimeout(300);
    await p.screenshot({ path: `${__dirname}/out/munib-${s[0]}-${Array.isArray(s[1]) ? 'free' : s[1]}.png` });
  }
  await b.close();
})();
