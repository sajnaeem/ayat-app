import { useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import { FlatList, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Icon } from '@/components/Icon';
import { surahDone, useProgress } from '@/lib/progress';
import { arabicNumber, SURAHS } from '@/lib/quran';
import { fonts, mix, usePalette } from '@/lib/theme';

/** Folds spellings together so "yaseen", "Ya-Sin" and "yasin" all match, and "kahf" finds "Al-Kahf". */
const fold = (t: string) =>
  t
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]/g, '')
    .replace(/ee/g, 'i')
    .replace(/oo/g, 'u')
    .replace(/aa/g, 'a')
    .replace(/^(al|an|ar|as|at|ad|adh|ash|az)(?=[a-z]{3})/, '');

const POPULAR = [18, 36, 67, 55, 56, 1, 112];

/** Every surah: search by name, meaning or number, and open it to read. */
export default function Read() {
  const pal = usePalette();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { progress } = useProgress();
  const [q, setQ] = useState('');

  const list = useMemo(() => {
    const all = SURAHS.map((x, i) => ({ s: i + 1, name: x[0], ar: x[1], meaning: x[2], count: x[3] }));
    const t = q.trim();
    if (!t) return all;
    if (/^\d+$/.test(t)) return all.filter((x) => String(x.s).startsWith(t));
    const f = fold(t);
    return all.filter((x) => fold(x.name).includes(f) || fold(x.meaning).includes(f) || x.ar.includes(t));
  }, [q]);

  const open = (s: number) => router.push({ pathname: '/surah/[id]', params: { id: String(s), from: '1', to: '1' } });

  return (
    <View style={[styles.root, { backgroundColor: pal.bg }]}>
      <View style={[styles.head, { paddingTop: insets.top + 12, borderBottomColor: pal.line }]}>
        <Text style={[styles.title, { color: pal.text, flex: 1 }]}>The Quran</Text>
        <Pressable onPress={() => router.back()} style={[styles.x, { borderColor: pal.line }]} accessibilityRole="button" accessibilityLabel="Back to the feed" hitSlop={8}>
          <Icon name="close" size={16} color={pal.text} />
        </Pressable>
      </View>
      <FlatList
        data={list}
        keyExtractor={(x) => String(x.s)}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
        contentContainerStyle={{ paddingBottom: insets.bottom + 24 }}
        ListHeaderComponent={
          <View style={{ padding: 18, gap: 14 }}>
            <TextInput
              value={q}
              onChangeText={setQ}
              placeholder="Search: Yasin, Mulk, 18…"
              placeholderTextColor={pal.muted}
              autoCorrect={false}
              autoCapitalize="none"
              clearButtonMode="while-editing"
              returnKeyType="search"
              style={[styles.search, { color: pal.text, borderColor: pal.line, backgroundColor: pal.surface }]}
              accessibilityLabel="Search surahs"
            />
            {!q && (
              <View style={styles.chips}>
                {POPULAR.map((s) => (
                  <Pressable key={s} onPress={() => open(s)} style={[styles.chip, { borderColor: pal.line, backgroundColor: pal.surface }]} accessibilityRole="button">
                    <Text style={[styles.chipText, { color: pal.text }]}>{SURAHS[s - 1][0]}</Text>
                  </Pressable>
                ))}
              </View>
            )}
            {!!q && list.length === 0 && <Text style={[styles.meta, { color: pal.muted }]}>No surah matches "{q}".</Text>}
          </View>
        }
        renderItem={({ item }) => {
          const done = surahDone(progress, item.s);
          return (
            <Pressable
              onPress={() => open(item.s)}
              style={({ pressed }) => [styles.row, { borderBottomColor: pal.line, backgroundColor: pressed ? mix(pal.bg, pal.accent, 0.08) : 'transparent' }]}
              accessibilityRole="button"
              accessibilityLabel={`${item.s}. ${item.name}, ${item.meaning}, ${item.count} ayat${done ? ', read' : ''}`}
            >
              <View style={[styles.num, { borderColor: done ? pal.accent : pal.line, backgroundColor: done ? pal.accent : 'transparent' }]}>
                <Text style={[styles.numText, { color: done ? pal.onAccent : pal.muted }]}>{item.s}</Text>
              </View>
              <View style={{ flex: 1, gap: 2 }}>
                <Text style={[styles.name, { color: pal.text }]}>{item.name}</Text>
                <Text style={[styles.meta, { color: pal.muted }]}>
                  {item.meaning} · {item.count} ayat{done ? ' · read' : ''}
                </Text>
              </View>
              <Text style={[styles.ar, { color: pal.text }]}>{item.ar}</Text>
            </Pressable>
          );
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  head: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 18, paddingBottom: 12, borderBottomWidth: StyleSheet.hairlineWidth },
  title: { fontFamily: fonts.uiBold, fontSize: 22, letterSpacing: -0.3 },
  x: { width: 36, height: 36, borderRadius: 18, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  search: { fontFamily: fonts.ui, fontSize: 16, borderWidth: 1, borderRadius: 10, paddingHorizontal: 14, paddingVertical: 12 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: { borderWidth: 1, borderRadius: 999, paddingHorizontal: 12, paddingVertical: 7 },
  chipText: { fontFamily: fonts.uiSemi, fontSize: 13 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 14, paddingHorizontal: 18, paddingVertical: 12, borderBottomWidth: StyleSheet.hairlineWidth },
  num: { width: 34, height: 34, borderRadius: 17, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  numText: { fontFamily: fonts.uiSemi, fontSize: 12 },
  name: { fontFamily: fonts.uiSemi, fontSize: 16 },
  meta: { fontFamily: fonts.ui, fontSize: 13 },
  ar: { fontFamily: fonts.arabic, fontSize: 20 },
});
