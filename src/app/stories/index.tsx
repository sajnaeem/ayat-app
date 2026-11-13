import { useRouter } from 'expo-router';
import { FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Icon } from '@/components/Icon';
import { NIGHT, STORIES } from '@/data/bedtime';
import { fonts } from '@/lib/theme';

/** Bedtime stories: short, true stories from the Quran and hadith, read aloud or played. */
export default function Stories() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  return (
    <View style={[styles.root, { backgroundColor: NIGHT.bg }]}>
      <FlatList
        data={STORIES}
        keyExtractor={(s) => s.id}
        contentContainerStyle={{ paddingTop: insets.top + 12, paddingHorizontal: 18, paddingBottom: insets.bottom + 30, gap: 10 }}
        ListHeaderComponent={
          <View style={{ gap: 6, marginBottom: 10 }}>
            <View style={styles.head}>
              <Text style={[styles.title, { color: NIGHT.text }]}>Bedtime stories</Text>
              <Pressable onPress={() => router.back()} style={[styles.x, { borderColor: NIGHT.line }]} accessibilityRole="button" accessibilityLabel="Close" hitSlop={8}>
                <Icon name="close" size={18} color={NIGHT.text} />
              </Pressable>
            </View>
            <Text style={[styles.lead, { color: NIGHT.muted }]}>True stories from the Quran and the hadith, for children to fall asleep to. Read them aloud together, or press play.</Text>
          </View>
        }
        renderItem={({ item, index }) => (
          <Pressable
            onPress={() => router.push({ pathname: '/stories/[id]', params: { id: item.id } })}
            style={({ pressed }) => [styles.card, { backgroundColor: pressed ? '#232945' : NIGHT.card, borderColor: NIGHT.line }]}
            accessibilityRole="button"
            accessibilityLabel={`${item.title}, about ${item.about}, ${item.minutes} minutes`}
          >
            <View style={[styles.moon, { borderColor: NIGHT.line }]}>
              <Text style={[styles.num, { color: NIGHT.accent }]}>{index + 1}</Text>
            </View>
            <View style={{ flex: 1, gap: 2 }}>
              <Text style={[styles.about, { color: NIGHT.accent }]}>{item.about.toUpperCase()}</Text>
              <Text style={[styles.name, { color: NIGHT.text }]}>{item.title}</Text>
              <Text style={[styles.meta, { color: NIGHT.muted }]}>About {item.minutes} min</Text>
            </View>
            <Icon name="chevron" size={16} color={NIGHT.muted} />
          </Pressable>
        )}
        ListFooterComponent={
          <Text style={[styles.meta, { color: NIGHT.muted, marginTop: 10, lineHeight: 18 }]}>
            Every story keeps to what the Quran and authentic hadith say, with the source at the end. Narrated by an AI voice. They’re being checked by a scholar.
          </Text>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  head: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  title: { fontFamily: fonts.uiBold, fontSize: 26, letterSpacing: -0.5 },
  x: { width: 36, height: 36, borderRadius: 18, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  lead: { fontFamily: fonts.read, fontSize: 15.5, lineHeight: 23 },
  card: { flexDirection: 'row', alignItems: 'center', gap: 14, borderWidth: 1, borderRadius: 16, padding: 14 },
  moon: { width: 40, height: 40, borderRadius: 20, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  num: { fontFamily: fonts.uiBold, fontSize: 15 },
  about: { fontFamily: fonts.uiBold, fontSize: 10.5, letterSpacing: 1.1 },
  name: { fontFamily: fonts.read, fontSize: 18 },
  meta: { fontFamily: fonts.ui, fontSize: 13 },
});
