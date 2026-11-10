import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { useAccount } from '@/lib/account';
import { ASK_STARTERS, askAyah, reportAnswer } from '@/lib/ask';
import { LangId, loadTafsir, loadWords, Tafsir } from '@/lib/quran';
import { fonts, mix, Palette } from '@/lib/theme';
import { Sheet } from './Sheet';
import { useToast } from './Toast';

/** The word someone pressed and held: which surah and ayah, its place in the ayah, and the text on the card. */
export type WordPick = { s: number; n: number; k: number; count: number; text: string } | null;

const bare = (t: string) => t.replace(/[ً-ٰٟۖ-ۭـ]/g, '').trim();

/** The meaning of one Arabic word, from the Quran Foundation's word-by-word data. */
export function WordSheet({ pick, lang, pal, onClose }: { pick: WordPick; lang: LangId; pal: Palette; onClose: () => void }) {
  const [state, setState] = useState<{ ar: string; mean: string; tl: string } | 'loading' | 'missing'>('loading');
  useEffect(() => {
    if (!pick) return;
    setState('loading');
    loadWords(pick.s, lang).then(
      (all) => {
        const words = all[pick.n] ?? [];
        // Same number of words as on the card: match by position. Otherwise, by the word itself.
        let w = words.length === pick.count ? words[pick.k] : undefined;
        if (!w) w = words.find((x) => bare(x[0]) === bare(pick.text));
        setState(w ? { ar: w[0], mean: w[1], tl: w[2] } : 'missing');
      },
      () => setState('missing'),
    );
  }, [pick, lang]);

  return (
    <Sheet visible={!!pick} onClose={onClose} title="Word meaning" pal={pal}>
      {state === 'loading' && <ActivityIndicator color={pal.accent} style={{ padding: 24 }} />}
      {state === 'missing' && (
        <Text style={[styles.body, { color: pal.muted }]}>Couldn't find this word's meaning. Check your connection, or try another word.</Text>
      )}
      {typeof state === 'object' && (
        <View style={{ alignItems: 'center', gap: 6, paddingVertical: 8 }}>
          <Text style={[styles.ar, { color: pal.text }]}>{state.ar || pick?.text}</Text>
          {!!state.tl && <Text style={[styles.tl, { color: pal.accent }]}>{state.tl}</Text>}
          <Text style={[styles.mean, { color: pal.text }]}>{state.mean}</Text>
          <Text style={[styles.small, { color: pal.muted }]}>
            {pick ? `${pick.s}:${pick.n}, word ${pick.k + 1}` : ''} · Word by word from Quran.com
          </Text>
        </View>
      )}
    </Sheet>
  );
}

/** Tafsir Ibn Kathir for an ayah (English abridged, Urdu or Bengali), from the Quran Foundation. */
export function TafsirSheet({ verseKey, lang, pal, onClose }: { verseKey: string | null; lang: LangId; pal: Palette; onClose: () => void }) {
  const [t, setT] = useState<Tafsir | 'loading' | 'failed'>('loading');
  useEffect(() => {
    if (!verseKey) return;
    setT('loading');
    loadTafsir(verseKey, lang).then(setT, () => setT('failed'));
  }, [verseKey, lang]);

  const covers = typeof t === 'object' && t.keys.length > 1 ? `${t.keys[0]}–${t.keys[t.keys.length - 1].split(':')[1]}` : verseKey;
  return (
    <Sheet visible={!!verseKey} onClose={onClose} title={`Tafsir · ${covers ?? ''}`} pal={pal}>
      {t === 'loading' && <ActivityIndicator color={pal.accent} style={{ padding: 24 }} />}
      {t === 'failed' && <Text style={[styles.body, { color: pal.muted }]}>Couldn't load the tafsir. Check your connection and try again.</Text>}
      {typeof t === 'object' && (
        <>
          {t.paragraphs.map((para, i) => (
            <Text key={i} style={[styles.body, { color: pal.text }]}>
              {para}
            </Text>
          ))}
          <Text style={[styles.small, { color: pal.muted, marginTop: 8 }]}>
            {t.by}
            {lang !== 'en' && lang !== 'ur' && lang !== 'bn' ? ' (in English)' : ''}, the classic 14th-century commentary by Ibn Kathir of Damascus · via Quran.com
          </Text>
        </>
      )}
    </Sheet>
  );
}

/**
 * Ask about this ayah: the reader types a question (or picks a starter) and gets a short answer explained
 * from Tafsir Ibn Kathir and the ayat around it. Never a ruling; it says when to ask a scholar.
 * Needs an account (there's a daily limit per person).
 */
export function AskSheet({ verseKey, pal, onClose }: { verseKey: string | null; pal: Palette; onClose: () => void }) {
  const acct = useAccount();
  const router = useRouter();
  const toast = useToast();
  const [q, setQ] = useState('');
  const [asked, setAsked] = useState('');
  const [state, setState] = useState<'idle' | 'loading' | { answer: string } | { error: string }>('idle');
  const [reported, setReported] = useState(false);

  useEffect(() => {
    // A fresh start for each ayah.
    setQ('');
    setAsked('');
    setState('idle');
    setReported(false);
  }, [verseKey]);

  const ask = async (text: string) => {
    const question = text.trim();
    if (!verseKey || question.length < 3 || state === 'loading') return;
    const [s, a] = verseKey.split(':').map(Number);
    setAsked(question);
    setState('loading');
    setReported(false);
    const r = await askAyah(s, a, question);
    if ('answer' in r) {
      setState({ answer: r.answer });
      setQ('');
    } else
      setState({
        error:
          r.error === 'limit'
            ? `You've asked your ${r.perDay ?? 5} questions for today. The three suggested questions still work, and you can ask more tomorrow, in sha Allah.`
            : r.error === 'off'
              ? 'Asking questions isn’t switched on yet. It will be soon.'
              : 'Couldn’t get an answer. Check your connection and try again.',
      });
  };

  const signedIn = acct.status === 'signedIn';
  return (
    <Sheet visible={!!verseKey} onClose={onClose} title={`Ask about ${verseKey ?? ''}`} pal={pal}>
      {!signedIn ? (
        <View style={{ gap: 12 }}>
          <Text style={[styles.body, { color: pal.text }]}>
            Ask anything about this ayah, like what it means, why it was revealed, or how it speaks to your life, and get an answer from the classic tafsir of Ibn Kathir.
          </Text>
          <Pressable
            onPress={() => {
              onClose();
              router.push({ pathname: '/signin', params: { why: 'ask' } });
            }}
            style={[styles.btn, { backgroundColor: pal.text }]}
            accessibilityRole="button"
          >
            <Text style={[styles.btnText, { color: pal.bg }]}>Create a free account to ask</Text>
          </Pressable>
        </View>
      ) : (
        <View style={{ gap: 12 }}>
          {state === 'idle' && (
            <>
              <Text style={[styles.body, { color: pal.muted }]}>What would you like to understand? Ask in your own words.</Text>
              <View style={styles.starters}>
                {ASK_STARTERS.map((t) => (
                  <Pressable key={t} onPress={() => ask(t)} style={[styles.starter, { borderColor: pal.line, backgroundColor: mix(pal.surface, pal.accent, 0.05) }]} accessibilityRole="button">
                    <Text style={[styles.starterText, { color: pal.text }]}>{t}</Text>
                  </Pressable>
                ))}
              </View>
            </>
          )}

          {!!asked && state !== 'idle' && <Text style={[styles.question, { color: pal.accent }]}>{asked}</Text>}
          {state === 'loading' && (
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 8 }}>
              <ActivityIndicator color={pal.accent} />
              <Text style={[styles.body, { color: pal.muted }]}>Reading the tafsir…</Text>
            </View>
          )}
          {typeof state === 'object' && 'error' in state && <Text style={[styles.body, { color: pal.muted }]}>{state.error}</Text>}
          {typeof state === 'object' && 'answer' in state && (
            <>
              {state.answer.split(/\n\s*\n/).map((para, i) => (
                <Text key={i} style={[styles.body, { color: pal.text }]}>
                  {para.trim()}
                </Text>
              ))}
              <Text style={[styles.note, { color: pal.muted }]}>
                Explained by AI from Tafsir Ibn Kathir and the ayat around it. It isn’t a religious ruling: for your own situation, please ask a scholar or your local imam.
              </Text>
              <Pressable
                disabled={reported}
                onPress={async () => {
                  try {
                    if (acct.userId && typeof state === 'object' && 'answer' in state) await reportAnswer(acct.userId, verseKey ?? '', asked, state.answer);
                    setReported(true);
                    toast('Thank you. We’ll check this answer');
                  } catch {
                    toast('Couldn’t send. Check your connection');
                  }
                }}
                accessibilityRole="button"
              >
                <Text style={[styles.note, { color: pal.muted, textDecorationLine: reported ? 'none' : 'underline' }]}>
                  {reported ? 'Sent to us, thank you' : 'Something wrong or worrying in this answer? Tell us'}
                </Text>
              </Pressable>
            </>
          )}

          <View style={[styles.inputRow, { borderColor: pal.line, backgroundColor: pal.bg }]}>
            <TextInput
              value={q}
              onChangeText={setQ}
              placeholder={state === 'idle' ? 'e.g. What does it mean for me?' : 'Ask another question'}
              placeholderTextColor={pal.muted}
              multiline
              maxLength={400}
              style={[styles.input, { color: pal.text }]}
            />
            <Pressable
              onPress={() => ask(q)}
              disabled={q.trim().length < 3 || state === 'loading'}
              style={[styles.send, { backgroundColor: pal.accent, opacity: q.trim().length < 3 || state === 'loading' ? 0.4 : 1 }]}
              accessibilityRole="button"
              accessibilityLabel="Ask"
            >
              <Text style={[styles.sendText, { color: pal.onAccent }]}>Ask</Text>
            </Pressable>
          </View>
        </View>
      )}
    </Sheet>
  );
}

const styles = StyleSheet.create({
  ar: { fontFamily: fonts.arabic, fontSize: 44, lineHeight: 84 },
  tl: { fontFamily: fonts.readItalic, fontSize: 18 },
  mean: { fontFamily: fonts.read, fontSize: 20, lineHeight: 28, textAlign: 'center' },
  body: { fontFamily: fonts.read, fontSize: 16, lineHeight: 25 },
  small: { fontFamily: fonts.ui, fontSize: 12, textAlign: 'center' },
  note: { fontFamily: fonts.ui, fontSize: 12, lineHeight: 17 },
  question: { fontFamily: fonts.uiBold, fontSize: 15, lineHeight: 21 },
  starters: { gap: 8 },
  starter: { borderWidth: 1, borderRadius: 10, paddingHorizontal: 14, paddingVertical: 11 },
  starterText: { fontFamily: fonts.uiSemi, fontSize: 14 },
  inputRow: { flexDirection: 'row', alignItems: 'flex-end', gap: 8, borderWidth: 1, borderRadius: 12, padding: 6, marginTop: 4 },
  input: { flex: 1, fontFamily: fonts.ui, fontSize: 15, minHeight: 40, maxHeight: 110, paddingHorizontal: 8, paddingVertical: 9 },
  send: { borderRadius: 9, paddingHorizontal: 16, paddingVertical: 10 },
  sendText: { fontFamily: fonts.uiBold, fontSize: 14 },
  btn: { borderRadius: 12, minHeight: 48, alignItems: 'center', justifyContent: 'center' },
  btnText: { fontFamily: fonts.uiBold, fontSize: 15 },
});
