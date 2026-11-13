import { LEARN, LearnSurah } from '@/data/learn';
import type { Progress } from './progress';

/** Learning short surahs for prayer: a surah counts as learned when every ayah in it is marked memorised. */

export const learnedAyat = (p: Progress, l: LearnSurah) => l.ayat.filter((_, i) => p.mem[`${l.s}:${i + 1}`]).length;
export const isLearned = (p: Progress, l: LearnSurah) => learnedAyat(p, l) === l.ayat.length;
export const learnedCount = (p: Progress) => LEARN.filter((l) => isLearned(p, l)).length;
/** The first surah on the path not learned yet. */
export const nextToLearn = (p: Progress) => LEARN.find((l) => !isLearned(p, l)) ?? null;
export const learnSurah = (s: number) => LEARN.find((l) => l.s === s) ?? null;
