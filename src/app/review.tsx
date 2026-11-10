import { useRouter } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Icon } from '@/components/Icon';
import { PostMedia } from '@/components/PostCard';
import { useToast } from '@/components/Toast';
import { aiCheck, Post, reviewPost, reviewQueue } from '@/lib/posts';
import { MOODS } from '@/lib/quran';
import { fonts, usePalette } from '@/lib/theme';

/** Shown to the author when a post is turned down. */
const REASONS = ['Needs a source for the Quran or hadith', 'Gives a religious ruling', 'Not Islamic content', 'Breaks the community guidelines', 'Not their own content'];

/** For reviewers only (the database refuses anyone else): approve or turn down waiting posts, oldest first. */
export default function Review() {
  const pal = usePalette();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const toast = useToast();
  const [posts, setPosts] = useState<Post[] | null>(null);
  const [rejecting, setRejecting] = useState<string | null>(null);

  const load = useCallback(() => reviewQueue().then(setPosts, () => setPosts([])), []);
  useEffect(() => {
    load();
  }, [load]);

  const decide = async (p: Post, approve: boolean, note?: string) => {
    try {
      await reviewPost(p.id, approve, note);
      setPosts((l) => l?.filter((x) => x.id !== p.id) ?? null);
      setRejecting(null);
      toast(approve ? 'Approved. It’s now in For you' : 'Turned down. The author will see why');
    } catch {
      toast('Couldn’t save that. Check your connection');
    }
  };

  return (
    <View style={[styles.root, { backgroundColor: pal.bg }]}>
      <View style={[styles.head, { paddingTop: insets.top + 12, borderColor: pal.line }]}>
        <Text style={[styles.title, { color: pal.text }]}>Review posts{posts ? ` (${posts.length})` : ''}</Text>
        <Pressable onPress={() => router.back()} style={[styles.x, { borderColor: pal.line }]} accessibilityRole="button" accessibilityLabel="Close">
          <Icon name="close" size={18} color={pal.text} />
        </Pressable>
      </View>
      <ScrollView contentContainerStyle={[styles.body, { paddingBottom: insets.bottom + 40 }]}>
        {!posts && <ActivityIndicator color={pal.accent} style={{ marginTop: 40 }} />}
        {posts?.length === 0 && <Text style={[styles.small, { color: pal.muted, textAlign: 'center', marginTop: 40 }]}>Nothing waiting. All caught up.</Text>}
        {posts?.map((p) => (
          <View key={p.id} style={[styles.post, { borderColor: pal.line, backgroundColor: pal.surface }]}>
            <Text style={[styles.meta, { color: pal.muted }]}>
              {p.handle} · {new Date(p.created_at).toLocaleString('en-GB', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })} · {p.kind}
            </Text>
            <AiBox post={p} onChecked={load} pal={pal} />
            {p.kind !== 'text' && <PostMedia post={p} active autoplay={false} style={styles.media} />}
            <Text style={[styles.text, { color: pal.text }]}>{p.body}</Text>
            <Text style={[styles.small, { color: p.source ? pal.text : '#B4432F' }]}>Source: {p.source || 'none given'}</Text>
            {p.moods.length > 0 && <Text style={[styles.small, { color: pal.muted }]}>For: {p.moods.map((m) => MOODS.find((x) => x.id === m)?.label ?? m).join(', ')}</Text>}
            {rejecting === p.id ? (
              <View style={{ gap: 6 }}>
                <Text style={[styles.small, { color: pal.text, fontFamily: fonts.uiBold }]}>Why? (the author sees this)</Text>
                {REASONS.map((r) => (
                  <Pressable key={r} onPress={() => decide(p, false, r)} style={[styles.reason, { borderColor: pal.line }]} accessibilityRole="button">
                    <Text style={[styles.small, { color: pal.text }]}>{r}</Text>
                  </Pressable>
                ))}
                <Pressable onPress={() => setRejecting(null)} accessibilityRole="button">
                  <Text style={[styles.small, { color: pal.muted, textDecorationLine: 'underline' }]}>Cancel</Text>
                </Pressable>
              </View>
            ) : (
              <View style={styles.row}>
                <Pressable onPress={() => setRejecting(p.id)} style={[styles.btn, { borderColor: pal.line, borderWidth: 1 }]} accessibilityRole="button">
                  <Text style={[styles.btnText, { color: pal.text }]}>Turn down</Text>
                </Pressable>
                <Pressable onPress={() => decide(p, true)} style={[styles.btn, { backgroundColor: pal.accent }]} accessibilityRole="button">
                  <Text style={[styles.btnText, { color: pal.onAccent }]}>Approve</Text>
                </Pressable>
              </View>
            )}
          </View>
        ))}
      </ScrollView>
    </View>
  );
}

const AI_LOOK = {
  ok: { label: 'AI: looks fine', color: '#1F6E52', bg: '#E4F1EA' },
  check: { label: 'AI: check this', color: '#8A5A00', bg: '#FBEFD5' },
  reject: { label: 'AI: breaks the guidelines', color: '#B4432F', bg: '#F8E1DC' },
} as const;

/** What the AI first pass thought, or a button to run it if it hasn't checked this post yet. */
function AiBox({ post, onChecked, pal }: { post: Post; onChecked: () => void; pal: ReturnType<typeof usePalette> }) {
  const toast = useToast();
  const [busy, setBusy] = useState(false);
  if (!post.ai_verdict) {
    return (
      <Pressable
        disabled={busy}
        onPress={async () => {
          setBusy(true);
          try {
            await aiCheck(post.id, true);
            onChecked();
          } catch {
            toast('The AI check didn’t work. Review it yourself for now');
          } finally {
            setBusy(false);
          }
        }}
        style={[styles.reason, { borderColor: pal.line, alignSelf: 'flex-start' }]}
        accessibilityRole="button"
      >
        <Text style={[styles.small, { color: pal.muted }]}>{busy ? 'Checking…' : 'Not checked by AI yet · Check now'}</Text>
      </Pressable>
    );
  }
  const look = AI_LOOK[post.ai_verdict];
  return (
    <View style={[styles.ai, { backgroundColor: look.bg }]}>
      <Text style={[styles.aiLabel, { color: look.color }]}>{look.label}</Text>
      {!!post.ai_summary && <Text style={[styles.small, { color: '#1B1B1B' }]}>{post.ai_summary}</Text>}
      {!!post.ai_notes &&
        post.ai_notes.split('\n').map((n) => (
          <Text key={n} style={[styles.small, { color: '#1B1B1B' }]}>
            • {n}
          </Text>
        ))}
    </View>
  );
}

const styles = StyleSheet.create({
  ai: { borderRadius: 8, padding: 10, gap: 4 },
  aiLabel: { fontFamily: fonts.uiBold, fontSize: 12, letterSpacing: 0.4 },
  root: { flex: 1 },
  head: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 18, paddingBottom: 12, borderBottomWidth: StyleSheet.hairlineWidth },
  title: { fontFamily: fonts.uiBold, fontSize: 24, letterSpacing: -0.5 },
  x: { width: 36, height: 36, borderRadius: 18, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  body: { padding: 18, gap: 16 },
  post: { borderWidth: 1, borderRadius: 12, padding: 14, gap: 10 },
  meta: { fontFamily: fonts.uiSemi, fontSize: 12 },
  media: { width: '100%', height: 360, borderRadius: 8, overflow: 'hidden' },
  text: { fontFamily: fonts.read, fontSize: 16, lineHeight: 24 },
  small: { fontFamily: fonts.ui, fontSize: 13, lineHeight: 18 },
  row: { flexDirection: 'row', gap: 8 },
  btn: { flex: 1, borderRadius: 10, paddingVertical: 12, alignItems: 'center' },
  btnText: { fontFamily: fonts.uiBold, fontSize: 15 },
  reason: { borderWidth: 1, borderRadius: 8, paddingHorizontal: 12, paddingVertical: 10 },
});
