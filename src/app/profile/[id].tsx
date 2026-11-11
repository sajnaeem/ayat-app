import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Alert, FlatList, Image, Modal, Pressable, ScrollView, StyleSheet, Text, TextInput, useWindowDimensions, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Avatar } from '@/components/Avatar';
import { Icon } from '@/components/Icon';
import { NameMeaning } from '@/components/NameMeaning';
import { PostCard } from '@/components/PostCard';
import { ReflectionsSheet } from '@/components/Reflections';
import { Sheet } from '@/components/Sheet';
import { useToast } from '@/components/Toast';
import { useAccount } from '@/lib/account';
import { checkReflection } from '@/lib/moderation';
import { deletePost, mediaUrl, myPostLikes, Post, postKey, reportPost, setPostLike } from '@/lib/posts';
import { follow, myPeople, Person, postsBy, Profile, profileCard, removeFollower, saveBio } from '@/lib/profiles';
import { fonts, mix, Palette, usePalette } from '@/lib/theme';

/**
 * A person's profile: who they are, their counts, and the posts they've shared, like Instagram or TikTok.
 * Your own profile also shows posts waiting for review, lets you edit your name and bio, and lists your
 * followers and who you follow (those lists are private to you).
 */
export default function ProfileScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const pal = usePalette();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const acct = useAccount();
  const toast = useToast();
  const { width } = useWindowDimensions();
  const mine = !!acct.userId && acct.userId === id;

  const [prof, setProf] = useState<Profile | null | undefined>(undefined);
  const [posts, setPosts] = useState<Post[] | null>(null);
  const [open, setOpen] = useState<number | null>(null);
  const [people, setPeople] = useState<{ which: 'followers' | 'following'; list: Person[] | null } | null>(null);
  const [editing, setEditing] = useState(false);
  const [busy, setBusy] = useState(false);

  const load = useCallback(() => {
    if (!id) return;
    profileCard(id).then(setProf, () => setProf(null));
    postsBy(id, mine).then(setPosts, () => setPosts([]));
  }, [id, mine]);
  useFocusEffect(load);

  const toggleFollow = async () => {
    if (!acct.userId || !prof || busy) return;
    const on = !prof.i_follow;
    setBusy(true);
    setProf({ ...prof, i_follow: on, followers: prof.followers + (on ? 1 : -1) });
    try {
      await follow(acct.userId, prof.id, on);
    } catch {
      setProf(prof);
      toast("Couldn't update. Check your connection and try again");
    } finally {
      setBusy(false);
    }
  };

  const openList = (which: 'followers' | 'following') => {
    if (!mine || !acct.userId) return;
    setPeople({ which, list: null });
    myPeople(acct.userId, which).then((list) => setPeople({ which, list }), () => setPeople({ which, list: [] }));
  };

  const moreMenu = () => {
    if (!prof || !acct.userId) return;
    Alert.alert(prof.handle, undefined, [
      {
        text: `Block ${prof.handle}`,
        style: 'destructive',
        onPress: () =>
          acct.blockUser(prof.id).then(
            () => {
              toast(`Blocked ${prof.handle}`);
              router.back();
            },
            () => toast("Couldn't block. Try again"),
          ),
      },
      { text: 'Cancel', style: 'cancel' },
    ]);
  };

  const gap = 3;
  const tile = Math.floor((width - 32 - gap * 2) / 3);

  return (
    <View style={[styles.root, { backgroundColor: pal.bg }]}>
      <View style={[styles.head, { paddingTop: insets.top + 10 }]}>
        <Pressable onPress={() => router.back()} style={[styles.round, { backgroundColor: pal.surface }]} accessibilityRole="button" accessibilityLabel="Back" hitSlop={8}>
          <Icon name="close" size={16} color={pal.text} />
        </Pressable>
        <Text style={[styles.headTitle, { color: pal.text }]} numberOfLines={1}>
          {prof?.handle ?? ''}
        </Text>
        {!mine && prof ? (
          <Pressable onPress={moreMenu} style={[styles.round, { backgroundColor: pal.surface }]} accessibilityRole="button" accessibilityLabel="More" hitSlop={8}>
            <Text style={{ color: pal.text, fontFamily: fonts.uiBold, fontSize: 18, marginTop: -6 }}>…</Text>
          </Pressable>
        ) : (
          <View style={{ width: 36 }} />
        )}
      </View>

      {prof === undefined ? (
        <ActivityIndicator color={pal.accent} style={{ marginTop: 60 }} />
      ) : prof === null ? (
        <Text style={[styles.empty, { color: pal.muted }]}>This profile isn't available.</Text>
      ) : (
        <ScrollView contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: insets.bottom + 40 }}>
          <View style={styles.top}>
            <Avatar id={prof.id} name={prof.handle} size={84} />
            <View style={styles.counts}>
              <Count pal={pal} n={prof.posts} label={prof.posts === 1 ? 'Post' : 'Posts'} />
              <Count pal={pal} n={prof.followers} label={prof.followers === 1 ? 'Follower' : 'Followers'} onPress={mine ? () => openList('followers') : undefined} />
              <Count pal={pal} n={prof.following} label="Following" onPress={mine ? () => openList('following') : undefined} />
            </View>
          </View>
          <Text style={[styles.name, { color: pal.text }]}>{prof.handle}</Text>
          {!!prof.bio && <Text style={[styles.bio, { color: pal.text }]}>{prof.bio}</Text>}
          {!mine && prof.follows_me && <Text style={[styles.badge, { color: pal.muted, backgroundColor: pal.surface }]}>Follows you</Text>}

          <View style={styles.actions}>
            {mine ? (
              <>
                <Btn pal={pal} title="Edit profile" onPress={() => setEditing(true)} />
                <Btn pal={pal} title="Create a post" primary onPress={() => router.push('/post')} />
              </>
            ) : (
              <Btn pal={pal} title={prof.i_follow ? 'Following' : 'Follow'} primary={!prof.i_follow} onPress={toggleFollow} />
            )}
          </View>

          {mine && !!acct.handle && (
            <View style={{ marginTop: 14 }}>
              <NameMeaning name={acct.handle} pal={pal} />
            </View>
          )}

          <View style={[styles.gridHead, { borderTopColor: pal.line }]}>
            <Icon name="book" size={18} color={pal.text} />
            <Text style={[styles.gridTitle, { color: pal.text }]}>Posts</Text>
          </View>
          {posts === null ? (
            <ActivityIndicator color={pal.accent} style={{ marginTop: 20 }} />
          ) : posts.length === 0 ? (
            <View style={styles.none}>
              <Text style={[styles.noneTitle, { color: pal.text }]}>{mine ? 'Share your first post' : 'No posts yet'}</Text>
              <Text style={[styles.noneSub, { color: pal.muted }]}>
                {mine ? 'A benefit, a reminder or a short video. Every post is checked before it goes live.' : `When ${prof.handle} shares something, it will show here.`}
              </Text>
            </View>
          ) : (
            <View style={[styles.grid, { gap }]}>
              {posts.map((p, i) => (
                <Tile key={p.id} post={p} pal={pal} size={tile} mine={mine} onPress={() => setOpen(i)} />
              ))}
            </View>
          )}
        </ScrollView>
      )}

      {posts && (
        <PostViewer
          posts={posts}
          start={open}
          mine={mine}
          onClose={() => setOpen(null)}
          onDeleted={(p) => {
            setPosts((l) => l?.filter((x) => x.id !== p.id) ?? null);
            setOpen(null);
            load();
          }}
        />
      )}

      <Sheet visible={!!people} onClose={() => setPeople(null)} title={people?.which === 'followers' ? 'Followers' : 'Following'} pal={pal}>
        {people?.list === null && <ActivityIndicator color={pal.accent} />}
        {people?.list?.length === 0 && (
          <Text style={[styles.noneSub, { color: pal.muted }]}>
            {people.which === 'followers' ? 'Nobody follows you yet. When people follow you, they see your posts first.' : "You're not following anyone yet. Tap a name on a post to see their profile."}
          </Text>
        )}
        {people?.list?.map((u) => (
          <View key={u.id} style={[styles.person, { borderBottomColor: pal.line }]}>
            <Pressable
              style={styles.personMain}
              onPress={() => {
                setPeople(null);
                router.push(`/profile/${u.id}`);
              }}
              accessibilityRole="button"
            >
              <Avatar id={u.id} name={u.handle} size={38} />
              <Text style={[styles.personName, { color: pal.text }]}>{u.handle}</Text>
            </Pressable>
            <Pressable
              hitSlop={8}
              accessibilityRole="button"
              onPress={async () => {
                if (!acct.userId) return;
                try {
                  if (people.which === 'followers') await removeFollower(acct.userId, u.id);
                  else await follow(acct.userId, u.id, false);
                  setPeople((x) => (x ? { ...x, list: x.list?.filter((y) => y.id !== u.id) ?? null } : x));
                  load();
                } catch {
                  toast("Couldn't update. Try again");
                }
              }}
              style={[styles.smallBtn, { backgroundColor: pal.bg }]}
            >
              <Text style={[styles.smallBtnText, { color: pal.text }]}>{people.which === 'followers' ? 'Remove' : 'Unfollow'}</Text>
            </Pressable>
          </View>
        ))}
      </Sheet>

      {mine && prof && (
        <EditProfile
          visible={editing}
          pal={pal}
          handle={acct.handle ?? prof.handle}
          bio={prof.bio ?? ''}
          onClose={() => setEditing(false)}
          onSave={async (name, bio) => {
            if (name.trim().length < 2) return toast('Choose a display name of at least 2 letters');
            const bad = checkReflection(bio);
            if (bad) return toast(bad.replace('reflections', 'your bio'));
            try {
              if (name.trim() !== acct.handle) await acct.setHandle(name);
              await saveBio(acct.userId!, bio);
              setEditing(false);
              toast('Profile saved');
              load();
            } catch {
              toast("Couldn't save. Check your connection and try again");
            }
          }}
        />
      )}
    </View>
  );
}

function Count({ pal, n, label, onPress }: { pal: Palette; n: number; label: string; onPress?: () => void }) {
  return (
    <Pressable onPress={onPress} disabled={!onPress} style={styles.count} accessibilityRole={onPress ? 'button' : 'text'}>
      <Text style={[styles.countN, { color: pal.text }]}>{n}</Text>
      <Text style={[styles.countL, { color: pal.muted }]}>{label}</Text>
    </Pressable>
  );
}

function Btn({ pal, title, onPress, primary }: { pal: Palette; title: string; onPress: () => void; primary?: boolean }) {
  return (
    <Pressable onPress={onPress} style={({ pressed }) => [styles.btn, { backgroundColor: primary ? pal.accent : pal.surface, opacity: pressed ? 0.7 : 1 }]} accessibilityRole="button">
      <Text style={[styles.btnText, { color: primary ? pal.onAccent : pal.text }]}>{title}</Text>
    </Pressable>
  );
}

/** One square in the posts grid: the photo, a dark tile for a video, or the start of the text. */
function Tile({ post, pal, size, mine, onPress }: { post: Post; pal: Palette; size: number; mine: boolean; onPress: () => void }) {
  const [url, setUrl] = useState<string | null>(null);
  useEffect(() => {
    if (post.kind === 'image' && post.media_path) mediaUrl(post.media_path).then(setUrl, () => {});
  }, [post]);
  const tone = pal.tones[Math.abs(post.id.charCodeAt(0) + post.id.charCodeAt(1)) % pal.tones.length];
  const status = post.status === 'approved' ? null : post.status === 'pending' ? 'Waiting' : post.status === 'rejected' ? 'Not approved' : 'Removed';
  return (
    <Pressable onPress={onPress} style={[styles.tile, { width: size, height: size * 1.3, backgroundColor: post.kind === 'text' ? tone.bg : '#0E1411' }]} accessibilityRole="button" accessibilityLabel="Open post">
      {post.kind === 'image' && url && <Image source={{ uri: url }} style={StyleSheet.absoluteFill} resizeMode="cover" />}
      {post.kind === 'text' && (
        <Text style={[styles.tileText, { color: pal.dark ? '#E9EEE9' : '#18201B' }]} numberOfLines={6}>
          {post.body}
        </Text>
      )}
      {post.kind === 'video' && (
        <>
          <Text style={[styles.tileText, { color: '#fff', opacity: 0.85 }]} numberOfLines={4}>
            {post.body}
          </Text>
          <View style={styles.tilePlay}>
            <Icon name="play" size={14} color="#fff" fill />
          </View>
        </>
      )}
      {mine && status && (
        <View style={[styles.tileStatus, { backgroundColor: post.status === 'pending' ? 'rgba(0,0,0,0.6)' : '#B4432F' }]}>
          <Text style={styles.tileStatusText}>{status}</Text>
        </View>
      )}
    </Pressable>
  );
}

/** Someone's posts, full screen, swiping up and down like the feed. */
function PostViewer({ posts, start, mine, onClose, onDeleted }: { posts: Post[]; start: number | null; mine: boolean; onClose: () => void; onDeleted: (p: Post) => void }) {
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
        { text: 'Delete post', style: 'destructive', onPress: () => deletePost(p).then(() => (toast('Post deleted'), onDeleted(p)), () => toast("Couldn't delete. Try again")) },
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

function EditProfile({ visible, pal, handle, bio, onClose, onSave }: { visible: boolean; pal: Palette; handle: string; bio: string; onClose: () => void; onSave: (name: string, bio: string) => void }) {
  const [n, setN] = useState(handle);
  const [b, setB] = useState(bio);
  useEffect(() => {
    if (visible) {
      setN(handle);
      setB(bio);
    }
  }, [visible, handle, bio]);
  return (
    <Sheet visible={visible} onClose={onClose} title="Edit profile" pal={pal}>
      <Text style={[styles.label, { color: pal.muted }]}>Display name</Text>
      <TextInput value={n} onChangeText={setN} maxLength={32} style={[styles.input, { color: pal.text, backgroundColor: pal.bg }]} accessibilityLabel="Display name" />
      <Text style={[styles.label, { color: pal.muted }]}>Bio</Text>
      <TextInput
        value={b}
        onChangeText={setB}
        maxLength={150}
        multiline
        placeholder="A line about you, e.g. Learning to read the Quran, one ayah at a time"
        placeholderTextColor={pal.muted}
        style={[styles.input, { color: pal.text, backgroundColor: pal.bg, minHeight: 84, textAlignVertical: 'top' }]}
        accessibilityLabel="Bio"
      />
      <Text style={[styles.countL, { color: pal.muted, alignSelf: 'flex-end' }]}>{b.length}/150</Text>
      <Pressable onPress={() => onSave(n, b)} style={[styles.btn, { backgroundColor: pal.accent, flex: 0, paddingVertical: 14 }]} accessibilityRole="button">
        <Text style={[styles.btnText, { color: pal.onAccent }]}>Save</Text>
      </Pressable>
    </Sheet>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  head: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 16, paddingBottom: 10 },
  headTitle: { flex: 1, textAlign: 'center', fontFamily: fonts.uiBold, fontSize: 17 },
  round: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  empty: { textAlign: 'center', marginTop: 60, fontFamily: fonts.ui, fontSize: 15 },
  top: { flexDirection: 'row', alignItems: 'center', gap: 18, marginTop: 6 },
  counts: { flex: 1, flexDirection: 'row', justifyContent: 'space-around' },
  count: { alignItems: 'center', minWidth: 64 },
  countN: { fontFamily: fonts.uiBold, fontSize: 20, fontVariant: ['tabular-nums'] },
  countL: { fontFamily: fonts.ui, fontSize: 13 },
  name: { fontFamily: fonts.uiBold, fontSize: 18, marginTop: 14 },
  bio: { fontFamily: fonts.ui, fontSize: 15, lineHeight: 21, marginTop: 4 },
  badge: { alignSelf: 'flex-start', marginTop: 8, fontFamily: fonts.uiSemi, fontSize: 12, paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6, overflow: 'hidden' },
  actions: { flexDirection: 'row', gap: 8, marginTop: 14 },
  btn: { flex: 1, borderRadius: 10, paddingVertical: 11, alignItems: 'center' },
  btnText: { fontFamily: fonts.uiBold, fontSize: 15 },
  gridHead: { flexDirection: 'row', alignItems: 'center', gap: 8, borderTopWidth: StyleSheet.hairlineWidth, marginTop: 18, paddingTop: 14, paddingBottom: 10 },
  gridTitle: { fontFamily: fonts.uiBold, fontSize: 15 },
  grid: { flexDirection: 'row', flexWrap: 'wrap' },
  tile: { borderRadius: 6, overflow: 'hidden', padding: 8, justifyContent: 'flex-start' },
  tileText: { fontFamily: fonts.read, fontSize: 12, lineHeight: 16 },
  tilePlay: { position: 'absolute', right: 6, top: 6 },
  tileStatus: { position: 'absolute', left: 0, right: 0, bottom: 0, paddingVertical: 4, alignItems: 'center' },
  tileStatusText: { color: '#fff', fontFamily: fonts.uiBold, fontSize: 11 },
  none: { alignItems: 'center', paddingVertical: 36, gap: 6, paddingHorizontal: 20 },
  noneTitle: { fontFamily: fonts.uiBold, fontSize: 17 },
  noneSub: { fontFamily: fonts.ui, fontSize: 14, lineHeight: 20, textAlign: 'center' },
  person: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 10, borderBottomWidth: StyleSheet.hairlineWidth },
  personMain: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 12 },
  personName: { fontFamily: fonts.uiSemi, fontSize: 16 },
  smallBtn: { borderRadius: 8, paddingHorizontal: 12, paddingVertical: 7 },
  smallBtnText: { fontFamily: fonts.uiSemi, fontSize: 13 },
  viewerClose: { position: 'absolute', left: 16, width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  label: { fontFamily: fonts.uiSemi, fontSize: 13 },
  input: { fontFamily: fonts.ui, fontSize: 16, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 12 },
});
