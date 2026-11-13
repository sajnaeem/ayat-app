import AsyncStorage from '@react-native-async-storage/async-storage';
import { juzStart } from '@/data/mushaf';
import { SURAHS } from './quran';
import { SITE } from './site';
import { supabase } from './supabase';

/**
 * Read together: a family or group shares one khatm (the whole Quran, 30 juz).
 * Each juz is claimed by a member, or by a name for someone reading from their own mushaf.
 * When a member reads their juz in Munib (Quran tab or page view), progress fills in by itself:
 * which ayat they've read, and how far they've got. See supabase/013_together.sql.
 */

export type PartStatus = 'open' | 'reading' | 'done';
export type Part = {
  juz: number;
  reader: string | null;
  handle: string | null;
  name: string | null;
  by: string | null;
  status: PartStatus;
  upto: string | null;
  pct: number;
  updated_at: string;
  done_at: string | null;
};
export type Khatm = {
  id: string;
  code: string;
  title: string;
  intention: string | null;
  round: number;
  rounds_done: number;
  finish_by: string | null;
  completed_at: string | null;
  created_at: string;
  creator: string | null;
  members: { id: string; handle: string | null }[];
  parts: Part[];
};
export type MyPart = { juz: number; status: PartStatus; upto: string | null; pct: number };
export type KhatmSummary = { id: string; title: string; round: number; completed_at: string | null; members: number; done: number; mine: MyPart[] };
export type Preview = { id: string; title: string; intention: string | null; round: number; members: number; done: number; open: number; member: boolean };

export const inviteLink = (code: string) => `${SITE}/k/${code}`;

/* ---------- where each juz starts and ends ---------- */

// Ayat before each surah, so any ayah has a place in the whole Quran (0–6235).
const BEFORE: number[] = [];
SURAHS.reduce((n, s, i) => ((BEFORE[i] = n), n + s[3]), 0);
export const ayahIndex = (s: number, a: number) => BEFORE[s - 1] + a - 1;
const keyAt = (i: number) => {
  let s = 1;
  while (s < 114 && BEFORE[s] <= i) s++;
  return `${s}:${i - BEFORE[s - 1] + 1}`;
};

/** First and last ayah index of a juz (inclusive). */
export function juzRange(j: number): [number, number] {
  const [s, a] = juzStart(j);
  const first = ayahIndex(s, a);
  const last = j === 30 ? 6235 : ayahIndex(...juzStart(j + 1)) - 1;
  return [first, last];
}
export const juzSize = (j: number) => {
  const [f, l] = juzRange(j);
  return l - f + 1;
};
export const juzFirstKey = (j: number) => keyAt(juzRange(j)[0]);
export const juzLastKey = (j: number) => keyAt(juzRange(j)[1]);
/** Where to pick up a juz: the ayah after the furthest one read, or its first ayah. */
export function resumeAt(j: number, upto: string | null): [number, number] {
  const [f, l] = juzRange(j);
  if (!upto) return keyAt(f).split(':').map(Number) as [number, number];
  const [s, a] = upto.split(':').map(Number);
  const i = Math.min(l, Math.max(f, ayahIndex(s, a) + 1));
  return keyAt(i).split(':').map(Number) as [number, number];
}
/** "Al-Baqarah 2:141", for showing where someone has read up to. */
export function placeLabel(key: string) {
  const [s, a] = key.split(':').map(Number);
  return `${SURAHS[s - 1][0]} ${s}:${a}`;
}
/** "Al-Fatihah 1:1 to Al-Baqarah 2:141" */
export function juzSpan(j: number) {
  const [fs] = juzFirstKey(j).split(':').map(Number);
  const [ls] = juzLastKey(j).split(':').map(Number);
  return fs === ls ? `${SURAHS[fs - 1][0]} ${juzFirstKey(j)} to ${juzLastKey(j).split(':')[1]}` : `${placeLabel(juzFirstKey(j))} to ${placeLabel(juzLastKey(j))}`;
}

/* ---------- server ---------- */

const errorText = (e: unknown) => String((e as { message?: string })?.message ?? e);

async function rpc<T>(fn: string, args: Record<string, unknown> = {}): Promise<T> {
  if (!supabase) throw new Error('offline');
  const { data, error } = await supabase.rpc(fn, args);
  if (error) throw new Error(errorText(error));
  return data as T;
}

export const myKhatms = () => rpc<KhatmSummary[]>('my_khatms').then((d) => d ?? []);
export const khatmDetail = (id: string) => rpc<Khatm | null>('khatm_detail', { k: id });
export const createKhatm = (title: string, intention: string, finishBy: string | null) =>
  rpc<{ id: string; code: string }>('create_khatm', { p_title: title, p_intention: intention || null, p_finish_by: finishBy });
export const previewKhatm = (code: string) => rpc<Preview | null>('khatm_preview', { p_code: code });
export const joinKhatm = (code: string) => rpc<string>('join_khatm', { p_code: code });
export const leaveKhatm = (id: string) => rpc<void>('leave_khatm', { k: id });
export const deleteKhatm = (id: string) => rpc<void>('delete_khatm', { k: id });
export const claimJuz = (id: string, j: number, name?: string) => rpc<void>('claim_juz', { k: id, j, p_name: name ?? null });
export const releaseJuz = (id: string, j: number) => rpc<void>('release_juz', { k: id, j });
export const finishJuz = (id: string, j: number, done = true) => rpc<void>('finish_juz', { k: id, j, p_done: done });
export const newRound = (id: string) => rpc<void>('new_khatm_round', { k: id });

/* ---------- tracking what I read ---------- */

/**
 * The juz I'm reading in each khatm, kept on the phone so progress is noted even offline,
 * plus the ayat I've read in each (so jumping around still counts each ayah once).
 */
type Tracked = { khatm: string; title: string; round: number; juz: number; read: number[] };
const KEY = 'munib.together.v1';
let tracked: Tracked[] = [];
let loaded: Promise<void> | null = null;
const pending = new Map<string, Tracked>();
let flushTimer: ReturnType<typeof setTimeout> | null = null;

const load = () =>
  (loaded ??= AsyncStorage.getItem(KEY)
    .then((raw) => {
      if (raw) tracked = JSON.parse(raw);
    })
    .catch(() => {}));
const save = () => AsyncStorage.setItem(KEY, JSON.stringify(tracked)).catch(() => {});
const id = (t: { khatm: string; round: number; juz: number }) => `${t.khatm}#${t.round}#${t.juz}`;

/** Brings the list of juz I'm reading up to date with the server (keeps what's been read on this phone). */
export async function syncMyParts(list?: KhatmSummary[]) {
  await load();
  const all = list ?? (await myKhatms().catch(() => null));
  if (!all) return;
  const next: Tracked[] = [];
  for (const k of all) {
    for (const p of k.mine) {
      if (p.status !== 'reading') continue;
      const old = tracked.find((t) => t.khatm === k.id && t.round === k.round && t.juz === p.juz);
      next.push({ khatm: k.id, title: k.title, round: k.round, juz: p.juz, read: old?.read ?? [] });
    }
  }
  tracked = next;
  save();
}

/** Starts tracking a juz straight after claiming it, without waiting for the server. */
export async function trackPart(khatm: string, title: string, round: number, juz: number) {
  await load();
  if (!tracked.some((t) => t.khatm === khatm && t.round === round && t.juz === juz)) {
    tracked.push({ khatm, title, round, juz, read: [] });
    save();
  }
}
export async function untrackPart(khatm: string, juz: number) {
  await load();
  tracked = tracked.filter((t) => !(t.khatm === khatm && t.juz === juz));
  save();
}

export type ReadEvent = { finished: { khatm: string; title: string; juz: number }[] };

/**
 * Called whenever ayat are read in order (Quran tab cards or page view).
 * Updates progress for any juz I'm reading that these ayat fall in. When the last ayah of a juz
 * is read and nearly all of it has been, the juz is marked finished.
 */
export async function noteQuranRead(keys: string[]): Promise<ReadEvent> {
  await load();
  const ev: ReadEvent = { finished: [] };
  if (!tracked.length || !keys.length) return ev;
  const idx = keys.map((k) => {
    const [s, a] = k.split(':').map(Number);
    return ayahIndex(s, a);
  });
  let changed = false;
  for (const t of [...tracked]) {
    const [f, l] = juzRange(t.juz);
    const mine = idx.filter((i) => i >= f && i <= l);
    if (!mine.length) continue;
    const set = new Set(t.read);
    mine.forEach((i) => set.add(i));
    if (set.size === t.read.length) continue;
    t.read = [...set].sort((a, b) => a - b);
    changed = true;
    const size = l - f + 1;
    if (set.has(l) && set.size >= size * 0.9) {
      tracked = tracked.filter((x) => x !== t);
      pending.delete(id(t));
      ev.finished.push({ khatm: t.khatm, title: t.title, juz: t.juz });
      finishJuz(t.khatm, t.juz).catch(() => {});
    } else pending.set(id(t), t);
  }
  if (changed) {
    save();
    if (!flushTimer) flushTimer = setTimeout(flush, 8000);
  }
  return ev;
}

/** Sends progress to the group, at most every few seconds. */
async function flush() {
  flushTimer = null;
  const list = [...pending.values()];
  pending.clear();
  for (const t of list) {
    const [f, l] = juzRange(t.juz);
    const furthest = t.read[t.read.length - 1];
    const pct = Math.min(99, Math.floor((t.read.length / (l - f + 1)) * 100));
    if (furthest == null || pct < 1) continue;
    await rpc('juz_progress', { k: t.khatm, j: t.juz, p_upto: keyAt(furthest), p_pct: pct }).catch(() => pending.set(id(t), t));
  }
}

/** The juz I'm reading that contains this ayah, if any (for the "Reading for…" note in page view). */
export async function trackedFor(s: number, a: number): Promise<Tracked | null> {
  await load();
  const i = ayahIndex(s, a);
  return tracked.find((t) => {
    const [f, l] = juzRange(t.juz);
    return i >= f && i <= l;
  }) ?? null;
}

/** Ayat read on this phone towards a juz (0–100), for showing progress before the server catches up. */
export function localPct(khatm: string, juz: number): number | null {
  const t = tracked.find((x) => x.khatm === khatm && x.juz === juz);
  if (!t) return null;
  return Math.min(99, Math.floor((t.read.length / juzSize(juz)) * 100));
}
