import AsyncStorage from '@react-native-async-storage/async-storage';
import Constants from 'expo-constants';
import { usePathname } from 'expo-router';
import { useEffect, useRef } from 'react';
import { AppState, Platform } from 'react-native';
import { supabase } from './supabase';
import { usePrefs } from './store';

/**
 * Anonymous usage stats (Saj, 14 Nov 2026). The phone keeps a small tally for each day (features opened, ayat read,
 * minutes in the app) and sends finished days to log_usage() (supabase/018_usage.sql) with no user id, device id or
 * location: only the week Munib was installed (for retention), the country from the phone's region setting,
 * platform and app version. Off with You → Privacy → Anonymous usage stats (prefs.shareUsage).
 * Journey answers go along once (and again if they change) only with "Share anonymous insights" on (prefs.shareInsights).
 */

const KEY = 'munib.usage.v1';
type Day = { features: string[]; ayat: number; seconds: number };
type Store = { installed: string; days: Record<string, Day>; journeySent?: string };

const today = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};
const monday = (iso: string) => {
  const d = new Date(iso + 'T12:00:00');
  d.setDate(d.getDate() - ((d.getDay() + 6) % 7));
  return d.toISOString().slice(0, 10);
};
const daysBetween = (a: string, b: string) => Math.round((Date.parse(b + 'T12:00:00') - Date.parse(a + 'T12:00:00')) / 86400000);

let store: Store | null = null;
let loading: Promise<Store> | null = null;
let enabled = true;
const load = () =>
  (loading ??= AsyncStorage.getItem(KEY)
    .then((s) => (s ? (JSON.parse(s) as Store) : null))
    .catch(() => null)
    .then((s) => (store = s ?? { installed: today(), days: {} })));
let saveTimer: ReturnType<typeof setTimeout> | null = null;
const save = () => {
  if (saveTimer) return;
  saveTimer = setTimeout(() => {
    saveTimer = null;
    if (store) AsyncStorage.setItem(KEY, JSON.stringify(store)).catch(() => {});
  }, 2000);
};
const todayRow = (s: Store) => (s.days[today()] ??= { features: [], ayat: 0, seconds: 0 });

/** Note that a feature was used today (a short name like "qibla"). */
export function track(feature: string) {
  if (!enabled) return;
  load().then((s) => {
    const d = todayRow(s);
    if (!d.features.includes(feature)) {
      d.features.push(feature);
      save();
    }
  });
}
/** Ayat read today (called with every reading, alongside the ummah counter). */
export function trackAyat(n: number) {
  if (!enabled || n <= 0) return;
  load().then((s) => {
    todayRow(s).ayat += n;
    save();
  });
}
function addSeconds(n: number) {
  if (!enabled || n <= 0) return;
  load().then((s) => {
    todayRow(s).seconds += Math.min(n, 4 * 3600);
    save();
  });
}

// Screens → feature names. Anything not listed is still counted under its first path segment.
const ROUTES: [RegExp, string][] = [
  [/^\/$/, 'feed'], [/^\/quran$/, 'quran_tab'], [/^\/prayer$/, 'prayer_tab'], [/^\/together$/, 'together_tab'], [/^\/you$/, 'you_tab'],
  [/^\/pray\/learn/, 'pray_learn'], [/^\/pray\/(fajr|dhuhr|asr|maghrib|isha)/, 'pray_along'], [/^\/pray$/, 'pray'],
  [/^\/learn\/\d+/, 'learn_surah'], [/^\/stories\/./, 'story'], [/^\/together\/./, 'khatm'], [/^\/profile\//, 'profile'],
  [/^\/k\//, 'khatm_invite'], [/^\/\d+\/\d+/, 'shared_link'],
];
function featureOf(path: string) {
  for (const [re, name] of ROUTES) if (re.test(path)) return name;
  const seg = path.split('/')[1] ?? '';
  return seg.replace(/[^a-z]/gi, '_').toLowerCase().slice(0, 24) || null;
}

const region = () => {
  try {
    const loc = Intl.DateTimeFormat().resolvedOptions().locale;
    const m = /-([A-Z]{2})\b/.exec(loc);
    return m ? m[1] : null;
  } catch {
    return null;
  }
};

/** Send finished days (up to the last 7). */
async function flush(journey: Record<string, string> | null) {
  if (!supabase || !enabled) return;
  const s = await load();
  const now = today();
  const done = Object.keys(s.days).filter((d) => d < now).sort().slice(-7);
  const old = Object.keys(s.days).filter((d) => d < now && !done.includes(d));
  old.forEach((d) => delete s.days[d]);
  if (!done.length) return save();
  const jKey = journey ? JSON.stringify(journey) : null;
  const sendJourney = !!jKey && jKey !== s.journeySent;
  const rows = done.map((d, i) => ({
    day: d,
    cohort: monday(s.installed),
    age: Math.max(0, daysBetween(s.installed, d)),
    country: region(),
    platform: Platform.OS === 'ios' || Platform.OS === 'android' ? Platform.OS : 'web',
    version: Constants.expoConfig?.version ?? null,
    features: s.days[d].features.slice(0, 40),
    ayat: s.days[d].ayat,
    minutes: Math.round(s.days[d].seconds / 60),
    journey: sendJourney && i === done.length - 1 ? journey : undefined,
  }));
  const { error } = await supabase.rpc('log_usage', { rows });
  if (error) return;
  done.forEach((d) => delete s.days[d]);
  if (sendJourney) s.journeySent = jKey!;
  save();
}

/** In _layout: counts screens and time in the app, and sends finished days when Munib opens. */
export function useUsage() {
  const prefs = usePrefs();
  const path = usePathname();
  enabled = prefs.shareUsage !== false;
  const j = prefs.journey;
  const journey =
    prefs.shareInsights && j
      ? (Object.fromEntries([
          ['journey', j.journey],
          ['arabic', j.arabic],
          ['reading', j.reading],
          ['minutes', String(j.minutes)],
          ...j.goals.map((g) => [`goal_${g}`.slice(0, 24), 'yes']),
        ]) as Record<string, string>)
      : null;
  const jRef = useRef(journey);
  jRef.current = journey;

  useEffect(() => {
    if (!enabled) {
      // Turning it off forgets anything not yet sent.
      AsyncStorage.removeItem(KEY).catch(() => {});
      store = null;
      loading = null;
    }
  }, [prefs.shareUsage]);

  useEffect(() => {
    const f = featureOf(path);
    if (f) track(f);
  }, [path]);

  useEffect(() => {
    let since = Date.now();
    flush(jRef.current);
    const sub = AppState.addEventListener('change', (st) => {
      if (st === 'active') {
        since = Date.now();
        flush(jRef.current);
      } else {
        addSeconds((Date.now() - since) / 1000);
      }
    });
    const t = setInterval(() => {
      if (AppState.currentState === 'active') {
        addSeconds((Date.now() - since) / 1000);
        since = Date.now();
      }
    }, 60000);
    return () => {
      sub.remove();
      clearInterval(t);
    };
  }, []);

  // Send journey answers soon after someone opts in.
  useEffect(() => {
    if (prefs.shareInsights) flush(jRef.current);
  }, [prefs.shareInsights]);
}
