// Munib · "Choose ayat for For you" (Supabase Edge Function "curate").
//
// Reads the Quran in order, about 50 ayat at a time, and asks Claude which ayat stand well on their own in the
// For you feed, with up to 3 moods each, a short context note and a reason for the reviewer. Every suggestion is saved
// as "pending" in ayah_picks; nothing reaches readers until a reviewer approves it in the app (src/app/curate.tsx).
// The Quran text saved with each suggestion comes from quran-json 3.1.2 (Uthmani Arabic, Saheeh International,
// transliteration), never from the AI. Only reviewers can call this. Nothing about readers is involved.
//
// Request (POST JSON, signed in as a reviewer): { "skip": ["2:255", "94:5-6", …] }   (ayat already in the feed)
// Answer: { "added": 4, "checked": "Al-Baqarah 2:51–100", "at": { "s": 2, "a": 101 }, "done": false } or { "error": … }

import { createClient } from 'npm:@supabase/supabase-js@2';

const KEY = Deno.env.get('ANTHROPIC_API_KEY') ?? '';
const MODEL = Deno.env.get('CURATE_MODEL') ?? 'claude-sonnet-5-5';
const URL_ = Deno.env.get('SUPABASE_URL')!;
const ANON = Deno.env.get('SUPABASE_ANON_KEY')!;
const SERVICE = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const QJ = 'https://cdn.jsdelivr.net/npm/quran-json@3.1.2/dist/chapters/en';
const CHUNK = 50;
const cors = { 'access-control-allow-origin': '*', 'access-control-allow-headers': 'authorization, x-client-info, apikey, content-type' };
const json = (b: unknown, status = 200) => new Response(JSON.stringify(b), { status, headers: { ...cors, 'content-type': 'application/json' } });

// Keep in step with MoodId in src/lib/quran.ts.
const MOODS: Record<string, string> = {
  anxious: 'anxious or overwhelmed: calm and reassurance',
  grateful: 'grateful: blessings and thankfulness',
  grieving: 'grieving or low: comfort and hope',
  lonely: 'lonely: Allah is near',
  money: 'money worries: provision and trust',
  angry: 'angry or frustrated: patience and pardon',
  temptation: 'struggling with temptation: turning back',
  unwell: 'unwell: healing and patience',
  forgiveness: 'seeking forgiveness: mercy and repentance',
  strength: 'needing strength: patience and resolve',
  guidance: 'seeking guidance: direction and wisdom',
  marriage: 'marriage: love, mercy, finding a spouse',
  divorce: 'divorce or separation: a way through',
  family: 'family: parents and relatives',
  conflict: 'conflict: making peace',
  parenting: 'parenting: raising children',
  newmuslim: 'new to Islam: the basics of who Allah is and what Islam asks, gently',
};

const SYSTEM = `You help choose ayat of the Quran for Munib, an app whose "For you" feed shows one short ayah (or two or three together) at a time, often to people who are struggling, coming back to their faith, or new to Islam. A reviewer checks every suggestion before anyone sees it.

You will be given a run of ayat in Saheeh International's English translation, numbered. Choose only ayat that:
- make sense on their own, without the story or argument around them;
- speak to the heart: Allah's mercy, nearness, care and forgiveness; hope, patience, gratitude, prayer and dua; signs of Allah in creation; kindness to parents, family and people; turning back to Allah; who Allah is.
Leave out ayat that are mainly legal rulings or detailed law, that address particular historical people or events and need that context, that speak of fighting or enemies, that warn of punishment without the hope around them, or that could easily be misunderstood alone. When unsure, leave it out: quality matters far more than quantity. Most runs of 50 ayat give 0 to 5 good picks; some give none.

For each pick give:
- "s" (surah number) and "from"/"to" (ayah numbers, consecutive, at most 3 ayat and about 70 English words in total);
- "moods": up to 3 of these ids, only where the ayah truly fits that moment (it can be empty): ${Object.entries(MOODS).map(([k, v]) => `${k} (${v})`).join('; ')};
- "note": one plain-English line (under 150 characters) of context for a reader, describing what the ayah is about or where it sits in the surah. Never quote or cite hadith, scholars or rulings, and never claim anything you are not certain of;
- "why": one short line for the reviewer on why it stands alone well.

Answer with JSON only: {"picks":[{"s":2,"from":186,"to":186,"moods":["lonely","anxious"],"note":"…","why":"…"}]}`;

type Ayah = { id: number; text: string; translation: string; transliteration: string };
const cache = new Map<number, Ayah[]>();
async function chapter(s: number): Promise<Ayah[]> {
  if (!cache.has(s)) {
    const r = await fetch(`${QJ}/${s}.json`);
    if (!r.ok) throw new Error(`quran-json ${r.status}`);
    cache.set(s, (await r.json()).verses);
  }
  return cache.get(s)!;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors });
  if (!KEY) return json({ error: 'off' });
  const asUser = createClient(URL_, ANON, { global: { headers: { Authorization: req.headers.get('Authorization') ?? '' } } });
  const { data: who } = await asUser.auth.getUser();
  if (!who?.user) return json({ error: 'signin' }, 401);
  const admin = createClient(URL_, SERVICE);
  const { data: isRev } = await admin.rpc('is_reviewer', { uid: who.user.id });
  if (!isRev) return json({ error: 'not a reviewer' }, 403);

  const body = await req.json().catch(() => ({}));
  const skip = new Set<string>(Array.isArray(body.skip) ? body.skip.map(String).slice(0, 2000) : []);
  const { data: prog } = await admin.from('curate_progress').select('s, a').eq('id', 1).single();
  let s = prog?.s ?? 1, a = prog?.a ?? 1;
  if (s > 114) return json({ added: 0, done: true, at: { s, a } });

  // Gather about 50 ayat, running on into the next surahs when one ends early (the short surahs go several at a time).
  const runs: { s: number; ayat: Ayah[] }[] = [];
  let count = 0;
  while (s <= 114 && count < CHUNK) {
    const all = await chapter(s);
    const take = all.slice(a - 1, a - 1 + (CHUNK - count));
    runs.push({ s, ayat: take });
    count += take.length;
    a += take.length;
    if (a > all.length) {
      s += 1;
      a = 1;
    }
  }
  const listing = runs
    .map((r) => `Surah ${r.s}:\n` + r.ayat.map((v) => `${r.s}:${v.id} ${v.translation}${skip.has(`${r.s}:${v.id}`) ? '   [already in the feed: skip]' : ''}`).join('\n'))
    .join('\n\n');

  const r = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: { 'x-api-key': KEY, 'anthropic-version': '2023-06-01', 'content-type': 'application/json' },
    body: JSON.stringify({
      model: MODEL,
      max_tokens: 1800,
      system: [{ type: 'text', text: SYSTEM, cache_control: { type: 'ephemeral' } }],
      messages: [{ role: 'user', content: listing }],
    }),
  });
  if (!r.ok) return json({ error: `ai ${r.status}` }, 502);
  const d = await r.json();
  const out = (d.content ?? []).map((c: { text?: string }) => c.text ?? '').join('');
  let picks: { s: number; from: number; to: number; moods?: string[]; note?: string; why?: string }[] = [];
  try {
    const m = out.match(/\{[\s\S]*\}/);
    picks = JSON.parse(m ? m[0] : out).picks ?? [];
  } catch {
    return json({ error: 'unreadable answer' }, 502);
  }

  const rows = [];
  for (const p of picks) {
    const run = runs.find((x) => x.s === Number(p.s));
    if (!run) continue;
    const from = Number(p.from), to = Number(p.to ?? p.from);
    const ayat = run.ayat.filter((v) => v.id >= from && v.id <= to);
    if (!ayat.length || to < from || to - from > 2 || ayat.length !== to - from + 1) continue;
    if (skip.has(`${run.s}:${from}`) || skip.has(`${run.s}:${from}-${to}`)) continue;
    rows.push({
      s: run.s,
      a: from,
      b: to,
      moods: (Array.isArray(p.moods) ? p.moods : []).map(String).filter((x) => x in MOODS).slice(0, 3),
      note: String(p.note ?? '').slice(0, 160),
      why: String(p.why ?? '').slice(0, 300),
      ar: ayat.map((v) => [v.text, v.id]),
      tl: ayat.map((v) => v.transliteration),
      en: ayat.map((v) => v.translation),
    });
  }
  let added = 0;
  if (rows.length) {
    const { data, error } = await admin.from('ayah_picks').upsert(rows, { onConflict: 's,a,b', ignoreDuplicates: true }).select('id');
    if (error) return json({ error: error.message }, 500);
    added = data?.length ?? 0;
  }
  await admin.from('curate_progress').update({ s, a, updated_at: new Date().toISOString() }).eq('id', 1);
  const first = runs[0], last = runs[runs.length - 1];
  const checked = `${first.s}:${first.ayat[0]?.id ?? 1}–${last.s}:${last.ayat[last.ayat.length - 1]?.id ?? 1}`;
  return json({ added, checked, at: { s, a }, done: s > 114 });
});
