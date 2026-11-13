import { useRouter } from 'expo-router';
import { FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Icon } from '@/components/Icon';
import { LEARN } from '@/data/learn';
import { isLearned, learnedAyat, learnedCount, nextToLearn } from '@/lib/learn';
import { useProgress } from '@/lib/progress';
import { SURAHS } from '@/lib/quran';
import { fonts, mix, usePalette } from '@/lib/theme';

/** Surahs for your prayer: the short surahs, easiest first, to learn one ayah at a time. */
export default function LearnList() {
  const pal = usePalette();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { progress } = useProgress();
  const next = nextToLearn(progress);
  const count = learnedCount(progress);

  return (
    <View style={[styles.root, { backgroundColor: pal.bg }]}>
      <View style={[styles.head, { paddingTop: insets.top + 12, borderColor: pal.line }]}>
        <Text style={[styles.title, { color: pal.text }]}>Surahs for your prayer</Text>
        <Pressable onPress={() => router.back()} style={[styles.x, { borderColor: pal.line }]} accessibilityRole="button" accessibilityLabel="Close" hitSlop={8}>
          <Icon name="close" size={18} color={pal.text} />
        </Pressable>
      </View>
      <FlatList
        data={LEARN}
        keyExtractor={(l) => String(l.s)}
        contentContainerStyle={{ padding: 16, gap: 10, paddingBottom: insets.bottom + 30 }}
        ListHeaderComponent={
          <View style={{ gap: 10, marginBottom: 4 }}>
            <View style={[styles.card, { backgroundColor: pal.surface }]}>
              <Text style={[styles.eyebrow, { color: pal.accent }]}>{count ? `${count} OF ${LEARN.length} LEARNED` : 'START HERE'}</Text>
              <Text style={[styles.body, { color: pal.text }]}>
                In the first two rakʿahs of each prayer, after al-Fatihah, you can recite any surah you know. These are the shortest, easiest first. Learn one ayah at a time: listen, repeat, then test yourself.
              </Text>
            </View>
            <Text style={[styles.small, { color: pal.muted, paddingHorizontal: 4 }]}>
              Many teachers suggest reciting them in the order they come in the Quran: the surah with the higher number in the second rakʿah. If you’re unsure, ask your local imam.
            </Text>
          </View>
        }
        renderItem={({ item: l, index }) => {
          const done = isLearned(progress, l);
          const part = learnedAyat(progress, l);
          const up = next?.s === l.s;
          return (
            <Pressable
              onPress={() => router.push({ pathname: '/learn/[s]', params: { s: String(l.s) } })}
              style={({ pressed }) => [styles.row, { backgroundColor: pal.surface, borderColor: up ? pal.accent : 'transparent', opacity: pressed ? 0.75 : 1 }]}
              accessibilityRole="button"
              accessibilityLabel={`${l.name}, ${l.ayat.length} ayat${done ? ', learned' : up ? ', next to learn' : ''}`}
            >
              <View style={[styles.badge, { backgroundColor: done ? pal.accent : up ? mix(pal.surface, pal.accent, 0.14) : mix(pal.surface, pal.text, 0.06) }]}>
                {done ? <Icon name="check" size={16} color={pal.onAccent} strokeWidth={2.4} /> : <Text style={[styles.badgeText, { color: up ? pal.accent : pal.muted }]}>{index + 1}</Text>}
              </View>
              <View style={{ flex: 1, gap: 3 }}>
                <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 8 }}>
                  <Text style={[styles.name, { color: pal.text }]}>{l.name}</Text>
                  {up && <Text style={[styles.tag, { color: pal.accent }]}>{part ? 'KEEP GOING' : 'NEXT UP'}</Text>}
                </View>
                <Text style={[styles.small, { color: pal.muted }]}>
                  {l.meaning} · {l.ayat.length} ayat · {l.words} words{part && !done ? ` · ${part} of ${l.ayat.length} learned` : ''}
                </Text>
                <Text style={[styles.small, { color: pal.text }]} numberOfLines={2}>
                  {l.note}
                </Text>
              </View>
              <Text style={[styles.ar, { color: pal.text }]}>{SURAHS[l.s - 1][1]}</Text>
            </Pressable>
          );
        }}
        ListFooterComponent={
          <Text style={[styles.small, { color: pal.muted, marginTop: 6, paddingHorizontal: 4 }]}>
            Recitation by Mahmoud Khalil al-Husary, slow and clear. Transliterations are a guide only: listen closely, and learn with a teacher when you can. Being checked by a Quran teacher.
          </Text>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  head: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 18, paddingBottom: 12, borderBottomWidth: StyleSheet.hairlineWidth },
  title: { fontFamily: fonts.uiBold, fontSize: 24, letterSpacing: -0.5, flex: 1 },
  x: { width: 36, height: 36, borderRadius: 18, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  card: { borderRadius: 16, padding: 16, gap: 8 },
  eyebrow: { fontFamily: fonts.uiBold, fontSize: 11.5, letterSpacing: 1.2 },
  body: { fontFamily: fonts.read, fontSize: 15.5, lineHeight: 23 },
  small: { fontFamily: fonts.ui, fontSize: 13, lineHeight: 18 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, borderRadius: 16, borderWidth: 1.5, padding: 14 },
  badge: { width: 34, height: 34, borderRadius: 17, alignItems: 'center', justifyContent: 'center' },
  badgeText: { fontFamily: fonts.uiBold, fontSize: 13 },
  name: { fontFamily: fonts.uiSemi, fontSize: 16.5 },
  tag: { fontFamily: fonts.uiBold, fontSize: 10.5, letterSpacing: 1 },
  ar: { fontFamily: fonts.arabic, fontSize: 20 },
});
