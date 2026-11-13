import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Font from 'expo-font';
import { supabase } from './supabase';

/**
 * Page view: the Quran as the printed Madani Mushaf (604 pages, 15 lines each), from the Quran Foundation.
 * Each page comes line by line with the glyph codes of its own page font (QCF V2): every page has a
 * font of its own, so the letters sit exactly as in the printed mushaf.
 *
 * Page text is kept on the phone for 7 days at most (Quran Foundation terms). Font files may be
 * kept and bundled (also in their terms), so they're simply cached by expo-font.
 * Credit, as the Quran Foundation asks: "Quran fonts provided by Quran Foundation".
 */

/** A word on a line: [glyph code, ayah key, plain Uthmani text, 1 if it's the ayah-end marker, position in the ayah]. */
export type MWord = [string, string, string, number, number?];
export type MLine = { n: number; t: 'w'; w: MWord[] } | { n: number; t: 'h' | 'b'; s: number } | { n: number; t: 'e' };
export type MPage = { p: number; lines: MLine[] };

const TTL = 7 * 86400000;
const pageKey = (p: number) => `munib.page.v1.${p}`;
const pages = new Map<number, Promise<MPage>>();

export function loadPage(p: number): Promise<MPage> {
  let pr = pages.get(p);
  if (!pr) {
    pr = (async () => {
      try {
        const raw = await AsyncStorage.getItem(pageKey(p));
        if (raw) {
          const c = JSON.parse(raw) as { t: number; d: MPage };
          if (Date.now() - c.t < TTL) return c.d;
        }
      } catch {}
      if (!supabase) throw new Error('offline');
      const { data, error } = await supabase.functions.invoke('qf', { body: { page: p } });
      if (error || !data?.lines) throw error ?? new Error('no page');
      AsyncStorage.setItem(pageKey(p), JSON.stringify({ t: Date.now(), d: data })).catch(() => {});
      return data as MPage;
    })();
    pr.catch(() => pages.delete(p));
    pages.set(p, pr);
  }
  return pr;
}

/** Removes saved pages older than 7 days (Quran Foundation terms). */
export async function prunePages() {
  try {
    const keys = (await AsyncStorage.getAllKeys()).filter((k) => k.startsWith('munib.page.'));
    const old: string[] = [];
    for (const k of keys) {
      const raw = await AsyncStorage.getItem(k);
      try {
        if (!raw || Date.now() - JSON.parse(raw).t > TTL) old.push(k);
      } catch {
        old.push(k);
      }
    }
    if (old.length) await AsyncStorage.multiRemove(old);
  } catch {}
}

const FONT_BASE = 'https://verses.quran.foundation/fonts/quran/hafs';
export const pageFont = (p: number) => `QCF2_P${String(p).padStart(3, '0')}`;
export const HAFS = 'UthmanicHafs';
const fonts = new Map<string, Promise<boolean>>();

function loadFont(name: string, url: string): Promise<boolean> {
  if (Font.isLoaded(name)) return Promise.resolve(true);
  let f = fonts.get(name);
  if (!f) {
    f = Font.loadAsync({ [name]: url }).then(
      () => true,
      () => {
        fonts.delete(name);
        return false;
      },
    );
    fonts.set(name, f);
  }
  return f;
}

/** The page's own font. Resolves false if it couldn't be loaded (the page then shows plain Uthmani text). */
export const loadPageFont = (p: number) => loadFont(pageFont(p), `${FONT_BASE}/v2/ttf/p${p}.ttf`);
/** The Uthmanic Hafs font, for the basmalah lines and as the fallback. */
export const loadHafs = () => loadFont(HAFS, `${FONT_BASE}/uthmanic_hafs/UthmanicHafs1Ver18.ttf`);

export function prefetchAround(p: number) {
  for (const q of [p + 1, p - 1, p + 2]) {
    if (q < 1 || q > 604) continue;
    loadPage(q).catch(() => {});
    loadPageFont(q);
  }
}

/** Every ayah that has words on a page, in order. */
export function ayatOn(page: MPage): string[] {
  const out: string[] = [];
  for (const l of page.lines) if (l.t === 'w') for (const w of l.w) if (out[out.length - 1] !== w[1]) out.push(w[1]);
  return [...new Set(out)];
}
