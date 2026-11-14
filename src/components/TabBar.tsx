import { useRouter } from 'expo-router';
import type { BottomTabBarProps } from 'expo-router/tabs';
import * as Haptics from 'expo-haptics';
import { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Animated, Image, Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Glassy, hasGlass } from './Glassy';
import { Icon, IconName } from './Icon';
import { ART } from '@/lib/art';
import { useRadio } from '@/lib/radio';
import { fonts, mix, usePalette } from '@/lib/theme';

/** The tabs along the bottom, in order (Saj, 14 Nov 2026: Ask in the centre; You moved to the profile button). `name` is the route in src/app/(tabs). */
export const TABS: { name: string; label: string; icon: IconName }[] = [
  { name: 'index', label: 'Home', icon: 'home' },
  { name: 'quran', label: 'Quran', icon: 'book' },
  { name: 'ask', label: 'Ask', icon: 'ask' },
  { name: 'prayer', label: 'Prayer', icon: 'mosque' },
  { name: 'together', label: 'Together', icon: 'people' },
];


const BAR_H = 62;
const barBottom = (inset: number) => Math.max(inset - 10, 10);

/**
 * The room a tab's own content must leave at the bottom, now that the bar floats over the page (14 Nov 2026):
 * the bar, the gap under and over it, and the radio's mini player when a station is on.
 */
export function useTabBarSpace() {
  const insets = useSafeAreaInsets();
  const radio = useRadio();
  return BAR_H + barBottom(insets.bottom) + 10 + (radio.station ? 62 : 0);
}

/**
 * Munib's bottom tab bar: a floating capsule (liquid glass on iPhones that have it) that the page scrolls beneath.
 * The chosen tab sits in a soft lens of the prayer day's light, which glides from tab to tab.
 */
export function TabBar({ state, navigateToTab }: BottomTabBarProps) {
  const pal = usePalette();
  const insets = useSafeAreaInsets();
  const [w, setW] = useState(0);
  const shown = state.routes.filter((r) => TABS.some((t) => t.name === r.name));
  const at = Math.max(0, shown.findIndex((r) => r.key === state.routes[state.index]?.key));
  const item = w > 0 ? (w - 12) / shown.length : 0;
  const x = useRef(new Animated.Value(at)).current;
  useEffect(() => {
    Animated.spring(x, { toValue: at, useNativeDriver: true, friction: 9, tension: 90 }).start();
  }, [at, x]);
  const on = pal.bold ? pal.text : pal.accent;
  const lens = hasGlass ? (pal.dark ? 'rgba(255,255,255,0.16)' : 'rgba(255,255,255,0.55)') : mix(pal.surface, pal.sky?.glow ?? pal.accent, pal.dark ? 0.3 : 0.34);
  return (
    <View style={styles.float} pointerEvents="box-none">
      <RadioBar />
      <Glassy
        dark={pal.dark}
        interactive
        style={[styles.bar, { marginBottom: barBottom(insets.bottom) }]}
        fallback={{ backgroundColor: pal.surface, borderWidth: StyleSheet.hairlineWidth, borderColor: pal.line, shadowColor: '#000', shadowOpacity: pal.dark ? 0.5 : 0.14, shadowRadius: 18, shadowOffset: { width: 0, height: 6 }, elevation: 8 }}
      >
        <View style={styles.row} onLayout={(e) => setW(e.nativeEvent.layout.width)} accessibilityRole="tablist">
          {item > 0 && <Animated.View style={[styles.lens, { width: item - 4, backgroundColor: lens, transform: [{ translateX: Animated.add(Animated.multiply(x, item), 8) }] }]} />}
          {shown.map((route) => {
            const tab = TABS.find((t) => t.name === route.name)!;
            const sel = state.routes[state.index]?.key === route.key;
            const press = () => {
              if (sel) return;
              Haptics.selectionAsync().catch(() => {});
              navigateToTab(route.key);
            };
            return (
              <Pressable key={route.key} onPress={press} style={styles.item} accessibilityRole="tab" accessibilityState={{ selected: sel }} accessibilityLabel={tab.label}>
                <Icon name={tab.icon} size={23} color={sel ? on : pal.muted} strokeWidth={sel ? 2.1 : 1.7} />
                <Text style={[styles.label, { color: sel ? on : pal.muted }]}>{tab.label}</Text>
              </Pressable>
            );
          })}
        </View>
      </Glassy>
    </View>
  );
}

/** The radio's mini player, just above the tabs while a station is on. */
function RadioBar() {
  const pal = usePalette();
  const radio = useRadio();
  const router = useRouter();
  if (!radio.station) return null;
  const s = radio.station;
  const bg = pal.dark ? mix(pal.bg, '#FFFFFF', 0.1) : pal.surface;
  return (
    <Glassy dark={pal.dark} style={styles.radio} fallback={{ backgroundColor: bg, shadowColor: '#000', shadowOpacity: 0.12, shadowRadius: 14, shadowOffset: { width: 0, height: 4 }, elevation: 4 }}>
      <Pressable onPress={() => router.push('/live')} style={styles.radioMain} accessibilityRole="button" accessibilityLabel={`Radio: ${s.name}. Open Live`}>
        <Image source={ART.radio} style={{ width: 38, height: 38 }} resizeMode="contain" />
        <View style={{ flex: 1 }}>
          <Text style={[styles.radioTitle, { color: pal.text }]} numberOfLines={1}>{s.name}</Text>
          <Text style={[styles.radioSub, { color: radio.on ? '#E5484D' : pal.muted }]} numberOfLines={1}>{radio.on ? (radio.loading ? 'Connecting…' : '● Live radio') : 'Paused'}</Text>
        </View>
      </Pressable>
      <Pressable onPress={radio.toggle} hitSlop={8} style={[styles.radioBtn, { backgroundColor: pal.text }]} accessibilityRole="button" accessibilityLabel={radio.on ? 'Pause radio' : 'Play radio'}>
        {radio.on && radio.loading ? <ActivityIndicator size="small" color={pal.bg} /> : <Icon name={radio.on ? 'pause' : 'play'} size={16} color={pal.bg} fill={!radio.on} strokeWidth={2.4} />}
      </Pressable>
      <Pressable onPress={radio.close} hitSlop={8} style={styles.radioX} accessibilityRole="button" accessibilityLabel="Close radio">
        <Icon name="close" size={16} color={pal.muted} />
      </Pressable>
    </Glassy>
  );
}

const styles = StyleSheet.create({
  radio: { flexDirection: 'row', alignItems: 'center', gap: 8, marginHorizontal: 14, marginBottom: 8, height: 54, borderRadius: 27, paddingLeft: 10, paddingRight: 8, overflow: 'hidden' },
  radioMain: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 10 },
  radioTitle: { fontFamily: fonts.uiSemi, fontSize: 14.5 },
  radioSub: { fontFamily: fonts.uiSemi, fontSize: 12 },
  radioBtn: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  radioX: { width: 30, height: 36, alignItems: 'center', justifyContent: 'center' },
  float: { position: 'absolute', left: 0, right: 0, bottom: 0 },
  bar: { height: BAR_H, borderRadius: BAR_H / 2, marginHorizontal: 14 },
  row: { flex: 1, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 6 },
  lens: { position: 'absolute', left: 0, top: 7, height: BAR_H - 14, borderRadius: (BAR_H - 14) / 2 },
  item: { flex: 1, alignItems: 'center', gap: 2, height: BAR_H, justifyContent: 'center' },
  label: { fontFamily: fonts.uiSemi, fontSize: 11 },
});
