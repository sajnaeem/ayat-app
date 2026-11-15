import { localDate } from './circles';
import { calcDay, type PrayerSettings } from './prayertimes';

/**
 * Ramadan companion (Saj, 15 Nov 2026): where we are in Ramadan, worked out on the phone from the Umm al-Qura
 * calendar (Intl), with the reader's own one-day adjustment for local moon sighting.
 *
 * Days and nights: an Islamic day begins at sunset, so night N comes BEFORE fasting day N (taraweeh on night 1 is the
 * evening before the first fast, and the last ten nights begin on the evening of day 20).
 */
export type RamadanNow = {
  phase: 'before' | 'during' | 'eid' | 'after';
  /** The first fast, as the reader's local date (2027-02-08), after their adjustment. */
  start: string;
  /** Hijri year of that Ramadan (the fasting log is kept per year). */
  year: string;
  /** Days in the month by the calendar (29 or 30). */
  length: number;
  /** Whole days until the first fast (before), else 0. */
  daysTo: number;
  /** Today's fast, 1–30 (during). */
  day: number;
  /** The night we are in, or tonight's if it is daytime (1–30); 0 when it doesn't apply. */
  night: number;
  /** Day of Eid, 1–3 (eid). */
  eidDay: number;
};

const hijri = (d: Date): { y: string; m: number; day: number } | null => {
  try {
    const parts = new Intl.DateTimeFormat('en-u-ca-islamic-umalqura', { day: 'numeric', month: 'numeric', year: 'numeric' }).formatToParts(d);
    const get = (t: string) => parts.find((p) => p.type === t)?.value ?? '';
    const m = Number(get('month')), day = Number(get('day'));
    return m && day ? { y: get('year').replace(/\D/g, ''), m, day } : null;
  } catch {
    return null;
  }
};

const noon = (d: Date, plus = 0) => new Date(d.getFullYear(), d.getMonth(), d.getDate() + plus, 12);
const parse = (date: string) => {
  const [y, m, d] = date.split('-').map(Number);
  return new Date(y, m - 1, d, 12);
};
const daysBetween = (a: Date, b: Date) => Math.round((noon(b).getTime() - noon(a).getTime()) / 86400000);

/** 1 Ramadan on or after a date, by the calendar: [date, hijri year, days in the month]. */
function firstOfRamadan(from: Date): [Date, string, number] | null {
  const d = noon(from);
  for (let i = 0; i < 400; i++) {
    const h = hijri(d);
    if (!h) return null;
    if (h.m === 9 && h.day === 1) return [new Date(d), h.y, hijri(noon(d, 29))?.m === 9 ? 30 : 29];
    d.setDate(d.getDate() + 1);
  }
  return null;
}

/** For checking each state on the web: ?ramadan=12 (day 12), ?ramadan=-20 (20 days before), ?ramadan=31 (Eid). Never set on a phone. */
const forced = (): number | null => {
  const m = typeof window !== 'undefined' && typeof window.location?.search === 'string' ? /[?&]ramadan=(-?\d+)/.exec(window.location.search) : null;
  return m ? Number(m[1]) : null;
};

export function ramadanNow(shift: number, prayer?: PrayerSettings | null, now = new Date()): RamadanNow {
  const f = forced();
  // The Ramadan that began in the last 40 days, if there is one; otherwise the next.
  let found = firstOfRamadan(noon(now, -40 - shift));
  let startDate = found ? noon(found[0], shift) : new Date(2027, 1, 8, 12);
  let length = found?.[2] ?? 30;
  if (f !== null) startDate = noon(now, 1 - f); // pretend today is day f
  let n = daysBetween(startDate, now) + 1; // today's place: 1 = first fast
  if (f === null && n > length + 3) {
    found = firstOfRamadan(noon(now, 1));
    startDate = found ? noon(found[0], shift) : startDate;
    length = found?.[2] ?? 30;
    n = daysBetween(startDate, now) + 1;
  }
  const base = { start: localDate(startDate), year: found?.[1] ?? '1448', length, daysTo: 0, day: 0, night: 0, eidDay: 0 };
  let times: { fajr: Date; maghrib: Date } | null = null;
  try {
    times = prayer?.loc ? (calcDay(prayer, now)?.times ?? null) : null;
  } catch {}
  // Before Fajr we are still in last night; from Fajr on, "tonight" is the night that starts at Maghrib.
  const beforeFajr = times ? now < times.fajr : now.getHours() < 5;
  if (n < 1) return { ...base, phase: 'before', daysTo: 1 - n, night: n === 0 && !beforeFajr ? 1 : 0 };
  if (n <= length) {
    const night = beforeFajr ? n : n + 1;
    return { ...base, phase: 'during', day: n, night: night <= length ? night : 0 };
  }
  if (n <= length + 3) return { ...base, phase: 'eid', eidDay: n - length };
  return { ...base, phase: 'after' };
}

export const ramadanStartDate = (r: RamadanNow) => parse(r.start);
/** "Sunday 7 February" */
export const longDate = (d: Date) => d.toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long' });
export const isOddNight = (night: number) => night >= 21 && night % 2 === 1;

/** A calm sleep plan around tonight's prayers: bed after taraweeh, up for suhoor, and how much is left to find in the day. */
export function sleepPlan(prayer: PrayerSettings | null | undefined, now = new Date()) {
  if (!prayer?.loc) return null;
  try {
    const today = calcDay(prayer, now), tomorrow = calcDay(prayer, noon(now, 1));
    if (!today || !tomorrow) return null;
    const bed = new Date(today.times.isha.getTime() + 105 * 60000); // Isha, taraweeh and the walk home
    const wake = new Date(tomorrow.times.fajr.getTime() - 50 * 60000); // time to eat without rushing
    const night = Math.max(0, (wake.getTime() - bed.getTime()) / 3600000);
    const back = new Date(tomorrow.times.fajr.getTime() + 25 * 60000);
    const nap = new Date(tomorrow.times.dhuhr.getTime() + 30 * 60000);
    return { bed, wake, back, nap, night, need: Math.max(0, 7 - night) };
  } catch {
    return null;
  }
}
