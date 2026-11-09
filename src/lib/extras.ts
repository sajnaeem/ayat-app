import { NEWCOMER, SNIPPETS, Snippet, VIDEOS, FeedVideo } from '@/data/snippets';
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
function byMood<T extends { id: string; moods?: MoodId[] }>(all: T[], mood: MoodId | null, salt: number): T[] {
  if (!mood) return shuffle(all, salt);
  const fits = (x: T) => !!x.moods?.includes(mood) || (mood === 'newmuslim' && NEWCOMER.has(x.id));
  const mine = all.filter(fits);
  const everyone = all.filter((x) => !fits(x) && !x.moods);
  const others = all.filter((x) => !fits(x) && x.moods);
  return [...shuffle(mine, salt), ...shuffle(everyone, salt + 1), ...shuffle(others, salt + 2)];
}

export const snippetOrder = (mood: MoodId | null): Snippet[] => byMood(SNIPPETS, mood, 11);
export const videoOrder = (mood: MoodId | null): FeedVideo[] => byMood(VIDEOS, mood, 23);

/** A card for this moment, worked out from the phone's clock and calendar alone (nothing about the person). */
export type Timely = {
  id: string;
  eyebrow: string;
  title: string;
  ar?: string;
  tl?: string;
  meaning?: string;
  body: string;
  source: string;
  action?: { label: string; s: number; a: number };
};

/** The Islamic (Umm al-Qura) month and day, if the phone can work it out. Local moon sighting may differ by a day. */
function hijri(d: Date): { m: number; day: number } | null {
  try {
    const parts = new Intl.DateTimeFormat('en-u-ca-islamic-umalqura', { day: 'numeric', month: 'numeric' }).formatToParts(d);
    const m = Number(parts.find((x) => x.type === 'month')?.value);
    const day = Number(parts.find((x) => x.type === 'day')?.value);
    return m >= 1 && m <= 12 && day >= 1 && day <= 30 ? { m, day } : null;
  } catch {
    return null;
  }
}

export function timelyCard(d = new Date()): Timely | null {
  const h = hijri(d);
  const hour = d.getHours();
  if (h?.m === 9 && h.day >= 20) {
    return { id: 'qadr', eyebrow: 'THE LAST TEN NIGHTS', title: 'Laylat al-Qadr is better than a thousand months.', body: 'The Prophet ﷺ said: “Seek it in the odd nights of the last ten nights of Ramadan.”', source: 'Quran 97:3 · Sahih al-Bukhari 2017', action: { label: 'Read Surah al-Qadr', s: 97, a: 1 } };
  }
  if (h?.m === 9) {
    return { id: 'ramadan', eyebrow: 'RAMADAN', title: 'This is the month the Quran was revealed.', body: '“The month of Ramadan is that in which was revealed the Quran, a guidance for the people.” A little every day this month adds up.', source: 'Quran 2:185', action: { label: 'Continue the Quran', s: 0, a: 0 } };
  }
  if (h?.m === 12 && h.day <= 10) {
    return { id: 'dhulhijjah', eyebrow: 'THE BEST TEN DAYS', title: 'No days are better for good deeds than these.', body: 'The Prophet ﷺ said there are no days in which good deeds are more beloved to Allah than the first ten days of Dhul Hijjah.', source: 'Sahih al-Bukhari 969' };
  }
  if (d.getDay() === 5 && hour >= 6 && hour < 21) {
    return { id: 'kahf', eyebrow: 'IT’S FRIDAY', title: 'Read Surah al-Kahf today.', body: 'The Prophet ﷺ said whoever reads Surah al-Kahf on Friday will have a light that shines for him from one Friday to the next.', source: 'Al-Hakim and al-Bayhaqi; graded sahih by al-Albani', action: { label: 'Read al-Kahf', s: 18, a: 1 } };
  }
  if (hour >= 1 && hour < 5) {
    return { id: 'night', eyebrow: 'THE LAST PART OF THE NIGHT', title: 'If you’re awake now, this is a special time.', body: 'The Prophet ﷺ said Allah descends to the lowest heaven in the last third of the night and says: “Who is calling upon Me, that I may answer him? Who is asking Me, that I may give him? Who is seeking My forgiveness, that I may forgive him?”', source: 'Sahih al-Bukhari 1145' };
  }
  if (hour >= 5 && hour < 11) {
    return { id: 'morning', eyebrow: 'GOOD MORNING', title: 'Begin the day with this.', ar: 'أَصْبَحْنَا وَأَصْبَحَ الْمُلْكُ لِلَّهِ، وَالْحَمْدُ لِلَّهِ', tl: 'Aṣbaḥnā wa aṣbaḥal-mulku lillāh, wal-ḥamdu lillāh', meaning: 'We have entered the morning, and all sovereignty belongs to Allah, and all praise is for Allah.', body: '', source: 'Sahih Muslim 2723' };
  }
  if (hour >= 11 && hour < 16) {
    return { id: 'midday', eyebrow: 'MIDDAY', title: 'One minute for Allah, in the middle of your day.', body: 'The Prophet ﷺ said: “The deeds most beloved to Allah are those done regularly, even if they are small.”', source: 'Sahih al-Bukhari 6464' };
  }
  if (hour >= 16 && hour < 20) {
    return { id: 'evening', eyebrow: 'GOOD EVENING', title: 'As the day ends, say this.', ar: 'أَمْسَيْنَا وَأَمْسَى الْمُلْكُ لِلَّهِ، وَالْحَمْدُ لِلَّهِ', tl: 'Amsaynā wa amsal-mulku lillāh, wal-ḥamdu lillāh', meaning: 'We have entered the evening, and all sovereignty belongs to Allah, and all praise is for Allah.', body: '', source: 'Sahih Muslim 2723' };
  }
  if (hour >= 21 || hour < 1) {
    return { id: 'sleep', eyebrow: 'BEFORE YOU SLEEP', title: 'Read Ayat al-Kursi.', body: 'The Prophet ﷺ confirmed that whoever recites it when going to bed has a guardian from Allah through the night. Then say: “In Your name, O Allah, I die and I live.”', source: 'Sahih al-Bukhari 2311 · 6324', action: { label: 'Read Ayat al-Kursi', s: 2, a: 255 } };
  }
  return null;
}
