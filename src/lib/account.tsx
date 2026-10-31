import * as AppleAuthentication from 'expo-apple-authentication';
import * as Linking from 'expo-linking';
import * as WebBrowser from 'expo-web-browser';
import { createContext, ReactNode, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { Progress, useProgress } from './progress';
import { usePrefs } from './store';
import { supabase } from './supabase';

export type Reflection = { id: string; user_id: string; body: string; created_at: string; handle: string };
export type CardStats = Record<string, { likes: number; reflections: number }>;

export type AuthStatus = 'loading' | 'signedOut' | 'signedIn' | 'offline';

type Ctx = {
  /** True once the database is set up for this build. */
  online: boolean;
  status: AuthStatus;
  userId: string | null;
  handle: string | null;
  /** True once we know whether this account has a display name yet. */
  profileLoaded: boolean;
  setHandle: (h: string) => Promise<void>;
  signInWithApple: () => Promise<void>;
  signInWithGoogle: () => Promise<void>;
  sendPhoneCode: (phone: string) => Promise<void>;
  verifyPhoneCode: (phone: string, code: string) => Promise<void>;
  signUpWithEmail: (email: string, password: string) => Promise<void>;
  signInWithEmail: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
  deleteAccount: () => Promise<void>;
  stats: CardStats;
  /** Fetches like and reflection counts for these cards. */
  loadStats: (keys: string[]) => void;
  /** Likes on the server that are this person's, so counts don't double up with the heart on screen. */
  myServerLikes: Set<string>;
  listReflections: (key: string) => Promise<Reflection[]>;
  postReflection: (key: string, body: string) => Promise<void>;
  deleteReflection: (id: string, key: string) => Promise<void>;
  reportReflection: (id: string) => Promise<void>;
  /** True once this person has agreed to the community guidelines (needed to post). */
  guidelinesAccepted: boolean;
  acceptGuidelines: () => Promise<void>;
  /** Blocking: you and they no longer see each other's reflections. */
  blockUser: (id: string) => Promise<void>;
  unblockUser: (id: string) => Promise<void>;
  listBlocked: () => Promise<{ id: string; handle: string }[]>;
};

const C = createContext<Ctx | null>(null);

/** Turns a sign-in error into something a person can act on. */
export function authMessage(e: unknown): string {
  const m = String((e as { message?: string })?.message ?? e ?? '');
  if (/canceled|cancelled|dismiss/i.test(m)) return '';
  if (/provider is not enabled|Unsupported provider/i.test(m)) return "That sign-in option isn't switched on yet. Try another way for now.";
  if (/Invalid login credentials/i.test(m)) return 'That email and password don\'t match. Check them and try again.';
  if (/already registered|already been registered/i.test(m)) return 'There is already an account with that email. Log in instead.';
  if (/Password should be at least/i.test(m)) return 'Use a password of at least 8 characters.';
  if (/Token has expired|invalid.*otp|Invalid token/i.test(m)) return "That code didn't work. Check it, or send a new one.";
  if (/Email not confirmed/i.test(m)) return 'Check your inbox and confirm your email first.';
  if (/rate limit/i.test(m)) return 'Too many tries. Wait a few minutes and try again.';
  if (/network|fetch/i.test(m)) return "Couldn't reach Munib. Check your connection and try again.";
  return m || 'Something went wrong. Please try again.';
}

/**
 * The person's account. An account is required: people sign in with Apple, Google, their phone number or email,
 * then choose a display name. Likes, saves and progress are backed up to the account.
 */
export function AccountProvider({ children }: { children: ReactNode }) {
  const prefs = usePrefs();
  const prog = useProgress();
  const [status, setStatus] = useState<AuthStatus>(supabase ? 'loading' : 'offline');
  const [userId, setUserId] = useState<string | null>(null);
  const [handle, setHandleState] = useState<string | null>(null);
  const [profileLoaded, setProfileLoaded] = useState(false);
  const [guidelinesAccepted, setGuidelinesAccepted] = useState(false);
  const [stats, setStats] = useState<CardStats>({});
  const [myServerLikes, setMyServerLikes] = useState<Set<string>>(new Set());
  const synced = useRef(false);
  const serverLikes = useRef<Set<string>>(new Set());

  // Follow the session: restored on launch, then updated on sign-in and sign-out.
  useEffect(() => {
    if (!supabase) return;
    supabase.auth.getSession().then(({ data }) => {
      setUserId(data.session?.user.id ?? null);
      setStatus(data.session ? 'signedIn' : 'signedOut');
    });
    const { data: sub } = supabase.auth.onAuthStateChange((_e, session) => {
      setUserId(session?.user.id ?? null);
      setStatus(session ? 'signedIn' : 'signedOut');
    });
    return () => sub.subscription.unsubscribe();
  }, []);

  // When someone signs in, pull what's stored on their account and merge it with what's on the phone.
  useEffect(() => {
    if (!supabase || !prefs.ready || !userId) return;
    let cancelled = false;
    synced.current = false;
    setProfileLoaded(false);
    (async () => {
      const uid = userId;
      const [profile, state, likes] = await Promise.all([
        supabase.from('profiles').select('*').eq('id', uid).maybeSingle(),
        supabase.from('user_state').select('saves, progress').eq('user_id', uid).maybeSingle(),
        supabase.from('likes').select('verse_key').eq('user_id', uid),
      ]);
      if (cancelled) return;
      setHandleState(profile.data?.handle ?? null);
      setGuidelinesAccepted(!!profile.data?.guidelines_at);
      setProfileLoaded(!profile.error);
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
    })().catch(() => setProfileLoaded(true));
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [prefs.ready, userId]);

  /* ---------- sign-in methods ---------- */
  const signInWithApple = useCallback(async () => {
    if (!supabase) return;
    const cred = await AppleAuthentication.signInAsync({
      requestedScopes: [AppleAuthentication.AppleAuthenticationScope.FULL_NAME, AppleAuthentication.AppleAuthenticationScope.EMAIL],
    });
    if (!cred.identityToken) throw new Error('Apple did not return a sign-in token');
    const { error } = await supabase.auth.signInWithIdToken({ provider: 'apple', token: cred.identityToken });
    if (error) throw error;
  }, []);

  const signInWithGoogle = useCallback(async () => {
    if (!supabase) return;
    const redirectTo = Linking.createURL('auth-callback');
    const { data, error } = await supabase.auth.signInWithOAuth({ provider: 'google', options: { redirectTo, skipBrowserRedirect: true } });
    if (error) throw error;
    const res = await WebBrowser.openAuthSessionAsync(data.url, redirectTo);
    if (res.type !== 'success') throw new Error('cancelled');
    const { queryParams } = Linking.parse(res.url);
    const code = typeof queryParams?.code === 'string' ? queryParams.code : null;
    const err = typeof queryParams?.error_description === 'string' ? queryParams.error_description : null;
    if (!code) throw new Error(err ?? 'Google sign-in did not finish');
    const ex = await supabase.auth.exchangeCodeForSession(code);
    if (ex.error) throw ex.error;
  }, []);

  const sendPhoneCode = useCallback(async (phone: string) => {
    if (!supabase) return;
    const { error } = await supabase.auth.signInWithOtp({ phone });
    if (error) throw error;
  }, []);
  const verifyPhoneCode = useCallback(async (phone: string, code: string) => {
    if (!supabase) return;
    const { error } = await supabase.auth.verifyOtp({ phone, token: code.trim(), type: 'sms' });
    if (error) throw error;
  }, []);

  const signUpWithEmail = useCallback(async (email: string, password: string) => {
    if (!supabase) return;
    const { data, error } = await supabase.auth.signUp({ email: email.trim(), password });
    if (error) throw error;
    if (!data.session) throw new Error('Email not confirmed');
  }, []);
  const signInWithEmail = useCallback(async (email: string, password: string) => {
    if (!supabase) return;
    const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
    if (error) throw error;
  }, []);

  const clearLocal = useCallback(() => {
    prefs.set({ likes: {}, saves: {} });
    prog.reset();
    serverLikes.current = new Set();
    setMyServerLikes(new Set());
    setHandleState(null);
    setGuidelinesAccepted(false);
    setStats({});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [prefs.set, prog.reset]);

  const signOut = useCallback(async () => {
    if (!supabase) return;
    await supabase.auth.signOut();
    clearLocal();
  }, [clearLocal]);

  const deleteAccount = useCallback(async () => {
    if (!supabase) return;
    const { error } = await supabase.rpc('delete_my_account');
    if (error) throw error;
    await supabase.auth.signOut();
    clearLocal();
  }, [clearLocal]);

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

  const acceptGuidelines = useCallback(async () => {
    if (!supabase || !userId) throw new Error('offline');
    const { error } = await supabase.from('profiles').update({ guidelines_at: new Date().toISOString() }).eq('id', userId);
    if (error) throw error;
    setGuidelinesAccepted(true);
  }, [userId]);

  const blockUser = useCallback(
    async (id: string) => {
      if (!supabase || !userId || id === userId) throw new Error('offline');
      const { error } = await supabase.from('blocks').upsert({ blocker: userId, blocked: id });
      if (error) throw error;
    },
    [userId],
  );

  const unblockUser = useCallback(
    async (id: string) => {
      if (!supabase || !userId) throw new Error('offline');
      const { error } = await supabase.from('blocks').delete().eq('blocker', userId).eq('blocked', id);
      if (error) throw error;
    },
    [userId],
  );

  const listBlocked = useCallback(async () => {
    if (!supabase || !userId) return [];
    const { data, error } = await supabase.from('blocks').select('blocked, profiles!blocks_blocked_fkey(handle)').eq('blocker', userId).order('created_at', { ascending: false });
    if (error) throw error;
    return (data ?? []).map((b: any) => ({ id: b.blocked, handle: b.profiles?.handle ?? 'Someone' }));
  }, [userId]);

  const value = useMemo<Ctx>(
    () => ({
      online: !!supabase, status, userId, handle, profileLoaded, setHandle,
      signInWithApple, signInWithGoogle, sendPhoneCode, verifyPhoneCode, signUpWithEmail, signInWithEmail, signOut, deleteAccount,
      stats, loadStats, myServerLikes, listReflections, postReflection, deleteReflection, reportReflection,
      guidelinesAccepted, acceptGuidelines, blockUser, unblockUser, listBlocked,
    }),
    [status, userId, handle, profileLoaded, setHandle, signInWithApple, signInWithGoogle, sendPhoneCode, verifyPhoneCode, signUpWithEmail, signInWithEmail, signOut, deleteAccount, stats, loadStats, myServerLikes, listReflections, postReflection, deleteReflection, reportReflection, guidelinesAccepted, acceptGuidelines, blockUser, unblockUser, listBlocked],
  );
  return <C.Provider value={value}>{children}</C.Provider>;
}

export function useAccount() {
  const c = useContext(C);
  if (!c) throw new Error('useAccount must be used inside AccountProvider');
  return c;
}
