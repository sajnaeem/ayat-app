import { useRouter } from 'expo-router';
import { FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useExplain } from '@/components/Explain';
import { Icon } from '@/components/Icon';
import { EXPLAINERS } from '@/data/explainers';
import { fonts, usePalette } from '@/lib/theme';

/** Every word and practice Munib's features use, explained in plain English for anyone new. */
export default function ExplainList() {
  const pal = usePalette();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const [open, sheet] = useExplain(pal);
  return (
    <View style={[styles.root, { backgroundColor: pal.bg, paddingTop: insets.top + 12 }]}>
      <View style={styles.head}>
        <Text style={[styles.title, { color: pal.text }]}>Words and practices</Text>
        <Pressable onPress={() => router.back()} style={[styles.x, { borderColor: pal.line }]} accessibilityRole="button" accessibilityLabel="Close" hitSlop={8}>
          <Icon name="close" size={18} color={pal.text} />
        </Pressable>
      </View>
      <FlatList
        data={EXPLAINERS}
        keyExtractor={(e) => e.id}
        contentContainerStyle={{ padding: 16, gap: 8, paddingBottom: insets.bottom + 30 }}
        ListHeaderComponent={<Text style={[styles.lead, { color: pal.muted }]}>New to Islam, or just not sure what something means? Each one explains what it is, why Muslims do it and how to start.</Text>}
        renderItem={({ item: e }) => (
          <Pressable onPress={() => open(e.id)} style={({ pressed }) => [styles.row, { backgroundColor: pal.surface, opacity: pressed ? 0.7 : 1 }]} accessibilityRole="button">
            <View style={{ flex: 1, gap: 3 }}>
              <Text style={[styles.word, { color: pal.text }]}>{e.word}</Text>
              <Text style={[styles.short, { color: pal.muted }]}>{e.short}</Text>
            </View>
            {!!e.ar && <Text style={[styles.ar, { color: pal.accent }]}>{e.ar}</Text>}
          </Pressable>
        )}
      />
      {sheet}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  head: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingBottom: 4 },
  title: { fontFamily: fonts.uiBold, fontSize: 26, letterSpacing: -0.5 },
  x: { width: 36, height: 36, borderRadius: 18, borderWidth: StyleSheet.hairlineWidth, alignItems: 'center', justifyContent: 'center' },
  lead: { fontFamily: fonts.read, fontSize: 15, lineHeight: 21, marginBottom: 6, paddingHorizontal: 4 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14, borderRadius: 14 },
  word: { fontFamily: fonts.uiBold, fontSize: 16 },
  short: { fontFamily: fonts.ui, fontSize: 13.5, lineHeight: 18 },
  ar: { fontFamily: fonts.arabic, fontSize: 20, lineHeight: 36 },
});
