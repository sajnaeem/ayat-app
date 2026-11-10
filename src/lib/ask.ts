import { supabase } from '@/lib/supabase';

/** "Ask about this ayah": an answer explained from Tafsir Ibn Kathir and the ayat around it (supabase/functions/ask). */
export type AskResult = { answer: string } | { error: 'limit' | 'off' | 'failed'; perDay?: number };

export async function askAyah(s: number, a: number, q: string): Promise<AskResult> {
  if (!supabase) return { error: 'failed' };
  const { data, error } = await supabase.functions.invoke('ask', { body: { s, a, q } });
  if (error || !data) return { error: 'failed' };
  if (typeof data.answer === 'string') return { answer: data.answer };
  if (data.error === 'limit') return { error: 'limit', perDay: data.perDay };
  if (data.error === 'off') return { error: 'off' };
  return { error: 'failed' };
}

/** Ideas shown before someone types their own question. Must match STARTERS in supabase/functions/ask (their answers are cached). */
export const ASK_STARTERS = ['What does this ayah mean?', 'What was happening when it was revealed?', 'How can I live by this today?'];

/** Send a wrong or worrying answer to us (feedback table), only when the reader chooses to. */
export async function reportAnswer(userId: string, key: string, q: string, answer: string): Promise<void> {
  if (!supabase) throw new Error('offline');
  const { error } = await supabase.from('feedback').insert({
    user_id: userId,
    kind: 'bug',
    message: `Ask about ${key} — answer reported\n\nQuestion: ${q}\n\nAnswer: ${answer}`.slice(0, 4000),
    meta: { source: 'ask', key },
  });
  if (error) throw error;
}
