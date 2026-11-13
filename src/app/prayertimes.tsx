import * as Location from 'expo-location';
import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Linking, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ExplainIntro, useExplain } from '@/components/Explain';
import { Icon } from '@/components/Icon';
import { Sheet } from '@/components/Sheet';
import { askPermission } from '@/lib/reminders';
import { CALC_ROWS, calcDay, CalcId, hm, METHODS, nextPrayer, roughly, until } from '@/lib/prayertimes';
import { usePrefs } from '@/lib/store';
import { fonts, mix, usePalette } from '@/lib/theme';

/** Prayer times for wherever you are, worked out on the phone, with optional alerts when each prayer begins. */
export default function PrayerTimesScreen() {
  const pal = usePalette();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const prefs = usePrefs();
  const s = prefs.prayer;
  const [setWhy, whySheet] = useExplain(pal);
  const [now, setNow] = useState(new Date());
  const [dayOffset, setDayOffset] = useState(0);
  const [locating, setLocating] = useState(false);
  const [denied, setDenied] = useState(false);
  const [pick, setPick] = useState<'method' | 'asr' | null>(null);

  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 30_000);
    return () => clearInterval(t);
  }, []);

  const locate = async () => {
    setLocating(true);
    setDenied(false);
    try {
      const perm = await Location.requestForegroundPermissionsAsync();
      if (!perm.granted) return setDenied(true);
      const pos = (await Location.getLastKnownPositionAsync({ maxAge: 30 * 60000 })) ?? (await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced }));
      prefs.set({ prayer: { ...s, loc: { ...roughly(pos.coords.latitude, pos.coords.longitude), label: 'Your location', at: Date.now() } } });
    } catch {
      setDenied(true);
    } finally {
      setLocating(false);
    }
  };
  // Refresh the position quietly when it's more than a day old (people travel).
  useEffect(() => {
    if (s.loc && Date.now() - s.loc.at > 86400000) locate();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const day = calcDay(s, new Date(now.getTime() + dayOffset * 86400000));
  const next = nextPrayer(s, now);
  const method = METHODS.find((m) => m.id === s.method) ?? METHODS[0];

  const toggle = async (id: CalcId) => {
    if (id === 'sunrise') return;
    const on = !s.alerts[id];
    if (on && !(await askPermission())) return;
    prefs.set({ prayer: { ...s, alerts: { ...s.alerts, [id]: on } } });
  };

  const dayLabel = dayOffset === 0 ? 'Today' : dayOffset === 1 ? 'Tomorrow' : dayOffset === -1 ? 'Yesterday' : day?.date.toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'short' });

  return (
    <View style={[styles.root, { backgroundColor: pal.bg }]}>
      <View style={[styles.head, { paddingTop: insets.top + 12, borderColor: pal.line }]}>
        <Text style={[styles.title, { color: pal.text }]}>Prayer times</Text>
        <Pressable onPress={() => router.back()} style={[styles.x, { borderColor: pal.line }]} accessibilityRole="button" accessibilityLabel="Close" hitSlop={8}>
          <Icon name="close" size={18} color={pal.text} />
        </Pressable>
      </View>

      {!s.loc ? (
        <View style={[styles.center, { paddingHorizontal: 28, gap: 12 }]}>
          <Text style={[styles.h2, { color: pal.text, textAlign: 'center' }]}>Prayer times wherever you are</Text>
          <Text style={[styles.body, { color: pal.muted, textAlign: 'center' }]}>
            {denied ? 'Munib needs your location to work out the times. It stays on your phone and is never sent anywhere.' : 'Munib works out the times on your phone from where you are. Your location is never sent anywhere.'}
          </Text>
          <Pressable onPress={denied ? () => Linking.openSettings() : locate} style={[styles.btn, { backgroundColor: pal.text }]} accessibilityRole="button">
            {locating ? <ActivityIndicator color={pal.bg} /> : <Text style={[styles.btnText, { color: pal.bg }]}>{denied ? 'Open Settings' : 'Use my location'}</Text>}
          </Pressable>
        </View>
      ) : (
        <ScrollView contentContainerStyle={{ padding: 18, gap: 14, paddingBottom: insets.bottom + 30 }}>
          <ExplainIntro id="prayertimes" pal={pal} />
          {next && (
            <View style={[styles.next, { backgroundColor: mix(pal.surface, pal.accent, 0.08), borderColor: mix(pal.line, pal.accent, 0.4) }]}>
              <Text style={[styles.eyebrow, { color: pal.accent }]}>NEXT</Text>
              <Text style={[styles.nextName, { color: pal.text }]}>
                {next.id === 'dhuhr' && next.at.getDay() === 5 ? 'Jumuʿah' : next.name} at {hm(next.at)}
              </Text>
              <Text style={[styles.body, { color: pal.muted }]}>in {until(next.at.getTime() - now.getTime())}</Text>
            </View>
          )}

          <View style={styles.dayBar}>
            <Pressable onPress={() => setDayOffset((d) => d - 1)} hitSlop={10} accessibilityRole="button" accessibilityLabel="Previous day" style={{ transform: [{ rotate: '180deg' }] }}>
              <Icon name="chevron" size={20} color={pal.text} />
            </Pressable>
            <Pressable onPress={() => setDayOffset(0)} accessibilityRole="button" accessibilityLabel="Back to today">
              <Text style={[styles.dayText, { color: pal.text }]}>{dayLabel}</Text>
            </Pressable>
            <Pressable onPress={() => setDayOffset((d) => d + 1)} hitSlop={10} accessibilityRole="button" accessibilityLabel="Next day">
              <Icon name="chevron" size={20} color={pal.text} />
            </Pressable>
          </View>

          <View style={[styles.card, { backgroundColor: pal.surface, borderColor: pal.line }]}>
            {day &&
              CALC_ROWS.map((r, i) => {
                const isNext = dayOffset === 0 && next?.id === r.id && next.at.toDateString() === day.date.toDateString();
                const bell = r.id !== 'sunrise';
                const on = bell && s.alerts[r.id as keyof typeof s.alerts];
                return (
                  <View key={r.id} style={[styles.row, i > 0 && { borderTopWidth: StyleSheet.hairlineWidth, borderColor: pal.line }, isNext && { backgroundColor: mix(pal.surface, pal.accent, 0.08) }]}>
                    <View style={{ flex: 1 }}>
                      <Text style={[styles.name, { color: isNext ? pal.accent : r.id === 'sunrise' ? pal.muted : pal.text }]}>
                        {r.id === 'dhuhr' && day.date.getDay() === 5 ? 'Dhuhr · Jumuʿah' : r.name}
                      </Text>
                    </View>
                    <Text style={[styles.time, { color: r.id === 'sunrise' ? pal.muted : pal.text }]}>{hm(day.times[r.id])}</Text>
                    {bell ? (
                      <Pressable
                        onPress={() => toggle(r.id)}
                        hitSlop={10}
                        style={styles.bell}
                        accessibilityRole="switch"
                        accessibilityState={{ checked: !!on }}
                        accessibilityLabel={`Alert when ${r.name} begins`}
                      >
                        <Icon name="bell" size={18} color={on ? pal.accent : mix(pal.surface, pal.text, 0.35)} fill={!!on} />
                      </Pressable>
                    ) : (
                      <View style={styles.bell} />
                    )}
                  </View>
                );
              })}
          </View>
          {day && (
            <Text style={[styles.small, { color: pal.muted }]}>
              The last third of the night (<Text onPress={() => setWhy('lastthird')} style={{ color: pal.accent, textDecorationLine: 'underline' }}>why it matters</Text>) begins at {hm(day.lastThird)}. Tap a bell for an alert when that prayer begins.
            </Text>
          )}

          <View style={[styles.card, { backgroundColor: pal.surface, borderColor: pal.line }]}>
            <Pressable onPress={() => setPick('method')} style={styles.setRow} accessibilityRole="button">
              <View style={{ flex: 1 }}>
                <Text style={[styles.name, { color: pal.text }]}>Calculation</Text>
                <Text style={[styles.small, { color: pal.muted }]}>{method.name}</Text>
              </View>
              <Icon name="chevron" size={16} color={pal.muted} />
            </Pressable>
            <Pressable onPress={() => setPick('asr')} style={[styles.setRow, { borderTopWidth: StyleSheet.hairlineWidth, borderColor: pal.line }]} accessibilityRole="button">
              <View style={{ flex: 1 }}>
                <Text style={[styles.name, { color: pal.text }]}>Asr</Text>
                <Text style={[styles.small, { color: pal.muted }]}>{s.asr === 'hanafi' ? 'Hanafi (later)' : 'Standard: Shafiʿi, Maliki, Hanbali'}</Text>
              </View>
              <Icon name="chevron" size={16} color={pal.muted} />
            </Pressable>
            <Pressable onPress={locate} style={[styles.setRow, { borderTopWidth: StyleSheet.hairlineWidth, borderColor: pal.line }]} accessibilityRole="button">
              <View style={{ flex: 1 }}>
                <Text style={[styles.name, { color: pal.text }]}>Location</Text>
                <Text style={[styles.small, { color: pal.muted }]}>Updated {new Date(s.loc.at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })} · tap to update</Text>
              </View>
              {locating ? <ActivityIndicator color={pal.muted} /> : <Icon name="compass" size={18} color={pal.muted} />}
            </Pressable>
          </View>

          <Pressable onPress={() => router.push('/mosque')} style={[styles.card, styles.setRow, { backgroundColor: pal.surface, borderColor: pal.line }]} accessibilityRole="button">
            <Icon name="mosque" size={20} color={pal.accent} />
            <View style={{ flex: 1 }}>
              <Text style={[styles.name, { color: pal.text }]}>{prefs.mosque ? prefs.mosque.name : 'Pray with your mosque'}</Text>
              <Text style={[styles.small, { color: pal.muted }]}>{prefs.mosque ? 'Jama’ah times and alerts' : 'Add your mosque for its jama’ah times and alerts'}</Text>
            </View>
            <Icon name="chevron" size={16} color={pal.muted} />
          </Pressable>
          <Text style={[styles.small, { color: pal.muted }]}>
            These are calculated times. Your mosque’s timetable may differ by a few minutes; when in doubt, follow your local mosque. Your location stays on your phone.
          </Text>
        </ScrollView>
      )}

      <Sheet visible={pick === 'method'} onClose={() => setPick(null)} title="Calculation" pal={pal}>
        <ScrollView style={{ maxHeight: 460 }}>
          {METHODS.map((m) => (
            <Pressable
              key={m.id}
              onPress={() => {
                prefs.set({ prayer: { ...s, method: m.id } });
                setPick(null);
              }}
              style={[styles.choice, { borderColor: m.id === s.method ? pal.accent : pal.line }]}
              accessibilityRole="radio"
              accessibilityState={{ checked: m.id === s.method }}
            >
              <Text style={[styles.name, { color: pal.text }]}>{m.name}</Text>
              <Text style={[styles.small, { color: pal.muted }]}>{m.note}</Text>
            </Pressable>
          ))}
        </ScrollView>
      </Sheet>
      <Sheet visible={pick === 'asr'} onClose={() => setPick(null)} title="Asr time" pal={pal}>
        {(
          [
            ['standard', 'Standard', 'Shafiʿi, Maliki and Hanbali: when a shadow equals the object’s length'],
            ['hanafi', 'Hanafi', 'When a shadow is twice the object’s length (later)'],
          ] as const
        ).map(([id, name, note]) => (
          <Pressable
            key={id}
            onPress={() => {
              prefs.set({ prayer: { ...s, asr: id } });
              setPick(null);
            }}
            style={[styles.choice, { borderColor: s.asr === id ? pal.accent : pal.line }]}
            accessibilityRole="radio"
            accessibilityState={{ checked: s.asr === id }}
          >
            <Text style={[styles.name, { color: pal.text }]}>{name}</Text>
            <Text style={[styles.small, { color: pal.muted }]}>{note}</Text>
          </Pressable>
        ))}
      </Sheet>
      {whySheet}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  head: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 18, paddingBottom: 12, borderBottomWidth: StyleSheet.hairlineWidth },
  title: { fontFamily: fonts.uiBold, fontSize: 26, letterSpacing: -0.5 },
  x: { width: 36, height: 36, borderRadius: 18, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  h2: { fontFamily: fonts.uiBold, fontSize: 22, letterSpacing: -0.3 },
  body: { fontFamily: fonts.read, fontSize: 16, lineHeight: 24 },
  small: { fontFamily: fonts.ui, fontSize: 13, lineHeight: 18 },
  btn: { borderRadius: 12, minHeight: 50, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 24, alignSelf: 'stretch' },
  btnText: { fontFamily: fonts.uiBold, fontSize: 16 },
  next: { borderWidth: 1, borderRadius: 16, padding: 16, gap: 2 },
  eyebrow: { fontFamily: fonts.uiBold, fontSize: 11, letterSpacing: 1.2 },
  nextName: { fontFamily: fonts.uiBold, fontSize: 24, letterSpacing: -0.4 },
  dayBar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 6 },
  dayText: { fontFamily: fonts.uiBold, fontSize: 16 },
  card: { borderWidth: 1, borderRadius: 16, overflow: 'hidden' },
  row: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, minHeight: 52, gap: 10 },
  name: { fontFamily: fonts.uiSemi, fontSize: 16 },
  time: { fontFamily: fonts.uiSemi, fontSize: 16, fontVariant: ['tabular-nums'] },
  bell: { width: 30, alignItems: 'flex-end' },
  setRow: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14 },
  choice: { borderWidth: 1, borderRadius: 12, padding: 12, gap: 2, marginBottom: 8 },
});
