import AsyncStorage from '@react-native-async-storage/async-storage';
import { createContext, ReactNode, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import type { ReciterId } from './audio';
import type { LangId, MoodId } from './quran';

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
};

const KEY = 'ayat.prefs.v1';

type Store = Prefs & {
  ready: boolean;
  set: (patch: Partial<Prefs>) => void;
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
