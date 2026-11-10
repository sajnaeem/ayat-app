import { useEvent } from 'expo';
import { useVideoPlayer, VideoView } from 'expo-video';
import { useAudioPlayer } from 'expo-audio';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Image, Pressable, StyleSheet, Text, View } from 'react-native';
import type { FeedVideo, Snippet } from '@/data/snippets';
import { ayahAudio, ReciterId, RECITERS } from '@/lib/audio';
import { posterUrl, Timely, videoUrl } from '@/lib/extras';
import { fonts, mix, Palette, Tone } from '@/lib/theme';
import { Icon } from './Icon';

type CardProps = { pal: Palette; tone: Tone; height: number; bottomInset: number };

/** A fact, myth, word, dua, name of Allah, small action, quiz, story part or reciter card, between the ayat on For you. */
export function SnippetCard(p: CardProps & { s: Snippet; part?: number; active: boolean; autoplay: boolean; reciter?: ReciterId }) {
  const { s, pal, tone, height, bottomInset } = p;
  const [revealed, setRevealed] = useState(false);
  const [picked, setPicked] = useState<number | null>(null);
  const soft = mix(tone.bg, pal.text, 0.75);
  const faint = mix(tone.bg, pal.text, 0.55);
  const frame = [styles.card, { height, backgroundColor: tone.bg, paddingBottom: bottomInset + 40 }];
  const source = (txt: string) => <Text style={[styles.source, { color: faint }]}>{txt}</Text>;
  const eyebrow = (txt: string) => <Text style={[styles.eyebrow, { color: tone.accent }]}>{txt}</Text>;

  switch (s.kind) {
    case 'myth':
      return (
        <Pressable
          onPress={() => setRevealed((r) => !r)}
          accessibilityRole="button"
          accessibilityLabel={revealed ? `Myth: ${s.myth} Fact: ${s.fact}` : `Myth or fact? ${s.myth} Tap to find out.`}
          style={frame}
        >
          {eyebrow(revealed ? 'MYTH' : 'MYTH OR FACT?')}
          <Text style={[styles.title, { color: revealed ? faint : pal.text, textDecorationLine: revealed ? 'line-through' : 'none' }]}>{s.myth}</Text>
          {revealed ? (
            <>
              <Text style={[styles.eyebrow, { color: tone.accent, marginTop: 8 }]}>THE TRUTH</Text>
              <Text style={[styles.body, { color: pal.text }]}>{s.fact}</Text>
              {source(s.source)}
            </>
          ) : (
            <View style={[styles.pill, { borderColor: tone.accent }]}>
              <Text style={[styles.pillText, { color: tone.accent }]}>Tap to find out</Text>
            </View>
          )}
        </Pressable>
      );
    case 'word':
    case 'name':
      return (
        <View style={frame} accessible accessibilityLabel={`${s.kind === 'name' ? 'Name of Allah' : 'Word'}: ${s.tl}, ${s.meaning}. ${s.body}`}>
          {eyebrow(s.kind === 'name' ? 'NAMES OF ALLAH' : (s.eyebrow ?? 'WORD'))}
          <Text style={[styles.ar, { color: pal.text }]}>{s.ar}</Text>
          <Text style={[styles.tl, { color: tone.accent }]}>
            {s.tl} · <Text style={{ color: pal.text }}>{s.meaning}</Text>
          </Text>
          <Text style={[styles.body, { color: soft }]}>{s.body}</Text>
          {source(s.source)}
        </View>
      );
    case 'dua': {
      // Long duas (like Sayyid al-Istighfar) step down in size so the whole dua fits on one screen.
      const long = s.ar.length > 140;
      return (
        <View style={[frame, long && { gap: 10 }]} accessible accessibilityLabel={`Dua: ${s.title}. ${s.meaning}`}>
          {eyebrow('DUA')}
          <Text style={[styles.subtitle, { color: pal.text }]}>{s.title}</Text>
          <Text style={[styles.duaAr, { color: pal.text }, long && { fontSize: 20, lineHeight: 36 }]}>{s.ar}</Text>
          <Text style={[styles.duaTl, { color: tone.accent }, long && { fontSize: 13, lineHeight: 18 }]}>{s.tl}</Text>
          <Text style={[styles.body, { color: soft }, long && { fontSize: 14, lineHeight: 20 }]}>{s.meaning}</Text>
          {source(s.source)}
        </View>
      );
    }
    case 'try':
      return (
        <View style={frame} accessible accessibilityLabel={`Try this today: ${s.title} ${s.body}`}>
          {eyebrow('TRY THIS TODAY')}
          <Text style={[styles.title, { color: pal.text }]}>{s.title}</Text>
          <Text style={[styles.body, { color: soft }]}>{s.body}</Text>
          {source(s.source)}
        </View>
      );
    case 'quiz':
      return (
        <View style={frame}>
          {eyebrow('QUICK QUIZ')}
          <Text style={[styles.title, { color: pal.text }]}>{s.q}</Text>
          <View style={{ gap: 10 }}>
            {s.options.map((o, i) => {
              const right = picked !== null && i === s.answer;
              const wrong = picked === i && i !== s.answer;
              return (
                <Pressable
                  key={o}
                  disabled={picked !== null}
                  onPress={() => setPicked(i)}
                  accessibilityRole="button"
                  accessibilityState={{ selected: picked === i }}
                  style={[styles.option, { borderColor: right ? tone.accent : mix(tone.bg, pal.text, 0.2), backgroundColor: right ? tone.accent : 'transparent', opacity: wrong ? 0.5 : 1 }]}
                >
                  <Text style={[styles.optionText, { color: right ? '#fff' : pal.text }]}>{o}</Text>
                </Pressable>
              );
            })}
          </View>
          {picked !== null && (
            <>
              <Text style={[styles.body, { color: pal.text }]}>
                {picked === s.answer ? 'That’s right. ' : 'Not quite. '}
                {s.why}
              </Text>
              {source(s.source)}
            </>
          )}
        </View>
      );
    case 'story': {
      const i = p.part ?? 0;
      const part = s.parts[i];
      return (
        <View style={frame} accessible accessibilityLabel={`${s.title ? s.who : `The story of ${s.who}`}, part ${i + 1} of ${s.parts.length}. ${part.heading ? `${part.heading}. ` : ''}${part.text}`}>
          {eyebrow(`${s.title ?? `THE STORY OF ${s.who.toUpperCase()}`} · ${i + 1} OF ${s.parts.length}`)}
          {!!part.heading && <Text style={[styles.title, { color: pal.text }]}>{part.heading}</Text>}
          <Text style={[part.heading ? styles.body : styles.story, { color: part.heading ? soft : pal.text }]}>{part.text}</Text>
          {source(part.source)}
          <View style={styles.dots}>
            {s.parts.map((_, d) => (
              <View key={d} style={[styles.dot, { backgroundColor: d === i ? tone.accent : mix(tone.bg, pal.text, 0.18) }]} />
            ))}
          </View>
        </View>
      );
    }
    case 'reciters':
      return <RecitersCard {...p} s={s} />;
    case 'letter':
      return <LetterCard {...p} s={s} />;
    default:
      return (
        <View style={frame} accessible accessibilityLabel={`${s.eyebrow ? 'A gentle reminder' : 'Did you know?'} ${s.title} ${s.body}`}>
          {eyebrow(s.eyebrow ?? 'DID YOU KNOW?')}
          <Text style={[styles.title, { color: pal.text }]}>{s.title}</Text>
          <Text style={[styles.body, { color: soft }]}>{s.body}</Text>
          {source(s.source)}
        </View>
      );
  }
}

/** One letter of the Arabic alphabet: how to say it, then a word from a short ayah that uses it. Tap to hear the ayah. */
function LetterCard(p: CardProps & { s: Extract<Snippet, { kind: 'letter' }>; active: boolean }) {
  const { s, pal, tone, height, bottomInset, active } = p;
  const player = useAudioPlayer(null);
  const [playing, setPlaying] = useState(false);
  const soft = mix(tone.bg, pal.text, 0.75);
  const faint = mix(tone.bg, pal.text, 0.55);

  useEffect(() => {
    const sub = player.addListener('playbackStatusUpdate', (st) => {
      if (st.didJustFinish) setPlaying(false);
    });
    return () => sub.remove();
  }, [player]);
  useEffect(() => {
    if (!active) {
      player.pause();
      setPlaying(false);
    }
  }, [active, player]);

  const listen = async () => {
    if (playing) {
      player.pause();
      setPlaying(false);
      return;
    }
    setPlaying(true);
    // Al-Husary: slow and clear, the classic recitation for learners.
    const a = await ayahAudio('husary', s.s, s.a);
    player.replace(a.url);
    player.play();
  };

  return (
    <View style={[styles.card, { height, backgroundColor: tone.bg, paddingBottom: bottomInset + 40 }]}>
      <Text style={[styles.eyebrow, { color: tone.accent }]}>THE ARABIC LETTERS · {s.n} OF 28</Text>
      <View style={styles.letterRow}>
        <Text style={[styles.letter, { color: pal.text }]}>{s.letter}</Text>
        <View style={{ flex: 1, gap: 4 }}>
          <Text style={[styles.tl, { color: tone.accent }]}>{s.name}</Text>
          <Text style={[styles.body, { color: soft }]}>{s.sound}</Text>
        </View>
      </View>
      <View style={[styles.letterBox, { borderColor: mix(tone.bg, tone.accent, 0.35) }]}>
        <Text style={[styles.eyebrow, { color: faint }]}>IN THE QURAN · {s.s}:{s.a}</Text>
        <Text style={[styles.letterAyah, { color: soft }]}>
          {s.ayah.split(' ').map((w, i, all) => (
            <Text key={i} style={w === s.word ? { color: tone.accent } : undefined}>
              {w}
              {i < all.length - 1 ? ' ' : ''}
            </Text>
          ))}
        </Text>
        <Text style={[styles.body, { color: pal.text }]}>
          <Text style={{ fontFamily: fonts.readItalic, color: tone.accent }}>{s.wordTl}</Text> · {s.meaning}
        </Text>
        <Pressable onPress={listen} style={[styles.pill, { borderColor: tone.accent, flexDirection: 'row', alignItems: 'center', gap: 8 }]} accessibilityRole="button" accessibilityLabel={playing ? 'Stop' : `Hear ${s.s}:${s.a} recited`}>
          <Icon name={playing ? 'pause' : 'play'} size={16} color={tone.accent} fill={!playing} />
          <Text style={[styles.pillText, { color: tone.accent }]}>{playing ? 'Playing…' : 'Hear it in the ayah'}</Text>
        </Pressable>
      </View>
    </View>
  );
}

const THREE: ReciterId[] = ['alafasy', 'sudais', 'husary'];

/** One short ayah, recited by three reciters one after another. Tap a reciter to hear just them. */
function RecitersCard(p: CardProps & { s: Extract<Snippet, { kind: 'reciters' }>; active: boolean; autoplay: boolean }) {
  const { s, pal, tone, height, bottomInset, active, autoplay } = p;
  const player = useAudioPlayer(null);
  const [on, setOn] = useState<number | null>(null);
  const onRef = useRef<number | null>(null);
  const chain = useRef(true);

  const play = useCallback(
    async (i: number, keepGoing: boolean) => {
      chain.current = keepGoing;
      onRef.current = i;
      setOn(i);
      const a = await ayahAudio(THREE[i], s.s, s.a);
      if (onRef.current !== i) return;
      player.replace(a.url);
      player.play();
    },
    [player, s.s, s.a],
  );

  useEffect(() => {
    const sub = player.addListener('playbackStatusUpdate', (st) => {
      if (!st.didJustFinish) return;
      const i = onRef.current;
      if (i !== null && chain.current && i < THREE.length - 1) play(i + 1, true);
      else {
        onRef.current = null;
        setOn(null);
      }
    });
    return () => sub.remove();
  }, [player, play]);

  useEffect(() => {
    if (active && autoplay) play(0, true);
    if (!active) {
      onRef.current = null;
      setOn(null);
      player.pause();
    }
  }, [active, autoplay, play, player]);

  return (
    <View style={[styles.card, { height, backgroundColor: tone.bg, paddingBottom: bottomInset + 40 }]}>
      <Text style={[styles.eyebrow, { color: tone.accent }]}>HEAR IT THREE WAYS</Text>
      <Text style={[styles.duaAr, { color: pal.text, fontSize: 34, lineHeight: 64 }]}>{s.ar}</Text>
      <Text style={[styles.body, { color: mix(tone.bg, pal.text, 0.75) }]}>{s.en}</Text>
      <View style={{ gap: 10 }}>
        {THREE.map((id, i) => {
          const r = RECITERS.find((x) => x.id === id)!;
          const playing = on === i;
          return (
            <Pressable
              key={id}
              onPress={() => (playing ? (player.pause(), (onRef.current = null), setOn(null)) : play(i, false))}
              accessibilityRole="button"
              accessibilityLabel={`${playing ? 'Stop' : 'Play'} ${r.name}`}
              style={[styles.reciter, { borderColor: playing ? tone.accent : mix(tone.bg, pal.text, 0.15), backgroundColor: playing ? mix(tone.bg, tone.accent, 0.1) : 'transparent' }]}
            >
              <Icon name={playing ? 'pause' : 'play'} size={18} color={tone.accent} fill={!playing} />
              <View style={{ flex: 1 }}>
                <Text style={[styles.optionText, { color: pal.text }]}>{r.name}</Text>
                <Text style={[styles.source, { color: mix(tone.bg, pal.text, 0.6), marginTop: 0 }]} numberOfLines={1}>
                  {r.note}
                </Text>
              </View>
            </Pressable>
          );
        })}
      </View>
      <Text style={[styles.source, { color: mix(tone.bg, pal.text, 0.55) }]}>Quran {s.s}:{s.a}</Text>
    </View>
  );
}

/** A card for this moment of the day, week or year. */
export function TimelyCard({ t, pal, tone, height, bottomInset, onAction }: CardProps & { t: Timely; onAction: (s: number, a: number) => void }) {
  const soft = mix(tone.bg, pal.text, 0.75);
  return (
    <View style={[styles.card, { height, backgroundColor: tone.bg, paddingBottom: bottomInset + 40 }]}>
      <Text style={[styles.eyebrow, { color: tone.accent }]}>{t.eyebrow}</Text>
      <Text style={[styles.title, { color: pal.text }]}>{t.title}</Text>
      {!!t.ar && <Text style={[styles.duaAr, { color: pal.text }]}>{t.ar}</Text>}
      {!!t.tl && <Text style={[styles.duaTl, { color: tone.accent }]}>{t.tl}</Text>}
      {!!t.meaning && <Text style={[styles.body, { color: soft }]}>{t.meaning}</Text>}
      {!!t.body && <Text style={[styles.body, { color: soft }]}>{t.body}</Text>}
      <Text style={[styles.source, { color: mix(tone.bg, pal.text, 0.55) }]}>{t.source}</Text>
      {t.action && (
        <Pressable onPress={() => onAction(t.action!.s, t.action!.a)} accessibilityRole="button" style={[styles.action, { backgroundColor: pal.text }]}>
          <Text style={[styles.actionText, { color: tone.bg }]}>{t.action.label}</Text>
        </Pressable>
      )}
    </View>
  );
}

/** Now and then: how much of the Quran the reader has covered. No streaks, no guilt. */
export function ProgressCard({ read, pal, tone, height, bottomInset }: CardProps & { read: number }) {
  const pct = Math.min(100, (read / 6236) * 100);
  return (
    <View style={[styles.card, { height, backgroundColor: tone.bg, paddingBottom: bottomInset + 40 }]} accessible accessibilityLabel={`You've read ${read} ayat with Munib, ${pct.toFixed(1)} percent of the Quran.`}>
      <Text style={[styles.eyebrow, { color: tone.accent }]}>YOUR READING</Text>
      <Text style={[styles.title, { color: pal.text }]}>You’ve read {read.toLocaleString('en-GB')} ayat with Munib.</Text>
      <View style={[styles.track, { backgroundColor: mix(tone.bg, pal.text, 0.12) }]}>
        <View style={[styles.fill, { width: `${Math.max(2, pct)}%`, backgroundColor: tone.accent }]} />
      </View>
      <Text style={[styles.body, { color: mix(tone.bg, pal.text, 0.75) }]}>
        That’s {pct < 1 ? pct.toFixed(1) : Math.round(pct)}% of the whole Quran. A little each day adds up.
      </Text>
    </View>
  );
}

/** One of Munib's short videos. Plays when it's on screen (unless the reader has paused), tap to pause. */
export function VideoCard({ v, height, bottomInset, active, near, autoplay }: CardProps & { v: FeedVideo; active: boolean; near: boolean; autoplay: boolean }) {
  return (
    <View style={[styles.video, { height }]}>
      {near ? (
        <Player v={v} active={active} autoplay={autoplay} />
      ) : (
        <Image source={{ uri: posterUrl(v) }} style={StyleSheet.absoluteFill} resizeMode="contain" accessibilityIgnoresInvertColors />
      )}
      <Text style={[styles.videoCredit, { bottom: bottomInset + 14 }]} numberOfLines={2}>
        {v.sources}
      </Text>
    </View>
  );
}

function Player({ v, active, autoplay }: { v: FeedVideo; active: boolean; autoplay: boolean }) {
  const player = useVideoPlayer(videoUrl(v), (p) => {
    p.loop = false;
  });
  const { isPlaying } = useEvent(player, 'playingChange', { isPlaying: player.playing });
  const { status } = useEvent(player, 'statusChange', { status: player.status });
  const [ended, setEnded] = useState(false);

  useEffect(() => {
    const sub = player.addListener('playToEnd', () => setEnded(true));
    return () => sub.remove();
  }, [player]);

  useEffect(() => {
    if (active && autoplay) player.play();
    if (!active) player.pause();
  }, [active, autoplay, player]);

  const toggle = () => {
    if (ended) {
      setEnded(false);
      player.replay();
    } else if (isPlaying) player.pause();
    else player.play();
  };

  return (
    <Pressable onPress={toggle} style={StyleSheet.absoluteFill} accessibilityRole="button" accessibilityLabel={`${v.title}. ${isPlaying ? 'Pause' : 'Play'}`}>
      {status !== 'readyToPlay' && <Image source={{ uri: posterUrl(v) }} style={StyleSheet.absoluteFill} resizeMode="contain" />}
      <VideoView player={player} style={StyleSheet.absoluteFill} contentFit="contain" nativeControls={false} />
      {active && !isPlaying && (
        <View style={styles.playBadge} pointerEvents="none">
          <Icon name="play" size={30} color="#fff" fill />
        </View>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: { width: '100%', justifyContent: 'center', paddingHorizontal: 28, gap: 16 },
  eyebrow: { fontFamily: fonts.uiBold, fontSize: 12, letterSpacing: 1.4 },
  title: { fontFamily: fonts.uiBold, fontSize: 30, lineHeight: 36, letterSpacing: -0.5 },
  body: { fontFamily: fonts.read, fontSize: 18, lineHeight: 28 },
  source: { fontFamily: fonts.ui, fontSize: 12, lineHeight: 17, marginTop: 4 },
  ar: { fontFamily: fonts.arabic, fontSize: 72, lineHeight: 130, textAlign: 'right' },
  tl: { fontFamily: fonts.readItalic, fontSize: 22, lineHeight: 30 },
  letterRow: { flexDirection: 'row', alignItems: 'center', gap: 20 },
  letter: { fontFamily: fonts.arabic, fontSize: 96, lineHeight: 150, minWidth: 90, textAlign: 'center' },
  letterBox: { borderWidth: 1, borderRadius: 14, padding: 16, gap: 10 },
  letterAyah: { fontFamily: fonts.arabic, fontSize: 30, lineHeight: 58, textAlign: 'right', writingDirection: 'rtl' },
  pill: { alignSelf: 'flex-start', borderWidth: 1.5, borderRadius: 999, paddingHorizontal: 18, paddingVertical: 10, marginTop: 8 },
  pillText: { fontFamily: fonts.uiBold, fontSize: 15 },
  subtitle: { fontFamily: fonts.uiBold, fontSize: 22, lineHeight: 28, letterSpacing: -0.3 },
  duaAr: { fontFamily: fonts.arabic, fontSize: 26, lineHeight: 52, textAlign: 'right', writingDirection: 'rtl' },
  duaTl: { fontFamily: fonts.readItalic, fontSize: 15, lineHeight: 22 },
  story: { fontFamily: fonts.read, fontSize: 24, lineHeight: 35 },
  dots: { flexDirection: 'row', gap: 6, marginTop: 8 },
  dot: { width: 8, height: 8, borderRadius: 4 },
  option: { borderWidth: 1.5, borderRadius: 14, paddingHorizontal: 16, paddingVertical: 13 },
  optionText: { fontFamily: fonts.uiBold, fontSize: 16 },
  reciter: { flexDirection: 'row', alignItems: 'center', gap: 12, borderWidth: 1.5, borderRadius: 14, paddingHorizontal: 14, paddingVertical: 10 },
  action: { alignSelf: 'flex-start', borderRadius: 12, paddingHorizontal: 20, paddingVertical: 13, marginTop: 6 },
  actionText: { fontFamily: fonts.uiBold, fontSize: 16 },
  track: { height: 10, borderRadius: 5, overflow: 'hidden' },
  fill: { height: 10, borderRadius: 5 },
  video: { width: '100%', backgroundColor: '#0E1411' },
  videoCredit: { position: 'absolute', left: 20, right: 70, fontFamily: fonts.ui, fontSize: 11, lineHeight: 15, color: 'rgba(255,255,255,0.7)' },
  playBadge: { position: 'absolute', alignSelf: 'center', top: '46%', width: 72, height: 72, borderRadius: 36, backgroundColor: 'rgba(0,0,0,0.45)', alignItems: 'center', justifyContent: 'center' },
});
