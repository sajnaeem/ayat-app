import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
import { ActivityIndicator, Pressable, RefreshControl, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Icon } from '@/components/Icon';
import { Sheet } from '@/components/Sheet';
import { useToast } from '@/components/Toast';
import { useAccount } from '@/lib/account';
import { CircleKind, CircleSummary, createCircle, daysUntil, myCircles, niceDate, ramadanStart, shiftDate } from '@/lib/circles';
import { checkReflection } from '@/lib/moderation';
import { usePrefs } from '@/lib/store';
import { fonts, mix, Palette, usePalette } from '@/lib/theme';

const COPY = {
  family: {
    title: 'Family circle',
    ar: 'أُسْرَة',
    lead: 'One ayah a day, shared',
    body: 'A small private circle for your family or a few friends. Each day Munib gives the circle one ayah. You’ll see how many of you have read it today, never who, and you can send each other a salaam.',
    steps: ['Start a circle and give it a name, like “The Naeem family”.', 'Share the link with the people you want in it.', 'Read the day’s ayah. It takes a minute, and you’ll see the circle fill up.'],
    start: 'Start a circle',
    placeholder: 'The Naeem family',
  },
  ramadan: {
    title: 'Ramadan together',
    ar: 'رَمَضَان',
    lead: 'Finish the Quran this Ramadan, together',
    body: 'Everyone in the circle reads the Quran through Ramadan, a part (juz) a day. Tick each juz as you finish it. The circle sees how many of you have read today’s juz and how much you’ve read together, never who is behind.',
    steps: ['Start a circle now and invite your family or friends before Ramadan begins.', 'Each day of Ramadan, Munib opens that day’s juz for you.', 'Missed a day? Catch up whenever you can. Nothing is counted against you.'],
    start: 'Start a Ramadan circle',
    placeholder: 'Ramadan with the family',
  },
} as const;

/** Family circle / Ramadan together: the circles I'm in (of one kind), and starting or joining one. */
export default function Circles() {
  const { kind: k0 } = useLocalSearchParams<{ kind: string }>();
  const kind: CircleKind = k0 === 'ramadan' ? 'ramadan' : 'family';
  const copy = COPY[kind];
  const pal = usePalette();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const toast = useToast();
  const acct = useAccount();
  const prefs = usePrefs();
  const [list, setList] = useState<CircleSummary[] | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [sheet, setSheet] = useState<'new' | 'join' | null>(null);
  const [title, setTitle] = useState('');
  const [starts, setStarts] = useState(ramadanStart);
  const [code, setCode] = useState('');
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    try {
      setList((await myCircles()).filter((c) => c.kind === kind));
    } catch {
      setList((x) => x ?? []);
      toast('Couldn’t load. Check your connection');
    }
  }, [toast, kind]);

  useFocusEffect(
    useCallback(() => {
      if (acct.status === 'signedIn') load();
    }, [acct.status, load]),
  );

  const problem = title.trim() ? checkReflection(title) : null;
  const create = async () => {
    if (!title.trim() || problem || busy) return;
    setBusy(true);
    try {
      const r = await createCircle(kind, title.trim(), kind === 'ramadan' ? starts : undefined);
      setSheet(null);
      setTitle('');
      router.push({ pathname: '/circle/[id]', params: { id: r.id, fresh: '1' } });
    } catch (e) {
      const m = String((e as Error).message);
      toast(m.includes('limit') ? 'You’ve started a few today. Try again tomorrow' : m.includes('too many') ? 'You’re in a lot of circles already. Leave one first' : 'Couldn’t start it. Check your connection');
    } finally {
      setBusy(false);
    }
  };

  const join = () => {
    const c = code.trim().toUpperCase().replace(/[^A-Z0-9]/g, '');
    if (c.length !== 6) return toast('Codes have 6 letters and numbers');
    setSheet(null);
    setCode('');
    router.push({ pathname: '/c/[code]', params: { code: c } });
  };

  if (acct.status !== 'signedIn') {
    return (
      <View style={[styles.root, { backgroundColor: pal.bg, paddingTop: insets.top + 40, padding: 24, gap: 14 }]}>
        <Text style={[styles.h2, { color: pal.text }]}>{copy.title}</Text>
        <Text style={[styles.body, { color: pal.muted }]}>Create a free account to start a circle with your family or friends.</Text>
        <Pressable onPress={() => router.replace({ pathname: '/signin', params: { why: 'circle' } })} style={[styles.btn, { backgroundColor: pal.text }]}>
          <Text style={[styles.btnText, { color: pal.bg }]}>Create an account</Text>
        </Pressable>
        <Pressable onPress={() => (router.canGoBack() ? router.back() : router.replace('/'))} style={{ minHeight: 44, alignItems: 'center', justifyContent: 'center' }} accessibilityRole="button">
          <Text style={[styles.body, { color: pal.muted, textDecorationLine: 'underline' }]}>Not now</Text>
        </Pressable>
      </View>
    );
  }

  const until = daysUntil(starts);
  return (
    <View style={[styles.root, { backgroundColor: pal.bg }]}>
      <View style={[styles.head, { paddingTop: insets.top + 12, borderColor: pal.line }]}>
        <Text style={[styles.title, { color: pal.text }]}>{copy.title}</Text>
        <Pressable onPress={() => router.back()} style={[styles.x, { borderColor: pal.line }]} accessibilityRole="button" accessibilityLabel="Close" hitSlop={8}>
          <Icon name="close" size={18} color={pal.text} />
        </Pressable>
      </View>
      <ScrollView
        contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 40 }]}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={async () => { setRefreshing(true); await load(); setRefreshing(false); }} />}
      >
        {list === null ? (
          <ActivityIndicator color={pal.muted} style={{ marginTop: 40 }} />
        ) : (
          <>
            {list.length === 0 && (
              <View style={[styles.intro, { backgroundColor: pal.surface, borderColor: pal.line }]}>
                <Text style={[styles.introAr, { color: pal.gold }]}>{copy.ar}</Text>
                <Text style={[styles.h2, { color: pal.text }]}>{copy.lead}</Text>
                <Text style={[styles.body, { color: pal.muted }]}>{copy.body}</Text>
                <View style={{ gap: 8, marginTop: 4 }}>
                  {copy.steps.map((t, i) => (
                    <View key={i} style={{ flexDirection: 'row', gap: 10 }}>
                      <View style={[styles.num, { backgroundColor: mix(pal.surface, pal.accent, 0.14) }]}>
                        <Text style={[styles.numText, { color: pal.accent }]}>{i + 1}</Text>
                      </View>
                      <Text style={[styles.small, { color: pal.text, flex: 1 }]}>{t}</Text>
                    </View>
                  ))}
                </View>
              </View>
            )}
            {list.map((c) => (
              <Row key={c.id} c={c} pal={pal} name={prefs.firstName} onPress={() => router.push({ pathname: '/circle/[id]', params: { id: c.id } })} />
            ))}
            <Pressable onPress={() => setSheet('new')} style={[styles.btn, { backgroundColor: pal.text }]} accessibilityRole="button">
              <Text style={[styles.btnText, { color: pal.bg }]}>{copy.start}</Text>
            </Pressable>
            <Pressable onPress={() => setSheet('join')} style={[styles.btn, { borderColor: pal.line, borderWidth: 1 }]} accessibilityRole="button">
              <Text style={[styles.btnText, { color: pal.text }]}>Join with a code</Text>
            </Pressable>
          </>
        )}
      </ScrollView>

      <Sheet visible={sheet === 'new'} onClose={() => setSheet(null)} title={copy.start} pal={pal}>
        <Text style={[styles.label, { color: pal.muted }]}>NAME</Text>
        <TextInput value={title} onChangeText={setTitle} placeholder={copy.placeholder} placeholderTextColor={pal.muted} maxLength={40} style={[styles.input, { color: pal.text, borderColor: pal.line, backgroundColor: pal.bg }]} />
        {!!problem && <Text style={[styles.small, { color: '#B4432F' }]}>{problem}</Text>}
        {kind === 'ramadan' && (
          <>
            <Text style={[styles.label, { color: pal.muted }]}>FIRST DAY OF FASTING</Text>
            <View style={[styles.dateRow, { borderColor: pal.line, backgroundColor: pal.bg }]}>
              <Pressable onPress={() => setStarts((s) => shiftDate(s, -1))} hitSlop={8} style={styles.step} accessibilityRole="button" accessibilityLabel="A day earlier">
                <Text style={[styles.stepText, { color: pal.text }]}>−</Text>
              </Pressable>
              <Text style={[styles.dateText, { color: pal.text }]}>{niceDate(starts)}</Text>
              <Pressable onPress={() => setStarts((s) => shiftDate(s, 1))} hitSlop={8} style={styles.step} accessibilityRole="button" accessibilityLabel="A day later">
                <Text style={[styles.stepText, { color: pal.text }]}>+</Text>
              </Pressable>
            </View>
            <Text style={[styles.small, { color: pal.muted }]}>
              {until > 0 ? `In ${until} ${until === 1 ? 'day' : 'days'}. ` : ''}This is the expected date. If the moon is sighted a day earlier or later where you are, you can change it afterwards.
            </Text>
          </>
        )}
        <Pressable onPress={create} disabled={!title.trim() || !!problem || busy} style={[styles.btn, { backgroundColor: pal.text, opacity: !title.trim() || problem ? 0.4 : 1, marginTop: 6 }]} accessibilityRole="button">
          {busy ? <ActivityIndicator color={pal.bg} /> : <Text style={[styles.btnText, { color: pal.bg }]}>Start</Text>}
        </Pressable>
      </Sheet>

      <Sheet visible={sheet === 'join'} onClose={() => setSheet(null)} title="Join a circle" pal={pal}>
        <Text style={[styles.small, { color: pal.muted }]}>Enter the 6-character code from the invite.</Text>
        <TextInput value={code} onChangeText={(t) => setCode(t.toUpperCase())} placeholder="ABC234" placeholderTextColor={pal.muted} autoCapitalize="characters" autoCorrect={false} maxLength={6} style={[styles.input, styles.code, { color: pal.text, borderColor: pal.line, backgroundColor: pal.bg }]} />
        <Pressable onPress={join} style={[styles.btn, { backgroundColor: pal.text }]} accessibilityRole="button">
          <Text style={[styles.btnText, { color: pal.bg }]}>Find it</Text>
        </Pressable>
      </Sheet>
    </View>
  );
}

function Row({ c, pal, onPress }: { c: CircleSummary; pal: Palette; name?: string; onPress: () => void }) {
  const until = c.starts ? daysUntil(c.starts) : 0;
  const line =
    c.kind === 'family'
      ? `${c.read_today} of ${c.members} have read today’s ayah${c.i_read ? '' : ' · yours is waiting'}`
      : c.today
        ? `Day ${c.today}: ${c.read_today} of ${c.members} have read juz ${c.today} · you’ve read ${c.my_count} of 30`
        : until > 0
          ? `Ramadan is expected in ${until} ${until === 1 ? 'day' : 'days'} · ${c.members} in the circle`
          : `Ramadan has ended · you read ${c.my_count} of 30 juz`;
  return (
    <Pressable onPress={onPress} style={[styles.card, { backgroundColor: pal.surface, borderColor: pal.line }]} accessibilityRole="button">
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
        <Text style={[styles.cardTitle, { color: pal.text, flex: 1 }]} numberOfLines={1}>{c.title}</Text>
        {c.salaams > 0 && (
          <View style={[styles.badge, { backgroundColor: pal.gold }]}>
            <Text style={styles.badgeText}>{c.salaams === 1 ? '1 salaam' : `${c.salaams} salaams`}</Text>
          </View>
        )}
        <Icon name="chevron" size={16} color={pal.muted} />
      </View>
      <Text style={[styles.small, { color: pal.muted }]}>{line}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  head: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 18, paddingBottom: 12, borderBottomWidth: StyleSheet.hairlineWidth },
  title: { fontFamily: fonts.read, fontSize: 28, letterSpacing: -0.6 },
  x: { width: 36, height: 36, borderRadius: 18, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  content: { padding: 18, gap: 12 },
  intro: { borderWidth: 1, borderRadius: 16, padding: 18, gap: 8 },
  introAr: { fontFamily: fonts.arabic, fontSize: 30, lineHeight: 56 },
  h2: { fontFamily: fonts.read, fontSize: 23, letterSpacing: -0.4, lineHeight: 29 },
  body: { fontFamily: fonts.read, fontSize: 16, lineHeight: 24 },
  small: { fontFamily: fonts.ui, fontSize: 13, lineHeight: 18 },
  num: { width: 22, height: 22, borderRadius: 11, alignItems: 'center', justifyContent: 'center' },
  numText: { fontFamily: fonts.uiBold, fontSize: 12 },
  card: { borderWidth: 1, borderRadius: 16, padding: 16, gap: 6 },
  cardTitle: { fontFamily: fonts.uiBold, fontSize: 18, letterSpacing: -0.2 },
  badge: { borderRadius: 999, paddingHorizontal: 8, paddingVertical: 3 },
  badgeText: { fontFamily: fonts.uiBold, fontSize: 11, color: '#FFFFFF' },
  btn: { borderRadius: 12, minHeight: 50, alignItems: 'center', justifyContent: 'center' },
  btnText: { fontFamily: fonts.uiBold, fontSize: 16 },
  label: { fontFamily: fonts.uiBold, fontSize: 11, letterSpacing: 1.1, marginTop: 4 },
  input: { fontFamily: fonts.ui, fontSize: 16, borderWidth: 1, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 13 },
  code: { fontFamily: fonts.uiBold, fontSize: 24, letterSpacing: 6, textAlign: 'center' },
  dateRow: { flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderRadius: 12, minHeight: 50 },
  dateText: { flex: 1, textAlign: 'center', fontFamily: fonts.uiSemi, fontSize: 15 },
  step: { width: 50, height: 50, alignItems: 'center', justifyContent: 'center' },
  stepText: { fontFamily: fonts.uiBold, fontSize: 22 },
});
