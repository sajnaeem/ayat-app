import AsyncStorage from '@react-native-async-storage/async-storage';
import { cleanTransliteration, setPicks, SURAHS, VERSES, type MoodId, type Verse } from './quran';
import { supabase } from './supabase';

/**
 * More ayat for For you (Saj, 15 Nov 2026). Claude suggests ayat that stand well on their own (edge function
 * `curate`), a reviewer approves or turns each one down (src/app/curate.tsx), and approved ones join every reader's
 * feed. Readers only ever download approved ones; they're kept on the phone and refreshed twice a day.
 */
export type Pick = { id: number; s: number; a: number; b: number; moods: MoodId[]; note: string; why: string; ar: [string, number][]; tl: string[]; en: string[]; status: string };

const KEY = 'munib.picks.v1';
const FRESH_MS = 12 * 3600 * 1000;

function toVerse(p: Omit<Pick, 'id' | 'why' | 'status'>): Verse {
  const [name, ar_name, meaning] = SURAHS[p.s - 1];
  return {
    k: p.b > p.a ? `${p.s}:${p.a}-${p.b}` : `${p.s}:${p.a}`,
    s: p.s,
    a: p.a,
    b: p.b,
    name,
    ar_name,
    meaning,
    ar: p.ar,
    tl: p.tl.map(cleanTransliteration),
    tr: { en: p.en },
    note: p.note,
    tags: p.moods,
  };
}

/** On app start: use the saved list straight away, then refresh it if it's more than 12 hours old. */
export async function loadPicks() {
  let saved: { t: number; rows: Omit<Pick, 'id' | 'why' | 'status'>[] } | null = null;
  try {
    saved = JSON.parse((await AsyncStorage.getItem(KEY)) ?? 'null');
    if (saved?.rows) setPicks(saved.rows.map(toVerse));
  } catch {}
  if (!supabase || (saved && Date.now() - saved.t < FRESH_MS)) return;
  try {
    const { data, error } = await supabase.from('ayah_picks').select('s, a, b, moods, note, ar, tl, en').eq('status', 'approved').order('s').order('a').limit(5000);
    if (error || !data) return;
    setPicks((data as any[]).map(toVerse));
    await AsyncStorage.setItem(KEY, JSON.stringify({ t: Date.now(), rows: data }));
  } catch {}
}

// ---- For reviewers (the database refuses anyone else)

export async function pendingPicks(limit = 25): Promise<Pick[]> {
  if (!supabase) return [];
  const { data, error } = await supabase.from('ayah_picks').select('*').eq('status', 'pending').order('s').order('a').limit(limit);
  if (error) throw new Error(error.message);
  return (data ?? []) as Pick[];
}

export async function reviewPick(id: number, approve: boolean, moods: MoodId[], note: string) {
  if (!supabase) throw new Error('offline');
  const { error } = await supabase.rpc('review_pick', { pick: id, approve, p_moods: moods, p_note: note });
  if (error) throw new Error(error.message);
}

export type PickCounts = { pending: number; approved: number; rejected: number; at: { s: number; a: number } };
export async function pickCounts(): Promise<PickCounts | null> {
  if (!supabase) return null;
  const { data } = await supabase.rpc('pick_counts');
  return (data as PickCounts) ?? null;
}

/** Asks Claude to read the next ~50 ayat and suggest any that stand alone. Ayat already in the feed are skipped. */
export async function suggestMore(): Promise<{ added: number; checked?: string; at?: { s: number; a: number }; done?: boolean; error?: string }> {
  if (!supabase) return { added: 0, error: 'offline' };
  const { data, error } = await supabase.functions.invoke('curate', { body: { skip: VERSES.map((v) => v.k) } });
  if (error) return { added: 0, error: error.message };
  return data;
}

/** "Al-Baqarah 2:101" for where the suggestions have reached. */
export const placeName = (at: { s: number; a: number }) => (at.s > 114 ? 'the end of the Quran' : `${SURAHS[at.s - 1][0]} ${at.s}:${at.a}`);
