import type React from 'react';
import { useRouter } from 'expo-router';
import { useRef, useState } from 'react';
import { ActivityIndicator, Linking, Pressable, ScrollView, Share, StyleSheet, Text, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ExplainIntro } from '@/components/Explain';
import { Icon } from '@/components/Icon';
import type { Dua } from '@/data/duas';
import { useAccount } from '@/lib/account';
import { DuaResult, findDuas, picksFor, QUICK } from '@/lib/duas';
import { textScale, usePrefs } from '@/lib/store';
import { fonts, mix, Palette, usePalette } from '@/lib/theme';

/** Find a dua: say what's happening, get duas for it from Hisn al-Muslim and the Quran. */
export default function FindDua() {
  const pal = usePalette();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const acct = useAccount();
  const prefs = usePrefs();
  const scale = textScale(prefs.textSize);
  const [q, setQ] = useState('');
  const [busy, setBusy] = useState(false);
  const [res, setRes] = useState<DuaResult | null>(null);
  const [showTl, setShowTl] = useState(true);
  const scroll = useRef<React.ComponentRef<typeof ScrollView>>(null);

  const go = async () => {
    const t = q.trim();
    if (t.length < 3 || busy) return;
    setBusy(true);
    setRes(await findDuas(t, acct.status === 'signedIn'));
    setBusy(false);
    setTimeout(() => scroll.current?.scrollTo({ y: 0, animated: true }), 50);
  };
  const quick = (ids: number[], label: string) => {
    setQ('');
    setRes({ picks: picksFor(ids), message: label, crisis: false, by: 'words' });
    setTimeout(() => scroll.current?.scrollTo({ y: 0, animated: true }), 50);
  };

  return (
    <View style={[styles.root, { backgroundColor: pal.bg }]}>
      <View style={[styles.head, { paddingTop: insets.top + 12, borderColor: pal.line }]}>
        <Text style={[styles.title, { color: pal.text }]}>Find a dua</Text>
        <Pressable onPress={() => router.back()} style={[styles.x, { borderColor: pal.line }]} accessibilityRole="button" accessibilityLabel="Close" hitSlop={8}>
          <Icon name="close" size={18} color={pal.text} />
        </Pressable>
      </View>

      <ScrollView ref={scroll} keyboardShouldPersistTaps="handled" contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 40 }]}>
        <ExplainIntro id="dua" pal={pal} />
        <Text style={[styles.lead, { color: pal.muted }]}>Tell us what’s going on, in your own words. Munib finds duas for it from Hisn al-Muslim and the Quran.</Text>
        <View style={[styles.box, { backgroundColor: pal.surface, borderColor: pal.line }]}>
          <TextInput
            value={q}
            onChangeText={setQ}
            placeholder="e.g. My mum is in hospital and I’m scared"
            placeholderTextColor={pal.muted}
            multiline
            maxLength={300}
            style={[styles.input, { color: pal.text }]}
            accessibilityLabel="What’s going on"
          />
          <Pressable onPress={go} disabled={q.trim().length < 3 || busy} style={[styles.btn, { backgroundColor: pal.text, opacity: q.trim().length < 3 ? 0.4 : 1 }]} accessibilityRole="button">
            {busy ? <ActivityIndicator color={pal.bg} /> : <Text style={[styles.btnText, { color: pal.bg }]}>Find duas</Text>}
          </Pressable>
        </View>
        {acct.status !== 'signedIn' && <Text style={[styles.small, { color: pal.muted }]}>Without an account, Munib matches your words to the duas. With a free account, it understands what you write.</Text>}

        {res && (
          <View style={{ gap: 14, marginTop: 6 }}>
            {res.crisis && (
              <View style={[styles.crisis, { borderColor: '#B4432F', backgroundColor: mix(pal.surface, '#B4432F', 0.06) }]}>
                <Text style={[styles.crisisTitle, { color: pal.text }]}>You don’t have to carry this alone</Text>
                <Text style={[styles.small, { color: pal.text }]}>Please talk to someone you trust. In the UK you can call Samaritans free, any time, on 116 123. If you’re in danger, call 999.</Text>
                <Pressable onPress={() => Linking.openURL('tel:116123')} style={[styles.smallBtn, { backgroundColor: '#B4432F' }]}>
                  <Text style={[styles.smallBtnText, { color: '#fff' }]}>Call Samaritans</Text>
                </Pressable>
              </View>
            )}
            {!!res.message && <Text style={[styles.message, { color: pal.text }]}>{res.message}</Text>}
            <Pressable onPress={() => setShowTl((x) => !x)} style={{ alignSelf: 'flex-start' }} hitSlop={6}>
              <Text style={[styles.small, { color: pal.accent, fontFamily: fonts.uiBold }]}>{showTl ? 'Hide' : 'Show'} transliteration</Text>
            </Pressable>
            {res.picks.map((p) => (
              <View key={p.topic.id} style={{ gap: 10 }}>
                <View style={{ gap: 2 }}>
                  <Text style={[styles.topic, { color: pal.text }]}>{p.topic.title}</Text>
                  {!!p.why && <Text style={[styles.why, { color: pal.muted }]}>{p.why}</Text>}
                </View>
                {p.topic.duas.map((d) => (
                  <DuaCard key={d.id} d={d} src={p.topic.src} pal={pal} scale={scale} showTl={showTl} />
                ))}
              </View>
            ))}
            <Text style={[styles.small, { color: pal.muted }]}>
              {res.by === 'ai' ? 'Chosen by Munib’s AI from this collection only: it never writes duas. ' : ''}What you type isn’t saved. If you’re unsure about a dua, ask your local imam.
            </Text>
          </View>
        )}

        <Text style={[styles.h3, { color: pal.muted }]}>OR CHOOSE</Text>
        <View style={styles.chips}>
          {QUICK.map((c) => (
            <Pressable key={c.label} onPress={() => quick(c.ids, c.label)} style={[styles.chip, { backgroundColor: pal.surface, borderColor: pal.line }]} accessibilityRole="button">
              <Text style={[styles.chipText, { color: pal.text }]}>{c.label}</Text>
            </Pressable>
          ))}
        </View>
        <Text style={[styles.small, { color: pal.muted, marginTop: 8 }]}>
          Duas from Hisn al-Muslim (Fortress of the Muslim) by Saʿid al-Qahtani, which gives the hadith source for each, and from the Quran. Translations and transliterations are as published; they’re being checked by a scholar.
        </Text>
      </ScrollView>
    </View>
  );
}

function DuaCard({ d, src, pal, scale, showTl }: { d: Dua; src: string; pal: Palette; scale: number; showTl: boolean }) {
  return (
    <View style={[styles.card, { backgroundColor: pal.surface, borderColor: pal.line }]}>
      <Text style={[styles.ar, { color: pal.text, fontSize: 24 * scale, lineHeight: 24 * scale * 1.9 }]}>{d.ar}</Text>
      {showTl && !!d.tl && <Text style={[styles.tl, { color: pal.accent, fontSize: 14 * scale, lineHeight: 14 * scale * 1.5 }]}>{d.tl}</Text>}
      <Text style={[styles.en, { color: pal.text, fontSize: 16 * scale, lineHeight: 16 * scale * 1.5 }]}>{d.en}</Text>
      <View style={styles.cardFoot}>
        <Text style={[styles.small, { color: pal.muted, flex: 1 }]}>
          {src}
          {d.n > 1 ? ` · say it ${d.n} times` : ''}
        </Text>
        <Pressable
          onPress={() => Share.share({ message: `${d.ar}\n\n${d.tl ? `${d.tl}\n\n` : ''}${d.en}\n\n${src}` }).catch(() => {})}
          hitSlop={8}
          accessibilityRole="button"
          accessibilityLabel="Share this dua"
        >
          <Icon name="share" size={18} color={pal.muted} />
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  head: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 18, paddingBottom: 12, borderBottomWidth: StyleSheet.hairlineWidth },
  title: { fontFamily: fonts.uiBold, fontSize: 26, letterSpacing: -0.5 },
  x: { width: 36, height: 36, borderRadius: 18, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  content: { padding: 18, gap: 12 },
  lead: { fontFamily: fonts.read, fontSize: 16, lineHeight: 24 },
  box: { borderWidth: 1, borderRadius: 16, padding: 12, gap: 10 },
  input: { fontFamily: fonts.read, fontSize: 17, lineHeight: 24, minHeight: 72, textAlignVertical: 'top' },
  btn: { borderRadius: 12, minHeight: 48, alignItems: 'center', justifyContent: 'center' },
  btnText: { fontFamily: fonts.uiBold, fontSize: 16 },
  small: { fontFamily: fonts.ui, fontSize: 13, lineHeight: 18 },
  message: { fontFamily: fonts.readItalic, fontSize: 17, lineHeight: 26 },
  crisis: { borderWidth: 1.5, borderRadius: 14, padding: 14, gap: 8 },
  crisisTitle: { fontFamily: fonts.uiBold, fontSize: 16 },
  smallBtn: { borderRadius: 10, minHeight: 40, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 14, alignSelf: 'flex-start' },
  smallBtnText: { fontFamily: fonts.uiBold, fontSize: 14 },
  topic: { fontFamily: fonts.uiBold, fontSize: 18, letterSpacing: -0.2 },
  why: { fontFamily: fonts.ui, fontSize: 14, lineHeight: 20 },
  card: { borderWidth: 1, borderRadius: 16, padding: 16, gap: 10 },
  ar: { fontFamily: fonts.arabic, textAlign: 'right', writingDirection: 'rtl' },
  tl: { fontFamily: fonts.readItalic },
  en: { fontFamily: fonts.read },
  cardFoot: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  h3: { fontFamily: fonts.uiBold, fontSize: 11, letterSpacing: 1.2, marginTop: 14 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  chip: { borderWidth: 1, borderRadius: 999, paddingHorizontal: 13, paddingVertical: 8 },
  chipText: { fontFamily: fonts.uiSemi, fontSize: 13.5 },
});
