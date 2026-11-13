import { supabase } from './supabase';

/**
 * Ask for dua (requests to the ummah) and the ummah counter. Database: supabase/017_together_more.sql.
 */

export type DuaRequest = { id: string; body: string; created_at: string; count: number; handle: string | null; author: string | null; mine: boolean; made: boolean };
export type MyDua = { id: string; body: string; anonymous: boolean; count: number; hidden: boolean; created_at: string; expires_at: string };

export async function duaWall(before?: string): Promise<DuaRequest[]> {
  if (!supabase) return [];
  const { data, error } = await supabase.rpc('dua_wall', { p_before: before ?? null, p_limit: 30 });
  if (error) throw error;
  return (data as DuaRequest[]) ?? [];
}
export async function askDua(body: string, anonymous: boolean) {
  if (!supabase) throw new Error('offline');
  const { error } = await supabase.rpc('ask_dua', { p_body: body, p_anonymous: anonymous });
  if (error) throw new Error(/limit/.test(error.message) ? 'limit' : /guidelines/.test(error.message) ? 'guidelines' : 'failed');
}
export async function madeDua(id: string): Promise<number> {
  if (!supabase) return 0;
  const { data, error } = await supabase.rpc('made_dua', { p_id: id });
  if (error) throw error;
  return Number(data) || 0;
}
export async function reportDua(id: string, reason?: string) {
  if (!supabase) return;
  const { error } = await supabase.rpc('report_dua', { p_id: id, p_reason: reason ?? null });
  if (error) throw error;
}
export async function deleteDua(id: string) {
  if (!supabase) return;
  const { error } = await supabase.rpc('delete_dua', { p_id: id });
  if (error) throw error;
}
export async function myDuas(): Promise<MyDua[]> {
  if (!supabase) return [];
  const { data } = await supabase.rpc('my_duas');
  return (data as MyDua[]) ?? [];
}

/** "3 hours ago" */
export function ago(iso: string) {
  const m = Math.max(1, Math.round((Date.now() - new Date(iso).getTime()) / 60000));
  if (m < 60) return `${m} min ago`;
  const h = Math.round(m / 60);
  if (h < 24) return `${h} ${h === 1 ? 'hour' : 'hours'} ago`;
  const d = Math.round(h / 24);
  return `${d} ${d === 1 ? 'day' : 'days'} ago`;
}

/* ---------- The ummah counter: only totals, never who read what ---------- */

let pending = 0;
let timer: ReturnType<typeof setTimeout> | null = null;

/** Count ayat read on this phone towards everyone's total; sent in small batches. */
export function countForUmmah(n: number) {
  if (!supabase || n <= 0) return;
  pending += n;
  if (!timer) timer = setTimeout(flushUmmah, 20000);
}
export function flushUmmah() {
  if (timer) clearTimeout(timer);
  timer = null;
  if (!supabase || pending <= 0) return;
  const n = Math.min(pending, 60);
  pending -= n;
  supabase.rpc('add_ayat', { n }).then(
    () => pending > 0 && flushUmmah(),
    () => {
      pending += n;
    },
  );
}
export type UmmahStats = { today: number; week: number; all: number };
export async function ummahStats(): Promise<UmmahStats | null> {
  if (!supabase) return null;
  const { data, error } = await supabase.rpc('ummah_stats');
  return error ? null : (data as UmmahStats);
}
