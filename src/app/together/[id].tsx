import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Alert, Pressable, RefreshControl, ScrollView, Share, StyleSheet, Text, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Avatar } from '@/components/Avatar';
import { Icon } from '@/components/Icon';
import { KhatmBar } from '@/components/KhatmBar';
import { Sheet } from '@/components/Sheet';
import { useToast } from '@/components/Toast';
import { pageOf } from '@/data/mushaf';
import { useAccount } from '@/lib/account';
import { usePrefs } from '@/lib/store';
import {
  claimJuz,
  deleteKhatm,
  finishJuz,
  inviteLink,
  juzSize,
  juzSpan,
  Khatm,
  khatmDetail,
  leaveKhatm,
  localPct,
  newRound,
  Part,
  placeLabel,
  releaseJuz,
  resumeAt,
  syncMyParts,
  trackPart,
  untrackPart,
} from '@/lib/together';
import { fonts, mix, Palette, usePalette } from '@/lib/theme';

const ago = (iso: string) => {
  const m = Math.round((Date.now() - new Date(iso).getTime()) / 60000);
  if (m < 2) return 'just now';
  if (m < 60) return `${m} min ago`;
  const h = Math.round(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.round(h / 24);
  return d === 1 ? 'yesterday' : `${d} days ago`;
};
const firstName = (s: string | null) => (s ?? 'Someone').split(' ')[0];

/** One khatm: the 30 juz, who's reading which, and how far each has got. */
export default function KhatmScreen() {
  const { id, fresh } = useLocalSearchParams<{ id: string; fresh?: string }>();
  const pal = usePalette();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const toast = useToast();
  const acct = useAccount();
  const prefs = usePrefs();
  const me = acct.userId;
  const [k, setK] = useState<Khatm | null | undefined>(undefined);
  const [refreshing, setRefreshing] = useState(false);
  const [open, setOpen] = useState<Part | null>(null);
  const [naming, setNaming] = useState(false);
  const [name, setName] = useState('');
  const [busy, setBusy] = useState(false);
  const [menu, setMenu] = useState(false);
  const [welcome, setWelcome] = useState(fresh === '1');

  const load = useCallback(async () => {
    try {
      const d = await khatmDetail(String(id));
      setK(d);
      syncMyParts();
    } catch {
      setK((x) => (x === undefined ? null : x));
      toast('Couldn’t load. Check your connection');
    }
  }, [id, toast]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  // While open, check for others' progress every 30 seconds.
  useEffect(() => {
    const t = setInterval(load, 30000);
    return () => clearInterval(t);
  }, [load]);

  const invite = () => {
    if (!k) return;
    const link = inviteLink(k.code);
    Share.share({
      message: `Join our khatm “${k.title}” on Munib. Pick a juz and we’ll finish the Quran together: ${link}\n\nOr open Munib → Read together and enter the code ${k.code}`,
    }).catch(() => {});
  };

  const act = async (fn: () => Promise<unknown>, ok?: string) => {
    if (busy) return;
    setBusy(true);
    try {
      await fn();
      if (ok) toast(ok);
      setOpen(null);
      setNaming(false);
      setName('');
      await load();
    } catch (e) {
      const m = String((e as Error).message);
      toast(m.includes('taken') ? 'Someone has just picked that juz' : 'Couldn’t do that. Check your connection');
      await load();
    } finally {
      setBusy(false);
    }
  };

  const read = (p: Part, view: 'cards' | 'pages') => {
    const [s, a] = resumeAt(p.juz, p.upto);
    setOpen(null);
    if (view === 'pages') router.push({ pathname: '/mushaf', params: { page: String(pageOf(s, a)) } });
    else {
      prefs.readAt(s, a);
      router.dismissAll();
    }
  };

  if (k === undefined) {
    return (
      <View style={[styles.root, { backgroundColor: pal.bg, justifyContent: 'center' }]}>
        <ActivityIndicator color={pal.muted} />
      </View>
    );
  }
  if (k === null) {
    return (
      <View style={[styles.root, { backgroundColor: pal.bg, padding: 24, paddingTop: insets.top + 40, gap: 14 }]}>
        <Text style={[styles.h2, { color: pal.text }]}>This khatm isn’t available</Text>
        <Text style={[styles.body, { color: pal.muted }]}>It may have been deleted, or you’re no longer part of it.</Text>
        <Pressable onPress={() => router.back()} style={[styles.btn, { borderColor: pal.line, borderWidth: 1 }]}>
          <Text style={[styles.btnText, { color: pal.text }]}>Back</Text>
        </Pressable>
      </View>
    );
  }

  const parts = k.parts ?? [];
  const done = parts.filter((p) => p.status === 'done').length;
  const reading = parts.filter((p) => p.status === 'reading').length;
  const mine = parts.filter((p) => p.reader === me && p.status !== 'done');
  const creator = k.creator === me;
  const daysLeft = k.finish_by ? Math.ceil((new Date(`${k.finish_by}T23:59:59`).getTime() - Date.now()) / 86400000) : null;
  const mayEdit = (p: Part) => !!me && (p.reader === me || p.by === me || creator);
  const who = (p: Part) => (p.reader === me ? 'You' : p.name ? p.name : firstName(p.handle));

  return (
    <View style={[styles.root, { backgroundColor: pal.bg }]}>
      <View style={[styles.head, { paddingTop: insets.top + 12, borderColor: pal.line }]}>
        <Pressable onPress={() => router.back()} style={[styles.x, { borderColor: pal.line }]} accessibilityRole="button" accessibilityLabel="Back" hitSlop={8}>
          <View style={{ transform: [{ rotate: '180deg' }] }}>
            <Icon name="chevron" size={18} color={pal.text} />
          </View>
        </Pressable>
        <View style={{ flexDirection: 'row', gap: 8 }}>
          <Pressable onPress={invite} style={[styles.pill, { backgroundColor: pal.text }]} accessibilityRole="button">
            <Icon name="share" size={15} color={pal.bg} />
            <Text style={[styles.pillText, { color: pal.bg }]}>Invite</Text>
          </Pressable>
          <Pressable onPress={() => setMenu(true)} style={[styles.x, { borderColor: pal.line }]} accessibilityRole="button" accessibilityLabel="More" hitSlop={8}>
            <Text style={{ color: pal.text, fontFamily: fonts.uiBold, fontSize: 16, marginTop: -6 }}>…</Text>
          </Pressable>
        </View>
      </View>

      <ScrollView
        contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 40 }]}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={async () => { setRefreshing(true); await load(); setRefreshing(false); }} />}
      >
        <View style={{ gap: 6 }}>
          <Text style={[styles.eyebrow, { color: pal.accent }]}>{k.round > 1 ? `KHATM ${k.round}` : 'READ TOGETHER'}</Text>
          <Text style={[styles.title, { color: pal.text }]}>{k.title}</Text>
          {!!k.intention && <Text style={[styles.intention, { color: pal.muted }]}>{k.intention}</Text>}
        </View>

        {welcome && (
          <View style={[styles.note, { backgroundColor: mix(pal.bg, pal.accent, 0.1), borderColor: mix(pal.bg, pal.accent, 0.3) }]}>
            <Text style={[styles.noteTitle, { color: pal.text }]}>Your khatm is ready</Text>
            <Text style={[styles.small, { color: pal.text }]}>Invite your family, then pick a juz for yourself below. You can also put a name on a juz for someone reading from their own mushaf.</Text>
            <View style={{ flexDirection: 'row', gap: 8, marginTop: 4 }}>
              <Pressable onPress={invite} style={[styles.smallBtn, { backgroundColor: pal.text }]}>
                <Text style={[styles.smallBtnText, { color: pal.bg }]}>Invite</Text>
              </Pressable>
              <Pressable onPress={() => setWelcome(false)} style={[styles.smallBtn, { borderColor: pal.line, borderWidth: 1 }]}>
                <Text style={[styles.smallBtnText, { color: pal.text }]}>Later</Text>
              </Pressable>
            </View>
          </View>
        )}

        {k.completed_at ? (
          <View style={[styles.done, { backgroundColor: pal.accent }]}>
            <Text style={[styles.doneAr, { color: pal.onAccent }]}>ٱلْحَمْدُ لِلَّٰهِ</Text>
            <Text style={[styles.doneTitle, { color: pal.onAccent }]}>The whole Quran, read together</Text>
            <Text style={[styles.small, { color: pal.onAccent }]}>
              {k.members.length} {k.members.length === 1 ? 'person' : 'people'} finished all 30 juz{k.rounds_done > 1 ? `. That’s ${k.rounds_done} khatms together` : ''}.
            </Text>
            {creator && (
              <Pressable onPress={() => act(() => newRound(k.id), 'A new khatm has started')} style={[styles.smallBtn, { backgroundColor: pal.onAccent, alignSelf: 'flex-start', marginTop: 6 }]}>
                <Text style={[styles.smallBtnText, { color: pal.accent }]}>Start another khatm with this group</Text>
              </Pressable>
            )}
          </View>
        ) : (
          <View style={[styles.card, { backgroundColor: pal.surface, borderColor: pal.line }]}>
            <View style={{ flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between' }}>
              <Text style={[styles.big, { color: pal.text }]}>
                {done}
                <Text style={[styles.bigOf, { color: pal.muted }]}> of 30 juz read</Text>
              </Text>
              {daysLeft !== null && (
                <Text style={[styles.small, { color: daysLeft < 0 ? '#B4432F' : pal.muted }]}>
                  {daysLeft < 0 ? 'Past the aim, keep going' : daysLeft === 0 ? 'Aim: today' : `${daysLeft} ${daysLeft === 1 ? 'day' : 'days'} left`}
                </Text>
              )}
            </View>
            <KhatmBar done={done} pal={pal} parts={parts.map((p) => p.status)} />
            <Text style={[styles.small, { color: pal.muted }]}>
              {reading} being read · {30 - done - reading} still open
            </Text>
          </View>
        )}

        {mine.length > 0 && !k.completed_at && (
          <View style={{ gap: 8 }}>
            <Text style={[styles.h3, { color: pal.muted }]}>YOUR JUZ</Text>
            {mine.map((p) => {
              const pct = Math.max(p.pct, localPct(k.id, p.juz) ?? 0);
              return (
                <View key={p.juz} style={[styles.card, { backgroundColor: pal.surface, borderColor: pal.accent }]}>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                    <Text style={[styles.cardTitle, { color: pal.text }]}>Juz {p.juz}</Text>
                    <Text style={[styles.small, { color: pal.accent, fontFamily: fonts.uiBold }]}>{pct}%</Text>
                  </View>
                  <View style={[styles.track, { backgroundColor: mix(pal.surface, pal.text, 0.08) }]}>
                    <View style={{ width: `${pct}%`, height: '100%', backgroundColor: pal.accent, borderRadius: 3 }} />
                  </View>
                  <Text style={[styles.small, { color: pal.muted }]}>{p.upto ? `Read up to ${placeLabel(p.upto)}` : juzSpan(p.juz)}</Text>
                  <View style={{ flexDirection: 'row', gap: 8 }}>
                    <Pressable onPress={() => read(p, 'cards')} style={[styles.smallBtn, { backgroundColor: pal.text, flex: 1 }]}>
                      <Text style={[styles.smallBtnText, { color: pal.bg }]}>{p.upto ? 'Continue' : 'Start reading'}</Text>
                    </Pressable>
                    <Pressable onPress={() => read(p, 'pages')} style={[styles.smallBtn, { borderColor: pal.line, borderWidth: 1, flex: 1 }]}>
                      <Text style={[styles.smallBtnText, { color: pal.text }]}>Page view</Text>
                    </Pressable>
                  </View>
                </View>
              );
            })}
          </View>
        )}

        <Text style={[styles.h3, { color: pal.muted }]}>ALL 30 JUZ · TAP ONE TO PICK IT</Text>
        <View style={styles.grid}>
          {parts.map((p) => (
            <Tile key={p.juz} p={p} me={me} pal={pal} label={p.status === 'open' ? 'Open' : who(p)} onPress={() => setOpen(p)} />
          ))}
        </View>
        <View style={styles.legend}>
          {[
            ['Open', mix(pal.surface, pal.text, 0.06)],
            ['Being read', mix(pal.surface, pal.accent, 0.25)],
            ['Finished', pal.accent],
          ].map(([l, c]) => (
            <View key={l} style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}>
              <View style={{ width: 10, height: 10, borderRadius: 3, backgroundColor: c, borderWidth: 1, borderColor: pal.line }} />
              <Text style={[styles.small, { color: pal.muted }]}>{l}</Text>
            </View>
          ))}
        </View>

        <Text style={[styles.h3, { color: pal.muted }]}>
          {k.members.length} {k.members.length === 1 ? 'PERSON' : 'PEOPLE'}
        </Text>
        <View style={[styles.card, { backgroundColor: pal.surface, borderColor: pal.line, gap: 0, paddingVertical: 4 }]}>
          {k.members.map((m, i) => {
            const theirs = parts.filter((p) => p.reader === m.id);
            return (
              <View key={m.id} style={[styles.member, i > 0 && { borderTopWidth: StyleSheet.hairlineWidth, borderColor: pal.line }]}>
                <Avatar id={m.id} name={m.handle ?? '?'} size={32} />
                <View style={{ flex: 1 }}>
                  <Text style={[styles.memberName, { color: pal.text }]}>
                    {m.id === me ? 'You' : m.handle ?? 'Someone'}
                    {m.id === k.creator ? <Text style={{ color: pal.muted, fontFamily: fonts.ui }}>  · started it</Text> : null}
                  </Text>
                  <Text style={[styles.small, { color: pal.muted }]}>
                    {theirs.length ? theirs.map((p) => `juz ${p.juz}${p.status === 'done' ? ' ✓' : ''}`).join(', ') : 'Hasn’t picked a juz yet'}
                  </Text>
                </View>
              </View>
            );
          })}
        </View>
        <Text style={[styles.small, { color: pal.muted }]}>
          Only people with the invite can see this khatm. Progress fills in as each person reads their juz in Munib. Reading from a mushaf at home? Open your juz and tap “I’ve finished it”.
        </Text>
      </ScrollView>

      <Sheet visible={!!open} onClose={() => { setOpen(null); setNaming(false); }} title={open ? `Juz ${open.juz}` : ''} pal={pal}>
        {open && (
          <>
            <Text style={[styles.small, { color: pal.muted }]}>
              {juzSpan(open.juz)} · {juzSize(open.juz)} ayat
            </Text>
            {open.status === 'open' ? (
              naming ? (
                <>
                  <Text style={[styles.small, { color: pal.text }]}>Who’s reading it? Use this for someone reading from their own mushaf without Munib.</Text>
                  <TextInput value={name} onChangeText={setName} placeholder="e.g. Mum, or Auntie Aisha" placeholderTextColor={pal.muted} maxLength={40} autoFocus style={[styles.input, { color: pal.text, borderColor: pal.line, backgroundColor: pal.bg }]} />
                  <Pressable disabled={!name.trim() || busy} onPress={() => act(() => claimJuz(k.id, open.juz, name.trim()), `Juz ${open.juz} is ${name.trim()}’s`)} style={[styles.btn, { backgroundColor: pal.text, opacity: name.trim() ? 1 : 0.5 }]}>
                    <Text style={[styles.btnText, { color: pal.bg }]}>Save</Text>
                  </Pressable>
                </>
              ) : (
                <>
                  <Pressable
                    disabled={busy}
                    onPress={() =>
                      act(async () => {
                        await claimJuz(k.id, open.juz);
                        await trackPart(k.id, k.title, k.round, open.juz);
                      }, `Juz ${open.juz} is yours. It’ll fill in as you read`)
                    }
                    style={[styles.btn, { backgroundColor: pal.text }]}
                  >
                    {busy ? <ActivityIndicator color={pal.bg} /> : <Text style={[styles.btnText, { color: pal.bg }]}>I’ll read this juz</Text>}
                  </Pressable>
                  <Pressable onPress={() => setNaming(true)} style={[styles.btn, { borderColor: pal.line, borderWidth: 1 }]}>
                    <Text style={[styles.btnText, { color: pal.text }]}>Put someone else’s name on it</Text>
                  </Pressable>
                </>
              )
            ) : (
              <>
                <View style={[styles.card, { backgroundColor: pal.bg, borderColor: pal.line }]}>
                  <Text style={[styles.cardTitle, { color: pal.text }]}>
                    {open.status === 'done' ? `Finished by ${who(open) === 'You' ? 'you' : who(open)}` : `${who(open)} ${who(open) === 'You' ? 'are' : 'is'} reading it`}
                  </Text>
                  <Text style={[styles.small, { color: pal.muted }]}>
                    {open.status === 'done'
                      ? open.done_at
                        ? `Finished ${ago(open.done_at)}`
                        : 'Finished'
                      : open.name
                        ? 'Reading from their own mushaf'
                        : open.upto
                          ? `Read up to ${placeLabel(open.upto)} · ${open.pct}% · ${ago(open.updated_at)}`
                          : 'Hasn’t started yet'}
                  </Text>
                </View>
                {open.reader === me && open.status === 'reading' && (
                  <>
                    <Pressable onPress={() => read(open, 'cards')} style={[styles.btn, { backgroundColor: pal.text }]}>
                      <Text style={[styles.btnText, { color: pal.bg }]}>{open.upto ? 'Continue reading' : 'Start reading'}</Text>
                    </Pressable>
                    <Pressable onPress={() => read(open, 'pages')} style={[styles.btn, { borderColor: pal.line, borderWidth: 1 }]}>
                      <Text style={[styles.btnText, { color: pal.text }]}>Read in page view</Text>
                    </Pressable>
                  </>
                )}
                {mayEdit(open) && open.status === 'reading' && (
                  <Pressable
                    onPress={() =>
                      act(async () => {
                        await finishJuz(k.id, open.juz);
                        if (open.reader === me) await untrackPart(k.id, open.juz);
                      }, 'MashaAllah. Marked as finished')
                    }
                    style={[styles.btn, { borderColor: pal.accent, borderWidth: 1 }]}
                  >
                    <Text style={[styles.btnText, { color: pal.accent }]}>{open.reader === me ? 'I’ve finished it' : 'Mark as finished'}</Text>
                  </Pressable>
                )}
                {mayEdit(open) && open.status === 'done' && (
                  <Pressable onPress={() => act(() => finishJuz(k.id, open.juz, false), 'Marked as not finished')} style={[styles.btn, { borderColor: pal.line, borderWidth: 1 }]}>
                    <Text style={[styles.btnText, { color: pal.text }]}>Not finished after all</Text>
                  </Pressable>
                )}
                {mayEdit(open) && open.status === 'reading' && (
                  <Pressable
                    onPress={() =>
                      act(async () => {
                        await releaseJuz(k.id, open.juz);
                        await untrackPart(k.id, open.juz);
                      }, `Juz ${open.juz} is open again`)
                    }
                    style={styles.linkBtn}
                  >
                    <Text style={[styles.small, { color: pal.muted, textDecorationLine: 'underline' }]}>{open.reader === me ? 'Give it back to the group' : 'Make it open again'}</Text>
                  </Pressable>
                )}
              </>
            )}
          </>
        )}
      </Sheet>

      <Sheet visible={menu} onClose={() => setMenu(false)} title={k.title} pal={pal}>
        <View style={[styles.card, { backgroundColor: pal.bg, borderColor: pal.line, alignItems: 'center' }]}>
          <Text style={[styles.small, { color: pal.muted }]}>Invite code</Text>
          <Text style={[styles.code, { color: pal.text }]}>{k.code}</Text>
        </View>
        <Pressable onPress={() => { setMenu(false); invite(); }} style={[styles.btn, { backgroundColor: pal.text }]}>
          <Text style={[styles.btnText, { color: pal.bg }]}>Share the invite</Text>
        </Pressable>
        <Pressable
          onPress={() =>
            Alert.alert('Leave this khatm?', 'Any juz you haven’t finished will go back to the group.', [
              { text: 'Cancel', style: 'cancel' },
              { text: 'Leave', style: 'destructive', onPress: () => act(() => leaveKhatm(k.id)).then(() => { setMenu(false); router.back(); }) },
            ])
          }
          style={[styles.btn, { borderColor: pal.line, borderWidth: 1 }]}
        >
          <Text style={[styles.btnText, { color: pal.text }]}>Leave</Text>
        </Pressable>
        {creator && (
          <Pressable
            onPress={() =>
              Alert.alert('Delete this khatm?', 'It will be removed for everyone. This can’t be undone.', [
                { text: 'Cancel', style: 'cancel' },
                { text: 'Delete', style: 'destructive', onPress: () => act(() => deleteKhatm(k.id)).then(() => { setMenu(false); router.back(); }) },
              ])
            }
            style={styles.linkBtn}
          >
            <Text style={[styles.small, { color: '#B4432F', textDecorationLine: 'underline' }]}>Delete for everyone</Text>
          </Pressable>
        )}
      </Sheet>
    </View>
  );
}

function Tile({ p, me, pal, label, onPress }: { p: Part; me: string | null; pal: Palette; label: string; onPress: () => void }) {
  const doneT = p.status === 'done';
  const reading = p.status === 'reading';
  const mine = p.reader === me;
  const bg = doneT ? pal.accent : reading ? mix(pal.surface, pal.accent, 0.16) : pal.surface;
  const fg = doneT ? pal.onAccent : pal.text;
  return (
    <Pressable
      onPress={onPress}
      style={[styles.tile, { backgroundColor: bg, borderColor: mine ? pal.accent : pal.line, borderWidth: mine ? 2 : 1 }]}
      accessibilityRole="button"
      accessibilityLabel={`Juz ${p.juz}, ${p.status === 'open' ? 'open' : p.status === 'done' ? `finished by ${label}` : `${label} reading, ${p.pct}%`}`}
    >
      <Text style={[styles.tileNum, { color: fg }]}>{p.juz}</Text>
      <Text style={[styles.tileName, { color: doneT ? pal.onAccent : p.status === 'open' ? pal.muted : pal.text }]} numberOfLines={1}>
        {doneT ? `✓ ${label}` : label}
      </Text>
      {reading && (
        <View style={[styles.tileTrack, { backgroundColor: mix(pal.surface, pal.text, 0.1) }]}>
          <View style={{ width: `${Math.max(4, p.pct)}%`, height: '100%', backgroundColor: pal.accent }} />
        </View>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  head: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 18, paddingBottom: 12, borderBottomWidth: StyleSheet.hairlineWidth },
  x: { width: 36, height: 36, borderRadius: 18, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  pill: { flexDirection: 'row', gap: 6, alignItems: 'center', paddingHorizontal: 14, height: 36, borderRadius: 18 },
  pillText: { fontFamily: fonts.uiBold, fontSize: 14 },
  content: { padding: 18, gap: 14 },
  eyebrow: { fontFamily: fonts.uiBold, fontSize: 11, letterSpacing: 1.4 },
  title: { fontFamily: fonts.uiBold, fontSize: 30, letterSpacing: -0.6, lineHeight: 34 },
  intention: { fontFamily: fonts.readItalic, fontSize: 16, lineHeight: 24 },
  h2: { fontFamily: fonts.uiBold, fontSize: 22, letterSpacing: -0.3 },
  h3: { fontFamily: fonts.uiBold, fontSize: 11, letterSpacing: 1.2, marginTop: 6 },
  body: { fontFamily: fonts.read, fontSize: 16, lineHeight: 24 },
  small: { fontFamily: fonts.ui, fontSize: 13, lineHeight: 18 },
  note: { borderWidth: 1, borderRadius: 14, padding: 14, gap: 6 },
  noteTitle: { fontFamily: fonts.uiBold, fontSize: 16 },
  card: { borderWidth: 1, borderRadius: 16, padding: 16, gap: 10 },
  cardTitle: { fontFamily: fonts.uiBold, fontSize: 17 },
  big: { fontFamily: fonts.uiBold, fontSize: 34, letterSpacing: -1 },
  bigOf: { fontFamily: fonts.ui, fontSize: 15, letterSpacing: 0 },
  done: { borderRadius: 16, padding: 18, gap: 6 },
  doneAr: { fontFamily: fonts.arabic, fontSize: 28, lineHeight: 52 },
  doneTitle: { fontFamily: fonts.uiBold, fontSize: 22, letterSpacing: -0.3 },
  track: { height: 6, borderRadius: 3, overflow: 'hidden' },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  tile: { width: '18.6%', aspectRatio: 0.92, borderRadius: 10, padding: 6, justifyContent: 'space-between' },
  tileNum: { fontFamily: fonts.uiBold, fontSize: 18 },
  tileName: { fontFamily: fonts.uiSemi, fontSize: 10.5 },
  tileTrack: { height: 3, borderRadius: 2, overflow: 'hidden' },
  legend: { flexDirection: 'row', gap: 14, flexWrap: 'wrap' },
  member: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 10 },
  memberName: { fontFamily: fonts.uiSemi, fontSize: 15 },
  btn: { borderRadius: 12, minHeight: 50, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 14 },
  btnText: { fontFamily: fonts.uiBold, fontSize: 16 },
  smallBtn: { borderRadius: 10, minHeight: 40, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 14 },
  smallBtnText: { fontFamily: fonts.uiBold, fontSize: 14 },
  linkBtn: { alignSelf: 'center', padding: 10 },
  input: { fontFamily: fonts.ui, fontSize: 16, borderWidth: 1, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 13 },
  code: { fontFamily: fonts.uiBold, fontSize: 30, letterSpacing: 6 },
});
