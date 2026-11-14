import { useRouter } from 'expo-router';
import type { BottomTabBarProps } from 'expo-router/tabs';
import { ActivityIndicator, Image, Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
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
/** Tab screens with no button in the bar: You opens from the profile button (MeButton) at the top right. */
export const HIDDEN_TABS = ['you'];

/** Munib's bottom tab bar: quiet, with the chosen tab in emerald. */
export function TabBar({ state, navigateToTab }: BottomTabBarProps) {
  const pal = usePalette();
  const insets = useSafeAreaInsets();
  return (
    <View>
    <RadioBar />
    <View style={[styles.bar, { backgroundColor: pal.bold ? pal.bg : pal.surface, borderTopColor: pal.line, paddingBottom: Math.max(insets.bottom - 6, 6) }]} accessibilityRole="tablist">
      {state.routes.map((route, i) => {
        const tab = TABS.find((t) => t.name === route.name);
        if (!tab) return null;
        const on = state.index === i;
        const press = () => {
          if (!on) navigateToTab(route.key);
        };
        return (
          <Pressable key={route.key} onPress={press} style={styles.item} accessibilityRole="tab" accessibilityState={{ selected: on }} accessibilityLabel={tab.label}>
            <Icon name={tab.icon} size={23} color={on ? (pal.bold ? pal.text : pal.accent) : pal.muted} strokeWidth={on ? 2.1 : 1.7} />
            <Text style={[styles.label, { color: on ? (pal.bold ? pal.text : pal.accent) : pal.muted }]}>{tab.label}</Text>
          </Pressable>
        );
      })}
    </View>
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
    <View style={[styles.radio, { backgroundColor: bg, shadowColor: '#000' }]}>
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
    </View>
  );
}

const styles = StyleSheet.create({
  radio: { flexDirection: 'row', alignItems: 'center', gap: 8, marginHorizontal: 10, marginBottom: 8, borderRadius: 18, paddingVertical: 8, paddingLeft: 10, paddingRight: 8, shadowOpacity: 0.12, shadowRadius: 14, shadowOffset: { width: 0, height: 4 }, elevation: 4 },
  radioMain: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 10 },
  radioTitle: { fontFamily: fonts.uiSemi, fontSize: 14.5 },
  radioSub: { fontFamily: fonts.uiSemi, fontSize: 12 },
  radioBtn: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  radioX: { width: 30, height: 36, alignItems: 'center', justifyContent: 'center' },
  bar: { flexDirection: 'row', borderTopWidth: StyleSheet.hairlineWidth, paddingTop: 7 },
  item: { flex: 1, alignItems: 'center', gap: 2, minHeight: 44, justifyContent: 'center' },
  label: { fontFamily: fonts.uiSemi, fontSize: 11 },
});
