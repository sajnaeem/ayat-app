import { useRouter } from 'expo-router';
import { Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import { Icon, IconName } from '@/components/Icon';
import { QuranIndex } from '@/components/QuranIndex';
import { LEARN } from '@/data/learn';
import { pageOf } from '@/data/mushaf';
import { learnedCount, nextToLearn } from '@/lib/learn';
import { useProgress } from '@/lib/progress';
import { usePrefs } from '@/lib/store';
import { fonts, mix, Palette, usePalette } from '@/lib/theme';

/** The Quran tab: every surah, juz and page, with page view, search and offline listening on top. */
export default function QuranTab() {
  const pal = usePalette();
  const router = useRouter();
  const prefs = usePrefs();
  const at = prefs.place ?? { s: 1, a: 1 };
  const { progress } = useProgress();
  const learned = learnedCount(progress);
  const next = nextToLearn(progress);
  return (
    <QuranIndex
      title="Quran"
      bottomPad={24}
      extra={
        <View style={{ gap: 10 }}>
        <Pressable
          onPress={() => router.push('/learn')}
          style={({ pressed }) => [styles.learn, { backgroundColor: pal.surface, opacity: pressed ? 0.8 : 1 }]}
          accessibilityRole="button"
          accessibilityHint="Opens the short surahs to learn for prayer"
        >
          <View style={[styles.toolIcon, { backgroundColor: pal.accent }]}>
            <Icon name="mic" size={19} color={pal.onAccent} />
          </View>
          <View style={{ flex: 1, gap: 2 }}>
            <Text style={[styles.learnTitle, { color: pal.text }]}>Learn surahs for your prayer</Text>
            <Text style={[styles.learnSub, { color: pal.muted }]}>
              {learned ? `${learned} of ${LEARN.length} learned${next ? ` · next: ${next.name}` : ''}` : 'Short surahs, easiest first, one ayah at a time'}
            </Text>
          </View>
          <Icon name="chevron" size={16} color={pal.muted} />
        </Pressable>
        <View style={styles.tools}>
          <Tool pal={pal} icon="book" label="Page view" onPress={() => router.push({ pathname: '/mushaf', params: { page: String(pageOf(at.s, at.a)) } })} />
          <Tool pal={pal} icon="search" label="Search" onPress={() => router.push({ pathname: '/search', params: { tab: 'quran' } })} />
          {Platform.OS !== 'web' && <Tool pal={pal} icon="download" label="Offline" onPress={() => router.push('/downloads')} />}
        </View>
        </View>
      }
    />
  );
}

function Tool({ pal, icon, label, onPress }: { pal: Palette; icon: IconName; label: string; onPress: () => void }) {
  return (
    <Pressable onPress={onPress} style={({ pressed }) => [styles.tool, { backgroundColor: pal.surface, opacity: pressed ? 0.7 : 1 }]} accessibilityRole="button" accessibilityLabel={label}>
      <View style={[styles.toolIcon, { backgroundColor: mix(pal.surface, pal.accent, pal.dark ? 0.22 : 0.12) }]}>
        <Icon name={icon} size={19} color={pal.accent} />
      </View>
      <Text style={[styles.toolText, { color: pal.text }]}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  tools: { flexDirection: 'row', gap: 8 },
  learn: { flexDirection: 'row', alignItems: 'center', gap: 12, borderRadius: 14, padding: 12 },
  learnTitle: { fontFamily: fonts.uiSemi, fontSize: 15.5 },
  learnSub: { fontFamily: fonts.ui, fontSize: 13 },
  tool: { flex: 1, borderRadius: 14, paddingVertical: 12, alignItems: 'center', gap: 6 },
  toolIcon: { width: 36, height: 36, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  toolText: { fontFamily: fonts.uiSemi, fontSize: 13 },
});
