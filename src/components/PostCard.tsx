import { useEvent } from 'expo';
import { useVideoPlayer, VideoView } from 'expo-video';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Image, Pressable, StyleSheet, Text, View } from 'react-native';
import { mediaUrl, Post } from '@/lib/posts';
import { fonts, mix, Palette, Tone } from '@/lib/theme';
import { Icon } from './Icon';

/** A post's photo or video, loaded through a short-lived signed link. */
export function PostMedia({ post, active, autoplay, style }: { post: Post; active: boolean; autoplay: boolean; style?: object }) {
  const [url, setUrl] = useState<string | null>(null);
  useEffect(() => {
    let live = true;
    if (post.media_path) mediaUrl(post.media_path).then((u) => live && setUrl(u));
    return () => {
      live = false;
    };
  }, [post.media_path]);
  if (!post.media_path) return null;
  if (!url) return <View style={[styles.mediaBox, style]}><ActivityIndicator color="#fff" /></View>;
  if (post.kind === 'image') return <Image source={{ uri: url }} style={[styles.mediaBox, style]} resizeMode="contain" accessibilityIgnoresInvertColors />;
  return <PostVideo url={url} active={active} autoplay={autoplay} style={style} />;
}

function PostVideo({ url, active, autoplay, style }: { url: string; active: boolean; autoplay: boolean; style?: object }) {
  const player = useVideoPlayer(url, (p) => {
    p.loop = true;
  });
  const { isPlaying } = useEvent(player, 'playingChange', { isPlaying: player.playing });
  useEffect(() => {
    if (active && autoplay) player.play();
    if (!active) player.pause();
  }, [active, autoplay, player]);
  return (
    <Pressable onPress={() => (isPlaying ? player.pause() : player.play())} style={[styles.mediaBox, style]} accessibilityRole="button" accessibilityLabel={isPlaying ? 'Pause video' : 'Play video'}>
      <VideoView player={player} style={StyleSheet.absoluteFill} contentFit="contain" nativeControls={false} />
      {!isPlaying && (
        <View style={styles.playBadge} pointerEvents="none">
          <Icon name="play" size={26} color="#fff" fill />
        </View>
      )}
    </Pressable>
  );
}

/** A community post in the For you feed: who posted, the post, its source, and like / comment / report. */
export function PostCard(p: {
  post: Post;
  pal: Palette;
  tone: Tone;
  height: number;
  bottomInset: number;
  active: boolean;
  autoplay: boolean;
  liked: boolean;
  onLike: () => void;
  onComment: () => void;
  onMore: () => void;
}) {
  const { post, pal, tone, height, bottomInset } = p;
  const hasMedia = post.kind !== 'text';
  const soft = mix(tone.bg, pal.text, 0.75);
  return (
    <View style={[styles.card, { height, backgroundColor: hasMedia ? '#0E1411' : tone.bg, paddingBottom: bottomInset + 24 }]}>
      {hasMedia && <PostMedia post={post} active={p.active} autoplay={p.autoplay} style={StyleSheet.absoluteFill} />}
      <View style={[styles.textWrap, hasMedia && styles.overMedia]}>
        <Text style={[styles.eyebrow, { color: hasMedia ? '#9FD9BF' : tone.accent }]}>FROM THE COMMUNITY</Text>
        <Text style={[styles.handle, { color: hasMedia ? '#fff' : pal.text }]}>{post.handle}</Text>
        <Text style={[hasMedia ? styles.caption : styles.body, { color: hasMedia ? '#fff' : pal.text }]} numberOfLines={hasMedia ? 4 : 14}>
          {post.body}
        </Text>
        {!!post.source && <Text style={[styles.source, { color: hasMedia ? 'rgba(255,255,255,0.75)' : soft }]}>{post.source}</Text>}
      </View>
      <View style={[styles.rail, { bottom: bottomInset + 90 }]}>
        <RailButton label="Like" icon="heart" fill={p.liked} color={hasMedia ? '#fff' : pal.text} onPress={p.onLike} />
        <RailButton label="Reflect" icon="chat" color={hasMedia ? '#fff' : pal.text} onPress={p.onComment} />
        <RailButton label="Report" icon="flag" color={hasMedia ? '#fff' : pal.text} onPress={p.onMore} />
      </View>
    </View>
  );
}

function RailButton({ label, icon, color, fill, onPress }: { label: string; icon: 'heart' | 'chat' | 'flag'; color: string; fill?: boolean; onPress: () => void }) {
  return (
    <Pressable onPress={onPress} hitSlop={8} accessibilityRole="button" accessibilityLabel={label} style={styles.railBtn}>
      <Icon name={icon} size={26} color={fill ? '#E0525E' : color} fill={fill} />
      <Text style={[styles.railText, { color }]}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: { width: '100%', justifyContent: 'flex-end', paddingHorizontal: 24 },
  textWrap: { gap: 10, paddingRight: 56, marginBottom: 'auto', marginTop: 'auto' },
  overMedia: { marginTop: 'auto', marginBottom: 0, backgroundColor: 'rgba(0,0,0,0.35)', marginHorizontal: -24, paddingHorizontal: 24, paddingTop: 16, paddingBottom: 12 },
  eyebrow: { fontFamily: fonts.uiBold, fontSize: 12, letterSpacing: 1.4 },
  handle: { fontFamily: fonts.uiBold, fontSize: 17 },
  body: { fontFamily: fonts.read, fontSize: 20, lineHeight: 30 },
  caption: { fontFamily: fonts.ui, fontSize: 15, lineHeight: 21 },
  source: { fontFamily: fonts.ui, fontSize: 12, lineHeight: 17 },
  rail: { position: 'absolute', right: 12, gap: 18, alignItems: 'center' },
  railBtn: { alignItems: 'center', gap: 3 },
  railText: { fontFamily: fonts.uiSemi, fontSize: 11 },
  mediaBox: { backgroundColor: '#0E1411', alignItems: 'center', justifyContent: 'center' },
  playBadge: { position: 'absolute', alignSelf: 'center', top: '45%', width: 64, height: 64, borderRadius: 32, backgroundColor: 'rgba(0,0,0,0.45)', alignItems: 'center', justifyContent: 'center' },
});
