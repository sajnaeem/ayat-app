import type { MoodId } from '@/lib/quran';
import { supabase } from '@/lib/supabase';

/**
 * Posts from the community: text, a photo or a short video, with an optional source and up to 3 moods.
 * Every post starts as "pending" and is only shown to others once a reviewer approves it
 * (enforced by the database, see supabase/006_posts.sql).
 */
export type PostKind = 'text' | 'image' | 'video';
export type PostStatus = 'pending' | 'approved' | 'rejected' | 'removed';
export type Post = {
  id: string;
  user_id: string;
  kind: PostKind;
  body: string;
  source: string | null;
  moods: MoodId[];
  media_path: string | null;
  status: PostStatus;
  review_note: string | null;
  created_at: string;
  handle: string;
  /** The AI first pass (supabase/functions/moderate): ok, check or reject, with a summary and what to look at. */
  ai_verdict: 'ok' | 'check' | 'reject' | null;
  ai_summary: string | null;
  ai_notes: string | null;
  /** Set when this post reached you because someone you follow reposted it. */
  repostedBy?: { id: string; handle: string };
};

const FIELDS = 'id, user_id, kind, body, source, moods, media_path, status, review_note, created_at, ai_verdict, ai_summary, ai_notes, profiles(handle)';

/** Ask the AI to check a post. Fire and forget: if it fails, the post simply waits for a person. */
export async function aiCheck(id: string, force = false): Promise<void> {
  if (!supabase) return;
  const { error } = await supabase.functions.invoke('moderate', { body: { post: id, force } });
  if (error) throw error;
}
const shape = (rows: any[]): Post[] => rows.map((r) => ({ ...r, moods: r.moods ?? [], handle: r.profiles?.handle ?? 'Someone' }));

/** The key used for a post's likes and comments (they share the ayat tables). */
export const postKey = (id: string) => `p:${id}`;

/** Upload a photo or video from the phone and create the post as pending. */
export async function createPost(p: {
  userId: string;
  kind: PostKind;
  body: string;
  source?: string;
  moods: MoodId[];
  media?: { uri: string; mime: string };
}): Promise<void> {
  if (!supabase) throw new Error('offline');
  let media_path: string | null = null;
  if (p.kind !== 'text' && p.media) {
    const ext = p.media.mime.includes('png') ? 'png' : p.media.mime.includes('quicktime') ? 'mov' : p.media.mime.startsWith('video') ? 'mp4' : 'jpg';
    media_path = `${p.userId}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
    const body = await (await fetch(p.media.uri)).arrayBuffer();
    const up = await supabase.storage.from('posts').upload(media_path, body, { contentType: p.media.mime });
    if (up.error) throw up.error;
  }
  const { data, error } = await supabase
    .from('posts')
    .insert({
      user_id: p.userId,
      kind: p.kind,
      body: p.body.trim(),
      source: p.source?.trim() || null,
      moods: p.moods,
      media_path,
    })
    .select('id')
    .single();
  if (error) {
    if (media_path) supabase.storage.from('posts').remove([media_path]).then(() => {});
    throw error;
  }
  if (data?.id) aiCheck(data.id).catch(() => {});
}

/** Approved posts for the For you feed, newest first. */
export async function approvedPosts(limit = 60): Promise<Post[]> {
  if (!supabase) return [];
  const { data, error } = await supabase.from('posts').select(FIELDS).eq('status', 'approved').eq('hidden', false).order('created_at', { ascending: false }).limit(limit);
  return error ? [] : shape(data ?? []);
}

export async function myPosts(userId: string): Promise<Post[]> {
  if (!supabase) return [];
  const { data } = await supabase.from('posts').select(FIELDS).eq('user_id', userId).order('created_at', { ascending: false }).limit(50);
  return shape(data ?? []);
}

/** For reviewers: everything waiting. The AI's "check" posts first, then ones it hasn't checked, then "looks fine"; oldest first within each. */
export async function reviewQueue(): Promise<Post[]> {
  if (!supabase) return [];
  const { data } = await supabase.from('posts').select(FIELDS).eq('status', 'pending').order('created_at', { ascending: true }).limit(100);
  const rank = (p: Post) => (p.ai_verdict === 'check' ? 0 : p.ai_verdict === 'ok' ? 2 : 1);
  return shape(data ?? []).sort((a, b) => rank(a) - rank(b));
}

export async function amReviewer(userId: string): Promise<boolean> {
  if (!supabase) return false;
  const { data } = await supabase.from('profiles').select('is_reviewer').eq('id', userId).maybeSingle();
  return !!data?.is_reviewer;
}

export async function reviewPost(id: string, approve: boolean, note?: string): Promise<void> {
  if (!supabase) throw new Error('offline');
  const { error } = await supabase.rpc('review_post', { post: id, approve, note: note ?? null });
  if (error) throw error;
}

export async function reportPost(id: string, reporterId: string): Promise<void> {
  if (!supabase) throw new Error('offline');
  const { error } = await supabase.from('post_reports').insert({ post_id: id, reporter_id: reporterId });
  if (error && error.code !== '23505') throw error; // already reported: fine
}

export async function deletePost(post: Post): Promise<void> {
  if (!supabase) throw new Error('offline');
  const { error } = await supabase.from('posts').delete().eq('id', post.id);
  if (error) throw error;
  if (post.media_path) await supabase.storage.from('posts').remove([post.media_path]);
}

/** A short-lived link to a post's photo or video (the bucket is private). */
const urls = new Map<string, { url: string; until: number }>();
export async function mediaUrl(path: string): Promise<string | null> {
  if (!supabase) return null;
  const hit = urls.get(path);
  if (hit && hit.until > Date.now()) return hit.url;
  const { data } = await supabase.storage.from('posts').createSignedUrl(path, 3600);
  if (!data?.signedUrl) return null;
  urls.set(path, { url: data.signedUrl, until: Date.now() + 50 * 60 * 1000 });
  return data.signedUrl;
}

/** Like or unlike a post (shares the likes table with ayat). */
export async function setPostLike(userId: string, id: string, on: boolean): Promise<void> {
  if (!supabase) return;
  if (on) await supabase.from('likes').upsert({ user_id: userId, verse_key: postKey(id) });
  else await supabase.from('likes').delete().eq('user_id', userId).eq('verse_key', postKey(id));
}

export async function myPostLikes(userId: string): Promise<Set<string>> {
  if (!supabase) return new Set();
  const { data } = await supabase.from('likes').select('verse_key').eq('user_id', userId).like('verse_key', 'p:%');
  return new Set((data ?? []).map((r) => r.verse_key.slice(2)));
}

/** Posts made for this mood first, then the rest, newest first within each. */
export function postsForMood(list: Post[], mood: MoodId | null): Post[] {
  if (!mood) return list;
  return [...list.filter((p) => p.moods.includes(mood)), ...list.filter((p) => !p.moods.includes(mood))];
}
