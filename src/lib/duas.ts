import { DUA_TOPICS, DuaTopic } from '@/data/duas';
import { supabase } from './supabase';

/**
 * Find a dua: what someone is going through → situations from Munib's dua library (src/data/duas.ts).
 * With an account, the "duas" edge function asks Claude to choose (from the library only; it never writes a dua).
 * Without one, or if that's unavailable, a simple word match on the phone picks from the same library.
 */

export const topicById = new Map(DUA_TOPICS.map((t) => [t.id, t]));

export type DuaPick = { topic: DuaTopic; why: string };
export type DuaResult = { picks: DuaPick[]; message: string; crisis: boolean; by: 'ai' | 'words' };

// Common situations → library ids, used on the phone (and as quick chips).
const WORDS: [RegExp, number[], string][] = [
  [/anx|worr|stress|overwhelm|panic|nervous|overthink/, [34, 35, 217], 'For worry and a heavy heart'],
  [/sad|grief|griev|depress|low|down|empty|lonely|alone|heartbr|cry/, [34, 30, 35, 53], 'For sadness and grief'],
  [/die|died|death|passed away|lost my|funeral|janaz|bereave/, [53, 57, 207, 208], 'When someone has died'],
  [/debt|money|rent|bills|broke|poor|job|work|unemploy|provision|rizq|income/, [41, 216, 43], 'For money worries and work'],
  [/exam|test|interview|study|school|uni|revision|presentation|speech/, [210, 211, 43], 'For exams and interviews'],
  [/sick|ill|pain|hospital|cancer|surgery|operation|health|disease|hurt/, [124, 212, 49], 'When you or someone is unwell'],
  [/angry|anger|rage|furious|annoyed|temper/, [82, 45], 'When you feel angry'],
  [/sin|guilt|forgive|regret|mistake|repent|ashamed|shame|relapse/, [129, 44, 205, 214], 'For forgiveness'],
  [/scared|afraid|fear|frighten|terrif/, [126, 39, 34], 'When you feel afraid'],
  [/sleep|insomnia|can't sleep|night/, [28, 30, 29], 'Before sleep'],
  [/nightmare|bad dream/, [31, 28], 'After a bad dream'],
  [/decision|decide|choice|choose|istikh|should i/, [26, 217], 'For a decision (istikharah)'],
  [/marr|spouse|wife|husband|nikah|wedding/, [215, 79], 'For marriage'],
  [/child|kid|son|daughter|baby|pregnan|conceive|fertil/, [215, 213, 48, 206], 'For children'],
  [/parent|mum|mom|mother|dad|father/, [208, 207, 218], 'For your parents'],
  [/travel|journey|flight|fly|trip|driving/, [96, 95, 105], 'For travelling'],
  [/bully|enemy|oppress|unfair|injust|wrong(ed)?|abuse|harm me/, [39, 38, 36, 37], 'When someone is wronging you'],
  [/evil eye|jealous|envy|hasad|black magic|sihr/, [125, 45, 128], 'For protection'],
  [/doubt|waswas|whisper|faith|iman|weak/, [40, 45, 204], 'When your faith feels weak'],
  [/fail|disappoint|didn't get|rejected|lost the/, [46, 43], 'When things don’t go your way'],
  [/thank|grateful|happy|good news|alhamd|passed/, [123, 106, 218], 'For good news'],
  [/hard|difficult|struggl|stuck|can't cope/, [43, 203, 202], 'When things feel too hard'],
  [/patien|sabr|wait/, [202, 203, 53], 'For patience'],
];
export const QUICK = WORDS.slice(0, 12).map(([, ids, label]) => ({ ids, label }));

export function matchWords(text: string): DuaPick[] {
  const t = text.toLowerCase();
  const ids: number[] = [];
  for (const [re, list] of WORDS) if (re.test(t)) for (const id of list) if (!ids.includes(id)) ids.push(id);
  if (!ids.length) ids.push(34, 43, 217, 129);
  return ids.slice(0, 4).map((id) => ({ topic: topicById.get(id)!, why: '' })).filter((p) => p.topic);
}
export const picksFor = (ids: number[]): DuaPick[] => ids.map((id) => ({ topic: topicById.get(id)!, why: '' })).filter((p) => p.topic);

const CRISIS = /kill myself|suicid|end (it|my life)|want to die|self.?harm|hurt myself|cut myself|being abused|not safe/i;

export async function findDuas(text: string, signedIn: boolean): Promise<DuaResult> {
  const local = (): DuaResult => ({ picks: matchWords(text), message: '', crisis: CRISIS.test(text), by: 'words' });
  if (!signedIn || !supabase) return local();
  try {
    const { data, error } = await supabase.functions.invoke('duas', { body: { q: text } });
    if (error || !data?.topics?.length) return local();
    const picks = (data.topics as { id: number; why: string }[])
      .map((x) => ({ topic: topicById.get(x.id)!, why: x.why }))
      .filter((p) => p.topic);
    if (!picks.length) return local();
    return { picks, message: data.message ?? '', crisis: !!data.crisis || CRISIS.test(text), by: 'ai' };
  } catch {
    return local();
  }
}
