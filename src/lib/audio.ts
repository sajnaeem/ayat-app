export type ReciterId = 'alafasy' | 'sudais' | 'husary' | 'minshawi';

export const RECITERS: { id: ReciterId; name: string; note: string; folder: string }[] = [
  { id: 'alafasy', name: 'Mishary Alafasy', note: 'Clear, melodic', folder: 'Alafasy_128kbps' },
  { id: 'sudais', name: 'Abdur-Rahman as-Sudais', note: 'Imam of Masjid al-Haram', folder: 'Abdurrahmaan_As-Sudais_192kbps' },
  { id: 'husary', name: 'Mahmoud Khalil al-Husary', note: 'Slow and precise, ideal for learners', folder: 'Husary_128kbps' },
  { id: 'minshawi', name: 'Muhammad Siddiq al-Minshawi', note: 'Moving, classical', folder: 'Minshawy_Murattal_128kbps' },
];

const pad = (n: number) => String(n).padStart(3, '0');

/**
 * Per-ayah MP3 for a reciter. Source for now: EveryAyah.com.
 * The production build swaps this for the Quran Foundation API, which adds word-by-word timings.
 */
export function ayahAudioUrl(reciter: ReciterId, surah: number, ayah: number): string {
  const r = RECITERS.find((x) => x.id === reciter) ?? RECITERS[0];
  return `https://everyayah.com/data/${r.folder}/${pad(surah)}${pad(ayah)}.mp3`;
}
