import { supabase } from './supabase';

export type ReciterId = 'alafasy' | 'sudais' | 'husary' | 'minshawi';

export const RECITERS: { id: ReciterId; name: string; note: string; folder: string }[] = [
  { id: 'alafasy', name: 'Mishary Alafasy', note: 'Clear, melodic', folder: 'Alafasy_128kbps' },
  { id: 'sudais', name: 'Abdur-Rahman as-Sudais', note: 'Imam of Masjid al-Haram', folder: 'Abdurrahmaan_As-Sudais_192kbps' },
  { id: 'husary', name: 'Mahmoud Khalil al-Husary', note: 'Slow and precise, ideal for learners', folder: 'Husary_128kbps' },
  { id: 'minshawi', name: 'Muhammad Siddiq al-Minshawi', note: 'Moving, classical', folder: 'Minshawy_Murattal_128kbps' },
];

const pad = (n: number) => String(n).padStart(3, '0');

/**
 * Per-ayah MP3 for a reciter. Source for now: EveryAyah.com.
 * The production build swaps this for the Quran Foundation API, which adds word-by-word timings.
 */
export function ayahAudioUrl(reciter: ReciterId, surah: number, ayah: number): string {
  const r = RECITERS.find((x) => x.id === reciter) ?? RECITERS[0];
  return `https://everyayah.com/data/${r.folder}/${pad(surah)}${pad(ayah)}.mp3`;
}

/* ---------- Quran Foundation audio (with word timings) ---------- */


/** Quran Foundation recitation ids for our reciters. */
const QF_RECITATION: Record<ReciterId, number> = { alafasy: 7, sudais: 3, husary: 6, minshawi: 9 };

/** One ayah's audio: the file, and for each word its [position (1-based), start ms, end ms]. */
export type AyahAudio = { url: string; words: [number, number, number][] };

const audioCache = new Map<string, Promise<Map<number, AyahAudio>>>();

const absolute = (u: string) => (/^https?:/.test(u) ? u : u.startsWith('//') ? `https:${u}` : `https://verses.quran.com/${u.replace(/^\//, '')}`);

function loadSurahAudio(reciter: ReciterId, s: number): Promise<Map<number, AyahAudio>> {
  const key = `${reciter}:${s}`;
  let p = audioCache.get(key);
  if (!p) {
    p = (async () => {
      if (!supabase) throw new Error('offline');
      const { data, error } = await supabase.functions.invoke('qf', { body: { s, audio: QF_RECITATION[reciter] } });
      if (error) throw error;
      const files: { verse_key: string; url: string; segments?: number[][] }[] = data?.files ?? [];
      if (!files.length) throw new Error('no audio');
      const m = new Map<number, AyahAudio>();
      for (const f of files) {
        const n = Number(f.verse_key.split(':')[1]);
        const words = (f.segments ?? [])
          .filter((g) => Array.isArray(g) && g.length >= 4)
          .map((g) => [g[1], g[2], g[3]] as [number, number, number]);
        m.set(n, { url: absolute(f.url), words });
      }
      return m;
    })();
    p.catch(() => audioCache.delete(key));
    audioCache.set(key, p);
  }
  return p;
}

/**
 * The best audio for an ayah: Quran Foundation (with word timings) if it answers within `waitMs`,
 * otherwise EveryAyah without timings, so recitation never stalls.
 */
export async function ayahAudio(reciter: ReciterId, s: number, n: number, waitMs = 1500): Promise<AyahAudio> {
  const fallback: AyahAudio = { url: ayahAudioUrl(reciter, s, n), words: [] };
  try {
    const m = await Promise.race([loadSurahAudio(reciter, s), new Promise<null>((r) => setTimeout(() => r(null), waitMs))]);
    return m?.get(n) ?? fallback;
  } catch {
    return fallback;
  }
}

/** Which word (1-based position) is being recited at `ms`: the latest one to have started, so short gaps don't flicker. */
export function wordAt(words: [number, number, number][], ms: number): number | null {
  let cur: number | null = null;
  for (const [pos, start] of words) if (ms >= start) cur = pos;
  return cur;
}

/** Looks up audio for a surah ahead of time, so the next cards start reciting straight away. */
export function prefetchAudio(reciter: ReciterId, s: number) {
  loadSurahAudio(reciter, s).catch(() => {});
}
