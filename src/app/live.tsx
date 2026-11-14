import { useRouter } from 'expo-router';
import * as WebBrowser from 'expo-web-browser';
import { ActivityIndicator, Image, Linking, Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Icon } from '@/components/Icon';
import { GROUPS, Station, STATIONS, TV, TvChannel } from '@/data/live';
import { ART } from '@/lib/art';
import { useRadio } from '@/lib/radio';
import { fonts, mix, Palette, usePalette } from '@/lib/theme';

const LIVE_RED = '#E5484D';

/** Live TV from Makkah and Madinah, and 24/7 Quran radio that keeps playing while you use the app. */
export default function Live() {
  const pal = usePalette();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const radio = useRadio();

  const watch = (c: TvChannel) => {
    radio.stop();
    if (Platform.OS === 'web') Linking.openURL(c.url);
    else WebBrowser.openBrowserAsync(c.url, { presentationStyle: WebBrowser.WebBrowserPresentationStyle.PAGE_SHEET }).catch(() => Linking.openURL(c.url));
  };

  return (
    <View style={[styles.root, { backgroundColor: pal.bg }]}>
      <View style={[styles.head, { paddingTop: insets.top + 12, borderColor: pal.line }]}>
        <Text style={[styles.title, { color: pal.text }]}>Live</Text>
        <Pressable onPress={() => router.back()} style={[styles.x, { borderColor: pal.line }]} accessibilityRole="button" accessibilityLabel="Close" hitSlop={8}>
          <Icon name="close" size={18} color={pal.text} />
        </Pressable>
      </View>
      <ScrollView contentContainerStyle={{ padding: 16, gap: 12, paddingBottom: insets.bottom + 120 }}>
        <Text style={[styles.section, { color: pal.text }]}>Live TV</Text>
        <View style={{ flexDirection: 'row', gap: 10 }}>
          {TV.map((c) => (
            <Pressable key={c.id} onPress={() => watch(c)} style={({ pressed }) => [styles.tv, { backgroundColor: c.id === 'makkah' ? '#16213A' : '#123B2C', opacity: pressed ? 0.85 : 1 }]} accessibilityRole="button" accessibilityLabel={`Watch live from ${c.name}, ${c.place}`}>
              <LivePill />
              <Image source={ART[c.art]} style={styles.tvArt} resizeMode="contain" accessibilityIgnoresInvertColors />
              <View style={{ gap: 2 }}>
                <Text style={styles.tvName}>{c.name}</Text>
                <Text style={styles.tvPlace}>{c.place}</Text>
              </View>
              <View style={styles.watch}>
                <Icon name="play" size={13} color="#111" fill />
                <Text style={styles.watchText}>Watch</Text>
              </View>
            </Pressable>
          ))}
        </View>
        <Text style={[styles.small, { color: pal.muted, paddingHorizontal: 4 }]}>
          Broadcast around the clock by the Saudi Broadcasting Authority: the prayers, the recitation and the people of the two Holy Mosques. Opens on YouTube.
        </Text>

        {GROUPS.map((g) => {
          const list = STATIONS.filter((s) => s.group === g.id);
          return (
            <View key={g.id} style={{ gap: 10 }}>
              <View style={styles.groupHead}>
                {g.id === 'quran' && <Image source={ART.radio} style={{ width: 44, height: 44 }} resizeMode="contain" />}
                <Text style={[styles.section, { color: pal.text }]}>{g.title}</Text>
              </View>
              <View style={[styles.card, { backgroundColor: pal.surface }]}>
                {list.map((s, i) => (
                  <StationRow key={s.id} pal={pal} s={s} divider={i > 0} />
                ))}
              </View>
            </View>
          );
        })}
        <Text style={[styles.small, { color: pal.muted, paddingHorizontal: 4 }]}>
          Radio keeps playing while you use Munib and when your phone is locked. Tap a card on Home to switch back to the recitation. Radio streams from mp3quran.net.
        </Text>
      </ScrollView>
    </View>
  );
}

function StationRow({ pal, s, divider }: { pal: Palette; s: Station; divider: boolean }) {
  const radio = useRadio();
  const mine = radio.station?.id === s.id && radio.on;
  return (
    <Pressable
      onPress={() => (mine ? radio.stop() : radio.play(s))}
      style={({ pressed }) => [styles.row, divider && { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: pal.line }, pressed && { opacity: 0.6 }]}
      accessibilityRole="button"
      accessibilityLabel={`${mine ? 'Stop' : 'Play'} ${s.name}, ${s.sub}`}
    >
      <View style={[styles.play, { backgroundColor: mine ? pal.accent : mix(pal.surface, pal.accent, pal.dark ? 0.22 : 0.12) }]}>
        {mine && radio.loading ? <ActivityIndicator size="small" color={pal.onAccent} /> : <Icon name={mine ? 'pause' : 'play'} size={16} color={mine ? pal.onAccent : pal.accent} fill={!mine} strokeWidth={mine ? 2.4 : 1.7} />}
      </View>
      <View style={{ flex: 1, gap: 2 }}>
        <Text style={[styles.rowTitle, { color: mine ? pal.accent : pal.text }]}>{s.name}</Text>
        <Text style={[styles.small, { color: pal.muted }]}>{s.sub}</Text>
      </View>
      {mine && !radio.loading && <Text style={[styles.onAir, { color: LIVE_RED }]}>● ON AIR</Text>}
    </Pressable>
  );
}

function LivePill() {
  return (
    <View style={styles.pill}>
      <View style={styles.dot} />
      <Text style={styles.pillText}>LIVE</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  head: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 18, paddingBottom: 12, borderBottomWidth: StyleSheet.hairlineWidth },
  title: { fontFamily: fonts.uiBold, fontSize: 24, letterSpacing: -0.5, flex: 1 },
  x: { width: 36, height: 36, borderRadius: 18, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  section: { fontFamily: fonts.uiBold, fontSize: 20, letterSpacing: -0.3, marginTop: 6 },
  groupHead: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  tv: { flex: 1, borderRadius: 22, padding: 14, gap: 10, minHeight: 230, overflow: 'hidden' },
  tvArt: { width: '100%', height: 104, marginTop: 4 },
  tvName: { fontFamily: fonts.uiBold, fontSize: 20, color: '#FFFFFF', letterSpacing: -0.3 },
  tvPlace: { fontFamily: fonts.ui, fontSize: 13, color: 'rgba(255,255,255,0.78)' },
  watch: { flexDirection: 'row', alignItems: 'center', gap: 6, alignSelf: 'flex-start', backgroundColor: '#FFFFFF', borderRadius: 999, paddingHorizontal: 12, paddingVertical: 7 },
  watchText: { fontFamily: fonts.uiBold, fontSize: 13.5, color: '#111' },
  pill: { flexDirection: 'row', alignItems: 'center', gap: 5, alignSelf: 'flex-start', backgroundColor: LIVE_RED, borderRadius: 999, paddingHorizontal: 8, paddingVertical: 3 },
  dot: { width: 6, height: 6, borderRadius: 3, backgroundColor: '#FFFFFF' },
  pillText: { fontFamily: fonts.uiBold, fontSize: 11, color: '#FFFFFF', letterSpacing: 0.8 },
  card: { borderRadius: 22, overflow: 'hidden' },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 14, paddingVertical: 12 },
  play: { width: 38, height: 38, borderRadius: 19, alignItems: 'center', justifyContent: 'center' },
  rowTitle: { fontFamily: fonts.uiSemi, fontSize: 16 },
  small: { fontFamily: fonts.ui, fontSize: 13, lineHeight: 18 },
  onAir: { fontFamily: fonts.uiBold, fontSize: 11, letterSpacing: 0.8 },
});
