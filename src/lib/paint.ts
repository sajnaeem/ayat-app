import { useSkyMaybe, type SkyPhase } from './sky';

/**
 * Munib's painted scenes (Saj, 15 Nov 2026: one art style everywhere). Each is painted by scripts/art/paint.py in the
 * light of Fajr, the day, Maghrib and Isha, and the app shows the one for the time it is now, so every picture
 * follows the prayer day. `night` is always the night (Bedtime stories). No people, no lettering.
 */
export type Scene = 'valley' | 'mist' | 'sea' | 'minaret' | 'arch' | 'dunes' | 'garden' | 'olive' | 'night';

const P: Record<Exclude<Scene, 'night'>, Record<SkyPhase, number>> = {
  valley: { fajr: require('../../assets/art/paint/valley-fajr.jpg'), day: require('../../assets/art/paint/valley-day.jpg'), maghrib: require('../../assets/art/paint/valley-maghrib.jpg'), isha: require('../../assets/art/paint/valley-isha.jpg') },
  mist: { fajr: require('../../assets/art/paint/mist-fajr.jpg'), day: require('../../assets/art/paint/mist-day.jpg'), maghrib: require('../../assets/art/paint/mist-maghrib.jpg'), isha: require('../../assets/art/paint/mist-isha.jpg') },
  sea: { fajr: require('../../assets/art/paint/sea-fajr.jpg'), day: require('../../assets/art/paint/sea-day.jpg'), maghrib: require('../../assets/art/paint/sea-maghrib.jpg'), isha: require('../../assets/art/paint/sea-isha.jpg') },
  minaret: { fajr: require('../../assets/art/paint/minaret-fajr.jpg'), day: require('../../assets/art/paint/minaret-day.jpg'), maghrib: require('../../assets/art/paint/minaret-maghrib.jpg'), isha: require('../../assets/art/paint/minaret-isha.jpg') },
  arch: { fajr: require('../../assets/art/paint/arch-fajr.jpg'), day: require('../../assets/art/paint/arch-day.jpg'), maghrib: require('../../assets/art/paint/arch-maghrib.jpg'), isha: require('../../assets/art/paint/arch-isha.jpg') },
  dunes: { fajr: require('../../assets/art/paint/dunes-fajr.jpg'), day: require('../../assets/art/paint/dunes-day.jpg'), maghrib: require('../../assets/art/paint/dunes-maghrib.jpg'), isha: require('../../assets/art/paint/dunes-isha.jpg') },
  garden: { fajr: require('../../assets/art/paint/garden-fajr.jpg'), day: require('../../assets/art/paint/garden-day.jpg'), maghrib: require('../../assets/art/paint/garden-maghrib.jpg'), isha: require('../../assets/art/paint/garden-isha.jpg') },
  olive: { fajr: require('../../assets/art/paint/olive-fajr.jpg'), day: require('../../assets/art/paint/olive-day.jpg'), maghrib: require('../../assets/art/paint/olive-maghrib.jpg'), isha: require('../../assets/art/paint/olive-isha.jpg') },
};
const NIGHT = require('../../assets/art/paint/night-isha.jpg');

export const paintFor = (scene: Scene, phase: SkyPhase) => (scene === 'night' ? NIGHT : P[scene][phase]);

/** The scene in the light of the prayer time it is now. */
export function usePaint(scene: Scene) {
  const phase = useSkyMaybe() ?? 'day';
  return paintFor(scene, phase);
}
