import { useRouter } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, Image, Linking, Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Icon, IconName } from '@/components/Icon';
import { ART } from '@/lib/art';
import { PlanId, usePlus } from '@/lib/plus';
import { SITE } from '@/lib/site';
import { usePrefs } from '@/lib/store';
import { fonts, mix, usePalette } from '@/lib/theme';

/** The opening line, written to the reader: their name and what they said they wanted help with. */
function plusLead(name: string | undefined, goals: string[]) {
  const why = goals.includes('understand')
    ? 'ask about every ayah you read, as often as you like'
    : goals.includes('habit')
      ? 'keep your reading going anywhere, even offline'
      : goals.includes('calm')
        ? 'fall asleep to every bedtime story and listen offline'
        : 'get more of Munib';
  return `${name ? `${name}, ` : ''}${name ? why : why[0].toUpperCase() + why.slice(1)}, and keep Munib free for everyone else.`;
}

/** The Munib Plus screen: what members get, the three plans, buy and restore. */
const PERKS: { icon: IconName; title: string; sub: string }[] = [
  { icon: 'ask', title: 'Unlimited Ask', sub: 'Ask about any ayah as often as you like, answered from Tafsir Ibn Kathir' },
  { icon: 'download', title: 'Listen offline', sub: 'Download any reciter and any surah for the commute, the plane or the masjid' },
  { icon: 'moon', title: 'Every bedtime story', sub: 'All the stories for children, and new ones as they come' },
  { icon: 'book', title: 'New series and lessons', sub: 'Starting with a guided Ramadan programme' },
  { icon: 'heart', title: 'Keep Munib free for everyone', sub: 'Members are how the Quran stays free here, with no ad networks and no tracking' },
];

// Shown until the App Store prices load (and on the web).
const FALLBACK: Record<PlanId, string> = { yearly: '£29.99', monthly: '£4.99', lifetime: '£59.99' };

export default function PlusScreen() {
  const pal = usePalette();
  const prefs = usePrefs();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const plus = usePlus();
  const [pick, setPick] = useState<PlanId>('yearly');
  const [busy, setBusy] = useState<null | 'buy' | 'restore'>(null);
  const [note, setNote] = useState<string | null>(null);

  const price = (id: PlanId) => plus.plans.find((p) => p.id === id)?.price ?? FALLBACK[id];
  const perMonth = plus.plans.find((p) => p.id === 'yearly')?.perMonth ?? '£2.50';

  const buy = async () => {
    setBusy('buy');
    setNote(null);
    const r = await plus.buy(pick);
    setBusy(null);
    if (r === 'done') setNote('Welcome to Munib Plus. JazakAllahu khayran for supporting Munib.');
    else if (r === 'failed') setNote('That didn’t go through. Nothing was charged. Please try again.');
  };
  const restore = async () => {
    setBusy('restore');
    setNote(null);
    const ok = await plus.restore();
    setBusy(null);
    setNote(ok ? 'Your Munib Plus is back.' : 'We couldn’t find a Munib Plus purchase on this Apple ID.');
  };

  const plan = (id: PlanId, title: string, sub: string, badge?: string) => {
    const on = pick === id;
    return (
      <Pressable
        key={id}
        onPress={() => setPick(id)}
        accessibilityRole="radio"
        accessibilityState={{ selected: on }}
        style={[styles.plan, { borderColor: on ? pal.text : pal.line, backgroundColor: pal.surface }]}
      >
        <View style={[styles.radio, { borderColor: on ? pal.text : pal.line }]}>{on && <View style={[styles.dot, { backgroundColor: pal.text }]} />}</View>
        <View style={{ flex: 1, gap: 2 }}>
          <Text style={[styles.planTitle, { color: pal.text }]}>{title}</Text>
          <Text style={[styles.planSub, { color: pal.muted }]}>{sub}</Text>
        </View>
        <Text style={[styles.planPrice, { color: pal.text }]}>{price(id)}</Text>
        {!!badge && (
          <View style={[styles.badge, { backgroundColor: pal.pop.emerald }]}>
            <Text style={styles.badgeText}>{badge}</Text>
          </View>
        )}
      </Pressable>
    );
  };

  return (
    <View style={[styles.root, { backgroundColor: pal.bg }]}>
      <ScrollView contentContainerStyle={{ paddingTop: insets.top + 10, paddingBottom: insets.bottom + 30, paddingHorizontal: 20 }}>
        <View style={styles.top}>
          <View />
          <Pressable onPress={() => router.back()} style={[styles.x, { borderColor: pal.line }]} accessibilityRole="button" accessibilityLabel="Close" hitSlop={8}>
            <Icon name="close" size={18} color={pal.text} />
          </Pressable>
        </View>
        <Image source={ART.star8} style={styles.art} resizeMode="contain" accessibilityIgnoresInvertColors />
        <Text style={[styles.h1, { color: pal.text }]}>Munib Plus</Text>
        <Text style={[styles.lead, { color: pal.muted }]}>{plusLead(prefs.firstName, prefs.journey?.goals ?? [])}</Text>

        <View style={{ gap: 14, marginTop: 22 }}>
          {PERKS.map((p, i) => (
            <View key={p.title} style={styles.perk}>
              <View style={[styles.perkIcon, { backgroundColor: [pal.pop.violet, pal.pop.sky, pal.pop.amber, pal.pop.emerald, pal.pop.rose][i] }]}>
                <Icon name={p.icon} size={18} color="#FFFFFF" />
              </View>
              <View style={{ flex: 1, gap: 2 }}>
                <Text style={[styles.perkTitle, { color: pal.text }]}>{p.title}</Text>
                <Text style={[styles.perkSub, { color: pal.muted }]}>{p.sub}</Text>
              </View>
            </View>
          ))}
        </View>

        <View style={[styles.free, { backgroundColor: mix(pal.bg, pal.accent, 0.1) }]}>
          <Text style={[styles.freeText, { color: pal.text }]}>
            The whole Quran, prayer times, Qibla, duas, Read together and learning your surahs stay free for everyone, always.
          </Text>
        </View>

        {plus.active ? (
          <View style={[styles.member, { backgroundColor: pal.pop.emerald }]}>
            <Text style={styles.memberTitle}>You’re a Munib Plus member</Text>
            <Text style={styles.memberSub}>{plus.lifetime ? 'Lifetime: thank you for supporting Munib.' : 'JazakAllahu khayran for supporting Munib.'}</Text>
            {!plus.lifetime && (
              <Pressable onPress={() => Linking.openURL('https://apps.apple.com/account/subscriptions')} accessibilityRole="link">
                <Text style={styles.memberLink}>Manage or cancel your subscription</Text>
              </Pressable>
            )}
          </View>
        ) : Platform.OS === 'web' ? (
          <Text style={[styles.soon, { color: pal.muted }]}>Munib Plus is available in the Munib iPhone app.</Text>
        ) : (
          <>
            <View style={{ gap: 10, marginTop: 22 }}>
              {plan('yearly', 'Yearly', `${perMonth} a month, billed yearly`, 'BEST VALUE')}
              {plan('monthly', 'Monthly', 'Cancel any time')}
              {plan('lifetime', 'Lifetime', 'Pay once. Ask: 20 questions a day')}
            </View>
            {!plus.ready ? (
              <ActivityIndicator color={pal.muted} style={{ marginTop: 20 }} />
            ) : !plus.available ? (
              <Text style={[styles.soon, { color: pal.muted }]}>Munib Plus is nearly ready. Please check back soon.</Text>
            ) : (
              <Pressable
                onPress={buy}
                disabled={!!busy}
                accessibilityRole="button"
                style={({ pressed }) => [styles.cta, { backgroundColor: pal.text, opacity: busy ? 0.6 : pressed ? 0.85 : 1 }]}
              >
                {busy === 'buy' ? <ActivityIndicator color={pal.bg} /> : <Text style={[styles.ctaText, { color: pal.bg }]}>{pick === 'lifetime' ? `Get lifetime for ${price('lifetime')}` : `Continue with ${pick === 'yearly' ? 'yearly' : 'monthly'}`}</Text>}
              </Pressable>
            )}
            <Pressable onPress={restore} disabled={!!busy || !plus.available} style={styles.restore} accessibilityRole="button">
              <Text style={[styles.restoreText, { color: pal.muted }]}>{busy === 'restore' ? 'Checking…' : 'Restore purchases'}</Text>
            </Pressable>
          </>
        )}
        {!!note && <Text style={[styles.note, { color: pal.text }]}>{note}</Text>}

        <Text style={[styles.fine, { color: pal.muted }]}>
          Payment is taken from your Apple ID. Monthly and yearly plans renew automatically unless you cancel at least 24 hours before the end of the period; manage or cancel any time in your Apple ID settings. Lifetime is a single payment. If you’re signed in, Plus is linked to your Munib account so it follows you to a new phone.
        </Text>
        <View style={styles.links}>
          <Pressable onPress={() => Linking.openURL(`${SITE}/terms`)} accessibilityRole="link">
            <Text style={[styles.link, { color: pal.muted }]}>Terms</Text>
          </Pressable>
          <Text style={{ color: pal.muted }}>·</Text>
          <Pressable onPress={() => Linking.openURL(`${SITE}/privacy`)} accessibilityRole="link">
            <Text style={[styles.link, { color: pal.muted }]}>Privacy</Text>
          </Pressable>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  top: { flexDirection: 'row', justifyContent: 'space-between' },
  x: { width: 36, height: 36, borderRadius: 18, borderWidth: StyleSheet.hairlineWidth, alignItems: 'center', justifyContent: 'center' },
  art: { width: 120, height: 120, alignSelf: 'center', marginTop: -6 },
  h1: { fontFamily: fonts.uiBold, fontSize: 34, letterSpacing: -0.8, textAlign: 'center', marginTop: 6 },
  lead: { fontFamily: fonts.read, fontSize: 16, lineHeight: 23, textAlign: 'center', marginTop: 6, paddingHorizontal: 10 },
  perk: { flexDirection: 'row', gap: 12, alignItems: 'flex-start' },
  perkIcon: { width: 36, height: 36, borderRadius: 11, alignItems: 'center', justifyContent: 'center' },
  perkTitle: { fontFamily: fonts.uiBold, fontSize: 16 },
  perkSub: { fontFamily: fonts.ui, fontSize: 13.5, lineHeight: 19 },
  free: { borderRadius: 16, padding: 14, marginTop: 20 },
  freeText: { fontFamily: fonts.ui, fontSize: 14, lineHeight: 20 },
  plan: { flexDirection: 'row', alignItems: 'center', gap: 12, borderWidth: 1.5, borderRadius: 18, padding: 16 },
  radio: { width: 22, height: 22, borderRadius: 11, borderWidth: 2, alignItems: 'center', justifyContent: 'center' },
  dot: { width: 10, height: 10, borderRadius: 5 },
  planTitle: { fontFamily: fonts.uiBold, fontSize: 17 },
  planSub: { fontFamily: fonts.ui, fontSize: 13 },
  planPrice: { fontFamily: fonts.uiBold, fontSize: 17 },
  badge: { position: 'absolute', top: -9, right: 16, borderRadius: 999, paddingHorizontal: 9, paddingVertical: 3 },
  badgeText: { fontFamily: fonts.uiBold, fontSize: 10.5, letterSpacing: 0.8, color: '#FFFFFF' },
  cta: { borderRadius: 999, paddingVertical: 17, alignItems: 'center', marginTop: 18 },
  ctaText: { fontFamily: fonts.uiBold, fontSize: 17 },
  restore: { alignSelf: 'center', paddingVertical: 12 },
  restoreText: { fontFamily: fonts.uiSemi, fontSize: 14 },
  soon: { fontFamily: fonts.ui, fontSize: 14, textAlign: 'center', marginTop: 18, lineHeight: 20 },
  note: { fontFamily: fonts.uiSemi, fontSize: 14.5, textAlign: 'center', marginTop: 8, lineHeight: 20 },
  member: { borderRadius: 20, padding: 18, gap: 6, marginTop: 22 },
  memberTitle: { fontFamily: fonts.uiBold, fontSize: 19, color: '#FFFFFF' },
  memberSub: { fontFamily: fonts.ui, fontSize: 14.5, color: 'rgba(255,255,255,0.9)' },
  memberLink: { fontFamily: fonts.uiSemi, fontSize: 14, color: '#FFFFFF', textDecorationLine: 'underline', marginTop: 6 },
  fine: { fontFamily: fonts.ui, fontSize: 11.5, lineHeight: 16, marginTop: 18 },
  links: { flexDirection: 'row', gap: 8, justifyContent: 'center', marginTop: 10 },
  link: { fontFamily: fonts.uiSemi, fontSize: 13, textDecorationLine: 'underline' },
});
