const { chromium } = require('playwright');
const fs = require('fs');
const F = '/home/claude/ayat-app/node_modules/@expo-google-fonts';
const ART = '/home/claude/ayat-app/assets/art';
const RAW = __dirname + '/raw';
const TOPS = JSON.parse(fs.readFileSync(__dirname + '/tops.json', 'utf8'));
// file, shot, [top, bottom, blob] colours, eyebrow, headline (*marker*), sub, art, art corner, tilt, marker colour, chips [left, right]
const S = [
  ['01', 'feed', ['#12936A', '#04382A', '#3DDC97'], 'FOR YOU', 'Replace doomscrolling<br>with *returning<br>to Allah*', 'A personalised For you page with 100% Islamic content.', 'star8', 'tr', -3, '#F7D774', ['Pick how you feel', 'Recited aloud'], [1085, 1500]],
  ['02', 'deeds', ['#F2B441', '#B4581A', '#FFE08A'], 'DAILY DEEDS', 'Your daily deeds,<br>*in one checklist*', 'Pray, read, remember, make dua. Just tick them off.', 'beads', 'tr', 3, '#FFFFFF', ['Starts fresh every day', 'No streaks. No guilt.'], [1575, 1250]],
  ['03', 'pray', ['#4387E8', '#162F78', '#7FD4FF'], 'LEARN TO PRAY', 'Learn to pray,<br>*step by step*', 'Follow the pictures and the recitation, at your own pace.', 'hands', 'tr', -3, '#FFE08A', ['Every position, pictured', 'Recitation guides you']],
  ['04', 'learn', ['#8A66E8', '#33206F', '#E58BD8'], 'SURAHS FOR YOUR PRAYER', 'Learn surahs,<br>*one ayah<br>at a time*', 'Listen, repeat, and say it yourself. Easiest first.', 'mushaf', 'tr', 3, '#FFE08A', ['Repeat 3×', 'Record yourself'], [830, 1330]],
  ['05', 'ask', ['#14AD9F', '#07463F', '#8BF0C8'], 'ASK', 'Ask anything<br>*about Islam*', 'Gentle answers, with their sources.', 'hands', 'tr', -3, '#FFE08A', ['Sources shown', 'No question too small'], [560, 1480]],
  ['06', 'together', ['#D4638C', '#5E1B3C', '#FFB37A'], 'READ TOGETHER', 'Read the Quran<br>*together*', 'Start a family khatm or a group, and see what’s left to read.', 'globe', 'tr', -3, '#FFE08A', ['Invite with a link', 'In memory of someone']],
  ['07', 'prayer', ['#3B82C4', '#112E52', '#9AD0FF'], 'PRAYER TIMES', 'Prayer times,<br>*wherever<br>you are*', 'Or follow your own mosque’s jamaʿah times, with alerts.', 'crescent', 'tr', 3, '#FFE08A', ['Your mosque’s jamaʿah', 'Qibla included'], [720, 1290]],
  ['08', 'stories', ['#4A4FB5', '#0E1034', '#B38BFF'], 'BEDTIME STORIES', '*Bedtime stories*<br>from the Quran', 'True stories, read aloud, with a sleep timer.', 'moon', 'tr', -3, '#F7D774', ['17 stories', 'Sleep timer']],
  ['09', 'ramadan', ['#EE7B55', '#8A2A1E', '#FFC56B'], 'RAMADAN', 'Ramadan,<br>*planned for you*', 'Suhoor, iftar, tonight’s juz, and how to rest well.', 'dome', 'tr', 3, '#FFFFFF', ['Suhoor and iftar times', 'Tonight’s juz'], [330, 1290]],
  ['10', ['tasbeeh', 'qibla', 'repeat'], ['#12936A', '#04382A', '#3DDC97'], 'MUNIB', 'All features,<br>*completely free*', 'Tasbeeh, Qibla, the Quran on repeat, and much more.', 'kaaba', 'none', 0, '#F7D774', []],
];
const star = (cx, cy, r, inner = 0.62) => { let d = ''; for (let i = 0; i < 16; i++) { const a = Math.PI / 8 * i - Math.PI / 2; const rr = i % 2 ? r * inner : r; d += (i ? 'L' : 'M') + (cx + Math.cos(a) * rr).toFixed(1) + ' ' + (cy + Math.sin(a) * rr).toFixed(1) + ' '; } return d + 'Z'; };
let lattice = ''; for (let y = 0, row = 0; y < 3000; y += 230, row++) for (let x = row % 2 ? 130 : 0; x < 1450; x += 260) lattice += `<path d="${star(x, y, 78, 0.7)}"/>`;
const dark = (h) => { const n = parseInt(h.slice(1), 16); return ((n >> 16) * 0.3 + ((n >> 8) & 255) * 0.59 + (n & 255) * 0.11) < 140; };
const icons = (c) => `<svg width="150" height="40" viewBox="0 0 150 40" fill="${c}"><rect x="0" y="24" width="7" height="10" rx="2"/><rect x="11" y="18" width="7" height="16" rx="2"/><rect x="22" y="11" width="7" height="23" rx="2"/><rect x="33" y="4" width="7" height="30" rx="2"/><path d="M68 12c7 0 13 3 17 7l-4 4c-3-3-8-5-13-5s-10 2-13 5l-4-4c4-4 10-7 17-7zm0 11c4 0 7 1 9 4l-9 9-9-9c2-3 5-4 9-4z"/><rect x="98" y="6" width="44" height="26" rx="8" fill="none" stroke="${c}" stroke-width="3" opacity=".5"/><rect x="102" y="10" width="36" height="18" rx="5"/><rect x="144" y="14" width="4" height="10" rx="2" opacity=".5"/></svg>`;
const phone = (shot, style = '') => { const c = dark(TOPS[shot]) ? '#fff' : '#111'; return `<div class="phone" style="${style}"><div class="body"><div class="screen" style="background:${TOPS[shot]}"><div class="status" style="color:${c}"><span>9:41</span>${icons(c)}</div><img src="file://${RAW}/${shot}.png"><div class="shine"></div></div><div class="island"></div></div></div>`; };
const tick = `<svg width="54" height="54" viewBox="0 0 54 54"><circle cx="27" cy="27" r="27" fill="#13865A"/><path d="M15 28l8 8 16-17" fill="none" stroke="#fff" stroke-width="5.5" stroke-linecap="round" stroke-linejoin="round"/></svg>`;
const chip = (t, cls) => `<div class="chip ${cls}">${tick}<span>${t}</span></div>`;
const multi = (shots) => `<div class="multi">
  ${phone(shots[0], 'position:absolute;left:-70px;top:300px;transform:rotate(-9deg) scale(.66);transform-origin:top left')}
  ${phone(shots[2], 'position:absolute;right:-70px;top:300px;transform:rotate(9deg) scale(.66);transform-origin:top right')}
  ${phone(shots[1], 'position:absolute;left:50%;margin-left:-505px;top:0;transform:scale(.76);transform-origin:top center;z-index:2')}
</div>
<div class="chips">${['Your mosque’s jamaʿah alerts', 'Family circles', 'Live from Makkah', 'Find a dua', 'Listen offline', 'A gathering of dua', 'Learn to pray', 'Bedtime stories'].map((c) => `<span>${c}</span>`).join('')}</div>`;
const page = ([n, shot, [a, b, blob], eye, h, sub, art, ap, tilt, hi, chips, ct = [640, 1210]]) => `<!doctype html><html><head><meta charset="utf-8"><style>
@font-face{font-family:B;src:url(file://${F}/bricolage-grotesque/800ExtraBold/BricolageGrotesque_800ExtraBold.ttf)}
@font-face{font-family:BS;src:url(file://${F}/bricolage-grotesque/700Bold/BricolageGrotesque_700Bold.ttf)}
@font-face{font-family:BM;src:url(file://${F}/bricolage-grotesque/500Medium/BricolageGrotesque_500Medium.ttf)}
html,body{margin:0;width:1320px;height:2868px;overflow:hidden;background:${b}}
.bg{position:absolute;inset:0;background:linear-gradient(168deg, ${a} 0%, ${b} 78%)}
.blob{position:absolute;border-radius:50%;filter:blur(140px)}
.b1{left:-380px;top:-420px;width:1100px;height:1100px;background:${blob};opacity:.55}
.b2{right:-520px;top:900px;width:1200px;height:1200px;background:${blob};opacity:.28}
.b3{left:-400px;bottom:-500px;width:1100px;height:1100px;background:#000;opacity:.35}
.cone{position:absolute;left:50%;top:-200px;width:1800px;height:1700px;margin-left:-900px;background:conic-gradient(from 180deg at 50% 0%, transparent 150deg, rgba(255,255,255,.16) 172deg, rgba(255,255,255,.22) 180deg, rgba(255,255,255,.16) 188deg, transparent 210deg);filter:blur(30px)}
svg.l{position:absolute;inset:0;opacity:.11;-webkit-mask-image:linear-gradient(180deg,#000 0%,rgba(0,0,0,.25) 38%,transparent 62%);mask-image:linear-gradient(180deg,#000 0%,rgba(0,0,0,.25) 38%,transparent 62%)}
svg.grain{position:absolute;inset:0;opacity:.2;mix-blend-mode:soft-light}
.head{position:relative;padding:118px 84px 0;z-index:3}
.eye{display:inline-flex;align-items:center;gap:18px;font-family:BS;font-size:38px;letter-spacing:5px;color:#fff;background:rgba(255,255,255,.16);border:2px solid rgba(255,255,255,.34);border-radius:60px;padding:16px 34px 16px 28px}
.eye i{width:18px;height:18px;border-radius:50%;background:${hi}}
h1{margin:44px 0 0;font-family:B;font-size:${Math.max(...h.replace(/\*/g, '').split('<br>').map((l) => l.length)) > 14 ? 132 : 152}px;line-height:1.08;letter-spacing:-4.5px;color:#fff;text-shadow:0 8px 40px rgba(0,0,0,.22)}
h1 em{font-style:normal;color:#0B1512;background:${hi};padding:0 26px 6px;margin:0 -8px;border-radius:30px;-webkit-box-decoration-break:clone;box-decoration-break:clone;text-shadow:none;box-shadow:0 14px 36px rgba(0,0,0,.2)}
p{margin:44px 300px 0 4px;font-family:BM;font-size:54px;line-height:1.24;color:rgba(255,255,255,.9);text-wrap:balance}
.stage{position:relative;width:1010px;margin:96px auto 0}
.halo{position:absolute;left:-260px;top:120px;width:1530px;height:1500px;border-radius:50%;background:radial-gradient(circle, ${blob} 0%, transparent 62%);opacity:.5;filter:blur(40px)}
.phone{position:relative;width:1010px;height:2272px;transform:rotate(${tilt}deg);transform-origin:50% 30%}
.body{position:absolute;inset:0;border-radius:132px;padding:7px;background:linear-gradient(140deg,#8d938f 0%,#1a1e1c 22%,#0b0e0d 55%,#3a3f3c 82%,#a9afab 100%);box-shadow:0 90px 160px rgba(0,0,0,.5),0 30px 60px rgba(0,0,0,.3)}
.screen{position:absolute;inset:7px;border-radius:126px;border:20px solid #070908;overflow:hidden;display:flex;flex-direction:column;box-sizing:border-box}
.status{height:128px;flex:none;display:flex;align-items:center;justify-content:space-between;padding:26px 96px 0;box-sizing:border-box;font-family:BS;font-size:44px}
.phone img{width:100%;flex:1;min-height:0;object-fit:cover;object-position:top;display:block}
.shine{position:absolute;inset:0;background:linear-gradient(118deg, rgba(255,255,255,.16) 0%, rgba(255,255,255,.05) 22%, transparent 36%);pointer-events:none}
.island{position:absolute;top:52px;left:50%;width:270px;height:76px;margin-left:-135px;background:#070908;border-radius:40px}
.art{position:absolute;width:430px;z-index:4;filter:drop-shadow(0 50px 60px rgba(0,0,0,.45))}
.art.tr{right:-205px;top:-265px;transform:rotate(8deg)}
.art.none{display:none}
.art2{position:absolute;left:-210px;top:1320px;width:330px;z-index:1;filter:blur(9px) drop-shadow(0 30px 40px rgba(0,0,0,.3));opacity:.75;transform:rotate(-18deg)}
.chip{position:absolute;z-index:5;display:flex;align-items:center;gap:20px;background:#fff;border-radius:70px;padding:22px 40px 22px 24px;font-family:BS;font-size:48px;letter-spacing:-.8px;color:#0B1512;box-shadow:0 34px 70px rgba(0,0,0,.34),0 6px 14px rgba(0,0,0,.14);white-space:nowrap}
.chip.l{left:-128px;top:${ct[0]}px;transform:rotate(-5deg)}
.chip.r{right:-128px;top:${ct[1]}px;transform:rotate(4deg)}
.multi{position:relative;height:1700px;margin-top:70px;z-index:2}
.chips{position:absolute;left:60px;right:60px;bottom:120px;display:flex;flex-wrap:wrap;gap:22px;justify-content:center;z-index:3}
.chips span{font-family:BS;font-size:44px;color:#0B1512;background:#fff;border-radius:60px;padding:18px 34px;box-shadow:0 16px 36px rgba(0,0,0,.25)}
</style></head><body>
<div class="bg"></div><div class="blob b1"></div><div class="blob b2"></div><div class="blob b3"></div><div class="cone"></div>
<svg class="l" width="1320" height="2868" fill="none" stroke="#fff" stroke-width="3">${lattice}</svg>
<svg class="grain" width="1320" height="2868"><filter id="n"><feTurbulence type="fractalNoise" baseFrequency=".9" numOctaves="2" seed="4"/><feColorMatrix values="0 0 0 0 1  0 0 0 0 1  0 0 0 0 1  0 0 0 .9 0"/></filter><rect width="100%" height="100%" filter="url(#n)"/></svg>
<div class="head"><span class="eye"><i></i>${eye}</span><h1>${h.replace(/\*(.+?)\*/g, '<em>$1</em>')}</h1><p>${sub}</p></div>
${Array.isArray(shot) ? multi(shot) : `<div class="stage"><div class="halo"></div><img class="art2" src="file://${ART}/${art}.png">${phone(shot)}
<img class="art ${ap}" src="file://${ART}/${art}.png">${chips[0] ? chip(chips[0], 'l') + chip(chips[1], 'r') : ''}</div>`}
</body></html>`;
(async () => {
  fs.mkdirSync(__dirname + '/out2', { recursive: true });
  const only = process.argv[2];
  const b = await chromium.launch();
  const p = await b.newPage({ viewport: { width: 1320, height: 2868 } });
  for (const s of S) {
    if (only && s[0] !== only) continue;
    if (!(Array.isArray(s[1]) ? s[1] : [s[1]]).every((x) => fs.existsSync(`${RAW}/${x}.png`))) { console.log('skip', s[0]); continue; }
    fs.writeFileSync(`${__dirname}/s.html`, page(s));
    await p.goto(`file://${__dirname}/s.html`); await p.evaluate(() => document.fonts.ready); await p.waitForTimeout(300);
    await p.screenshot({ path: `${__dirname}/out2/munib-${s[0]}-${Array.isArray(s[1]) ? 'free' : s[1]}.png` });
  }
  await b.close();
})();
