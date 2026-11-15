import { useEffect, useRef } from 'react';
import { Animated, Easing, StyleSheet, useWindowDimensions, View } from 'react-native';
import Svg, { Circle, Defs, G, Path, RadialGradient, Rect, Stop } from 'react-native-svg';
import type { Palette } from '@/lib/theme';

/**
 * Jewel screens (Saj, 15 Nov 2026: "a visually striking design for the tasbeeh and qibla features"): a deep, rich
 * colour ground lit from above, a faint eight-point star lattice, a few slow stars, and gold. Tasbeeh is emerald,
 * Qibla is the twilight sky. Colour, not black. Decoration only: it never takes touches.
 */
export const GOLD = '#E9C77B';
export const GOLD_DEEP = '#B88A3A';
export const GOLD_LIGHT = '#FBEFC9';

export type JewelLook = { top: string; mid: string; low: string; glow: string };
export const EMERALD: JewelLook = { top: '#1F8A66', mid: '#0E5A44', low: '#06302A', glow: '#7BE3B8' };
export const TWILIGHT: JewelLook = { top: '#3A4FA3', mid: '#1E2A6B', low: '#0E1440', glow: '#9DB4FF' };

/** The reader's palette with the jewel colours on top, for shared pieces (the "New to this?" card, sheets' triggers). */
export const jewelPalette = (pal: Palette): Palette =>
  ({
    ...pal,
    dark: true,
    bold: false,
    bg: 'transparent',
    surface: 'rgba(255,255,255,0.1)',
    line: 'rgba(255,255,255,0.2)',
    text: '#FFFFFF',
    muted: 'rgba(255,255,255,0.72)',
    accent: GOLD,
    onAccent: '#1D1503',
  }) as Palette;

/** An eight-point star path centred on (cx, cy). */
export const star8 = (cx: number, cy: number, r: number, inner = 0.62, turn = 0) => {
  let d = '';
  for (let i = 0; i < 16; i++) {
    const a = (Math.PI / 8) * i - Math.PI / 2 + turn;
    const rr = i % 2 ? r * inner : r;
    d += `${i ? 'L' : 'M'} ${(cx + Math.cos(a) * rr).toFixed(2)} ${(cy + Math.sin(a) * rr).toFixed(2)} `;
  }
  return d + 'Z';
};

const STARS = Array.from({ length: 26 }, (_, i) => ({
  x: (i * 53 + 17) % 100,
  y: (i * 29 + 7) % 62,
  r: 0.7 + (i % 4) * 0.35,
  set: i % 3,
}));

export function JewelGround({ look, stars = true }: { look: JewelLook; stars?: boolean }) {
  const { width, height } = useWindowDimensions();
  const twinkle = useRef([0, 1, 2].map(() => new Animated.Value(0))).current;
  useEffect(() => {
    const loops = twinkle.map((v, i) =>
      Animated.loop(
        Animated.sequence([
          Animated.delay(i * 900),
          Animated.timing(v, { toValue: 1, duration: 2600 + i * 700, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
          Animated.timing(v, { toValue: 0, duration: 2600 + i * 700, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
        ]),
      ),
    );
    loops.forEach((l) => l.start());
    return () => loops.forEach((l) => l.stop());
  }, [twinkle]);

  // The lattice: rows of star outlines, offset like tilework.
  const step = 92;
  const lattice: string[] = [];
  for (let y = 0, row = 0; y < height + step; y += step * 0.86, row++)
    for (let x = row % 2 ? step / 2 : 0; x < width + step; x += step) lattice.push(star8(x, y, 30, 0.7));

  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none" accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
      <Svg width={width} height={height} style={StyleSheet.absoluteFill}>
        <Defs>
          <RadialGradient id="jg" cx="50%" cy="18%" rx="95%" ry="80%" fx="50%" fy="10%">
            <Stop offset="0" stopColor={look.top} />
            <Stop offset="0.5" stopColor={look.mid} />
            <Stop offset="1" stopColor={look.low} />
          </RadialGradient>
          <RadialGradient id="jl" cx="50%" cy="0%" rx="70%" ry="45%">
            <Stop offset="0" stopColor={look.glow} stopOpacity={0.34} />
            <Stop offset="1" stopColor={look.glow} stopOpacity={0} />
          </RadialGradient>
        </Defs>
        <Rect width={width} height={height} fill="url(#jg)" />
        <Rect width={width} height={height} fill="url(#jl)" />
        <G opacity={0.07}>
          {lattice.map((d, i) => (
            <Path key={i} d={d} fill="none" stroke="#FFFFFF" strokeWidth={1.1} />
          ))}
        </G>
      </Svg>
      {stars &&
        [0, 1, 2].map((set) => (
          <Animated.View key={set} style={[StyleSheet.absoluteFill, { opacity: twinkle[set].interpolate({ inputRange: [0, 1], outputRange: [0.25, 0.95] }) }]}>
            <Svg width={width} height={height}>
              {STARS.filter((s) => s.set === set).map((s, i) => (
                <Circle key={i} cx={(s.x / 100) * width} cy={(s.y / 100) * height} r={s.r} fill="#FFFFFF" />
              ))}
            </Svg>
          </Animated.View>
        ))}
    </View>
  );
}

export const jewel = StyleSheet.create({
  glass: { backgroundColor: 'rgba(255,255,255,0.1)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.2)' },
  round: { width: 38, height: 38, borderRadius: 19, alignItems: 'center', justifyContent: 'center' },
});
