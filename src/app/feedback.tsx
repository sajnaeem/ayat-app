import Constants from 'expo-constants';
import * as Device from 'expo-device';
import * as ImagePicker from 'expo-image-picker';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Image, KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Icon } from '@/components/Icon';
import { useToast } from '@/components/Toast';
import { useAccount } from '@/lib/account';
import { useProgress } from '@/lib/progress';
import { usePrefs } from '@/lib/store';
import { supabase } from '@/lib/supabase';
import { fonts, usePalette } from '@/lib/theme';

type Kind = 'bug' | 'idea' | 'other';
const KINDS: { id: Kind; title: string; sub: string; prompt: string }[] = [
  { id: 'bug', title: "Something's not working", sub: 'Tell us what happened', prompt: 'What did you do, what did you expect, and what happened instead?' },
  { id: 'idea', title: 'I have an idea', sub: 'A feature or improvement', prompt: 'What would make Munib better for you?' },
  { id: 'other', title: 'Something else', sub: 'Anything on your mind', prompt: "What's on your mind?" },
];

/** Send feedback: a bug, an idea, or anything else. Device details are attached so bugs can be traced. */
export default function Feedback() {
  const pal = usePalette();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const toast = useToast();
  const acct = useAccount();
  const prefs = usePrefs();
  const { level } = useProgress();
  const [kind, setKind] = useState<Kind>('bug');
  const [message, setMessage] = useState('');
  const [shot, setShot] = useState<{ uri: string; mime: string } | null>(null);
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const k = KINDS.find((x) => x.id === kind)!;

  const pick = async () => {
    const r = await ImagePicker.launchImageLibraryAsync({ mediaTypes: 'images', quality: 0.7 });
    if (!r.canceled && r.assets[0]) setShot({ uri: r.assets[0].uri, mime: r.assets[0].mimeType ?? 'image/jpeg' });
  };

  const send = async () => {
    if (!supabase || !acct.userId || !message.trim() || sending) return;
    setSending(true);
    try {
      let screenshot: string | null = null;
      if (shot) {
        const ext = shot.mime.includes('png') ? 'png' : 'jpg';
        const path = `${acct.userId}/${Date.now()}.${ext}`;
        const body = await (await fetch(shot.uri)).arrayBuffer();
        const up = await supabase.storage.from('feedback').upload(path, body, { contentType: shot.mime });
        if (!up.error) screenshot = path;
      }
      const meta = {
        app: Constants.expoConfig?.version ?? null,
        os: `${Platform.OS} ${Device.osVersion ?? Platform.Version}`,
        device: Device.modelName ?? null,
        lang: prefs.lang,
        reciter: prefs.reciter,
        transliteration: prefs.showTl,
        reminders: prefs.reminders.on,
        level,
        handle: acct.handle,
      };
      const { error } = await supabase.from('feedback').insert({ kind, message: message.trim(), meta, screenshot, user_id: acct.userId });
      if (error) throw error;
      setSent(true);
    } catch {
      toast("Couldn't send — check your connection and try again");
    } finally {
      setSending(false);
    }
  };

  return (
    <KeyboardAvoidingView style={{ flex: 1, backgroundColor: pal.bg }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <View style={[styles.head, { paddingTop: insets.top + 12, borderBottomColor: pal.line }]}>
        <Text style={[styles.title, { color: pal.text }]}>Send feedback</Text>
        <Pressable onPress={() => router.back()} style={[styles.x, { borderColor: pal.line }]} accessibilityRole="button" accessibilityLabel="Close" hitSlop={8}>
          <Icon name="close" size={16} color={pal.text} />
        </Pressable>
      </View>

      {sent ? (
        <View style={[styles.done, { paddingBottom: insets.bottom + 40 }]}>
          <Text style={[styles.doneTitle, { color: pal.text }]}>JazakAllahu khayran</Text>
          <Text style={[styles.body, { color: pal.muted }]}>We read every message. Thank you for helping make Munib better.</Text>
          <Pressable onPress={() => router.back()} style={[styles.btn, { backgroundColor: pal.text }]} accessibilityRole="button">
            <Text style={[styles.btnText, { color: pal.bg }]}>Done</Text>
          </Pressable>
        </View>
      ) : (
        <ScrollView contentContainerStyle={[styles.wrap, { paddingBottom: insets.bottom + 30 }]} keyboardShouldPersistTaps="handled">
          <View style={{ gap: 8 }}>
            {KINDS.map((x) => {
              const on = x.id === kind;
              return (
                <Pressable key={x.id} onPress={() => setKind(x.id)} style={[styles.opt, { borderColor: on ? pal.accent : pal.line, borderWidth: on ? 2 : 1 }]} accessibilityRole="radio" accessibilityState={{ checked: on }}>
                  <Text style={[styles.optTitle, { color: pal.text }]}>{x.title}</Text>
                  <Text style={[styles.optSub, { color: pal.muted }]}>{x.sub}</Text>
                </Pressable>
              );
            })}
          </View>

          <TextInput
            value={message}
            onChangeText={setMessage}
            placeholder={k.prompt}
            placeholderTextColor={pal.muted}
            multiline
            maxLength={4000}
            textAlignVertical="top"
            style={[styles.input, { color: pal.text, borderColor: pal.line, backgroundColor: pal.surface }]}
            accessibilityLabel="Your message"
          />

          {shot ? (
            <View style={styles.shotRow}>
              <Image source={{ uri: shot.uri }} style={[styles.shot, { borderColor: pal.line }]} accessibilityLabel="Attached screenshot" />
              <Pressable onPress={() => setShot(null)} accessibilityRole="button">
                <Text style={[styles.link, { color: pal.muted }]}>Remove screenshot</Text>
              </Pressable>
            </View>
          ) : (
            <Pressable onPress={pick} style={[styles.attach, { borderColor: pal.line }]} accessibilityRole="button">
              <Text style={[styles.optTitle, { color: pal.text }]}>Attach a screenshot</Text>
              <Text style={[styles.optSub, { color: pal.muted }]}>Optional, but it helps us fix things faster</Text>
            </Pressable>
          )}

          <Pressable onPress={send} disabled={!message.trim() || sending} style={[styles.btn, { backgroundColor: pal.text, opacity: !message.trim() || sending ? 0.4 : 1 }]} accessibilityRole="button">
            <Text style={[styles.btnText, { color: pal.bg }]}>{sending ? 'Sending…' : 'Send'}</Text>
          </Pressable>
          <Text style={[styles.fine, { color: pal.muted }]}>
            We include your app version, iPhone model and settings so we can fix problems. Nothing else about you is attached.
          </Text>
        </ScrollView>
      )}
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  head: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 18, paddingBottom: 12, borderBottomWidth: StyleSheet.hairlineWidth },
  title: { fontFamily: fonts.uiBold, fontSize: 24, letterSpacing: -0.4 },
  x: { width: 36, height: 36, borderRadius: 18, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  wrap: { padding: 18, gap: 14 },
  opt: { borderRadius: 10, padding: 12, gap: 2 },
  optTitle: { fontFamily: fonts.uiSemi, fontSize: 15 },
  optSub: { fontFamily: fonts.ui, fontSize: 12, lineHeight: 17 },
  input: { fontFamily: fonts.ui, fontSize: 16, lineHeight: 22, borderWidth: 1, borderRadius: 10, padding: 12, minHeight: 140 },
  attach: { borderWidth: 1, borderStyle: 'dashed', borderRadius: 10, padding: 12, gap: 2 },
  shotRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  shot: { width: 72, height: 128, borderRadius: 8, borderWidth: 1 },
  link: { fontFamily: fonts.ui, fontSize: 14, textDecorationLine: 'underline' },
  btn: { minHeight: 50, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  btnText: { fontFamily: fonts.uiBold, fontSize: 16 },
  fine: { fontFamily: fonts.ui, fontSize: 12, lineHeight: 17 },
  done: { flex: 1, justifyContent: 'center', padding: 24, gap: 14 },
  doneTitle: { fontFamily: fonts.uiBold, fontSize: 30, letterSpacing: -0.6 },
  body: { fontFamily: fonts.read, fontSize: 17, lineHeight: 25 },
});
