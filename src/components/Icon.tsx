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
  chat: 'M4 5h16v11H9l-5 4z',
  chevron: 'M9 6l6 6-6 6',
  ask: 'M4 5h16v11H9l-5 4z M10 9.2a2 2 0 1 1 2.6 1.9c-.4.2-.6.5-.6.9v.5 M12 14.2h.01',
  flag: 'M5 21V4h11l-1.5 4L16 12H5',
  user: 'M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8z M4 20c1.5-3.5 4.5-5 8-5s6.5 1.5 8 5',
  mosque: 'M4 20h16 M6 20v-7h12v7 M7 13a5 5 0 0 1 10 0 M12 5V3 M10 20v-3a2 2 0 0 1 4 0v3',
  bell: 'M6 16V11a6 6 0 0 1 12 0v5l1.5 2h-15z M10 20.5a2 2 0 0 0 4 0',
  globe: 'M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18z M3 12h18 M12 3c2.5 2.6 3.7 5.6 3.7 9s-1.2 6.4-3.7 9c-2.5-2.6-3.7-5.6-3.7-9S9.5 5.6 12 3z',
  mic: 'M12 3a3 3 0 0 0-3 3v6a3 3 0 0 0 6 0V6a3 3 0 0 0-3-3z M6 11a6 6 0 0 0 12 0 M12 17v4',
  pen: 'M4 20l1-4L16 5l3 3L8 19z M14 7l3 3',
  shield: 'M12 3l7 3v5c0 4.5-3 8-7 10-4-2-7-5.5-7-10V6z',
  out: 'M10 5H5v14h5 M15 8l4 4-4 4 M19 12H9',
  check: 'M5 12.5l4.5 4.5L19 7.5',
} as const;

export type IconName = keyof typeof PATHS;

export function Icon({ name, size = 24, color, fill = false, strokeWidth = 1.7 }: { name: IconName; size?: number; color: string; fill?: boolean; strokeWidth?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      <Path d={PATHS[name]} stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" fill={fill ? color : 'none'} />
    </Svg>
  );
}
