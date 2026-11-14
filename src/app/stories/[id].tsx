import { stopRadio } from '@/lib/radio';
import type React from 'react';
import { setAudioModeAsync, useAudioPlayer, useAudioPlayerStatus } from 'expo-audio';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Icon } from '@/components/Icon';
import { FREE_STORIES, usePlus } from '@/lib/plus';
import { NIGHT, SLEEP_DUA_ID, STORIES } from '@/data/bedtime';
import { DUA_TOPICS } from '@/data/duas';
import { SITE } from '@/lib/site';
import { fonts } from '@/lib/theme';

const SLEEP = [
  { id: 0, label: 'End of story' },
  { id: 15, label: '15 min' },
  { id: 30, label: '30 min' },
];
const sleepDua = DUA_TOPICS.flatMap((t) => t.duas.map((d) => ({ ...d, src: t.src }))).find((d) => d.id === SLEEP_DUA_ID);
const mmss = (s: number) => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, '0')}`;

/**
 * One bedtime story: the text to read aloud, and Munib's narration with the paragraph being read lit up.
 * A sleep timer can carry on into the next stories and fade out gently. Keeps playing with the screen locked.
 */
export default function Story() {
  const { id, play, timer } = useLocalSearchParams<{ id: string; play?: string; timer?: string }>();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const plus = usePlus();
  const ix0 = Math.max(0, STORIES.findIndex((s) => s.id === id));
  // A locked story opened by link falls back to the first free one.
  const ix = ix0 >= FREE_STORIES && !plus.unlocked && plus.ready ? 0 : ix0;
  const st = STORIES[ix];
  const player = useAudioPlayer(`${SITE}/stories/${st.id}.mp3`, { updateInterval: 250 });
  const status = useAudioPlayerStatus(player);
  const [starts, setStarts] = useState<number[]>([]);
  const [sleep, setSleep] = useState(Number(timer) || 0);
  // When a sleep timer is running, when it ends (shared across the stories it carries on into).
  const [stopAt, setStopAt] = useState<number | null>(Number(timer) ? Date.now() + Number(timer) * 60000 : null);
  const scroll = useRef<React.ComponentRef<typeof ScrollView>>(null);
  const ys = useRef<number[]>([]);

  // Play on with the screen locked, and show the story on the lock screen.
  useEffect(() => {
    stopRadio();
    setAudioModeAsync({ playsInSilentMode: true, shouldPlayInBackground: true, interruptionMode: 'doNotMix' }).catch(() => {});
    try {
      player.setActiveForLockScreen(true, { title: st.title, artist: 'Munib · Bedtime stories' });
    } catch {}
    if (play) player.play();
    return () => {
      try {
        player.setActiveForLockScreen(false);
      } catch {}
      setAudioModeAsync({ shouldPlayInBackground: false, interruptionMode: 'mixWithOthers' }).catch(() => {});
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [st.id]);

  useEffect(() => {
    fetch(`${SITE}/stories/${st.id}.json`)
      .then((r) => r.json())
      .then((d) => setStarts(d.starts ?? []))
      .catch(() => {});
  }, [st.id]);

  // Which part is being read: 0 is the title, 1… the paragraphs, then the question.
  const t = status.currentTime ?? 0;
  let part = -1;
  if (status.playing || t > 0) for (let i = 0; i < starts.length; i++) if (t >= starts[i] - 0.1) part = i;
  useEffect(() => {
    if (part >= 1 && ys.current[part - 1] != null) scroll.current?.scrollTo({ y: Math.max(0, ys.current[part - 1] - 140), animated: true });
  }, [part]);

  // At the end: stop, or with a timer still running, carry on into the next story.
  useEffect(() => {
    if (!status.didJustFinish) return;
    if (stopAt && Date.now() < stopAt - 30000) {
      // Without Plus, carry on only through the free stories.
      const pool = plus.unlocked ? STORIES.length : FREE_STORIES;
      const next = STORIES[(ix + 1) % pool];
      const left = Math.max(1, Math.round((stopAt - Date.now()) / 60000));
      router.replace({ pathname: '/stories/[id]', params: { id: next.id, play: '1', timer: String(left) } });
    } else {
      player.seekTo(0).catch(() => {});
      player.pause();
      setStopAt(null);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status.didJustFinish]);

  // Sleep timer: fade out over 10 seconds, then pause.
  useEffect(() => {
    if (!stopAt) return;
    const tick = setInterval(() => {
      const left = stopAt - Date.now();
      if (left <= 0) {
        player.pause();
        player.volume = 1;
        setStopAt(null);
        setSleep(0);
      } else if (left < 10000) player.volume = left / 10000;
    }, 500);
    return () => clearInterval(tick);
  }, [stopAt, player]);

  const toggle = () => {
    if (status.playing) return player.pause();
    if (sleep && !stopAt) setStopAt(Date.now() + sleep * 60000);
    player.volume = 1;
    player.play();
  };
  const pickSleep = (m: number) => {
    setSleep(m);
    setStopAt(m && status.playing ? Date.now() + m * 60000 : null);
  };
  const length = status.duration || 0;

  return (
    <View style={[styles.root, { backgroundColor: NIGHT.bg }]}>
      <View style={[styles.top, { paddingTop: insets.top + 8 }]}>
        <Pressable onPress={() => router.back()} style={[styles.x, { borderColor: NIGHT.line }]} accessibilityRole="button" accessibilityLabel="Back to stories" hitSlop={8}>
          <Icon name="close" size={18} color={NIGHT.text} />
        </Pressable>
      </View>
      <ScrollView ref={scroll} contentContainerStyle={{ paddingHorizontal: 24, paddingBottom: insets.bottom + 190 }}>
        <Text style={[styles.about, { color: NIGHT.accent }]}>{st.about.toUpperCase()}</Text>
        <Text style={[styles.title, { color: part === 0 ? NIGHT.accent : NIGHT.text }]}>{st.title}</Text>
        {st.paras.map((p, i) => (
          <Text
            key={i}
            onLayout={(e) => (ys.current[i] = e.nativeEvent.layout.y)}
            style={[styles.para, { color: NIGHT.text, opacity: part < 1 || part === i + 1 ? 1 : 0.45 }]}
          >
            {p}
          </Text>
        ))}
        <View style={[styles.box, { borderColor: NIGHT.line, backgroundColor: NIGHT.card }]}>
          <Text style={[styles.boxEyebrow, { color: NIGHT.accent }]}>TALK ABOUT IT</Text>
          <Text style={[styles.boxText, { color: NIGHT.text, opacity: part < 1 || part === st.paras.length + 1 ? 1 : 0.6 }]}>{st.think}</Text>
        </View>
        {sleepDua && (
          <View style={[styles.box, { borderColor: NIGHT.line, backgroundColor: NIGHT.card }]}>
            <Text style={[styles.boxEyebrow, { color: NIGHT.accent }]}>BEFORE YOU SLEEP</Text>
            <Text style={[styles.ar, { color: NIGHT.text }]}>{sleepDua.ar}</Text>
            <Text style={[styles.tl, { color: NIGHT.accent }]}>{sleepDua.tl}</Text>
            <Text style={[styles.boxText, { color: NIGHT.text }]}>{sleepDua.en}</Text>
            <Text style={[styles.small, { color: NIGHT.muted }]}>{sleepDua.src}</Text>
          </View>
        )}
        <Text style={[styles.small, { color: NIGHT.muted, marginTop: 18 }]}>
          From {st.sources}. Narrated by an AI voice. Being checked by a scholar.
        </Text>
      </ScrollView>

      <View style={[styles.dock, { paddingBottom: insets.bottom + 12, backgroundColor: NIGHT.bg, borderColor: NIGHT.line }]}>
        <View style={styles.bar}>
          <View style={[styles.track, { backgroundColor: NIGHT.line }]}>
            <View style={[styles.fill, { backgroundColor: NIGHT.accent, width: `${length ? Math.min(100, (t / length) * 100) : 0}%` }]} />
          </View>
          <Text style={[styles.small, { color: NIGHT.muted, fontVariant: ['tabular-nums'] }]}>
            {mmss(t)} / {length ? mmss(length) : `${st.minutes}:00`}
          </Text>
        </View>
        <View style={styles.controls}>
          <View style={styles.sleep}>
            <Icon name="bell" size={14} color={NIGHT.muted} />
            {SLEEP.map((s) => (
              <Pressable
                key={s.id}
                onPress={() => pickSleep(s.id)}
                style={[styles.chip, { borderColor: sleep === s.id ? NIGHT.accent : NIGHT.line }]}
                accessibilityRole="radio"
                accessibilityState={{ checked: sleep === s.id }}
                accessibilityLabel={s.id ? `Sleep timer ${s.label}, carries on into the next stories` : 'Stop at the end of this story'}
              >
                <Text style={[styles.chipText, { color: sleep === s.id ? NIGHT.accent : NIGHT.muted }]}>{s.label}</Text>
              </Pressable>
            ))}
          </View>
          <Pressable onPress={toggle} style={[styles.play, { backgroundColor: NIGHT.accent }]} accessibilityRole="button" accessibilityLabel={status.playing ? 'Pause' : 'Play the story'}>
            <Icon name={status.playing ? 'pause' : 'play'} size={24} color={NIGHT.bg} fill />
          </Pressable>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  top: { paddingHorizontal: 18, paddingBottom: 6, alignItems: 'flex-end' },
  x: { width: 36, height: 36, borderRadius: 18, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  about: { fontFamily: fonts.uiBold, fontSize: 11, letterSpacing: 1.2, marginTop: 6 },
  title: { fontFamily: fonts.read, fontSize: 30, lineHeight: 38, marginTop: 6, marginBottom: 18 },
  para: { fontFamily: fonts.read, fontSize: 19, lineHeight: 31, marginBottom: 16 },
  box: { borderWidth: 1, borderRadius: 16, padding: 16, gap: 8, marginTop: 10 },
  boxEyebrow: { fontFamily: fonts.uiBold, fontSize: 10.5, letterSpacing: 1.2 },
  boxText: { fontFamily: fonts.read, fontSize: 17, lineHeight: 26 },
  ar: { fontFamily: fonts.arabic, fontSize: 26, lineHeight: 50, textAlign: 'right', writingDirection: 'rtl' },
  tl: { fontFamily: fonts.readItalic, fontSize: 15 },
  small: { fontFamily: fonts.ui, fontSize: 12.5, lineHeight: 18 },
  dock: { position: 'absolute', left: 0, right: 0, bottom: 0, borderTopWidth: StyleSheet.hairlineWidth, paddingHorizontal: 18, paddingTop: 12, gap: 12 },
  bar: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  track: { flex: 1, height: 4, borderRadius: 2, overflow: 'hidden' },
  fill: { height: 4 },
  controls: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  sleep: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 6, flexWrap: 'wrap' },
  chip: { borderWidth: 1, borderRadius: 999, paddingHorizontal: 10, paddingVertical: 6 },
  chipText: { fontFamily: fonts.uiSemi, fontSize: 12.5 },
  play: { width: 60, height: 60, borderRadius: 30, alignItems: 'center', justifyContent: 'center' },
});
