import { useRouter } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { Image, Keyboard, KeyboardAvoidingView, Linking, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useExplain } from '@/components/Explain';
import { Flourish, GoldStar, ThinkingStar } from '@/components/Gold';
import { SkyWash } from '@/components/SkyWash';
import { useTabBarSpace } from '@/components/TabBar';
import { Icon } from '@/components/Icon';
import { MeButton } from '@/components/MeButton';
import { useToast } from '@/components/Toast';
import { LEARN_ORDER } from '@/data/salah';
import { useAccount } from '@/lib/account';
import { ART } from '@/lib/art';
import { reportAnswer } from '@/lib/ask';
import { askIslam, IslamAnswer, IslamSource, ISLAM_STARTERS } from '@/lib/islam';
import { showFeed } from '@/lib/nav';
import { usePlus } from '@/lib/plus';
import { usePrefs } from '@/lib/store';
import { fonts, mix, usePalette } from '@/lib/theme';

type Turn = { q: string; res?: IslamAnswer; note?: string };

/**
 * Ask (Saj, 14 Nov 2026): "is this a silly question?" Anything about Islam, answered from Munib's checked library,
 * the Quran and Tafsir Ibn Kathir, with the sources under every answer. No rulings; differences pointed to an imam.
 * The conversation is kept only on screen, never saved.
 */
export default function AskTab() {
  const pal = usePalette();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const acct = useAccount();
  const prefs = usePrefs();
  const plus = usePlus();
  const toast = useToast();
  const [explain, sheet] = useExplain(pal);
  const [turns, setTurns] = useState<Turn[]>([]);
  const [text, setText] = useState('');
  const [busy, setBusy] = useState(false);
  const scroll = useRef<React.ComponentRef<typeof ScrollView>>(null);
  const signedIn = acct.status === 'signedIn';
  // The tab bar floats over the page: leave room for it, except while the keyboard covers it.
  const barSpace = useTabBarSpace();
  const [typing, setTyping] = useState(false);
  useEffect(() => {
    const a = Keyboard.addListener(Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow', () => setTyping(true));
    const b = Keyboard.addListener(Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide', () => setTyping(false));
    return () => {
      a.remove();
      b.remove();
    };
  }, []);

  const send = async (q0?: string) => {
    const q = (q0 ?? text).trim();
    if (q.length < 3 || busy) return;
    if (!signedIn) return router.push({ pathname: '/signin', params: { why: 'islam' } });
    setText('');
    const history = turns.filter((t) => t.res).map((t) => ({ q: t.q, a: t.res!.answer }));
    setTurns((t) => [...t, { q }]);
    setBusy(true);
    setTimeout(() => scroll.current?.scrollToEnd({ animated: true }), 80);
    const r = await askIslam(q, history);
    setBusy(false);
    setTurns((t) => {
      const last = t[t.length - 1];
      const done: Turn =
        'answer' in r
          ? { ...last, res: r }
          : {
              ...last,
              note:
                r.error === 'limit'
                  ? `That’s your ${r.perDay ?? 5} questions for today. More tomorrow, in shaʾ Allah${plus.available && !plus.active ? ', or ask without a daily limit with Munib Plus.' : '.'}`
                  : r.error === 'off'
                    ? 'Ask isn’t switched on yet. Please try again soon.'
                    : 'Something went wrong. Check your connection and try again.',
            };
      return [...t.slice(0, -1), done];
    });
    setTimeout(() => scroll.current?.scrollToEnd({ animated: true }), 120);
  };

  const openSource = (s: IslamSource) => {
    const [kind, rest] = [s.id.slice(0, 1), s.id.slice(2)];
    if (kind === 'x') return explain(rest);
    if ((kind === 'q' || kind === 't') && s.s && s.a) {
      prefs.readAt(s.s, s.a);
      return showFeed(router);
    }
    if (kind === 'd') return router.push('/duas');
    if (kind === 'p') {
      const at = LEARN_ORDER.indexOf(rest);
      return router.push({ pathname: '/pray/[mode]', params: at >= 0 ? { mode: 'learn', at: String(at) } : { mode: 'learn' } });
    }
  };
  const tappable = (s: IslamSource) => ['x', 'q', 't', 'd', 'p'].includes(s.id[0]);

  const report = async (t: Turn) => {
    if (!acct.userId || !t.res) return;
    try {
      await reportAnswer(acct.userId, 'islam', t.q, t.res.answer);
      toast('Thank you. We’ll look at this answer.');
    } catch {
      toast('Couldn’t send that. Please try again.');
    }
  };

  const soft = mix(pal.surface, pal.accent, 0.1);

  return (
    <KeyboardAvoidingView style={[styles.root, { backgroundColor: pal.bg }]} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <SkyWash pal={pal} />
      <View style={[styles.head, { paddingTop: insets.top + 12 }]}>
        <View style={{ flex: 1 }}>
          <Text style={[styles.title, { color: pal.text }]}>Ask</Text>
          <Flourish pal={pal} />
          <Text style={[styles.lead, { color: pal.muted }]}>Anything about Islam. No question is silly.</Text>
        </View>
        <MeButton />
      </View>

      <ScrollView ref={scroll} contentContainerStyle={styles.body} keyboardShouldPersistTaps="handled">
        {turns.length === 0 && (
          <>
            <View style={[styles.intro, { backgroundColor: pal.bold ? pal.pop.teal : soft }]}>
              <Image source={ART.hands} style={styles.introArt} resizeMode="contain" accessibilityIgnoresInvertColors />
              <Text style={[styles.introTitle, { color: pal.bold ? '#FFFFFF' : pal.text }]}>
                {prefs.firstName ? `What’s on your mind, ${prefs.firstName}?` : 'What’s on your mind?'}
              </Text>
              <Text style={[styles.introBody, { color: pal.bold ? 'rgba(255,255,255,0.85)' : pal.muted }]}>
                Ask anything, the way you’d ask a friend who knows. Where Munib has a source, it’s shown under the answer. For something about your own situation, your local imam is the best person to confirm with.
              </Text>
            </View>
            {ISLAM_STARTERS.map((g, gi) => {
              const colour = [pal.pop.teal, pal.pop.amber, pal.pop.violet][gi % 3];
              return (
                <View key={g.title} style={{ gap: 10 }}>
                  <View style={styles.groupRow}>
                    <GoldStar size={11} color={pal.gold} />
                    <Text style={[styles.groupTitle, { color: pal.text }]}>{g.title}</Text>
                  </View>
                  <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginHorizontal: -16 }} contentContainerStyle={{ paddingHorizontal: 16, gap: 10 }}>
                    {g.qs.map((q) => (
                      <Pressable
                        key={q}
                        onPress={() => send(q)}
                        style={({ pressed }) => [styles.starter, { backgroundColor: mix(pal.surface, colour, pal.dark ? 0.24 : 0.1), borderColor: mix(pal.surface, colour, pal.dark ? 0.5 : 0.3), transform: [{ scale: pressed ? 0.97 : 1 }] }]}
                        accessibilityRole="button"
                        accessibilityLabel={q}
                      >
                        <Text style={[styles.starterText, { color: pal.text }]}>{q}</Text>
                        <View style={[styles.starterGo, { backgroundColor: colour }]}>
                          <Icon name="chevron" size={14} color="#FFFFFF" strokeWidth={2.4} />
                        </View>
                      </Pressable>
                    ))}
                  </ScrollView>
                </View>
              );
            })}
          </>
        )}

        {turns.map((t, i) => (
          <View key={i} style={{ gap: 10 }}>
            <View style={[styles.mine, { backgroundColor: pal.bold ? pal.text : pal.accent }]}>
              <Text style={[styles.mineText, { color: pal.bold ? pal.bg : pal.onAccent }]}>{t.q}</Text>
            </View>
            {!t.res && !t.note && (
              <View style={[styles.answer, { backgroundColor: pal.surface, flexDirection: 'row', gap: 12, alignItems: 'center' }]} accessibilityLabel="Munib is thinking">
                <ThinkingStar pal={pal} />
                <Thinking pal={pal} />
              </View>
            )}
            {t.note && (
              <View style={[styles.answer, { backgroundColor: pal.surface, gap: 10 }]}>
                <Text style={[styles.answerText, { color: pal.text }]}>{t.note}</Text>
                {t.note.includes('Munib Plus') && (
                  <Pressable onPress={() => router.push('/plus')} accessibilityRole="button">
                    <Text style={[styles.link, { color: pal.accent }]}>See Munib Plus</Text>
                  </Pressable>
                )}
              </View>
            )}
            {t.res && (
              <View style={[styles.answer, { backgroundColor: pal.surface, gap: 12 }]}>
                {t.res.crisis && (
                  <Pressable onPress={() => Linking.openURL('tel:116123')} style={[styles.crisis, { backgroundColor: mix(pal.surface, '#E5484D', 0.12) }]} accessibilityRole="button">
                    <Text style={[styles.crisisText, { color: pal.text }]}>You’re not alone. Samaritans are there day and night, free: 116 123. Tap to call.</Text>
                  </Pressable>
                )}
                <Text style={[styles.answerText, { color: pal.text }]}>
                  {t.res.answer.split(/(\[\d+\])/g).map((part, k) =>
                    /^\[\d+\]$/.test(part) ? (
                      <Text key={k} style={[styles.cite, { color: pal.accent }]}>
                        {part}
                      </Text>
                    ) : (
                      part
                    ),
                  )}
                </Text>
                {t.res.sources.length > 0 && (
                  <View style={{ gap: 6 }}>
                    <Text style={[styles.group, { color: pal.muted }]}>SOURCES</Text>
                    {t.res.sources.map((s) => (
                      <Pressable
                        key={s.n}
                        disabled={!tappable(s)}
                        onPress={() => openSource(s)}
                        style={({ pressed }) => [styles.source, { backgroundColor: soft, opacity: pressed ? 0.7 : 1 }]}
                        accessibilityRole={tappable(s) ? 'button' : undefined}
                      >
                        <Text style={[styles.sourceN, { color: pal.accent }]}>{s.n}</Text>
                        <View style={{ flex: 1 }}>
                          <Text style={[styles.sourceLabel, { color: pal.text }]} numberOfLines={2}>{s.label}</Text>
                          {!!s.src && <Text style={[styles.sourceSrc, { color: pal.muted }]} numberOfLines={2}>{s.src}</Text>}
                        </View>
                        {tappable(s) && <Icon name="chevron" size={14} color={pal.muted} />}
                      </Pressable>
                    ))}
                  </View>
                )}
                {t.res.sources.length === 0 && <Text style={[styles.small, { color: pal.muted }]}>From general knowledge: check anything important with your local imam.</Text>}
                <Pressable onPress={() => report(t)} hitSlop={6} accessibilityRole="button" style={{ alignSelf: 'flex-start' }}>
                  <Text style={[styles.small, { color: pal.muted, textDecorationLine: 'underline' }]}>Something wrong? Report this answer</Text>
                </Pressable>
              </View>
            )}
          </View>
        ))}
        {turns.length > 0 && (
          <Text style={[styles.small, { color: pal.muted, textAlign: 'center', marginTop: 4 }]}>Your questions aren’t saved. Answers can be imperfect: check anything important with your local imam.</Text>
        )}
      </ScrollView>

      <View style={[styles.bar, { borderTopColor: 'transparent', paddingBottom: typing ? 10 : barSpace }]}>
        <TextInput
          value={text}
          onChangeText={setText}
          placeholder={signedIn ? 'Ask anything about Islam…' : 'Ask anything about Islam (free account)'}
          placeholderTextColor={pal.muted}
          multiline
          maxLength={500}
          style={[styles.input, { color: pal.text, backgroundColor: pal.surface, borderColor: pal.line }]}
          accessibilityLabel="Your question"
        />
        <Pressable
          onPress={() => send()}
          disabled={busy || text.trim().length < 3}
          style={[styles.send, { backgroundColor: pal.bold ? pal.text : pal.accent, opacity: busy || text.trim().length < 3 ? 0.4 : 1 }]}
          accessibilityRole="button"
          accessibilityLabel="Send"
        >
          <View style={{ transform: [{ rotate: '-90deg' }] }}>
            <Icon name="chevron" size={18} color={pal.bold ? pal.bg : pal.onAccent} strokeWidth={2.4} />
          </View>
        </Pressable>
      </View>
      {sheet}
    </KeyboardAvoidingView>
  );
}

/** What Munib says while it works on an answer; the line changes every couple of seconds. */
function Thinking({ pal }: { pal: { muted: string } }) {
  const LINES = ['Looking through the sources…', 'Reading the ayat…', 'Checking what the scholars say…', 'Putting it simply…'];
  const [i, setI] = useState(0);
  useEffect(() => {
    const t = setInterval(() => setI((n) => (n + 1) % LINES.length), 2200);
    return () => clearInterval(t);
  }, [LINES.length]);
  return <Text style={[styles.thinking, { color: pal.muted }]}>{LINES[i]}</Text>;
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  head: { flexDirection: 'row', alignItems: 'flex-start', gap: 12, paddingHorizontal: 20, paddingBottom: 10 },
  title: { fontFamily: fonts.read, fontSize: 34, letterSpacing: -1 },
  lead: { fontFamily: fonts.ui, fontSize: 14.5, lineHeight: 20, marginTop: 2 },
  body: { padding: 16, gap: 16, paddingBottom: 24 },
  intro: { borderRadius: 22, padding: 18, paddingRight: 110, gap: 6, overflow: 'hidden' },
  introArt: { position: 'absolute', right: -6, top: 4, width: 112, height: 112 },
  introTitle: { fontFamily: fonts.read, fontSize: 22, lineHeight: 28, letterSpacing: -0.4 },
  introBody: { fontFamily: fonts.ui, fontSize: 13.5, lineHeight: 19 },
  group: { fontFamily: fonts.uiBold, fontSize: 11, letterSpacing: 1.2, paddingHorizontal: 4 },
  groupRow: { flexDirection: 'row', alignItems: 'center', gap: 7, paddingHorizontal: 4 },
  groupTitle: { fontFamily: fonts.read, fontSize: 19, letterSpacing: -0.3 },
  starter: { width: 178, minHeight: 132, borderWidth: 1, borderRadius: 20, padding: 14, justifyContent: 'space-between', gap: 10 },
  starterText: { fontFamily: fonts.read, fontSize: 16.5, lineHeight: 22, letterSpacing: -0.2 },
  starterGo: { width: 28, height: 28, borderRadius: 14, alignItems: 'center', justifyContent: 'center', alignSelf: 'flex-end' },
  thinking: { fontFamily: fonts.readItalic, fontSize: 14.5, lineHeight: 20 },
  mine: { alignSelf: 'flex-end', maxWidth: '85%', borderRadius: 20, borderBottomRightRadius: 6, paddingHorizontal: 15, paddingVertical: 11 },
  mineText: { fontFamily: fonts.uiSemi, fontSize: 15, lineHeight: 21 },
  answer: { borderRadius: 20, borderBottomLeftRadius: 6, padding: 16 },
  answerText: { fontFamily: fonts.read, fontSize: 16, lineHeight: 25 },
  cite: { fontFamily: fonts.uiBold, fontSize: 12 },
  source: { flexDirection: 'row', alignItems: 'center', gap: 10, borderRadius: 12, paddingHorizontal: 12, paddingVertical: 9 },
  sourceN: { fontFamily: fonts.uiBold, fontSize: 13, width: 16 },
  sourceLabel: { fontFamily: fonts.uiSemi, fontSize: 13.5, lineHeight: 18 },
  sourceSrc: { fontFamily: fonts.ui, fontSize: 12, lineHeight: 16 },
  crisis: { borderRadius: 12, padding: 12 },
  crisisText: { fontFamily: fonts.uiSemi, fontSize: 14, lineHeight: 20 },
  small: { fontFamily: fonts.ui, fontSize: 12.5, lineHeight: 18 },
  link: { fontFamily: fonts.uiBold, fontSize: 15 },
  bar: { flexDirection: 'row', alignItems: 'flex-end', gap: 10, paddingHorizontal: 12, paddingVertical: 10, borderTopWidth: StyleSheet.hairlineWidth },
  input: { flex: 1, maxHeight: 120, minHeight: 44, borderWidth: 1, borderRadius: 22, paddingHorizontal: 16, paddingTop: 12, paddingBottom: 12, fontFamily: fonts.ui, fontSize: 15.5 },
  send: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
});
