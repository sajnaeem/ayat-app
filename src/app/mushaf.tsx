import { useAudioPlayer } from 'expo-audio';
import * as ExpoFont from 'expo-font';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { onPageJump, showFeed } from '@/lib/nav';
import { memo, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, FlatList, LayoutChangeEvent, Pressable, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Icon } from '@/components/Icon';
import { TafsirSheet } from '@/components/Study';
import { useToast } from '@/components/Toast';
import { juzOf, pageOf, PAGES, pageStart } from '@/data/mushaf';
import { ayahAudio, wordAt } from '@/lib/audio';
import { ayatOn, HAFS, loadHafs, loadPage, loadPageFont, MLine, MPage, pageFont, prefetchAround, prunePages } from '@/lib/mushaf';
import { useProgress } from '@/lib/progress';
import { SURAHS } from '@/lib/quran';
import { usePrefs } from '@/lib/store';
import { noteQuranRead } from '@/lib/together';
import { fonts, mix, Palette, usePalette } from '@/lib/theme';

const READ_AFTER_MS = 15000; // a page on screen this long counts as read
const BASMALAH = 'بِسۡمِ ٱللَّهِ ٱلرَّحۡمَٰنِ ٱلرَّحِيمِ';
const nextKey = (k: string) => {
  const [s, a] = k.split(':').map(Number);
  if (a < SURAHS[s - 1][3]) return `${s}:${a + 1}`;
  return s < 114 ? `${s + 1}:1` : null;
};

/** Page view: the printed Madani Mushaf, swiped right to left like a real one. */
export default function Mushaf() {
  const params = useLocalSearchParams<{ page?: string }>();
  const pal = usePalette();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const toast = useToast();
  const prefs = usePrefs();
  const prog = useProgress();
  const { width, height } = useWindowDimensions();
  const start = Math.min(PAGES, Math.max(1, Number(params.page) || prefs.mushafPage || (prefs.place ? pageOf(prefs.place.s, prefs.place.a) : 1)));
  const [page, setPage] = useState(start);
  const [sel, setSel] = useState<string | null>(null);
  const [tafsir, setTafsir] = useState<string | null>(null);
  const list = useRef<FlatList<number>>(null);

  useEffect(() => {
    loadHafs();
    prunePages();
  }, []);
  // "Go to" (the title) can send this page view to another page.
  useEffect(
    () =>
      onPageJump((p) => {
        setSel(null);
        setPage(p);
        list.current?.scrollToIndex({ index: p - 1, animated: false });
      }),
    [],
  );

  /* ---------- reading progress: a page that stays on screen counts as read ---------- */
  const counted = useRef(new Set<number>());
  useEffect(() => {
    prefs.set({ mushafPage: page });
    prefetchAround(page);
    const t = setTimeout(async () => {
      if (counted.current.has(page)) return;
      counted.current.add(page);
      try {
        const d = await loadPage(page);
        const keys = ayatOn(d);
        if (!keys.length) return;
        prog.markRead(keys, 1);
        const [ls, la] = keys[keys.length - 1].split(':').map(Number);
        prefs.set({ place: { s: ls, a: la } });
        const ev = await noteQuranRead(keys);
        ev.finished.forEach((f) => toast(`MashaAllah, juz ${f.juz} is finished for “${f.title}”`));
      } catch {}
    }, READ_AFTER_MS);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page]);

  /* ---------- recitation: plays on from a chosen ayah, turning pages as it goes ---------- */
  const player = useAudioPlayer(null, { updateInterval: 100 });
  const [playing, setPlaying] = useState<string | null>(null);
  const [paused, setPaused] = useState(false);
  const [word, setWord] = useState<number | null>(null);
  const timings = useRef<[number, number, number][]>([]);
  const current = useRef<string | null>(null);

  const playKey = useCallback(
    (k: string) => {
      current.current = k;
      timings.current = [];
      setWord(null);
      setPlaying(k);
      setPaused(false);
      const [s, a] = k.split(':').map(Number);
      const p = pageOf(s, a);
      if (p !== page) list.current?.scrollToIndex({ index: p - 1, animated: true });
      ayahAudio(prefs.reciter, s, a).then((au) => {
        if (current.current !== k) return;
        timings.current = au.words;
        player.replace(au.url);
        player.setPlaybackRate(prefs.speed ?? 1, 'high');
        player.play();
      });
    },
    [player, prefs.reciter, prefs.speed, page],
  );

  const stopAudio = useCallback(() => {
    current.current = null;
    player.pause();
    setPlaying(null);
    setWord(null);
  }, [player]);

  useEffect(() => {
    const sub = player.addListener('playbackStatusUpdate', (st) => {
      if (st.didJustFinish && current.current) {
        const n = nextKey(current.current);
        if (n) playKey(n);
        else stopAudio();
        return;
      }
      const t = timings.current;
      if (t.length) setWord(wordAt(t, st.currentTime * 1000));
    });
    return () => sub.remove();
  }, [player, playKey, stopAudio]);
  useEffect(() => () => player.pause(), [player]);

  const togglePage = () => {
    if (playing) {
      if (paused) {
        player.play();
        setPaused(false);
      } else {
        player.pause();
        setPaused(true);
      }
    } else {
      const [s, a] = pageStart(page);
      playKey(`${s}:${a}`);
    }
  };

  const toCards = (k?: string) => {
    stopAudio();
    const [s, a] = (k ?? `${pageStart(page).join(':')}`).split(':').map(Number);
    prefs.readAt(s, a);
    showFeed(router);
  };

  const [ps, pa] = pageStart(page);
  const pageH = height - insets.top - insets.bottom - 112;

  return (
    <View style={[styles.root, { backgroundColor: pal.bg }]}>
      <View style={[styles.top, { paddingTop: insets.top + 8, borderColor: pal.line }]}>
        <Pressable onPress={() => { stopAudio(); router.back(); }} style={[styles.x, { borderColor: pal.line }]} accessibilityRole="button" accessibilityLabel="Close page view" hitSlop={8}>
          <Icon name="close" size={18} color={pal.text} />
        </Pressable>
        <Pressable
          onPress={() => router.push({ pathname: '/read', params: { to: 'pages' } })}
          style={{ flex: 1, alignItems: 'center' }}
          accessibilityRole="button"
          accessibilityLabel={`${SURAHS[ps - 1][0]}, juz ${juzOf(ps, pa)}, page ${page}. Go to another surah, juz or page`}
        >
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
            <Text style={[styles.topTitle, { color: pal.text }]} numberOfLines={1}>
              {SURAHS[ps - 1][0]}
            </Text>
            <View style={{ transform: [{ rotate: '90deg' }] }}>
              <Icon name="chevron" size={14} color={pal.muted} strokeWidth={2.2} />
            </View>
          </View>
          <Text style={[styles.topSub, { color: pal.muted }]}>
            Juz {juzOf(ps, pa)} · Page {page}
          </Text>
        </Pressable>
        <View style={{ flexDirection: 'row', gap: 6 }}>
          <Pressable onPress={togglePage} style={[styles.x, { borderColor: playing ? pal.accent : pal.line }]} accessibilityRole="button" accessibilityLabel={playing && !paused ? 'Pause recitation' : 'Listen from this page'} hitSlop={6}>
            <Icon name={playing && !paused ? 'pause' : 'play'} size={16} color={playing ? pal.accent : pal.text} fill={!(playing && !paused)} />
          </Pressable>
          <Pressable onPress={() => toCards()} style={[styles.pill, { borderColor: pal.line }]} accessibilityRole="button" accessibilityLabel="Back to cards at this page">
            <Text style={[styles.pillText, { color: pal.text }]}>Cards</Text>
          </Pressable>
        </View>
      </View>

      <FlatList
        ref={list}
        data={Array.from({ length: PAGES }, (_, i) => i + 1)}
        keyExtractor={(p) => String(p)}
        horizontal
        inverted
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        initialScrollIndex={start - 1}
        getItemLayout={(_, i) => ({ length: width, offset: width * i, index: i })}
        initialNumToRender={1}
        maxToRenderPerBatch={2}
        windowSize={3}
        onMomentumScrollEnd={(e) => {
          const i = Math.round(e.nativeEvent.contentOffset.x / width);
          const p = Math.min(PAGES, Math.max(1, i + 1));
          if (p !== page) {
            setPage(p);
            setSel(null);
          }
        }}
        renderItem={({ item }) => (
          <PageView p={item} width={width} height={pageH} pal={pal} sel={sel} playing={playing} word={word} onWord={(k) => setSel((x) => (x === k ? null : k))} />
        )}
      />

      {sel ? (
        <View style={[styles.actions, { backgroundColor: pal.surface, borderColor: pal.line, paddingBottom: insets.bottom + 10 }]}>
          <Text style={[styles.actTitle, { color: pal.text }]}>
            {SURAHS[Number(sel.split(':')[0]) - 1][0]} {sel}
          </Text>
          <View style={styles.actRow}>
            <Action pal={pal} icon="play" label="Listen" onPress={() => { playKey(sel); setSel(null); }} />
            <Action pal={pal} icon="book" label="Tafsir" onPress={() => setTafsir(sel)} />
            <Action pal={pal} icon="chevron" label="As cards" onPress={() => toCards(sel)} />
            <Action pal={pal} icon="close" label="Close" onPress={() => setSel(null)} />
          </View>
        </View>
      ) : (
        <View style={[styles.bottom, { paddingBottom: insets.bottom + 8 }]}>
          <Text style={[styles.small, { color: pal.muted }]}>Tap an ayah for more · swipe to turn the page</Text>
        </View>
      )}

      <TafsirSheet verseKey={tafsir} lang={prefs.lang} pal={pal} onClose={() => setTafsir(null)} />
    </View>
  );
}

function Action({ pal, icon, label, onPress }: { pal: Palette; icon: 'play' | 'book' | 'chevron' | 'close'; label: string; onPress: () => void }) {
  return (
    <Pressable onPress={onPress} style={styles.act} accessibilityRole="button" accessibilityLabel={label}>
      <Icon name={icon} size={20} color={pal.text} fill={icon === 'play'} />
      <Text style={[styles.actLabel, { color: pal.text }]}>{label}</Text>
    </Pressable>
  );
}

/** One page: 15 lines (8 on the first two pages), each spread to the full width like the printed mushaf. */
const PageView = memo(function PageView({
  p, width, height, pal, sel, playing, word, onWord,
}: { p: number; width: number; height: number; pal: Palette; sel: string | null; playing: string | null; word: number | null; onWord: (k: string) => void }) {
  const [data, setData] = useState<MPage | null>(null);
  const [failed, setFailed] = useState(false);
  const [glyphs, setGlyphs] = useState<boolean | null>(null); // null while the page font loads; false = use plain text
  const [widths, setWidths] = useState<Record<number, number>>({});

  useEffect(() => {
    let live = true;
    loadPage(p).then((d) => live && setData(d), () => live && setFailed(true));
    loadPageFont(p).then((ok) => live && setGlyphs(ok));
    return () => {
      live = false;
    };
  }, [p]);

  const padX = 12;
  const sheetW = Math.round(width * 0.94);
  const avail = sheetW - padX * 2 - 2;
  const lineCount = p <= 2 ? 8 : 15;
  // Leave room for the sheet's padding and the page number underneath.
  const lineH = Math.floor((height - 10 - 18 - 26) / 15);
  const BASE = 20;
  const family = glyphs ? pageFont(p) : fonts.arabic;
  const wordLines = useMemo(() => (data?.lines ?? []).filter((l): l is Extract<MLine, { t: 'w' }> => l.t === 'w'), [data]);

  // Measure each line at a base size, then size the page so the widest line just fits.
  // Safety net: if measuring hasn't finished within 2 seconds, show the page with what we have.
  const [late, setLate] = useState(false);
  useEffect(() => {
    if (!data || glyphs === null) return;
    const t = setTimeout(() => setLate(true), 2000);
    return () => clearTimeout(t);
  }, [data, glyphs]);
  // Widths are measured once the page font is settled (glyphs never changes after that), so they always match it.
  const known = wordLines.map((l) => widths[l.n]).filter((w): w is number => w > 0);
  const measured = (wordLines.length > 0 && known.length === wordLines.length) || (late && wordLines.length > 0);
  const widest = known.length ? Math.max(...known) : avail * (BASE / 22);
  const size = measured ? Math.min(BASE * (avail / widest), lineH * (glyphs ? 0.62 : 0.5)) : BASE;
  const gap = glyphs ? 0 : 0.25;


  if (failed) {
    return (
      <View style={[styles.page, { width, height, justifyContent: 'center', alignItems: 'center' }]}>
        <Text style={[styles.small, { color: pal.muted, textAlign: 'center', paddingHorizontal: 30 }]}>Couldn’t load page {p}. Check your connection.</Text>
      </View>
    );
  }
  if (!data || glyphs === null) {
    return (
      <View style={[styles.page, { width, height, justifyContent: 'center' }]}>
        <ActivityIndicator color={pal.muted} />
      </View>
    );
  }

  const centred = p <= 2;
  const words = (w: MLine & { t: 'w' }, i: number, measuring: boolean) =>
    w.w.map((x, j) => {
      const [code, key, text, end, pos] = x;
      const on = !measuring && (key === sel || key === playing);
      const now = !measuring && key === playing && word != null && pos === word && !end;
      return (
        <Text
          key={`${i}-${j}`}
          onPress={measuring ? undefined : () => onWord(key)}
          suppressHighlighting
          style={{
            fontFamily: family,
            fontSize: measuring ? BASE : size,
            lineHeight: measuring ? BASE * 2 : lineH,
            color: end && !glyphs ? pal.accent : pal.text,
            backgroundColor: now ? mix(pal.surface, pal.accent, 0.35) : on ? mix(pal.surface, pal.accent, 0.14) : 'transparent',
            marginHorizontal: (measuring ? BASE : size) * gap * 0.5,
            borderRadius: 4,
          }}
        >
          {glyphs ? code : end ? `۝${text}` : text}
        </Text>
      );
    });

  return (
    <View style={[styles.page, { width, height }]}>
      {/* Hidden measuring pass */}
      {!measured && (
        <View style={styles.measure} pointerEvents="none">
          {wordLines.map((l, i) => (
            <View key={l.n} style={{ flexDirection: 'row-reverse', alignSelf: 'flex-start' }} onLayout={(e: LayoutChangeEvent) => {
              const w = e.nativeEvent.layout.width;
              if (w > 0) setWidths((m) => (m[l.n] ? m : { ...m, [l.n]: w }));
            }}>
              {words(l, i, true)}
            </View>
          ))}
        </View>
      )}
      <View style={[styles.sheet, { width: sheetW, backgroundColor: pal.surface, borderColor: pal.line, paddingHorizontal: padX, opacity: measured ? 1 : 0, justifyContent: centred ? 'center' : 'flex-start' }]}>
        {data.lines.slice(0, lineCount).map((l, i) => {
          if (l.t === 'h') {
            return (
              <View key={l.n} style={[styles.headLine, { height: lineH }]}>
                <View style={[styles.headBox, { borderColor: pal.accent, backgroundColor: mix(pal.surface, pal.accent, 0.07) }]}>
                  <Text style={[styles.headText, { color: pal.text, fontSize: Math.min(22, lineH * 0.42), lineHeight: lineH * 0.8 }]}>سُورَةُ {SURAHS[l.s - 1][1]}</Text>
                </View>
              </View>
            );
          }
          if (l.t === 'b') {
            return (
              <View key={l.n} style={{ height: lineH, alignItems: 'center', justifyContent: 'center' }}>
                <Text style={{ fontFamily: hafsOr(), fontSize: Math.min(size * 1.05, lineH * 0.55), lineHeight: lineH, color: pal.text }}>{BASMALAH}</Text>
              </View>
            );
          }
          if (l.t !== 'w') return <View key={l.n} style={{ height: lineH }} />;
          const short = !!widths[l.n] && widths[l.n] < widest * 0.72;
          return (
            <View key={l.n} style={{ height: lineH, flexDirection: 'row-reverse', alignItems: 'center', justifyContent: centred || short ? 'center' : 'space-between' }}>
              {words(l, i, false)}
            </View>
          );
        })}
      </View>
      <Text style={[styles.pageNum, { color: pal.muted }]}>{p}</Text>
    </View>
  );
});

// The Uthmanic Hafs font once loaded, otherwise the app's Arabic font.
const hafsOr = () => (ExpoFont.isLoaded(HAFS) ? HAFS : fonts.arabic);

const styles = StyleSheet.create({
  root: { flex: 1 },
  top: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 14, paddingBottom: 10, borderBottomWidth: StyleSheet.hairlineWidth },
  topTitle: { fontFamily: fonts.uiBold, fontSize: 16 },
  topSub: { fontFamily: fonts.ui, fontSize: 12 },
  x: { width: 36, height: 36, borderRadius: 18, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  pill: { height: 36, paddingHorizontal: 12, borderRadius: 18, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  pillText: { fontFamily: fonts.uiBold, fontSize: 13 },
  page: { paddingTop: 10, alignItems: 'center' },
  sheet: { borderRadius: 6, borderWidth: StyleSheet.hairlineWidth, paddingVertical: 8 },
  measure: { position: 'absolute', opacity: 0, left: 0, top: 0 },
  headLine: { alignItems: 'center', justifyContent: 'center' },
  headBox: { borderWidth: 1.5, borderRadius: 8, paddingHorizontal: 28, minWidth: '70%', alignItems: 'center' },
  headText: { fontFamily: fonts.arabic },
  pageNum: { fontFamily: fonts.uiSemi, fontSize: 12, marginTop: 6 },
  bottom: { alignItems: 'center', paddingTop: 6 },
  small: { fontFamily: fonts.ui, fontSize: 12, lineHeight: 17 },
  actions: { borderTopWidth: StyleSheet.hairlineWidth, paddingTop: 10, paddingHorizontal: 16, gap: 6 },
  actTitle: { fontFamily: fonts.uiBold, fontSize: 14, textAlign: 'center' },
  actRow: { flexDirection: 'row', justifyContent: 'space-around' },
  act: { alignItems: 'center', gap: 3, padding: 6, minWidth: 64 },
  actLabel: { fontFamily: fonts.uiSemi, fontSize: 12 },
});
