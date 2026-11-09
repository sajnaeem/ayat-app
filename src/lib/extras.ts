import { SNIPPETS, Snippet, VIDEOS, FeedVideo } from '@/data/snippets';
import type { MoodId } from '@/lib/quran';
import { SITE } from '@/lib/site';

/** How often extras break up the For you feed: a snippet after every 4th ayah card, a video after every 10th. */
export const SNIPPET_EVERY = 4;
export const VIDEO_EVERY = 10;

export const videoUrl = (v: FeedVideo) => `${SITE}/videos/${v.file}.mp4`;
export const posterUrl = (v: FeedVideo) => `${SITE}/videos/${v.file}.jpg`;

const SEED = Math.floor(Math.random() * 1_000_000_007);
function shuffle<T>(list: T[], salt: number): T[] {
  let x = (SEED + salt) % 2147483647;
  const rnd = () => (x = (x * 1103515245 + 12345) % 2147483648) / 2147483648;
  const out = [...list];
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(rnd() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

/**
 * The order extras appear in for a mood: ones made for that mood first, then ones for everyone,
 * then the rest. Fresh order each time the app opens. With no mood, everything is mixed together.
 */
function byMood<T extends { moods?: MoodId[] }>(all: T[], mood: MoodId | null, salt: number): T[] {
  if (!mood) return shuffle(all, salt);
  const mine = all.filter((x) => x.moods?.includes(mood));
  const everyone = all.filter((x) => !x.moods);
  const others = all.filter((x) => x.moods && !x.moods.includes(mood));
  return [...shuffle(mine, salt), ...shuffle(everyone, salt + 1), ...shuffle(others, salt + 2)];
}

export const snippetOrder = (mood: MoodId | null): Snippet[] => byMood(SNIPPETS, mood, 11);
export const videoOrder = (mood: MoodId | null): FeedVideo[] => byMood(VIDEOS, mood, 23);
