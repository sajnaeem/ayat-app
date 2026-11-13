import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Icon } from '@/components/Icon';
import { KhatmBar } from '@/components/KhatmBar';
import { useToast } from '@/components/Toast';
import { useAccount } from '@/lib/account';
import { joinKhatm, Preview, previewKhatm } from '@/lib/together';
import { fonts, usePalette } from '@/lib/theme';

/**
 * An invite to a khatm: getmunib.com/k/ABC234 (or munib://k/ABC234) opens here.
 * Shows what it is, then joins (signing in first if needed).
 */
export default function JoinKhatm() {
  const { code } = useLocalSearchParams<{ code: string }>();
  const c = String(code ?? '').toUpperCase();
  const pal = usePalette();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const toast = useToast();
  const acct = useAccount();
  const [p, setP] = useState<Preview | null | undefined>(undefined);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    previewKhatm(c)
      .then((x) => setP(x ?? null))
      .catch(() => setP(null));
  }, [c, acct.status]);

  const join = async () => {
    if (acct.status !== 'signedIn') return router.push({ pathname: '/signin', params: { why: 'together' } });
    if (!p) return;
    setBusy(true);
    try {
      const id = await joinKhatm(c);
      router.replace({ pathname: '/together/[id]', params: { id } });
    } catch (e) {
      const m = String((e as Error).message);
      toast(m.includes('full') ? 'This khatm is full' : m.includes('too many') ? 'You’re in a lot of khatms already. Leave one first' : 'Couldn’t join. Check your connection');
    } finally {
      setBusy(false);
    }
  };

  return (
    <View style={[styles.root, { backgroundColor: pal.bg, paddingTop: insets.top + 12, paddingBottom: insets.bottom + 24 }]}>
      <View style={styles.head}>
        <Pressable onPress={() => (router.canGoBack() ? router.back() : router.replace('/'))} style={[styles.x, { borderColor: pal.line }]} accessibilityRole="button" accessibilityLabel="Close" hitSlop={8}>
          <Icon name="close" size={18} color={pal.text} />
        </Pressable>
      </View>
      {p === undefined ? (
        <ActivityIndicator color={pal.muted} style={{ marginTop: 80 }} />
      ) : p === null ? (
        <View style={styles.body}>
          <Text style={[styles.title, { color: pal.text }]}>We couldn’t find that khatm</Text>
          <Text style={[styles.text, { color: pal.muted }]}>Check the code ({c}) with whoever sent it. It may have been deleted.</Text>
        </View>
      ) : (
        <View style={styles.body}>
          <Text style={[styles.eyebrow, { color: pal.accent }]}>YOU’RE INVITED TO READ TOGETHER</Text>
          {!!p.in_memory && <Text style={[styles.intention, { color: pal.accent }]}>In loving memory of {p.in_memory}</Text>}
          <Text style={[styles.title, { color: pal.text }]}>{p.title}</Text>
          {!!p.intention && <Text style={[styles.intention, { color: pal.muted }]}>{p.intention}</Text>}
          <View style={[styles.card, { backgroundColor: pal.surface, borderColor: pal.line }]}>
            <Text style={[styles.text, { color: pal.text }]}>
              {p.members} {p.members === 1 ? 'person is' : 'people are'} reading the whole Quran together. {p.done} of 30 juz finished, {p.open} still open to pick.
            </Text>
            <KhatmBar done={p.done} pal={pal} />
          </View>
          <Text style={[styles.small, { color: pal.muted }]}>Join, pick a juz, and Munib keeps track of what you read so everyone can see how the khatm is going.</Text>
          <View style={{ flex: 1 }} />
          {p.member ? (
            <Pressable onPress={() => router.replace({ pathname: '/together/[id]', params: { id: p.id } })} style={[styles.btn, { backgroundColor: pal.text }]}>
              <Text style={[styles.btnText, { color: pal.bg }]}>Open the khatm</Text>
            </Pressable>
          ) : (
            <Pressable onPress={join} disabled={busy} style={[styles.btn, { backgroundColor: pal.text }]} accessibilityRole="button">
              {busy ? <ActivityIndicator color={pal.bg} /> : <Text style={[styles.btnText, { color: pal.bg }]}>{acct.status === 'signedIn' ? 'Join' : 'Create an account to join'}</Text>}
            </Pressable>
          )}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, paddingHorizontal: 22 },
  head: { flexDirection: 'row', justifyContent: 'flex-end' },
  x: { width: 36, height: 36, borderRadius: 18, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  body: { flex: 1, gap: 14, marginTop: 30 },
  eyebrow: { fontFamily: fonts.uiBold, fontSize: 11, letterSpacing: 1.4 },
  title: { fontFamily: fonts.uiBold, fontSize: 32, letterSpacing: -0.7, lineHeight: 36 },
  intention: { fontFamily: fonts.readItalic, fontSize: 17, lineHeight: 26 },
  text: { fontFamily: fonts.read, fontSize: 16, lineHeight: 24 },
  small: { fontFamily: fonts.ui, fontSize: 13, lineHeight: 18 },
  card: { borderWidth: 1, borderRadius: 16, padding: 16, gap: 12 },
  btn: { borderRadius: 12, minHeight: 52, alignItems: 'center', justifyContent: 'center' },
  btnText: { fontFamily: fonts.uiBold, fontSize: 16 },
});
