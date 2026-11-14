import { useEffect, useRef } from 'react';
import { Animated, Easing, StyleSheet, View } from 'react-native';
import Svg, { Circle, Defs, Path, RadialGradient, Stop } from 'react-native-svg';
import type { Palette } from '@/lib/theme';

/**
 * Munib's gold thread (Saj, 14 Nov 2026: carry the welcome screens' gold and serif into the app): the eight-point
 * star, a fine flourish for under a screen's title, and the star that glows while Ask is thinking.
 */
const star8 = (c: number, r: number, inner = 0.62) => {
  let d = '';
  for (let i = 0; i < 16; i++) {
    const a = (Math.PI / 8) * i - Math.PI / 2;
    const rr = i % 2 ? r * inner : r;
    d += `${i ? 'L' : 'M'} ${(c + Math.cos(a) * rr).toFixed(2)} ${(c + Math.sin(a) * rr).toFixed(2)} `;
  }
  return d + 'Z';
};

export function GoldStar({ size = 14, color, outline }: { size?: number; color: string; outline?: boolean }) {
  return (
    <Svg width={size} height={size}>
      <Path d={star8(size / 2, size / 2 - 0.8)} fill={outline ? 'none' : color} stroke={color} strokeWidth={outline ? 1.2 : 0} strokeLinejoin="round" />
    </Svg>
  );
}

/** A fine gold line, a star, a line: sits under a screen's serif title. */
export function Flourish({ pal, width = 76 }: { pal: Palette; width?: number }) {
  const line = { height: StyleSheet.hairlineWidth * 2, flex: 1, backgroundColor: pal.gold, opacity: 0.55 };
  return (
    <View style={{ width, flexDirection: 'row', alignItems: 'center', gap: 6 }} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
      <View style={line} />
      <GoldStar size={11} color={pal.gold} />
      <View style={line} />
    </View>
  );
}

/** The star while Ask is thinking: it turns slowly and its light breathes. */
export function ThinkingStar({ pal, size = 34 }: { pal: Palette; size?: number }) {
  const t = useRef(new Animated.Value(0)).current;
  const g = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    const spin = Animated.loop(Animated.timing(t, { toValue: 1, duration: 7000, easing: Easing.linear, useNativeDriver: true }));
    const glow = Animated.loop(
      Animated.sequence([
        Animated.timing(g, { toValue: 1, duration: 1100, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
        Animated.timing(g, { toValue: 0, duration: 1100, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
      ]),
    );
    spin.start();
    glow.start();
    return () => {
      spin.stop();
      glow.stop();
    };
  }, [t, g]);
  const halo = size * 2.2;
  return (
    <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
      <Animated.View style={{ position: 'absolute', opacity: g.interpolate({ inputRange: [0, 1], outputRange: [0.35, 0.95] }), transform: [{ scale: g.interpolate({ inputRange: [0, 1], outputRange: [0.85, 1.1] }) }] }}>
        <Svg width={halo} height={halo}>
          <Defs>
            <RadialGradient id="think-halo" cx="50%" cy="50%" r="50%">
              <Stop offset="0" stopColor={pal.gold} stopOpacity="0.55" />
              <Stop offset="1" stopColor={pal.gold} stopOpacity="0" />
            </RadialGradient>
          </Defs>
          <Circle cx={halo / 2} cy={halo / 2} r={halo / 2} fill="url(#think-halo)" />
        </Svg>
      </Animated.View>
      <Animated.View style={{ transform: [{ rotate: t.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '360deg'] }) }] }}>
        <GoldStar size={size * 0.7} color={pal.gold} />
      </Animated.View>
    </View>
  );
}
