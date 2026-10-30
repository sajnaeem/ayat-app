import versesJson from '@/data/verses.json';
import surahsJson from '@/data/surahs.json';

export type LangId = 'en' | 'ur' | 'bn' | 'id' | 'tr' | 'fr' | 'es';
export type MoodId = 'anxious' | 'grateful' | 'grieving' | 'forgiveness' | 'strength' | 'guidance';

export type Verse = {
  k: string; // "94:5-6"
  s: number;
  a: number;
  name: string;
  ar_name: string;
  meaning: string;
  ar: [string, number][]; // [text, ayah number]
  tl: string[];
  /** Curated ayat carry all 7 translations; ladder passages carry none and read from the loaded surah. */
  tr: Partial<Record<LangId, string[]>>;
  note: string;
  tags: MoodId[];
  /** True for passages and surahs added by the attention ladder. */
  gen?: boolean;
  /** Last ayah number in the card. */
  b: number;
};

export const VERSES = (versesJson as unknown as Omit<Verse, 'b'>[]).map((v) => ({ ...v, b: v.ar[v.ar.length - 1][1] })) as Verse[];

/** [transliterated name, Arabic name, English meaning, ayah count] for each of the 114 surahs. */
export const SURAHS = surahsJson as [string, string, string, number][];

export const LANGS: { id: LangId; name: string; native: string; by: string }[] = [
  { id: 'en', name: 'English', native: '', by: 'Saheeh International' },
  { id: 'ur', name: 'Urdu', native: 'اردو', by: "Abul A'la Maududi" },
  { id: 'bn', name: 'Bengali', native: 'বাংলা', by: 'Muhiuddin Khan' },
  { id: 'id', name: 'Indonesian', native: 'Bahasa Indonesia', by: 'Indonesian Ministry of Religious Affairs' },
  { id: 'tr', name: 'Turkish', native: 'Türkçe', by: 'Diyanet İşleri' },
  { id: 'fr', name: 'French', native: 'Français', by: 'Muhammad Hamidullah' },
  { id: 'es', name: 'Spanish', native: 'Español', by: 'Muhammad Isa García' },
];

export const MOODS: { id: MoodId; label: string; sub: string }[] = [
  { id: 'anxious', label: 'Anxious or overwhelmed', sub: 'Calm and reassurance' },
  { id: 'grateful', label: 'Grateful', sub: 'Blessings and shukr' },
  { id: 'grieving', label: 'Grieving or low', sub: 'Comfort and hope' },
  { id: 'forgiveness', label: 'Seeking forgiveness', sub: 'Mercy and tawbah' },
  { id: 'strength', label: 'Need strength', sub: 'Patience and resolve' },
  { id: 'guidance', label: 'Seeking guidance', sub: 'Direction and wisdom' },
];

/** The opening order for a brand-new user with no mood picked. */
const BASE = ['94:5-6', '2:255', '13:28', '39:53', '2:186', '112:1-4', '65:2-3', '93:3-5', '2:286', '20:25-28', '3:139', '2:152', '55:13', '14:7', '21:87', '17:23-24', '2:153', '49:13', '3:8', '103:1-3', '25:63', '2:201', '40:60', '3:185'];

function seeded(seed: number) {
  let x = seed % 2147483647;
  return () => {
    x = (x * 1103515245 + 12345) % 2147483648;
    return x / 2147483648;
  };
}

/** One round of the feed. Round 0 for a new user follows BASE; later rounds shuffle, mood-matched ayat first. */
export function feedRound(round: number, mood: MoodId | null, liked: string[]): Verse[] {
  const affinity: Record<string, number> = {};
  for (const k of liked) VERSES.find((v) => v.k === k)?.tags.forEach((t) => (affinity[t] = (affinity[t] || 0) + 1));
  const day = new Date();
  const r = seeded(day.getFullYear() * 1000 + day.getMonth() * 40 + day.getDate() + round * 7919);
  const plain = round === 0 && !mood && liked.length === 0;
  return VERSES.map((v) => {
    let score = r() * 0.9;
    if (mood && v.tags.includes(mood)) score += 4;
    score += Math.min(2, v.tags.reduce((a, t) => a + (affinity[t] || 0), 0) * 0.35);
    if (plain) score = -BASE.indexOf(v.k);
    return { v, score };
  })
    .sort((a, b) => b.score - a.score)
    .map((x) => x.v);
}

const AR_DIGITS = '٠١٢٣٤٥٦٧٨٩';
export const arabicNumber = (n: number) => String(n).replace(/\d/g, (d) => AR_DIGITS[+d]);

/** Tanzil's transliteration, tidied: sun-letter doubling shown with a hyphen, AA shown as ʿ (the letter ʿayn). */
export function cleanTransliteration(s: string): string {
  return s.replace(/al(th|sh|dh|[tdrzsnlTDSZ])\1/g, (_m, g) => `a${g}-${g}`).replace(/AA/g, 'ʿ');
}

export type ChapterAyah = { n: number; ar: string; tl: string; tr: string };
const chapterCache = new Map<string, Promise<ChapterAyah[]>>();
const chapterReady = new Map<string, ChapterAyah[]>();

/** A surah that has already loaded, or null. */
export function loadedChapter(s: number, lang: LangId): ChapterAyah[] | null {
  return chapterReady.get(`${lang}:${s}`) ?? null;
}

/**
 * Loads a whole surah (Arabic, transliteration, translation) in one language.
 * Source for now: the open quran-json dataset on jsDelivr. The production build swaps this for the Quran Foundation API.
 */
export function loadChapter(s: number, lang: LangId): Promise<ChapterAyah[]> {
  const key = `${lang}:${s}`;
  let p = chapterCache.get(key);
  if (!p) {
    p = fetch(`https://cdn.jsdelivr.net/npm/quran-json@3.1.2/dist/chapters/${lang}/${s}.json`)
      .then((r) => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        return r.json();
      })
      .then((d: { verses: { id: number; text: string; translation: string; transliteration: string }[] }) =>
        d.verses.map((v) => ({ n: v.id, ar: v.text, tl: cleanTransliteration(v.transliteration), tr: v.translation })),
      )
      .then((list) => {
        chapterReady.set(key, list);
        return list;
      });
    p.catch(() => chapterCache.delete(key));
    chapterCache.set(key, p);
  }
  return p;
}

/** The translation lines for a card in a language, or null while that surah is still loading. */
export function translationFor(v: Verse, lang: LangId): string[] | null {
  const own = v.tr[lang];
  if (own) return own;
  const c = loadedChapter(v.s, lang);
  if (c) return v.ar.map(([, n]) => c[n - 1]?.tr ?? '');
  return null;
}

/* ---------- attention ladder ---------- */

export const LEVELS = [
  { level: 1, name: 'Single ayat', at: 0 },
  { level: 2, name: 'Short passages', at: 25 },
  { level: 3, name: 'Short surahs', at: 75 },
  { level: 4, name: 'Longer readings', at: 150 },
];
export function levelFor(readings: number): number {
  let l = 1;
  for (const x of LEVELS) if (readings >= x.at) l = x.level;
  return l;
}

type Range = [string, MoodId[]];
const m = (s: string) => s.split(' ').filter(Boolean) as MoodId[];
/** 2–4 ayat that belong together. */
const PASSAGES: Range[] = [
  ['2:155-157', m('grieving strength')], ['3:190-191', m('guidance grateful')], ['13:28-29', m('anxious')], ['39:53-54', m('forgiveness')],
  ['33:41-43', m('grateful')], ['50:16-18', m('guidance')], ['59:18-19', m('guidance')], ['67:1-2', m('strength')], ['94:1-4', m('anxious grieving')],
  ['89:27-30', m('grieving')], ['3:26-27', m('strength')], ['7:55-56', m('forgiveness')], ['14:24-25', m('guidance')], ['2:45-46', m('strength')],
  ['17:80-81', m('anxious')], ['3:159-160', m('guidance')], ['16:96-97', m('strength')], ['18:109-110', m('guidance')], ['57:22-23', m('grieving anxious')],
  ['29:2-3', m('strength')], ['2:152-153', m('grateful strength')], ['93:6-8', m('grateful')],
];
/** Whole short surahs. */
const SHORT_SURAHS: [number, MoodId[]][] = [
  [1, m('guidance')], [93, m('grieving anxious')], [94, m('anxious')], [95, []], [97, m('grateful')], [99, []], [100, []], [101, []], [102, []],
  [103, m('guidance')], [105, []], [106, m('grateful')], [107, []], [108, m('grateful')], [109, m('guidance')], [110, m('forgiveness grateful')],
  [112, m('guidance')], [113, m('anxious')], [114, m('anxious')],
];
/** Longer readings, 4–13 ayat. */
const LONG: Range[] = [
  ['59:21-24', m('guidance')], ['3:190-194', m('forgiveness guidance')], ['2:1-5', m('guidance')], ['67:1-5', []], ['55:1-13', m('grateful')],
  ['96:1-5', m('guidance')], ['91:1-10', m('guidance')], ['25:63-67', m('guidance')], ['31:16-19', m('guidance')], ['23:1-9', m('guidance')],
  ['87:1-8', []], ['2:255-257', m('anxious strength')], ['17:23-27', m('guidance')], ['36:1-9', []], ['49:10-13', m('guidance')], ['2:284-286', m('forgiveness strength')],
];

const parse = (r: string) => {
  const [s, ab] = r.split(':');
  const [a, b] = ab.split('-').map(Number);
  return { s: Number(s), a, b: b ?? a };
};

function makeVerse(s: number, a: number, b: number, tags: MoodId[], c: ChapterAyah[], lang: LangId): Verse {
  const [name, ar_name, meaning] = SURAHS[s - 1];
  const ayat = c.slice(a - 1, b);
  return {
    k: a === b ? `${s}:${a}` : `${s}:${a}-${b}`,
    s, a, b, name, ar_name, meaning,
    ar: ayat.map((x) => [x.ar, x.n] as [string, number]),
    tl: ayat.map((x) => x.tl),
    tr: { [lang]: ayat.map((x) => x.tr) },
    note: '',
    tags,
    gen: true,
  };
}

/** Builds one card for any range, e.g. "67:1-5" (used for saved ayat and the reader). */
export async function verseForKey(k: string, lang: LangId): Promise<Verse | null> {
  const cur = VERSES.find((v) => v.k === k);
  if (cur) return cur;
  const mm = k.match(/^(\d+):(\d+)(?:-(\d+))?$/);
  if (!mm) return null;
  const s = +mm[1], a = +mm[2], b = +(mm[3] ?? mm[2]);
  const c = await loadChapter(s, lang);
  return makeVerse(s, a, b, [], c, lang);
}

/**
 * The extra, longer cards the attention ladder mixes into one round of the feed.
 * Level 2 adds short passages, level 3 whole short surahs, level 4 longer readings.
 */
export async function ladderCards(level: number, round: number, mood: MoodId | null, lang: LangId): Promise<Verse[]> {
  if (level < 2) return [];
  const r = seeded(Math.floor(Date.now() / 86400000) + round * 31 + level * 7);
  const curated = new Set(VERSES.map((v) => v.k));
  const pick = <T,>(arr: T[], n: number, tagsOf: (x: T) => MoodId[]) =>
    arr
      .map((x) => ({ x, sc: r() + (mood && tagsOf(x).includes(mood) ? 1 : 0) }))
      .sort((p, q) => q.sc - p.sc)
      .slice(0, n)
      .map((o) => o.x);
  const wanted: { s: number; a: number; b: number; tags: MoodId[] }[] = [];
  for (const [rg, tags] of pick(PASSAGES, level === 2 ? 8 : 6, (x) => x[1])) wanted.push({ ...parse(rg), tags });
  if (level >= 3) for (const [s, tags] of pick(SHORT_SURAHS, 6, (x) => x[1])) wanted.push({ s, a: 1, b: SURAHS[s - 1][3], tags });
  if (level >= 4) for (const [rg, tags] of pick(LONG, 6, (x) => x[1])) wanted.push({ ...parse(rg), tags });
  const chapters = await Promise.all(wanted.map((w) => loadChapter(w.s, lang).catch(() => null)));
  const out: Verse[] = [];
  wanted.forEach((w, i) => {
    const c = chapters[i];
    if (!c) return;
    const v = makeVerse(w.s, w.a, w.b, w.tags, c, lang);
    if (!curated.has(v.k)) out.push(v);
  });
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(r() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

/** Interleaves ladder cards into a round: more of them, and closer together, at higher levels. */
export function interleave(curated: Verse[], extras: Verse[], level: number): Verse[] {
  if (!extras.length) return curated;
  const gap = level === 2 ? 2 : 1;
  const per = level >= 4 ? 2 : 1;
  const out: Verse[] = [];
  let ci = 0, ei = 0;
  while (ci < curated.length) {
    for (let g = 0; g < gap && ci < curated.length; g++) out.push(curated[ci++]);
    for (let g = 0; g < per && ei < extras.length; g++) out.push(extras[ei++]);
  }
  return out;
}

export const ayahKeys = (v: Verse) => v.ar.map(([, n]) => `${v.s}:${n}`);
