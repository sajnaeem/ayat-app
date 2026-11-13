import * as Haptics from 'expo-haptics';
import { useRouter } from 'expo-router';
import { Pressable, ScrollView, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Circle } from 'react-native-svg';
import { ExplainIntro } from '@/components/Explain';
import { Icon } from '@/components/Icon';
import { usePrefs } from '@/lib/store';
import { fonts, mix, usePalette } from '@/lib/theme';

/**
 * Tasbeeh: a counter for dhikr. Tap anywhere on the big circle; the phone gives a small tap each time
 * and a stronger one at the target. Counts stay on the phone.
 * Phrases and the after-prayer set (33 · 33 · 34, Sahih Muslim 596) need a scholar's check like all Arabic in Munib.
 */
export const PHRASES = [
  { id: 'subhanallah', ar: 'سُبْحَانَ ٱللَّهِ', tl: 'SubhanAllah', en: 'Glory be to Allah' },
  { id: 'alhamdulillah', ar: 'ٱلْحَمْدُ لِلَّهِ', tl: 'Alhamdulillah', en: 'All praise is for Allah' },
  { id: 'allahuakbar', ar: 'ٱللَّهُ أَكْبَرُ', tl: 'Allahu Akbar', en: 'Allah is the Greatest' },
  { id: 'lailaha', ar: 'لَا إِلَٰهَ إِلَّا ٱللَّهُ', tl: 'La ilaha illallah', en: 'There is no god but Allah' },
  { id: 'astaghfirullah', ar: 'أَسْتَغْفِرُ ٱللَّهَ', tl: 'Astaghfirullah', en: 'I seek Allah’s forgiveness' },
  { id: 'bihamdihi', ar: 'سُبْحَانَ ٱللَّهِ وَبِحَمْدِهِ', tl: 'SubhanAllahi wa bihamdihi', en: 'Glory be to Allah, and praise Him' },
  { id: 'salawat', ar: 'ٱللَّهُمَّ صَلِّ عَلَىٰ مُحَمَّدٍ', tl: 'Allahumma salli ʿala Muhammad', en: 'O Allah, send blessings on Muhammad' },
];
// After each prayer: 33 SubhanAllah, 33 Alhamdulillah, 34 Allahu Akbar (Sahih Muslim 596).
const SET = [
  { id: 'subhanallah', n: 33 },
  { id: 'alhamdulillah', n: 33 },
  { id: 'allahuakbar', n: 34 },
];
const TARGETS = [33, 99, 100, 0]; // 0 = no target
const today = () => new Date().toISOString().slice(0, 10);

export default function Tasbeeh() {
  const pal = usePalette();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { width, height } = useWindowDimensions();
  const prefs = usePrefs();
  const t = prefs.tasbeeh;
  const phrase = PHRASES.find((p) => p.id === t.phrase) ?? PHRASES[0];
  const setIx = t.set ? SET.findIndex((x) => x.id === t.phrase) : -1;
  const todayCount = t.day === today() ? t.today : 0;

  const save = (x: Partial<typeof t>) => prefs.set({ tasbeeh: { ...t, ...x } });

  const tap = () => {
    const count = t.count + 1;
    const base = { day: today(), today: todayCount + 1, total: t.total + 1 };
    if (t.target && count >= t.target) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
      // In the after-prayer set, move on to the next phrase; otherwise stay at the target until reset.
      if (t.set && setIx >= 0 && setIx < SET.length - 1) {
        const next = SET[setIx + 1];
        save({ ...base, phrase: next.id, target: next.n, count: 0 });
        return;
      }
      if (count > t.target) {
        // Tapping on after the target starts a new round.
        save({ ...base, count: 1 });
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
        return;
      }
    } else Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    save({ ...base, count });
  };
  const reset = () => save(t.set ? { phrase: SET[0].id, target: SET[0].n, count: 0 } : { count: 0 });
  const done = !!t.target && t.count >= t.target;
  const setDone = t.set && setIx === SET.length - 1 && done;

  const size = Math.min(width - 64, height * 0.38, 320);
  const r = size / 2 - 8;
  const circ = 2 * Math.PI * r;
  const frac = t.target ? Math.min(1, t.count / t.target) : 0;

  return (
    <View style={[styles.root, { backgroundColor: pal.bg }]}>
      <View style={[styles.head, { paddingTop: insets.top + 12, borderColor: pal.line }]}>
        <Text style={[styles.title, { color: pal.text }]}>Tasbeeh</Text>
        <Pressable onPress={() => router.back()} style={[styles.x, { borderColor: pal.line }]} accessibilityRole="button" accessibilityLabel="Close" hitSlop={8}>
          <Icon name="close" size={18} color={pal.text} />
        </Pressable>
      </View>
      <ScrollView contentContainerStyle={{ paddingBottom: insets.bottom + 24 }}>
        <ExplainIntro id="dhikr" pal={pal} style={{ marginHorizontal: 18, marginTop: 4, marginBottom: 6 }} />
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chips}>
          <Pressable
            onPress={() => save({ set: true, phrase: SET[0].id, target: SET[0].n, count: 0 })}
            style={[styles.chip, { borderColor: t.set ? pal.accent : pal.line, backgroundColor: t.set ? mix(pal.surface, pal.accent, 0.1) : pal.surface }]}
            accessibilityRole="button"
            accessibilityState={{ selected: t.set }}
          >
            <Text style={[styles.chipText, { color: pal.text }]}>After prayer</Text>
          </Pressable>
          {PHRASES.map((p) => {
            const on = !t.set && p.id === t.phrase;
            return (
              <Pressable
                key={p.id}
                onPress={() => save({ set: false, phrase: p.id, count: 0, target: t.set ? 33 : t.target })}
                style={[styles.chip, { borderColor: on ? pal.accent : pal.line, backgroundColor: on ? mix(pal.surface, pal.accent, 0.1) : pal.surface }]}
                accessibilityRole="button"
                accessibilityState={{ selected: on }}
              >
                <Text style={[styles.chipText, { color: pal.text }]}>{p.tl}</Text>
              </Pressable>
            );
          })}
        </ScrollView>

        <View style={{ alignItems: 'center', paddingHorizontal: 24, gap: 4, marginTop: 10 }}>
          <Text style={[styles.ar, { color: pal.text }]}>{phrase.ar}</Text>
          <Text style={[styles.tl, { color: pal.accent }]}>{phrase.tl}</Text>
          <Text style={[styles.en, { color: pal.muted }]}>{phrase.en}</Text>
          {t.set && (
            <Text style={[styles.small, { color: pal.muted, marginTop: 4 }]}>
              {SET.map((x, i) => `${i === setIx ? '● ' : ''}${x.n}`).join('  ·  ')}
            </Text>
          )}
        </View>

        <Pressable
          onPress={tap}
          style={({ pressed }) => [styles.counter, { width: size, height: size, transform: [{ scale: pressed ? 0.97 : 1 }] }]}
          accessibilityRole="button"
          accessibilityLabel={`Count. ${t.count}${t.target ? ` of ${t.target}` : ''}`}
        >
          <Svg width={size} height={size} style={StyleSheet.absoluteFill}>
            <Circle cx={size / 2} cy={size / 2} r={r} fill={done ? mix(pal.bg, pal.accent, 0.12) : pal.surface} stroke={pal.line} strokeWidth={6} />
            {!!t.target && (
              <Circle
                cx={size / 2}
                cy={size / 2}
                r={r}
                fill="none"
                stroke={pal.accent}
                strokeWidth={6}
                strokeLinecap="round"
                strokeDasharray={`${circ * frac} ${circ}`}
                transform={`rotate(-90 ${size / 2} ${size / 2})`}
              />
            )}
          </Svg>
          <Text style={[styles.count, { color: pal.text, fontSize: size * 0.3 }]}>{t.count}</Text>
          <Text style={[styles.small, { color: done ? pal.accent : pal.muted }]}>
            {setDone ? 'Set complete, alhamdulillah' : done ? 'Done · tap to start again' : t.target ? `of ${t.target}` : 'Tap to count'}
          </Text>
        </Pressable>

        <View style={styles.row}>
          {!t.set &&
            TARGETS.map((n) => (
              <Pressable
                key={n}
                onPress={() => save({ target: n })}
                style={[styles.target, { borderColor: t.target === n ? pal.accent : pal.line, backgroundColor: t.target === n ? mix(pal.surface, pal.accent, 0.1) : pal.surface }]}
                accessibilityRole="button"
                accessibilityLabel={n ? `Target ${n}` : 'No target'}
              >
                <Text style={[styles.chipText, { color: pal.text }]}>{n || '∞'}</Text>
              </Pressable>
            ))}
          <Pressable onPress={reset} style={[styles.target, { borderColor: pal.line, backgroundColor: pal.surface, paddingHorizontal: 16 }]} accessibilityRole="button">
            <Text style={[styles.chipText, { color: pal.text }]}>Reset</Text>
          </Pressable>
        </View>
        <Text style={[styles.small, { color: pal.muted, textAlign: 'center', marginTop: 16 }]}>
          Today {todayCount.toLocaleString('en-GB')} · All time {t.total.toLocaleString('en-GB')}
        </Text>
        <Text style={[styles.small, { color: pal.muted, textAlign: 'center', marginTop: 6, paddingHorizontal: 32 }]}>
          {t.set ? 'After each prayer: 33 SubhanAllah, 33 Alhamdulillah, 34 Allahu Akbar (Sahih Muslim 596). ' : ''}Your counts stay on your phone.
        </Text>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  head: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 18, paddingBottom: 12, borderBottomWidth: StyleSheet.hairlineWidth },
  title: { fontFamily: fonts.uiBold, fontSize: 26, letterSpacing: -0.5 },
  x: { width: 36, height: 36, borderRadius: 18, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  chips: { gap: 6, paddingHorizontal: 18, paddingVertical: 14 },
  chip: { borderWidth: 1, borderRadius: 999, paddingHorizontal: 13, paddingVertical: 8 },
  chipText: { fontFamily: fonts.uiSemi, fontSize: 13.5 },
  ar: { fontFamily: fonts.arabic, fontSize: 32, lineHeight: 60, textAlign: 'center' },
  tl: { fontFamily: fonts.uiBold, fontSize: 15 },
  en: { fontFamily: fonts.read, fontSize: 15 },
  small: { fontFamily: fonts.ui, fontSize: 13, lineHeight: 18 },
  counter: { alignSelf: 'center', alignItems: 'center', justifyContent: 'center', marginTop: 18 },
  count: { fontFamily: fonts.uiBold, fontVariant: ['tabular-nums'], letterSpacing: -2 },
  row: { flexDirection: 'row', justifyContent: 'center', gap: 8, marginTop: 20, flexWrap: 'wrap', paddingHorizontal: 18 },
  target: { borderWidth: 1, borderRadius: 12, minWidth: 54, minHeight: 42, alignItems: 'center', justifyContent: 'center' },
});
