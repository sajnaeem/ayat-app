import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import { cancelWhere, hasPermission } from './reminders';
import { supabase } from './supabase';

/**
 * My mosque: prayer times read from a mosque's own website (by the edge function "mosque", shared by everyone who
 * follows that mosque), and alerts before each jama'ah, scheduled on this phone.
 *
 * iPhones keep at most 64 scheduled notifications per app, so we plan the next 9 days (up to 45 alerts, leaving room
 * for the daily check-in) and top them up every time Munib opens. If someone doesn't open Munib for over a week, a last
 * alert asks them to open it so their prayer alerts carry on.
 */

export type PrayerId = 'fajr' | 'dhuhr' | 'asr' | 'maghrib' | 'isha';
export const PRAYERS: { id: PrayerId; name: string }[] = [
  { id: 'fajr', name: 'Fajr' },
  { id: 'dhuhr', name: 'Dhuhr' },
  { id: 'asr', name: 'Asr' },
  { id: 'maghrib', name: 'Maghrib' },
  { id: 'isha', name: 'Isha' },
];
export type MosqueDay = { day: string; sunrise: string | null } & Record<PrayerId | `${PrayerId}_j`, string | null>;
export type Mosque = { id: string; name: string; url: string; checked_at: string | null; jumuah: string[]; ok: boolean };
export type MosqueResult = { mosque: Mosque; days: MosqueDay[] } | { error: 'not_found' | 'off' | 'limit' | 'bad_url' | 'sign_in' | 'failed' };
export type Alerts = Record<PrayerId, number | null>;

/** Minutes-before choices offered for each prayer (null = off). */
export const ALERT_CHOICES: (number | null)[] = [null, 0, 5, 10, 15, 20, 30];

const CACHE = 'munib.mosque.v1';

async function call(body: object): Promise<MosqueResult> {
  if (!supabase) return { error: 'failed' };
  const { data, error } = await supabase.functions.invoke('mosque', { body });
  if (error) {
    const status = (error as { context?: { status?: number } }).context?.status;
    return { error: status === 401 ? 'sign_in' : status === 400 ? 'bad_url' : 'failed' };
  }
  if (data?.mosque) return data as MosqueResult;
  return { error: (['not_found', 'off', 'limit', 'bad_url', 'sign_in'] as const).find((e) => e === data?.error) ?? 'failed' };
}

/** Finds and reads a mosque's timetable from a web address (needs an account; can take up to a minute the first time). */
export const findMosque = (url: string) => call({ url });

/** The latest times for a mosque we follow, saved on the phone so alerts still get planned without signal. */
export async function mosqueTimes(id: string): Promise<{ mosque: Mosque; days: MosqueDay[] } | null> {
  const r = await call({ id });
  if ('mosque' in r) {
    AsyncStorage.setItem(CACHE, JSON.stringify(r)).catch(() => {});
    return r;
  }
  try {
    const saved = JSON.parse((await AsyncStorage.getItem(CACHE)) ?? 'null');
    return saved?.mosque?.id === id ? saved : null;
  } catch {
    return null;
  }
}

/** A "HH:MM" time on a "YYYY-MM-DD" day, in the phone's local time. */
function at(day: string, hhmm: string, minusMinutes = 0): Date {
  const [y, m, d] = day.split('-').map(Number);
  const [h, mi] = hhmm.split(':').map(Number);
  return new Date(y, m - 1, d, h, mi - minusMinutes, 0);
}
export const isFriday = (day: string) => at(day, '12:00').getDay() === 5;
/** "4:27 pm" */
export function clock(hhmm: string | null): string {
  if (!hhmm) return '–';
  const [h, m] = hhmm.split(':').map(Number);
  return `${((h + 11) % 12) + 1}:${String(m).padStart(2, '0')} ${h < 12 ? 'am' : 'pm'}`;
}
export const todayIso = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

/** Cancels any prayer alerts already planned and plans the next 9 days'. Safe to call whenever Munib opens. */
export async function scheduleMosqueAlerts(o: { mosque: Mosque; days: MosqueDay[]; alerts: Alerts; jumuah: number } | null) {
  if (Platform.OS === 'web') return;
  await cancelWhere((id) => id.startsWith('prayer-') && !id.startsWith('prayer-calc-'));
  if (!o || !(await hasPermission())) return;
  const now = Date.now() + 60_000;
  let planned = 0;
  let lastDay = '';
  for (const d of o.days.slice(0, 9)) {
    if (planned >= 45) break;
    for (const p of PRAYERS) {
      const before = o.alerts[p.id];
      if (before === null || before === undefined) continue;
      let name = p.name;
      let time = d[`${p.id}_j`] ?? d[p.id];
      if (p.id === 'dhuhr' && isFriday(d.day) && o.mosque.jumuah.length) {
        name = "Jumu'ah";
        time = o.mosque.jumuah[Math.min(o.jumuah, o.mosque.jumuah.length - 1)];
      }
      if (!time) continue;
      const when = at(d.day, time, before);
      if (when.getTime() <= now) continue;
      const jamaah = !!d[`${p.id}_j`] || name === "Jumu'ah";
      await Notifications.scheduleNotificationAsync({
        identifier: `prayer-${d.day}-${p.id}`,
        content: {
          title: before > 0 ? `${name} in ${before} minutes` : `${name} ${jamaah ? 'jama’ah' : 'time'} now`,
          body: `${jamaah ? 'Jama’ah' : 'It begins'} at ${clock(time)} at ${o.mosque.name}.`,
          data: { to: 'mosque' },
          sound: 'default',
        },
        trigger: { type: Notifications.SchedulableTriggerInputTypes.DATE, date: when },
      });
      planned++;
      lastDay = d.day;
    }
  }
  // If Munib isn't opened before these run out, one last nudge so the alerts don't silently stop.
  if (planned && lastDay) {
    const nudge = at(lastDay, '12:00');
    if (nudge.getTime() > now) {
      await Notifications.scheduleNotificationAsync({
        identifier: 'prayer-refresh',
        content: { title: 'Keep your prayer alerts coming', body: `Open Munib to get the next times for ${o.mosque.name}.`, data: { to: 'mosque' } },
        trigger: { type: Notifications.SchedulableTriggerInputTypes.DATE, date: nudge },
      });
    }
  }
}

/** Fetches the latest times for the mosque someone follows and re-plans their alerts. */
export async function refreshMosque(o: { id: string; alerts: Alerts; jumuah: number }) {
  const r = await mosqueTimes(o.id);
  if (r) await scheduleMosqueAlerts({ ...r, alerts: o.alerts, jumuah: o.jumuah });
}
