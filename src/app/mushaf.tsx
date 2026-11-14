import { stopRadio } from '@/lib/radio';
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
import Svg, { Circle, Path, Polygon, Rect } from 'react-native-svg';
import { fonts, usePalette } from '@/lib/theme';

const READ_AFTER_MS = 15000; // a page on screen this long counts as read
const BASMALAH = 'بِسۡمِ ٱللَّهِ ٱلرَّحۡمَٰنِ ٱلرَّحِيمِ';
const nextKey = (k: string) => {
  const [s, a] = k.split(':').map(Number);
  if (a < SURAHS[s - 1][3]) return `${s}:${a + 1}`;
  return s < 114 ? `${s + 1}:1` : null;
};

/**
 * The mushaf's own look (Saj, 14 Nov 2026: "elegant, beautiful, like the most beautiful aesthetic thing in the world"):
 * warm paper on a sand ground, a fine gold double frame with eight-point star corners, an ornamental cartouche for
 * each surah name, the surah and juz in the top margin, and the page number in a star medallion. Night: ink-dark paper.
 */
type MP = { ground: string; paper: string; ink: string; muted: string; gold: string; green: string; line: string; hi: string; now: string; panel: string; dark: boolean };
const mushafPalette = (dark: boolean): MP =>
  dark
    ? { ground: '#0F1613', paper: '#18211D', ink: '#EFE8D8', muted: 'rgba(239,232,216,0.6)', gold: '#C9A35A', green: '#55BE8F', line: 'rgba(201,163,90,0.3)', hi: 'rgba(201,163,90,0.18)', now: 'rgba(201,163,90,0.42)', panel: '#1F2a25', dark }
    : { ground: '#EAE1CC', paper: '#FDF9F0', ink: '#1F1A12', muted: '#8A7E68', gold: '#B4893A', green: '#1F6E52', line: 'rgba(180,137,58,0.32)', hi: 'rgba(180,137,58,0.15)', now: 'rgba(180,137,58,0.36)', panel: '#FFFDF8', dark };
const AR = '٠١٢٣٤٥٦٧٨٩';
const arNum = (n: number) => String(n).replace(/\d/g, (d) => AR[Number(d)]);

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
      stopRadio();
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
  const mp = mushafPalette(pal.dark);
  const btn = { backgroundColor: mp.panel, borderColor: mp.line };

  return (
    <View style={[styles.root, { backgroundColor: mp.ground }]}>
      <View style={[styles.top, { paddingTop: insets.top + 8 }]}>
        <Pressable onPress={() => { stopAudio(); router.back(); }} style={[styles.x, btn]} accessibilityRole="button" accessibilityLabel="Close page view" hitSlop={8}>
          <Icon name="close" size={18} color={mp.ink} />
        </Pressable>
        <Pressable
          onPress={() => router.push({ pathname: '/read', params: { to: 'pages' } })}
          style={{ flex: 1, alignItems: 'center' }}
          accessibilityRole="button"
          accessibilityLabel={`${SURAHS[ps - 1][0]}, juz ${juzOf(ps, pa)}, page ${page}. Go to another surah, juz or page`}
        >
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
            <Text style={[styles.topTitle, { color: mp.ink }]} numberOfLines={1}>
              {SURAHS[ps - 1][0]}
            </Text>
            <View style={{ transform: [{ rotate: '90deg' }] }}>
              <Icon name="chevron" size={14} color={mp.muted} strokeWidth={2.2} />
            </View>
          </View>
          <Text style={[styles.topSub, { color: mp.muted }]}>
            Juz {juzOf(ps, pa)} · Page {page}
          </Text>
        </Pressable>
        <View style={{ flexDirection: 'row', gap: 6 }}>
          <Pressable onPress={togglePage} style={[styles.x, btn, playing && { borderColor: mp.gold }]} accessibilityRole="button" accessibilityLabel={playing && !paused ? 'Pause recitation' : 'Listen from this page'} hitSlop={6}>
            <Icon name={playing && !paused ? 'pause' : 'play'} size={16} color={playing ? mp.gold : mp.ink} fill={!(playing && !paused)} />
          </Pressable>
          <Pressable onPress={() => toCards()} style={[styles.pill, btn]} accessibilityRole="button" accessibilityLabel="Back to cards at this page">
            <Text style={[styles.pillText, { color: mp.ink }]}>Cards</Text>
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
          <PageView p={item} width={width} height={pageH} mp={mp} sel={sel} playing={playing} word={word} onWord={(k) => setSel((x) => (x === k ? null : k))} />
        )}
      />

      {sel ? (
        <View style={[styles.actions, { backgroundColor: mp.panel, borderColor: mp.line, paddingBottom: insets.bottom + 10 }]}>
          <Text style={[styles.actTitle, { color: mp.ink }]}>
            {SURAHS[Number(sel.split(':')[0]) - 1][0]} {sel}
          </Text>
          <View style={styles.actRow}>
            <Action ink={mp.ink} icon="play" label="Listen" onPress={() => { playKey(sel); setSel(null); }} />
            <Action ink={mp.ink} icon="book" label="Tafsir" onPress={() => setTafsir(sel)} />
            <Action ink={mp.ink} icon="chevron" label="As cards" onPress={() => toCards(sel)} />
            <Action ink={mp.ink} icon="close" label="Close" onPress={() => setSel(null)} />
          </View>
        </View>
      ) : (
        <View style={[styles.bottom, { paddingBottom: insets.bottom + 8 }]}>
          <Text style={[styles.small, { color: mp.muted }]}>Tap an ayah for more · swipe to turn the page</Text>
        </View>
      )}

      <TafsirSheet verseKey={tafsir} lang={prefs.lang} pal={pal} onClose={() => setTafsir(null)} />
    </View>
  );
}

function Action({ ink, icon, label, onPress }: { ink: string; icon: 'play' | 'book' | 'chevron' | 'close'; label: string; onPress: () => void }) {
  return (
    <Pressable onPress={onPress} style={styles.act} accessibilityRole="button" accessibilityLabel={label}>
      <Icon name={icon} size={20} color={ink} fill={icon === 'play'} />
      <Text style={[styles.actLabel, { color: ink }]}>{label}</Text>
    </Pressable>
  );
}

/** One page: 15 lines (8 on the first two pages), each spread to the full width like the printed mushaf. */
const PageView = memo(function PageView({
  p, width, height, mp, sel, playing, word, onWord,
}: { p: number; width: number; height: number; mp: MP; sel: string | null; playing: string | null; word: number | null; onWord: (k: string) => void }) {
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

  const padX = 22;
  const sheetW = Math.round(width * 0.94);
  const sheetH = height - 14;
  const avail = sheetW - padX * 2 - 2;
  const lineCount = p <= 2 ? 8 : 15;
  // Inside the frame: the margin line (surah, juz) at the top and the page medallion at the bottom.
  const TOPM = 34, BOTM = 38;
  const lineH = Math.floor((sheetH - TOPM - BOTM) / 15);
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
        <Text style={[styles.small, { color: mp.muted, textAlign: 'center', paddingHorizontal: 30 }]}>Couldn’t load page {p}. Check your connection.</Text>
      </View>
    );
  }
  if (!data || glyphs === null) {
    return (
      <View style={[styles.page, { width, height, justifyContent: 'center' }]}>
        <ActivityIndicator color={mp.gold} />
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
            color: end && !glyphs ? mp.gold : mp.ink,
            backgroundColor: now ? mp.now : on ? mp.hi : 'transparent',
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
      <View style={[styles.sheet, { width: sheetW, height: sheetH, backgroundColor: mp.paper, opacity: measured ? 1 : 0, shadowColor: mp.dark ? '#000' : '#5A4520' }]}>
        <Frame w={sheetW} h={sheetH} mp={mp} />
        {/* Top margin: surah on the right, juz on the left, as in a printed mushaf */}
        <View style={[styles.margin, { height: TOPM, paddingHorizontal: padX + 4 }]}>
          <Text style={[styles.marginText, { color: mp.gold }]}>الجزء {arNum(juzOf(...pageStart(p)))}</Text>
          <Text style={[styles.marginText, { color: mp.gold }]}>سورة {SURAHS[pageStart(p)[0] - 1][1]}</Text>
        </View>
        <View style={{ flex: 1, paddingHorizontal: padX, justifyContent: centred ? 'center' : 'space-evenly' }}>
        {centred && <Arch w={sheetW - padX * 2 + 12} h={lineH * (lineCount + 3.2)} mp={mp} />}
        {data.lines.slice(0, lineCount).map((l, i) => {
          if (l.t === 'h') {
            return (
              <View key={l.n} style={[styles.headLine, { height: lineH }]}>
                <Cartouche w={Math.min(avail, 300)} h={Math.min(lineH * 0.86, 46)} mp={mp} />
                <Text style={[styles.headText, { color: mp.ink, fontSize: Math.min(21, lineH * 0.42), lineHeight: lineH * 0.8 }]}>سُورَةُ {SURAHS[l.s - 1][1]}</Text>
              </View>
            );
          }
          if (l.t === 'b') {
            return (
              <View key={l.n} style={{ height: lineH, alignItems: 'center', justifyContent: 'center' }}>
                <Text style={{ fontFamily: hafsOr(), fontSize: Math.min(size * 1.05, lineH * 0.55), lineHeight: lineH, color: mp.ink }}>{BASMALAH}</Text>
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
        <View style={{ height: BOTM, alignItems: 'center', justifyContent: 'center' }}>
          <Medallion n={p} mp={mp} />
        </View>
      </View>
    </View>
  );
});

/** An eight-point star (two squares), centred on cx, cy. */
const star = (cx: number, cy: number, r: number) => {
  const pts: string[] = [];
  for (let i = 0; i < 16; i++) {
    const rr = i % 2 ? r * 0.72 : r;
    const a = (i * Math.PI) / 8 - Math.PI / 2;
    pts.push(`${(cx + Math.cos(a) * rr).toFixed(1)},${(cy + Math.sin(a) * rr).toFixed(1)}`);
  }
  return pts.join(' ');
};

/** The page frame: a gold double rule with star corners and small diamonds at the middle of each side. */
const Frame = memo(function Frame({ w, h, mp }: { w: number; h: number; mp: MP }) {
  const o = 7, i = 11;
  const corners = [[o + 2, o + 2], [w - o - 2, o + 2], [o + 2, h - o - 2], [w - o - 2, h - o - 2]];
  const mids = [[w / 2, o], [w / 2, h - o], [o, h / 2], [w - o, h / 2]];
  return (
    <Svg width={w} height={h} style={StyleSheet.absoluteFill} pointerEvents="none">
      <Rect x={o} y={o} width={w - o * 2} height={h - o * 2} rx={6} fill="none" stroke={mp.gold} strokeWidth={1.3} />
      <Rect x={i} y={i} width={w - i * 2} height={h - i * 2} rx={4} fill="none" stroke={mp.gold} strokeWidth={0.6} opacity={0.75} />
      {corners.map(([x, y], k) => (
        <Polygon key={k} points={star(x, y, 8)} fill={mp.paper} stroke={mp.gold} strokeWidth={1} />
      ))}
      {corners.map(([x, y], k) => (
        <Circle key={`c${k}`} cx={x} cy={y} r={2} fill={mp.green} />
      ))}
      {mids.map(([x, y], k) => (
        <Polygon key={`m${k}`} points={`${x},${y - 4} ${x + 4},${y} ${x},${y + 4} ${x - 4},${y}`} fill={mp.gold} />
      ))}
    </Svg>
  );
});

/** The ornamental band behind a surah's name: pointed ends, a fine inner rule and a star at each end. */
function Cartouche({ w, h, mp }: { w: number; h: number; mp: MP }) {
  const e = h * 0.5;
  const outer = `M ${e} 1 L ${w - e} 1 Q ${w - 2} 1 ${w - 1} ${h / 2} Q ${w - 2} ${h - 1} ${w - e} ${h - 1} L ${e} ${h - 1} Q 2 ${h - 1} 1 ${h / 2} Q 2 1 ${e} 1 Z`;
  const inset = 4;
  const inner = `M ${e} ${inset} L ${w - e} ${inset} Q ${w - inset - 1} ${inset} ${w - inset} ${h / 2} Q ${w - inset - 1} ${h - inset} ${w - e} ${h - inset} L ${e} ${h - inset} Q ${inset + 1} ${h - inset} ${inset} ${h / 2} Q ${inset + 1} ${inset} ${e} ${inset} Z`;
  return (
    <Svg width={w} height={h} style={{ position: 'absolute' }} pointerEvents="none">
      <Path d={outer} fill={mp.dark ? '#22302A' : '#F3EBD8'} stroke={mp.gold} strokeWidth={1.4} />
      <Path d={inner} fill="none" stroke={mp.gold} strokeWidth={0.6} opacity={0.8} />
      <Polygon points={star(e * 0.95, h / 2, h * 0.22)} fill={mp.green} opacity={0.85} />
      <Polygon points={star(w - e * 0.95, h / 2, h * 0.22)} fill={mp.green} opacity={0.85} />
    </Svg>
  );
}

/** The first two pages: the text sits in an arched panel, as in the printed Madani Mushaf. */
function Arch({ w, h, mp }: { w: number; h: number; mp: MP }) {
  const a = Math.min(w * 0.2, 70);
  const path = (k: number) => `M ${k} ${h - k} L ${k} ${a + k} Q ${k} ${k + a * 0.15} ${w / 2} ${k} Q ${w - k} ${k + a * 0.15} ${w - k} ${a + k} L ${w - k} ${h - k} Z`;
  return (
    <View style={{ position: 'absolute', left: 0, right: 0, alignItems: 'center' }} pointerEvents="none">
      <Svg width={w} height={h}>
        <Path d={path(1)} fill={mp.dark ? '#1C2722' : '#FAF3E3'} stroke={mp.gold} strokeWidth={1.4} />
        <Path d={path(6)} fill="none" stroke={mp.gold} strokeWidth={0.6} opacity={0.8} />
        <Polygon points={star(w / 2, a * 0.42, 9)} fill={mp.green} opacity={0.85} />
      </Svg>
    </View>
  );
}

/** The page number in an eight-point star. */
function Medallion({ n, mp }: { n: number; mp: MP }) {
  const s = 36;
  return (
    <View style={{ width: s, height: s, alignItems: 'center', justifyContent: 'center' }}>
      <Svg width={s} height={s} style={StyleSheet.absoluteFill}>
        <Polygon points={star(s / 2, s / 2, s / 2 - 1)} fill={mp.paper} stroke={mp.gold} strokeWidth={1} />
      </Svg>
      <Text style={{ fontFamily: fonts.arabic, fontSize: n > 99 ? 11 : 13, color: mp.ink, lineHeight: 20 }}>{arNum(n)}</Text>
    </View>
  );
}

// The Uthmanic Hafs font once loaded, otherwise the app's Arabic font.
const hafsOr = () => (ExpoFont.isLoaded(HAFS) ? HAFS : fonts.arabic);

const styles = StyleSheet.create({
  root: { flex: 1 },
  top: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 14, paddingBottom: 10 },
  topTitle: { fontFamily: fonts.read, fontSize: 19, letterSpacing: -0.2 },
  topSub: { fontFamily: fonts.ui, fontSize: 12 },
  x: { width: 36, height: 36, borderRadius: 18, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  pill: { height: 36, paddingHorizontal: 12, borderRadius: 18, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  pillText: { fontFamily: fonts.uiBold, fontSize: 13 },
  page: { paddingTop: 10, alignItems: 'center' },
  sheet: { borderRadius: 10, shadowOpacity: 0.16, shadowRadius: 18, shadowOffset: { width: 0, height: 6 }, elevation: 4 },
  margin: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end', paddingBottom: 2 },
  marginText: { fontFamily: fonts.arabic, fontSize: 12.5 },
  measure: { position: 'absolute', opacity: 0, left: 0, top: 0 },
  headLine: { alignItems: 'center', justifyContent: 'center' },
  headText: { fontFamily: fonts.arabic },
  bottom: { alignItems: 'center', paddingTop: 6 },
  small: { fontFamily: fonts.ui, fontSize: 12, lineHeight: 17 },
  actions: { borderTopWidth: StyleSheet.hairlineWidth, paddingTop: 10, paddingHorizontal: 16, gap: 6 },
  actTitle: { fontFamily: fonts.uiBold, fontSize: 14, textAlign: 'center' },
  actRow: { flexDirection: 'row', justifyContent: 'space-around' },
  act: { alignItems: 'center', gap: 3, padding: 6, minWidth: 64 },
  actLabel: { fontFamily: fonts.uiSemi, fontSize: 12 },
});
