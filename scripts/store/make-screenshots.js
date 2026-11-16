const { chromium } = require('playwright');
const fs = require('fs');
const F = '/home/claude/ayat-app/node_modules/@expo-google-fonts';
const ART = '/home/claude/ayat-app/assets/art';
const RAW = __dirname + '/raw';
const TOPS = JSON.parse(fs.readFileSync(__dirname + '/tops.json', 'utf8'));
// [file, shot, top colour, bottom colour, headline (with *highlight*), sub, art, art position, tilt, highlight colour]
const S = [
  ['01', 'feed', '#0F7A57', '#063F2E', 'Grow closer<br>to Allah.<br>*Just follow along.*', 'An ayah for how you feel, then the next. No planning needed.', 'star8', 'tr', -3, '#F5D27A'],
  ['02', 'deeds', '#E9A93A', '#B8661E', '*Six small deeds.*<br>Every day.', 'Pray, read, remember, make dua. Just tick them off.', 'beads', 'br', 3, '#FFFFFF'],
  ['03', 'pray', '#3A7BD5', '#1D3F8A', 'Learn to pray,<br>*step by step*', 'Follow the pictures and the recitation, at your own pace.', 'hands', 'tl', -3, '#FFE08A'],
  ['04', 'learn', '#7B5BD6', '#3E2A86', 'Learn surahs,<br>*one ayah<br>at a time*', 'Listen, repeat, and say it yourself. Easiest first.', 'mushaf', 'br', 3, '#FFE08A'],
  ['05', 'ask', '#11998E', '#0A5C55', 'Ask anything<br>*about Islam*', 'Gentle, private answers with their sources.', 'hands', 'tr', -3, '#FFE08A'],
  ['06', 'prayer', '#C2577E', '#6E2448', 'Prayer times<br>*for your day*', 'With the sky as it is right now, wherever you are.', 'crescent', 'tr', 3, '#FFE08A'],
  ['07', 'tasbeeh', '#1F8A66', '#08382B', 'Remember Allah,<br>*anywhere*', 'Tap, count and breathe. Your counts stay on your phone.', 'beads', 'tr', -3, '#F5D27A'],
  ['08', 'repeat', '#E26D4F', '#9A3424', 'The Quran<br>*on repeat*', 'For a room, a journey or a quiet day, even with your phone locked.', 'radio', 'bl', 3, '#FFFFFF'],
  ['09', 'ramadan', '#27306B', '#0E1236', 'Ramadan,<br>*planned for you*', 'Suhoor, iftar, tonight’s juz, and how to rest well.', 'moon', 'tr', -3, '#F5D27A'],
  ['10', 'qibla', '#0F7A57', '#063F2E', 'Free for everyone.<br>*Nothing tracked.*', 'Your faith is yours. Munib never sells your data.', 'kaaba', 'bl', 3, '#F5D27A'],
];
const pos = { tr: 'right:-150px;top:-120px', tl: 'left:-150px;top:-120px', br: 'right:-160px;top:820px', bl: 'left:-160px;top:820px' };
const star = (cx, cy, r, inner = 0.62) => { let d = ''; for (let i = 0; i < 16; i++) { const a = Math.PI / 8 * i - Math.PI / 2; const rr = i % 2 ? r * inner : r; d += (i ? 'L' : 'M') + (cx + Math.cos(a) * rr).toFixed(1) + ' ' + (cy + Math.sin(a) * rr).toFixed(1) + ' '; } return d + 'Z'; };
let lattice = ''; for (let y = 0, row = 0; y < 3000; y += 230, row++) for (let x = row % 2 ? 130 : 0; x < 1450; x += 260) lattice += `<path d="${star(x, y, 78, 0.7)}"/>`;
const dark = (h) => { const n = parseInt(h.slice(1), 16); return ((n >> 16) * 0.3 + ((n >> 8) & 255) * 0.59 + (n & 255) * 0.11) < 140; };
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
.art{position:absolute;${pos[ap]};width:400px;z-index:2;filter:drop-shadow(0 40px 60px rgba(0,0,0,.4))}
</style></head><body>
<div class="bg"></div><div class="glow"></div>
<svg class="l" width="1320" height="2868" fill="none" stroke="#fff" stroke-width="3">${lattice}</svg>
<div class="head"><h1>${h.replace(/\*(.+?)\*/g, '<em>$1</em>')}</h1><p>${sub}</p></div>
<div class="stage"><div class="phone"><div class="screen" style="background:${TOPS[shot]}"><div class="status" style="color:${dark(TOPS[shot]) ? '#fff' : '#111'}"><span>9:41</span><span>●●● ▮</span></div><img src="file://${RAW}/${shot}.png"></div><div class="island"></div></div>
<img class="art" src="file://${ART}/${art}.png"></div>
</body></html>`;
(async () => {
  fs.mkdirSync(__dirname + '/out', { recursive: true });
  const b = await chromium.launch();
  const p = await b.newPage({ viewport: { width: 1320, height: 2868 } });
  for (const s of S) {
    fs.writeFileSync(`${__dirname}/s.html`, page(s));
    await p.goto(`file://${__dirname}/s.html`); await p.evaluate(() => document.fonts.ready); await p.waitForTimeout(300);
    await p.screenshot({ path: `${__dirname}/out/munib-${s[0]}-${s[1]}.png` });
  }
  await b.close();
})();
