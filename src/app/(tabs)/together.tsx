import { useRouter } from 'expo-router';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Group, Row, Section } from '@/components/List';
import { useAccount } from '@/lib/account';
import { fonts, usePalette } from '@/lib/theme';

/** The Together tab: reading as a family, stories for children, and the community. */
export default function TogetherTab() {
  const pal = usePalette();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const acct = useAccount();
  const signedIn = acct.status === 'signedIn';
  const needs = (why: string, go: () => void) => () => (signedIn ? go() : router.push({ pathname: '/signin', params: { why } }));

  return (
    <View style={[styles.root, { backgroundColor: pal.bg }]}>
      <View style={[styles.head, { paddingTop: insets.top + 12 }]}>
        <Text style={[styles.title, { color: pal.text }]}>Together</Text>
        <Text style={[styles.lead, { color: pal.muted }]}>The Quran with the people you love, and an ummah that reminds each other.</Text>
      </View>
      <ScrollView contentContainerStyle={styles.body}>
        <Section pal={pal} title="Family" />
        <Group pal={pal}>
          <Row pal={pal} icon="people" title="Read together" sub="Finish the Quran as a family, a juz each" onPress={needs('together', () => router.push('/together'))} highlight />
          <Row pal={pal} icon="moon" title="Bedtime stories" sub="True stories for children, read or played" onPress={() => router.push('/stories')} divider />
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
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  head: { paddingHorizontal: 20, paddingBottom: 6, gap: 6 },
  title: { fontFamily: fonts.uiBold, fontSize: 30, letterSpacing: -0.6 },
  lead: { fontFamily: fonts.read, fontSize: 15.5, lineHeight: 22 },
  body: { padding: 16, gap: 12, paddingBottom: 30 },
  note: { fontFamily: fonts.ui, fontSize: 13, lineHeight: 18, paddingHorizontal: 4 },
});
