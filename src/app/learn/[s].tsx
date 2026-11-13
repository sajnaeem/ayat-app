import { useAudioPlayer, useAudioPlayerStatus } from 'expo-audio';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Icon } from '@/components/Icon';
import { useToast } from '@/components/Toast';
import { LearnAyah } from '@/data/learn';
import { ayahAudio, wordAt } from '@/lib/audio';
import { learnSurah } from '@/lib/learn';
import { useProgress } from '@/lib/progress';
import { ayahWords, SURAHS } from '@/lib/quran';
import { textScale, usePrefs } from '@/lib/store';
import { fonts, mix, Palette, usePalette } from '@/lib/theme';

const REPEATS = [1, 3, 5];
type Play = { mode: 'one' | 'all'; i: number; left: number } | null;

/**
 * Learn one surah for prayer: one ayah at a time (listen, repeat, hide the words and test yourself),
 * then the whole surah together. Recited by al-Husary, slow and clear, at the reader's chosen speed.
 */
export default function LearnSurahScreen() {
  const { s } = useLocalSearchParams<{ s: string }>();
  const l = learnSurah(Number(s));
  const pal = usePalette();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const prefs = usePrefs();
  const toast = useToast();
  const { progress, markMemorised } = useProgress();
  const [step, setStep] = useState(0); // 0..n-1 one ayah; n = all together
  const [hide, setHide] = useState(false);
  const [shown, setShown] = useState<Set<string>>(new Set());
  const [repeat, setRepeat] = useState(3);
  const [play, setPlay] = useState<Play>(null);
  const [word, setWord] = useState<{ i: number; pos: number } | null>(null);
  const timings = useRef<[number, number, number][]>([]);
  const player = useAudioPlayer(null, { updateInterval: 150 });
  const status = useAudioPlayerStatus(player);
  const scale = textScale(prefs.textSize);

  const start = async (p: NonNullable<Play>) => {
    if (!l) return;
    setPlay(p);
    setWord(null);
    const a = await ayahAudio('husary', l.s, p.i + 1);
    timings.current = a.words;
    player.replace({ uri: a.url });
    try {
      player.setPlaybackRate(prefs.speed ?? 1, 'high');
    } catch {}
    player.play();
  };
  const stop = () => {
    player.pause();
    setPlay(null);
    setWord(null);
  };

  // Light the word being recited.
  useEffect(() => {
    if (!play || !timings.current.length) return;
    const pos = wordAt(timings.current, (status.currentTime ?? 0) * 1000);
    setWord((w) => (pos == null ? null : w?.i === play.i && w.pos === pos ? w : { i: play.i, pos }));
  }, [status.currentTime, play]);

  // When an ayah ends: repeat it, move to the next one (all together), or stop.
  useEffect(() => {
    if (!status.didJustFinish || !play || !l) return;
    if (play.mode === 'one' && play.left > 1) {
      setPlay({ ...play, left: play.left - 1 });
      setWord(null);
      player.seekTo(0).then(() => player.play()).catch(() => {});
    } else if (play.mode === 'all' && play.i < l.ayat.length - 1) start({ mode: 'all', i: play.i + 1, left: 1 });
    else stop();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status.didJustFinish]);

  useEffect(() => () => player.pause(), [player]);
  useEffect(() => {
    stop();
    setShown(new Set());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step]);

  if (!l) return null;
  const n = l.ayat.length;
  const all = step >= n;
  const key = (i: number) => `${l.s}:${i + 1}`;
  const known = (i: number) => !!progress.mem[key(i)];

  const iKnowIt = () => {
    markMemorised([key(step)]);
    if (step < n - 1) setStep(step + 1);
    else setStep(n);
  };
  const finish = () => {
    markMemorised(l.ayat.map((_, i) => key(i)));
    stop();
    toast(`${l.name} is ready for your prayer`);
    router.back();
  };

  return (
    <View style={[styles.root, { backgroundColor: pal.bg }]}>
      <View style={[styles.head, { paddingTop: insets.top + 8 }]}>
        <Pressable onPress={() => router.back()} style={[styles.x, { borderColor: pal.line }]} accessibilityRole="button" accessibilityLabel="Back to the list" hitSlop={8}>
          <View style={{ transform: [{ rotate: '180deg' }] }}>
            <Icon name="chevron" size={18} color={pal.text} />
          </View>
        </Pressable>
        <View style={{ flex: 1, alignItems: 'center' }}>
          <Text style={[styles.title, { color: pal.text }]}>{l.name}</Text>
          <Text style={[styles.small, { color: pal.muted }]}>{l.meaning}</Text>
        </View>
        <Text style={[styles.arTitle, { color: pal.text }]}>{SURAHS[l.s - 1][1]}</Text>
      </View>

      {/* Steps: one dot per ayah, then "all" */}
      <View style={styles.dots}>
        {l.ayat.map((_, i) => (
          <Pressable key={i} onPress={() => setStep(i)} hitSlop={6} accessibilityRole="button" accessibilityLabel={`Ayah ${i + 1}${known(i) ? ', learned' : ''}`}>
            <View style={[styles.dot, { backgroundColor: i === step ? pal.accent : known(i) ? mix(pal.bg, pal.accent, 0.45) : pal.line, width: i === step ? 22 : 8 }]} />
          </Pressable>
        ))}
        <Pressable onPress={() => setStep(n)} hitSlop={6} accessibilityRole="button" accessibilityLabel="The whole surah">
          <Text style={[styles.allDot, { color: all ? pal.accent : pal.muted }]}>All</Text>
        </Pressable>
      </View>

      <ScrollView contentContainerStyle={{ padding: 18, gap: 14, paddingBottom: insets.bottom + 200 }}>
        {!all ? (
          <>
            <Text style={[styles.eyebrow, { color: pal.accent }]}>
              AYAH {step + 1} OF {n}
              {known(step) ? ' · LEARNED' : ''}
            </Text>
            <AyahBlock a={l.ayat[step]} i={step} pal={pal} scale={scale} hide={hide} shown={shown} reveal={(k) => setShown((x) => new Set(x).add(k))} word={word} big />
          </>
        ) : (
          <>
            <Text style={[styles.eyebrow, { color: pal.accent }]}>PUT IT TOGETHER</Text>
            <Text style={[styles.small, { color: pal.muted }]}>Listen to the whole surah, then hide the words and say it yourself.</Text>
            {l.ayat.map((a, i) => (
              <View key={i} style={{ opacity: play?.mode === 'all' && play.i !== i ? 0.5 : 1 }}>
                <AyahBlock a={a} i={i} pal={pal} scale={scale * 0.85} hide={hide} shown={shown} reveal={(k) => setShown((x) => new Set(x).add(k))} word={word} />
              </View>
            ))}
          </>
        )}
        <Text style={[styles.small, { color: pal.muted }]}>{l.note}</Text>
      </ScrollView>

      {/* Controls */}
      <View style={[styles.dock, { paddingBottom: insets.bottom + 12, backgroundColor: pal.surface, borderColor: pal.line }]}>
        <View style={styles.dockRow}>
          <Pressable
            onPress={() => (play ? stop() : start(all ? { mode: 'all', i: 0, left: 1 } : { mode: 'one', i: step, left: repeat }))}
            style={[styles.play, { backgroundColor: pal.text }]}
            accessibilityRole="button"
            accessibilityLabel={play ? 'Stop' : all ? 'Play the whole surah' : `Play this ayah ${repeat} times`}
          >
            <Icon name={play ? 'pause' : 'play'} size={20} color={pal.bg} fill />
          </Pressable>
          {!all ? (
            <View style={styles.chips}>
              {REPEATS.map((r) => (
                <Pressable key={r} onPress={() => setRepeat(r)} style={[styles.chip, { borderColor: repeat === r ? pal.accent : pal.line, backgroundColor: repeat === r ? mix(pal.surface, pal.accent, 0.1) : 'transparent' }]} accessibilityRole="radio" accessibilityState={{ checked: repeat === r }} accessibilityLabel={`Repeat ${r} times`}>
                  <Text style={[styles.chipText, { color: pal.text }]}>{r}×</Text>
                </Pressable>
              ))}
              {play?.mode === 'one' && <Text style={[styles.small, { color: pal.muted }]}>{play.left} left</Text>}
            </View>
          ) : (
            <Text style={[styles.small, { color: pal.muted, flex: 1 }]}>{play ? `Ayah ${play.i + 1} of ${n}` : 'Plays every ayah in order'}</Text>
          )}
          <Pressable
            onPress={() => {
              setHide((h) => !h);
              setShown(new Set());
            }}
            style={[styles.chip, { borderColor: hide ? pal.accent : pal.line, backgroundColor: hide ? mix(pal.surface, pal.accent, 0.1) : 'transparent' }]}
            accessibilityRole="switch"
            accessibilityState={{ checked: hide }}
          >
            <Text style={[styles.chipText, { color: pal.text }]}>{hide ? 'Show words' : 'Test me'}</Text>
          </Pressable>
        </View>
        {!all ? (
          <View style={styles.dockRow}>
            <Pressable onPress={iKnowIt} style={[styles.main, { backgroundColor: pal.accent }]} accessibilityRole="button">
              <Text style={[styles.mainText, { color: pal.onAccent }]}>{step < n - 1 ? 'I can say it · next ayah' : 'I can say it · put it together'}</Text>
            </Pressable>
          </View>
        ) : (
          <View style={styles.dockRow}>
            <Pressable onPress={finish} style={[styles.main, { backgroundColor: pal.accent }]} accessibilityRole="button">
              <Text style={[styles.mainText, { color: pal.onAccent }]}>I know this surah</Text>
            </Pressable>
          </View>
        )}
      </View>
    </View>
  );
}

function AyahBlock({ a, i, pal, scale, hide, shown, reveal, word, big }: { a: LearnAyah; i: number; pal: Palette; scale: number; hide: boolean; shown: Set<string>; reveal: (k: string) => void; word: { i: number; pos: number } | null; big?: boolean }) {
  const words = ayahWords(a.ar);
  const size = (big ? 34 : 28) * scale;
  return (
    <View style={[styles.block, { backgroundColor: pal.surface }]}>
      <View style={styles.words}>
        {words.map((w, j) => {
          const k = `${i}:${j}`;
          const hidden = hide && j > 0 && !shown.has(k);
          const lit = word?.i === i && word.pos === j + 1;
          return (
            <Pressable key={k} onPress={() => hidden && reveal(k)} disabled={!hidden} accessibilityLabel={hidden ? 'Hidden word, tap to show' : undefined}>
              <Text
                style={[
                  styles.ar,
                  { fontSize: size, lineHeight: size * 1.85, color: hidden ? 'transparent' : lit ? pal.accent : pal.text },
                  hidden && { backgroundColor: mix(pal.surface, pal.text, 0.08), borderRadius: 8 },
                ]}
              >
                {w}
              </Text>
            </Pressable>
          );
        })}
      </View>
      {!hide && <Text style={[styles.tl, { color: pal.accent, fontSize: (big ? 18 : 15) * scale }]}>{a.tl}</Text>}
      <Text style={[styles.en, { color: pal.muted, fontSize: (big ? 16 : 14) * scale }]}>
        ({i + 1}) {a.en}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  head: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 16, paddingBottom: 8 },
  x: { width: 36, height: 36, borderRadius: 18, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  title: { fontFamily: fonts.uiBold, fontSize: 19 },
  arTitle: { fontFamily: fonts.arabic, fontSize: 20, minWidth: 36, textAlign: 'right' },
  small: { fontFamily: fonts.ui, fontSize: 13, lineHeight: 18 },
  dots: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 8, flexWrap: 'wrap', paddingHorizontal: 16 },
  dot: { height: 8, borderRadius: 4 },
  allDot: { fontFamily: fonts.uiBold, fontSize: 12, marginLeft: 4 },
  eyebrow: { fontFamily: fonts.uiBold, fontSize: 11.5, letterSpacing: 1.2 },
  block: { borderRadius: 16, padding: 16, gap: 10 },
  words: { flexDirection: 'row-reverse', flexWrap: 'wrap', columnGap: 8 },
  ar: { fontFamily: fonts.arabic, writingDirection: 'rtl', paddingHorizontal: 2 },
  tl: { fontFamily: fonts.uiSemi, lineHeight: 26 },
  en: { fontFamily: fonts.read, lineHeight: 23 },
  dock: { position: 'absolute', left: 0, right: 0, bottom: 0, borderTopWidth: StyleSheet.hairlineWidth, paddingHorizontal: 16, paddingTop: 12, gap: 10 },
  dockRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  play: { width: 50, height: 50, borderRadius: 25, alignItems: 'center', justifyContent: 'center' },
  chips: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 6 },
  chip: { borderWidth: 1, borderRadius: 999, paddingHorizontal: 12, paddingVertical: 7 },
  chipText: { fontFamily: fonts.uiSemi, fontSize: 13.5 },
  main: { flex: 1, borderRadius: 14, minHeight: 50, alignItems: 'center', justifyContent: 'center' },
  mainText: { fontFamily: fonts.uiBold, fontSize: 15.5 },
});
