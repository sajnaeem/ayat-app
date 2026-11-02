import { Redirect, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { SURAHS } from '@/lib/quran';
import { usePrefs } from '@/lib/store';

/**
 * A shared ayah link (getmunib.com/93/1 or /93/1-4) opens the app here:
 * go to the Quran tab at that ayah, then show the feed. Unknown links just open the feed.
 */
export default function OpenSharedAyah() {
  const { s, a } = useLocalSearchParams<{ s: string; a: string }>();
  const prefs = usePrefs();
  const [done, setDone] = useState(false);
  useEffect(() => {
    const sn = Number(s), an = Number(String(a ?? '1').split('-')[0]);
    if (Number.isInteger(sn) && sn >= 1 && sn <= 114 && Number.isInteger(an) && an >= 1 && an <= SURAHS[sn - 1][3]) prefs.readAt(sn, an);
    setDone(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  return done ? <Redirect href="/" /> : null;
}
