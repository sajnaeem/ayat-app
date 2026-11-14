import { useRef, useState } from 'react';
import { Animated, PanResponder, Pressable, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import * as Haptics from 'expo-haptics';
import { Icon } from './Icon';
import { fonts } from '@/lib/theme';

/**
 * "Is this true for you?": statements on a small stack of cards; swipe right for true, left for not really
 * (or tap the buttons, for anyone who can't swipe). Calls onDone with the answers once the last card is gone.
 */
export type Statement = { id: string; text: string };

export function SwipeCards({ items, onDone }: { items: Statement[]; onDone: (answers: Record<string, boolean>) => void }) {
  const { width } = useWindowDimensions();
  const [i, setI] = useState(0);
  const answers = useRef<Record<string, boolean>>({});
  const pos = useRef(new Animated.ValueXY()).current;
  const out = Math.min(width, 520) * 1.2;

  const decide = (yes: boolean) => {
    const item = items[i];
    if (!item) return;
    Haptics.selectionAsync().catch(() => {});
    answers.current[item.id] = yes;
    Animated.timing(pos, { toValue: { x: yes ? out : -out, y: 40 }, duration: 260, useNativeDriver: true }).start(() => {
      pos.setValue({ x: 0, y: 0 });
      if (i + 1 >= items.length) onDone({ ...answers.current });
      else setI(i + 1);
    });
  };

  const pan = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: (_, g) => Math.abs(g.dx) > 8,
      onPanResponderMove: Animated.event([null, { dx: pos.x, dy: pos.y }], { useNativeDriver: false }),
      onPanResponderRelease: (_, g) => {
        if (g.dx > 110) decideRef.current(true);
        else if (g.dx < -110) decideRef.current(false);
        else Animated.spring(pos, { toValue: { x: 0, y: 0 }, useNativeDriver: true, friction: 6 }).start();
      },
    }),
  ).current;
  const decideRef = useRef(decide);
  decideRef.current = decide;

  const rotate = pos.x.interpolate({ inputRange: [-200, 0, 200], outputRange: ['-12deg', '0deg', '12deg'] });
  const yesO = pos.x.interpolate({ inputRange: [0, 100], outputRange: [0, 1], extrapolate: 'clamp' });
  const noO = pos.x.interpolate({ inputRange: [-100, 0], outputRange: [1, 0], extrapolate: 'clamp' });

  return (
    <View style={{ gap: 20 }}>
      <View style={styles.stack}>
        {items.slice(i + 1, i + 3).reverse().map((it, k, arr) => {
          const depth = arr.length - k; // 1 = just behind
          return <View key={it.id} style={[styles.card, styles.behind, { transform: [{ translateY: depth * 10 }, { scale: 1 - depth * 0.05 }, { rotate: depth % 2 ? '2deg' : '-2deg' }] }]} />;
        })}
        {items[i] && (
          <Animated.View {...pan.panHandlers} style={[styles.card, { transform: [{ translateX: pos.x }, { translateY: pos.y }, { rotate }] }]} accessibilityLabel={items[i].text}>
            <View style={styles.lines} />
            <Text style={styles.count}>{`${i + 1} of ${items.length}`}</Text>
            <Text style={styles.text}>{items[i].text}</Text>
            <Animated.Text style={[styles.stamp, styles.stampYes, { opacity: yesO }]}>True</Animated.Text>
            <Animated.Text style={[styles.stamp, styles.stampNo, { opacity: noO }]}>Not really</Animated.Text>
          </Animated.View>
        )}
      </View>
      <View style={styles.buttons}>
        <Pressable onPress={() => decide(false)} style={({ pressed }) => [styles.btn, { opacity: pressed ? 0.7 : 1 }]} accessibilityRole="button" accessibilityLabel="Not really">
          <View style={[styles.round, { transform: [{ rotate: '180deg' }] }]}>
            <Icon name="chevron" size={18} color="#8A6A35" />
          </View>
          <Text style={styles.btnText}>Not really</Text>
        </Pressable>
        <Text style={styles.swipe}>Swipe</Text>
        <Pressable onPress={() => decide(true)} style={({ pressed }) => [styles.btn, { opacity: pressed ? 0.7 : 1 }]} accessibilityRole="button" accessibilityLabel="True">
          <View style={[styles.round, { backgroundColor: '#B8863B', borderColor: '#B8863B' }]}>
            <Icon name="chevron" size={18} color="#FFFFFF" />
          </View>
          <Text style={styles.btnText}>True</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  stack: { height: 250, alignItems: 'center', justifyContent: 'center', marginTop: 6 },
  card: {
    position: 'absolute',
    width: '86%',
    height: 230,
    borderRadius: 22,
    backgroundColor: '#FFFDF8',
    borderWidth: 1,
    borderColor: 'rgba(184,134,59,0.3)',
    padding: 24,
    justifyContent: 'center',
    shadowColor: '#B8863B',
    shadowOpacity: 0.18,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 8 },
    overflow: 'hidden',
  },
  behind: { backgroundColor: '#FBF4E6' },
  lines: { position: 'absolute', top: 0, bottom: 0, left: 34, borderLeftWidth: 1, borderLeftColor: 'rgba(184,134,59,0.18)' },
  count: { position: 'absolute', top: 16, right: 18, fontFamily: fonts.uiSemi, fontSize: 12, color: '#A08350' },
  text: { fontFamily: fonts.read, fontSize: 24, lineHeight: 32, color: '#1F2A36', textAlign: 'center', letterSpacing: -0.4 },
  stamp: { position: 'absolute', top: 16, fontFamily: fonts.uiBold, fontSize: 13, letterSpacing: 1.2, textTransform: 'uppercase', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8, borderWidth: 1.5 },
  stampYes: { left: 18, color: '#2F8A5B', borderColor: '#2F8A5B' },
  stampNo: { left: 18, color: '#A0563B', borderColor: '#A0563B' },
  buttons: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 18 },
  btn: { alignItems: 'center', gap: 6, minWidth: 90 },
  round: { width: 52, height: 52, borderRadius: 26, borderWidth: 1.5, borderColor: 'rgba(184,134,59,0.45)', backgroundColor: 'rgba(255,255,255,0.7)', alignItems: 'center', justifyContent: 'center' },
  btnText: { fontFamily: fonts.read, fontSize: 16, color: '#1F2A36' },
  swipe: { fontFamily: fonts.read, fontSize: 18, color: '#8A6A35' },
});
