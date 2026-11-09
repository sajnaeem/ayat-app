import { useEvent } from 'expo';
import { useVideoPlayer, VideoView } from 'expo-video';
import { useEffect, useState } from 'react';
import { Image, Pressable, StyleSheet, Text, View } from 'react-native';
import type { FeedVideo, Snippet } from '@/data/snippets';
import { posterUrl, videoUrl } from '@/lib/extras';
import { fonts, mix, Palette, Tone } from '@/lib/theme';
import { Icon } from './Icon';

type CardProps = { pal: Palette; tone: Tone; height: number; bottomInset: number };

/** A fact, a myth (tap to reveal the truth) or an Arabic word, between the ayat on For you. */
export function SnippetCard({ s, pal, tone, height, bottomInset }: CardProps & { s: Snippet }) {
  const [revealed, setRevealed] = useState(false);
  const soft = mix(tone.bg, pal.text, 0.75);
  const faint = mix(tone.bg, pal.text, 0.55);
  const source = <Text style={[styles.source, { color: faint }]}>{s.source}</Text>;

  if (s.kind === 'myth') {
    return (
      <Pressable
        onPress={() => setRevealed((r) => !r)}
        accessibilityRole="button"
        accessibilityLabel={revealed ? `Myth: ${s.myth} Fact: ${s.fact}` : `Myth or fact? ${s.myth} Tap to find out.`}
        style={[styles.card, { height, backgroundColor: tone.bg, paddingBottom: bottomInset + 40 }]}
      >
        <Text style={[styles.eyebrow, { color: tone.accent }]}>{revealed ? 'MYTH' : 'MYTH OR FACT?'}</Text>
        <Text style={[styles.title, { color: revealed ? faint : pal.text, textDecorationLine: revealed ? 'line-through' : 'none' }]}>{s.myth}</Text>
        {revealed ? (
          <>
            <Text style={[styles.eyebrow, { color: tone.accent, marginTop: 8 }]}>THE TRUTH</Text>
            <Text style={[styles.body, { color: pal.text }]}>{s.fact}</Text>
            {source}
          </>
        ) : (
          <View style={[styles.reveal, { borderColor: tone.accent }]}>
            <Text style={[styles.revealText, { color: tone.accent }]}>Tap to find out</Text>
          </View>
        )}
      </Pressable>
    );
  }

  if (s.kind === 'word') {
    return (
      <View style={[styles.card, { height, backgroundColor: tone.bg, paddingBottom: bottomInset + 40 }]} accessible accessibilityLabel={`Word: ${s.tl}, ${s.meaning}. ${s.body}`}>
        <Text style={[styles.eyebrow, { color: tone.accent }]}>WORD</Text>
        <Text style={[styles.ar, { color: pal.text }]}>{s.ar}</Text>
        <Text style={[styles.tl, { color: tone.accent }]}>
          {s.tl} · <Text style={{ color: pal.text }}>{s.meaning}</Text>
        </Text>
        <Text style={[styles.body, { color: soft }]}>{s.body}</Text>
        {source}
      </View>
    );
  }

  return (
    <View style={[styles.card, { height, backgroundColor: tone.bg, paddingBottom: bottomInset + 40 }]} accessible accessibilityLabel={`Did you know? ${s.title} ${s.body}`}>
      <Text style={[styles.eyebrow, { color: tone.accent }]}>DID YOU KNOW?</Text>
      <Text style={[styles.title, { color: pal.text }]}>{s.title}</Text>
      <Text style={[styles.body, { color: soft }]}>{s.body}</Text>
      {source}
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
  reveal: { alignSelf: 'flex-start', borderWidth: 1.5, borderRadius: 999, paddingHorizontal: 18, paddingVertical: 10, marginTop: 8 },
  revealText: { fontFamily: fonts.uiBold, fontSize: 15 },
  video: { width: '100%', backgroundColor: '#0E1411' },
  videoCredit: { position: 'absolute', left: 20, right: 70, fontFamily: fonts.ui, fontSize: 11, lineHeight: 15, color: 'rgba(255,255,255,0.7)' },
  playBadge: { position: 'absolute', alignSelf: 'center', top: '46%', width: 72, height: 72, borderRadius: 36, backgroundColor: 'rgba(0,0,0,0.45)', alignItems: 'center', justifyContent: 'center' },
});
