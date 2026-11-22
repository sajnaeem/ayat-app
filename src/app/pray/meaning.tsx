import { useRouter } from 'expo-router';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Icon } from '@/components/Icon';
import { LEARN_ORDER, STEPS, Words } from '@/data/salah';
import { learnSurah } from '@/lib/learn';
import { fonts, usePalette } from '@/lib/theme';

/**
 * "What am I saying in my prayer?" (Saj, 22 Nov 2026): every phrase of the prayer with its meaning, in the order it is said.
 * Nothing new is written here: the words, transliterations and meanings are the ones already in Learn to pray (src/data/salah.ts)
 * and al-Fatihah from Surahs for your prayer (src/data/learn.ts). Like them, it needs a scholar's check.
 */
export default function PrayerMeanings() {
  const pal = usePalette();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const fatihah = learnSurah(1);
  const steps = LEARN_ORDER.map((id) => STEPS[id]).filter((st) => st && (st.say?.length || st.recite === 'fatihah'));

  const line = (w: Words, key: string) => (
    <View key={key} style={[styles.words, { borderColor: pal.line }]}>
      <Text style={[styles.ar, { color: pal.text }]} accessibilityLanguage="ar">{w.ar}</Text>
      <Text style={[styles.tl, { color: pal.accent }]}>{w.tl}</Text>
      <Text style={[styles.en, { color: pal.text }]}>{w.en}</Text>
      <Text style={[styles.src, { color: pal.muted }]}>{w.times && w.times > 1 ? `Said ${w.times} times  ·  ` : ''}{w.src}</Text>
    </View>
  );

  return (
    <View style={[styles.root, { backgroundColor: pal.bg }]}>
      <View style={[styles.head, { paddingTop: insets.top + 12, borderColor: pal.line }]}>
        <Pressable onPress={() => router.back()} style={[styles.x, { borderColor: pal.line }]} accessibilityRole="button" accessibilityLabel="Back" hitSlop={8}>
          <View style={{ transform: [{ rotate: '180deg' }] }}>
            <Icon name="chevron" size={18} color={pal.text} />
          </View>
        </Pressable>
        <Text style={[styles.title, { color: pal.text }]}>What am I saying?</Text>
      </View>
      <ScrollView contentContainerStyle={{ padding: 16, gap: 14, paddingBottom: insets.bottom + 40 }}>
        <Text style={[styles.intro, { color: pal.muted }]}>
          It is easier to keep your mind on the prayer when you know what the words mean. Here is every phrase from Learn to pray with its meaning, in the order you say it. Read through once, slowly, before your next prayer.
        </Text>
        {steps.map((st, i) => (
          <View key={st.id} style={[styles.card, { backgroundColor: pal.surface, borderColor: pal.line }]}>
            <Text style={[styles.eyebrow, { color: pal.accent }]}>{`${i + 1}  ·  ${st.name.toUpperCase()}`}</Text>
            <Text style={[styles.step, { color: pal.text }]}>{st.title}</Text>
            {st.recite === 'fatihah' && fatihah?.ayat.map((a, j) => line({ ar: a.ar, tl: a.tl, en: a.en, src: `Al-Fatihah, ayah ${j + 1}  ·  Saheeh International` }, `f${j}`))}
            {st.say?.map((w, j) => line(w, `${st.id}${j}`))}
            <Pressable onPress={() => router.push({ pathname: '/pray/[mode]', params: { mode: 'learn', at: st.id } })} accessibilityRole="link" hitSlop={6}>
              <Text style={[styles.link, { color: pal.accent }]}>See this step with its picture</Text>
            </Pressable>
          </View>
        ))}
        <Text style={[styles.note, { color: pal.muted }]}>
          After al-Fatihah you recite any other part of the Quran you know; Surahs for your prayer gives the meaning of each short surah. Some of these words are said a little differently from mosque to mosque: your local imam is the best person to ask.
        </Text>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  head: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 18, paddingBottom: 12, borderBottomWidth: StyleSheet.hairlineWidth },
  title: { fontFamily: fonts.uiBold, fontSize: 24, letterSpacing: -0.5, flex: 1 },
  x: { width: 36, height: 36, borderRadius: 18, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  intro: { fontFamily: fonts.read, fontSize: 16, lineHeight: 24 },
  card: { borderRadius: 18, borderWidth: StyleSheet.hairlineWidth, padding: 16, gap: 4 },
  eyebrow: { fontFamily: fonts.uiBold, fontSize: 11.5, letterSpacing: 1.1 },
  step: { fontFamily: fonts.uiBold, fontSize: 19, letterSpacing: -0.3, marginBottom: 2 },
  words: { borderTopWidth: StyleSheet.hairlineWidth, paddingTop: 12, marginTop: 10, gap: 6 },
  ar: { fontFamily: fonts.arabic, fontSize: 24, lineHeight: 44, textAlign: 'right', writingDirection: 'rtl' },
  tl: { fontFamily: fonts.readItalic, fontSize: 15, lineHeight: 22 },
  en: { fontFamily: fonts.read, fontSize: 16.5, lineHeight: 24 },
  src: { fontFamily: fonts.ui, fontSize: 12, marginTop: 2 },
  link: { fontFamily: fonts.uiSemi, fontSize: 13.5, marginTop: 12 },
  note: { fontFamily: fonts.ui, fontSize: 13, lineHeight: 19 },
});
