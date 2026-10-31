import { memo, ReactNode, useEffect, useMemo, useReducer, useRef, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import Animated, { Easing, SharedValue, useAnimatedStyle, useReducedMotion, useSharedValue, withTiming } from 'react-native-reanimated';
import { arabicNumber, LANGS, LangId, loadChapter, MOODS, MoodId, translationFor, Verse } from '@/lib/quran';
import { fonts, mix, Palette, Tone } from '@/lib/theme';
import { Icon } from './Icon';
import { Pattern } from './Pattern';

type Props = {
  verse: Verse;
  tone: Tone;
  pal: Palette;
  height: number;
  topInset: number;
  bottomInset: number;
  active: boolean;
  lang: LangId;
  showTl: boolean;
  mood: MoodId | null;
  liked: boolean;
  saved: boolean;
  playing: boolean;
  playingAyah: number | null;
  /** The word being recited right now in the playing ayah (1-based), with how many words the timings cover. */
  playingWord?: { pos: number; of: number } | null;
  first: boolean;
  onLike: () => void;
  onDoubleTap: () => void;
  /** A single tap on the ayah (after waiting to rule out a double tap): pause or play. */
  onSingleTap?: () => void;
  /** Recitation is paused on this card. */
  paused?: boolean;
  onSave: () => void;
  onListen: () => void;
  onShare: () => void;
  onKeepReading: () => void;
  onContext: () => void;
  /** Memorise: how many times to loop the recitation, and where the loop is ("2 of 5"). */
  repeat: number;
  repeatLabel: string | null;
  onRepeat: (n: number) => void;
  onMemorised: () => void;
  likeCount: number | null;
  reflectionCount: number | null;
  /** Null when reflections aren't available (no database yet). */
  onReflections: (() => void) | null;
  /** Shared by the whole feed: 1 = controls visible, 0 = faded away while reading. */
  chrome: SharedValue<number>;
  chromeOn: boolean;
  /** A single tap on the card (brings the controls back). */
  onTap: () => void;
  /** Opens "Someone to talk to" (shown on cards for heavier feelings such as grief, divorce or conflict). */
  onSupport: () => void;
};

const EASE = Easing.bezier(0.2, 0.7, 0.2, 1);
/** Total length of the entrance, in ms of "progress" time. */
const TOTAL = 4000;
/** When the last Arabic word has finished appearing. The translation waits for this, so the Arabic arrives alone. */
const arabicDone = (words: number) => 140 + Math.min(words, 26) * 45 + 600;

/** Fades and lifts a block in when progress passes `start` (ms). */
function Reveal({ p, start, dur = 550, dx = 0, dy = 14, children, style }: { p: SharedValue<number>; start: number; dur?: number; dx?: number; dy?: number; children: ReactNode; style?: object }) {
  const a = useAnimatedStyle(() => {
    const t = Math.min(1, Math.max(0, (p.value * TOTAL - start) / dur));
    const e = 1 - Math.pow(1 - t, 3);
    return { opacity: e, transform: [{ translateX: dx * (1 - e) }, { translateY: dy * (1 - e) }] };
  });
  return <Animated.View style={[style, a]}>{children}</Animated.View>;
}

/** One Arabic word, appearing right to left. */
const Word = memo(function Word({ p, i, text, color, size, hidden, tint, onPeek }: { p: SharedValue<number>; i: number; text: string; color: string; size: number; hidden?: boolean; tint?: string; onPeek?: () => void }) {
  const start = 140 + Math.min(i, 26) * 45;
  const a = useAnimatedStyle(() => {
    const t = Math.min(1, Math.max(0, (p.value * TOTAL - start) / 600));
    return { opacity: t, transform: [{ translateY: 5 * (1 - t) }] };
  });
  const t = (
    <Animated.Text style={[{ fontFamily: fonts.arabic, fontSize: size, lineHeight: size * 1.9, color: hidden ? 'transparent' : color }, a]}>{text}</Animated.Text>
  );
  if (!hidden) return t;
  // A hidden word in "Test me": a soft block you can tap to peek at.
  return (
    <Pressable onPress={onPeek} accessibilityRole="button" accessibilityLabel="Hidden word, tap to show">
      <View style={{ backgroundColor: tint, borderRadius: 6, marginHorizontal: 1, marginVertical: 3 }}>{t}</View>
    </Pressable>
  );
});

/** A fixed shuffle per card, so "hide more" always hides the same words first. */
function hideOrder(n: number, seed: string) {
  let x = [...seed].reduce((a, c) => (a * 31 + c.charCodeAt(0)) % 2147483647, 7);
  const r = () => (x = (x * 1103515245 + 12345) % 2147483648) / 2147483648;
  const a = [...Array(n).keys()];
  for (let i = n - 1; i > 0; i--) {
    const j = Math.floor(r() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function Hairline({ p, color, start }: { p: SharedValue<number>; color: string; start: number }) {
  const a = useAnimatedStyle(() => {
    const t = Math.min(1, Math.max(0, (p.value * TOTAL - start) / 800));
    const e = t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
    return { transform: [{ scaleX: e }] };
  });
  // Grows from the right, the way the Arabic is read.
  return <Animated.View style={[{ height: StyleSheet.hairlineWidth * 2, backgroundColor: color, transformOrigin: 'right' }, a]} />;
}

export const VerseCard = memo(function VerseCard(props: Props) {
  const { verse: v, tone, pal, height, topInset, bottomInset, active, lang, showTl, mood, liked, saved, playing, playingAyah, first } = props;
  const reduce = useReducedMotion();
  const p = useSharedValue(0);
  const lastTap = useRef(0);
  const [, rerender] = useReducer((n: number) => n + 1, 0);
  const [memOpen, setMemOpen] = useState(false);
  const [hideLevel, setHideLevel] = useState(0); // 0–4 quarters of the words hidden
  const [peeked, setPeeked] = useState<Set<number>>(new Set());

  useEffect(() => {
    if (!active) return;
    if (reduce) {
      p.value = 1;
      return;
    }
    p.value = 0;
    p.value = withTiming(1, { duration: TOTAL, easing: Easing.linear });
  }, [active, reduce, p]);

  const text = pal.text;
  const soft = mix(tone.bg, text, 0.38);
  const muted = mix(tone.bg, text, 0.62);
  const line = mix(tone.bg, text, 0.16);
  const arLen = v.ar.reduce((n, [t]) => n + t.length, 0);
  // Long passages shrink step by step until the whole card fits on one screen, so a swipe always moves to the next card.
  const [fit, setFit] = useState(1);
  const viewport = useRef(0);
  const content = useRef(0);
  const checkFit = () => {
    if (!memOpen && viewport.current && content.current > viewport.current + 2 && fit > 0.55) setFit((f) => Math.max(0.55, f * 0.88));
  };
  useEffect(() => setFit(1), [v.k, lang, showTl]);
  const arSize = (arLen > 520 ? 24 : arLen > 240 ? 27 : 32) * fit;
  const trSize = (arLen > 520 ? 16 : arLen > 240 ? 17 : 18.5) * Math.max(0.82, fit);
  const L = LANGS.find((l) => l.id === lang)!;
  const tr = translationFor(v, lang);
  // Ladder passages read their translation from the loaded surah; fetch it if it isn't here yet.
  useEffect(() => {
    if (!tr) loadChapter(v.s, lang).then(rerender, () => {});
  }, [tr, v.s, lang]);

  const wordCount = useMemo(() => v.ar.reduce((n, [t]) => n + t.split(' ').filter(Boolean).length, 0), [v]);
  const hidden = useMemo(() => {
    const order = hideOrder(wordCount, v.k);
    return new Set(order.slice(0, Math.ceil((wordCount * hideLevel) / 4)));
  }, [wordCount, v.k, hideLevel]);
  const testing = hideLevel > 0;
  const ae = arabicDone(wordCount + v.ar.length);
  const chromeStyle = useAnimatedStyle(() => ({ opacity: props.chrome.value }));
  const tint = mix(tone.bg, tone.accent, 0.2);
  const rtlTr = lang === 'ur';
  const moodHit = mood && v.tags.includes(mood) ? MOODS.find((m) => m.id === mood) : null;

  // Every word (and each ayah-end marker) is its own element in one right-to-left wrapping row,
  // so the words can appear one by one and lines wrap naturally.
  let wordIndex = 0;
  let textWord = 0;
  const arabic = v.ar.flatMap(([t, n]) => {
    const dim = playing && playingAyah !== null && playingAyah !== n;
    const col = dim ? soft : text;
    const words = t.split(' ').filter(Boolean);
    // Light up the word being recited, but only when the timings line up with this text word for word.
    const pw = props.playingWord;
    const said = playing && playingAyah === n && pw && pw.of === words.length ? pw.pos - 1 : -1;
    const els = words.map((w, k) => {
      const i = wordIndex++;
      const tw = textWord++;
      const hide = testing && hidden.has(tw) && !peeked.has(tw);
      return <Word key={i} p={p} i={i} text={w + ' '} color={k === said ? tone.accent : col} size={arSize} hidden={hide} tint={tint} onPeek={() => setPeeked((s) => new Set(s).add(tw))} />;
    });
    const i = wordIndex++;
    els.push(<Word key={i} p={p} i={i} text={`۝${arabicNumber(n)} `} color={tone.accent} size={arSize * 0.72} />);
    return els;
  });

  // One tap pauses or plays; two quick taps like. The single tap waits a moment so a double tap doesn't also pause.
  const tapTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => () => void (tapTimer.current && clearTimeout(tapTimer.current)), []);
  const onBodyPress = () => {
    const now = Date.now();
    if (now - lastTap.current < 280) {
      if (tapTimer.current) clearTimeout(tapTimer.current);
      tapTimer.current = null;
      props.onDoubleTap();
      lastTap.current = 0;
    } else {
      lastTap.current = now;
      tapTimer.current = setTimeout(() => {
        tapTimer.current = null;
        props.onSingleTap?.();
      }, 280);
    }
  };

  return (
    // Any touch on the card brings the faded controls back.
    <View onTouchStart={props.onTap} style={[styles.card, { height, backgroundColor: tone.bg, paddingTop: topInset + 64, paddingBottom: bottomInset + 24 }]}>
      <Pattern color={tone.accent} top={topInset} />
      {props.paused && (
        <View pointerEvents="none" style={styles.pausedWrap} accessibilityLiveRegion="polite" accessibilityLabel="Paused">
          <View style={[styles.pausedDot, { backgroundColor: mix(tone.bg, text, 0.55) }]}>
            <Icon name="play" size={30} color={tone.bg} fill strokeWidth={2} />
          </View>
        </View>
      )}
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollInner}
        showsVerticalScrollIndicator={false}
        nestedScrollEnabled
        onLayout={(e) => {
          viewport.current = e.nativeEvent.layout.height;
          checkFit();
        }}
        onContentSizeChange={(_, h) => {
          content.current = h;
          checkFit();
        }}
      >
        <Pressable onPress={onBodyPress} style={styles.stage} accessible={false}>
          <Reveal p={p} start={0} style={styles.ref}>
            <View style={[styles.keyChip, { backgroundColor: tone.accent }]}>
              <Text style={[styles.keyText, { color: pal.dark ? tone.bg : '#FFFFFF' }]}>{v.k.replace('-', '–')}</Text>
            </View>
            <Text style={[styles.refText, { color: mix(tone.bg, text, 0.78) }]} numberOfLines={1}>
              {v.name} · {v.meaning}
            </Text>
            <Text style={[styles.refAr, { color: muted }]} numberOfLines={1}>{v.ar_name}</Text>
          </Reveal>
          {moodHit && (
            <Reveal p={p} start={60}>
              <Text style={[styles.because, { color: tone.accent }]}>
                {moodHit.when}
                {moodHit.help ? (
                  <Text onPress={props.onSupport} style={{ color: muted, textDecorationLine: 'underline' }} accessibilityRole="link">
                    {'  ·  Someone to talk to'}
                  </Text>
                ) : null}
              </Text>
            </Reveal>
          )}

          <View style={styles.arabic} accessibilityLanguage="ar" accessible accessibilityLabel={v.ar.map(([t]) => t).join(' ')}>
            {arabic}
          </View>

          {showTl && (
            <Reveal p={p} start={ae}>
              <Text style={[styles.tl, { color: tone.accent, fontSize: trSize - 2 }]}>
                {v.tl.map((t, j) => (
                  <Text key={j} style={{ opacity: playing && playingAyah !== null && playingAyah !== v.ar[j][1] ? 0.45 : 1 }}>
                    {v.tl.length > 1 ? `(${v.ar[j][1]}) ` : ''}
                    {t}{' '}
                  </Text>
                ))}
              </Text>
              {first && <Text style={[styles.tlKey, { color: muted }]}>ʿ = the letter ʿayn · capital S, D, T, Z = heavy letters</Text>}
            </Reveal>
          )}

          <Hairline p={p} color={line} start={ae - 150} />

          <Reveal p={p} start={ae + 250} dur={700}>
            <Text style={[styles.tr, { color: text, fontSize: trSize, lineHeight: trSize * (rtlTr ? 2.1 : 1.5), textAlign: rtlTr ? 'right' : 'left', writingDirection: rtlTr ? 'rtl' : 'ltr' }]}>
              {tr ? tr.map((t, j) => (tr.length > 1 ? `(${v.a + j}) ${t}` : t)).join(' ') : 'Loading translation…'}
            </Text>
            <Text style={[styles.by, { color: muted }]}>{L.by}</Text>
          </Reveal>

          <Reveal p={p} start={ae + 700}>
           <Animated.View style={[styles.tools, !memOpen && chromeStyle]} pointerEvents={props.chromeOn || memOpen ? 'box-none' : 'none'}>
            <Pressable onPress={props.onKeepReading} style={[styles.tool, { borderColor: tone.accent }]} accessibilityRole="button">
              <Icon name="book" size={16} color={tone.accent} />
              <Text style={[styles.toolText, { color: tone.accent }]}>Keep reading</Text>
            </Pressable>
            <Pressable onPress={() => setMemOpen((o) => !o)} style={[styles.tool, { borderColor: memOpen ? tone.accent : line }]} accessibilityRole="button" accessibilityState={{ expanded: memOpen }}>
              <Text style={[styles.toolText, { color: memOpen ? tone.accent : text }]}>Memorise</Text>
            </Pressable>
            {!!v.note && (
              <Pressable onPress={props.onContext} style={[styles.tool, { borderColor: line }]} accessibilityRole="button">
                <Text style={[styles.toolText, { color: text }]}>Context</Text>
              </Pressable>
            )}
           </Animated.View>
          </Reveal>

          {memOpen && (
            <View style={[styles.mem, { borderColor: mix(tone.bg, tone.accent, 0.4), backgroundColor: mix(tone.bg, tone.accent, 0.06) }]}>
              <View style={styles.memRow}>
                <Text style={[styles.memLabel, { color: muted }]}>REPEAT</Text>
                {[1, 3, 5, 10].map((n) => {
                  const on = props.repeat === n;
                  return (
                    <Pressable key={n} onPress={() => props.onRepeat(n)} style={[styles.chip, { borderColor: on ? tone.accent : line, backgroundColor: on ? tone.accent : 'transparent' }]} accessibilityRole="button" accessibilityState={{ selected: on }}>
                      <Text style={[styles.chipText, { color: on ? tone.bg : text }]}>{n}×</Text>
                    </Pressable>
                  );
                })}
                {!!props.repeatLabel && <Text style={[styles.chipText, { color: tone.accent }]}>{props.repeatLabel}</Text>}
              </View>
              <View style={styles.memRow}>
                <Text style={[styles.memLabel, { color: muted }]}>TEST ME</Text>
                <Pressable
                  disabled={hideLevel >= 4}
                  onPress={() => {
                    setHideLevel((l) => Math.min(4, l + 1));
                    setPeeked(new Set());
                  }}
                  style={[styles.chip, { borderColor: line, opacity: hideLevel >= 4 ? 0.45 : 1 }]}
                  accessibilityRole="button"
                >
                  <Text style={[styles.chipText, { color: text }]}>{hideLevel === 0 ? 'Hide words' : hideLevel < 4 ? `Hide more (${hideLevel * 25}%)` : 'All hidden'}</Text>
                </Pressable>
                <Pressable
                  disabled={hideLevel === 0}
                  onPress={() => {
                    if (hideLevel >= 4) props.onMemorised();
                    setHideLevel(0);
                    setPeeked(new Set());
                  }}
                  style={[styles.chip, { borderColor: line, opacity: hideLevel === 0 ? 0.45 : 1 }]}
                  accessibilityRole="button"
                >
                  <Text style={[styles.chipText, { color: text }]}>Show all</Text>
                </Pressable>
              </View>
              <Text style={[styles.memNote, { color: muted }]}>
                {hideLevel >= 4 ? 'Recite the whole ayah from memory, then tap Show all to check.' : 'Loop the recitation, then hide words and recite from memory. Tap a hidden word to peek.'}
              </Text>
            </View>
          )}
        </Pressable>
      </ScrollView>

      <Animated.View style={[styles.rail, { bottom: bottomInset + 28 }, chromeStyle]} pointerEvents={props.chromeOn ? 'box-none' : 'none'}>
        <RailButton p={p} i={0} label={props.likeCount != null ? String(props.likeCount) : 'Like'} a11y="Like" onPress={props.onLike} color={liked ? tone.accent : text}>
          <Icon name="heart" size={27} color={liked ? tone.accent : text} fill={liked} />
        </RailButton>
        {props.onReflections && (
          <RailButton p={p} i={1} label={props.reflectionCount ? String(props.reflectionCount) : 'Reflect'} a11y="Reflections" onPress={props.onReflections} color={text}>
            <Icon name="chat" size={27} color={text} />
          </RailButton>
        )}
        <RailButton p={p} i={1} label={saved ? 'Saved' : 'Save'} onPress={props.onSave} color={saved ? tone.accent : text}>
          <Icon name="save" size={27} color={saved ? tone.accent : text} fill={saved} />
        </RailButton>
        <RailButton p={p} i={2} label="Share" onPress={props.onShare} color={text}>
          <Icon name="share" size={27} color={text} />
        </RailButton>
        <RailButton p={p} i={3} label={playing && !props.paused ? 'Pause' : 'Listen'} onPress={props.onListen} color={text}>
          <View style={[styles.playSquare, { backgroundColor: playing && !props.paused ? tone.accent : text }]}>
            <Icon name={playing && !props.paused ? 'pause' : 'play'} size={20} color={tone.bg} fill={!(playing && !props.paused)} strokeWidth={2.2} />
          </View>
        </RailButton>
      </Animated.View>

      {first && <Text style={[styles.hint, { color: muted, bottom: bottomInset + 6 }]}>Swipe up for the next ayah · tap to pause · double-tap to like</Text>}
    </View>
  );
});

function RailButton({ p, i, label, a11y, onPress, color, children }: { p: SharedValue<number>; i: number; label: string; a11y?: string; onPress: () => void; color: string; children: ReactNode }) {
  return (
    <Reveal p={p} start={i * 50} dur={450} dx={10} dy={0}>
      <Pressable onPress={onPress} style={styles.railBtn} accessibilityRole="button" accessibilityLabel={a11y ? `${a11y}, ${label}` : label} hitSlop={6}>
        {children}
        <Text style={[styles.railLabel, { color }]}>{label}</Text>
      </Pressable>
    </Reveal>
  );
}

const styles = StyleSheet.create({
  pausedWrap: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, alignItems: 'center', justifyContent: 'center', zIndex: 5 },
  pausedDot: { width: 72, height: 72, borderRadius: 36, alignItems: 'center', justifyContent: 'center', paddingLeft: 4, opacity: 0.75 },
  card: { width: '100%', paddingLeft: 20, paddingRight: 78 },
  scroll: { flex: 1 },
  scrollInner: { flexGrow: 1, justifyContent: 'center' },
  stage: { gap: 22 },
  ref: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  keyChip: { borderRadius: 6, paddingHorizontal: 8, paddingVertical: 3 },
  keyText: { fontFamily: fonts.uiBold, fontSize: 13, fontVariant: ['tabular-nums'] },
  refText: { fontFamily: fonts.ui, fontSize: 14, flexShrink: 1 },
  refAr: { fontFamily: fonts.arabic, fontSize: 16, marginLeft: 'auto', flexShrink: 0, paddingLeft: 8 },
  because: { fontFamily: fonts.uiSemi, fontSize: 13, marginTop: -10 },
  arabic: { flexDirection: 'row-reverse', flexWrap: 'wrap', alignItems: 'center' },
  tl: { fontFamily: fonts.readItalic, lineHeight: 26, textAlign: 'right', marginTop: -8 },
  tlKey: { fontFamily: fonts.ui, fontSize: 12, textAlign: 'right', marginTop: 4 },
  tr: { fontFamily: fonts.read },
  by: { fontFamily: fonts.ui, fontSize: 12, marginTop: 10 },
  tools: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  tool: { flexDirection: 'row', alignItems: 'center', gap: 6, borderWidth: 1, borderRadius: 8, paddingHorizontal: 12, paddingVertical: 8, minHeight: 40 },
  toolText: { fontFamily: fonts.uiSemi, fontSize: 13 },
  rail: { position: 'absolute', right: 10, alignItems: 'center', gap: 12 },
  railBtn: { alignItems: 'center', gap: 3, minWidth: 52, minHeight: 44 },
  railLabel: { fontFamily: fonts.uiSemi, fontSize: 11 },
  playSquare: { width: 48, height: 48, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  mem: { borderWidth: 1, borderRadius: 10, padding: 12, gap: 10 },
  memRow: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 6 },
  memLabel: { fontFamily: fonts.uiBold, fontSize: 10, letterSpacing: 1, minWidth: 58 },
  chip: { borderWidth: 1, borderRadius: 7, paddingHorizontal: 10, paddingVertical: 6, minHeight: 34, justifyContent: 'center' },
  chipText: { fontFamily: fonts.uiBold, fontSize: 13, fontVariant: ['tabular-nums'] },
  memNote: { fontFamily: fonts.ui, fontSize: 12, lineHeight: 17 },
  hint: { position: 'absolute', left: 0, right: 0, textAlign: 'center', fontFamily: fonts.ui, fontSize: 11, letterSpacing: 0.6 },
});
