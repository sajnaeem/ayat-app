import AsyncStorage from '@react-native-async-storage/async-storage';
import { createContext, ReactNode, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import type { ReciterId } from './audio';
import surahs from '@/data/surahs.json';
import type { LangId, MoodId } from './quran';

/** The ayah just before (s, a), so the Quran tab's "next ayah" lands exactly on (s, a). */
function placeBefore(s: number, a: number): { s: number; a: number } | null {
  if (a > 1) return { s, a: a - 1 };
  if (s > 1) return { s: s - 1, a: (surahs as [string, string, string, number][])[s - 2][3] };
  return null;
}

type Prefs = {
  onboarded: boolean;
  mood: MoodId | null;
  lang: LangId;
  reciter: ReciterId;
  showTl: boolean;
  sound: boolean;
  likes: Record<string, number>;
  saves: Record<string, number>;
  /** Daily check-in: off until the person says yes. Time is local. */
  reminders: { on: boolean; hour: number; minute: number; friday: boolean };
  /** Whether we've already offered reminders (so we ask once). */
  remindersOffered: boolean;
  /** The last ayah read in the full Quran reader, so "Continue the Quran" can pick up from there. */
  place: { s: number; a: number } | null;
  /** The feed: curated ayat for you, or the whole Quran in order. */
  feedMode: 'foryou' | 'order';
  /** Changes whenever someone asks to read from a particular ayah, so the Quran tab rebuilds from there. */
  jump: number;
};

const DEFAULTS: Prefs = {
  onboarded: false,
  mood: null,
  lang: 'en',
  reciter: 'alafasy',
  showTl: false,
  sound: true,
  likes: {},
  saves: {},
  reminders: { on: false, hour: 19, minute: 0, friday: true },
  remindersOffered: false,
  place: null,
  feedMode: 'foryou',
  jump: 0,
};

const KEY = 'ayat.prefs.v1';

type Store = Prefs & {
  ready: boolean;
  set: (patch: Partial<Prefs>) => void;
  /** Opens the Quran tab at this ayah (the one reading experience). */
  readAt: (s: number, a?: number) => void;
  toggleLike: (k: string) => boolean;
  toggleSave: (k: string) => boolean;
};

const Ctx = createContext<Store | null>(null);

export function PrefsProvider({ children }: { children: ReactNode }) {
  const [prefs, setPrefs] = useState<Prefs>(DEFAULTS);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    AsyncStorage.getItem(KEY)
      .then((raw) => {
        if (raw) setPrefs({ ...DEFAULTS, ...JSON.parse(raw) });
      })
      .catch(() => {})
      .finally(() => setReady(true));
  }, []);

  useEffect(() => {
    if (ready) AsyncStorage.setItem(KEY, JSON.stringify(prefs)).catch(() => {});
  }, [prefs, ready]);

  const set = useCallback((patch: Partial<Prefs>) => setPrefs((p) => ({ ...p, ...patch })), []);

  const setIn = useCallback((field: 'likes' | 'saves', k: string, on: boolean) => {
    setPrefs((p) => {
      const next = { ...p[field] };
      if (on) next[k] = Date.now();
      else delete next[k];
      return { ...p, [field]: next };
    });
  }, []);

  const value = useMemo<Store>(
    () => ({
      ...prefs,
      ready,
      set,
      readAt: (s: number, a = 1) => set({ place: placeBefore(s, a), feedMode: 'order', jump: Date.now() }),
      toggleLike: (k) => {
        const on = !prefs.likes[k];
        setIn('likes', k, on);
        return on;
      },
      toggleSave: (k) => {
        const on = !prefs.saves[k];
        setIn('saves', k, on);
        return on;
      },
    }),
    [prefs, ready, set, setIn],
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function usePrefs(): Store {
  const s = useContext(Ctx);
  if (!s) throw new Error('usePrefs must be used inside PrefsProvider');
  return s;
}
