import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import type { Progress } from './progress';
import { LangId, SURAHS, VERSES } from './quran';

/**
 * The daily check-in.
 *
 * Everything is scheduled on the phone itself (no server): each time the app opens, we cancel what's pending and
 * schedule the next 7 days, at most one a day. If the person doesn't open Munib for a week, the 7th is a gentle
 * "we've missed you" and then nothing more until they come back. On Fridays the reminder is Surah al-Kahf.
 */

export type ReminderData = { to: 'mood' } | { to: 'surah'; s: number; a?: number };

export const REMINDER_TIMES = [
  { label: 'Morning', sub: '7:00 am', hour: 7, minute: 0 },
  { label: 'Midday', sub: '1:00 pm', hour: 13, minute: 0 },
  { label: 'Evening', sub: '7:00 pm', hour: 19, minute: 0 },
  { label: 'Before bed', sub: '10:00 pm', hour: 22, minute: 0 },
];

// Show reminders as a normal banner even if Munib happens to be open.
if (Platform.OS !== 'web') {
  Notifications.setNotificationHandler({
    handleNotification: async () => ({ shouldShowBanner: true, shouldShowList: true, shouldPlaySound: false, shouldSetBadge: false }),
  });
}

export async function hasPermission(): Promise<boolean> {
  if (Platform.OS === 'web') return false;
  const p = await Notifications.getPermissionsAsync();
  return p.granted || p.ios?.status === Notifications.IosAuthorizationStatus.PROVISIONAL;
}

/** Asks iOS for permission. iOS only shows this prompt once per install, so we only call it after the person says yes in our own prompt. */
export async function askPermission(): Promise<boolean> {
  if (Platform.OS === 'web') return false;
  if (await hasPermission()) return true;
  const p = await Notifications.requestPermissionsAsync({ ios: { allowAlert: true, allowSound: true, allowBadge: false } });
  return p.granted;
}

/** The surah the person is closest to finishing (if they've started one and have 10 or fewer ayat left). */
function nearlyDone(progress: Progress): { s: number; left: number; next: number } | null {
  const started = new Set(Object.keys(progress.ayat).map((k) => Number(k.split(':')[0])));
  let best: { s: number; left: number; next: number } | null = null;
  for (const s of started) {
    const n = SURAHS[s - 1][3];
    let left = 0;
    let next = 0;
    for (let i = 1; i <= n; i++)
      if (!progress.ayat[`${s}:${i}`]) {
        left++;
        if (!next) next = i;
      }
    if (left > 0 && left <= 10 && (!best || left < best.left)) best = { s, left, next };
  }
  return best;
}

const GENTLE = [
  "How's your heart today? There's an ayah waiting for you.",
  'A quiet minute with the Quran?',
  'Take a breath. Your next ayah is here.',
  "Whatever today's been like, there's an ayah for it.",
];

function messageFor(day: number, lang: LangId, progress: Progress): { title: string; body: string; data: ReminderData } {
  const kind = day % 3;
  if (kind === 1) {
    // A real ayah, in their language, so the notification itself gives something.
    const short = VERSES.filter((v) => (v.tr[lang] ?? v.tr.en ?? []).join(' ').length < 120);
    const v = short[(day * 7) % short.length];
    const text = (v.tr[lang] ?? v.tr.en ?? []).join(' ');
    return { title: `${v.name} ${v.k.replace('-', '–')}`, body: `“${text}”`, data: { to: 'surah', s: v.s, a: v.a } };
  }
  if (kind === 2 && day % 6 === 2) {
    const nd = nearlyDone(progress);
    if (nd) {
      const name = SURAHS[nd.s - 1][0];
      return {
        title: 'So close',
        body: nd.left === 1 ? `One ayah left to finish ${name}.` : `You're ${nd.left} ayat from finishing ${name}.`,
        data: { to: 'surah', s: nd.s, a: nd.next },
      };
    }
  }
  return { title: 'Munib', body: GENTLE[day % GENTLE.length], data: { to: 'mood' } };
}

/** Cancels pending reminders and schedules the next week's. Safe to call every time the app opens. */
export async function scheduleReminders(opts: { on: boolean; hour: number; minute: number; friday: boolean; lang: LangId; progress: Progress }) {
  if (Platform.OS === 'web') return;
  await Notifications.cancelAllScheduledNotificationsAsync();
  if (!opts.on || !(await hasPermission())) return;

  const now = new Date();
  for (let d = 0; d < 7; d++) {
    const at = new Date(now.getFullYear(), now.getMonth(), now.getDate() + d, opts.hour, opts.minute, 0);
    if (at.getTime() <= now.getTime() + 60_000) continue; // today's time has passed
    let content: { title: string; body: string; data: ReminderData };
    if (d === 6) content = { title: "We've missed you", body: 'Your next ayah is here whenever you are ready.', data: { to: 'mood' } };
    else if (opts.friday && at.getDay() === 5) content = { title: "It's Jumuʿah", body: 'Read Surah al-Kahf today?', data: { to: 'surah', s: 18, a: 1 } };
    else content = messageFor(at.getDate() + at.getMonth() * 31, opts.lang, opts.progress);
    await Notifications.scheduleNotificationAsync({
      content: { title: content.title, body: content.body, data: content.data as unknown as Record<string, unknown> },
      trigger: { type: Notifications.SchedulableTriggerInputTypes.DATE, date: at },
    });
  }
}
