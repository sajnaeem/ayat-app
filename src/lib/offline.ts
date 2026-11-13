import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';
import type { ReciterId } from './audio';
import { SURAHS } from './quran';
import { supabase } from './supabase';

/**
 * Listen offline: recitations downloaded to the phone, one surah at a time.
 *
 * Quran Foundation's terms let us keep their content longer than a week only when it comes from
 * their Content Sync copy and is checked again at least every 7 days. So the file list comes from the
 * synced copy on our server (qf function { offline }), and each downloaded surah is re-checked weekly
 * when the phone is online: changed files are downloaded again, removed ones deleted.
 *
 * Files live in the app's documents folder: audio/<reciter>/<surah>/<ayah>.mp3.
 */

// expo-file-system's native code is in the app build (it ships with Expo); guard anyway so web and
// any build without it simply hide offline listening.
let FS: typeof import('expo-file-system') | null = null;
try {
  if (Platform.OS !== 'web') FS = require('expo-file-system');
} catch {
  FS = null;
}
export const offlineSupported = !!FS;

const RECITATION: Record<ReciterId, number> = { alafasy: 7, sudais: 3, husary: 6, minshawi: 9 };
const RECHECK_MS = 6 * 86400000; // a day's margin inside the 7-day rule
const KEY = 'munib.offline.v1';

type Ayah = { v: string | null; u: string; w: [number, number, number][]; b: number };
export type SurahDownload = { r: ReciterId; s: number; checked: number; ayat: Record<number, Ayah>; complete: boolean };
type Manifest = Record<string, SurahDownload>;

let manifest: Manifest = {};
let ready: Promise<void> | null = null;
const id = (r: ReciterId, s: number) => `${r}:${s}`;

function load() {
  return (ready ??= AsyncStorage.getItem(KEY)
    .then((raw) => {
      if (raw) manifest = JSON.parse(raw);
    })
    .catch(() => {}));
}
load();
let saveTimer: ReturnType<typeof setTimeout> | null = null;
function save(now = false) {
  if (saveTimer) clearTimeout(saveTimer);
  const write = () => AsyncStorage.setItem(KEY, JSON.stringify(manifest)).catch(() => {});
  if (now) write();
  else saveTimer = setTimeout(write, 800);
}

const dirFor = (r: ReciterId, s: number) => new FS!.Directory(FS!.Paths.document, 'audio', r, String(s));
const fileFor = (r: ReciterId, s: number, a: number) => new FS!.File(dirFor(r, s), `${a}.mp3`);

/** The downloaded file for an ayah, with its word timings, if it's on the phone. */
export function offlineAyah(r: ReciterId, s: number, a: number): { url: string; words: [number, number, number][] } | null {
  if (!FS) return null;
  const d = manifest[id(r, s)];
  const x = d?.ayat[a];
  if (!x) return null;
  try {
    const f = fileFor(r, s, a);
    if (!f.exists) return null;
    return { url: f.uri, words: x.w };
  } catch {
    return null;
  }
}

export const downloaded = (r: ReciterId, s: number) => manifest[id(r, s)] ?? null;
export const isComplete = (r: ReciterId, s: number) => !!manifest[id(r, s)]?.complete;
export function bytesOf(d: SurahDownload) {
  return Object.values(d.ayat).reduce((n, x) => n + (x.b || 0), 0);
}
export function usage() {
  const by: Partial<Record<ReciterId, { surahs: number; bytes: number }>> = {};
  for (const d of Object.values(manifest)) {
    const cur = (by[d.r] ??= { surahs: 0, bytes: 0 });
    if (d.complete) cur.surahs++;
    cur.bytes += bytesOf(d);
  }
  return by;
}
export const formatBytes = (b: number) => (b < 1e6 ? `${Math.max(1, Math.round(b / 1e3))} KB` : b < 1e9 ? `${(b / 1e6).toFixed(b < 1e7 ? 1 : 0)} MB` : `${(b / 1e9).toFixed(1)} GB`);

/* ---------- downloading ---------- */

type Remote = { a: number; url: string; w: [number, number, number][]; v: string | null };

async function fileList(r: ReciterId, s: number): Promise<Remote[]> {
  if (!supabase) throw new Error('offline');
  const { data, error } = await supabase.functions.invoke('qf', { body: { offline: RECITATION[r], s } });
  if (error) throw error;
  const files: Remote[] = data?.files ?? [];
  if (!files.length) throw new Error('no audio');
  return files;
}

async function pool<T>(items: T[], n: number, fn: (x: T) => Promise<void>, stop: () => boolean) {
  let i = 0;
  await Promise.all(
    Array.from({ length: Math.min(n, items.length) }, async () => {
      while (i < items.length && !stop()) await fn(items[i++]);
    }),
  );
}

/** Downloads (or refreshes) one surah. Keeps whatever finished if it's interrupted. */
async function fetchSurah(r: ReciterId, s: number, onAyah: () => void, stop: () => boolean) {
  await load();
  const files = await fileList(r, s);
  const dir = dirFor(r, s);
  dir.create({ intermediates: true, idempotent: true });
  const d: SurahDownload = (manifest[id(r, s)] ??= { r, s, checked: 0, ayat: {}, complete: false });
  d.complete = false;
  const keep = new Set(files.map((f) => f.a));
  // Ayat no longer in the reciter's list: delete them.
  for (const a of Object.keys(d.ayat).map(Number)) {
    if (!keep.has(a)) {
      delete d.ayat[a];
      try {
        fileFor(r, s, a).delete();
      } catch {}
    }
  }
  const todo = files.filter((f) => {
    const have = d.ayat[f.a];
    let exists = false;
    try {
      exists = fileFor(r, s, f.a).exists;
    } catch {}
    if (have && exists && have.v === f.v && have.u === f.url) {
      have.w = f.w; // timings may be corrected without the file changing
      return false;
    }
    return true;
  });
  let failed = 0;
  await pool(
    todo,
    4,
    async (f) => {
      try {
        const out = await FS!.File.downloadFileAsync(f.url, fileFor(r, s, f.a), { idempotent: true });
        d.ayat[f.a] = { v: f.v, u: f.url, w: f.w, b: out.size ?? 0 };
        save();
      } catch {
        failed++;
      }
      onAyah();
    },
    stop,
  );
  if (!stop() && !failed && Object.keys(d.ayat).length >= files.length) {
    d.complete = true;
    d.checked = Date.now();
  }
  save(true);
  if (failed) throw new Error('some files failed');
}

/* ---------- a simple queue, so the Downloads screen can show progress ---------- */

export type QueueState = { current: { r: ReciterId; s: number; done: number; total: number } | null; waiting: string[]; error: string | null };
let state: QueueState = { current: null, waiting: [], error: null };
const listeners = new Set<(s: QueueState) => void>();
const emit = () => listeners.forEach((l) => l({ ...state }));
export function onQueue(l: (s: QueueState) => void) {
  listeners.add(l);
  l({ ...state });
  return () => {
    listeners.delete(l);
  };
}
let queue: { r: ReciterId; s: number }[] = [];
let running = false;
let cancelled = false;

export function enqueue(r: ReciterId, surahs: number[]) {
  if (!FS) return;
  for (const s of surahs) if (!queue.some((q) => q.r === r && q.s === s) && !isComplete(r, s)) queue.push({ r, s });
  state.waiting = queue.map((q) => id(q.r, q.s));
  state.error = null;
  emit();
  run();
}
export function cancelAll() {
  queue = [];
  cancelled = true;
  state.waiting = [];
  emit();
}

async function run() {
  if (running) return;
  running = true;
  cancelled = false;
  while (queue.length) {
    const next = queue.shift()!;
    state.waiting = queue.map((q) => id(q.r, q.s));
    state.current = { r: next.r, s: next.s, done: 0, total: SURAHS[next.s - 1][3] };
    emit();
    try {
      await fetchSurah(
        next.r,
        next.s,
        () => {
          if (state.current) state.current = { ...state.current, done: state.current.done + 1 };
          emit();
        },
        () => cancelled,
      );
    } catch {
      state.error = `Couldn’t download ${SURAHS[next.s - 1][0]}. Check your connection and try again.`;
    }
    if (cancelled) break;
  }
  state.current = null;
  running = false;
  cancelled = false;
  emit();
}

export async function removeSurah(r: ReciterId, s: number) {
  await load();
  try {
    const dir = dirFor(r, s);
    if (dir.exists) dir.delete();
  } catch {}
  delete manifest[id(r, s)];
  save(true);
  emit();
}
export async function removeAll() {
  await load();
  try {
    const dir = new FS!.Directory(FS!.Paths.document, 'audio');
    if (dir.exists) dir.delete();
  } catch {}
  manifest = {};
  save(true);
  emit();
}

/**
 * The weekly check the Quran Foundation's terms ask for: any downloaded surah not checked in the
 * last 6 days is compared with the synced list and brought up to date. Runs when the app opens.
 */
export async function recheckDownloads() {
  if (!FS || running) return;
  await load();
  const due = Object.values(manifest).filter((d) => Date.now() - (d.checked || 0) > RECHECK_MS);
  for (const d of due.slice(0, 12)) {
    try {
      await fetchSurah(d.r, d.s, () => {}, () => false);
    } catch {
      break; // probably offline: try again next time
    }
  }
}
