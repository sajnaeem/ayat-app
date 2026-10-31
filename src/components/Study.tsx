import { useEffect, useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import { LangId, loadTafsir, loadWords, Tafsir } from '@/lib/quran';
import { fonts, Palette } from '@/lib/theme';
import { Sheet } from './Sheet';

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
            {lang !== 'en' && lang !== 'ur' && lang !== 'bn' ? ' (in English)' : ''} · via Quran.com
          </Text>
        </>
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
});
