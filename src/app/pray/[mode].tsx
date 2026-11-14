import { stopRadio } from '@/lib/radio';
import { setAudioModeAsync, useAudioPlayer, useAudioPlayerStatus } from 'expo-audio';
import { activateKeepAwakeAsync, deactivateKeepAwake } from 'expo-keep-awake';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Image, Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Icon } from '@/components/Icon';
import { LEARN } from '@/data/learn';
import { Beat, LEARN_ORDER, PRAYERS, prayerBeats, SalahStep, STEPS, Words } from '@/data/salah';
import { SITE } from '@/lib/site';
import { poseArt } from '@/lib/art';
import { ayahAudio } from '@/lib/audio';
import { isLearned } from '@/lib/learn';
import { useProgress } from '@/lib/progress';
import { textScale, usePrefs } from '@/lib/store';
import { fonts, mix, Palette, usePalette } from '@/lib/theme';
import { FigureSwitch } from '@/components/FigureSwitch';

/** Short surahs offered for the "recite a surah" step (easiest first). */
const SURAH_CHOICES = [112, 108, 103, 114, 113];
const haptic = () => {
  if (Platform.OS === 'web') return;
  import('expo-haptics').then((h) => h.selectionAsync()).catch(() => {});
};

/**
 * One step at a time: "learn" walks through every position once (a two-rakʿah prayer); a prayer id
 * (fajr, dhuhr…) is "pray along": the whole prayer, rakʿah by rakʿah.
 */
export default function PrayStepper() {
  const { mode, at } = useLocalSearchParams<{ mode: string; at?: string }>();
  const prayer = PRAYERS.find((p) => p.id === mode);
  const beats: Beat[] = useMemo(() => (prayer ? prayerBeats(prayer.rakahs) : LEARN_ORDER.map((step) => ({ step, rakah: 0 }))), [prayer]);
  const pal = usePalette();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const prefs = usePrefs();
  const { progress } = useProgress();
  const fig = prefs.prayFigure ?? 'brother';
  const [i, setI] = useState(() => Math.min(Math.max(Number(at) || 0, 0), beats.length - 1));
  const [done, setDone] = useState(false);
  const scroller = useRef<React.ComponentRef<typeof ScrollView>>(null);
  const firstLearned = SURAH_CHOICES.find((s) => { const l = LEARN.find((x) => x.s === s); return l && isLearned(progress, l); });
  const [surah, setSurah] = useState(firstLearned ?? 112);

  const beat = beats[i];
  const step = STEPS[beat.step];
  const go = (d: number) => {
    haptic();
    if (i + d >= beats.length) return setDone(true);
    setI((x) => Math.min(Math.max(x + d, 0), beats.length - 1));
  };
  useEffect(() => scroller.current?.scrollTo({ y: 0, animated: false }), [i]);

  /* ---------- Guide me: the whole prayer recited step by step, moving on by itself (a learning aid) ---------- */
  const [guide, setGuide] = useState<'off' | 'on' | 'paused'>('off');
  const [now, setNow] = useState<{ ayah?: number; clip?: string } | null>(null);
  const player = useAudioPlayer(null, { updateInterval: 250 });
  const status = useAudioPlayerStatus(player);
  const queue = useRef<{ items: Item[]; at: number; token: number }>({ items: [], at: 0, token: 0 });
  const hold = useRef<ReturnType<typeof setTimeout> | null>(null);
  const clearHold = () => {
    if (hold.current) clearTimeout(hold.current);
    hold.current = null;
  };
  const playItem = (q: typeof queue.current) => {
    const it = q.items[q.at];
    if (!it) {
      // Everything for this step has been said: give a moment to move, then the next step.
      setNow(null);
      clearHold();
      hold.current = setTimeout(() => go(1), holdFor(step));
      return;
    }
    setNow(it.ayah != null ? { ayah: it.ayah } : { clip: it.clip });
    player.replace({ uri: it.url });
    try {
      player.setPlaybackRate(prefs.speed ?? 1, 'high');
    } catch {}
    player.play();
  };
  useEffect(() => {
    if (guide !== 'on') return;
    const token = ++queue.current.token;
    clearHold();
    stopRadio();
    (async () => {
      const items = await stepItems(step, surah);
      if (queue.current.token !== token) return;
      queue.current = { items, at: 0, token };
      playItem(queue.current);
    })();
    return () => {
      clearHold();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [guide, i]);
  useEffect(() => {
    if (guide !== 'on' || !status.didJustFinish) return;
    queue.current.at += 1;
    playItem(queue.current);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status.didJustFinish]);
  useEffect(() => {
    if (guide === 'off') {
      try { player.pause(); } catch {}
      clearHold();
      setNow(null);
      deactivateKeepAwake('pray').catch?.(() => {});
      return;
    }
    if (guide === 'paused') {
      try { player.pause(); } catch {}
      clearHold();
      return;
    }
    setAudioModeAsync({ playsInSilentMode: true, interruptionMode: 'doNotMix' }).catch(() => {});
    activateKeepAwakeAsync('pray').catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [guide]);
  useEffect(() => () => { clearHold(); deactivateKeepAwake('pray').catch?.(() => {}); }, []);
  // Leaving the last step ends the guide.
  useEffect(() => {
    if (done) setGuide('off');
  }, [done]);

  const top = prayer ? `${prayer.name} · Rakʿah ${beat.rakah} of ${prayer.rakahs}` : `Step ${i + 1} of ${beats.length}`;

  if (done)
    return (
      <View style={[styles.root, { backgroundColor: pal.bg, paddingTop: insets.top + 40, paddingBottom: insets.bottom + 24, paddingHorizontal: 22 }]}>
        <View style={{ flex: 1, justifyContent: 'center', gap: 14 }}>
          <View style={[styles.art, { backgroundColor: mix(pal.surface, pal.accent, 0.1), height: 260 }]}>
            <Image source={poseArt(fig, 'sit')} style={{ width: '100%', height: '100%' }} resizeMode="contain" />
          </View>
          <Text style={[styles.eyebrow, { color: pal.accent, textAlign: 'center' }]}>{prayer ? 'PRAYER COMPLETE' : 'THAT’S THE WHOLE PRAYER'}</Text>
          <Text style={[styles.doneTitle, { color: pal.text }]}>{prayer ? `You’ve prayed ${prayer.name}. May Allah accept it from you.` : 'Every step, from the first Allahu akbar to the salam.'}</Text>
          <Text style={[styles.body, { color: pal.muted, textAlign: 'center' }]}>
            {prayer ? 'Stay sitting a moment if you like: many remember Allah after the prayer, saying SubhanAllah, Alhamdulillah and Allahu akbar 33 times each.' : 'Next, try praying along with Fajr: two rakʿahs, with every step on screen. Go at your own pace; it gets easier every time.'}
          </Text>
        </View>
        <View style={{ gap: 10 }}>
          {prayer ? (
            <Pressable onPress={() => router.replace('/tasbeeh')} style={[styles.next, { backgroundColor: pal.text }]} accessibilityRole="button">
              <Text style={[styles.nextText, { color: pal.bg }]}>Remember Allah after prayer</Text>
            </Pressable>
          ) : (
            <Pressable onPress={() => { setDone(false); setI(0); router.setParams({ mode: 'fajr', at: '0' }); }} style={[styles.next, { backgroundColor: pal.text }]} accessibilityRole="button">
              <Text style={[styles.nextText, { color: pal.bg }]}>Pray along with Fajr</Text>
            </Pressable>
          )}
          <Pressable onPress={() => router.back()} style={[styles.back, { borderColor: pal.line }]} accessibilityRole="button">
            <Text style={[styles.backText, { color: pal.text }]}>Done</Text>
          </Pressable>
        </View>
      </View>
    );

  return (
    <View style={[styles.root, { backgroundColor: pal.bg }]}>
      <View style={[styles.head, { paddingTop: insets.top + 10 }]}>
        <Pressable onPress={() => router.back()} style={[styles.x, { borderColor: pal.line }]} accessibilityRole="button" accessibilityLabel="Close" hitSlop={8}>
          <Icon name="close" size={18} color={pal.text} />
        </Pressable>
        <Text style={[styles.top, { color: pal.text }]} numberOfLines={1}>{top}</Text>
        <View style={{ width: 36 }} />
      </View>
      <View style={[styles.track, { backgroundColor: mix(pal.bg, pal.text, 0.08) }]}>
        <View style={[styles.fill, { backgroundColor: pal.accent, width: `${((i + 1) / beats.length) * 100}%` }]} />
      </View>

      <ScrollView ref={scroller} contentContainerStyle={{ padding: 16, gap: 12, paddingBottom: 120 + insets.bottom }}>
        {!!prayer && (
          <View style={[styles.guideCard, { backgroundColor: guide === 'off' ? pal.surface : mix(pal.surface, pal.accent, 0.1) }]}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
              <View style={{ flex: 1 }}>
                <Text style={[styles.rowTitle, { color: pal.text }]}>{guide === 'off' ? 'Guide me with recitation' : guide === 'on' ? 'Guiding you' : 'Paused'}</Text>
                <Text style={[styles.small, { color: pal.muted }]}>{guide === 'off' ? 'Hear each step recited, moving on by itself' : now?.ayah != null ? `Reciting ayah ${now.ayah + 1}` : now?.clip ? 'Listen and say it with the recording' : 'Moving to the next step…'}</Text>
              </View>
              <Pressable onPress={() => setGuide((g) => (g === 'on' ? 'paused' : 'on'))} style={[styles.listen, { backgroundColor: pal.text }]} accessibilityRole="button" accessibilityLabel={guide === 'on' ? 'Pause the guide' : 'Start the guide'}>
                <Icon name={guide === 'on' ? 'pause' : 'play'} size={16} color={pal.bg} fill={guide !== 'on'} />
                <Text style={[styles.listenText, { color: pal.bg }]}>{guide === 'off' ? 'Start' : guide === 'on' ? 'Pause' : 'Resume'}</Text>
              </Pressable>
              {guide !== 'off' && (
                <Pressable onPress={() => setGuide('off')} hitSlop={8} accessibilityRole="button" accessibilityLabel="Stop the guide">
                  <Icon name="close" size={18} color={pal.muted} />
                </Pressable>
              )}
            </View>
            <Text style={[styles.tiny, { color: pal.muted }]}>
              A learning aid while you memorise the words. Many scholars say you shouldn’t follow a recording as if it were an imam, so practise with it, move on to praying from memory as soon as you can, and ask your local imam how best to use it while you learn.
            </Text>
          </View>
        )}
        <View style={[styles.art, { backgroundColor: mix(pal.surface, pal.accent, pal.dark ? 0.16 : 0.09) }]}>
          <Image source={poseArt(fig, step.pose)} style={{ width: '100%', height: '100%' }} resizeMode="contain" accessibilityLabel={`${step.name}: ${step.title}`} />
          <View style={styles.figSwitch}>
            <FigureSwitch pal={pal} compact />
          </View>
          {step.pose === 'salam' && (
            <View style={[styles.badge, { backgroundColor: pal.surface }]}>
              <Text style={[styles.badgeText, { color: pal.text }]}>Right, then left</Text>
            </View>
          )}
        </View>

        <View style={{ gap: 6, paddingHorizontal: 2 }}>
          <Text style={[styles.eyebrow, { color: pal.accent }]}>{step.name.toUpperCase()}</Text>
          <Text style={[styles.title, { color: pal.text }]}>{step.title}</Text>
          <Text style={[styles.body, { color: pal.text }]}>{step.how}</Text>
        </View>

        {step.recite === 'fatihah' && <Recite pal={pal} s={1} guided={guide !== 'off' ? now?.ayah ?? -1 : undefined} />}
        {step.recite === 'surah' && (
          <View style={{ gap: 10 }}>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
              {SURAH_CHOICES.map((s) => {
                const l = LEARN.find((x) => x.s === s)!;
                const on = s === surah;
                return (
                  <Pressable key={s} onPress={() => setSurah(s)} style={[styles.chip, { backgroundColor: on ? pal.text : pal.surface }]} accessibilityRole="button" accessibilityState={{ selected: on }}>
                    <Text style={[styles.chipText, { color: on ? pal.bg : pal.text }]}>{l.name}</Text>
                  </Pressable>
                );
              })}
            </ScrollView>
            <Recite pal={pal} s={surah} key={surah} guided={guide !== 'off' ? now?.ayah ?? -1 : undefined} />
          </View>
        )}
        {step.say?.map((w, k) => <Say key={k} pal={pal} w={w} lit={!!w.clip && now?.clip === w.clip} />)}

        {!!step.differs && (
          <View style={[styles.differs, { borderColor: pal.line }]}>
            <Text style={[styles.diffHead, { color: pal.muted }]}>DONE DIFFERENTLY</Text>
            <Text style={[styles.small, { color: pal.muted }]}>{step.differs}</Text>
          </View>
        )}
      </ScrollView>

      <View style={[styles.bar, { paddingBottom: insets.bottom + 12, backgroundColor: pal.bg, borderColor: pal.line }]}>
        <Pressable onPress={() => go(-1)} disabled={i === 0} style={[styles.back, { borderColor: pal.line, opacity: i === 0 ? 0.35 : 1 }]} accessibilityRole="button" accessibilityLabel="Previous step">
          <Text style={[styles.backText, { color: pal.text }]}>Back</Text>
        </Pressable>
        <Pressable onPress={() => go(1)} style={({ pressed }) => [styles.next, { flex: 1, backgroundColor: pal.text, opacity: pressed ? 0.85 : 1 }]} accessibilityRole="button">
          <Text style={[styles.nextText, { color: pal.bg }]}>{i === beats.length - 1 ? 'Finish' : nextLabel(beats[i + 1], beat, !!prayer)}</Text>
        </Pressable>
      </View>
    </View>
  );
}

function nextLabel(next: Beat, now: Beat, along: boolean) {
  if (along && next.rakah !== now.rakah) return `Next: rakʿah ${next.rakah}`;
  return `Next: ${STEPS[next.step].name}`;
}

/** What to say: Arabic, transliteration, English, how many times. */
function Say({ pal, w, lit }: { pal: Palette; w: Words; lit?: boolean }) {
  const prefs = usePrefs();
  const k = textScale(prefs.textSize);
  return (
    <View style={[styles.say, { backgroundColor: lit ? mix(pal.surface, pal.accent, 0.12) : pal.surface }]}>
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
        <Text style={[styles.diffHead, { color: pal.accent }]}>{lit ? 'SAY IT WITH THE RECORDING' : 'SAY'}</Text>
        {!!w.times && (
          <View style={[styles.times, { backgroundColor: mix(pal.surface, pal.accent, 0.14) }]}>
            <Text style={[styles.timesText, { color: pal.accent }]}>{w.times === 2 ? 'Twice' : `${w.times} times`}</Text>
          </View>
        )}
      </View>
      <Text style={[styles.ar, { color: pal.text, fontSize: 25 * k, lineHeight: 46 * k }]}>{w.ar}</Text>
      <Text style={[styles.tl, { color: pal.text, fontSize: 16 * k, lineHeight: 23 * k }]}>{w.tl}</Text>
      <Text style={[styles.small, { color: pal.muted, fontSize: 14 * k, lineHeight: 20 * k }]}>{w.en}</Text>
      <Text style={[styles.src, { color: pal.muted }]}>{w.src}</Text>
    </View>
  );
}

/** A surah to recite, ayah by ayah, with al-Husary's recitation (the word-perfect teaching reciter). */
function Recite({ pal, s, guided }: { pal: Palette; s: number; /** the ayah the guide is reciting (index), when the guide is on */ guided?: number }) {
  const l = LEARN.find((x) => x.s === s)!;
  const prefs = usePrefs();
  const k = textScale(prefs.textSize);
  const player = useAudioPlayer(null, { updateInterval: 250 });
  const status = useAudioPlayerStatus(player);
  const [on, setOn] = useState<number | null>(null);
  const play = async (n: number) => {
    stopRadio();
    setOn(n);
    try {
      const a = await ayahAudio('husary', s, n + 1);
      player.replace({ uri: a.url });
      try {
        player.setPlaybackRate(prefs.speed ?? 1, 'high');
      } catch {}
      player.play();
    } catch {
      setOn(null);
    }
  };
  useEffect(() => {
    if (!status.didJustFinish || on == null) return;
    if (on < l.ayat.length - 1) play(on + 1);
    else setOn(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status.didJustFinish]);
  useEffect(() => () => { try { player.pause(); } catch {} }, [player]);

  return (
    <View style={[styles.say, { backgroundColor: pal.surface }]}>
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 10 }}>
        <View style={{ flex: 1 }}>
          <Text style={[styles.diffHead, { color: pal.accent }]}>RECITE</Text>
          <Text style={[styles.rowTitle, { color: pal.text }]}>{l.name} · {l.meaning}</Text>
        </View>
        <Pressable
          onPress={() => (on == null ? play(0) : (player.pause(), setOn(null)))}
          style={[styles.listen, { backgroundColor: pal.text }]}
          accessibilityRole="button"
          accessibilityLabel={on == null ? `Listen to ${l.name}` : 'Stop'}
        >
          <Icon name={on == null ? 'play' : 'pause'} size={16} color={pal.bg} fill={on == null} />
          <Text style={[styles.listenText, { color: pal.bg }]}>{on == null ? 'Listen' : 'Stop'}</Text>
        </Pressable>
      </View>
      {l.ayat.map((a, n) => (
        <Pressable key={n} onPress={() => play(n)} style={[styles.ayah, { borderTopColor: pal.line, backgroundColor: on === n || guided === n ? mix(pal.surface, pal.accent, 0.12) : 'transparent' }]} accessibilityRole="button" accessibilityLabel={`Ayah ${n + 1}: ${a.tl}`}>
          <Text style={[styles.ar, { color: pal.text, fontSize: 23 * k, lineHeight: 44 * k }]}>{a.ar}</Text>
          <Text style={[styles.tl, { color: pal.text, fontSize: 15 * k, lineHeight: 22 * k }]}>{a.tl}</Text>
          <Text style={[styles.small, { color: pal.muted }]}>{a.en}</Text>
        </Pressable>
      ))}
      <Text style={[styles.src, { color: pal.muted }]}>Recited by Mahmoud Khalil al-Husary. Tap an ayah to hear it. Learn it properly in Surahs for your prayer.</Text>
    </View>
  );
}

type Item = { url: string; ayah?: number; clip?: string };
const clipUrl = (id: string) => `${SITE}/salah/${id}.mp3`;
/** What the guide plays for a step: the surah ayah by ayah (al-Husary), then the words to say. */
async function stepItems(step: SalahStep, surah: number): Promise<Item[]> {
  const out: Item[] = [];
  const s = step.recite === 'fatihah' ? 1 : step.recite === 'surah' ? surah : 0;
  if (s) {
    const l = LEARN.find((x) => x.s === s);
    for (let n = 0; n < (l?.ayat.length ?? 0); n++) {
      try {
        out.push({ url: (await ayahAudio('husary', s, n + 1)).url, ayah: n });
      } catch {}
    }
  }
  for (const w of step.say ?? []) if (w.clip) out.push({ url: clipUrl(w.clip), clip: w.clip });
  return out;
}
/** How long to wait after a step before moving on (time to get into position, or for steps said quietly). */
function holdFor(step: SalahStep) {
  if (step.id === 'niyyah') return 5000;
  if (step.id === 'refuge') return 4000;
  if (step.id === 'salam') return 7000;
  if (step.id === 'fatihah') return 2500; // Ameen
  return 2200;
}

const styles = StyleSheet.create({
  guideCard: { borderRadius: 20, padding: 14, gap: 8 },
  tiny: { fontFamily: fonts.ui, fontSize: 12, lineHeight: 17 },
  root: { flex: 1 },
  head: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingBottom: 10 },
  x: { width: 36, height: 36, borderRadius: 18, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  top: { fontFamily: fonts.uiSemi, fontSize: 15.5, flex: 1, textAlign: 'center' },
  track: { height: 4, marginHorizontal: 16, borderRadius: 2, overflow: 'hidden' },
  fill: { height: 4, borderRadius: 2 },
  art: { height: 300, borderRadius: 24, overflow: 'hidden' },
  figSwitch: { position: 'absolute', left: 12, top: 12 },
  badge: { position: 'absolute', right: 12, top: 12, borderRadius: 999, paddingHorizontal: 12, paddingVertical: 6 },
  badgeText: { fontFamily: fonts.uiSemi, fontSize: 13 },
  eyebrow: { fontFamily: fonts.uiBold, fontSize: 12, letterSpacing: 1.3 },
  title: { fontFamily: fonts.uiBold, fontSize: 26, lineHeight: 31, letterSpacing: -0.6 },
  doneTitle: { fontFamily: fonts.uiBold, fontSize: 24, lineHeight: 30, letterSpacing: -0.5, textAlign: 'center' },
  body: { fontFamily: fonts.read, fontSize: 16, lineHeight: 24 },
  say: { borderRadius: 20, padding: 16, gap: 8 },
  ar: { fontFamily: fonts.arabic, textAlign: 'right', writingDirection: 'rtl' },
  tl: { fontFamily: fonts.read, fontStyle: 'italic' },
  small: { fontFamily: fonts.ui, fontSize: 13.5, lineHeight: 19 },
  src: { fontFamily: fonts.ui, fontSize: 12 },
  times: { borderRadius: 999, paddingHorizontal: 10, paddingVertical: 4 },
  timesText: { fontFamily: fonts.uiBold, fontSize: 12 },
  diffHead: { fontFamily: fonts.uiBold, fontSize: 11, letterSpacing: 1.2 },
  differs: { borderWidth: 1, borderRadius: 16, padding: 14, gap: 4 },
  rowTitle: { fontFamily: fonts.uiSemi, fontSize: 15.5 },
  chip: { borderRadius: 999, paddingHorizontal: 14, paddingVertical: 8 },
  chipText: { fontFamily: fonts.uiSemi, fontSize: 14 },
  listen: { flexDirection: 'row', alignItems: 'center', gap: 6, borderRadius: 999, paddingHorizontal: 14, paddingVertical: 9 },
  listenText: { fontFamily: fonts.uiBold, fontSize: 14 },
  ayah: { borderTopWidth: StyleSheet.hairlineWidth, paddingVertical: 10, paddingHorizontal: 6, borderRadius: 10, gap: 4 },
  bar: { position: 'absolute', left: 0, right: 0, bottom: 0, flexDirection: 'row', gap: 10, paddingHorizontal: 16, paddingTop: 12, borderTopWidth: StyleSheet.hairlineWidth },
  back: { borderWidth: 1, borderRadius: 999, paddingHorizontal: 20, paddingVertical: 15, alignItems: 'center' },
  backText: { fontFamily: fonts.uiSemi, fontSize: 16 },
  next: { borderRadius: 999, paddingVertical: 15, alignItems: 'center' },
  nextText: { fontFamily: fonts.uiBold, fontSize: 16 },
});
