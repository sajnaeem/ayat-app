import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Alert, KeyboardAvoidingView, Modal, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Reflection, useAccount } from '@/lib/account';
import { checkReflection } from '@/lib/moderation';
import { fonts, Palette } from '@/lib/theme';
import { GuidelinesSheet } from './Guidelines';
import { Icon } from './Icon';
import { useToast } from './Toast';

function ago(iso: string) {
  const s = (Date.now() - new Date(iso).getTime()) / 1000;
  if (s < 60) return 'just now';
  if (s < 3600) return `${Math.floor(s / 60)}m`;
  if (s < 86400) return `${Math.floor(s / 3600)}h`;
  return `${Math.floor(s / 86400)}d`;
}

/** Reflections on one card: read what others wrote, add your own. A display name is asked for the first time you post. */
export function ReflectionsSheet({ verseKey, title, pal, onClose }: { verseKey: string | null; title: string; pal: Palette; onClose: () => void }) {
  const insets = useSafeAreaInsets();
  const acct = useAccount();
  const toast = useToast();
  const [list, setList] = useState<Reflection[] | null>(null);
  const [failed, setFailed] = useState(false);
  const [draft, setDraft] = useState('');
  const [name, setName] = useState('');
  const [sending, setSending] = useState(false);
  const [reading, setReading] = useState(false);
  const [agreeing, setAgreeing] = useState(false);

  const load = useCallback(() => {
    if (!verseKey) return;
    setFailed(false);
    acct
      .listReflections(verseKey)
      .then(setList)
      .catch(() => setFailed(true));
  }, [verseKey, acct]);

  useEffect(() => {
    setList(null);
    setDraft('');
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [verseKey]);

  const needsName = !acct.handle;

  const block = async (r: Reflection) => {
    try {
      await acct.blockUser(r.user_id);
      setList((l) => l?.filter((x) => x.user_id !== r.user_id) ?? null);
      toast(`Blocked ${r.handle}`);
    } catch {
      toast("Couldn't block. Try again");
    }
  };
  const confirmBlock = (r: Reflection) => {
    if (Platform.OS === 'web') return void block(r);
    Alert.alert(`Block ${r.handle}?`, "You won't see each other's reflections. You can unblock them any time from You → Blocked people.", [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Block', style: 'destructive', onPress: () => void block(r) },
    ]);
  };

  const agree = async () => {
    setAgreeing(true);
    try {
      await acct.acceptGuidelines();
    } catch {
      toast("Couldn't save. Check your connection and try again");
    } finally {
      setAgreeing(false);
    }
  };

  const send = async () => {
    if (!verseKey || sending) return;
    const body = draft.trim();
    if (!body) return;
    const problem = checkReflection(body);
    if (problem) {
      toast(problem);
      return;
    }
    setSending(true);
    try {
      if (needsName) {
        if (name.trim().length < 2) {
          toast('Choose a display name of at least 2 letters');
          return;
        }
        await acct.setHandle(name);
      }
      await acct.postReflection(verseKey, body);
      setDraft('');
      load();
    } catch {
      toast("Couldn't post — check your connection and try again");
    } finally {
      setSending(false);
    }
  };

  return (
    <Modal visible={!!verseKey} transparent animationType="slide" onRequestClose={onClose} statusBarTranslucent>
      <KeyboardAvoidingView style={styles.wrap} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <Pressable style={[StyleSheet.absoluteFill, { backgroundColor: pal.scrim }]} onPress={onClose} accessibilityLabel="Close" />
        <View style={[styles.sheet, { backgroundColor: pal.surface, borderColor: pal.line, paddingBottom: insets.bottom + 10 }]}>
          <View style={[styles.head, { borderBottomColor: pal.line }]}>
            <Text style={[styles.title, { color: pal.text }]}>
              Reflections <Text style={[styles.count, { color: pal.muted }]}>{list ? list.length : ''}</Text>
            </Text>
            <Pressable onPress={onClose} style={[styles.x, { borderColor: pal.line }]} accessibilityRole="button" accessibilityLabel="Close" hitSlop={8}>
              <Icon name="close" size={16} color={pal.text} />
            </Pressable>
          </View>
          <Text style={[styles.sub, { color: pal.muted }]}>{title}</Text>

          <ScrollView style={{ flexGrow: 0 }} contentContainerStyle={styles.list}>
            {!list && !failed && <ActivityIndicator color={pal.accent} style={{ padding: 20 }} />}
            {failed && (
              <Pressable onPress={load} accessibilityRole="button">
                <Text style={[styles.empty, { color: pal.muted }]}>Couldn't load reflections. Tap to try again.</Text>
              </Pressable>
            )}
            {list && list.length === 0 && <Text style={[styles.empty, { color: pal.muted }]}>Be the first to share what {verseKey} means to you.</Text>}
            {list?.map((r) => {
              const mine = r.user_id === acct.userId;
              return (
                <View key={r.id} style={styles.item}>
                  <View style={[styles.av, { backgroundColor: pal.accent }]}>
                    <Text style={[styles.avText, { color: pal.onAccent }]}>{r.handle.trim().charAt(0).toUpperCase()}</Text>
                  </View>
                  <View style={{ flex: 1, gap: 2 }}>
                    <View style={styles.meta}>
                      <Text style={[styles.handle, { color: pal.text }]}>{r.handle}</Text>
                      <Text style={[styles.time, { color: pal.muted }]}>{ago(r.created_at)}</Text>
                      {mine ? (
                        <Pressable
                          style={{ marginLeft: 'auto' }}
                          hitSlop={8}
                          accessibilityRole="button"
                          onPress={async () => {
                            try {
                              await acct.deleteReflection(r.id, verseKey!);
                              setList((l) => l?.filter((x) => x.id !== r.id) ?? null);
                            } catch {
                              toast("Couldn't do that. Try again");
                            }
                          }}
                        >
                          <Text style={[styles.time, styles.act, { color: pal.muted }]}>Delete</Text>
                        </Pressable>
                      ) : (
                        <View style={{ marginLeft: 'auto', flexDirection: 'row', gap: 14 }}>
                          <Pressable
                            hitSlop={8}
                            accessibilityRole="button"
                            accessibilityLabel={`Report ${r.handle}'s reflection`}
                            onPress={async () => {
                              try {
                                await acct.reportReflection(r.id);
                                toast('Thanks. Reported for review');
                              } catch {
                                toast("Couldn't do that. Try again");
                              }
                            }}
                          >
                            <Text style={[styles.time, styles.act, { color: pal.muted }]}>Report</Text>
                          </Pressable>
                          <Pressable hitSlop={8} accessibilityRole="button" accessibilityLabel={`Block ${r.handle}`} onPress={() => confirmBlock(r)}>
                            <Text style={[styles.time, styles.act, { color: pal.muted }]}>Block</Text>
                          </Pressable>
                        </View>
                      )}
                    </View>
                    <Text style={[styles.body, { color: pal.text }]}>{r.body}</Text>
                  </View>
                </View>
              );
            })}
          </ScrollView>

          <View style={[styles.compose, { borderTopColor: pal.line }]}>
            {acct.guidelinesAccepted ? (
              <>
                {needsName && (
                  <TextInput
                    value={name}
                    onChangeText={setName}
                    placeholder="Your display name (everyone sees this)"
                    placeholderTextColor={pal.muted}
                    maxLength={32}
                    style={[styles.input, { color: pal.text, borderColor: pal.line, backgroundColor: pal.bg }]}
                    accessibilityLabel="Display name"
                  />
                )}
                <View style={styles.row}>
                  <TextInput
                    value={draft}
                    onChangeText={setDraft}
                    placeholder="What does this ayah mean to you right now?"
                    placeholderTextColor={pal.muted}
                    maxLength={400}
                    multiline
                    style={[styles.input, { flex: 1, color: pal.text, borderColor: pal.line, backgroundColor: pal.bg }]}
                    accessibilityLabel="Write a reflection"
                  />
                  <Pressable onPress={send} disabled={sending || !draft.trim()} style={[styles.post, { backgroundColor: pal.text, opacity: sending || !draft.trim() ? 0.4 : 1 }]} accessibilityRole="button">
                    <Text style={[styles.postText, { color: pal.bg }]}>{sending ? '…' : 'Post'}</Text>
                  </Pressable>
                </View>
                <Text style={[styles.rules, { color: pal.muted }]}>
                  Keep it kind and about the ayah.{' '}
                  <Text onPress={() => setReading(true)} style={{ textDecorationLine: 'underline' }}>
                    Community guidelines
                  </Text>
                </Text>
              </>
            ) : (
              <View style={{ gap: 10 }}>
                <Text style={[styles.body, { color: pal.text }]}>Before you post, please agree to Munib's community guidelines: be kind, stay with the ayah, no hate or abuse.</Text>
                <View style={styles.row}>
                  <Pressable onPress={() => setReading(true)} style={[styles.post, { flex: 1, borderWidth: 1, borderColor: pal.line, alignItems: 'center' }]} accessibilityRole="button">
                    <Text style={[styles.postText, { color: pal.text }]}>Read them</Text>
                  </Pressable>
                  <Pressable onPress={agree} disabled={agreeing} style={[styles.post, { flex: 1, backgroundColor: pal.text, alignItems: 'center', opacity: agreeing ? 0.5 : 1 }]} accessibilityRole="button">
                    <Text style={[styles.postText, { color: pal.bg }]}>{agreeing ? '…' : 'I agree'}</Text>
                  </Pressable>
                </View>
              </View>
            )}
          </View>
          <GuidelinesSheet visible={reading} onClose={() => setReading(false)} pal={pal} />
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  wrap: { flex: 1, justifyContent: 'flex-end' },
  sheet: { maxHeight: '85%', borderTopLeftRadius: 20, borderTopRightRadius: 20, borderTopWidth: StyleSheet.hairlineWidth },
  head: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 18, paddingTop: 16, paddingBottom: 10 },
  title: { fontFamily: fonts.uiBold, fontSize: 20 },
  count: { fontFamily: fonts.ui, fontSize: 14 },
  sub: { fontFamily: fonts.ui, fontSize: 13, paddingHorizontal: 18, marginTop: -4, marginBottom: 6 },
  x: { width: 36, height: 36, borderRadius: 18, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  list: { paddingHorizontal: 18, paddingVertical: 10, gap: 16 },
  empty: { fontFamily: fonts.ui, fontSize: 14, textAlign: 'center', paddingVertical: 22 },
  item: { flexDirection: 'row', gap: 10 },
  av: { width: 34, height: 34, borderRadius: 17, alignItems: 'center', justifyContent: 'center' },
  avText: { fontFamily: fonts.uiBold, fontSize: 14 },
  meta: { flexDirection: 'row', gap: 8, alignItems: 'baseline' },
  handle: { fontFamily: fonts.uiBold, fontSize: 13 },
  time: { fontFamily: fonts.ui, fontSize: 12 },
  body: { fontFamily: fonts.read, fontSize: 15, lineHeight: 22 },
  compose: { borderTopWidth: StyleSheet.hairlineWidth, paddingHorizontal: 18, paddingTop: 10, gap: 8 },
  row: { flexDirection: 'row', gap: 8, alignItems: 'flex-end' },
  input: { fontFamily: fonts.ui, fontSize: 15, borderWidth: 1, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10, maxHeight: 110 },
  post: { borderRadius: 10, paddingHorizontal: 16, paddingVertical: 12 },
  postText: { fontFamily: fonts.uiBold, fontSize: 15 },
  rules: { fontFamily: fonts.ui, fontSize: 11, lineHeight: 15 },
  act: { textDecorationLine: 'underline' },
});
