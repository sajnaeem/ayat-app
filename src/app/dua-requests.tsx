import * as Haptics from 'expo-haptics';
import { useRouter } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { ActionSheetIOS, ActivityIndicator, Alert, FlatList, KeyboardAvoidingView, Platform, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { GuidelinesList } from '@/components/Guidelines';
import { Icon } from '@/components/Icon';
import { useToast } from '@/components/Toast';
import { useAccount } from '@/lib/account';
import { checkReflection } from '@/lib/moderation';
import { ago, askDua, deleteDua, DuaRequest, duaWall, madeDua, MyDua, myDuas, reportDua } from '@/lib/together-more';
import { fonts, mix, usePalette } from '@/lib/theme';

/**
 * Ask for dua: short requests to the ummah, with or without your name, shown for two weeks.
 * Others tap "I made dua" and the asker sees how many. Word filter first, 3 reports hide a request.
 */
export default function DuaRequests() {
  const pal = usePalette();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const toast = useToast();
  const acct = useAccount();
  const signedIn = acct.status === 'signedIn';
  const [list, setList] = useState<DuaRequest[] | null>(null);
  const [mine, setMine] = useState<MyDua[]>([]);
  const [draft, setDraft] = useState('');
  const [anon, setAnon] = useState(true);
  const [sending, setSending] = useState(false);
  const [writing, setWriting] = useState(false);
  const [agreeing, setAgreeing] = useState(false);

  const load = useCallback(async () => {
    try {
      setList(await duaWall());
    } catch {
      setList([]);
      toast("Couldn't load. Check your connection");
    }
    if (signedIn) myDuas().then(setMine, () => {});
  }, [signedIn, toast]);
  useEffect(() => {
    load();
  }, [load]);

  const needSignIn = () => router.push({ pathname: '/signin', params: { why: 'together' } });

  const send = async () => {
    const body = draft.trim();
    if (body.length < 10) return toast('Write a little more, so people know what to pray for');
    const problem = checkReflection(body);
    if (problem) return toast(problem.replace('reflections', 'requests'));
    setSending(true);
    try {
      await askDua(body, anon);
      setDraft('');
      setWriting(false);
      toast('Shared. May Allah answer your dua');
      load();
    } catch (e) {
      toast((e as Error).message === 'limit' ? 'You can ask up to 3 times a day' : "Couldn't share. Try again");
    } finally {
      setSending(false);
    }
  };

  const pray = async (d: DuaRequest) => {
    if (!signedIn) return needSignIn();
    if (d.made || d.mine) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    setList((l) => l?.map((x) => (x.id === d.id ? { ...x, made: true, count: x.count + 1 } : x)) ?? null);
    try {
      const n = await madeDua(d.id);
      setList((l) => l?.map((x) => (x.id === d.id ? { ...x, made: true, count: n } : x)) ?? null);
    } catch {
      setList((l) => l?.map((x) => (x.id === d.id ? { ...x, made: false, count: x.count - 1 } : x)) ?? null);
    }
  };

  const more = (d: DuaRequest) => {
    const remove = async () => {
      try {
        await deleteDua(d.id);
        setList((l) => l?.filter((x) => x.id !== d.id) ?? null);
        setMine((m) => m.filter((x) => x.id !== d.id));
        toast('Removed');
      } catch {
        toast("Couldn't remove. Try again");
      }
    };
    const report = async () => {
      if (!signedIn) return needSignIn();
      try {
        await reportDua(d.id);
        setList((l) => l?.filter((x) => x.id !== d.id) ?? null);
        toast('Thank you. We’ll take a look');
      } catch {
        toast("Couldn't report. Try again");
      }
    };
    const options = d.mine ? ['Remove my request', 'Cancel'] : ['Report', 'Cancel'];
    const act = d.mine ? remove : report;
    if (Platform.OS === 'ios') ActionSheetIOS.showActionSheetWithOptions({ options, cancelButtonIndex: 1, destructiveButtonIndex: 0 }, (i) => i === 0 && act());
    else if (Platform.OS === 'web') act();
    else Alert.alert(options[0], undefined, [{ text: 'Cancel', style: 'cancel' }, { text: options[0], style: 'destructive', onPress: act }]);
  };

  const composer = !signedIn ? (
    <Pressable onPress={needSignIn} style={[styles.card, { backgroundColor: pal.surface }]} accessibilityRole="button">
      <Text style={[styles.cardTitle, { color: pal.text }]}>Ask the ummah to make dua for you</Text>
      <Text style={[styles.small, { color: pal.accent, fontFamily: fonts.uiBold }]}>Sign in to ask, and to tell others you made dua for them</Text>
    </Pressable>
  ) : !acct.guidelinesAccepted ? (
    <View style={[styles.card, { backgroundColor: pal.surface }]}>
      <Text style={[styles.cardTitle, { color: pal.text }]}>Before you ask, please agree to the community guidelines</Text>
      <GuidelinesList pal={pal} />
      <Pressable
        onPress={async () => {
          setAgreeing(true);
          try {
            await acct.acceptGuidelines();
          } catch {
            toast("Couldn't save. Try again");
          } finally {
            setAgreeing(false);
          }
        }}
        style={[styles.btn, { backgroundColor: pal.text, opacity: agreeing ? 0.5 : 1 }]}
        accessibilityRole="button"
      >
        <Text style={[styles.btnText, { color: pal.bg }]}>I agree</Text>
      </Pressable>
    </View>
  ) : !writing ? (
    <Pressable onPress={() => setWriting(true)} style={[styles.card, styles.row, { backgroundColor: pal.surface }]} accessibilityRole="button">
      <View style={[styles.icon, { backgroundColor: pal.accent }]}>
        <Icon name="hands" size={19} color={pal.onAccent} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={[styles.cardTitle, { color: pal.text }]}>Ask for dua</Text>
        <Text style={[styles.small, { color: pal.muted }]}>Share what you’re going through, with or without your name</Text>
      </View>
    </Pressable>
  ) : (
    <View style={[styles.card, { backgroundColor: pal.surface }]}>
      <TextInput
        value={draft}
        onChangeText={setDraft}
        placeholder="e.g. Please make dua for my mum, she has an operation on Tuesday"
        placeholderTextColor={pal.muted}
        multiline
        maxLength={280}
        autoFocus
        style={[styles.input, { color: pal.text, borderColor: pal.line }]}
        accessibilityLabel="Your dua request"
      />
      <Text style={[styles.small, { color: pal.muted }]}>Keep it short. There’s no need to share private details or other people’s names. {280 - draft.length} left.</Text>
      <Pressable onPress={() => setAnon((a) => !a)} style={styles.row} accessibilityRole="switch" accessibilityState={{ checked: anon }}>
        <View style={[styles.box, { borderColor: anon ? pal.accent : pal.line, backgroundColor: anon ? pal.accent : 'transparent' }]}>
          {anon && <Icon name="check" size={13} color={pal.onAccent} strokeWidth={2.4} />}
        </View>
        <Text style={[styles.body, { color: pal.text, flex: 1 }]}>Don’t show my name</Text>
      </Pressable>
      <View style={styles.row}>
        <Pressable onPress={() => setWriting(false)} style={[styles.btn, { flex: 1, borderWidth: 1, borderColor: pal.line }]} accessibilityRole="button">
          <Text style={[styles.btnText, { color: pal.text }]}>Cancel</Text>
        </Pressable>
        <Pressable onPress={send} disabled={sending} style={[styles.btn, { flex: 2, backgroundColor: pal.accent, opacity: sending ? 0.5 : 1 }]} accessibilityRole="button">
          {sending ? <ActivityIndicator color={pal.onAccent} /> : <Text style={[styles.btnText, { color: pal.onAccent }]}>Ask the ummah</Text>}
        </Pressable>
      </View>
    </View>
  );

  return (
    <KeyboardAvoidingView style={[styles.root, { backgroundColor: pal.bg }]} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <View style={[styles.head, { paddingTop: insets.top + 12, borderColor: pal.line }]}>
        <Text style={[styles.title, { color: pal.text }]}>Ask for dua</Text>
        <Pressable onPress={() => router.back()} style={[styles.x, { borderColor: pal.line }]} accessibilityRole="button" accessibilityLabel="Close" hitSlop={8}>
          <Icon name="close" size={18} color={pal.text} />
        </Pressable>
      </View>
      <FlatList
        data={list ?? []}
        keyExtractor={(d) => d.id}
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={{ padding: 16, gap: 10, paddingBottom: insets.bottom + 30 }}
        ListHeaderComponent={
          <View style={{ gap: 10, marginBottom: 6 }}>
            <Text style={[styles.lead, { color: pal.muted }]}>
              The Prophet ﷺ said the dua of a Muslim for their brother or sister in their absence is answered, and an angel says, “Ameen, and the same for you” (Sahih Muslim 2733).
            </Text>
            {composer}
            {mine.length > 0 && (
              <View style={[styles.card, { backgroundColor: mix(pal.surface, pal.accent, 0.06) }]}>
                <Text style={[styles.eyebrow, { color: pal.accent }]}>YOUR REQUESTS</Text>
                {mine.slice(0, 3).map((m) => (
                  <View key={m.id} style={{ gap: 2 }}>
                    <Text style={[styles.body, { color: pal.text }]} numberOfLines={2}>
                      {m.body}
                    </Text>
                    <Text style={[styles.small, { color: pal.accent, fontFamily: fonts.uiBold }]}>
                      {m.count === 0 ? 'Shared. People will see it here' : `${m.count} ${m.count === 1 ? 'person' : 'people'} made dua for you`}
                      {m.hidden ? ' · hidden after reports' : new Date(m.expires_at) < new Date() ? ' · finished' : ''}
                    </Text>
                  </View>
                ))}
              </View>
            )}
            {list === null && <ActivityIndicator color={pal.muted} style={{ marginTop: 20 }} />}
          </View>
        }
        ListEmptyComponent={list ? <Text style={[styles.body, { color: pal.muted, textAlign: 'center', marginTop: 20 }]}>No requests right now. Be the first to ask.</Text> : undefined}
        renderItem={({ item: d }) => (
          <View style={[styles.card, { backgroundColor: pal.surface }]}>
            <Text style={[styles.request, { color: pal.text }]}>{d.body}</Text>
            <View style={styles.row}>
              <Text style={[styles.small, { color: pal.muted, flex: 1 }]}>
                {d.mine ? 'You' : d.handle ?? 'Someone'} · {ago(d.created_at)}
              </Text>
              <Pressable onPress={() => more(d)} hitSlop={10} accessibilityRole="button" accessibilityLabel={d.mine ? 'Options for your request' : 'Report'}>
                <Text style={[styles.dots, { color: pal.muted }]}>···</Text>
              </Pressable>
            </View>
            <View style={styles.row}>
              <Pressable
                onPress={() => pray(d)}
                disabled={d.mine}
                style={[styles.pray, d.made ? { backgroundColor: mix(pal.surface, pal.accent, 0.14) } : { backgroundColor: d.mine ? pal.line : pal.accent }]}
                accessibilityRole="button"
                accessibilityState={{ checked: d.made }}
              >
                <Icon name="hands" size={16} color={d.made ? pal.accent : pal.onAccent} />
                <Text style={[styles.prayText, { color: d.made ? pal.accent : pal.onAccent }]}>{d.made ? 'You made dua' : d.mine ? 'Your request' : 'I made dua'}</Text>
              </Pressable>
              {d.count > 0 && (
                <Text style={[styles.small, { color: pal.muted }]}>
                  {d.count} {d.count === 1 ? 'person' : 'people'}
                </Text>
              )}
            </View>
          </View>
        )}
      />
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  head: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 18, paddingBottom: 12, borderBottomWidth: StyleSheet.hairlineWidth },
  title: { fontFamily: fonts.uiBold, fontSize: 26, letterSpacing: -0.5 },
  x: { width: 36, height: 36, borderRadius: 18, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  lead: { fontFamily: fonts.read, fontSize: 14.5, lineHeight: 21 },
  card: { borderRadius: 16, padding: 14, gap: 10 },
  cardTitle: { fontFamily: fonts.uiSemi, fontSize: 16 },
  eyebrow: { fontFamily: fonts.uiBold, fontSize: 11, letterSpacing: 1.2 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  icon: { width: 36, height: 36, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  small: { fontFamily: fonts.ui, fontSize: 13, lineHeight: 18 },
  body: { fontFamily: fonts.read, fontSize: 15.5, lineHeight: 22 },
  request: { fontFamily: fonts.read, fontSize: 17, lineHeight: 25 },
  input: { fontFamily: fonts.read, fontSize: 16.5, lineHeight: 23, minHeight: 90, borderWidth: 1, borderRadius: 12, padding: 12, textAlignVertical: 'top' },
  box: { width: 22, height: 22, borderRadius: 6, borderWidth: 1.5, alignItems: 'center', justifyContent: 'center' },
  btn: { borderRadius: 12, minHeight: 46, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 16 },
  btnText: { fontFamily: fonts.uiBold, fontSize: 15 },
  dots: { fontFamily: fonts.uiBold, fontSize: 18, letterSpacing: 1 },
  pray: { flexDirection: 'row', alignItems: 'center', gap: 6, borderRadius: 999, paddingHorizontal: 14, paddingVertical: 9 },
  prayText: { fontFamily: fonts.uiBold, fontSize: 14 },
});
