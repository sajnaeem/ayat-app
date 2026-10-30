import { useColorScheme } from 'react-native';

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

export type Palette = {
  dark: boolean;
  bg: string;
  surface: string;
  line: string;
  text: string;
  muted: string;
  accent: string;
  onAccent: string;
  scrim: string;
  tones: Tone[];
};

const light: Palette = {
  dark: false,
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
const dark: Palette = {
  dark: true,
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

export function usePalette(): Palette {
  return useColorScheme() === 'dark' ? dark : light;
}

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
