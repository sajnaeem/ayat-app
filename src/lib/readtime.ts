import { useEffect, useState } from 'react';
import { AppState } from 'react-native';

/**
 * How long an ayah has to stay in front of someone before it counts as read (Saj, 16 Nov 2026: "it counts even just
 * opening or briefly hearing an ayah as reading it… needs to be stricter", and one scroll had counted 9 ayat).
 * Roughly the time to read the Arabic at an unhurried pace plus the translation, never less than a few seconds.
 * Ayat on a card or page count one by one as the time for each is reached, so a quick scroll past a long passage
 * counts nothing, and stopping halfway counts only the first half. Hearing an ayah recited to the end also counts it.
 */
const AR_MS = 380; // per Arabic word
const TR_MS = 160; // per translation word (about 375 words a minute, skimming)
export const MIN_AYAH_MS = 3000;
export const MIN_FIRST_MS = 5000; // the first ayah on a card or page, so opening and moving on never counts

const wordCount = (t?: string) => (t ? t.trim().split(/\s+/).filter(Boolean).length : 0);

/** Time to read one ayah, from its Arabic word count and (if shown) its translation. */
export function ayahReadMs(arWords: number, translation?: string) {
  const tr = translation === undefined ? Math.round(arWords * 2.2) : wordCount(translation);
  return Math.max(MIN_AYAH_MS, 1200 + arWords * AR_MS + tr * TR_MS);
}

/** Running totals: ayah i counts once the reader has been on it for cum[i] ms. */
export function cumulative(ms: number[]) {
  let t = 0;
  return ms.map((m, i) => (t += i === 0 ? Math.max(MIN_FIRST_MS, m) : m));
}

/** True while the app is open on screen (reading time doesn't run while the phone is locked or in another app). */
export function useAppActive() {
  const [on, setOn] = useState(AppState.currentState === 'active' || AppState.currentState == null);
  useEffect(() => {
    const sub = AppState.addEventListener('change', (s) => setOn(s === 'active'));
    return () => sub.remove();
  }, []);
  return on;
}
