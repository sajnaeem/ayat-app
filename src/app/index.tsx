import { useAudioPlayer, useAudioPlayerStatus } from 'expo-audio';
import * as Haptics from 'expo-haptics';
import { useRouter } from 'expo-router';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { FlatList, Pressable, Share, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Icon } from '@/components/Icon';
import { Sheet } from '@/components/Sheet';
import { VerseCard } from '@/components/VerseCard';
import { ayahAudioUrl, RECITERS } from '@/lib/audio';
import { feedRound, LANGS, MOODS, Verse } from '@/lib/quran';
import { usePrefs } from '@/lib/store';
import { fonts, Palette, usePalette } from '@/lib/theme';

type Item = { key: string; v: Verse; i: number };

/** Builds rounds of the feed forever, never showing the same ayah twice in a row. */
function useEndlessFeed(mood: Parameters<typeof feedRound>[1], liked: string[]) {
  const [items, setItems] = useState<Item[]>([]);
  const round = useRef(0);
  const build = useCallback(
    (reset: boolean) => {
      setItems((prev) => {
        const base = reset ? [] : prev;
        if (reset) round.current = 0;
        const recent = new Set(base.slice(-14).map((x) => x.v.k));
        let list = feedRound(round.current, mood, liked);
        list = [...list.filter((v) => !recent.has(v.k)), ...list.filter((v) => recent.has(v.k))];
        if (base.length && list[0]?.k === base[base.length - 1].v.k) list.push(list.shift()!);
        const start = base.length;
        const next = list.map((v, j) => ({ key: `${round.current}-${v.k}`, v, i: start + j }));
        round.current += 1;
        return [...base, ...next];
      });
    },
    // liked is read only when a new round is built, so likes don't reshuffle what's on screen
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [mood],
  );
  return { items, build };
}

export default function Feed() {
  const pal = usePalette();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const prefs = usePrefs();
  const [height, setHeight] = useState(0);
  const [active, setActive] = useState(0);
  const [sheet, setSheet] = useState<null | 'mood' | 'settings' | 'context'>(prefs.onboarded ? null : 'mood');
  const [contextVerse, setContextVerse] = useState<Verse | null>(null);
  const listRef = useRef<FlatList<Item>>(null);

  const liked = useMemo(() => Object.keys(prefs.likes), [prefs.likes]);
  const { items, build } = useEndlessFeed(prefs.mood, liked);

  // New mood → rebuild from the top, then jump back to the first card once the new cards are in.
  const pendingTop = useRef(false);
  useEffect(() => {
    pendingTop.current = true;
    build(true);
  }, [build]);
  useEffect(() => {
    if (!pendingTop.current || !items.length) return;
    pendingTop.current = false;
    const raf = requestAnimationFrame(() => {
      listRef.current?.scrollToOffset({ offset: 0, animated: false });
      setActive(0);
    });
    return () => cancelAnimationFrame(raf);
  }, [items]);

  /* ---------- recitation ---------- */
  const player = useAudioPlayer(null);
  const status = useAudioPlayerStatus(player);
  const queue = useRef<{ card: string; s: number; ayat: number[]; idx: number } | null>(null);
  const [playing, setPlaying] = useState<{ card: string; ayah: number } | null>(null);

  const stop = useCallback(() => {
    player.pause();
    queue.current = null;
    setPlaying(null);
  }, [player]);

  const playIdx = useCallback(() => {
    const q = queue.current;
    if (!q) return;
    const n = q.ayat[q.idx];
    player.replace(ayahAudioUrl(prefs.reciter, q.s, n));
    player.play();
    setPlaying({ card: q.card, ayah: n });
  }, [player, prefs.reciter]);

  const startCard = useCallback(
    (item: Item | undefined) => {
      if (!item) return;
      queue.current = { card: item.key, s: item.v.s, ayat: item.v.ar.map(([, n]) => n), idx: 0 };
      playIdx();
    },
    [playIdx],
  );

  useEffect(() => {
    if (!status.didJustFinish || !queue.current) return;
    const q = queue.current;
    if (q.idx < q.ayat.length - 1) {
      q.idx += 1;
      playIdx();
    } else stop();
  }, [status.didJustFinish, playIdx, stop]);

  // Each time a new card settles, recite it (if sound is on).
  useEffect(() => {
    if (!items.length || sheet === 'mood') return;
    if (prefs.sound) startCard(items[active]);
    else stop();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active, prefs.sound, prefs.reciter, sheet === 'mood']);

  const onViewable = useRef(({ viewableItems }: { viewableItems: { index?: number | null }[] }) => {
    const first = viewableItems[0];
    if (first?.index != null) setActive(first.index);
  }).current;

  /* ---------- actions ---------- */
  const like = (k: string, viaDoubleTap = false) => {
    if (viaDoubleTap && prefs.likes[k]) return;
    const on = prefs.toggleLike(k);
    if (on) Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
  };
  const share = (v: Verse) => {
    const tr = v.tr[prefs.lang] ?? v.tr.en;
    Share.share({ message: `${v.ar.map(([t]) => t).join(' ')}\n\n${tr.join(' ')}\n— Quran ${v.k}\n\nShared from Ayat` }).catch(() => {});
  };
  const keepReading = (v: Verse) => {
    stop();
    const to = v.ar[v.ar.length - 1][1];
    router.push({ pathname: '/surah/[id]', params: { id: String(v.s), from: String(v.a), to: String(to) } });
  };

  const moodLabel = MOODS.find((m) => m.id === prefs.mood)?.label ?? 'For you';

  return (
    <View style={[styles.root, { backgroundColor: pal.bg }]} onLayout={(e) => setHeight(e.nativeEvent.layout.height)}>
      {height > 0 && (
        <FlatList
          ref={listRef}
          data={items}
          keyExtractor={(x) => x.key}
          renderItem={({ item, index }) => {
            const tone = pal.tones[item.i % pal.tones.length];
            const isPlaying = playing?.card === item.key;
            return (
              <VerseCard
                verse={item.v}
                tone={tone}
                pal={pal}
                height={height}
                topInset={insets.top}
                bottomInset={insets.bottom}
                active={index === active && sheet !== 'mood'}
                lang={prefs.lang}
                showTl={prefs.showTl}
                mood={prefs.mood}
                liked={!!prefs.likes[item.v.k]}
                saved={!!prefs.saves[item.v.k]}
                playing={isPlaying}
                playingAyah={isPlaying ? playing!.ayah : null}
                first={item.i === 0}
                onLike={() => like(item.v.k)}
                onDoubleTap={() => like(item.v.k, true)}
                onSave={() => prefs.toggleSave(item.v.k)}
                onListen={() => (isPlaying ? stop() : startCard(item))}
                onShare={() => share(item.v)}
                onKeepReading={() => keepReading(item.v)}
                onContext={() => {
                  setContextVerse(item.v);
                  setSheet('context');
                }}
              />
            );
          }}
          pagingEnabled
          decelerationRate="fast"
          showsVerticalScrollIndicator={false}
          getItemLayout={(_, index) => ({ length: height, offset: height * index, index })}
          onViewableItemsChanged={onViewable}
          viewabilityConfig={{ itemVisiblePercentThreshold: 60 }}
          onEndReached={() => build(false)}
          onEndReachedThreshold={3}
          windowSize={5}
          initialNumToRender={2}
          maxToRenderPerBatch={3}
          removeClippedSubviews
        />
      )}

      <TopBar
        pal={pal}
        top={insets.top}
        moodLabel={moodLabel}
        showTl={prefs.showTl}
        sound={prefs.sound}
        onMood={() => setSheet('mood')}
        onTl={() => prefs.set({ showTl: !prefs.showTl })}
        onSound={() => prefs.set({ sound: !prefs.sound })}
        onSettings={() => setSheet('settings')}
      />

      <Sheet visible={sheet === 'mood'} onClose={() => { prefs.set({ onboarded: true }); setSheet(null); }} title="What's on your heart today?" pal={pal}>
        <Text style={[styles.lead, { color: pal.muted }]}>Pick one and your feed starts with ayat that speak to it. You can change it any time.</Text>
        <View style={styles.grid}>
          {MOODS.map((m) => {
            const on = prefs.mood === m.id;
            return (
              <Pressable key={m.id} onPress={() => { prefs.set({ mood: m.id, onboarded: true }); setSheet(null); }} style={[styles.opt, { borderColor: on ? pal.accent : pal.line, borderWidth: on ? 2 : 1 }]} accessibilityRole="button" accessibilityState={{ selected: on }}>
                <Text style={[styles.optTitle, { color: pal.text }]}>{m.label}</Text>
                <Text style={[styles.optSub, { color: pal.muted }]}>{m.sub}</Text>
              </Pressable>
            );
          })}
        </View>
        <Pressable onPress={() => { prefs.set({ mood: null, onboarded: true }); setSheet(null); }} style={styles.skip} accessibilityRole="button">
          <Text style={[styles.skipText, { color: pal.muted }]}>Just let me scroll</Text>
        </Pressable>
      </Sheet>

      <Sheet visible={sheet === 'settings'} onClose={() => setSheet(null)} title="Language and reciter" pal={pal}>
        <Text style={[styles.h3, { color: pal.muted }]}>TRANSLATION</Text>
        <View style={styles.grid}>
          {LANGS.map((l) => {
            const on = prefs.lang === l.id;
            return (
              <Pressable key={l.id} onPress={() => prefs.set({ lang: l.id })} style={[styles.opt, { borderColor: on ? pal.accent : pal.line, borderWidth: on ? 2 : 1 }]} accessibilityRole="button" accessibilityState={{ selected: on }}>
                <Text style={[styles.optTitle, { color: pal.text }]}>
                  {l.name}
                  {l.native ? `  ${l.native}` : ''}
                </Text>
                <Text style={[styles.optSub, { color: pal.muted }]}>{l.by}</Text>
              </Pressable>
            );
          })}
        </View>
        <Text style={[styles.h3, { color: pal.muted, marginTop: 14 }]}>RECITER</Text>
        <View style={styles.grid}>
          {RECITERS.map((r) => {
            const on = prefs.reciter === r.id;
            return (
              <Pressable key={r.id} onPress={() => prefs.set({ reciter: r.id })} style={[styles.opt, { borderColor: on ? pal.accent : pal.line, borderWidth: on ? 2 : 1 }]} accessibilityRole="button" accessibilityState={{ selected: on }}>
                <Text style={[styles.optTitle, { color: pal.text }]}>{r.name}</Text>
                <Text style={[styles.optSub, { color: pal.muted }]}>{r.note}</Text>
              </Pressable>
            );
          })}
        </View>
      </Sheet>

      <Sheet visible={sheet === 'context'} onClose={() => setSheet(null)} title={contextVerse ? `${contextVerse.name} ${contextVerse.k}` : 'Context'} pal={pal}>
        <Text style={[styles.note, { color: pal.text }]}>{contextVerse?.note}</Text>
        <Text style={[styles.optSub, { color: pal.muted }]}>Summary drawn from classical tafsir. The launch version will show a licensed tafsir with full citations.</Text>
      </Sheet>
    </View>
  );
}

function TopBar(p: { pal: Palette; top: number; moodLabel: string; showTl: boolean; sound: boolean; onMood: () => void; onTl: () => void; onSound: () => void; onSettings: () => void }) {
  const { pal } = p;
  const pill = [styles.pill, { borderColor: pal.line, backgroundColor: pal.surface }];
  return (
    <View style={[styles.top, { paddingTop: p.top + 10 }]} pointerEvents="box-none">
      <Text style={[styles.brand, { color: pal.text }]}>
        ayat<Text style={{ color: pal.accent }}>.</Text>
      </Text>
      <View style={styles.topRight}>
        <Pressable onPress={p.onMood} style={[pill, { maxWidth: 130 }]} accessibilityRole="button" accessibilityLabel="Change what's on your heart">
          <Text style={[styles.pillText, { color: pal.text }]} numberOfLines={1}>
            {p.moodLabel}
          </Text>
        </Pressable>
        <Pressable onPress={p.onTl} style={[pill, p.showTl && { borderColor: pal.accent }]} accessibilityRole="switch" accessibilityState={{ checked: p.showTl }} accessibilityLabel="Show transliteration">
          <Text style={[styles.aa, { color: p.showTl ? pal.accent : pal.text }]}>Aa</Text>
        </Pressable>
        <Pressable onPress={p.onSound} style={pill} accessibilityRole="switch" accessibilityState={{ checked: p.sound }} accessibilityLabel="Recitation">
          <Icon name={p.sound ? 'sound' : 'mute'} size={17} color={p.sound ? pal.text : pal.muted} />
        </Pressable>
        <Pressable onPress={p.onSettings} style={pill} accessibilityRole="button" accessibilityLabel="Language and reciter">
          <Icon name="sliders" size={17} color={pal.text} />
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  top: { position: 'absolute', left: 0, right: 0, top: 0, paddingHorizontal: 16, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  brand: { fontFamily: fonts.uiBold, fontSize: 24, letterSpacing: -0.5 },
  topRight: { flexDirection: 'row', gap: 6, alignItems: 'center' },
  pill: { minHeight: 36, minWidth: 36, paddingHorizontal: 10, borderWidth: 1, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
  pillText: { fontFamily: fonts.uiSemi, fontSize: 13 },
  aa: { fontFamily: fonts.readItalic, fontSize: 15 },
  lead: { fontFamily: fonts.read, fontSize: 15, lineHeight: 22, marginBottom: 6 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  opt: { flexBasis: '47%', flexGrow: 1, borderRadius: 10, padding: 12, gap: 3 },
  optTitle: { fontFamily: fonts.uiSemi, fontSize: 15 },
  optSub: { fontFamily: fonts.ui, fontSize: 12, lineHeight: 17 },
  skip: { alignSelf: 'center', padding: 12 },
  skipText: { fontFamily: fonts.ui, fontSize: 14, textDecorationLine: 'underline' },
  h3: { fontFamily: fonts.uiBold, fontSize: 11, letterSpacing: 1.2 },
  note: { fontFamily: fonts.read, fontSize: 16, lineHeight: 25 },
});
