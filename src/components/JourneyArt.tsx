import { useEffect, useRef } from 'react';
import { Animated, Easing, StyleSheet, Text, View } from 'react-native';
import Svg, { Circle, Defs, Line, Path, Polyline, RadialGradient, Stop } from 'react-native-svg';
import { fonts } from '@/lib/theme';

/**
 * Fine gold line drawings and the "From far to near" path for the first-open questions (Saj, 14 Nov 2026, from another
 * app's onboarding: a named journey instead of progress dashes, hand-drawn line art, a pause between questions).
 * Drawn here with SVG strokes: objects, light and pattern only.
 */
const GOLD = '#B8863B';

/** The journey's progress: a wavy line that settles into a straight one and ends at a crescent. p is 0..1. */
export function FarToNear({ p, width = 200 }: { p: number; width?: number }) {
  const H = 26, end = width - 22;
  // Restless at first, calmer and calmer, then straight: y wobbles less as x grows.
  const pts: [number, number][] = [];
  for (let i = 0; i <= 60; i++) {
    const x = (i / 60) * end;
    const calm = Math.max(0, 1 - x / (end * 0.72));
    pts.push([x, H / 2 + Math.sin(x / 7) * 7 * calm * calm]);
  }
  const k = Math.max(0, Math.min(60, Math.round(p * 60)));
  const done = pts.slice(0, k + 1);
  const dot = pts[k];
  const str = (a: [number, number][]) => a.map(([x, y]) => `${x.toFixed(1)},${y.toFixed(1)}`).join(' ');
  return (
    <View style={{ alignItems: 'center', gap: 2 }} accessibilityLabel={`From far to near: ${Math.round(p * 100)} percent of the way`}>
      <Text style={styles.eyebrow}>From far to near</Text>
      <Svg width={width} height={H}>
        <Polyline points={str(pts)} fill="none" stroke="rgba(184,134,59,0.28)" strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round" />
        {done.length > 1 && <Polyline points={str(done)} fill="none" stroke={GOLD} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />}
        <Circle cx={dot[0]} cy={dot[1]} r={4} fill={GOLD} />
        {/* the crescent at the end of the road */}
        <Path d={`M ${width - 6} ${H / 2 - 8} a 9 9 0 1 0 0 16 a 7 7 0 1 1 0 -16 Z`} fill={p >= 1 ? GOLD : 'rgba(184,134,59,0.45)'} />
      </Svg>
    </View>
  );
}

/** A pointed arch (mihrab) with a lantern hanging in it, drawn in gold line, the lantern's light slowly breathing. */
export function ArchLantern({ size = 180 }: { size?: number }) {
  const glow = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    const a = Animated.loop(
      Animated.sequence([
        Animated.timing(glow, { toValue: 1, duration: 2200, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
        Animated.timing(glow, { toValue: 0, duration: 2200, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
      ]),
    );
    a.start();
    return () => a.stop();
  }, [glow]);
  const w = size, h = size * 1.15;
  const arch = (inset: number) => {
    const l = inset, r = w - inset, top = inset * 1.1, spring = h * 0.42;
    return `M ${l} ${h} L ${l} ${spring} Q ${l} ${top + 20} ${w / 2} ${top} Q ${r} ${top + 20} ${r} ${spring} L ${r} ${h}`;
  };
  const lx = w / 2, ly = h * 0.5;
  return (
    <View style={{ width: w, height: h, alignSelf: 'center' }}>
      <Animated.View style={[StyleSheet.absoluteFill, { opacity: glow.interpolate({ inputRange: [0, 1], outputRange: [0.45, 0.9] }) }]}>
        <Svg width={w} height={h}>
          <Defs>
            <RadialGradient id="lantern-glow" cx={lx} cy={ly + 14} rx={w * 0.4} ry={w * 0.4} gradientUnits="userSpaceOnUse">
              <Stop offset="0" stopColor="#FFD98A" stopOpacity="0.85" />
              <Stop offset="1" stopColor="#FFE7B0" stopOpacity="0" />
            </RadialGradient>
          </Defs>
          <Circle cx={lx} cy={ly + 14} r={w * 0.4} fill="url(#lantern-glow)" />
        </Svg>
      </Animated.View>
      <Svg width={w} height={h}>
        <Path d={arch(4)} fill="none" stroke={GOLD} strokeWidth={1.6} />
        <Path d={arch(16)} fill="none" stroke={GOLD} strokeWidth={1} opacity={0.6} />
        {/* the chain */}
        <Line x1={lx} y1={h * 0.12} x2={lx} y2={ly - 18} stroke={GOLD} strokeWidth={1} />
        {/* the lantern: cap, body with ribs, base */}
        <Path d={`M ${lx - 6} ${ly - 18} L ${lx + 6} ${ly - 18} L ${lx + 12} ${ly - 8} L ${lx - 12} ${ly - 8} Z`} fill="none" stroke={GOLD} strokeWidth={1.4} strokeLinejoin="round" />
        <Path d={`M ${lx - 12} ${ly - 8} L ${lx - 15} ${ly + 22} L ${lx + 15} ${ly + 22} L ${lx + 12} ${ly - 8}`} fill="rgba(255,214,140,0.35)" stroke={GOLD} strokeWidth={1.4} strokeLinejoin="round" />
        <Line x1={lx} y1={ly - 8} x2={lx} y2={ly + 22} stroke={GOLD} strokeWidth={0.8} opacity={0.7} />
        <Line x1={lx - 6} y1={ly - 8} x2={lx - 7.5} y2={ly + 22} stroke={GOLD} strokeWidth={0.6} opacity={0.5} />
        <Line x1={lx + 6} y1={ly - 8} x2={lx + 7.5} y2={ly + 22} stroke={GOLD} strokeWidth={0.6} opacity={0.5} />
        <Path d={`M ${lx - 15} ${ly + 22} L ${lx - 8} ${ly + 30} L ${lx + 8} ${ly + 30} L ${lx + 15} ${ly + 22}`} fill="none" stroke={GOLD} strokeWidth={1.4} strokeLinejoin="round" />
        <Circle cx={lx} cy={ly + 34} r={2} fill={GOLD} />
        {/* a flame */}
        <Path d={`M ${lx} ${ly + 2} Q ${lx + 5} ${ly + 10} ${lx} ${ly + 15} Q ${lx - 5} ${ly + 10} ${lx} ${ly + 2} Z`} fill="#E9A23B" />
        {/* small stars either side */}
        {[[w * 0.24, h * 0.3], [w * 0.78, h * 0.36], [w * 0.3, h * 0.62], [w * 0.72, h * 0.66]].map(([x, y], i) => (
          <Path key={i} d={`M ${x} ${y - 4} L ${x + 1} ${y - 1} L ${x + 4} ${y} L ${x + 1} ${y + 1} L ${x} ${y + 4} L ${x - 1} ${y + 1} L ${x - 4} ${y} L ${x - 1} ${y - 1} Z`} fill={GOLD} opacity={0.7} />
        ))}
      </Svg>
    </View>
  );
}

const styles = StyleSheet.create({
  eyebrow: { fontFamily: fonts.read, fontSize: 12.5, color: '#8A6A35', letterSpacing: 0.2 },
});
