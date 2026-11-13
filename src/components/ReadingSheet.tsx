import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Sheet } from './Sheet';
import { Prefs, SPEEDS, TEXT_SIZES, usePrefs } from '@/lib/store';
import { feedSummary } from '@/lib/feedTopics';
import { fonts, mix, Palette } from '@/lib/theme';

export const AUTO_PACES: { id: Prefs['autoScroll']; label: string }[] = [
  { id: 'off', label: 'Off' },
  { id: 'slow', label: 'Slow' },
  { id: 'medium', label: 'Medium' },
  { id: 'fast', label: 'Fast' },
];

/** The "Aa" button on the feed: how the Quran looks and moves, all in one place. */
export function ReadingSheet({ visible, onClose, pal, onTopics }: { visible: boolean; onClose: () => void; pal: Palette; onTopics?: () => void }) {
  const prefs = usePrefs();
  return (
    <Sheet visible={visible} onClose={onClose} title="Reading" pal={pal}>
      <View style={{ gap: 18 }}>
        <Seg pal={pal} label="Transliteration" items={[{ id: false, label: 'Off' }, { id: true, label: 'On' }]} value={prefs.showTl} onPick={(v) => prefs.set({ showTl: v })} />
        <Seg pal={pal} label="Text size" items={TEXT_SIZES.map((t) => ({ id: t.id, label: t.id === 'xl' ? 'XL' : t.label }))} value={prefs.textSize ?? 'medium'} onPick={(v) => prefs.set({ textSize: v })} />
        <Seg pal={pal} label="Recitation speed" items={SPEEDS.map((x) => ({ id: x, label: x === 1 ? 'Normal' : `${x}×` }))} value={prefs.speed ?? 1} onPick={(v) => prefs.set({ speed: v })} />
        <View style={{ gap: 6 }}>
          <Seg pal={pal} label="Auto scroll (Quran tab)" items={AUTO_PACES} value={prefs.autoScroll ?? 'off'} onPick={(v) => prefs.set({ autoScroll: v })} />
          <Text style={[styles.note, { color: pal.muted }]}>
            While the recitation plays, the next card comes when the reciter finishes. With the sound paused, cards move on at your reading pace. Tap the Auto button on the Quran tab to pause it.
          </Text>
        </View>
        {!!onTopics && (
          <Pressable onPress={onTopics} accessibilityRole="button" style={[styles.topics, { backgroundColor: mix(pal.bg, pal.text, 0.06) }]}>
            <View style={{ flex: 1, gap: 2 }}>
              <Text style={[styles.label, { color: pal.text }]}>Your For you page</Text>
              <Text style={[styles.note, { color: pal.muted }]}>{feedSummary(prefs.feedHide)} · choose what shows between the ayat</Text>
            </View>
            <Text style={[styles.label, { color: pal.muted }]}>›</Text>
          </Pressable>
        )}
      </View>
    </Sheet>
  );
}

function Seg<T extends string | number | boolean>({ pal, label, items, value, onPick }: { pal: Palette; label: string; items: { id: T; label: string }[]; value: T; onPick: (v: T) => void }) {
  return (
    <View style={{ gap: 8 }}>
      <Text style={[styles.label, { color: pal.text }]}>{label}</Text>
      <View style={[styles.seg, { backgroundColor: mix(pal.bg, pal.text, 0.06) }]} accessibilityRole="radiogroup" accessibilityLabel={label}>
        {items.map((it) => {
          const on = it.id === value;
          return (
            <Pressable
              key={String(it.id)}
              onPress={() => onPick(it.id)}
              style={[styles.btn, on && { backgroundColor: pal.surface, shadowOpacity: 0.08 }]}
              accessibilityRole="radio"
              accessibilityState={{ checked: on }}
              accessibilityLabel={`${label}: ${it.label}`}
            >
              <Text style={[styles.btnText, { color: on ? pal.text : pal.muted }]}>{it.label}</Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  topics: { flexDirection: 'row', alignItems: 'center', gap: 10, padding: 14, borderRadius: 14 },
  label: { fontFamily: fonts.uiSemi, fontSize: 15 },
  note: { fontFamily: fonts.ui, fontSize: 12.5, lineHeight: 17 },
  seg: { flexDirection: 'row', borderRadius: 12, padding: 3 },
  btn: { flex: 1, alignItems: 'center', justifyContent: 'center', minHeight: 38, borderRadius: 9, shadowColor: '#000', shadowOpacity: 0, shadowRadius: 3, shadowOffset: { width: 0, height: 1 } },
  btnText: { fontFamily: fonts.uiSemi, fontSize: 13.5 },
});
