import { Post } from '@/lib/posts';
import { supabase } from '@/lib/supabase';

/**
 * Profiles and following (see supabase/010_profiles_follows.sql).
 * Anyone signed in sees a profile's counts; who follows whom is only visible to the two people involved.
 */
export type Profile = { id: string; handle: string; bio: string | null; posts: number; followers: number; following: number; i_follow: boolean; follows_me: boolean };
export type Person = { id: string; handle: string };

const FIELDS = 'id, user_id, kind, body, source, moods, media_path, status, review_note, created_at, ai_verdict, ai_summary, ai_notes, profiles(handle)';
const shape = (rows: any[]): Post[] => rows.map((r) => ({ ...r, moods: r.moods ?? [], handle: r.profiles?.handle ?? 'Someone' }));

/** A profile and its counts, or null if it doesn't exist or one of you has blocked the other. */
export async function profileCard(id: string): Promise<Profile | null> {
  if (!supabase) return null;
  const { data, error } = await supabase.rpc('profile_card', { uid: id });
  if (error) throw error;
  return (data as Profile[])?.[0] ?? null;
}

/** Someone's live posts (for your own profile, every post with its review status). */
export async function postsBy(id: string, mine: boolean): Promise<Post[]> {
  if (!supabase) return [];
  let q = supabase.from('posts').select(FIELDS).eq('user_id', id);
  if (!mine) q = q.eq('status', 'approved').eq('hidden', false);
  const { data } = await q.order('created_at', { ascending: false }).limit(60);
  return shape(data ?? []);
}

export async function follow(me: string, them: string, on: boolean): Promise<void> {
  if (!supabase) throw new Error('offline');
  const { error } = on
    ? await supabase.from('follows').insert({ follower: me, followee: them })
    : await supabase.from('follows').delete().eq('follower', me).eq('followee', them);
  if (error && error.code !== '23505') throw error;
}

/** Remove someone who follows you. */
export async function removeFollower(me: string, them: string): Promise<void> {
  if (!supabase) throw new Error('offline');
  const { error } = await supabase.from('follows').delete().eq('follower', them).eq('followee', me);
  if (error) throw error;
}

/** Your followers, or the people you follow. Only ever your own lists. */
export async function myPeople(me: string, which: 'followers' | 'following'): Promise<Person[]> {
  if (!supabase) return [];
  const col = which === 'followers' ? 'follower' : 'followee';
  const { data } = await supabase
    .from('follows')
    .select(`${col}, p:profiles!follows_${col}_fkey(handle)`)
    .eq(which === 'followers' ? 'followee' : 'follower', me)
    .order('created_at', { ascending: false })
    .limit(500);
  return (data ?? []).map((r: any) => ({ id: r[col], handle: r.p?.handle ?? 'Someone' }));
}

/** Who you follow, to put their posts first in For you. */
export async function followingIds(me: string): Promise<Set<string>> {
  if (!supabase) return new Set();
  const { data } = await supabase.from('follows').select('followee').eq('follower', me).limit(2000);
  return new Set((data ?? []).map((r) => r.followee));
}

export async function saveBio(me: string, bio: string): Promise<void> {
  if (!supabase) throw new Error('offline');
  const { error } = await supabase.from('profiles').update({ bio: bio.trim() || null }).eq('id', me);
  if (error) throw error;
}

export type PersonHit = { id: string; handle: string; bio: string | null; followers: number; i_follow: boolean };

/** People whose display name contains the search (needs an account, at least 2 letters). */
export async function searchPeople(q: string): Promise<PersonHit[]> {
  if (!supabase || q.trim().length < 2) return [];
  const { data, error } = await supabase.rpc('search_people', { q: q.trim() });
  if (error) throw error;
  return (data as PersonHit[]) ?? [];
}

/** Live posts whose text or source contains the search, newest first. */
export async function searchPosts(q: string): Promise<Post[]> {
  // Characters that would change the meaning of the filter are dropped rather than escaped.
  const t = q.trim().replace(/[%_*,()\\]/g, ' ').replace(/\s+/g, ' ').trim();
  if (!supabase || t.length < 2) return [];
  const { data, error } = await supabase
    .from('posts')
    .select(FIELDS)
    .eq('status', 'approved')
    .eq('hidden', false)
    .or(`body.ilike.%${t}%,source.ilike.%${t}%`)
    .order('created_at', { ascending: false })
    .limit(30);
  if (error) throw error;
  return shape(data ?? []);
}

/** Repost or undo a repost (only someone else's live post; see supabase/012_reposts.sql). */
export async function setRepost(me: string, postId: string, on: boolean): Promise<void> {
  if (!supabase) throw new Error('offline');
  const { error } = on
    ? await supabase.from('reposts').insert({ user_id: me, post_id: postId })
    : await supabase.from('reposts').delete().eq('user_id', me).eq('post_id', postId);
  if (error && error.code !== '23505') throw error;
}

/** The posts you've reposted, to show the button as on. */
export async function myReposts(me: string): Promise<Set<string>> {
  if (!supabase) return new Set();
  const { data } = await supabase.from('reposts').select('post_id').eq('user_id', me).limit(1000);
  return new Set((data ?? []).map((r) => r.post_id));
}

/** What someone has reposted, newest first. Posts that are no longer live drop out. */
export async function repostsBy(id: string): Promise<Post[]> {
  if (!supabase) return [];
  const { data } = await supabase.from('reposts').select(`created_at, post:posts(${FIELDS})`).eq('user_id', id).order('created_at', { ascending: false }).limit(60);
  return shape((data ?? []).map((r: any) => r.post).filter(Boolean));
}

/** Recent reposts by people you follow, each marked with who reposted it (once per post). */
export async function followingReposts(ids: string[]): Promise<Post[]> {
  if (!supabase || !ids.length) return [];
  const { data } = await supabase
    .from('reposts')
    .select(`created_at, user_id, who:profiles!reposts_user_id_fkey(handle), post:posts(${FIELDS})`)
    .in('user_id', ids.slice(0, 500))
    .order('created_at', { ascending: false })
    .limit(60);
  const seen = new Set<string>();
  const out: Post[] = [];
  for (const r of (data ?? []) as any[]) {
    if (!r.post || seen.has(r.post.id)) continue;
    seen.add(r.post.id);
    out.push({ ...shape([r.post])[0], repostedBy: { id: r.user_id, handle: r.who?.handle ?? 'Someone' } });
  }
  return out;
}
