import * as Location from 'expo-location';
import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActionSheetIOS, ActivityIndicator, FlatList, Linking, Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Icon } from '@/components/Icon';
import { roughly } from '@/lib/prayertimes';
import { usePrefs } from '@/lib/store';
import { supabase } from '@/lib/supabase';
import { fonts, mix, usePalette } from '@/lib/theme';

type Near = { id: string; n: string; la: number; lo: number; w?: string; a?: string; m: number };

// Miles where people think in miles (UK, US), kilometres elsewhere.
const MILES = /-(GB|US)\b/i.test(Intl.DateTimeFormat().resolvedOptions().locale ?? '');
function distance(m: number) {
  if (MILES) {
    const mi = m / 1609.34;
    return mi < 0.1 ? `${Math.round(m * 1.094)} yards` : `${mi < 10 ? mi.toFixed(1) : Math.round(mi)} miles`;
  }
  return m < 1000 ? `${Math.round(m / 10) * 10} m` : `${(m / 1000).toFixed(m < 10000 ? 1 : 0)} km`;
}

/** Mosques near you, nearest first, with directions and (when the mosque has a website) "Set as my mosque". */
export default function Nearby() {
  const pal = usePalette();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const prefs = usePrefs();
  const [state, setState] = useState<'locating' | 'loading' | 'ready' | 'denied' | 'off' | 'error'>('locating');
  const [list, setList] = useState<Near[]>([]);

  const load = async () => {
    setState('locating');
    try {
      const perm = await Location.requestForegroundPermissionsAsync();
      if (!perm.granted) return setState('denied');
      const pos = (await Location.getLastKnownPositionAsync({ maxAge: 10 * 60000 })) ?? (await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced }));
      const here = roughly(pos.coords.latitude, pos.coords.longitude);
      setState('loading');
      if (!supabase) return setState('error');
      const { data, error } = await supabase.functions.invoke('nearby', { body: here });
      if (error) {
        const body = await (error as { context?: Response }).context?.json?.().catch(() => null);
        return setState(body?.error === 'off' ? 'off' : 'error');
      }
      setList(data?.places ?? []);
      setState('ready');
    } catch {
      setState('error');
    }
  };
  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const directions = (p: Near) => {
    const apple = `https://maps.apple.com/?daddr=${p.la},${p.lo}&q=${encodeURIComponent(p.n)}`;
    const google = `https://www.google.com/maps/dir/?api=1&destination=${p.la},${p.lo}`;
    if (Platform.OS !== 'ios') return Linking.openURL(google).catch(() => {});
    ActionSheetIOS.showActionSheetWithOptions({ title: p.n, options: ['Apple Maps', 'Google Maps', 'Cancel'], cancelButtonIndex: 2 }, (i) => {
      if (i === 0) Linking.openURL(apple).catch(() => {});
      if (i === 1) Linking.openURL(google).catch(() => {});
    });
  };
  const website = (w: string) => (/^https?:\/\//.test(w) ? w : `https://${w}`);

  return (
    <View style={[styles.root, { backgroundColor: pal.bg }]}>
      <View style={[styles.head, { paddingTop: insets.top + 12, borderColor: pal.line }]}>
        <Text style={[styles.title, { color: pal.text }]}>Mosques near you</Text>
        <Pressable onPress={() => router.back()} style={[styles.x, { borderColor: pal.line }]} accessibilityRole="button" accessibilityLabel="Close" hitSlop={8}>
          <Icon name="close" size={18} color={pal.text} />
        </Pressable>
      </View>

      {state === 'locating' || state === 'loading' ? (
        <View style={styles.center}>
          <ActivityIndicator color={pal.muted} />
          <Text style={[styles.small, { color: pal.muted, marginTop: 12 }]}>{state === 'locating' ? 'Finding where you are…' : 'Looking for mosques nearby…'}</Text>
        </View>
      ) : state !== 'ready' ? (
        <View style={[styles.center, { paddingHorizontal: 28, gap: 12 }]}>
          <Text style={[styles.h2, { color: pal.text, textAlign: 'center' }]}>
            {state === 'denied' ? 'Munib needs your location to find mosques near you' : state === 'off' ? 'Finding mosques isn’t switched on yet' : 'Couldn’t look for mosques just now'}
          </Text>
          <Text style={[styles.body, { color: pal.muted, textAlign: 'center' }]}>
            {state === 'denied'
              ? 'Only a rough position (to about a kilometre) is used to look up mosques nearby. It isn’t saved anywhere.'
              : state === 'off'
                ? 'This is coming soon, in shaʾ Allah.'
                : 'Check your connection and try again.'}
          </Text>
          <Pressable onPress={state === 'denied' ? () => Linking.openSettings() : load} style={[styles.btn, { backgroundColor: pal.text }]} accessibilityRole="button">
            <Text style={[styles.btnText, { color: pal.bg }]}>{state === 'denied' ? 'Open Settings' : 'Try again'}</Text>
          </Pressable>
        </View>
      ) : (
        <FlatList
          data={list}
          keyExtractor={(p) => p.id}
          contentContainerStyle={{ padding: 16, gap: 10, paddingBottom: insets.bottom + 30 }}
          ListEmptyComponent={<Text style={[styles.body, { color: pal.muted, textAlign: 'center', marginTop: 40 }]}>No mosques found within about 9 miles on OpenStreetMap.</Text>}
          renderItem={({ item: p }) => {
            const mine = !!prefs.mosque && !!p.w && prefs.mosque.url?.includes(p.w.replace(/^https?:\/\/(www\.)?/, '').replace(/\/$/, ''));
            return (
              <View style={[styles.card, { backgroundColor: pal.surface }]}>
                <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 12 }}>
                  <View style={[styles.icon, { backgroundColor: mix(pal.surface, pal.accent, 0.12) }]}>
                    <Icon name="mosque" size={19} color={pal.accent} />
                  </View>
                  <View style={{ flex: 1, gap: 2 }}>
                    <Text style={[styles.name, { color: pal.text }]}>{p.n}</Text>
                    {!!p.a && <Text style={[styles.small, { color: pal.muted }]}>{p.a}</Text>}
                  </View>
                  <Text style={[styles.dist, { color: pal.accent }]}>{distance(p.m)}</Text>
                </View>
                <View style={styles.actions}>
                  <Pressable onPress={() => directions(p)} style={[styles.act, { backgroundColor: pal.text }]} accessibilityRole="button" accessibilityLabel={`Directions to ${p.n}`}>
                    <Icon name="compass" size={14} color={pal.bg} />
                    <Text style={[styles.actText, { color: pal.bg }]}>Directions</Text>
                  </Pressable>
                  {!!p.w && (
                    <Pressable onPress={() => Linking.openURL(website(p.w!)).catch(() => {})} style={[styles.act, { borderWidth: 1, borderColor: pal.line }]} accessibilityRole="link">
                      <Text style={[styles.actText, { color: pal.text }]}>Website</Text>
                    </Pressable>
                  )}
                  {!!p.w && !mine && (
                    <Pressable onPress={() => router.push({ pathname: '/mosque', params: { url: website(p.w!) } })} style={[styles.act, { borderWidth: 1, borderColor: pal.accent }]} accessibilityRole="button">
                      <Text style={[styles.actText, { color: pal.accent }]}>Set as my mosque</Text>
                    </Pressable>
                  )}
                  {mine && <Text style={[styles.small, { color: pal.accent, alignSelf: 'center' }]}>Your mosque</Text>}
                </View>
              </View>
            );
          }}
          ListFooterComponent={
            <Text style={[styles.small, { color: pal.muted, marginTop: 8 }]}>
              Mosque locations from OpenStreetMap (© OpenStreetMap contributors), powered by Geoapify. Missing a mosque or spot a mistake? Anyone can fix it at openstreetmap.org.
            </Text>
          }
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  head: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 18, paddingBottom: 12, borderBottomWidth: StyleSheet.hairlineWidth },
  title: { fontFamily: fonts.uiBold, fontSize: 26, letterSpacing: -0.5 },
  x: { width: 36, height: 36, borderRadius: 18, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  h2: { fontFamily: fonts.uiBold, fontSize: 21, letterSpacing: -0.3 },
  body: { fontFamily: fonts.read, fontSize: 16, lineHeight: 24 },
  small: { fontFamily: fonts.ui, fontSize: 13, lineHeight: 18 },
  btn: { borderRadius: 12, minHeight: 50, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 24, alignSelf: 'stretch' },
  btnText: { fontFamily: fonts.uiBold, fontSize: 16 },
  card: { borderRadius: 16, padding: 14, gap: 12 },
  icon: { width: 36, height: 36, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  name: { fontFamily: fonts.uiSemi, fontSize: 16 },
  dist: { fontFamily: fonts.uiBold, fontSize: 13.5, fontVariant: ['tabular-nums'] },
  actions: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  act: { flexDirection: 'row', alignItems: 'center', gap: 6, borderRadius: 999, paddingHorizontal: 13, paddingVertical: 8 },
  actText: { fontFamily: fonts.uiSemi, fontSize: 13.5 },
});
