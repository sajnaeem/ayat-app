import { VERSES, type Verse } from './quran';
import { SITE } from './site';
import { supabase } from './supabase';

/**
 * Circles (Saj, 15 Nov 2026): small private groups in the Together tab, for a family or a few friends.
 *  - family: one shared ayah a day; the circle sees how many have read it today (a count, never who), and members
 *    can send each other a salaam.
 *  - ramadan: everyone reads the Quran through Ramadan, a juz a day; members tick the juz they've read, and the circle
 *    sees how many have read today's juz and the circle's total.
 * No streaks and no "who hasn't read": the server only ever gives counts and the reader's own ticks (supabase/019_circles.sql).
 */
export type CircleKind = 'family' | 'ramadan';
export type CircleSummary = { id: string; kind: CircleKind; title: string; starts: string | null; today: number | null; members: number; read_today: number; i_read: boolean; my_count: number; salaams: number };
export type Circle = {
  id: string;
  code: string;
  kind: CircleKind;
  title: string;
  starts: string | null;
  creator: string | null;
  /** Today's mark: the day number (family) or today's juz (ramadan; null before and after Ramadan). */
  today: number | null;
  members: { id: string; handle: string | null }[];
  read_today: number;
  total: number;
  mine: number[];
  /** Salaams sent to me that I haven't seen yet. */
  salaams: { from: string; handle: string | null }[];
  /** People I've sent a salaam to today. */
  sent: string[];
};
export type CirclePreview = { id: string; kind: CircleKind; title: string; starts: string | null; members: number; member: boolean };

const two = (n: number) => String(n).padStart(2, '0');
/** The reader's own date, 2027-02-14 (not UTC: a day starts at their midnight). */
export const localDate = (d = new Date()) => `${d.getFullYear()}-${two(d.getMonth() + 1)}-${two(d.getDate())}`;
export const circleLink = (code: string) => `${SITE}/c/${code}`;

const db = () => {
  if (!supabase) throw new Error('offline');
  return supabase;
};
const rpc = async <T>(fn: string, args?: Record<string, unknown>): Promise<T> => {
  const { data, error } = await db().rpc(fn, args);
  if (error) throw new Error(error.message);
  return data as T;
};

export const myCircles = async () => (await rpc<CircleSummary[] | null>('my_circles', { p_date: localDate() })) ?? [];
export const circleDetail = (id: string) => rpc<Circle | null>('circle_detail', { c: id, p_date: localDate() });
export const createCircle = (kind: CircleKind, title: string, starts?: string) => rpc<{ id: string; code: string }>('create_circle', { p_kind: kind, p_title: title, p_starts: starts ?? null });
export const previewCircle = (code: string) => rpc<CirclePreview | null>('circle_preview', { p_code: code });
export const joinCircle = (code: string) => rpc<string>('join_circle', { p_code: code });
export const leaveCircle = (id: string) => rpc<void>('leave_circle', { c: id });
export const deleteCircle = (id: string) => rpc<void>('delete_circle', { c: id });
export const setCircleStart = (id: string, starts: string) => rpc<void>('set_circle_start', { c: id, p_starts: starts });
export const markCircle = (id: string, k: number, on = true) => rpc<void>('mark_circle', { c: id, p_k: k, p_on: on });
export const sendSalaam = (id: string, to: string) => rpc<void>('send_salaam', { c: id, p_to: to });
export const seenSalaams = (id: string) => rpc<void>('seen_salaams', { c: id });

const hijri = (d: Date): { m: number; day: number } | null => {
  try {
    const parts = new Intl.DateTimeFormat('en-u-ca-islamic-umalqura', { day: 'numeric', month: 'numeric' }).formatToParts(d);
    const m = Number(parts.find((p) => p.type === 'month')?.value);
    const day = Number(parts.find((p) => p.type === 'day')?.value);
    return m && day ? { m, day } : null;
  } catch {
    return null;
  }
};

/**
 * The first day of this Ramadan (if we're in it) or the next one, by the Umm al-Qura calendar. Local moon sighting
 * can differ by a day, so a circle's creator can move it.
 */
export function ramadanStart(now = new Date()): string {
  const d = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 29, 12);
  for (let i = 0; i < 430; i++) {
    const h = hijri(d);
    if (!h) break;
    if (h.m === 9 && h.day === 1) return localDate(d);
    d.setDate(d.getDate() + 1);
  }
  return '2027-02-08';
}

/** Whole days from the reader's today until a date (negative once it has passed). */
export function daysUntil(date: string, now = new Date()): number {
  const [y, m, d] = date.split('-').map(Number);
  return Math.round((new Date(y, m - 1, d, 12).getTime() - new Date(now.getFullYear(), now.getMonth(), now.getDate(), 12).getTime()) / 86400000);
}

export const shiftDate = (date: string, by: number) => {
  const [y, m, d] = date.split('-').map(Number);
  return localDate(new Date(y, m - 1, d + by, 12));
};

export const niceDate = (date: string) => {
  const [y, m, d] = date.split('-').map(Number);
  return new Date(y, m - 1, d, 12).toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
};

// Short curated ayat (one or two ayat long) that stand well on their own: the pool for a circle's ayah of the day.
// Ayat picked for divorce or conflict are left out: right for someone who chose that mood, not for a family's shared ayah.
const POOL = VERSES.filter((v) => !v.gen && v.ar.length <= 2 && !!v.tr.en?.length && !v.tags.some((t) => t === 'divorce' || t === 'conflict'));

/** The circle's ayah for a day: the same for every member (worked out from the circle and the date), different between circles. */
export function familyAyah(circleId: string, today: number): Verse {
  // Walk the pool day by day from a start that depends on the circle, so ayat don't repeat until the pool is used up.
  const start = [...circleId].reduce((n, ch) => (n * 33 + ch.charCodeAt(0)) >>> 0, 7) % POOL.length;
  const y = Math.floor(today / 10000), m = Math.floor(today / 100) % 100, d = today % 100;
  const days = Math.floor(new Date(y, m - 1, d, 12).getTime() / 86400000);
  return POOL[(start + days) % POOL.length];
}
