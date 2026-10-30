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
  tr: Record<LangId, string[]>;
  note: string;
  tags: MoodId[];
};

export const VERSES = versesJson as unknown as Verse[];

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
      );
    p.catch(() => chapterCache.delete(key));
    chapterCache.set(key, p);
  }
  return p;
}
