import * as Notifications from 'expo-notifications';
import { CalculationMethod, CalculationParameters, Coordinates, Madhab, PrayerTimes, SunnahTimes } from 'adhan';
import { Platform } from 'react-native';
import { cancelWhere, hasPermission } from './reminders';
import type { Prefs } from './store';

/**
 * General prayer times, worked out on the phone from where you are (the open-source adhan library,
 * the same astronomy most prayer apps use). Nothing is sent anywhere.
 * Alerts use identifiers starting "prayer-calc-"; mosque alerts use other "prayer-" ids.
 */

export type PrayerSettings = Prefs['prayer'];
export type CalcId = 'fajr' | 'sunrise' | 'dhuhr' | 'asr' | 'maghrib' | 'isha';
export const CALC_ROWS: { id: CalcId; name: string; ar: string }[] = [
  { id: 'fajr', name: 'Fajr', ar: 'الفجر' },
  { id: 'sunrise', name: 'Sunrise', ar: 'الشروق' },
  { id: 'dhuhr', name: 'Dhuhr', ar: 'الظهر' },
  { id: 'asr', name: 'Asr', ar: 'العصر' },
  { id: 'maghrib', name: 'Maghrib', ar: 'المغرب' },
  { id: 'isha', name: 'Isha', ar: 'العشاء' },
];

export const METHODS: { id: string; name: string; note: string }[] = [
  { id: 'MoonsightingCommittee', name: 'Moonsighting Committee', note: 'Widely used in the UK; adjusts for long summer days' },
  { id: 'MuslimWorldLeague', name: 'Muslim World League', note: 'Europe, the Far East, parts of the US' },
  { id: 'NorthAmerica', name: 'ISNA', note: 'North America' },
  { id: 'Karachi', name: 'University of Islamic Sciences, Karachi', note: 'Pakistan, Bangladesh, India, Afghanistan' },
  { id: 'Egyptian', name: 'Egyptian General Authority', note: 'Africa, Syria, Lebanon, Malaysia' },
  { id: 'UmmAlQura', name: 'Umm al-Qura, Makkah', note: 'Saudi Arabia' },
  { id: 'Dubai', name: 'Dubai', note: 'United Arab Emirates' },
  { id: 'Qatar', name: 'Qatar', note: 'Qatar' },
  { id: 'Kuwait', name: 'Kuwait', note: 'Kuwait' },
  { id: 'Singapore', name: 'Singapore', note: 'Singapore, Malaysia, Indonesia' },
  { id: 'Turkey', name: 'Diyanet', note: 'Türkiye' },
];

function params(s: PrayerSettings): CalculationParameters {
  const make = (CalculationMethod as unknown as Record<string, () => CalculationParameters>)[s.method] ?? CalculationMethod.MoonsightingCommittee;
  const p = make();
  p.madhab = s.asr === 'hanafi' ? Madhab.Hanafi : Madhab.Shafi;
  return p;
}

export type CalcDay = { date: Date; times: Record<CalcId, Date>; lastThird: Date };

/** The day's times for a date (local calendar day on the phone). */
export function calcDay(s: PrayerSettings, date = new Date()): CalcDay | null {
  if (!s.loc) return null;
  const d = new Date(date.getFullYear(), date.getMonth(), date.getDate(), 12);
  const pt = new PrayerTimes(new Coordinates(s.loc.lat, s.loc.lon), d, params(s));
  const times = { fajr: pt.fajr, sunrise: pt.sunrise, dhuhr: pt.dhuhr, asr: pt.asr, maghrib: pt.maghrib, isha: pt.isha };
  return { date: d, times, lastThird: new SunnahTimes(pt).lastThirdOfTheNight };
}

/** The next prayer from now (skipping sunrise), looking into tomorrow after Isha. */
export function nextPrayer(s: PrayerSettings, now = new Date()): { id: CalcId; name: string; at: Date } | null {
  for (const offset of [0, 1]) {
    const day = calcDay(s, new Date(now.getTime() + offset * 86400000));
    if (!day) return null;
    for (const r of CALC_ROWS) if (r.id !== 'sunrise' && day.times[r.id] > now) return { id: r.id, name: r.name, at: day.times[r.id] };
  }
  return null;
}

/** "4:27 pm" */
export const hm = (d: Date) => {
  const h = d.getHours();
  return `${((h + 11) % 12) + 1}:${String(d.getMinutes()).padStart(2, '0')} ${h < 12 ? 'am' : 'pm'}`;
};
/** "1 h 12 min" */
export function until(ms: number) {
  const m = Math.max(0, Math.round(ms / 60000));
  return m >= 60 ? `${Math.floor(m / 60)} h ${m % 60} min` : `${m} min`;
}

/** Rounds a position to about 1 km before keeping it: plenty for prayer times. */
export const roughly = (lat: number, lon: number) => ({ lat: Math.round(lat * 100) / 100, lon: Math.round(lon * 100) / 100 });

/**
 * Plans start-time alerts for the next few days (iOS keeps at most 64 waiting notifications, and mosque alerts
 * and the daily check-in share them, so fewer days when a mosque is set). Safe to call whenever Munib opens.
 */
export async function schedulePrayerCalcAlerts(s: PrayerSettings, hasMosque: boolean) {
  if (Platform.OS === 'web') return;
  await cancelWhere((id) => id.startsWith('prayer-calc-'));
  const on = (Object.keys(s.alerts) as (keyof PrayerSettings['alerts'])[]).filter((k) => s.alerts[k]);
  if (!s.loc || !on.length || !(await hasPermission())) return;
  const budget = hasMosque ? 15 : 40;
  const days = Math.max(1, Math.min(7, Math.floor(budget / on.length)));
  const now = Date.now() + 60_000;
  for (let i = 0; i < days; i++) {
    const day = calcDay(s, new Date(Date.now() + i * 86400000));
    if (!day) return;
    for (const id of on) {
      const when = day.times[id];
      if (when.getTime() <= now) continue;
      const name = CALC_ROWS.find((r) => r.id === id)!.name;
      const friday = id === 'dhuhr' && when.getDay() === 5;
      await Notifications.scheduleNotificationAsync({
        identifier: `prayer-calc-${day.date.toISOString().slice(0, 10)}-${id}`,
        content: { title: friday ? 'It’s time for Jumuʿah' : `It’s time for ${name}`, body: `${name} begins at ${hm(when)}.`, data: { to: 'prayertimes' }, sound: 'default' },
        trigger: { type: Notifications.SchedulableTriggerInputTypes.DATE, date: when },
      });
    }
  }
}
