import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { Linking, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Icon } from '@/components/Icon';
import { Choice, Group, Row, Section } from '@/components/List';
import { useAccount } from '@/lib/account';
import { amReviewer } from '@/lib/posts';
import { SITE } from '@/lib/site';
import { usePrefs } from '@/lib/store';
import { fonts, usePalette } from '@/lib/theme';

/** You → Your data: what Munib collects, and the two switches (anonymous usage stats, anonymous insights). */
export default function YourData() {
  const pal = usePalette();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const prefs = usePrefs();
  const acct = useAccount();
  const [reviewer, setReviewer] = useState(false);
  useEffect(() => {
    if (acct.userId) amReviewer(acct.userId).then(setReviewer);
  }, [acct.userId]);

  return (
    <View style={[styles.root, { backgroundColor: pal.bg }]}>
      <View style={[styles.head, { paddingTop: insets.top + 12, borderColor: pal.line }]}>
        <Text style={[styles.title, { color: pal.text }]}>Your data</Text>
        <Pressable onPress={() => router.back()} style={[styles.x, { borderColor: pal.line }]} accessibilityRole="button" accessibilityLabel="Close" hitSlop={8}>
          <Icon name="close" size={18} color={pal.text} />
        </Pressable>
      </View>
      <ScrollView contentContainerStyle={{ padding: 16, gap: 12, paddingBottom: insets.bottom + 40 }}>
        <View style={[styles.card, { backgroundColor: pal.surface }]}>
          <Text style={[styles.lead, { color: pal.text }]}>We never sell or share your personal data, and Munib has no ad trackers.</Text>
          <Text style={[styles.body, { color: pal.muted }]}>
            Your moods, journey answers, mosque, location and practice recordings stay on your phone. To make Munib better, we count how the app is used, without knowing who you are.
          </Text>
        </View>

        <Section pal={pal} title="Help improve Munib" />
        <View style={{ gap: 8 }}>
          <Choice
            pal={pal}
            box
            on={prefs.shareUsage !== false}
            onPress={() => prefs.set({ shareUsage: prefs.shareUsage === false })}
            title="Anonymous usage stats"
            sub="Once a day: which parts of Munib you opened, how many ayat you read and for how long, the week you started, your country and app version. No name, account, device ID or location."
          />
          <Choice
            pal={pal}
            box
            on={!!prefs.shareInsights}
            onPress={() => prefs.set({ shareInsights: !prefs.shareInsights })}
            title="Share anonymous insights"
            sub="Adds your journey answers (for example new to Islam, how you read Arabic, your goals), never linked to you. Only totals from large groups are ever shown, including in research reports we may share with charities, mosques and researchers."
          />
        </View>
        <Text style={[styles.small, { color: pal.muted, paddingHorizontal: 4 }]}>
          Turn either off at any time; anything not yet sent is deleted from your phone. Answers to the journey questions only leave your phone if you turn on insights.
        </Text>

        <Group pal={pal}>
          <Row pal={pal} icon="shield" title="Privacy policy" onPress={() => Linking.openURL(`${SITE}/privacy`)} />
          {reviewer && <Row pal={pal} icon="sliders" title="Munib stats" sub="Daily readers, retention and features (team only)" onPress={() => router.push('/stats')} divider />}
        </Group>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  head: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 18, paddingBottom: 12, borderBottomWidth: StyleSheet.hairlineWidth },
  title: { fontFamily: fonts.uiBold, fontSize: 24, letterSpacing: -0.5, flex: 1 },
  x: { width: 36, height: 36, borderRadius: 18, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  card: { borderRadius: 20, padding: 16, gap: 8 },
  lead: { fontFamily: fonts.read, fontSize: 18, lineHeight: 25 },
  body: { fontFamily: fonts.ui, fontSize: 14, lineHeight: 20 },
  small: { fontFamily: fonts.ui, fontSize: 13, lineHeight: 18 },
});
