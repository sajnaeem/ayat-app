import { dayKey, useProgress } from '@/lib/progress';
import { usePrefs } from '@/lib/store';

/** The six daily deeds' progress, shared by the Daily deeds card and the ring round the Prayer tab. */
export const DEED_PRAYERS = ['fajr', 'dhuhr', 'asr', 'maghrib', 'isha'];
export const TASBEEH_GOAL = 33;
export const DEEDS_TOTAL = 6;

export function useDeeds() {
  const prefs = usePrefs();
  const { progress } = useProgress();
  const now = new Date();
  const key = dayKey(now);
  const done = prefs.today?.day === key ? prefs.today.done : [];
  const goal = prefs.dailyGoal || 10;
  const read = progress.days[key] ?? 0;
  const tasbeeh = prefs.tasbeeh.day === now.toISOString().slice(0, 10) ? prefs.tasbeeh.today : 0;
  const prayed = DEED_PRAYERS.filter((p) => done.includes(p)).length;
  const count =
    (prayed === 5 ? 1 : 0) + (read >= goal ? 1 : 0) + (tasbeeh >= TASBEEH_GOAL ? 1 : 0) + ['selfdua', 'dua', 'extra'].filter((id) => done.includes(id)).length;
  return { count, total: DEEDS_TOTAL, prayed, read, goal, tasbeeh, all: count === DEEDS_TOTAL };
}
