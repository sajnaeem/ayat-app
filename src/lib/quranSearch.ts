import { Platform } from 'react-native';
import type { LangId } from './quran';

/**
 * Search the whole Quran on the phone: Arabic words (with or without harakat) or words from the translation.
 *
 * Uses the open quran-json dataset (the same one Munib already falls back to for reading), downloaded once
 * (about 2.4 MB) and kept on the phone. The Quran Foundation's own Search API would need the "search" scope
 * on our QF client, which it doesn't have yet (13 Nov 2026).
 */

let FS: typeof import('expo-file-system') | null = null;
try {
  if (Platform.OS !== 'web') FS = require('expo-file-system');
} catch {
  FS = null;
}

// quran-json has these translations; Urdu searches the English (and the Arabic).
const DATA_LANGS = new Set(['en', 'bn', 'es', 'fr', 'id', 'tr']);
const dataLang = (l: LangId) => (DATA_LANGS.has(l) ? l : 'en');

type Index = { keys: string[]; ar: string[]; arN: string[]; tr: string[]; trN: string[] };
const indexes = new Map<string, Promise<Index>>();

/** Arabic without harakat and with letter variants unified, so "الصبر" finds "ٱلصَّبْرِ". */
export function normArabic(t: string) {
  return t
    .replace(/[ؐ-ًؚ-ٰٟۖ-ۭـ]/g, '')
    .replace(/[أإآٱ]/g, 'ا')
    .replace(/ى/g, 'ي')
    .replace(/ة/g, 'ه')
    .replace(/ؤ/g, 'و')
    .replace(/ئ/g, 'ي')
    .replace(/\s+/g, ' ')
    .trim();
}
const normLatin = (t: string) =>
  t
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[‘’ʿʾ'`]/g, '')
    .replace(/[^\p{L}\p{N}\s]/gu, ' ')
    .replace(/\s+/g, ' ')
    .trim();
export const isArabic = (t: string) => /[؀-ۿ]/.test(t);

type Raw = { id: number; verses: { id: number; text: string; translation: string }[] }[];

async function readSaved(lang: string): Promise<string | null> {
  if (!FS) return null;
  try {
    const f = new FS.File(FS.Paths.document, 'search', `quran_${lang}.json`);
    return f.exists ? await f.text() : null;
  } catch {
    return null;
  }
}
function save(lang: string, text: string) {
  if (!FS) return;
  try {
    const dir = new FS.Directory(FS.Paths.document, 'search');
    dir.create({ intermediates: true, idempotent: true });
    Promise.resolve(new FS.File(dir, `quran_${lang}.json`).write(text)).catch(() => {});
  } catch {}
}

function loadIndex(l: LangId): Promise<Index> {
  const lang = dataLang(l);
  let p = indexes.get(lang);
  if (!p) {
    p = (async () => {
      let text = await readSaved(lang);
      if (!text) {
        const r = await fetch(`https://cdn.jsdelivr.net/npm/quran-json@3.1.2/dist/quran_${lang}.json`);
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        text = await r.text();
        save(lang, text);
      }
      const raw: Raw = JSON.parse(text);
      const idx: Index = { keys: [], ar: [], arN: [], tr: [], trN: [] };
      for (const c of raw)
        for (const v of c.verses) {
          idx.keys.push(`${c.id}:${v.id}`);
          idx.ar.push(v.text);
          idx.arN.push(normArabic(v.text));
          idx.tr.push(v.translation);
          idx.trN.push(normLatin(v.translation));
        }
      return idx;
    })();
    p.catch(() => indexes.delete(lang));
    indexes.set(lang, p);
  }
  return p;
}

/** Starts the download early (e.g. when the search screen opens), so the first search is quick. */
export const warmSearch = (l: LangId) => {
  loadIndex(l).catch(() => {});
};

// Names people search by and the words Saheeh International uses for them (English only).
const ALSO: Record<string, string> = {
  musa: 'moses', isa: 'jesus', eesa: 'jesus', ibrahim: 'abraham', ebrahim: 'abraham', yusuf: 'joseph', yousuf: 'joseph',
  nuh: 'noah', nooh: 'noah', yunus: 'jonah', younus: 'jonah', dawud: 'david', dawood: 'david', sulayman: 'solomon', sulaiman: 'solomon',
  ayyub: 'job', yaqub: 'jacob', yaqoob: 'jacob', ismail: 'ishmael', ishaq: 'isaac', harun: 'aaron', haroon: 'aaron', maryam: 'mary',
  yahya: 'john', zakariya: 'zechariah', zakariyya: 'zechariah', ilyas: 'elias', lut: 'lot', jibril: 'gabriel', jibreel: 'gabriel',
  shaytan: 'satan', shaitan: 'satan', firawn: 'pharaoh', firaun: 'pharaoh', jannah: 'paradise', jahannam: 'hell', salah: 'prayer',
  salat: 'prayer', sabr: 'patience', tawbah: 'repent', dua: 'supplication', dunya: 'worldly life', akhirah: 'hereafter', kaaba: "ka'bah",
  makkah: 'makkah', mecca: 'makkah', medina: 'madinah', quran: "qur'an",
};

export type Hit = { key: string; s: number; a: number; ar: string; tr: string; exact: boolean };

/** Every ayah matching the words, in Quran order: exact phrase matches first, then ayat containing all the words. */
export async function searchQuran(query: string, l: LangId): Promise<{ hits: Hit[]; total: number }> {
  const idx = await loadIndex(l);
  const arabic = isArabic(query);
  let q = arabic ? normArabic(query) : normLatin(query);
  if (!arabic && dataLang(l) === 'en') q = normLatin(q.split(' ').map((w) => ALSO[w] ?? w).join(' '));
  if (q.length < 2) return { hits: [], total: 0 };
  const words = q.split(' ').filter((w) => w.length >= (arabic ? 2 : 2));
  const hay = arabic ? idx.arN : idx.trN;
  const exact: number[] = [];
  const all: number[] = [];
  // Whole words for short English words ("we" shouldn't match "were"), parts of words otherwise.
  const wordRe = !arabic && q.length <= 3 ? new RegExp(`(^| )${q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}( |$)`) : null;
  for (let i = 0; i < hay.length; i++) {
    const h = hay[i];
    if (wordRe ? wordRe.test(h) : h.includes(q)) exact.push(i);
    else if (words.length > 1 && words.every((w) => h.includes(w))) all.push(i);
  }
  const order = [...exact, ...all];
  const hit = (i: number, ex: boolean): Hit => {
    const [s, a] = idx.keys[i].split(':').map(Number);
    return { key: idx.keys[i], s, a, ar: idx.ar[i], tr: idx.tr[i], exact: ex };
  };
  return { hits: order.slice(0, 200).map((i, n) => hit(i, n < exact.length)), total: order.length };
}
