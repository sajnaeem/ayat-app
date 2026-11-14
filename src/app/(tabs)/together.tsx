import { MeButton } from '@/components/MeButton';
import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
import { Image, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useExplain } from '@/components/Explain';
import { Group, Row, Section, Tile, TileGrid } from '@/components/List';
import { ART } from '@/lib/art';
import { useAccount } from '@/lib/account';
import { flushUmmah, UmmahStats, ummahStats } from '@/lib/together-more';
import { fonts, mix, usePalette } from '@/lib/theme';

/** The Together tab: reading as a family, stories for children, and the community. */
export default function TogetherTab() {
  const pal = usePalette();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const acct = useAccount();
  const signedIn = acct.status === 'signedIn';
  const [explain, explainSheet] = useExplain(pal);
  const [stats, setStats] = useState<UmmahStats | null>(null);
  useFocusEffect(
    useCallback(() => {
      flushUmmah();
      const t = setTimeout(() => ummahStats().then(setStats), 600);
      return () => clearTimeout(t);
    }, []),
  );
  const needs = (why: string, go: () => void) => () => (signedIn ? go() : router.push({ pathname: '/signin', params: { why } }));

  return (
    <View style={[styles.root, { backgroundColor: pal.bg }]}>
      <View style={[styles.head, { paddingTop: insets.top + 12 }]}>
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
          <Text style={[styles.title, { color: pal.text }]}>Together</Text>
          <MeButton />
        </View>
        <Text style={[styles.lead, { color: pal.muted }]}>The Quran with the people you love, and an ummah that reminds each other.</Text>
      </View>
      <ScrollView contentContainerStyle={styles.body}>
        <View style={[styles.ummah, { backgroundColor: pal.bold ? pal.pop.violet : pal.accent }]} accessibilityRole="summary">
          <Image source={ART.globe} style={styles.ummahArt} resizeMode="contain" accessibilityIgnoresInvertColors />
          <Text style={[styles.ummahEyebrow, { color: 'rgba(255,255,255,0.8)' }]}>THE UMMAH, READING TOGETHER</Text>
          {stats && stats.week > 0 ? (
            <>
              <Text style={[styles.ummahBig, { color: '#FFFFFF' }]}>{stats.week.toLocaleString('en-GB')}</Text>
              <Text style={[styles.ummahSub, { color: '#FFFFFF' }]}>ayat read on Munib this week{stats.today ? ` · ${stats.today.toLocaleString('en-GB')} today` : ''}</Text>
            </>
          ) : (
            <Text style={[styles.ummahSub, { color: '#FFFFFF' }]}>Every ayah you read adds to everyone’s total.</Text>
          )}
          <Text style={[styles.ummahNote, { color: 'rgba(255,255,255,0.78)' }]}>Only the total is counted, never who read what.</Text>
          <Pressable onPress={() => explain('ummah')} hitSlop={8} accessibilityRole="button" style={{ alignSelf: 'flex-start', marginTop: 4 }}>
            <Text style={[styles.ummahNote, { color: '#FFFFFF', textDecorationLine: 'underline', marginTop: 0 }]}>What is the ummah?</Text>
          </Pressable>
        </View>

        <TileGrid>
          <Tile pal={pal} colour={pal.pop.rose} art="hands" title="Ask for dua" sub="Pray for each other" onPress={() => router.push('/dua-requests')} onInfo={() => explain('duaothers')} />
          <Tile pal={pal} colour={pal.pop.sky} art="moon" title="Bedtime stories" sub="True stories for children" onPress={() => router.push('/stories')} />
        </TileGrid>

        <Section pal={pal} title="Family" />
        <Group pal={pal}>
          <Row pal={pal} icon="people" title="Read together" sub="Finish the whole Quran as a family, a part (juz) each, or in memory of someone" onPress={needs('together', () => router.push('/together'))} onInfo={() => explain('khatm')} />
        </Group>

        <Section pal={pal} title="Community" />
        <Group pal={pal}>
          <Row pal={pal} icon="pen" title="Create a post" sub="A benefit, a reminder or a short video. Every post is checked first." onPress={needs('post', () => router.push('/post'))} />
          <Row pal={pal} icon="search" title="Find people" sub="Follow people who share reminders" onPress={needs('profile', () => router.push({ pathname: '/search', params: { tab: 'people' } }))} divider />
          {signedIn && !!acct.userId && <Row pal={pal} icon="user" title="Your profile" sub="Your posts, followers and who you follow" onPress={() => router.push(`/profile/${acct.userId}`)} divider />}
        </Group>
        <View style={{ height: 8 }} />
        <Text style={[styles.note, { color: pal.muted }]}>Posts from people you follow show first in For you on Home.</Text>
      </ScrollView>
      {explainSheet}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  head: { paddingHorizontal: 20, paddingBottom: 6, gap: 6 },
  title: { fontFamily: fonts.read, fontSize: 36, letterSpacing: -0.6 },
  lead: { fontFamily: fonts.read, fontSize: 15.5, lineHeight: 22 },
  body: { padding: 16, gap: 12, paddingBottom: 30 },
  ummah: { borderRadius: 24, padding: 18, gap: 4, overflow: 'hidden', paddingRight: 110 },
  ummahArt: { position: 'absolute', right: -26, top: 14, width: 138, height: 138 },
  ummahEyebrow: { fontFamily: fonts.uiBold, fontSize: 11, letterSpacing: 1.2 },
  ummahBig: { fontFamily: fonts.uiBold, fontSize: 40, letterSpacing: -1, fontVariant: ['tabular-nums'] },
  ummahSub: { fontFamily: fonts.uiSemi, fontSize: 15.5, lineHeight: 21 },
  ummahNote: { fontFamily: fonts.ui, fontSize: 12, marginTop: 6 },
  note: { fontFamily: fonts.ui, fontSize: 13, lineHeight: 18, paddingHorizontal: 4 },
});
