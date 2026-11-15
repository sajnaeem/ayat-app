import { useEffect, useRef, useState } from 'react';
import { Animated, Easing, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import { GoldStar } from '@/components/Gold';
import { fonts } from '@/lib/theme';

/**
 * Confetti for a finished list of daily deeds (Saj, 15 Nov 2026: "confetti when the entire list is done", with
 * MashaAllah). Munib's own colours (gold, emerald, cream) and a few eight-point stars, falling once for about three
 * seconds over whatever is on screen, with "MashaAllah" in the middle. It never takes touches.
 * `fireConfetti(line)` from anywhere; `ConfettiHost` sits once in the root layout.
 */
let fire: ((line: string) => void) | null = null;
export const fireConfetti = (line: string) => fire?.(line);

const COLOURS = ['#E9C77B', '#B88A3A', '#1F8A66', '#13865A', '#F7F1E1', '#7BE3B8'];
const N = 70;

export function ConfettiHost() {
  const { width, height } = useWindowDimensions();
  const [run, setRun] = useState<{ id: number; line: string } | null>(null);
  const t = useRef(new Animated.Value(0)).current;
  const pieces = useRef(
    Array.from({ length: N }, (_, i) => {
      const r = (k: number) => ((Math.sin(i * 12.9898 + k * 78.233) * 43758.5453) % 1 + 1) % 1;
      return { x: r(1), drift: (r(2) - 0.5) * 0.3, delay: r(3) * 0.35, spin: (r(4) - 0.5) * 8, size: 7 + r(5) * 7, colour: COLOURS[i % COLOURS.length], star: i % 6 === 0, tall: r(6) > 0.5 };
    }),
  ).current;

  useEffect(() => {
    fire = (line) => setRun({ id: Date.now(), line });
    return () => {
      fire = null;
    };
  }, []);

  useEffect(() => {
    if (!run) return;
    t.setValue(0);
    Animated.timing(t, { toValue: 1, duration: 3400, easing: Easing.linear, useNativeDriver: true }).start(({ finished }) => finished && setRun(null));
  }, [run, t]);

  if (!run) return null;
  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none" accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
      {pieces.map((p, i) => {
        const from = p.delay;
        const to = Math.min(1, p.delay + 0.62);
        return (
          <Animated.View
            key={i}
            style={{
              position: 'absolute',
              left: p.x * width,
              top: -24,
              opacity: t.interpolate({ inputRange: [0, from, from + 0.02, to - 0.08, to, 1], outputRange: [0, 0, 1, 1, 0, 0] }),
              transform: [
                { translateY: t.interpolate({ inputRange: [0, from, to, 1], outputRange: [0, 0, height + 40, height + 40] }) },
                { translateX: t.interpolate({ inputRange: [0, from, to, 1], outputRange: [0, 0, p.drift * width, p.drift * width] }) },
                { rotate: t.interpolate({ inputRange: [0, 1], outputRange: ['0rad', `${p.spin * 3}rad`] }) },
              ],
            }}
          >
            {p.star ? <GoldStar size={p.size + 5} color="#E9C77B" /> : <View style={{ width: p.size, height: p.tall ? p.size * 1.7 : p.size, borderRadius: p.tall ? 2 : p.size / 2, backgroundColor: p.colour }} />}
          </Animated.View>
        );
      })}
      <Animated.View
        style={[
          styles.centre,
          {
            opacity: t.interpolate({ inputRange: [0, 0.08, 0.72, 0.9, 1], outputRange: [0, 1, 1, 0, 0] }),
            transform: [{ scale: t.interpolate({ inputRange: [0, 0.1, 0.16, 1], outputRange: [0.8, 1.06, 1, 1] }) }],
          },
        ]}
      >
        <View style={styles.pill}>
          <Text style={styles.big}>{run.line}</Text>
          <Text style={styles.small}>Today’s deeds are complete</Text>
        </View>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  centre: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, alignItems: 'center', justifyContent: 'center', padding: 28 },
  pill: { backgroundColor: 'rgba(14,63,49,0.94)', borderRadius: 26, borderWidth: 1, borderColor: '#E9C77B', paddingHorizontal: 28, paddingVertical: 20, alignItems: 'center', gap: 4 },
  big: { fontFamily: fonts.read, fontSize: 30, color: '#FBEFC9', textAlign: 'center', letterSpacing: -0.3 },
  small: { fontFamily: fonts.ui, fontSize: 14.5, color: 'rgba(255,255,255,0.85)', textAlign: 'center' },
});
