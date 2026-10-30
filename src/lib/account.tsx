import { createContext, ReactNode, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { Progress, useProgress } from './progress';
import { usePrefs } from './store';
import { supabase } from './supabase';

export type Reflection = { id: string; user_id: string; body: string; created_at: string; handle: string };
export type CardStats = Record<string, { likes: number; reflections: number }>;

type Ctx = {
  /** True once the database is set up for this build. */
  online: boolean;
  userId: string | null;
  handle: string | null;
  setHandle: (h: string) => Promise<void>;
  stats: CardStats;
  /** Fetches like and reflection counts for these cards. */
  loadStats: (keys: string[]) => void;
  /** Likes on the server that are this person's, so counts don't double up with the heart on screen. */
  myServerLikes: Set<string>;
  listReflections: (key: string) => Promise<Reflection[]>;
  postReflection: (key: string, body: string) => Promise<void>;
  deleteReflection: (id: string, key: string) => Promise<void>;
  reportReflection: (id: string) => Promise<void>;
};

const C = createContext<Ctx | null>(null);

/**
 * The person's account. Everyone gets a private account automatically on first launch (no email, no password),
 * so likes, saves and progress are backed up from the start. A display name is only asked for when they first post a reflection.
 */
export function AccountProvider({ children }: { children: ReactNode }) {
  const prefs = usePrefs();
  const prog = useProgress();
  const [userId, setUserId] = useState<string | null>(null);
  const [handle, setHandleState] = useState<string | null>(null);
  const [stats, setStats] = useState<CardStats>({});
  const [myServerLikes, setMyServerLikes] = useState<Set<string>>(new Set());
  const synced = useRef(false);
  const serverLikes = useRef<Set<string>>(new Set());

  // Sign in (creating a private account the first time), then pull what's stored and merge it with what's on the phone.
  useEffect(() => {
    if (!supabase || !prefs.ready) return;
    let cancelled = false;
    (async () => {
      let { data } = await supabase.auth.getSession();
      if (!data.session) {
        const res = await supabase.auth.signInAnonymously();
        if (res.error || !res.data.session) return;
        data = { session: res.data.session };
      }
      const uid = data.session!.user.id;
      if (cancelled) return;
      setUserId(uid);
      const [profile, state, likes] = await Promise.all([
        supabase.from('profiles').select('handle').eq('id', uid).maybeSingle(),
        supabase.from('user_state').select('saves, progress').eq('user_id', uid).maybeSingle(),
        supabase.from('likes').select('verse_key').eq('user_id', uid),
      ]);
      if (cancelled) return;
      if (profile.data?.handle) setHandleState(profile.data.handle);
      if (state.data) {
        prefs.set({ saves: { ...(state.data.saves as Record<string, number>), ...prefs.saves } });
        prog.merge(state.data.progress as Partial<Progress>);
      }
      const mine = new Set((likes.data ?? []).map((l: { verse_key: string }) => l.verse_key));
      serverLikes.current = mine;
      setMyServerLikes(new Set(mine));
      const merged = { ...prefs.likes };
      mine.forEach((k) => (merged[k] = merged[k] ?? Date.now()));
      prefs.set({ likes: merged });
      synced.current = true;
    })().catch(() => {});
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [prefs.ready]);

  // Likes: send additions and removals as they happen.
  useEffect(() => {
    if (!supabase || !userId || !synced.current) return;
    const local = new Set(Object.keys(prefs.likes));
    const add = [...local].filter((k) => !serverLikes.current.has(k));
    const del = [...serverLikes.current].filter((k) => !local.has(k));
    if (!add.length && !del.length) return;
    add.forEach((k) => serverLikes.current.add(k));
    del.forEach((k) => serverLikes.current.delete(k));
    setMyServerLikes(new Set(serverLikes.current));
    // Update the counts on screen straight away rather than waiting for the next fetch.
    setStats((s) => {
      const next = { ...s };
      for (const k of add) if (next[k]) next[k] = { ...next[k], likes: next[k].likes + 1 };
      for (const k of del) if (next[k]) next[k] = { ...next[k], likes: Math.max(0, next[k].likes - 1) };
      return next;
    });
    if (add.length) supabase.from('likes').upsert(add.map((verse_key) => ({ user_id: userId, verse_key }))).then(() => {});
    if (del.length) supabase.from('likes').delete().eq('user_id', userId).in('verse_key', del).then(() => {});
  }, [prefs.likes, userId]);

  // Saves and progress: back up a few seconds after they change.
  useEffect(() => {
    if (!supabase || !userId || !synced.current) return;
    const t = setTimeout(() => {
      supabase!.from('user_state').upsert({ user_id: userId, saves: prefs.saves, progress: prog.progress, updated_at: new Date().toISOString() }).then(() => {});
    }, 3000);
    return () => clearTimeout(t);
  }, [prefs.saves, prog.progress, userId]);

  const setHandle = useCallback(
    async (h: string) => {
      if (!supabase || !userId) throw new Error('offline');
      const clean = h.trim().slice(0, 32);
      const { error } = await supabase.from('profiles').upsert({ id: userId, handle: clean });
      if (error) throw error;
      setHandleState(clean);
    },
    [userId],
  );

  const loadStats = useCallback((keys: string[]) => {
    if (!supabase || !keys.length) return;
    supabase.rpc('card_stats', { keys }).then(({ data }) => {
      if (!data) return;
      setStats((s) => {
        const next = { ...s };
        for (const r of data as { verse_key: string; likes: number; reflections: number }[]) next[r.verse_key] = { likes: Number(r.likes), reflections: Number(r.reflections) };
        return next;
      });
    });
  }, []);

  const listReflections = useCallback(async (key: string): Promise<Reflection[]> => {
    if (!supabase) return [];
    const { data, error } = await supabase
      .from('reflections')
      .select('id, user_id, body, created_at, profiles(handle)')
      .eq('verse_key', key)
      .order('created_at', { ascending: true })
      .limit(200);
    if (error) throw error;
    return (data ?? []).map((r: any) => ({ id: r.id, user_id: r.user_id, body: r.body, created_at: r.created_at, handle: r.profiles?.handle ?? 'Someone' }));
  }, []);

  const bump = (key: string, d: number) =>
    setStats((s) => ({ ...s, [key]: { likes: s[key]?.likes ?? 0, reflections: Math.max(0, (s[key]?.reflections ?? 0) + d) } }));

  const postReflection = useCallback(
    async (key: string, body: string) => {
      if (!supabase || !userId) throw new Error('offline');
      const { error } = await supabase.from('reflections').insert({ user_id: userId, verse_key: key, body: body.trim().slice(0, 400) });
      if (error) throw error;
      bump(key, 1);
    },
    [userId],
  );

  const deleteReflection = useCallback(async (id: string, key: string) => {
    if (!supabase) return;
    const { error } = await supabase.from('reflections').delete().eq('id', id);
    if (error) throw error;
    bump(key, -1);
  }, []);

  const reportReflection = useCallback(
    async (id: string) => {
      if (!supabase || !userId) return;
      await supabase.from('reports').upsert({ reflection_id: id, reporter_id: userId });
    },
    [userId],
  );

  const value = useMemo<Ctx>(
    () => ({ online: !!supabase, userId, handle, setHandle, stats, loadStats, myServerLikes, listReflections, postReflection, deleteReflection, reportReflection }),
    [userId, handle, setHandle, stats, loadStats, myServerLikes, listReflections, postReflection, deleteReflection, reportReflection],
  );
  return <C.Provider value={value}>{children}</C.Provider>;
}

export function useAccount() {
  const c = useContext(C);
  if (!c) throw new Error('useAccount must be used inside AccountProvider');
  return c;
}
