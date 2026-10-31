import * as Sharing from 'expo-sharing';
import React, { useRef, useState } from 'react';
import { Platform, Pressable, Share, StyleSheet, Text, View } from 'react-native';
import { captureRef } from 'react-native-view-shot';
import { arabicNumber, LangId, liveVerse, translationFor, Verse } from '@/lib/quran';
import { fonts, mix, Palette, Tone } from '@/lib/theme';
import { Pattern } from './Pattern';
import { Sheet } from './Sheet';

/** Light tones only: shared images should look the same in every chat, whatever the sender's phone is set to. */
const TONES: Tone[] = [
  { bg: '#F1F3EF', accent: '#1F6E52' },
  { bg: '#F5EEEB', accent: '#A4462F' },
  { bg: '#EEF0F5', accent: '#2F4FA3' },
  { bg: '#E9F1F0', accent: '#1B6868' },
  { bg: '#F1EEF5', accent: '#6B4AA0' },
];
const INK = '#16201B';

const GREETINGS = ['None', 'Good morning', 'Jumuʿah Mubarak', 'Ramadan Mubarak', 'Eid Mubarak'] as const;
type Greeting = (typeof GREETINGS)[number];

const W = 300; // on-screen preview width; saved at 1080 × 1350 (4:5, right for WhatsApp, Instagram and Facebook)

/** The image itself: the ayah in Arabic, its translation and reference, in Munib's style. */
function Card({ v, lang, tone, greeting }: { v: Verse; lang: LangId; tone: Tone; greeting: Greeting }) {
  const ar = v.ar.map(([t, n]) => `${t} ۝${arabicNumber(n)}`).join(' ');
  const tr = (translationFor(v, lang) ?? []).join(' ');
  const long = ar.length + tr.length;
  const arSize = ar.length > 360 ? 15 : ar.length > 200 ? 18 : ar.length > 90 ? 21 : 25;
  const trSize = long > 900 ? 9.5 : long > 500 ? 11 : 12.5;
  const rtl = lang === 'ur';
  return (
    <View style={[styles.card, { backgroundColor: tone.bg }]}>
      <Pattern color={tone.accent} top={-30} />
      {greeting !== 'None' && <Text style={[styles.greet, { color: tone.accent }]}>{greeting}</Text>}
      <View style={styles.middle}>
        <Text style={[styles.ar, { color: INK, fontSize: arSize, lineHeight: arSize * 1.85 }]}>{ar}</Text>
        <View style={[styles.rule, { backgroundColor: mix(tone.bg, INK, 0.18) }]} />
        <Text style={[styles.tr, { color: mix(tone.bg, INK, 0.85), fontSize: trSize, lineHeight: trSize * 1.5, textAlign: rtl ? 'right' : 'left', writingDirection: rtl ? 'rtl' : 'ltr' }]}>
          {tr}
        </Text>
        <Text style={[styles.ref, { color: tone.accent }]}>
          {v.name} · {v.k.replace('-', '–')}
        </Text>
      </View>
      <View style={styles.foot}>
        <Text style={[styles.brand, { color: INK }]}>
          munib<Text style={{ color: tone.accent }}>.</Text>
        </Text>
        <Text style={[styles.tag, { color: mix(tone.bg, INK, 0.6) }]}>The Quran, a little every day</Text>
      </View>
    </View>
  );
}

/** Preview, pick a colour and greeting, then share as an image (or as text). */
export function ShareSheet({ verse, lang, pal, onClose }: { verse: Verse | null; lang: LangId; pal: Palette; onClose: () => void }) {
  const shot = useRef<React.ComponentRef<typeof View>>(null);
  const [toneIx, setToneIx] = useState(0);
  const [greeting, setGreeting] = useState<Greeting>('None');
  const [busy, setBusy] = useState(false);
  const v = verse ? liveVerse(verse, lang) : null;

  const asText = () => {
    if (!v) return;
    const tr = translationFor(v, lang) ?? [];
    Share.share({ message: `${v.ar.map(([t]) => t).join(' ')}\n\n${tr.join(' ')}\n— Quran ${v.k}\n\nShared from Munib` }).catch(() => {});
  };

  const asImage = async () => {
    if (!v || busy) return;
    if (Platform.OS === 'web' || !(await Sharing.isAvailableAsync())) return asText();
    setBusy(true);
    try {
      const uri = await captureRef(shot as never, { format: 'png', quality: 1, width: 1080, height: 1350 });
      await Sharing.shareAsync(uri, { mimeType: 'image/png', UTI: 'public.png', dialogTitle: `Quran ${v.k}` });
    } catch {
      asText();
    } finally {
      setBusy(false);
    }
  };

  return (
    <Sheet visible={!!v} onClose={onClose} title="Share this ayah" pal={pal}>
      {v && (
        <View style={{ alignItems: 'center', gap: 14 }}>
          <View ref={shot} collapsable={false} style={styles.shadow}>
            <Card v={v} lang={lang} tone={TONES[toneIx]} greeting={greeting} />
          </View>
          <View style={styles.row}>
            {TONES.map((t, i) => (
              <Pressable
                key={t.bg}
                onPress={() => setToneIx(i)}
                accessibilityRole="button"
                accessibilityLabel={`Colour ${i + 1}`}
                accessibilityState={{ selected: i === toneIx }}
                style={[styles.swatch, { backgroundColor: t.bg, borderColor: i === toneIx ? t.accent : pal.line, borderWidth: i === toneIx ? 2.5 : 1 }]}
              >
                <View style={[styles.dot, { backgroundColor: t.accent }]} />
              </Pressable>
            ))}
          </View>
          <View style={[styles.row, { flexWrap: 'wrap', justifyContent: 'center' }]}>
            {GREETINGS.map((g) => (
              <Pressable
                key={g}
                onPress={() => setGreeting(g)}
                accessibilityRole="button"
                accessibilityState={{ selected: g === greeting }}
                style={[styles.chip, { borderColor: g === greeting ? pal.accent : pal.line, backgroundColor: g === greeting ? mix(pal.surface, pal.accent, 0.1) : pal.surface }]}
              >
                <Text style={[styles.chipText, { color: pal.text }]}>{g === 'None' ? 'No greeting' : g}</Text>
              </Pressable>
            ))}
          </View>
          <Pressable onPress={asImage} disabled={busy} style={[styles.primary, { backgroundColor: pal.text, opacity: busy ? 0.5 : 1 }]} accessibilityRole="button">
            <Text style={[styles.primaryText, { color: pal.bg }]}>{busy ? 'Preparing…' : 'Share image'}</Text>
          </Pressable>
          <Pressable onPress={asText} hitSlop={8} accessibilityRole="button">
            <Text style={[styles.link, { color: pal.muted }]}>Share as text instead</Text>
          </Pressable>
        </View>
      )}
    </Sheet>
  );
}

const styles = StyleSheet.create({
  shadow: { borderRadius: 14, overflow: 'hidden' },
  card: { width: W, height: W * 1.25, paddingHorizontal: 22, paddingTop: 20, paddingBottom: 16, overflow: 'hidden' },
  greet: { fontFamily: fonts.uiBold, fontSize: 13, letterSpacing: 0.4, textAlign: 'center' },
  middle: { flex: 1, justifyContent: 'center', gap: 10 },
  ar: { fontFamily: fonts.arabic, textAlign: 'right', writingDirection: 'rtl' },
  rule: { height: 1.5, width: 54, alignSelf: 'flex-end' },
  tr: { fontFamily: fonts.read },
  ref: { fontFamily: fonts.uiSemi, fontSize: 10.5, letterSpacing: 0.2 },
  foot: { flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between' },
  brand: { fontFamily: fonts.uiBold, fontSize: 17, letterSpacing: -0.4 },
  tag: { fontFamily: fonts.ui, fontSize: 9.5 },
  row: { flexDirection: 'row', gap: 10 },
  swatch: { width: 34, height: 34, borderRadius: 17, alignItems: 'center', justifyContent: 'center' },
  dot: { width: 10, height: 10, borderRadius: 5 },
  chip: { borderWidth: 1, borderRadius: 999, paddingHorizontal: 12, paddingVertical: 7 },
  chipText: { fontFamily: fonts.uiSemi, fontSize: 13 },
  primary: { alignSelf: 'stretch', minHeight: 50, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  primaryText: { fontFamily: fonts.uiBold, fontSize: 16 },
  link: { fontFamily: fonts.ui, fontSize: 14, textDecorationLine: 'underline' },
});
