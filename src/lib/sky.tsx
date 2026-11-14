import { createContext, ReactNode, useContext, useEffect, useState } from 'react';
import { AppState } from 'react-native';
import { calcDay } from './prayertimes';
import { usePrefsMaybe } from './store';

/**
 * The part of the prayer day it is now (Saj, 14 Nov 2026: "an app that follows the prayer day"). The Prayer and Quran
 * heroes already showed the sky as it is; this shares the same phase with the whole app, so the grounds, the tab bar
 * and a soft light at the top of each screen shift with it: rose at dawn, clear by day, amber at sunset, moonlit at night.
 * From today's prayer times when the reader has set them up, otherwise from the clock.
 */
export type SkyPhase = 'fajr' | 'day' | 'maghrib' | 'isha';

/** Which sky to show: from today's prayer times when we have them, otherwise from the clock. */
export function skyPhase(now: Date, t?: { fajr: Date; sunrise: Date; maghrib: Date; isha: Date } | null): SkyPhase {
  if (t) {
    const n = now.getTime();
    if (n < t.fajr.getTime() || n >= t.isha.getTime()) return 'isha';
    if (n < t.sunrise.getTime() + 45 * 60000) return 'fajr';
    if (n >= t.maghrib.getTime() - 50 * 60000) return 'maghrib';
    return 'day';
  }
  const h = now.getHours() + now.getMinutes() / 60;
  return h < 4.5 || h >= 20 ? 'isha' : h < 7.5 ? 'fajr' : h >= 16.5 ? 'maghrib' : 'day';
}

export const SKY_NAME: Record<SkyPhase, string> = { fajr: 'Dawn', day: 'Day', maghrib: 'Sunset', isha: 'Night' };

const C = createContext<SkyPhase | null>(null);

export function SkyProvider({ children }: { children: ReactNode }) {
  const prefs = usePrefsMaybe();
  const prayer = prefs?.prayer;
  const work = () => {
    // For checking each look on the web: ?sky=fajr (never set on a phone).
    const forced = typeof window !== 'undefined' && typeof window.location?.search === 'string' ? /[?&]sky=(fajr|day|maghrib|isha)/.exec(window.location.search)?.[1] : null;
    if (forced) return forced as SkyPhase;
    let times = null;
    try {
      times = prayer?.loc ? (calcDay(prayer)?.times ?? null) : null;
    } catch {}
    return skyPhase(new Date(), times);
  };
  const [phase, setPhase] = useState<SkyPhase>(work);
  useEffect(() => {
    const tick = () => setPhase(work());
    tick();
    const t = setInterval(tick, 60000);
    const sub = AppState.addEventListener('change', (s) => s === 'active' && tick());
    return () => {
      clearInterval(t);
      sub.remove();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [prayer]);
  return <C.Provider value={phase}>{children}</C.Provider>;
}

/** The phase now, or null outside the provider. */
export const useSkyMaybe = () => useContext(C);
