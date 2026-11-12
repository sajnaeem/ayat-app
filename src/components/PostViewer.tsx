import { useEffect, useState } from 'react';
import { Alert, FlatList, Modal, Pressable, StyleSheet, useWindowDimensions, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAccount } from '@/lib/account';
import { deletePost, myPostLikes, Post, postKey, reportPost, setPostLike } from '@/lib/posts';
import { mix, usePalette } from '@/lib/theme';
import { Icon } from './Icon';
import { PostCard } from './PostCard';
import { ReflectionsSheet } from './Reflections';
import { useToast } from './Toast';

/** Someone's posts, full screen, swiping up and down like the feed. */
export function PostViewer({ posts, start, mine, onClose, onDeleted, onAuthor }: { posts: Post[]; start: number | null; mine: boolean; onClose: () => void; onDeleted?: (p: Post) => void; onAuthor?: (p: Post) => void }) {
  const pal = usePalette();
  const insets = useSafeAreaInsets();
  const { height } = useWindowDimensions();
  const acct = useAccount();
  const toast = useToast();
  const [active, setActive] = useState(0);
  const [liked, setLiked] = useState<Set<string>>(new Set());
  const [comment, setComment] = useState<Post | null>(null);
  useEffect(() => {
    if (start !== null) setActive(start);
  }, [start]);
  useEffect(() => {
    if (acct.userId && start !== null) myPostLikes(acct.userId).then(setLiked, () => {});
  }, [acct.userId, start]);

  const like = (p: Post) => {
    if (!acct.userId || p.status !== 'approved') return;
    const on = !liked.has(p.id);
    setLiked((s) => {
      const n = new Set(s);
      if (on) n.add(p.id);
      else n.delete(p.id);
      return n;
    });
    setPostLike(acct.userId, p.id, on).catch(() => {});
  };
  const more = (p: Post) => {
    if (!acct.userId) return;
    if (mine)
      return Alert.alert('Your post', undefined, [
        { text: 'Delete post', style: 'destructive', onPress: () => deletePost(p).then(() => (toast('Post deleted'), onDeleted?.(p)), () => toast("Couldn't delete. Try again")) },
        { text: 'Cancel', style: 'cancel' },
      ]);
    Alert.alert(`Post by ${p.handle}`, undefined, [
      { text: 'Report this post', onPress: () => reportPost(p.id, acct.userId!).then(() => toast('Thanks. We’ll review it within 24 hours'), () => toast('Couldn’t send the report. Try again')) },
      { text: 'Cancel', style: 'cancel' },
    ]);
  };

  return (
    <Modal visible={start !== null} animationType="slide" onRequestClose={onClose}>
      <View style={{ flex: 1, backgroundColor: pal.bg }}>
        {start !== null && (
          <FlatList
            data={posts}
            keyExtractor={(p) => p.id}
            pagingEnabled
            showsVerticalScrollIndicator={false}
            initialScrollIndex={start}
            getItemLayout={(_, i) => ({ length: height, offset: height * i, index: i })}
            onMomentumScrollEnd={(e) => setActive(Math.round(e.nativeEvent.contentOffset.y / height))}
            renderItem={({ item, index }) => (
              <PostCard
                post={item}
                pal={pal}
                tone={pal.tones[index % pal.tones.length]}
                height={height}
                bottomInset={insets.bottom}
                active={index === active}
                autoplay
                liked={liked.has(item.id)}
                onLike={() => like(item)}
                onComment={() => (item.status === 'approved' ? setComment(item) : toast('Comments open once the post is live'))}
                onMore={() => more(item)}
                onAuthor={onAuthor ? () => onAuthor(item) : undefined}
              />
            )}
          />
        )}
        <Pressable onPress={onClose} style={[styles.viewerClose, { top: insets.top + 10, backgroundColor: mix(pal.surface, pal.text, 0.04) }]} accessibilityRole="button" accessibilityLabel="Close" hitSlop={8}>
          <Icon name="close" size={16} color={pal.text} />
        </Pressable>
        <ReflectionsSheet verseKey={comment ? postKey(comment.id) : null} title={comment ? `Post by ${comment.handle}` : ''} pal={pal} onClose={() => setComment(null)} />
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  viewerClose: { position: 'absolute', left: 16, width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
});
