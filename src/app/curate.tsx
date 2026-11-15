import { useRouter } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Icon } from '@/components/Icon';
import { useToast } from '@/components/Toast';
import { pendingPicks, pickCounts, placeName, reviewPick, suggestMore, type Pick, type PickCounts } from '@/lib/picks';
import { MOODS, SURAHS, type MoodId } from '@/lib/quran';
import { fonts, mix, usePalette, type Palette } from '@/lib/theme';

/**
 * For reviewers only (the database refuses anyone else): choose more ayat for For you (Saj, 15 Nov 2026).
 * "Suggest more ayat" has Claude read the next stretch of the Quran and suggest ayat that stand on their own; each
 * suggestion waits here until a reviewer adds it (optionally changing its moods and note) or leaves it out.
 * The Quran text shown is from quran-json (never written by the AI); the note and moods are suggestions to check.
 */
export default function Curate() {
  const pal = usePalette();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const toast = useToast();
  const [picks, setPicks] = useState<Pick[] | null>(null);
  const [counts, setCounts] = useState<PickCounts | null>(null);
  const [busy, setBusy] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const [p, c] = await Promise.all([pendingPicks(), pickCounts()]);
      setPicks(p);
      setCounts(c);
    } catch {
      setPicks([]);
    }
  }, []);
  useEffect(() => {
    load();
  }, [load]);

  /** Reads up to three stretches of ~50 ayat, stopping early once a few suggestions have come in. */
  const suggest = async () => {
    let added = 0;
    for (let i = 0; i < 3 && added < 4; i++) {
      setBusy(counts?.at ? `Reading from ${placeName(counts.at)}…` : 'Reading…');
      const r = await suggestMore();
      if (r.error) {
        setBusy(null);
        toast(r.error === 'off' ? 'Claude isn’t switched on yet (the ANTHROPIC_API_KEY secret)' : `Couldn’t suggest: ${r.error}`);
        return;
      }
      added += r.added;
      if (r.at) setCounts((c) => (c ? { ...c, at: r.at!, pending: c.pending + r.added } : c));
      if (r.done) break;
    }
    setBusy(null);
    toast(added ? `${added} new ${added === 1 ? 'suggestion' : 'suggestions'} to check` : 'Nothing that stands alone in that stretch. Tap again to read on');
    load();
  };

  const decide = async (p: Pick, approve: boolean, moods: MoodId[], note: string) => {
    try {
      await reviewPick(p.id, approve, moods, note);
      setPicks((l) => {
        const rest = l?.filter((x) => x.id !== p.id) ?? [];
        if (rest.length < 5) load();
        return rest;
      });
      setCounts((c) => (c ? { ...c, pending: c.pending - 1, approved: c.approved + (approve ? 1 : 0), rejected: c.rejected + (approve ? 0 : 1) } : c));
    } catch {
      toast('Couldn’t save that. Check your connection');
    }
  };

  return (
    <View style={[styles.root, { backgroundColor: pal.bg }]}>
      <View style={[styles.head, { paddingTop: insets.top + 12, borderColor: pal.line }]}>
        <Text style={[styles.title, { color: pal.text }]}>Choose ayat</Text>
        <Pressable onPress={() => router.back()} style={[styles.x, { borderColor: pal.line }]} accessibilityRole="button" accessibilityLabel="Close">
          <Icon name="close" size={18} color={pal.text} />
        </Pressable>
      </View>
      <ScrollView contentContainerStyle={[styles.body, { paddingBottom: insets.bottom + 40 }]} keyboardShouldPersistTaps="handled">
        <Text style={[styles.lead, { color: pal.muted }]}>
          Claude reads the Quran in order and suggests ayat that stand well on their own. Check each one: the ayat you add go into everyone’s For you, with the moods and note you leave.
        </Text>
        {counts && (
          <View style={[styles.stats, { backgroundColor: pal.surface }]}>
            <Stat pal={pal} n={counts.approved} label="in For you" />
            <Stat pal={pal} n={counts.pending} label="to check" />
            <Stat pal={pal} n={counts.rejected} label="left out" />
          </View>
        )}
        <Pressable onPress={suggest} disabled={!!busy} style={[styles.suggest, { backgroundColor: pal.text, opacity: busy ? 0.7 : 1 }]} accessibilityRole="button">
          {busy ? <ActivityIndicator color={pal.bg} /> : <Icon name="search" size={16} color={pal.bg} />}
          <Text style={[styles.suggestText, { color: pal.bg }]}>{busy ?? 'Suggest more ayat'}</Text>
        </Pressable>
        {counts?.at && <Text style={[styles.small, { color: pal.muted, textAlign: 'center' }]}>Next reading starts at {placeName(counts.at)}</Text>}

        {!picks && <ActivityIndicator color={pal.accent} style={{ marginTop: 30 }} />}
        {picks?.length === 0 && !busy && <Text style={[styles.small, { color: pal.muted, textAlign: 'center', marginTop: 24 }]}>Nothing waiting. Tap Suggest more ayat.</Text>}
        {picks?.map((p) => <PickCard key={p.id} p={p} pal={pal} onDecide={decide} />)}
      </ScrollView>
    </View>
  );
}

function Stat({ pal, n, label }: { pal: Palette; n: number; label: string }) {
  return (
    <View style={{ flex: 1, alignItems: 'center' }}>
      <Text style={[styles.statN, { color: pal.text }]}>{n}</Text>
      <Text style={[styles.small, { color: pal.muted }]}>{label}</Text>
    </View>
  );
}

function PickCard({ p, pal, onDecide }: { p: Pick; pal: Palette; onDecide: (p: Pick, approve: boolean, moods: MoodId[], note: string) => void }) {
  const [moods, setMoods] = useState<MoodId[]>(p.moods);
  const [note, setNote] = useState(p.note);
  const [all, setAll] = useState(false);
  const ref = p.b > p.a ? `${p.s}:${p.a}–${p.b}` : `${p.s}:${p.a}`;
  const toggle = (m: MoodId) => setMoods((l) => (l.includes(m) ? l.filter((x) => x !== m) : l.length >= 3 ? l : [...l, m]));
  const shown = all ? MOODS : MOODS.filter((m) => moods.includes(m.id));
  return (
    <View style={[styles.card, { backgroundColor: pal.surface, borderColor: pal.line }]}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
        <View style={[styles.chip, { backgroundColor: pal.accent }]}>
          <Text style={[styles.chipText, { color: pal.onAccent }]}>{ref}</Text>
        </View>
        <Text style={[styles.small, { color: pal.muted, flex: 1 }]} numberOfLines={1}>
          {SURAHS[p.s - 1][0]} · {SURAHS[p.s - 1][2]}
        </Text>
      </View>
      <Text style={[styles.ar, { color: pal.text }]}>{p.ar.map(([t]) => t).join(' ۝ ')}</Text>
      <Text style={[styles.en, { color: pal.text }]}>{p.en.join(' ')}</Text>
      <Text style={[styles.why, { color: pal.muted }]}>Why Claude chose it: {p.why}</Text>

      <Text style={[styles.label, { color: pal.muted }]}>CONTEXT NOTE (readers see this under Context)</Text>
      <TextInput value={note} onChangeText={setNote} multiline maxLength={160} style={[styles.input, { color: pal.text, borderColor: pal.line, backgroundColor: mix(pal.surface, pal.bg, 0.5) }]} placeholder="Optional" placeholderTextColor={pal.muted} />

      <Text style={[styles.label, { color: pal.muted }]}>MOODS (up to 3)</Text>
      <View style={styles.moods}>
        {shown.map((m) => {
          const on = moods.includes(m.id);
          return (
            <Pressable key={m.id} onPress={() => toggle(m.id)} style={[styles.mood, { borderColor: on ? pal.accent : pal.line, backgroundColor: on ? mix(pal.surface, pal.accent, 0.12) : 'transparent' }]} accessibilityRole="button" accessibilityState={{ selected: on }}>
              <Text style={[styles.moodText, { color: on ? pal.accent : pal.text }]}>{m.label}</Text>
            </Pressable>
          );
        })}
        <Pressable onPress={() => setAll((x) => !x)} style={[styles.mood, { borderColor: pal.line, borderStyle: 'dashed' }]} accessibilityRole="button">
          <Text style={[styles.moodText, { color: pal.muted }]}>{all ? 'Fewer' : moods.length ? 'Change' : 'Add a mood'}</Text>
        </Pressable>
      </View>

      <View style={{ flexDirection: 'row', gap: 8, marginTop: 4 }}>
        <Pressable onPress={() => onDecide(p, false, moods, note)} style={[styles.btn, { borderColor: pal.line, borderWidth: 1 }]} accessibilityRole="button">
          <Text style={[styles.btnText, { color: pal.text }]}>Leave out</Text>
        </Pressable>
        <Pressable onPress={() => onDecide(p, true, moods, note)} style={[styles.btn, { backgroundColor: pal.accent }]} accessibilityRole="button">
          <Text style={[styles.btnText, { color: pal.onAccent }]}>Add to For you</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  head: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 18, paddingBottom: 12, borderBottomWidth: StyleSheet.hairlineWidth },
  title: { fontFamily: fonts.read, fontSize: 26, letterSpacing: -0.5 },
  x: { width: 36, height: 36, borderRadius: 18, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  body: { padding: 18, gap: 14 },
  lead: { fontFamily: fonts.ui, fontSize: 14, lineHeight: 20 },
  stats: { flexDirection: 'row', borderRadius: 16, paddingVertical: 14 },
  statN: { fontFamily: fonts.read, fontSize: 26 },
  suggest: { flexDirection: 'row', gap: 10, alignItems: 'center', justifyContent: 'center', borderRadius: 14, minHeight: 50, paddingHorizontal: 16 },
  suggestText: { fontFamily: fonts.uiBold, fontSize: 15 },
  card: { borderWidth: 1, borderRadius: 16, padding: 14, gap: 10 },
  chip: { borderRadius: 7, paddingHorizontal: 8, paddingVertical: 3 },
  chipText: { fontFamily: fonts.uiBold, fontSize: 13 },
  ar: { fontFamily: fonts.arabic, fontSize: 24, lineHeight: 46, textAlign: 'right', writingDirection: 'rtl' },
  en: { fontFamily: fonts.read, fontSize: 16, lineHeight: 24 },
  why: { fontFamily: fonts.readItalic, fontSize: 13.5, lineHeight: 19 },
  label: { fontFamily: fonts.uiBold, fontSize: 11, letterSpacing: 1, marginTop: 4 },
  input: { borderWidth: 1, borderRadius: 10, padding: 10, fontFamily: fonts.ui, fontSize: 14, lineHeight: 20, minHeight: 60, textAlignVertical: 'top' },
  moods: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  mood: { borderWidth: 1, borderRadius: 999, paddingHorizontal: 10, paddingVertical: 6 },
  moodText: { fontFamily: fonts.uiSemi, fontSize: 12.5 },
  small: { fontFamily: fonts.ui, fontSize: 13, lineHeight: 18 },
  btn: { flex: 1, borderRadius: 10, paddingVertical: 12, alignItems: 'center' },
  btnText: { fontFamily: fonts.uiBold, fontSize: 15 },
});
