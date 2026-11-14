import { useRouter } from 'expo-router';
import { usePlus } from '@/lib/plus';
import { useEffect, useMemo, useState } from 'react';
import { Alert, FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Icon } from '@/components/Icon';
import { RECITERS, ReciterId } from '@/lib/audio';
import { bytesOf, cancelAll, downloaded, enqueue, formatBytes, offlineSupported, onQueue, QueueState, removeAll, removeSurah, usage } from '@/lib/offline';
import { SURAHS } from '@/lib/quran';
import { usePrefs } from '@/lib/store';
import { fonts, mix, Palette, usePalette } from '@/lib/theme';

const JUZ_AMMA = Array.from({ length: 37 }, (_, i) => 78 + i);
const FAVOURITES = [1, 18, 36, 55, 56, 67];

/** Listen offline: download recitations surah by surah, for each reciter. */
export default function Downloads() {
  const pal = usePalette();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const plus = usePlus();
  // Listen offline is part of Munib Plus; files already downloaded keep working.
  const gate = (go: () => void) => (plus.unlocked ? go() : router.push('/plus'));
  const prefs = usePrefs();
  const [r, setR] = useState<ReciterId>(prefs.reciter);
  const [q, setQ] = useState<QueueState>({ current: null, waiting: [], error: null });
  const [, bump] = useState(0);

  useEffect(() => onQueue((s) => {
    setQ(s);
    bump((n) => n + 1);
  }), []);

  const use = usage();
  const total = Object.values(use).reduce((n, x) => n + (x?.bytes ?? 0), 0);
  const mine = use[r];
  const reciter = RECITERS.find((x) => x.id === r)!;
  const missing = (list: number[]) => list.filter((s) => !downloaded(r, s)?.complete);

  const header = useMemo(
    () => (
      <View style={{ gap: 14, paddingBottom: 8 }}>
        <Text style={[styles.lead, { color: pal.muted }]}>
          Download recitations to listen with no signal: on the Underground, on a plane, or to save data. Ayat you’ve downloaded play from your phone, in the feed and in page view.
        </Text>
        {!plus.unlocked && (
          <Pressable onPress={() => router.push('/plus')} accessibilityRole="button" style={{ backgroundColor: pal.pop.sky, borderRadius: 16, padding: 14, gap: 3 }}>
            <Text style={{ fontFamily: fonts.uiBold, fontSize: 15.5, color: '#FFFFFF' }}>Listen offline is part of Munib Plus</Text>
            <Text style={{ fontFamily: fonts.ui, fontSize: 13.5, color: 'rgba(255,255,255,0.88)' }}>Every recitation still plays online for free. Tap to see Plus.</Text>
          </Pressable>
        )}
        <View style={styles.chips}>
          {RECITERS.map((x) => {
            const on = x.id === r;
            return (
              <Pressable key={x.id} onPress={() => setR(x.id)} style={[styles.chip, { borderColor: on ? pal.accent : pal.line, backgroundColor: on ? mix(pal.surface, pal.accent, 0.12) : pal.surface }]} accessibilityRole="button" accessibilityState={{ selected: on }}>
                <Text style={[styles.chipText, { color: pal.text }]}>{x.name.split(' ').slice(-1)[0]}</Text>
              </Pressable>
            );
          })}
        </View>
        <Text style={[styles.small, { color: pal.muted }]}>
          {reciter.name}: {mine?.surahs ? `${mine.surahs} ${mine.surahs === 1 ? 'surah' : 'surahs'} downloaded, ${formatBytes(mine.bytes)}` : 'nothing downloaded yet'}
          {total && mine?.bytes !== total ? ` · ${formatBytes(total)} for all reciters` : ''}
        </Text>

        {q.current && (
          <View style={[styles.card, { backgroundColor: pal.surface, borderColor: pal.accent }]}>
            <Text style={[styles.cardTitle, { color: pal.text }]}>
              Downloading {SURAHS[q.current.s - 1][0]}
            </Text>
            <View style={[styles.track, { backgroundColor: mix(pal.surface, pal.text, 0.08) }]}>
              <View style={{ width: `${Math.round((q.current.done / q.current.total) * 100)}%`, height: '100%', backgroundColor: pal.accent }} />
            </View>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
              <Text style={[styles.small, { color: pal.muted }]}>
                {q.current.done} of {q.current.total} ayat{q.waiting.length ? ` · ${q.waiting.length} more surahs waiting` : ''}
              </Text>
              <Pressable onPress={cancelAll} hitSlop={8}>
                <Text style={[styles.small, { color: pal.text, textDecorationLine: 'underline' }]}>Stop</Text>
              </Pressable>
            </View>
            <Text style={[styles.small, { color: pal.muted }]}>Keep Munib open while it downloads.</Text>
          </View>
        )}
        {!!q.error && <Text style={[styles.small, { color: '#B4432F' }]}>{q.error}</Text>}

        <View style={{ flexDirection: 'row', gap: 8 }}>
          <Bundle pal={pal} title="Juz' ʿAmma" sub="Surahs 78 to 114" left={missing(JUZ_AMMA).length} onPress={() => gate(() => enqueue(r, missing(JUZ_AMMA)))} />
          <Bundle pal={pal} title="Favourites" sub="Fatihah, Kahf, Yasin, Rahman, Waqiʿah, Mulk" left={missing(FAVOURITES).length} onPress={() => gate(() => enqueue(r, missing(FAVOURITES)))} />
        </View>
        <Text style={[styles.h3, { color: pal.muted }]}>ALL 114 SURAHS</Text>
      </View>
    ),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [pal, r, q, total, mine?.bytes, mine?.surahs, plus.unlocked],
  );

  if (!offlineSupported) {
    return (
      <View style={[styles.root, { backgroundColor: pal.bg, padding: 24, paddingTop: insets.top + 40, gap: 12 }]}>
        <Text style={[styles.title, { color: pal.text }]}>Listen offline</Text>
        <Text style={[styles.lead, { color: pal.muted }]}>Downloads work in the Munib app on your phone.</Text>
      </View>
    );
  }

  return (
    <View style={[styles.root, { backgroundColor: pal.bg }]}>
      <View style={[styles.head, { paddingTop: insets.top + 12, borderColor: pal.line }]}>
        <Text style={[styles.title, { color: pal.text }]}>Listen offline</Text>
        <Pressable onPress={() => router.back()} style={[styles.x, { borderColor: pal.line }]} accessibilityRole="button" accessibilityLabel="Close" hitSlop={8}>
          <Icon name="close" size={18} color={pal.text} />
        </Pressable>
      </View>
      <FlatList
        data={SURAHS.map((_, i) => i + 1)}
        keyExtractor={(s) => String(s)}
        ListHeaderComponent={header}
        contentContainerStyle={{ padding: 18, paddingBottom: insets.bottom + 40 }}
        ListFooterComponent={
          <View style={{ gap: 12, marginTop: 18 }}>
            <Pressable onPress={() => gate(() => enqueue(r, missing(SURAHS.map((_, i) => i + 1))))} style={[styles.btn, { borderColor: pal.line, borderWidth: 1 }]}>
              <Text style={[styles.btnText, { color: pal.text }]}>Download the whole Quran</Text>
            </Pressable>
            <Text style={[styles.small, { color: pal.muted, textAlign: 'center' }]}>The whole Quran is a large download (several hundred MB). Best on Wi-Fi.</Text>
            {total > 0 && (
              <Pressable
                onPress={() =>
                  Alert.alert('Remove all downloads?', `This frees ${formatBytes(total)} on your phone.`, [
                    { text: 'Cancel', style: 'cancel' },
                    { text: 'Remove', style: 'destructive', onPress: () => removeAll() },
                  ])
                }
                style={{ alignSelf: 'center', padding: 10 }}
              >
                <Text style={[styles.small, { color: '#B4432F', textDecorationLine: 'underline' }]}>Remove all downloads</Text>
              </Pressable>
            )}
            <Text style={[styles.small, { color: pal.muted, textAlign: 'center' }]}>Recitations from the Quran Foundation. Downloads are checked for updates each week when you’re online.</Text>
          </View>
        }
        renderItem={({ item: s }) => {
          const d = downloaded(r, s);
          const busy = q.current?.r === r && q.current.s === s;
          const waiting = q.waiting.includes(`${r}:${s}`);
          return (
            <Pressable
              onPress={() => {
                if (d?.complete)
                  Alert.alert(`Remove ${SURAHS[s - 1][0]}?`, `Frees ${formatBytes(bytesOf(d))}.`, [
                    { text: 'Cancel', style: 'cancel' },
                    { text: 'Remove', style: 'destructive', onPress: () => removeSurah(r, s) },
                  ]);
                else if (!busy && !waiting) gate(() => enqueue(r, [s]));
              }}
              style={[styles.row, { borderColor: pal.line }]}
              accessibilityRole="button"
              accessibilityLabel={`${SURAHS[s - 1][0]}, ${d?.complete ? 'downloaded, tap to remove' : busy ? 'downloading' : waiting ? 'waiting' : 'tap to download'}`}
            >
              <Text style={[styles.num, { color: pal.muted }]}>{s}</Text>
              <View style={{ flex: 1 }}>
                <Text style={[styles.name, { color: pal.text }]}>{SURAHS[s - 1][0]}</Text>
                <Text style={[styles.small, { color: pal.muted }]}>
                  {SURAHS[s - 1][3]} ayat{d?.complete ? ` · ${formatBytes(bytesOf(d))}` : d && !busy ? ' · partly downloaded' : ''}
                </Text>
              </View>
              {busy ? (
                <Text style={[styles.small, { color: pal.accent, fontFamily: fonts.uiBold }]}>{Math.round(((q.current?.done ?? 0) / (q.current?.total ?? 1)) * 100)}%</Text>
              ) : waiting ? (
                <Text style={[styles.small, { color: pal.muted }]}>Waiting</Text>
              ) : (
                <Icon name={d?.complete ? 'downloaded' : 'download'} size={20} color={d?.complete ? pal.accent : pal.text} />
              )}
            </Pressable>
          );
        }}
      />
    </View>
  );
}

function Bundle({ pal, title, sub, left, onPress }: { pal: Palette; title: string; sub: string; left: number; onPress: () => void }) {
  const done = left === 0;
  return (
    <Pressable onPress={done ? undefined : onPress} style={[styles.bundle, { backgroundColor: pal.surface, borderColor: done ? pal.accent : pal.line }]} accessibilityRole="button">
      <Text style={[styles.cardTitle, { color: pal.text }]}>{title}</Text>
      <Text style={[styles.small, { color: pal.muted }]} numberOfLines={2}>
        {sub}
      </Text>
      <Text style={[styles.small, { color: done ? pal.accent : pal.text, fontFamily: fonts.uiBold, marginTop: 4 }]}>{done ? '✓ Downloaded' : 'Download'}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  head: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 18, paddingBottom: 12, borderBottomWidth: StyleSheet.hairlineWidth },
  title: { fontFamily: fonts.uiBold, fontSize: 26, letterSpacing: -0.5 },
  x: { width: 36, height: 36, borderRadius: 18, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  lead: { fontFamily: fonts.read, fontSize: 15, lineHeight: 22 },
  small: { fontFamily: fonts.ui, fontSize: 13, lineHeight: 18 },
  h3: { fontFamily: fonts.uiBold, fontSize: 11, letterSpacing: 1.2, marginTop: 8 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  chip: { borderWidth: 1, borderRadius: 8, paddingHorizontal: 12, paddingVertical: 8 },
  chipText: { fontFamily: fonts.uiSemi, fontSize: 14 },
  card: { borderWidth: 1, borderRadius: 14, padding: 14, gap: 8 },
  cardTitle: { fontFamily: fonts.uiBold, fontSize: 16 },
  track: { height: 6, borderRadius: 3, overflow: 'hidden' },
  bundle: { flex: 1, borderWidth: 1, borderRadius: 14, padding: 12, gap: 2 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 12, borderBottomWidth: StyleSheet.hairlineWidth },
  num: { fontFamily: fonts.uiSemi, fontSize: 13, width: 26, textAlign: 'center' },
  name: { fontFamily: fonts.uiSemi, fontSize: 16 },
  btn: { borderRadius: 12, minHeight: 50, alignItems: 'center', justifyContent: 'center' },
  btnText: { fontFamily: fonts.uiBold, fontSize: 16 },
});
