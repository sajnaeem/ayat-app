import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Icon } from './Icon';
import { Sheet } from './Sheet';
import { explainer } from '@/data/explainers';
import { usePrefs } from '@/lib/store';
import { fonts, mix, Palette } from '@/lib/theme';

/** The full explanation: what it is, why Muslims do it, how to start, with sources and related words. */
export function ExplainSheet({ id, onClose, onOpen, pal }: { id: string | null; onClose: () => void; onOpen: (id: string) => void; pal: Palette }) {
  const e = id ? explainer(id) : undefined;
  return (
    <Sheet visible={!!e} onClose={onClose} title={e?.ask ?? ''} pal={pal}>
      {e && (
        <View style={{ gap: 16 }}>
          <View style={styles.wordRow}>
            <Text style={[styles.word, { color: pal.accent }]}>{e.word}</Text>
            {!!e.ar && <Text style={[styles.ar, { color: pal.accent }]}>{e.ar}</Text>}
          </View>
          <Part pal={pal} label="What it is" text={e.what} />
          {!!e.why && <Part pal={pal} label="Why Muslims do it" text={e.why} />}
          {!!e.how && <Part pal={pal} label="How to start" text={e.how} />}
          {e.sources.length > 0 && <Text style={[styles.src, { color: pal.muted }]}>{e.sources.join(' · ')}</Text>}
          {!!e.related?.length && (
            <View style={{ gap: 8 }}>
              <Text style={[styles.label, { color: pal.text }]}>Related</Text>
              <View style={styles.chips}>
                {e.related.map((r) => {
                  const x = explainer(r);
                  return x ? (
                    <Pressable key={r} onPress={() => onOpen(r)} style={[styles.chip, { backgroundColor: mix(pal.bg, pal.accent, 0.1) }]} accessibilityRole="button">
                      <Text style={[styles.chipText, { color: pal.accent }]}>{x.word}</Text>
                    </Pressable>
                  ) : null;
                })}
              </View>
            </View>
          )}
          <Text style={[styles.note, { color: pal.muted }]}>Written in plain English for anyone new. For questions about how to practise, ask a teacher or your local imam.</Text>
        </View>
      )}
    </Sheet>
  );
}

function Part({ pal, label, text }: { pal: Palette; label: string; text: string }) {
  return (
    <View style={{ gap: 6 }}>
      <Text style={[styles.label, { color: pal.text }]}>{label}</Text>
      <Text style={[styles.body, { color: pal.text }]}>{text}</Text>
    </View>
  );
}

/** For screens with several things to explain: `const [explain, sheet] = useExplain(pal)`; call explain('qibla'); render {sheet}. */
export function useExplain(pal: Palette) {
  const [id, setId] = useState<string | null>(null);
  const sheet = <ExplainSheet id={id} onClose={() => setId(null)} onOpen={(x) => { setId(null); setTimeout(() => setId(x), 350); }} pal={pal} />;
  return [setId, sheet] as const;
}

/**
 * At the top of a feature: a "New to this?" card the first time, then just a small "What is …?" link once dismissed.
 */
export function ExplainIntro({ id, pal, style, compact }: { id: string; pal: Palette; style?: object; compact?: boolean }) {
  const prefs = usePrefs();
  const [open, sheet] = useExplain(pal);
  const e = explainer(id);
  if (!e) return null;
  const seen = compact || (prefs.explained ?? []).includes(id);
  if (seen) {
    return (
      <View style={style}>
        <Pressable onPress={() => open(id)} style={styles.link} accessibilityRole="button" hitSlop={8}>
          <Icon name="info" size={15} color={pal.accent} />
          <Text style={[styles.linkText, { color: pal.accent }]}>{e.ask}</Text>
        </Pressable>
        {sheet}
      </View>
    );
  }
  return (
    <View style={[styles.card, { backgroundColor: mix(pal.surface, pal.accent, pal.dark ? 0.16 : 0.08), borderColor: mix(pal.surface, pal.accent, 0.3) }, style]}>
      <Text style={[styles.eyebrow, { color: pal.accent }]}>NEW TO THIS?</Text>
      <Text style={[styles.cardTitle, { color: pal.text }]}>{e.ask}</Text>
      <Text style={[styles.body, { color: pal.text }]}>{e.short}</Text>
      <View style={styles.actions}>
        <Pressable onPress={() => open(id)} style={[styles.btn, { backgroundColor: pal.accent }]} accessibilityRole="button">
          <Text style={[styles.btnText, { color: pal.onAccent }]}>Learn more</Text>
        </Pressable>
        <Pressable onPress={() => prefs.set({ explained: [...(prefs.explained ?? []), id] })} style={styles.btnGhost} accessibilityRole="button">
          <Text style={[styles.btnText, { color: pal.muted }]}>I know this</Text>
        </Pressable>
      </View>
      {sheet}
    </View>
  );
}

const styles = StyleSheet.create({
  wordRow: { flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between', gap: 10 },
  word: { fontFamily: fonts.uiBold, fontSize: 22, letterSpacing: -0.3 },
  ar: { fontFamily: fonts.arabic, fontSize: 26, lineHeight: 44 },
  label: { fontFamily: fonts.uiBold, fontSize: 14 },
  body: { fontFamily: fonts.read, fontSize: 15.5, lineHeight: 23 },
  src: { fontFamily: fonts.ui, fontSize: 12.5, lineHeight: 18 },
  note: { fontFamily: fonts.ui, fontSize: 12.5, lineHeight: 18 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: { paddingHorizontal: 12, paddingVertical: 7, borderRadius: 999 },
  chipText: { fontFamily: fonts.uiSemi, fontSize: 13.5 },
  card: { borderRadius: 16, padding: 16, gap: 6, borderWidth: StyleSheet.hairlineWidth },
  eyebrow: { fontFamily: fonts.uiBold, fontSize: 11, letterSpacing: 1.2 },
  cardTitle: { fontFamily: fonts.uiBold, fontSize: 17 },
  actions: { flexDirection: 'row', gap: 8, marginTop: 6 },
  btn: { paddingHorizontal: 16, paddingVertical: 9, borderRadius: 999 },
  btnGhost: { paddingHorizontal: 12, paddingVertical: 9 },
  btnText: { fontFamily: fonts.uiSemi, fontSize: 14 },
  link: { flexDirection: 'row', alignItems: 'center', gap: 6, alignSelf: 'flex-start', paddingVertical: 4 },
  linkText: { fontFamily: fonts.uiSemi, fontSize: 14 },
});
