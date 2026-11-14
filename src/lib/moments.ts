import AsyncStorage from '@react-native-async-storage/async-storage';
import { juzStart } from '@/data/mushaf';
import { revealedIn, SURAHS } from './quran';
import { ayahLink, SITE } from './site';

/**
 * Moments worth sharing (Saj, 14 Nov 2026): finishing a surah, learning one for your prayer, a juz finished in Read
 * together, today's ayat read. Each is shown once. While someone is reading, a moment arrives as a small banner they
 * can open (it never interrupts the recitation); after a button they pressed themselves, it opens straight away.
 * The shared picture never carries a name: it invites ("Read it with me?") rather than announces.
 */
export type Moment = {
  id: string;
  eyebrow: string;
  title: string;
  line?: string;
  /** Arabic for the middle of the card (a surah's name). */
  ar?: string;
  /** The words sent with the picture, before the link. */
  share: string;
  link: string;
  /** Arrive as a banner first. */
  quiet?: boolean;
};

const KEY = 'munib.moments.v1';
let seen: Set<string> | null = null;
const load = async () => {
  if (seen) return seen;
  try {
    seen = new Set(JSON.parse((await AsyncStorage.getItem(KEY)) ?? '[]') as string[]);
  } catch {
    seen = new Set();
  }
  return seen;
};

let listener: ((m: Moment) => void) | null = null;
export const onMoment = (fn: ((m: Moment) => void) | null) => {
  listener = fn;
};

/** Show a moment, unless it has been shown before. */
export async function celebrate(m: Moment) {
  const s = await load();
  if (s.has(m.id)) return;
  s.add(m.id);
  AsyncStorage.setItem(KEY, JSON.stringify([...s].slice(-400))).catch(() => {});
  listener?.(m);
}

export const surahMoment = (s: number): Moment => {
  const [name, ar, , n] = SURAHS[s - 1];
  return {
    id: `surah:${s}`,
    eyebrow: 'Surah complete',
    title: `Surah ${name}, read in full`,
    line: `${n} ayat · Revealed in ${revealedIn(s)}`,
    ar,
    share: `I’ve just finished reading Surah ${name}. Read it with me?`,
    link: ayahLink(s, 1),
    quiet: true,
  };
};

export const learnedMoment = (s: number): Moment => {
  const [name, ar] = SURAHS[s - 1];
  return {
    id: `learned:${s}`,
    eyebrow: 'Learned by heart',
    title: `Surah ${name}, ready for your prayer`,
    line: 'Recite it in your next prayer to keep it.',
    ar,
    share: `I’ve just learned Surah ${name} by heart. Learn it with me?`,
    link: ayahLink(s, 1),
  };
};

export const juzMoment = (khatm: string, title: string, juz: number, quiet: boolean, round = 0): Moment => {
  const [s, a] = juzStart(juz);
  return {
    id: `juz:${khatm}:${round}:${juz}`,
    eyebrow: 'Juz complete',
    title: `Juz ${juz} of 30, finished`,
    line: `For “${title}”`,
    share: `Juz ${juz} is finished in our reading of the Quran together. Come and read with us?`,
    link: ayahLink(s, a),
    quiet,
  };
};

export const goalMoment = (day: string, n: number): Moment => ({
  id: `goal:${day}`,
  eyebrow: 'Today’s reading',
  title: `Your ${n} ayat for today, read`,
  line: 'A little, every day.',
  share: `I’ve read my ${n} ayat of the Quran today. Read a few with me?`,
  link: SITE,
  quiet: true,
});
