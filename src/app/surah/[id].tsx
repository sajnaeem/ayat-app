import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Icon } from '@/components/Icon';
import { useToast } from '@/components/Toast';
import { useProgress } from '@/lib/progress';
import { arabicNumber, ChapterAyah, LANGS, LEVELS, loadChapter, SURAHS } from '@/lib/quran';
import { usePrefs } from '@/lib/store';
import { fonts, mix, usePalette } from '@/lib/theme';

/** "Keep reading": the whole surah, opened at the ayat the reader came from. */
export default function SurahReader() {
  const { id, from = '1', to } = useLocalSearchParams<{ id: string; from?: string; to?: string }>();
  const s = Math.min(114, Math.max(1, Number(id) || 1));
  const a = Number(from) || 1;
  const b = Number(to) || a;
  const pal = usePalette();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { lang, showTl } = usePrefs();
  const [ayat, setAyat] = useState<ChapterAyah[] | null>(null);
  const [failed, setFailed] = useState(false);
  const [attempt, setAttempt] = useState(0);
  const list = useRef<FlatList<ChapterAyah>>(null);
  const { markRead } = useProgress();
  const toast = useToast();

  // An ayah counts as read once it has been on screen for a moment. Each ayah is worth a third of a feed card.
  const timers = useRef(new Map<number, ReturnType<typeof setTimeout>>());
  const seen = useRef(new Set<number>());
  const onViewable = useRef(({ viewableItems }: { viewableItems: { item?: ChapterAyah; isViewable?: boolean }[] }) => {
    const now = new Set(viewableItems.filter((x) => x.isViewable && x.item).map((x) => x.item!.n));
    for (const [n, t] of timers.current) if (!now.has(n)) (clearTimeout(t), timers.current.delete(n));
    for (const n of now) {
      if (seen.current.has(n) || timers.current.has(n)) continue;
      timers.current.set(
        n,
        setTimeout(() => {
          timers.current.delete(n);
          seen.current.add(n);
          const ev = markRead([`${s}:${n}`], 1 / 3);
          if (ev.surahsCompleted.length) toast(`MashaAllah, you've read all of ${SURAHS[s - 1][0]}`);
          else if (ev.levelUp) toast(`Unlocked: ${LEVELS[ev.levelUp - 1].name.toLowerCase()} are now in your feed`);
        }, 1200),
      );
    }
  }).current;
  useEffect(() => () => timers.current.forEach(clearTimeout), []);
  const [name, arName, meaning, count] = SURAHS[s - 1];
  const rtl = lang === 'ur';
  const hl = mix(pal.bg, pal.accent, 0.1);

  useEffect(() => {
    setFailed(false);
    setAyat(null);
    loadChapter(s, lang)
      .then(setAyat)
      .catch(() => setFailed(true));
  }, [s, lang, attempt]);

  // Open at the ayah the reader came from.
  useEffect(() => {
    if (ayat && a > 1) {
      const t = setTimeout(() => list.current?.scrollToIndex({ index: Math.min(a - 1, ayat.length - 1), animated: false, viewPosition: 0 }), 50);
      return () => clearTimeout(t);
    }
  }, [ayat, a]);

  return (
    <View style={[styles.root, { backgroundColor: pal.bg }]}>
      <View style={[styles.head, { paddingTop: insets.top + 12, borderBottomColor: pal.line }]}>
        <View style={{ flex: 1 }}>
          <Text style={[styles.title, { color: pal.text }]}>
            {name} <Text style={{ fontFamily: fonts.arabic, color: pal.muted, fontSize: 18 }}>{arName}</Text>
          </Text>
          <Text style={[styles.sub, { color: pal.muted }]}>
            {meaning} · {count} ayat · {LANGS.find((l) => l.id === lang)?.by}
          </Text>
        </View>
        <Pressable onPress={() => router.back()} style={[styles.x, { borderColor: pal.line }]} accessibilityRole="button" accessibilityLabel="Back to the feed" hitSlop={8}>
          <Icon name="close" size={16} color={pal.text} />
        </Pressable>
      </View>

      {!ayat && !failed && (
        <View style={styles.center}>
          <ActivityIndicator color={pal.accent} />
          <Text style={[styles.sub, { color: pal.muted, marginTop: 10 }]}>Loading the surah…</Text>
        </View>
      )}
      {failed && (
        <View style={styles.center}>
          <Text style={[styles.body, { color: pal.text, textAlign: 'center' }]}>Couldn't load this surah. Check your connection and try again.</Text>
          <Pressable onPress={() => setAttempt((n) => n + 1)} style={[styles.retry, { backgroundColor: pal.text }]} accessibilityRole="button">
            <Text style={{ fontFamily: fonts.uiBold, color: pal.bg }}>Try again</Text>
          </Pressable>
        </View>
      )}
      {ayat && (
        <FlatList
          ref={list}
          data={ayat}
          keyExtractor={(x) => String(x.n)}
          onViewableItemsChanged={onViewable}
          viewabilityConfig={{ itemVisiblePercentThreshold: 60 }}
          onScrollToIndexFailed={(e) => setTimeout(() => list.current?.scrollToIndex({ index: e.index, animated: false }), 120)}
          contentContainerStyle={{ paddingBottom: insets.bottom + 40 }}
          renderItem={({ item }) => {
            const on = item.n >= a && item.n <= b;
            return (
              <View style={[styles.ayah, { borderBottomColor: pal.line, backgroundColor: on ? hl : 'transparent' }]}>
                <Text style={[styles.num, { color: on ? pal.accent : pal.muted }]}>
                  {s}:{item.n}
                </Text>
                <Text style={[styles.ar, { color: pal.text }]}>
                  {item.ar} <Text style={{ color: pal.accent, fontSize: 20 }}>{'۝' + arabicNumber(item.n)}</Text>
                </Text>
                {showTl && <Text style={[styles.tl, { color: pal.accent }]}>{item.tl}</Text>}
                <Text style={[styles.body, { color: pal.text, textAlign: rtl ? 'right' : 'left', writingDirection: rtl ? 'rtl' : 'ltr', lineHeight: rtl ? 34 : 25 }]}>{item.tr}</Text>
              </View>
            );
          }}
          ListFooterComponent={<Text style={[styles.end, { color: pal.muted }]}>End of {name}.</Text>}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  head: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 18, paddingBottom: 12, borderBottomWidth: StyleSheet.hairlineWidth },
  title: { fontFamily: fonts.uiBold, fontSize: 22, letterSpacing: -0.3 },
  sub: { fontFamily: fonts.ui, fontSize: 13, marginTop: 2 },
  x: { width: 36, height: 36, borderRadius: 18, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24, gap: 14 },
  retry: { borderRadius: 10, paddingHorizontal: 18, paddingVertical: 12 },
  ayah: { paddingHorizontal: 18, paddingVertical: 18, gap: 10, borderBottomWidth: StyleSheet.hairlineWidth },
  num: { fontFamily: fonts.uiBold, fontSize: 12, fontVariant: ['tabular-nums'] },
  ar: { fontFamily: fonts.arabic, fontSize: 27, lineHeight: 52, textAlign: 'right', writingDirection: 'rtl' },
  tl: { fontFamily: fonts.readItalic, fontSize: 15, lineHeight: 23, textAlign: 'right' },
  body: { fontFamily: fonts.read, fontSize: 16.5 },
  end: { textAlign: 'center', fontFamily: fonts.ui, fontSize: 14, padding: 28 },
});
