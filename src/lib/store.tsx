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

export type Journey = 'returning' | 'new' | 'exploring' | 'growing';
/** First-open questions (src/components/Journey.tsx). Kept on the phone only. */
export type JourneyAnswers = {
  journey: Journey;
  arabic: 'none' | 'letters' | 'slow' | 'fluent';
  reading: 'rarely' | 'ramadan' | 'weekly' | 'daily';
  goals: string[];
  minutes: number;
  at: number;
};

export type Prefs = {
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
  /** My mosque (kept on this phone only: it says roughly where someone lives). */
  mosque: { id: string; name: string; url: string } | null;
  /** Prayer alerts: minutes before jama'ah for each prayer, or null for off. */
  prayerAlerts: Record<'fajr' | 'dhuhr' | 'asr' | 'maghrib' | 'isha', number | null>;
  /** Which Friday jama'ah to be reminded of, when the mosque has more than one. */
  jumuah: number;
  /** The last page open in page view (1–604). */
  mushafPage: number | null;
  /** Recitation speed (1 = normal). */
  speed: number;
  /** Size of the Arabic and translation on cards. */
  textSize: TextSize;
  /** Tasbeeh counter: the phrase, the count and target, and today's and all-time totals (phone only). */
  tasbeeh: { phrase: string; count: number; target: number; set: boolean; day: string; today: number; total: number };
  /** Auto scroll on the Quran tab: off, or the reading pace used when recitation is paused. */
  autoScroll: 'off' | 'slow' | 'medium' | 'fast';
  /** For you: the kinds of extras the reader has turned off (ids from FEED_TOPICS). The ayat are always shown. */
  feedHide: string[];
  /** Explainers the reader has said they already know (the "New to this?" card becomes a small link). */
  explained: string[];
  /** How Munib looks: bold (light ground, bright colour cards; the default), dark (bold on black), light (the original quiet look) or follow the phone (bold, light or dark). */
  look: 'bold' | 'dark' | 'light' | 'auto';
  /** Answers to the first-open questions, if given. */
  journey: JourneyAnswers | null;
  journeySkipped: boolean;
  /** Ayat a day the reader aimed for (from the journey questions); 0 = none. */
  dailyGoal: number;
  /** General prayer times, worked out on the phone from where you are (stored on the phone only). */
  prayer: { method: string; asr: 'standard' | 'hanafi'; loc: { lat: number; lon: number; label: string; at: number } | null; alerts: Record<'fajr' | 'dhuhr' | 'asr' | 'maghrib' | 'isha', boolean> };
};
export type TextSize = 'small' | 'medium' | 'large' | 'xl';
export const TEXT_SIZES: { id: TextSize; label: string; scale: number }[] = [
  { id: 'small', label: 'Small', scale: 0.88 },
  { id: 'medium', label: 'Standard', scale: 1 },
  { id: 'large', label: 'Large', scale: 1.15 },
  { id: 'xl', label: 'Extra large', scale: 1.3 },
];
export const SPEEDS = [0.75, 1, 1.25, 1.5];
export const textScale = (t: TextSize | undefined) => TEXT_SIZES.find((x) => x.id === t)?.scale ?? 1;

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
  mosque: null,
  prayerAlerts: { fajr: 10, dhuhr: 10, asr: 10, maghrib: 10, isha: 10 },
  jumuah: 0,
  mushafPage: null,
  speed: 1,
  textSize: 'medium',
  tasbeeh: { phrase: 'subhanallah', count: 0, target: 33, set: false, day: '', today: 0, total: 0 },
  autoScroll: 'off',
  feedHide: [],
  explained: [],
  look: 'bold',
  journey: null,
  journeySkipped: false,
  dailyGoal: 0,
  prayer: { method: 'MoonsightingCommittee', asr: 'standard', loc: null, alerts: { fajr: false, dhuhr: false, asr: false, maghrib: false, isha: false } },
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
/** For code that may run outside the provider (the theme): null there. */
export const usePrefsMaybe = () => useContext(Ctx);

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
