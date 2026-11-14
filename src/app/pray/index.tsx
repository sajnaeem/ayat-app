import { useRouter } from 'expo-router';
import { Image, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ExplainIntro, useExplain } from '@/components/Explain';
import { FigureSwitch } from '@/components/FigureSwitch';
import { Icon } from '@/components/Icon';
import { Group, Row, Section } from '@/components/List';
import { BEFORE, LEARN_ORDER, PRAYERS, STEPS, WUDU, WUDU_END } from '@/data/salah';
import { poseArt } from '@/lib/art';
import { usePrefs } from '@/lib/store';
import { fonts, mix, onColour, usePalette } from '@/lib/theme';

/** Learn to pray: how salah looks, step by step, with pictures, the words to say, and a guided "pray along". */
export default function LearnToPray() {
  const pal = usePalette();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const prefs = usePrefs();
  const fig = prefs.prayFigure ?? 'brother';
  const [explain, sheet] = useExplain(pal);
  const hero = pal.bold ? pal.pop.emerald : pal.surface;
  const hp = onColour(pal, hero);

  return (
    <View style={[styles.root, { backgroundColor: pal.bg }]}>
      <View style={[styles.head, { paddingTop: insets.top + 12, borderColor: pal.line }]}>
        <Text style={[styles.title, { color: pal.text }]}>Learn to pray</Text>
        <Pressable onPress={() => router.back()} style={[styles.x, { borderColor: pal.line }]} accessibilityRole="button" accessibilityLabel="Close" hitSlop={8}>
          <Icon name="close" size={18} color={pal.text} />
        </Pressable>
      </View>
      <ScrollView contentContainerStyle={{ padding: 16, gap: 12, paddingBottom: insets.bottom + 40 }}>
        <View style={[styles.hero, { backgroundColor: hero }]}>
          <View style={[styles.heroArt, { backgroundColor: 'rgba(255,255,255,0.16)' }]}>
            <Image source={poseArt(fig, 'takbir')} style={{ width: '100%', height: '100%' }} resizeMode="contain" accessibilityLabel="A figure on a prayer mat, hands raised to begin the prayer" />
          </View>
          <Text style={[styles.eyebrow, { color: hp.muted }]}>SALAH, STEP BY STEP</Text>
          <Text style={[styles.heroTitle, { color: hp.text }]}>From the first Allahu akbar to the last salam</Text>
          <Text style={[styles.heroBody, { color: hp.muted }]}>Each position with a picture, what to do, and the words to say in Arabic, transliteration and English. Then pray along, one step at a time.</Text>
          <Pressable onPress={() => router.push({ pathname: '/pray/[mode]', params: { mode: 'learn' } })} style={({ pressed }) => [styles.cta, { backgroundColor: hp.text, opacity: pressed ? 0.85 : 1 }]} accessibilityRole="button">
            <Text style={[styles.ctaText, { color: hero }]}>Start learning</Text>
          </Pressable>
        </View>

        <FigureSwitch pal={pal} />
        <ExplainIntro id="salah" pal={pal} />

        <Section pal={pal} title="Pray along" note="Follow a whole prayer, rakʿah by rakʿah, with the words on screen." />
        <Group pal={pal}>
          {PRAYERS.map((p, i) => (
            <Pressable key={p.id} onPress={() => router.push({ pathname: '/pray/[mode]', params: { mode: p.id } })} style={({ pressed }) => [styles.prayer, i > 0 && { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: pal.line }, pressed && { opacity: 0.6 }]} accessibilityRole="button" accessibilityLabel={`${p.name}, ${p.rakahs} rakʿahs`}>
              <View style={[styles.count, { backgroundColor: mix(pal.surface, pal.accent, 0.13) }]}>
                <Text style={[styles.countN, { color: pal.accent }]}>{p.rakahs}</Text>
              </View>
              <View style={{ flex: 1, gap: 2 }}>
                <Text style={[styles.rowTitle, { color: pal.text }]}>{p.name}</Text>
                <Text style={[styles.small, { color: pal.muted }]}>{p.aloud} · {p.rakahs} rakʿahs</Text>
              </View>
              <Text style={[styles.ar, { color: pal.text }]}>{p.ar}</Text>
              <Icon name="chevron" size={16} color={pal.muted} />
            </Pressable>
          ))}
        </Group>
        <Text style={[styles.small, { color: pal.muted, paddingHorizontal: 4 }]}>These are the obligatory (fard) rakʿahs. Many Muslims pray extra sunnah rakʿahs around them too; start with these, and add more as you grow.</Text>

        <Section pal={pal} title="Every step" note="Tap any step to learn it." />
        <Group pal={pal}>
          {LEARN_ORDER.map((id, i) => {
            const s = STEPS[id];
            return (
              <Pressable key={id} onPress={() => router.push({ pathname: '/pray/[mode]', params: { mode: 'learn', at: String(i) } })} style={({ pressed }) => [styles.step, i > 0 && { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: pal.line }, pressed && { opacity: 0.6 }]} accessibilityRole="button" accessibilityLabel={`${i + 1}. ${s.title}`}>
                <View style={[styles.thumb, { backgroundColor: mix(pal.surface, pal.accent, 0.08) }]}>
                  <Image source={poseArt(fig, s.pose)} style={{ width: '100%', height: '100%' }} resizeMode="contain" />
                </View>
                <View style={{ flex: 1, gap: 2 }}>
                  <Text style={[styles.tag, { color: pal.accent }]}>{i + 1} · {s.name.toUpperCase()}</Text>
                  <Text style={[styles.rowTitle, { color: pal.text }]}>{s.title}</Text>
                </View>
                <Icon name="chevron" size={16} color={pal.muted} />
              </Pressable>
            );
          })}
        </Group>

        <Section pal={pal} title="Before you pray" />
        <Group pal={pal}>
          {BEFORE.map((b, i) => (
            <View key={b.title} style={[styles.note, i > 0 && { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: pal.line }]}>
              <Text style={[styles.rowTitle, { color: pal.text }]}>{b.title}</Text>
              <Text style={[styles.body, { color: pal.muted }]}>{b.how}</Text>
            </View>
          ))}
        </Group>
        <Group pal={pal}>
          <Row pal={pal} icon="compass" title="Qibla" sub="Which way to face" onPress={() => router.push('/qibla')} onInfo={() => explain('qibla')} />
          <Row pal={pal} icon="bell" title="Prayer times" sub="When each prayer is, where you are" onPress={() => router.push('/prayertimes')} onInfo={() => explain('prayertimes')} divider />
          <Row pal={pal} icon="book" title="Surahs for your prayer" sub="Learn al-Fatihah and short surahs" onPress={() => router.push('/learn')} onInfo={() => explain('surahs')} divider />
        </Group>

        <Section pal={pal} title="Wudu, the washing before prayer" note="The order most mosques teach. Use clean water; it only takes a couple of minutes." />
        <Group pal={pal}>
          {WUDU.map((w, i) => (
            <View key={w.title} style={[styles.wudu, i > 0 && { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: pal.line }]}>
              <View style={[styles.num, { backgroundColor: mix(pal.surface, pal.accent, 0.13) }]}>
                <Text style={[styles.numText, { color: pal.accent }]}>{i + 1}</Text>
              </View>
              <View style={{ flex: 1, gap: 2 }}>
                <Text style={[styles.rowTitle, { color: pal.text }]}>
                  {w.title}
                  {w.times ? <Text style={{ color: pal.accent }}>{`  ×${w.times}`}</Text> : null}
                </Text>
                <Text style={[styles.body, { color: pal.muted }]}>{w.how}</Text>
              </View>
            </View>
          ))}
          <View style={[styles.note, { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: pal.line, gap: 6 }]}>
            <Text style={[styles.arBig, { color: pal.text }]}>{WUDU_END.ar}</Text>
            <Text style={[styles.tl, { color: pal.text }]}>{WUDU_END.tl}</Text>
            <Text style={[styles.body, { color: pal.muted }]}>{WUDU_END.en}</Text>
            <Text style={[styles.src, { color: pal.muted }]}>{WUDU_END.src}</Text>
          </View>
        </Group>
        <Text style={[styles.small, { color: pal.muted, paddingHorizontal: 4 }]}>Wudu is broken by using the toilet, passing wind and deep sleep; the schools differ on some other things. When wudu is broken, make it again before your next prayer. Ask your local imam about anything you’re unsure of.</Text>

        <Text style={[styles.small, { color: pal.muted, paddingHorizontal: 4, marginTop: 8 }]}>
          This guide shows the way the prayer is commonly done. Muslims pray in a few slightly different ways, all followed by sincere scholars; where it matters, we say so. Your local mosque will be glad to show you. Being checked by scholars. Prayer words from Hisn al-Muslim.
        </Text>
      </ScrollView>
      {sheet}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  head: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 18, paddingBottom: 12, borderBottomWidth: StyleSheet.hairlineWidth },
  title: { fontFamily: fonts.uiBold, fontSize: 24, letterSpacing: -0.5, flex: 1 },
  x: { width: 36, height: 36, borderRadius: 18, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  hero: { borderRadius: 24, padding: 18, gap: 8 },
  heroArt: { height: 220, borderRadius: 18, marginBottom: 6, overflow: 'hidden' },
  eyebrow: { fontFamily: fonts.uiBold, fontSize: 11.5, letterSpacing: 1.2 },
  heroTitle: { fontFamily: fonts.uiBold, fontSize: 24, lineHeight: 29, letterSpacing: -0.5 },
  heroBody: { fontFamily: fonts.ui, fontSize: 14.5, lineHeight: 20 },
  cta: { marginTop: 6, borderRadius: 999, paddingVertical: 14, alignItems: 'center' },
  ctaText: { fontFamily: fonts.uiBold, fontSize: 16 },
  prayer: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 14, paddingVertical: 12 },
  count: { width: 38, height: 38, borderRadius: 19, alignItems: 'center', justifyContent: 'center' },
  countN: { fontFamily: fonts.uiBold, fontSize: 16 },
  rowTitle: { fontFamily: fonts.uiSemi, fontSize: 16 },
  small: { fontFamily: fonts.ui, fontSize: 13, lineHeight: 18 },
  ar: { fontFamily: fonts.arabic, fontSize: 19 },
  step: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 12, paddingVertical: 8 },
  thumb: { width: 64, height: 64, borderRadius: 14, overflow: 'hidden' },
  tag: { fontFamily: fonts.uiBold, fontSize: 10.5, letterSpacing: 1 },
  note: { padding: 14, gap: 4 },
  body: { fontFamily: fonts.ui, fontSize: 14, lineHeight: 20 },
  wudu: { flexDirection: 'row', gap: 12, padding: 14 },
  num: { width: 28, height: 28, borderRadius: 14, alignItems: 'center', justifyContent: 'center', marginTop: 1 },
  numText: { fontFamily: fonts.uiBold, fontSize: 13 },
  arBig: { fontFamily: fonts.arabic, fontSize: 21, lineHeight: 38, textAlign: 'right', writingDirection: 'rtl' },
  tl: { fontFamily: fonts.read, fontStyle: 'italic', fontSize: 14.5, lineHeight: 21 },
  src: { fontFamily: fonts.ui, fontSize: 12 },
});
