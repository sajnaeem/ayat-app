import { useFocusEffect, useRouter } from 'expo-router';
import { setStatusBarStyle } from 'expo-status-bar';
import { useCallback } from 'react';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Glass, sky, SkyHero, skyPhase } from '@/components/SkyHero';
import { calcDay } from '@/lib/prayertimes';
import { showFeed } from '@/lib/nav';
import { SURAHS } from '@/lib/quran';
import { Image, Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import { ART } from '@/lib/art';
import { Icon, IconName } from '@/components/Icon';
import { QuranIndex } from '@/components/QuranIndex';
import { LEARN } from '@/data/learn';
import { pageOf } from '@/data/mushaf';
import { learnedCount, nextToLearn } from '@/lib/learn';
import { useProgress } from '@/lib/progress';
import { usePrefs } from '@/lib/store';
import { fonts, mix, onColour, Palette, usePalette } from '@/lib/theme';

import { useTabBarSpace } from '@/components/TabBar';

/** The Quran tab: every surah, juz and page, with page view, search and offline listening on top. */
export default function QuranTab() {
  const pal = usePalette();
  const router = useRouter();
  const prefs = usePrefs();
  const at = prefs.place ?? { s: 1, a: 1 };
  const { progress } = useProgress();
  const learned = learnedCount(progress);
  const next = nextToLearn(progress);
  const lp = onColour(pal, pal.pop.amber);
  const insets = useSafeAreaInsets();
  const barSpace = useTabBarSpace();
  const phase = skyPhase(new Date(), prefs.prayer.loc ? calcDay(prefs.prayer)?.times : null);
  useFocusEffect(
    useCallback(() => {
      setStatusBarStyle('light');
      return () => setStatusBarStyle(pal.dark ? 'light' : 'dark');
    }, [pal.dark]),
  );
  return (
    <QuranIndex
      hero={
        <SkyHero phase={phase} top={insets.top} height={230}>
          <Text style={sky.title}>Quran</Text>
          <Text style={sky.eyebrow}>{SURAHS[at.s - 1]?.[0] ?? ''} · ayah {at.a} · page {pageOf(at.s, at.a)}</Text>
          <View style={{ flex: 1 }} />
          <Pressable onPress={() => { prefs.readAt(at.s, at.a); showFeed(router); }} accessibilityRole="button" accessibilityLabel="Continue reading where you left off">
            <Glass style={styles.cont}>
              <Icon name="play" size={14} color="#FFFFFF" fill />
              <Text style={styles.contText}>{prefs.place ? 'Continue reading' : 'Start reading'}</Text>
            </Glass>
          </Pressable>
        </SkyHero>
      }
      title="Quran"
      bottomPad={barSpace + 14}
      extra={
        <View style={{ gap: 10 }}>
        <Pressable
          onPress={() => router.push('/learn')}
          style={({ pressed }) => [styles.learn, { backgroundColor: lp.surface, opacity: pressed ? 0.8 : 1 }]}
          accessibilityRole="button"
          accessibilityHint="Opens the short surahs to learn for prayer"
        >
          <Image source={ART.mushaf} style={{ width: 64, height: 50 }} resizeMode="contain" accessibilityIgnoresInvertColors />
          <View style={{ flex: 1, gap: 2 }}>
            <Text style={[styles.learnTitle, { color: lp.text }]}>Learn surahs for your prayer</Text>
            <Text style={[styles.learnSub, { color: lp.muted }]}>
              {learned ? `${learned} of ${LEARN.length} learned${next ? ` · next: ${next.name}` : ''}` : 'Short surahs, easiest first, one ayah at a time'}
            </Text>
          </View>
          <Icon name="chevron" size={16} color={lp.muted} />
        </Pressable>
        <Pressable onPress={() => router.push('/live')} style={({ pressed }) => [styles.live, { opacity: pressed ? 0.85 : 1 }]} accessibilityRole="button" accessibilityLabel="Live TV from Makkah and Madinah, and Quran radio">
          <View style={{ flex: 1, gap: 4 }}>
            <View style={styles.livePill}>
              <View style={styles.liveDot} />
              <Text style={styles.livePillText}>LIVE</Text>
            </View>
            <Text style={styles.liveTitle}>Makkah, Madinah and Quran radio</Text>
            <Text style={styles.liveSub}>Watch the two Holy Mosques, or play a reciter all day</Text>
          </View>
          <Image source={ART.kaaba} style={{ width: 58, height: 58 }} resizeMode="contain" accessibilityIgnoresInvertColors />
          <Image source={ART.dome} style={{ width: 50, height: 62, marginLeft: -10 }} resizeMode="contain" accessibilityIgnoresInvertColors />
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
  cont: { flexDirection: 'row', alignItems: 'center', gap: 8, alignSelf: 'flex-start', paddingHorizontal: 16, paddingVertical: 11, borderRadius: 999 },
  contText: { fontFamily: fonts.uiSemi, fontSize: 15, color: '#FFFFFF' },
  live: { flexDirection: 'row', alignItems: 'center', gap: 8, borderRadius: 14, padding: 14, backgroundColor: '#16213A' },
  livePill: { flexDirection: 'row', alignItems: 'center', gap: 5, alignSelf: 'flex-start', backgroundColor: '#E5484D', borderRadius: 999, paddingHorizontal: 7, paddingVertical: 2 },
  liveDot: { width: 5, height: 5, borderRadius: 3, backgroundColor: '#FFFFFF' },
  livePillText: { fontFamily: fonts.uiBold, fontSize: 10.5, color: '#FFFFFF', letterSpacing: 0.8 },
  liveTitle: { fontFamily: fonts.uiSemi, fontSize: 15.5, color: '#FFFFFF' },
  liveSub: { fontFamily: fonts.ui, fontSize: 13, color: 'rgba(255,255,255,0.75)' },
  learn: { flexDirection: 'row', alignItems: 'center', gap: 12, borderRadius: 14, padding: 12 },
  learnTitle: { fontFamily: fonts.uiSemi, fontSize: 15.5 },
  learnSub: { fontFamily: fonts.ui, fontSize: 13 },
  tool: { flex: 1, borderRadius: 14, paddingVertical: 12, alignItems: 'center', gap: 6 },
  toolIcon: { width: 36, height: 36, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  toolText: { fontFamily: fonts.uiSemi, fontSize: 13 },
});
