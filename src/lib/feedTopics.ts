import type { Snippet } from '@/data/snippets';

/**
 * What can appear between the ayat on For you, grouped the way a reader thinks about it.
 * Readers untick what they don't want (prefs.feedHide). The ayat themselves are always shown.
 */
export type FeedTopic = { id: string; title: string; sub: string };
export const FEED_TOPICS: FeedTopic[] = [
  { id: 'posts', title: 'Community posts', sub: 'Reminders shared by Munib readers, checked before they go live' },
  { id: 'videos', title: 'Munib videos', sub: 'Short films with recitation' },
  { id: 'stories', title: 'Stories and series', sub: 'Prophets’ stories, the pillars, the life of the Prophet ﷺ' },
  { id: 'facts', title: 'Did you know? and myths', sub: 'Facts about the Quran, and common myths answered' },
  { id: 'quotes', title: 'Words of the scholars', sub: 'Sayings of the Companions and scholars, with their books' },
  { id: 'duas', title: 'Duas', sub: 'Short duas from the Quran and Sunnah' },
  { id: 'names', title: 'Names of Allah', sub: 'One name and its meaning' },
  { id: 'try', title: 'Try this today', sub: 'A small Sunnah to try' },
  { id: 'words', title: 'Arabic words and meanings', sub: 'Words like iman, deen and in shaʾ Allah explained' },
  { id: 'letters', title: 'Arabic letters', sub: 'Learn the alphabet, one letter at a time' },
  { id: 'quiz', title: 'Quizzes', sub: 'One quick question' },
  { id: 'reciters', title: 'Hear it three ways', sub: 'One ayah by three famous reciters' },
  { id: 'timely', title: 'Time-of-day reminders', sub: 'Morning and evening adhkar, Friday al-Kahf, special days' },
  { id: 'progress', title: 'Your reading progress', sub: 'How far through the Quran you’ve come' },
];

const BY_KIND: Record<Snippet['kind'], string> = {
  fact: 'facts',
  myth: 'facts',
  story: 'stories',
  quote: 'quotes',
  dua: 'duas',
  name: 'names',
  try: 'try',
  word: 'words',
  letter: 'letters',
  quiz: 'quiz',
  reciters: 'reciters',
};
export const topicOf = (s: Snippet) => BY_KIND[s.kind] ?? 'facts';

/** How the choice reads on a settings row. */
export function feedSummary(hide: string[] | undefined) {
  const n = FEED_TOPICS.filter((t) => !hide?.includes(t.id)).length;
  if (n === FEED_TOPICS.length) return 'Everything';
  if (n === 0) return 'Just the Quran';
  return `${n} of ${FEED_TOPICS.length}`;
}
