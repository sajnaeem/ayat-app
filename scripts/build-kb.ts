// Builds website/data/kb.json (the library the Ask tab answers from) out of Munib's own checked content.
// Run: npx -y esbuild@0.24.0 scripts/build-kb.ts --bundle --platform=node --outfile=/tmp/kb.js && node /tmp/kb.js  (then push: the islam function loads it from the website)
import { EXPLAINERS } from '../src/data/explainers';
import { STEPS, LEARN_ORDER, WUDU, WUDU_END, BEFORE } from '../src/data/salah';
import { SNIPPETS } from '../src/data/snippets';
import { DUA_TOPICS } from '../src/data/duas';
import { writeFileSync } from 'fs';
type Item = { id: string; title: string; text: string; src: string };
const out: Item[] = [];
for (const e of EXPLAINERS) out.push({ id: `x:${e.id}`, title: `${e.ask} (${e.word})`, text: [e.what, e.why, e.how].filter(Boolean).join('\n'), src: e.sources.join('; ') });
for (const id of LEARN_ORDER) { const s = STEPS[id]; out.push({ id: `p:${id}`, title: `Prayer step: ${s.title} (${s.name})`, text: [s.how, ...(s.say ?? []).map((w) => `Say: ${w.tl} — "${w.en}"${w.times ? ` (${w.times} times)` : ''} [${w.src}]`), s.differs ? `Done differently: ${s.differs}` : ''].filter(Boolean).join('\n'), src: (s.say ?? []).map((w) => w.src).join('; ') || 'Munib prayer guide' }); }
out.push({ id: 'p:wudu', title: 'How to do wudu (washing before prayer)', text: WUDU.map((w, i) => `${i + 1}. ${w.title}${w.times ? ` ×${w.times}` : ''}: ${w.how}`).join('\n') + `\nAfterwards: ${WUDU_END.tl} — "${WUDU_END.en}"`, src: WUDU_END.src });
BEFORE.forEach((b, i) => out.push({ id: `p:before${i}`, title: `Before you pray: ${b.title}`, text: b.how, src: 'Munib prayer guide' }));
for (const s of SNIPPETS as any[]) {
  const k = s.kind;
  if (k === 'fact') out.push({ id: `s:${s.id}`, title: s.title, text: s.body, src: s.source });
  else if (k === 'myth') out.push({ id: `s:${s.id}`, title: `Myth: ${s.myth}`, text: s.fact, src: s.source });
  else if (k === 'word') out.push({ id: `s:${s.id}`, title: `What does "${s.tl}" mean?`, text: `${s.meaning}. ${s.body}`, src: s.source });
  else if (k === 'try') out.push({ id: `s:${s.id}`, title: s.title, text: s.body, src: s.source });
  else if (k === 'name') out.push({ id: `s:${s.id}`, title: `Name of Allah: ${s.tl} (${s.meaning})`, text: s.body, src: s.source });
  else if (k === 'dua') out.push({ id: `s:${s.id}`, title: `Dua: ${s.title}`, text: `${s.tl} — "${s.meaning}"`, src: s.source });
  else if (k === 'quiz') out.push({ id: `s:${s.id}`, title: s.q, text: `${s.options[s.answer]}. ${s.why}`, src: s.source });
  else if (k === 'story') s.parts.forEach((p: any, i: number) => out.push({ id: `s:${s.id}.${i}`, title: `${s.title ?? `The story of ${s.who}`}${p.heading ? `: ${p.heading}` : ` (part ${i + 1})`}`, text: p.text, src: p.source }));
  else if (k === 'quote') out.push({ id: `s:${s.id}`, title: `Saying of ${s.who} (${s.about})`, text: s.text ?? s.quote ?? '', src: s.source ?? '' });
}
for (const t of DUA_TOPICS) out.push({ id: `d:${t.id}`, title: `Duas: ${t.title}`, text: t.duas.map((d) => `${d.tl} — "${d.en}"${d.n > 1 ? ` (${d.n} times)` : ''}`).join('\n'), src: t.src });
writeFileSync('website/data/kb.json', JSON.stringify(out));
console.log(out.length, JSON.stringify(out).length);
