import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Choice } from './List';
import { Sheet } from './Sheet';
import { FEED_TOPICS } from '@/lib/feedTopics';
import { usePrefs } from '@/lib/store';
import { fonts, mix, Palette } from '@/lib/theme';

/** Choose what For you shows between the ayat. Saved on the phone; the ayat are always there. */
export function FeedTopicsSheet({ visible, onClose, pal }: { visible: boolean; onClose: () => void; pal: Palette }) {
  const prefs = usePrefs();
  const hide = prefs.feedHide ?? [];
  const toggle = (id: string) => prefs.set({ feedHide: hide.includes(id) ? hide.filter((x) => x !== id) : [...hide, id] });
  const all = hide.length === 0;
  const none = FEED_TOPICS.every((t) => hide.includes(t.id));
  return (
    <Sheet visible={visible} onClose={onClose} title="Your For you page" pal={pal}>
      <Text style={[styles.lead, { color: pal.muted }]}>The ayat are always there. Choose what else you’d like to see between them.</Text>
      <View style={styles.quick}>
        <Quick pal={pal} on={all} label="Everything" onPress={() => prefs.set({ feedHide: [] })} />
        <Quick pal={pal} on={none} label="Just the Quran" onPress={() => prefs.set({ feedHide: FEED_TOPICS.map((t) => t.id) })} />
      </View>
      <View style={{ gap: 8 }}>
        {FEED_TOPICS.map((t) => (
          <Choice key={t.id} pal={pal} box on={!hide.includes(t.id)} title={t.title} sub={t.sub} onPress={() => toggle(t.id)} />
        ))}
      </View>
      <Text style={[styles.note, { color: pal.muted }]}>Saved on your phone. Changes show from the next few cards.</Text>
    </Sheet>
  );
}

function Quick({ pal, on, label, onPress }: { pal: Palette; on: boolean; label: string; onPress: () => void }) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityState={{ selected: on }}
      style={[styles.chip, { backgroundColor: on ? pal.accent : mix(pal.bg, pal.text, 0.06) }]}
    >
      <Text style={[styles.chipText, { color: on ? pal.onAccent : pal.text }]}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  lead: { fontFamily: fonts.read, fontSize: 15, lineHeight: 21, marginBottom: 12 },
  quick: { flexDirection: 'row', gap: 8, marginBottom: 14 },
  chip: { paddingHorizontal: 14, paddingVertical: 9, borderRadius: 999 },
  chipText: { fontFamily: fonts.uiSemi, fontSize: 14 },
  note: { fontFamily: fonts.ui, fontSize: 12.5, marginTop: 14, lineHeight: 17 },
});
