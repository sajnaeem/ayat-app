import { useEffect, useRef } from 'react';
import { Animated, Easing, StyleSheet, useWindowDimensions, View } from 'react-native';
import Svg, { Defs, Ellipse, LinearGradient, Path, RadialGradient, Rect, Stop } from 'react-native-svg';
import type { Palette } from '@/lib/theme';

/**
 * A heavenly backdrop for the first-open screens (Saj, 14 Nov 2026: "a heavenly aesthetic design to the onboarding"):
 * warm dawn light pouring from above, soft rays, low clouds of light, and small motes of gold drifting upward.
 * Light only, no figures; it sits behind the content and never takes touches.
 */
export const HEAVEN: Partial<Palette> = {
  dark: false,
  bold: false,
  bg: 'transparent',
  surface: 'rgba(255,255,255,0.74)',
  line: 'rgba(185,145,70,0.28)',
  text: '#1F2A36',
  muted: '#5E6875',
  accent: '#B8863B',
  onAccent: '#FFFFFF',
};

/** The palette for heavenly screens: the reader's palette with the heavenly colours on top. */
export const heavenly = (pal: Palette): Palette => ({ ...pal, ...HEAVEN }) as Palette;

const MOTES = Array.from({ length: 16 }, (_, i) => ({
  x: (i * 37 + 11) % 100,
  size: 3 + (i % 4) * 1.5,
  dur: 9000 + (i % 5) * 2200,
  delay: (i * 900) % 8000,
}));

export function HeavenSky() {
  const { width, height } = useWindowDimensions();
  const motes = useRef(MOTES.map(() => new Animated.Value(0))).current;
  const breathe = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const anims = motes.map((v, i) =>
      Animated.loop(
        Animated.sequence([
          Animated.delay(MOTES[i].delay),
          Animated.timing(v, { toValue: 1, duration: MOTES[i].dur, easing: Easing.linear, useNativeDriver: true }),
          Animated.timing(v, { toValue: 0, duration: 0, useNativeDriver: true }),
        ]),
      ),
    );
    anims.forEach((a) => a.start());
    const b = Animated.loop(
      Animated.sequence([
        Animated.timing(breathe, { toValue: 1, duration: 5000, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
        Animated.timing(breathe, { toValue: 0, duration: 5000, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
      ]),
    );
    b.start();
    return () => {
      anims.forEach((a) => a.stop());
      b.stop();
    };
  }, [motes, breathe]);

  const W = width, H = height, cx = W / 2;
  // Rays fanning down from a point just above the screen.
  const rays = [-0.5, -0.28, -0.1, 0.1, 0.3, 0.52].map((k, i) => {
    const spread = 0.06 + (i % 2) * 0.03;
    const x1 = cx + k * W * 1.6 - spread * W, x2 = cx + k * W * 1.6 + spread * W;
    return `M${cx - 6},${-20} L${cx + 6},${-20} L${x2},${H * 0.75} L${x1},${H * 0.75} Z`;
  });

  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      <Svg width={W} height={H}>
        <Defs>
          <LinearGradient id="hv-sky" x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0" stopColor="#FFF4DA" />
            <Stop offset="0.35" stopColor="#FBF6EC" />
            <Stop offset="0.75" stopColor="#F1F3F2" />
            <Stop offset="1" stopColor="#E6EEF4" />
          </LinearGradient>
          <RadialGradient id="hv-sun" cx="50%" cy="0%" rx="75%" ry="45%" fx="50%" fy="0%">
            <Stop offset="0" stopColor="#FFE3A3" stopOpacity="0.95" />
            <Stop offset="0.45" stopColor="#FFEFC8" stopOpacity="0.45" />
            <Stop offset="1" stopColor="#FFF6E2" stopOpacity="0" />
          </RadialGradient>
          <LinearGradient id="hv-ray" x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0" stopColor="#FFFFFF" stopOpacity="0.55" />
            <Stop offset="1" stopColor="#FFFFFF" stopOpacity="0" />
          </LinearGradient>
          <RadialGradient id="hv-cloud" cx="50%" cy="50%" rx="50%" ry="50%">
            <Stop offset="0" stopColor="#FFFFFF" stopOpacity="0.9" />
            <Stop offset="0.6" stopColor="#FFFFFF" stopOpacity="0.45" />
            <Stop offset="1" stopColor="#FFFFFF" stopOpacity="0" />
          </RadialGradient>
        </Defs>
        <Rect x="0" y="0" width={W} height={H} fill="url(#hv-sky)" />
        <Rect x="0" y="0" width={W} height={H * 0.7} fill="url(#hv-sun)" />
        {rays.map((d, i) => (
          <Path key={i} d={d} fill="url(#hv-ray)" opacity={0.35 + (i % 3) * 0.12} />
        ))}
        {/* low clouds of light along the bottom and sides */}
        <Ellipse cx={W * 0.15} cy={H * 0.98} rx={W * 0.55} ry={H * 0.09} fill="url(#hv-cloud)" />
        <Ellipse cx={W * 0.75} cy={H * 1.0} rx={W * 0.6} ry={H * 0.1} fill="url(#hv-cloud)" />
        <Ellipse cx={W * 0.5} cy={H * 0.93} rx={W * 0.45} ry={H * 0.06} fill="url(#hv-cloud)" />
        <Ellipse cx={-W * 0.05} cy={H * 0.55} rx={W * 0.3} ry={H * 0.06} fill="url(#hv-cloud)" />
        <Ellipse cx={W * 1.05} cy={H * 0.42} rx={W * 0.32} ry={H * 0.05} fill="url(#hv-cloud)" />
      </Svg>
      {/* the light above breathes, very slowly */}
      <Animated.View
        style={[styles.halo, { left: cx - W * 0.45, width: W * 0.9, height: W * 0.9, borderRadius: W * 0.45, top: -W * 0.62, opacity: breathe.interpolate({ inputRange: [0, 1], outputRange: [0.35, 0.6] }) }]}
      />
      {MOTES.map((m, i) => (
        <Animated.View
          key={i}
          style={{
            position: 'absolute',
            left: `${m.x}%`,
            bottom: 0,
            width: m.size,
            height: m.size,
            borderRadius: m.size,
            backgroundColor: '#F2C46B',
            shadowColor: '#FFC85A',
            shadowOpacity: 0.9,
            shadowRadius: 5,
            shadowOffset: { width: 0, height: 0 },
            opacity: motes[i].interpolate({ inputRange: [0, 0.1, 0.8, 1], outputRange: [0, 0.75, 0.5, 0] }),
            transform: [
              { translateY: motes[i].interpolate({ inputRange: [0, 1], outputRange: [0, -H * 0.85] }) },
              { translateX: motes[i].interpolate({ inputRange: [0, 0.5, 1], outputRange: [0, i % 2 ? 14 : -14, 0] }) },
            ],
          }}
        />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  halo: { position: 'absolute', backgroundColor: '#FFF1C9', shadowColor: '#FFD27A', shadowOpacity: 1, shadowRadius: 60, shadowOffset: { width: 0, height: 0 } },
});
