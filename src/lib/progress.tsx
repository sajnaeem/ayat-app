import AsyncStorage from '@react-native-async-storage/async-storage';
import { createContext, ReactNode, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { levelFor, SURAHS } from './quran';

/**
 * What the person has read, kept on the phone (synced to their account once accounts land).
 * - readings: cards read in the feed (1 each) plus ayat read in Keep reading (1/3 each); drives the attention ladder
 * - ayat: every ayah ever read, keyed "s:n"
 * - days: ayat read per local day, keyed "YYYY-MM-DD"
 * - mem: ayat memorised, keyed "s:n"
 */
export type Progress = { readings: number; ayat: Record<string, 1>; days: Record<string, number>; mem: Record<string, 1> };
const EMPTY: Progress = { readings: 0, ayat: {}, days: {}, mem: {} };
const KEY = 'ayat.progress.v1';

export const dayKey = (d = new Date()) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

export function surahDone(p: Progress, s: number) {
  const n = SURAHS[s - 1][3];
  for (let i = 1; i <= n; i++) if (!p.ayat[`${s}:${i}`]) return false;
  return true;
}

type Events = { surahsCompleted: number[]; levelUp: number | null };
type Ctx = {
  progress: Progress;
  level: number;
  /** Records ayat as read. Returns what that unlocked, so the screen can say so. */
  markRead: (keys: string[], weight: number) => Events;
  markMemorised: (keys: string[]) => void;
  /** Ayat read since the app opened. */
  sessionAyat: number;
  replace: (p: Progress) => void;
};

const C = createContext<Ctx | null>(null);

export function ProgressProvider({ children }: { children: ReactNode }) {
  const [progress, setProgress] = useState<Progress>(EMPTY);
  const [sessionAyat, setSessionAyat] = useState(0);
  const ref = useRef(progress);
  ref.current = progress;
  const loaded = useRef(false);

  useEffect(() => {
    AsyncStorage.getItem(KEY)
      .then((raw) => raw && setProgress({ ...EMPTY, ...JSON.parse(raw) }))
      .catch(() => {})
      .finally(() => (loaded.current = true));
  }, []);
  useEffect(() => {
    if (loaded.current) AsyncStorage.setItem(KEY, JSON.stringify(progress)).catch(() => {});
  }, [progress]);

  const markRead = useCallback((keys: string[], weight: number): Events => {
    const prev = ref.current;
    const next: Progress = { ...prev, ayat: { ...prev.ayat }, days: { ...prev.days }, readings: prev.readings + weight };
    const touched = new Set<number>();
    for (const k of keys) {
      if (!next.ayat[k]) {
        next.ayat[k] = 1;
        touched.add(Number(k.split(':')[0]));
      }
    }
    const d = dayKey();
    next.days[d] = (next.days[d] ?? 0) + keys.length;
    ref.current = next;
    setProgress(next);
    setSessionAyat((n) => n + keys.length);
    const before = levelFor(prev.readings);
    const after = levelFor(next.readings);
    return { surahsCompleted: [...touched].filter((s) => surahDone(next, s)), levelUp: after > before ? after : null };
  }, []);

  const markMemorised = useCallback((keys: string[]) => {
    setProgress((p) => {
      const mem = { ...p.mem };
      keys.forEach((k) => (mem[k] = 1));
      return { ...p, mem };
    });
  }, []);

  const value = useMemo<Ctx>(
    () => ({ progress, level: levelFor(progress.readings), markRead, markMemorised, sessionAyat, replace: setProgress }),
    [progress, markRead, markMemorised, sessionAyat],
  );
  return <C.Provider value={value}>{children}</C.Provider>;
}

export function useProgress() {
  const c = useContext(C);
  if (!c) throw new Error('useProgress must be used inside ProgressProvider');
  return c;
}
