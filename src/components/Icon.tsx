import Svg, { Path } from 'react-native-svg';

const PATHS = {
  heart: 'M12 20s-7-4.4-7-10a4 4 0 0 1 7-2.6A4 4 0 0 1 19 10c0 5.6-7 10-7 10z',
  save: 'M6 3h12v18l-6-4-6 4z',
  share: 'M12 3v12M7 8l5-5 5 5M5 14v6h14v-6',
  play: 'M8 5v14l11-7z',
  pause: 'M8 5v14M16 5v14',
  book: 'M4 5c3-1 6-1 8 1 2-2 5-2 8-1v14c-3-1-6-1-8 1-2-2-5-2-8-1z M12 6v14',
  sound: 'M4 9h4l5-4v14l-5-4H4z M16 9a4 4 0 0 1 0 6 M18.5 6.5a7.5 7.5 0 0 1 0 11',
  mute: 'M4 9h4l5-4v14l-5-4H4z M17 9l5 6 M22 9l-5 6',
  sliders: 'M3 5h12M3 12h8M3 19h12M18 3v4M18 10v4M18 17v4M15 5h6M11 12h10M15 19h6',
  close: 'M6 6l12 12M18 6L6 18',
  info: 'M12 8h.01M11 12h1v5h1 M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18z',
} as const;

export type IconName = keyof typeof PATHS;

export function Icon({ name, size = 24, color, fill = false, strokeWidth = 1.7 }: { name: IconName; size?: number; color: string; fill?: boolean; strokeWidth?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      <Path d={PATHS[name]} stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" fill={fill ? color : 'none'} />
    </Svg>
  );
}
