import { memo } from 'react';
import { StyleSheet, View } from 'react-native';
import Svg, { Circle, Path } from 'react-native-svg';

/** An eight-point star (two overlapping squares) inside a circle, the same motif as the app icon. */
function starPath(c: number, h: number) {
  const r = h * Math.SQRT2;
  const sq = (a: number) =>
    [0, 1, 2, 3].map((i) => `${i ? 'L' : 'M'}${(c + r * Math.cos(a + (i * Math.PI) / 2)).toFixed(1)} ${(c + r * Math.sin(a + (i * Math.PI) / 2)).toFixed(1)}`).join('') + 'Z';
  return sq(Math.PI / 4) + sq(0);
}

function Star({ size, color, opacity }: { size: number; color: string; opacity: number }) {
  const c = size / 2;
  const h = size * 0.3;
  return (
    <Svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
      <Path d={starPath(c, h)} stroke={color} strokeOpacity={opacity} strokeWidth={1.4} fill="none" strokeLinejoin="round" />
      <Path d={starPath(c, h * 0.62)} stroke={color} strokeOpacity={opacity * 0.8} strokeWidth={1} fill="none" strokeLinejoin="round" />
      <Circle cx={c} cy={c} r={h * 0.72} stroke={color} strokeOpacity={opacity * 0.8} strokeWidth={1} fill="none" />
    </Svg>
  );
}

/** A faint geometric motif in two corners of a card, in that card's colour. Decorative only. */
export const Pattern = memo(function Pattern({ color, top }: { color: string; top: number }) {
  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none" accessible={false} importantForAccessibility="no-hide-descendants">
      <View style={{ position: 'absolute', top: top - 40, right: -90 }}>
        <Star size={300} color={color} opacity={0.16} />
      </View>
      <View style={{ position: 'absolute', bottom: -70, left: -80 }}>
        <Star size={220} color={color} opacity={0.11} />
      </View>
    </View>
  );
});
