import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Icon } from '@/components/Icon';
import { Group, Row, Section } from '@/components/List';
import { CALC_ROWS, calcDay, hm, nextPrayer, until } from '@/lib/prayertimes';
import { usePrefs } from '@/lib/store';
import { fonts, mix, usePalette } from '@/lib/theme';

/** The Prayer tab: today's times, your mosque, Qibla, duas and tasbeeh. */
export default function PrayerTab() {
  const pal = usePalette();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const prefs = usePrefs();
  const s = prefs.prayer;
  const [now, setNow] = useState(new Date());
  // Fresh countdown whenever the tab is opened, and every 30 seconds while it's open.
  useFocusEffect(
    useCallback(() => {
      setNow(new Date());
      const t = setInterval(() => setNow(new Date()), 30_000);
      return () => clearInterval(t);
    }, []),
  );
  const day = calcDay(s, now);
  const next = nextPrayer(s, now);
  const today = new Date().toISOString().slice(0, 10);
  const tasbeehToday = prefs.tasbeeh.day === today ? prefs.tasbeeh.today : 0;

  return (
    <View style={[styles.root, { backgroundColor: pal.bg }]}>
      <View style={[styles.head, { paddingTop: insets.top + 12 }]}>
        <Text style={[styles.title, { color: pal.text }]}>Prayer</Text>
      </View>
      <ScrollView contentContainerStyle={styles.body}>
        <Pressable onPress={() => router.push('/prayertimes')} style={({ pressed }) => [styles.card, { backgroundColor: pal.surface, opacity: pressed ? 0.8 : 1 }]} accessibilityRole="button">
          {day && next ? (
            <>
              <Text style={[styles.eyebrow, { color: pal.accent }]}>NEXT</Text>
              <Text style={[styles.next, { color: pal.text }]}>
                {next.id === 'dhuhr' && next.at.getDay() === 5 ? 'Jumuʿah' : next.name} at {hm(next.at)}
              </Text>
              <Text style={[styles.sub, { color: pal.muted }]}>in {until(next.at.getTime() - now.getTime())}</Text>
              <View style={[styles.times, { borderTopColor: pal.line }]}>
                {CALC_ROWS.filter((r) => r.id !== 'sunrise').map((r) => {
                  const on = next.id === r.id && next.at.toDateString() === now.toDateString();
                  return (
                    <View key={r.id} style={[styles.time, on && { backgroundColor: mix(pal.surface, pal.accent, 0.12) }]}>
                      <Text style={[styles.timeName, { color: on ? pal.accent : pal.muted }]}>{r.name}</Text>
                      <Text style={[styles.timeAt, { color: on ? pal.accent : pal.text }]}>{hm(day.times[r.id]).replace(/ (am|pm)$/, '')}</Text>
                    </View>
                  );
                })}
              </View>
            </>
          ) : (
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
              <View style={{ flex: 1, gap: 4 }}>
                <Text style={[styles.eyebrow, { color: pal.accent }]}>PRAYER TIMES</Text>
                <Text style={[styles.rowTitle, { color: pal.text }]}>Today’s times wherever you are, with alerts when each prayer begins</Text>
              </View>
              <Icon name="chevron" size={18} color={pal.muted} />
            </View>
          )}
        </Pressable>

        <Section pal={pal} title="Your mosque" />
        <Group pal={pal}>
          <Row
            pal={pal}
            icon="mosque"
            title={prefs.mosque ? prefs.mosque.name : 'Add your mosque'}
            sub={prefs.mosque ? 'Jamaʿah times and alerts' : 'Get an alert before each jamaʿah'}
            onPress={() => router.push('/mosque')}
            highlight={!prefs.mosque}
          />
        </Group>

        <Section pal={pal} title="Every day" />
        <Group pal={pal}>
          <Row pal={pal} icon="mic" title="Surahs for your prayer" sub="Learn short surahs, one ayah at a time" onPress={() => router.push('/learn')} />
          <Row pal={pal} icon="compass" title="Qibla" sub="Which way to face, from where you are" onPress={() => router.push('/qibla')} divider />
          <Row pal={pal} icon="hands" title="Find a dua" sub="Say what’s happening, get duas for it" onPress={() => router.push('/duas')} divider />
          <Row pal={pal} icon="beads" title="Tasbeeh" sub="Count your dhikr, with the after-prayer set" value={tasbeehToday ? `${tasbeehToday} today` : undefined} onPress={() => router.push('/tasbeeh')} divider />
          <Row pal={pal} icon="bell" title="Prayer times and alerts" sub={s.loc ? 'Calculation, Asr and alerts' : 'Set up for where you are'} onPress={() => router.push('/prayertimes')} divider />
        </Group>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  head: { paddingHorizontal: 20, paddingBottom: 6 },
  title: { fontFamily: fonts.uiBold, fontSize: 30, letterSpacing: -0.6 },
  body: { padding: 16, gap: 12, paddingBottom: 30 },
  card: { borderRadius: 16, padding: 16, gap: 2 },
  eyebrow: { fontFamily: fonts.uiBold, fontSize: 12, letterSpacing: 1.2 },
  next: { fontFamily: fonts.uiBold, fontSize: 26, letterSpacing: -0.5, marginTop: 2 },
  sub: { fontFamily: fonts.ui, fontSize: 14, lineHeight: 19 },
  rowTitle: { fontFamily: fonts.uiSemi, fontSize: 16, lineHeight: 22 },
  times: { flexDirection: 'row', borderTopWidth: StyleSheet.hairlineWidth, marginTop: 12, paddingTop: 10, gap: 4 },
  time: { flex: 1, alignItems: 'center', gap: 2, borderRadius: 10, paddingVertical: 6 },
  timeName: { fontFamily: fonts.uiSemi, fontSize: 12 },
  timeAt: { fontFamily: fonts.uiBold, fontSize: 15, fontVariant: ['tabular-nums'] },
});
