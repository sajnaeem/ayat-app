import { useEffect, useRef } from 'react';
import { Animated, Easing, Platform, StyleSheet, useWindowDimensions } from 'react-native';
import Svg, { Defs, RadialGradient, Rect, Stop } from 'react-native-svg';
import type { Palette } from '@/lib/theme';

/**
 * The light of the prayer day at the top of a screen: a soft glow from above in the colour of the sky right now
 * (rose at dawn, clear blue by day, amber at sunset, moonlit at night), slowly breathing. Light only, nothing drawn,
 * and it never takes touches. Shows nothing when the reader has switched "Follow the prayer day" off.
 */
export function SkyWash({ pal, height = 320, strength = 1 }: { pal: Palette; height?: number; strength?: number }) {
  const { width } = useWindowDimensions();
  const w = Platform.OS === 'web' ? Math.min(width, 520) : width;
  const breathe = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    const a = Animated.loop(
      Animated.sequence([
        Animated.timing(breathe, { toValue: 1, duration: 5200, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
        Animated.timing(breathe, { toValue: 0, duration: 5200, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
      ]),
    );
    a.start();
    return () => a.stop();
  }, [breathe]);
  if (!pal.sky) return null;
  const id = `skywash-${pal.sky.phase}-${pal.dark ? 'd' : 'l'}`;
  const top = (pal.dark ? 0.5 : 0.62) * strength;
  return (
    <Animated.View pointerEvents="none" style={[styles.wash, { height, opacity: breathe.interpolate({ inputRange: [0, 1], outputRange: [0.78, 1] }) }]}>
      <Svg width={w} height={height}>
        <Defs>
          <RadialGradient id={id} cx={w * 0.5} cy={-height * 0.25} rx={w * 0.95} ry={height * 1.2} gradientUnits="userSpaceOnUse">
            <Stop offset="0" stopColor={pal.sky.glow} stopOpacity={top} />
            <Stop offset="0.55" stopColor={pal.sky.glow} stopOpacity={top * 0.32} />
            <Stop offset="1" stopColor={pal.sky.glow} stopOpacity="0" />
          </RadialGradient>
        </Defs>
        <Rect x={0} y={0} width={w} height={height} fill={`url(#${id})`} />
      </Svg>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  wash: { position: 'absolute', left: 0, right: 0, top: 0 },
});
