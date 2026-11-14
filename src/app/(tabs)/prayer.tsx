import { useFocusEffect, useRouter } from 'expo-router';
import { setStatusBarStyle } from 'expo-status-bar';
import { useCallback, useState } from 'react';
import { Image, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Icon } from '@/components/Icon';
import { Glass, hijriToday, sky, SkyHero, skyPhase } from '@/components/SkyHero';
import { ExplainIntro, useExplain } from '@/components/Explain';
import { Group, Row, Section, Tile, TileGrid } from '@/components/List';
import { ART, poseArt } from '@/lib/art';
import { CALC_ROWS, calcDay, hm, nextPrayer, until } from '@/lib/prayertimes';
import { usePrefs } from '@/lib/store';
import { fonts, mix, onColour, usePalette } from '@/lib/theme';

/** The Prayer tab: today's times, your mosque, Qibla, duas and tasbeeh. */import { useTabBarSpace } from '@/components/TabBar';

export default function PrayerTab() {
  const pal = usePalette();
  const insets = useSafeAreaInsets();
  const barSpace = useTabBarSpace();
  const router = useRouter();
  const prefs = usePrefs();
  const s = prefs.prayer;
  const [explain, explainSheet] = useExplain(pal);
  const hp = onColour(pal, pal.pop.emerald);
  const [now, setNow] = useState(new Date());
  // Fresh countdown whenever the tab is opened, and every 30 seconds while it's open.
  useFocusEffect(
    useCallback(() => {
      setNow(new Date());
      const t = setInterval(() => setNow(new Date()), 30_000);
      return () => clearInterval(t);
    }, []),
  );
  // Light status bar over the sky while this tab is open.
  useFocusEffect(
    useCallback(() => {
      setStatusBarStyle('light');
      return () => setStatusBarStyle(pal.dark ? 'light' : 'dark');
    }, [pal.dark]),
  );
  const day = calcDay(s, now);
  const next = nextPrayer(s, now);
  const today = new Date().toISOString().slice(0, 10);
  const phase = skyPhase(now, day ? day.times : null);
  const hijri = hijriToday(now);
  const nextName = next ? (next.id === 'dhuhr' && next.at.getDay() === 5 ? 'Jumuʿah' : next.name) : '';
  const tasbeehToday = prefs.tasbeeh.day === today ? prefs.tasbeeh.today : 0;

  return (
    <View style={[styles.root, { backgroundColor: pal.bg }]}>
      <ScrollView contentContainerStyle={{ paddingBottom: barSpace + 20 }} showsVerticalScrollIndicator={false}>
        <SkyHero phase={phase} top={insets.top}>
          <Text style={sky.title}>{prefs.firstName ? `Salaam, ${prefs.firstName}` : 'Prayer'}</Text>
          <Text style={sky.eyebrow}>{[now.toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long' }), hijri].filter(Boolean).join('  ·  ')}</Text>
          {day && next ? (
            <Pressable onPress={() => router.push('/prayertimes')} style={{ flex: 1 }} accessibilityRole="button" accessibilityLabel={`Next: ${nextName} at ${hm(next.at)}, in ${until(next.at.getTime() - now.getTime())}`}>
              <Text style={[sky.line, { marginTop: 26 }]}>Next prayer</Text>
              <Text style={sky.big}>{nextName}</Text>
              <Text style={sky.line}>{hm(next.at)}  ·  in {until(next.at.getTime() - now.getTime())}</Text>
              <View style={{ flex: 1 }} />
              <Glass style={styles.strip}>
                {CALC_ROWS.filter((r) => r.id !== 'sunrise').map((r) => {
                  const on = next.id === r.id && next.at.toDateString() === now.toDateString();
                  return (
                    <View key={r.id} style={[styles.time, on && { backgroundColor: 'rgba(255,255,255,0.92)' }]}>
                      <Text style={[styles.timeName, { color: on ? '#14181A' : 'rgba(255,255,255,0.82)' }]}>{r.name}</Text>
                      <Text style={[styles.timeAt, { color: on ? '#14181A' : '#FFFFFF' }]}>{hm(day.times[r.id]).replace(/ (am|pm)$/, '')}</Text>
                    </View>
                  );
                })}
              </Glass>
            </Pressable>
          ) : (
            <Pressable onPress={() => router.push('/prayertimes')} style={{ flex: 1 }} accessibilityRole="button">
              <Text style={[sky.big, { marginTop: 26 }]}>Prayer times</Text>
              <Text style={sky.line}>Today’s times wherever you are, with an alert as each prayer begins.</Text>
              <View style={{ flex: 1 }} />
              <Glass style={styles.setUp}>
                <Text style={styles.setUpText}>Set up for where you are</Text>
                <Icon name="chevron" size={16} color="#FFFFFF" />
              </Glass>
            </Pressable>
          )}
        </SkyHero>
        <View style={[styles.sheet, { backgroundColor: pal.bg }]}>
        <Pressable onPress={() => router.push('/pray')} style={({ pressed }) => [styles.learn, { backgroundColor: pal.surface, opacity: pressed ? 0.8 : 1 }]} accessibilityRole="button" accessibilityLabel="Learn to pray, step by step">
          <View style={[styles.learnArt, { backgroundColor: pal.bold ? mix(pal.surface, pal.pop.emerald, 0.14) : mix(pal.surface, pal.accent, 0.1) }]}>
            <Image source={poseArt(prefs.prayFigure ?? 'brother', 'ruku')} style={{ width: '100%', height: '100%' }} resizeMode="contain" accessibilityIgnoresInvertColors />
          </View>
          <View style={{ flex: 1, gap: 3 }}>
            <Text style={[styles.eyebrow, { color: pal.accent }]}>NEW TO PRAYER?</Text>
            <Text style={[styles.learnTitle, { color: pal.text }]}>Learn to pray</Text>
            <Text style={[styles.sub, { color: pal.muted }]}>Every position with pictures and the words to say, then pray along</Text>
          </View>
          <Icon name="chevron" size={18} color={pal.muted} />
        </Pressable>

        <Section pal={pal} title="Your mosque" />
        <Group pal={pal}>
          <Row
            pal={pal}
            icon="mosque"
            title={prefs.mosque ? prefs.mosque.name : 'Add your mosque'}
            sub={prefs.mosque ? 'Jamaʿah (group prayer) times and alerts' : 'An alert before each jamaʿah, the group prayer'}
            onPress={() => router.push('/mosque')}
            onInfo={() => explain('jamaah')}
            highlight={!prefs.mosque}
          />
          <Row pal={pal} icon="compass" title="Mosques near you" sub="Nearest first, with directions" onPress={() => router.push('/nearby')} divider />
        </Group>

        <Section pal={pal} title="Every day" />
        <TileGrid>
          <Tile pal={pal} colour={pal.pop.amber} art="mushaf" title="Learn surahs" sub="Short ones for your prayer" onPress={() => router.push('/learn')} onInfo={() => explain('surahs')} />
          <Tile pal={pal} colour={pal.pop.sky} art="kaaba" title="Qibla" sub="Which way to face Makkah" onPress={() => router.push('/qibla')} onInfo={() => explain('qibla')} />
          <Tile pal={pal} colour={pal.pop.rose} art="hands" title="Find a dua" sub="For what’s happening" onPress={() => router.push('/duas')} onInfo={() => explain('dua')} />
          <Tile pal={pal} colour={pal.pop.violet} art="beads" title="Tasbeeh" sub={tasbeehToday ? `${tasbeehToday} today` : 'Count your remembrance'} onPress={() => router.push('/tasbeeh')} onInfo={() => explain('dhikr')} />
        </TileGrid>
        <Group pal={pal}>
          <Row pal={pal} icon="tv" title="Live from Makkah and Madinah" sub="The two Holy Mosques, and Quran radio" onPress={() => router.push('/live')} />
          <Row pal={pal} icon="bell" title="Prayer times and alerts" sub={s.loc ? 'Calculation, Asr and alerts' : 'Set up for where you are'} onPress={() => router.push('/prayertimes')} onInfo={() => explain('prayertimes')} divider />
        </Group>
        <ExplainIntro id="salah" pal={pal} />
        <Pressable onPress={() => router.push('/explain')} style={styles.more} accessibilityRole="button">
          <Icon name="info" size={15} color={pal.accent} />
          <Text style={[styles.moreText, { color: pal.accent }]}>New to this? Words and practices explained</Text>
        </Pressable>
        </View>
      </ScrollView>
      {explainSheet}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  learn: { flexDirection: 'row', alignItems: 'center', gap: 14, borderRadius: 22, padding: 12, paddingRight: 16 },
  learnArt: { width: 96, height: 96, borderRadius: 16, overflow: 'hidden' },
  learnTitle: { fontFamily: fonts.uiBold, fontSize: 20, letterSpacing: -0.4 },
  more: { flexDirection: 'row', alignItems: 'center', gap: 6, alignSelf: 'center', paddingVertical: 8 },
  moreText: { fontFamily: fonts.uiSemi, fontSize: 14 },
  head: { paddingHorizontal: 20, paddingBottom: 6 },
  title: { fontFamily: fonts.uiBold, fontSize: 34, letterSpacing: -0.8 },
  sheet: { marginTop: -28, borderTopLeftRadius: 28, borderTopRightRadius: 28, padding: 16, paddingTop: 20, gap: 12 },
  strip: { flexDirection: 'row', padding: 5, gap: 2 },
  setUp: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 14 },
  setUpText: { fontFamily: fonts.uiSemi, fontSize: 15.5, color: '#FFFFFF' },
  card: { borderRadius: 22, padding: 16, gap: 2 },
  cardArt: { position: 'absolute', right: -18, top: -16, width: 104, height: 104 },
  eyebrow: { fontFamily: fonts.uiBold, fontSize: 12, letterSpacing: 1.2 },
  next: { fontFamily: fonts.uiBold, fontSize: 26, letterSpacing: -0.5, marginTop: 2, paddingRight: 84 },
  sub: { fontFamily: fonts.ui, fontSize: 14, lineHeight: 19 },
  rowTitle: { fontFamily: fonts.uiSemi, fontSize: 16, lineHeight: 22 },
  times: { flexDirection: 'row', borderTopWidth: StyleSheet.hairlineWidth, marginTop: 12, paddingTop: 10, gap: 4 },
  time: { flex: 1, alignItems: 'center', gap: 2, borderRadius: 17, paddingVertical: 9 },
  timeName: { fontFamily: fonts.uiSemi, fontSize: 12 },
  timeAt: { fontFamily: fonts.uiBold, fontSize: 15, fontVariant: ['tabular-nums'] },
});
