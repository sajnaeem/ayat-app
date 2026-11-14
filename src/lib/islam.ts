import { supabase } from '@/lib/supabase';

/**
 * The Ask tab (Saj, 14 Nov 2026): questions about Islam, answered by the "islam" edge function from Munib's own checked
 * library, the Quran and Tafsir Ibn Kathir only, with numbered sources. Nothing is stored: the conversation lives in
 * memory on the phone until the screen is left.
 */
export type IslamSource = { n: number; id: string; label: string; src: string; s?: number; a?: number };
export type IslamAnswer = { answer: string; sources: IslamSource[]; crisis: boolean };
export type IslamResult = IslamAnswer | { error: 'limit' | 'off' | 'failed'; perDay?: number };

export async function askIslam(q: string, history: { q: string; a: string }[]): Promise<IslamResult> {
  if (!supabase) return { error: 'failed' };
  const { data, error } = await supabase.functions.invoke('islam', { body: { q, history: history.slice(-3) } });
  if (error || !data) return { error: 'failed' };
  if (typeof data.answer === 'string') return { answer: data.answer, sources: Array.isArray(data.sources) ? data.sources : [], crisis: !!data.crisis };
  if (data.error === 'limit') return { error: 'limit', perDay: data.perDay };
  if (data.error === 'off') return { error: 'off' };
  return { error: 'failed' };
}

/** Starter questions, for people who don't know where to begin. */
export const ISLAM_STARTERS: { title: string; qs: string[] }[] = [
  {
    title: 'New to Islam',
    qs: ['What do I say when I pray?', 'Do I have to change my name?', 'How do I tell my family I’ve become Muslim?', 'What if I make mistakes in my prayer?'],
  },
  {
    title: 'Coming back',
    qs: ['I haven’t prayed in years. How do I start again?', 'Will Allah forgive what I did before?', 'How can I make the Quran a habit?'],
  },
  {
    title: 'Understanding',
    qs: ['What is the Quran?', 'Why do Muslims fast in Ramadan?', 'What is dua, and how do I make it?', 'What happens after we die?'],
  },
];
