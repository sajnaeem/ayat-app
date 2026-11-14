import type { BottomTabBarProps } from 'expo-router/tabs';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Icon, IconName } from './Icon';
import { fonts, usePalette } from '@/lib/theme';

/** The tabs along the bottom, in order. `name` is the route in src/app/(tabs). */
export const TABS: { name: string; label: string; icon: IconName }[] = [
  { name: 'index', label: 'Home', icon: 'home' },
  { name: 'quran', label: 'Quran', icon: 'book' },
  { name: 'prayer', label: 'Prayer', icon: 'mosque' },
  { name: 'together', label: 'Together', icon: 'people' },
  { name: 'you', label: 'You', icon: 'user' },
];

/** Munib's bottom tab bar: quiet, with the chosen tab in emerald. */
export function TabBar({ state, navigateToTab }: BottomTabBarProps) {
  const pal = usePalette();
  const insets = useSafeAreaInsets();
  return (
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
  );
}

const styles = StyleSheet.create({
  bar: { flexDirection: 'row', borderTopWidth: StyleSheet.hairlineWidth, paddingTop: 7 },
  item: { flex: 1, alignItems: 'center', gap: 2, minHeight: 44, justifyContent: 'center' },
  label: { fontFamily: fonts.uiSemi, fontSize: 11 },
});
