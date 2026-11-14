import { useColorScheme } from 'react-native';
import { type SkyPhase, useSkyMaybe } from './sky';
import { usePrefsMaybe } from './store';

/** Quiet Modern: soft tinted grounds, one accent per card, ink-dark text. */
export type Tone = { bg: string; accent: string };

const LIGHT_TONES: Tone[] = [
  { bg: '#F1F3EF', accent: '#1F6E52' }, // sage / emerald
  { bg: '#EEF0F5', accent: '#2F4FA3' }, // mist / blue
  { bg: '#F5EEEB', accent: '#A4462F' }, // blush / clay
  { bg: '#E9F1F0', accent: '#1B6868' }, // sea / teal
  { bg: '#F1EEF5', accent: '#6B4AA0' }, // lilac / violet
];
const DARK_TONES: Tone[] = [
  { bg: '#121A16', accent: '#5FC29A' },
  { bg: '#13161F', accent: '#8EA8F0' },
  { bg: '#1C1513', accent: '#E8957A' },
  { bg: '#101A1A', accent: '#5CC0BF' },
  { bg: '#17141F', accent: '#B49AF0' },
];

/** Bright colours for solid cards and icon tiles (white text sits on all of them). */
export type Pop = { emerald: string; coral: string; amber: string; violet: string; sky: string; rose: string; teal: string };
const POP: Pop = { emerald: '#17945F', coral: '#E5544A', amber: '#D9821C', violet: '#6E4FE0', sky: '#2479D6', rose: '#D44683', teal: '#11938F' };

/** Bold ayah grounds: deep and rich but calm, so the recitation keeps the focus. */
const BOLD_TONES: Tone[] = [
  { bg: '#0F2A20', accent: '#6EE0AE' },
  { bg: '#141B35', accent: '#9DB4FF' },
  { bg: '#2B1713', accent: '#FFA488' },
  { bg: '#0D2627', accent: '#6AD7D5' },
  { bg: '#1F1632', accent: '#C3A8FF' },
];

export type Palette = {
  dark: boolean;
  /** True for the bold look: solid colour cards, white buttons. */
  bold: boolean;
  pop: Pop;
  bg: string;
  surface: string;
  line: string;
  text: string;
  muted: string;
  accent: string;
  onAccent: string;
  scrim: string;
  tones: Tone[];
  /** Munib's gold, for fine accents (a star, a hairline, a glow): the thread from the welcome screens into the app. */
  gold: string;
  /** The prayer day: which part it is, and the colour of its light (null when the reader has switched it off). */
  sky: { phase: SkyPhase; glow: string } | null;
};

type Base = Omit<Palette, 'gold' | 'sky'>;
const light: Base = {
  dark: false,
  bold: false,
  pop: POP,
  bg: '#F1F3EF',
  surface: '#FFFFFF',
  line: '#D3D9D4',
  text: '#18201B',
  muted: '#55605A',
  accent: '#1F6E52',
  onAccent: '#FFFFFF',
  scrim: 'rgba(24,32,27,0.34)',
  tones: LIGHT_TONES,
};
const dark: Base = {
  dark: true,
  bold: false,
  pop: POP,
  bg: '#121A16',
  surface: '#1B2520',
  line: '#2E3A34',
  text: '#E9EEE9',
  muted: '#9AA8A0',
  accent: '#5FC29A',
  onAccent: '#0E1512',
  scrim: 'rgba(0,0,0,0.55)',
  tones: DARK_TONES,
};

/** Bold: near-black, white type, bright emerald and solid colour cards (Saj, 14 Nov 2026). */
const bold: Base = {
  dark: true,
  bold: true,
  pop: POP,
  bg: '#0D0F0E',
  surface: '#1A1D1B',
  line: '#2C312E',
  text: '#FFFFFF',
  muted: '#A3ACA7',
  accent: '#3DDC97',
  onAccent: '#05140D',
  scrim: 'rgba(0,0,0,0.62)',
  tones: BOLD_TONES,
};

/** Bold on a light ground (Saj, 14 Nov 2026: "I don't like the black background"): the default. Same bright cards and graphics. */
const boldLight: Base = {
  dark: false,
  bold: true,
  pop: POP,
  bg: '#F2F3EF',
  surface: '#FFFFFF',
  line: '#E1E4DF',
  text: '#111412',
  muted: '#5C6560',
  accent: '#13865A',
  onAccent: '#FFFFFF',
  scrim: 'rgba(17,20,18,0.36)',
  tones: LIGHT_TONES,
};

/** The light of each part of the prayer day: what the grounds lean towards, and the colour of the glow. [light looks, dark looks] */
const SKY: Record<SkyPhase, { tint: [string, string]; glow: [string, string] }> = {
  fajr: { tint: ['#F6DDE3', '#2B1A28'], glow: ['#F2A99B', '#E79A8F'] },
  day: { tint: ['#DFEEF7', '#0F1B24'], glow: ['#9CD0F0', '#5FB4E8'] },
  maghrib: { tint: ['#F9E0C4', '#2C1A0D'], glow: ['#F2A35A', '#F0A050'] },
  isha: { tint: ['#D9DDF3', '#0A0F28'], glow: ['#8E97DC', '#7F8BE0'] },
};

const made = new Map<string, Palette>();
/** The look with the prayer day's light mixed in. Kept, so the same palette object comes back until something changes. */
function withSky(key: string, base: Base, phase: SkyPhase | null): Palette {
  const k = `${key}:${phase ?? 'off'}`;
  const had = made.get(k);
  if (had) return had;
  const gold = base.dark ? '#E2B76A' : '#B8863B';
  let pal: Palette;
  if (!phase) pal = { ...base, gold, sky: null };
  else {
    const i = base.dark ? 1 : 0;
    const tint = SKY[phase].tint[i];
    pal = {
      ...base,
      gold,
      bg: mix(base.bg, tint, base.dark ? 0.55 : 0.6),
      line: mix(base.line, tint, 0.35),
      tones: base.tones.map((t) => ({ bg: mix(t.bg, tint, base.dark ? 0.3 : 0.42), accent: t.accent })),
      sky: { phase, glow: SKY[phase].glow[i] },
    };
  }
  made.set(k, pal);
  return pal;
}

export function usePalette(): Palette {
  const scheme = useColorScheme();
  const prefs = usePrefsMaybe();
  const now = useSkyMaybe();
  const look = prefs?.look ?? 'bold';
  const phase = prefs?.skyLook === false ? null : now;
  if (look === 'bold') return withSky('boldLight', boldLight, phase);
  if (look === 'dark') return withSky('bold', bold, phase);
  if (look === 'light') return withSky('light', light, phase);
  return scheme === 'dark' ? withSky('bold', bold, phase) : withSky('boldLight', boldLight, phase);
}

/** In the bold look, a palette for content sitting on a solid colour card (white type). Unchanged otherwise. */
export function onColour(pal: Palette, c: string): Palette {
  if (!pal.bold) return pal;
  return { ...pal, bg: c, surface: c, text: '#FFFFFF', muted: 'rgba(255,255,255,0.8)', line: 'rgba(255,255,255,0.28)', accent: '#FFFFFF', onAccent: c };
}

/** A stable bright colour for an icon tile, so each row has its own. */
const ICON_POP: Record<string, keyof Pop> = {
  mosque: 'emerald', compass: 'sky', hands: 'violet', beads: 'amber', bell: 'coral', mic: 'rose', people: 'emerald', moon: 'violet',
  pen: 'coral', search: 'sky', user: 'teal', info: 'teal', book: 'emerald', download: 'sky', heart: 'rose', save: 'amber',
  globe: 'sky', speed: 'amber', text: 'violet', play: 'emerald', sliders: 'rose', flag: 'coral', shield: 'teal', out: 'coral', chat: 'violet', tv: 'coral', radio: 'emerald',
};
export const popFor = (pal: Palette, icon: string) => pal.pop[ICON_POP[icon] ?? 'emerald'];

export const fonts = {
  arabic: 'NotoNaskhArabic_400Regular',
  read: 'Literata_400Regular',
  readItalic: 'Literata_400Regular_Italic',
  ui: 'BricolageGrotesque_500Medium',
  uiSemi: 'BricolageGrotesque_600SemiBold',
  uiBold: 'BricolageGrotesque_700Bold',
};

/** Mix a hex colour toward another (0 = a, 1 = b). */
export function mix(a: string, b: string, t: number): string {
  const pa = parseInt(a.slice(1), 16);
  const pb = parseInt(b.slice(1), 16);
  const ch = (p: number, s: number) => (p >> s) & 255;
  const c = (s: number) => Math.round(ch(pa, s) + (ch(pb, s) - ch(pa, s)) * t);
  return '#' + ((1 << 24) | (c(16) << 16) | (c(8) << 8) | c(0)).toString(16).slice(1);
}
