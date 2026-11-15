import { useLocalSearchParams, useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import { ActivityIndicator, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Icon } from '@/components/Icon';
import { Sheet } from '@/components/Sheet';
import { RECITERS, type ReciterId } from '@/lib/audio';
import { fold } from '@/lib/fold';
import { useLoop, type Passage } from '@/lib/loop';
import { isComplete, offlineSupported } from '@/lib/offline';
import { SURAHS } from '@/lib/quran';
import { usePrefs } from '@/lib/store';
import { fonts, mix, Palette, usePalette } from '@/lib/theme';

/**
 * Play on repeat (Saj, 15 Nov 2026): choose a surah or a passage and Munib recites it again and again, with the
 * phone locked too, until you stop it. Often-chosen passages first, then any surah (whole, or from one ayah to
 * another). The player itself is src/lib/loop.tsx. No claims are made here about the virtues of any passage.
 */
const whole = (s: number): Passage => ({ id: `s${s}`, title: `Surah ${SURAHS[s - 1][0]}`, sub: `${SURAHS[s - 1][3]} ayat`, parts: [[s, 1, SURAHS[s - 1][3]]] });
const OFTEN: Passage[] = [
  whole(2),
  { id: 'kursi', title: 'Ayat al-Kursi', sub: 'Al-Baqarah 2:255', parts: [[2, 255, 255]] },
  { id: 'baqarah-end', title: 'The last two ayat of al-Baqarah', sub: 'Al-Baqarah 2:285–286', parts: [[2, 285, 286]] },
  whole(36),
  whole(67),
  whole(18),
  whole(55),
  whole(1),
  { id: 'quls', title: 'Al-Ikhlas, al-Falaq and an-Nas', sub: 'Surahs 112, 113 and 114', parts: [[112, 1, 4], [113, 1, 5], [114, 1, 6]] },
];
const ROUNDS = [
  { n: 0, label: 'Until I stop' },
  { n: 3, label: '3 times' },
  { n: 7, label: '7 times' },
];

export default function Repeat() {
  const pal = usePalette();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const prefs = usePrefs();
  const loop = useLoop();
  const params = useLocalSearchParams<{ s?: string }>();
  const [q, setQ] = useState('');
  const [pick, setPick] = useState<Passage | null>(null);
  const reading = Number(params.s) >= 1 && Number(params.s) <= 114 ? whole(Number(params.s)) : null;

  const found = useMemo(() => {
    const f = fold(q.trim());
    const all = SURAHS.map((x, i) => ({ s: i + 1, name: x[0], meaning: x[2], n: x[3] }));
    if (!f) return all;
    return all.filter((x) => String(x.s) === f || fold(x.name).includes(f) || fold(x.meaning).includes(f));
  }, [q]);

  return (
    <View style={[styles.root, { backgroundColor: pal.bg }]}>
      <View style={[styles.head, { paddingTop: insets.top + 12, borderColor: pal.line }]}>
        <Text style={[styles.title, { color: pal.text }]}>Play on repeat</Text>
        <Pressable onPress={() => router.back()} style={[styles.x, { borderColor: pal.line }]} accessibilityRole="button" accessibilityLabel="Close" hitSlop={8}>
          <Icon name="close" size={18} color={pal.text} />
        </Pressable>
      </View>
      <ScrollView contentContainerStyle={{ padding: 16, gap: 12, paddingBottom: insets.bottom + 40 }} keyboardShouldPersistTaps="handled">
        <Text style={[styles.lead, { color: pal.muted }]}>
          Choose a surah or a passage and Munib recites it again and again, for a room, a journey or a quiet day. It keeps playing while you use Munib and when your phone is locked.
        </Text>

        {loop.passage && <Now pal={pal} />}

        {reading && (
          <View style={[styles.card, { backgroundColor: pal.surface }]}>
            <Row pal={pal} title={reading.title} sub={`The surah you’re reading · ${reading.sub}`} divider={false} onPress={() => setPick(reading)} />
          </View>
        )}

        <Text style={[styles.section, { color: pal.text }]}>Often chosen</Text>
        <View style={[styles.card, { backgroundColor: pal.surface }]}>
          {OFTEN.map((p, i) => (
            <Row key={p.id} pal={pal} title={p.title} sub={p.sub} divider={i > 0} onPress={() => setPick(p)} />
          ))}
        </View>

        <Text style={[styles.section, { color: pal.text }]}>Any surah</Text>
        <View style={[styles.search, { backgroundColor: pal.surface, borderColor: pal.line }]}>
          <Icon name="search" size={17} color={pal.muted} />
          <TextInput value={q} onChangeText={setQ} placeholder="Search by name or number" placeholderTextColor={pal.muted} style={[styles.input, { color: pal.text }]} autoCorrect={false} returnKeyType="search" accessibilityLabel="Search surahs" />
        </View>
        <View style={[styles.card, { backgroundColor: pal.surface }]}>
          {found.map((x, i) => (
            <Row key={x.s} pal={pal} title={`${x.s}. ${x.name}`} sub={`${x.meaning} · ${x.n} ayat`} divider={i > 0} onPress={() => setPick(whole(x.s))} />
          ))}
          {!found.length && <Text style={[styles.lead, { color: pal.muted, padding: 14 }]}>No surah matches that.</Text>}
        </View>
      </ScrollView>

      {pick && (
        <Setup
          key={pick.id}
          pal={pal}
          passage={pick}
          reciter={prefs.reciter}
          onClose={() => setPick(null)}
          onStart={(p, r, n) => {
            loop.start(p, r, n);
            setPick(null);
          }}
        />
      )}
    </View>
  );
}

/** What's playing now, with pause and stop. */
function Now({ pal }: { pal: Palette }) {
  const loop = useLoop();
  const p = loop.passage!;
  const where = loop.now ? `${SURAHS[loop.now[0] - 1][0]} ${loop.now[0]}:${loop.now[1]}` : '';
  const line = loop.error
    ? 'Couldn’t load the recitation. Check your connection and press play.'
    : loop.finished
      ? `Finished ${loop.rounds} times`
      : `${loop.on ? '' : 'Paused · '}${where}${loop.total > 1 ? ` · ayah ${loop.at + 1} of ${loop.total}` : ''} · round ${loop.round}${loop.rounds ? ` of ${loop.rounds}` : ''}`;
  return (
    <View style={[styles.now, { backgroundColor: pal.accent }]}>
      <View style={{ flex: 1, gap: 2 }}>
        <Text style={[styles.nowEyebrow, { color: pal.onAccent }]}>ON REPEAT</Text>
        <Text style={[styles.nowTitle, { color: pal.onAccent }]} numberOfLines={1}>{p.title}</Text>
        <Text style={[styles.nowSub, { color: pal.onAccent }]}>{line}</Text>
        <Text style={[styles.nowSub, { color: pal.onAccent, opacity: 0.8 }]}>{RECITERS.find((x) => x.id === loop.reciter)?.name}</Text>
      </View>
      <Pressable onPress={loop.toggle} hitSlop={8} style={[styles.nowBtn, { backgroundColor: pal.onAccent }]} accessibilityRole="button" accessibilityLabel={loop.on ? 'Pause' : 'Play'}>
        {loop.on && loop.loading ? <ActivityIndicator size="small" color={pal.accent} /> : <Icon name={loop.on ? 'pause' : 'play'} size={18} color={pal.accent} fill={!loop.on} strokeWidth={2.4} />}
      </Pressable>
      <Pressable onPress={loop.close} hitSlop={8} style={styles.nowX} accessibilityRole="button" accessibilityLabel="Stop and close">
        <Icon name="close" size={18} color={pal.onAccent} />
      </Pressable>
    </View>
  );
}

function Setup({ pal, passage, reciter, onClose, onStart }: { pal: Palette; passage: Passage; reciter: ReciterId; onClose: () => void; onStart: (p: Passage, r: ReciterId, rounds: number) => void }) {
  const router = useRouter();
  const single = passage.parts.length === 1 ? passage.parts[0] : null;
  const count = single ? SURAHS[single[0] - 1][3] : 0;
  const wholeSurah = !!single && single[1] === 1 && single[2] === count;
  const [part, setPart] = useState(false);
  const [from, setFrom] = useState('1');
  const [to, setTo] = useState(String(count));
  const [rec, setRec] = useState<ReciterId>(reciter);
  const [rounds, setRounds] = useState(0);

  const f = Math.min(count, Math.max(1, parseInt(from, 10) || 1));
  const t = Math.min(count, Math.max(f, parseInt(to, 10) || count));
  const go = () => {
    if (single && wholeSurah && part && !(f === 1 && t === count)) {
      const name = SURAHS[single[0] - 1][0];
      onStart({ id: `s${single[0]}:${f}-${t}`, title: `${name} ${single[0]}:${f}${t > f ? `–${t}` : ''}`, sub: `${t - f + 1} ayat`, parts: [[single[0], f, t]] }, rec, rounds);
    } else onStart(passage, rec, rounds);
  };
  // A long surah all day uses mobile data unless it has been downloaded.
  const suggestDownload = offlineSupported && Platform.OS !== 'web' && single && wholeSurah && count > 60 && !isComplete(rec, single[0]);

  return (
    <Sheet visible onClose={onClose} title={passage.title} pal={pal}>
      <View style={{ gap: 16 }}>
        {wholeSurah && count > 1 && (
          <View style={{ gap: 8 }}>
            <Text style={[styles.label, { color: pal.muted }]}>WHAT TO PLAY</Text>
            <View style={styles.chips}>
              <Chip pal={pal} on={!part} label="The whole surah" onPress={() => setPart(false)} />
              <Chip pal={pal} on={part} label="Part of it" onPress={() => setPart(true)} />
            </View>
            {part && (
              <View style={styles.range}>
                <Text style={[styles.rangeText, { color: pal.text }]}>From ayah</Text>
                <TextInput value={from} onChangeText={setFrom} keyboardType="number-pad" maxLength={3} style={[styles.num, { color: pal.text, borderColor: pal.line }]} accessibilityLabel="From ayah" selectTextOnFocus />
                <Text style={[styles.rangeText, { color: pal.text }]}>to</Text>
                <TextInput value={to} onChangeText={setTo} keyboardType="number-pad" maxLength={3} style={[styles.num, { color: pal.text, borderColor: pal.line }]} accessibilityLabel="To ayah" selectTextOnFocus />
                <Text style={[styles.rangeText, { color: pal.muted }]}>of {count}</Text>
              </View>
            )}
          </View>
        )}
        <View style={{ gap: 8 }}>
          <Text style={[styles.label, { color: pal.muted }]}>RECITER</Text>
          <View style={styles.chips}>
            {RECITERS.map((x) => (
              <Chip key={x.id} pal={pal} on={rec === x.id} label={x.name} onPress={() => setRec(x.id)} />
            ))}
          </View>
        </View>
        <View style={{ gap: 8 }}>
          <Text style={[styles.label, { color: pal.muted }]}>HOW MANY TIMES</Text>
          <View style={styles.chips}>
            {ROUNDS.map((x) => (
              <Chip key={x.n} pal={pal} on={rounds === x.n} label={x.label} onPress={() => setRounds(x.n)} />
            ))}
          </View>
        </View>
        {suggestDownload && (
          <Pressable onPress={() => { onClose(); router.push('/downloads'); }} style={[styles.tip, { backgroundColor: mix(pal.surface, pal.accent, 0.1) }]} accessibilityRole="button">
            <Icon name="download" size={17} color={pal.accent} />
            <Text style={[styles.tipText, { color: pal.text }]}>Playing a long surah for hours uses mobile data. Download it first in Offline and it plays from your phone.</Text>
            <Icon name="chevron" size={14} color={pal.accent} />
          </Pressable>
        )}
        <Pressable onPress={go} style={({ pressed }) => [styles.start, { backgroundColor: pal.bold ? pal.text : pal.accent, opacity: pressed ? 0.85 : 1 }]} accessibilityRole="button" accessibilityLabel="Start playing on repeat">
          <Icon name="repost" size={17} color={pal.bold ? pal.bg : pal.onAccent} strokeWidth={2.2} />
          <Text style={[styles.startText, { color: pal.bold ? pal.bg : pal.onAccent }]}>Play on repeat</Text>
        </Pressable>
      </View>
    </Sheet>
  );
}

function Chip({ pal, on, label, onPress }: { pal: Palette; on: boolean; label: string; onPress: () => void }) {
  return (
    <Pressable onPress={onPress} style={[styles.chip, { borderColor: on ? pal.accent : pal.line, backgroundColor: on ? pal.accent : 'transparent' }]} accessibilityRole="radio" accessibilityState={{ selected: on }}>
      <Text style={[styles.chipText, { color: on ? pal.onAccent : pal.text }]}>{label}</Text>
    </Pressable>
  );
}

function Row({ pal, title, sub, divider, onPress }: { pal: Palette; title: string; sub: string; divider: boolean; onPress: () => void }) {
  return (
    <Pressable onPress={onPress} style={({ pressed }) => [styles.row, divider && { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: pal.line }, pressed && { opacity: 0.6 }]} accessibilityRole="button" accessibilityLabel={`${title}, ${sub}`}>
      <View style={[styles.rowIcon, { backgroundColor: mix(pal.surface, pal.accent, pal.dark ? 0.22 : 0.12) }]}>
        <Icon name="repost" size={16} color={pal.accent} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={[styles.rowTitle, { color: pal.text }]}>{title}</Text>
        <Text style={[styles.rowSub, { color: pal.muted }]}>{sub}</Text>
      </View>
      <Icon name="chevron" size={15} color={pal.muted} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  head: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingBottom: 12, borderBottomWidth: StyleSheet.hairlineWidth },
  title: { fontFamily: fonts.read, fontSize: 24, letterSpacing: -0.3 },
  x: { width: 36, height: 36, borderRadius: 18, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  lead: { fontFamily: fonts.ui, fontSize: 14.5, lineHeight: 21, paddingHorizontal: 4 },
  section: { fontFamily: fonts.read, fontSize: 19, marginTop: 6, paddingHorizontal: 4 },
  card: { borderRadius: 18, overflow: 'hidden' },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 14, paddingVertical: 12 },
  rowIcon: { width: 34, height: 34, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  rowTitle: { fontFamily: fonts.uiSemi, fontSize: 15.5 },
  rowSub: { fontFamily: fonts.ui, fontSize: 13, marginTop: 1 },
  search: { flexDirection: 'row', alignItems: 'center', gap: 8, borderRadius: 14, borderWidth: 1, paddingHorizontal: 12, height: 46 },
  input: { flex: 1, fontFamily: fonts.ui, fontSize: 15.5, paddingVertical: 0 },
  now: { flexDirection: 'row', alignItems: 'center', gap: 10, borderRadius: 20, padding: 16 },
  nowEyebrow: { fontFamily: fonts.uiBold, fontSize: 11, letterSpacing: 1.3, opacity: 0.85 },
  nowTitle: { fontFamily: fonts.read, fontSize: 21 },
  nowSub: { fontFamily: fonts.ui, fontSize: 13.5, lineHeight: 19 },
  nowBtn: { width: 46, height: 46, borderRadius: 23, alignItems: 'center', justifyContent: 'center' },
  nowX: { width: 32, height: 46, alignItems: 'center', justifyContent: 'center' },
  label: { fontFamily: fonts.uiBold, fontSize: 11, letterSpacing: 1.2 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: { borderWidth: 1, borderRadius: 999, paddingHorizontal: 14, paddingVertical: 9 },
  chipText: { fontFamily: fonts.uiSemi, fontSize: 14 },
  range: { flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap' },
  rangeText: { fontFamily: fonts.ui, fontSize: 15 },
  num: { width: 62, height: 42, borderWidth: 1, borderRadius: 12, textAlign: 'center', fontFamily: fonts.uiSemi, fontSize: 16, paddingVertical: 0 },
  tip: { flexDirection: 'row', alignItems: 'center', gap: 10, borderRadius: 14, padding: 12 },
  tipText: { flex: 1, fontFamily: fonts.ui, fontSize: 13.5, lineHeight: 19 },
  start: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, height: 52, borderRadius: 26 },
  startText: { fontFamily: fonts.uiSemi, fontSize: 16 },
});
