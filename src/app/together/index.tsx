import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
import { ActivityIndicator, Pressable, RefreshControl, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Icon } from '@/components/Icon';
import { KhatmBar as Bar } from '@/components/KhatmBar';
import { Sheet } from '@/components/Sheet';
import { useToast } from '@/components/Toast';
import { useAccount } from '@/lib/account';
import { createKhatm, KhatmSummary, myKhatms, syncMyParts } from '@/lib/together';
import { fonts, mix, Palette, usePalette } from '@/lib/theme';

const AIMS: { label: string; days: number | null }[] = [
  { label: 'No date', days: null },
  { label: '1 week', days: 7 },
  { label: '2 weeks', days: 14 },
  { label: '30 days', days: 30 },
];

/** Read together: the khatms I'm part of, and starting or joining one. */
export default function Together() {
  const pal = usePalette();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const toast = useToast();
  const acct = useAccount();
  const [list, setList] = useState<KhatmSummary[] | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [sheet, setSheet] = useState<'new' | 'join' | null>(null);
  const [title, setTitle] = useState('');
  const [intention, setIntention] = useState('');
  const [aim, setAim] = useState<number | null>(null);
  const [code, setCode] = useState('');
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    try {
      const l = await myKhatms();
      setList(l);
      syncMyParts(l);
    } catch {
      setList((x) => x ?? []);
      toast('Couldn’t load. Check your connection');
    }
  }, [toast]);

  useFocusEffect(
    useCallback(() => {
      if (acct.status === 'signedIn') load();
    }, [acct.status, load]),
  );

  const create = async () => {
    if (!title.trim() || busy) return;
    setBusy(true);
    try {
      const by = aim ? new Date(Date.now() + aim * 86400000).toISOString().slice(0, 10) : null;
      const r = await createKhatm(title.trim(), intention.trim(), by);
      setSheet(null);
      setTitle('');
      setIntention('');
      setAim(null);
      router.push({ pathname: '/together/[id]', params: { id: r.id, fresh: '1' } });
    } catch (e) {
      toast(String((e as Error).message).includes('limit') ? 'You’ve started a few today. Try again tomorrow' : 'Couldn’t start it. Check your connection');
    } finally {
      setBusy(false);
    }
  };

  const join = () => {
    const c = code.trim().toUpperCase().replace(/[^A-Z0-9]/g, '');
    if (c.length !== 6) return toast('Codes have 6 letters and numbers');
    setSheet(null);
    setCode('');
    router.push({ pathname: '/k/[code]', params: { code: c } });
  };

  if (acct.status !== 'signedIn') {
    return (
      <View style={[styles.root, { backgroundColor: pal.bg, paddingTop: insets.top + 40, padding: 24, gap: 14 }]}>
        <Text style={[styles.h2, { color: pal.text }]}>Read together</Text>
        <Text style={[styles.body, { color: pal.muted }]}>Create a free account to read the Quran together with your family.</Text>
        <Pressable onPress={() => router.replace({ pathname: '/signin', params: { why: 'together' } })} style={[styles.btn, { backgroundColor: pal.text }]}>
          <Text style={[styles.btnText, { color: pal.bg }]}>Create an account</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <View style={[styles.root, { backgroundColor: pal.bg }]}>
      <View style={[styles.head, { paddingTop: insets.top + 12, borderColor: pal.line }]}>
        <Text style={[styles.title, { color: pal.text }]}>Read together</Text>
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
                <Text style={[styles.introAr, { color: pal.accent }]}>خَتْمَة</Text>
                <Text style={[styles.h2, { color: pal.text }]}>Finish the Quran together</Text>
                <Text style={[styles.body, { color: pal.muted }]}>
                  Start a khatm and invite your family or friends. Each person picks a juz, and Munib keeps track of exactly what everyone has read, so nobody has to ask in the group chat.
                </Text>
                <View style={{ gap: 8, marginTop: 4 }}>
                  {[
                    ['1', 'Start a khatm and give it a name, like “For Dad”.'],
                    ['2', 'Share the link. Everyone picks a juz.'],
                    ['3', 'Read in Munib and progress fills in by itself. Reading from your own mushaf? Just tap finished.'],
                  ].map(([n, t]) => (
                    <View key={n} style={{ flexDirection: 'row', gap: 10 }}>
                      <View style={[styles.num, { backgroundColor: mix(pal.surface, pal.accent, 0.14) }]}>
                        <Text style={[styles.numText, { color: pal.accent }]}>{n}</Text>
                      </View>
                      <Text style={[styles.small, { color: pal.text, flex: 1 }]}>{t}</Text>
                    </View>
                  ))}
                </View>
              </View>
            )}

            {list.map((k) => (
              <KhatmRow key={k.id} k={k} pal={pal} onPress={() => router.push({ pathname: '/together/[id]', params: { id: k.id } })} />
            ))}

            <Pressable onPress={() => setSheet('new')} style={[styles.btn, { backgroundColor: pal.text }]} accessibilityRole="button">
              <Text style={[styles.btnText, { color: pal.bg }]}>Start a khatm</Text>
            </Pressable>
            <Pressable onPress={() => setSheet('join')} style={[styles.btn, { borderColor: pal.line, borderWidth: 1 }]} accessibilityRole="button">
              <Text style={[styles.btnText, { color: pal.text }]}>Join with a code</Text>
            </Pressable>
          </>
        )}
      </ScrollView>

      <Sheet visible={sheet === 'new'} onClose={() => setSheet(null)} title="Start a khatm" pal={pal}>
        <Text style={[styles.label, { color: pal.muted }]}>NAME</Text>
        <TextInput value={title} onChangeText={setTitle} placeholder="e.g. For Dad, or Ramadan 2027" placeholderTextColor={pal.muted} maxLength={60} style={[styles.input, { color: pal.text, borderColor: pal.line, backgroundColor: pal.bg }]} />
        <Text style={[styles.label, { color: pal.muted }]}>A NOTE FOR THE GROUP (OPTIONAL)</Text>
        <TextInput
          value={intention}
          onChangeText={setIntention}
          placeholder="e.g. We’re reading for Dad. May Allah have mercy on him."
          placeholderTextColor={pal.muted}
          maxLength={200}
          multiline
          style={[styles.input, { color: pal.text, borderColor: pal.line, backgroundColor: pal.bg, minHeight: 80, textAlignVertical: 'top' }]}
        />
        <Text style={[styles.label, { color: pal.muted }]}>AIM TO FINISH IN</Text>
        <View style={styles.chips}>
          {AIMS.map((a) => {
            const on = aim === a.days;
            return (
              <Pressable key={a.label} onPress={() => setAim(a.days)} style={[styles.chip, { borderColor: on ? pal.accent : pal.line, backgroundColor: on ? mix(pal.surface, pal.accent, 0.12) : pal.surface }]} accessibilityRole="button" accessibilityState={{ selected: on }}>
                <Text style={[styles.chipText, { color: pal.text }]}>{a.label}</Text>
              </Pressable>
            );
          })}
        </View>
        <Pressable onPress={create} disabled={!title.trim() || busy} style={[styles.btn, { backgroundColor: pal.text, opacity: !title.trim() || busy ? 0.5 : 1, marginTop: 6 }]} accessibilityRole="button">
          {busy ? <ActivityIndicator color={pal.bg} /> : <Text style={[styles.btnText, { color: pal.bg }]}>Start</Text>}
        </Pressable>
      </Sheet>

      <Sheet visible={sheet === 'join'} onClose={() => setSheet(null)} title="Join a khatm" pal={pal}>
        <Text style={[styles.small, { color: pal.muted }]}>Enter the 6-character code from your invite.</Text>
        <TextInput
          value={code}
          onChangeText={(t) => setCode(t.toUpperCase())}
          placeholder="ABC234"
          placeholderTextColor={pal.muted}
          autoCapitalize="characters"
          autoCorrect={false}
          maxLength={8}
          onSubmitEditing={join}
          style={[styles.input, styles.code, { color: pal.text, borderColor: pal.line, backgroundColor: pal.bg }]}
        />
        <Pressable onPress={join} style={[styles.btn, { backgroundColor: pal.text }]} accessibilityRole="button">
          <Text style={[styles.btnText, { color: pal.bg }]}>Continue</Text>
        </Pressable>
      </Sheet>
    </View>
  );
}

function KhatmRow({ k, pal, onPress }: { k: KhatmSummary; pal: Palette; onPress: () => void }) {
  const mine = k.mine.filter((p) => p.status !== 'done');
  return (
    <Pressable onPress={onPress} style={[styles.card, { backgroundColor: pal.surface, borderColor: pal.line }]} accessibilityRole="button" accessibilityLabel={`${k.title}, ${k.done} of 30 juz read`}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
        <View style={{ flex: 1, gap: 2 }}>
          <Text style={[styles.cardTitle, { color: pal.text }]} numberOfLines={1}>
            {k.title}
          </Text>
          <Text style={[styles.small, { color: pal.muted }]}>
            {k.completed_at ? 'Finished, alhamdulillah' : `${k.done} of 30 juz read`} · {k.members} {k.members === 1 ? 'person' : 'people'}
            {k.round > 1 ? ` · khatm ${k.round}` : ''}
          </Text>
        </View>
        <Icon name="chevron" size={18} color={pal.muted} />
      </View>
      <Bar done={k.done} pal={pal} />
      {mine.length > 0 && (
        <Text style={[styles.small, { color: pal.accent, fontFamily: fonts.uiSemi }]}>
          You’re reading {mine.map((p) => `juz ${p.juz}${p.pct ? ` (${p.pct}%)` : ''}`).join(', ')}
        </Text>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  head: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 18, paddingBottom: 12, borderBottomWidth: StyleSheet.hairlineWidth },
  title: { fontFamily: fonts.uiBold, fontSize: 26, letterSpacing: -0.5 },
  x: { width: 36, height: 36, borderRadius: 18, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  content: { padding: 18, gap: 12 },
  intro: { borderWidth: 1, borderRadius: 16, padding: 18, gap: 8 },
  introAr: { fontFamily: fonts.arabic, fontSize: 30, lineHeight: 56 },
  h2: { fontFamily: fonts.uiBold, fontSize: 22, letterSpacing: -0.3 },
  body: { fontFamily: fonts.read, fontSize: 16, lineHeight: 24 },
  small: { fontFamily: fonts.ui, fontSize: 13, lineHeight: 18 },
  num: { width: 22, height: 22, borderRadius: 11, alignItems: 'center', justifyContent: 'center' },
  numText: { fontFamily: fonts.uiBold, fontSize: 12 },
  card: { borderWidth: 1, borderRadius: 16, padding: 16, gap: 10 },
  cardTitle: { fontFamily: fonts.uiBold, fontSize: 18, letterSpacing: -0.2 },
  btn: { borderRadius: 12, minHeight: 50, alignItems: 'center', justifyContent: 'center' },
  btnText: { fontFamily: fonts.uiBold, fontSize: 16 },
  label: { fontFamily: fonts.uiBold, fontSize: 11, letterSpacing: 1.1, marginTop: 4 },
  input: { fontFamily: fonts.ui, fontSize: 16, borderWidth: 1, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 13 },
  code: { fontFamily: fonts.uiBold, fontSize: 24, letterSpacing: 6, textAlign: 'center' },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  chip: { borderWidth: 1, borderRadius: 8, paddingHorizontal: 12, paddingVertical: 8 },
  chipText: { fontFamily: fonts.uiSemi, fontSize: 14 },
});
