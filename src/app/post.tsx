import * as ImagePicker from 'expo-image-picker';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, Image, KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { GuidelinesSheet } from '@/components/Guidelines';
import { Icon } from '@/components/Icon';
import { useToast } from '@/components/Toast';
import { useAccount } from '@/lib/account';
import { checkReflection } from '@/lib/moderation';
import { createPost, PostKind } from '@/lib/posts';
import { MoodId, MOODS } from '@/lib/quran';
import { fonts, mix, usePalette } from '@/lib/theme';

const MAX_SECONDS = 90;
const MAX_BYTES = 50 * 1024 * 1024;

/** Create a post: text, a photo or a short video. It goes to review before anyone else sees it. */
export default function NewPost() {
  const pal = usePalette();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const toast = useToast();
  const acct = useAccount();
  const [kind, setKind] = useState<PostKind>('text');
  const [media, setMedia] = useState<{ uri: string; mime: string } | null>(null);
  const [body, setBody] = useState('');
  const [source, setSource] = useState('');
  const [moods, setMoods] = useState<MoodId[]>([]);
  const [agreed, setAgreed] = useState(acct.guidelinesAccepted);
  const [showRules, setShowRules] = useState(false);
  const [sending, setSending] = useState(false);

  const pick = async (k: 'image' | 'video') => {
    const r = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: k === 'image' ? 'images' : 'videos',
      quality: 0.8,
      allowsEditing: k === 'video',
      videoMaxDuration: MAX_SECONDS,
      videoQuality: ImagePicker.UIImagePickerControllerQualityType.Medium,
    });
    const a = !r.canceled ? r.assets[0] : null;
    if (!a) return;
    if (k === 'video' && a.duration && a.duration / 1000 > MAX_SECONDS + 1) return toast(`Videos can be up to ${MAX_SECONDS} seconds`);
    if (a.fileSize && a.fileSize > MAX_BYTES) return toast('That file is too big. Try a shorter clip');
    setKind(k);
    setMedia({ uri: a.uri, mime: a.mimeType ?? (k === 'image' ? 'image/jpeg' : 'video/mp4') });
  };

  const toggleMood = (m: MoodId) => setMoods((l) => (l.includes(m) ? l.filter((x) => x !== m) : l.length < 3 ? [...l, m] : l));

  const problem = checkReflection(body) ?? (source ? checkReflection(source) : null);
  const ready = !!body.trim() && (kind === 'text' || !!media) && agreed && !problem && !sending;

  const send = async () => {
    if (!ready || !acct.userId) return;
    setSending(true);
    try {
      if (!acct.guidelinesAccepted) await acct.acceptGuidelines();
      await createPost({ userId: acct.userId, kind, body, source, moods, media: media ?? undefined });
      toast('Sent for review. We check every post, usually within 24 hours');
      router.back();
    } catch (e) {
      toast(String((e as Error)?.message ?? '').includes('row-level') ? 'You have 10 posts waiting already. Try again once they’re reviewed' : 'Couldn’t send. Check your connection and try again');
    } finally {
      setSending(false);
    }
  };

  return (
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={[styles.root, { backgroundColor: pal.bg }]}>
      <View style={[styles.head, { paddingTop: insets.top + 12, borderColor: pal.line }]}>
        <Text style={[styles.title, { color: pal.text }]}>New post</Text>
        <Pressable onPress={() => router.back()} style={[styles.x, { borderColor: pal.line }]} accessibilityRole="button" accessibilityLabel="Close">
          <Icon name="close" size={18} color={pal.text} />
        </Pressable>
      </View>
      <ScrollView contentContainerStyle={[styles.body, { paddingBottom: insets.bottom + 40 }]} keyboardShouldPersistTaps="handled">
        <View style={styles.row}>
          {(['text', 'image', 'video'] as const).map((k) => (
            <Pressable
              key={k}
              onPress={() => (k === 'text' ? (setKind('text'), setMedia(null)) : pick(k))}
              accessibilityRole="button"
              accessibilityState={{ selected: kind === k }}
              style={[styles.kind, { borderColor: kind === k ? pal.accent : pal.line, backgroundColor: kind === k ? mix(pal.bg, pal.accent, 0.08) : pal.surface }]}
            >
              <Text style={[styles.kindText, { color: pal.text }]}>{k === 'text' ? 'Text' : k === 'image' ? 'Photo' : 'Video'}</Text>
            </Pressable>
          ))}
        </View>

        {media && (
          <View style={[styles.preview, { borderColor: pal.line }]}>
            {kind === 'image' ? (
              <Image source={{ uri: media.uri }} style={styles.previewImg} resizeMode="cover" />
            ) : (
              <Text style={[styles.small, { color: pal.text, padding: 14 }]}>Video selected (up to {MAX_SECONDS} seconds)</Text>
            )}
            <Pressable onPress={() => (setMedia(null), setKind('text'))} style={styles.remove} accessibilityRole="button" accessibilityLabel="Remove">
              <Icon name="close" size={16} color="#fff" />
            </Pressable>
          </View>
        )}

        <TextInput
          value={body}
          onChangeText={setBody}
          placeholder={kind === 'text' ? 'Share a benefit, a reminder or something you learned' : 'Add a caption'}
          placeholderTextColor={pal.muted}
          multiline
          maxLength={600}
          style={[styles.input, styles.bodyInput, { color: pal.text, borderColor: pal.line, backgroundColor: pal.surface }]}
        />
        <TextInput
          value={source}
          onChangeText={setSource}
          placeholder="Source (e.g. Quran 2:286, Sahih al-Bukhari 1)"
          placeholderTextColor={pal.muted}
          maxLength={160}
          style={[styles.input, { color: pal.text, borderColor: pal.line, backgroundColor: pal.surface }]}
        />
        {!!problem && <Text style={[styles.small, { color: '#B4432F' }]}>{problem}</Text>}

        <Text style={[styles.h3, { color: pal.muted }]}>WHO IS IT FOR? (UP TO 3)</Text>
        <View style={styles.chips}>
          {MOODS.map((m) => {
            const on = moods.includes(m.id);
            return (
              <Pressable
                key={m.id}
                onPress={() => toggleMood(m.id)}
                accessibilityRole="button"
                accessibilityState={{ selected: on }}
                style={[styles.chip, { borderColor: on ? pal.accent : pal.line, backgroundColor: on ? mix(pal.bg, pal.accent, 0.1) : pal.surface }]}
              >
                <Text style={[styles.chipText, { color: pal.text }]}>{m.label}</Text>
              </Pressable>
            );
          })}
        </View>

        {!acct.guidelinesAccepted && (
          <Pressable onPress={() => setAgreed((a) => !a)} style={styles.agree} accessibilityRole="checkbox" accessibilityState={{ checked: agreed }}>
            <View style={[styles.check, { borderColor: agreed ? pal.accent : pal.line, backgroundColor: agreed ? pal.accent : 'transparent' }]}>
              {agreed && <Text style={{ color: '#fff', fontFamily: fonts.uiBold }}>✓</Text>}
            </View>
            <Text style={[styles.small, { color: pal.text, flex: 1 }]}>
              I agree to the{' '}
              <Text onPress={() => setShowRules(true)} style={{ color: pal.accent, textDecorationLine: 'underline' }}>
                community guidelines
              </Text>
            </Text>
          </Pressable>
        )}

        <Text style={[styles.small, { color: pal.muted }]}>
          Every post is checked before anyone else sees it. Quote the Quran and hadith with their source, and please don’t give religious rulings.
        </Text>

        <Pressable onPress={send} disabled={!ready} style={[styles.send, { backgroundColor: pal.text, opacity: ready ? 1 : 0.4 }]} accessibilityRole="button">
          {sending ? <ActivityIndicator color={pal.bg} /> : <Text style={[styles.sendText, { color: pal.bg }]}>Send for review</Text>}
        </Pressable>
      </ScrollView>
      <GuidelinesSheet visible={showRules} onClose={() => setShowRules(false)} pal={pal} />
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  head: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 18, paddingBottom: 12, borderBottomWidth: StyleSheet.hairlineWidth },
  title: { fontFamily: fonts.uiBold, fontSize: 26, letterSpacing: -0.5 },
  x: { width: 36, height: 36, borderRadius: 18, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  body: { padding: 18, gap: 14 },
  row: { flexDirection: 'row', gap: 8 },
  kind: { flex: 1, borderWidth: 1.5, borderRadius: 10, paddingVertical: 12, alignItems: 'center' },
  kindText: { fontFamily: fonts.uiBold, fontSize: 15 },
  preview: { borderWidth: 1, borderRadius: 12, overflow: 'hidden' },
  previewImg: { width: '100%', aspectRatio: 4 / 5 },
  remove: { position: 'absolute', top: 8, right: 8, width: 30, height: 30, borderRadius: 15, backgroundColor: 'rgba(0,0,0,0.5)', alignItems: 'center', justifyContent: 'center' },
  input: { fontFamily: fonts.ui, fontSize: 15, borderWidth: 1, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 11 },
  bodyInput: { minHeight: 120, textAlignVertical: 'top', fontFamily: fonts.read, fontSize: 16, lineHeight: 23 },
  small: { fontFamily: fonts.ui, fontSize: 13, lineHeight: 18 },
  h3: { fontFamily: fonts.uiBold, fontSize: 11, letterSpacing: 1.2, marginTop: 4 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  chip: { borderWidth: 1, borderRadius: 7, paddingHorizontal: 10, paddingVertical: 6 },
  chipText: { fontFamily: fonts.uiSemi, fontSize: 13 },
  agree: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  check: { width: 24, height: 24, borderRadius: 6, borderWidth: 1.5, alignItems: 'center', justifyContent: 'center' },
  send: { borderRadius: 12, minHeight: 50, alignItems: 'center', justifyContent: 'center', marginTop: 6 },
  sendText: { fontFamily: fonts.uiBold, fontSize: 16 },
});
