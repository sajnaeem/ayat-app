import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
import { ActivityIndicator, Alert, Pressable, RefreshControl, ScrollView, Share, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Avatar } from '@/components/Avatar';
import { GoldStar } from '@/components/Gold';
import { Icon } from '@/components/Icon';
import { useToast } from '@/components/Toast';
import { juzStart } from '@/data/mushaf';
import { useAccount } from '@/lib/account';
import { Circle, circleDetail, circleLink, daysUntil, deleteCircle, familyAyah, leaveCircle, markCircle, niceDate, seenSalaams, sendSalaam, setCircleStart, shiftDate } from '@/lib/circles';
import { celebrate } from '@/lib/moments';
import { showFeed } from '@/lib/nav';
import { SITE } from '@/lib/site';
import { usePrefs } from '@/lib/store';
import { fonts, mix, Palette, usePalette } from '@/lib/theme';

const names = (l: { handle: string | null }[]) => {
  const n = l.map((x) => x.handle || 'Someone');
  return n.length <= 1 ? n[0] : `${n.slice(0, -1).join(', ')} and ${n[n.length - 1]}`;
};

/** One circle: the family's ayah of the day, or the circle's Ramadan. Counts only, never who has or hasn't read. */
export default function CircleScreen() {
  const { id, fresh } = useLocalSearchParams<{ id: string; fresh?: string }>();
  const pal = usePalette();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const toast = useToast();
  const acct = useAccount();
  const prefs = usePrefs();
  const [c, setC] = useState<Circle | null | undefined>(undefined);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    try {
      setC((await circleDetail(id)) ?? null);
    } catch {
      setC((x) => (x === undefined ? null : x));
      toast('Couldn’t load. Check your connection');
    }
  }, [id, toast]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  const close = () => (router.canGoBack() ? router.back() : router.replace('/'));

  if (c === undefined || c === null) {
    return (
      <View style={[styles.root, { backgroundColor: pal.bg, paddingTop: insets.top + 12 }]}>
        <View style={styles.head}>
          <View style={{ flex: 1 }} />
          <Pressable onPress={close} style={[styles.x, { borderColor: pal.line }]} accessibilityRole="button" accessibilityLabel="Close" hitSlop={8}>
            <Icon name="close" size={18} color={pal.text} />
          </Pressable>
        </View>
        {c === undefined ? <ActivityIndicator color={pal.muted} style={{ marginTop: 80 }} /> : <Text style={[styles.body, { color: pal.muted, padding: 24 }]}>We couldn’t open this circle. You may have left it, or it was deleted.</Text>}
      </View>
    );
  }

  const me = acct.userId;
  const mine = new Set(c.mine);
  const n = c.members.length;
  const iRead = c.today != null && mine.has(c.today);

  const mark = async (k: number, on: boolean) => {
    const before = c;
    const next = new Set(mine);
    if (on) next.add(k);
    else next.delete(k);
    const d = on ? 1 : -1;
    setC({ ...c, mine: [...next].sort((a, b) => a - b), total: Math.max(0, c.total + d), read_today: k === c.today ? Math.max(0, c.read_today + d) : c.read_today });
    try {
      await markCircle(c.id, k, on);
      if (c.kind === 'ramadan' && on && next.size === 30)
        celebrate({ id: `ramadan:${c.id}`, eyebrow: 'Khatm complete', title: 'The whole Quran, read this Ramadan', line: `With “${c.title}”`, share: 'I’ve finished reading the Quran this Ramadan with my circle on Munib. Read with us next time?', link: SITE });
    } catch {
      setC(before);
      toast('Couldn’t save that. Check your connection');
    }
  };

  const invite = () =>
    Share.share({
      message:
        c.kind === 'ramadan'
          ? `Read the Quran with us this Ramadan. Join “${c.title}” on Munib: ${circleLink(c.code)}`
          : `Join “${c.title}” on Munib: one ayah a day, together. ${circleLink(c.code)}`,
    }).catch(() => {});

  const salaam = async (to: string) => {
    setC({ ...c, sent: [...c.sent, to] });
    try {
      await sendSalaam(c.id, to);
    } catch {
      setC((x) => (x ? { ...x, sent: x.sent.filter((s) => s !== to) } : x));
      toast('Couldn’t send it. Check your connection');
    }
  };

  const gotSalaams = () => {
    setC({ ...c, salaams: [] });
    seenSalaams(c.id).catch(() => {});
  };

  const moveStart = async (by: number) => {
    if (!c.starts) return;
    const starts = shiftDate(c.starts, by);
    setC({ ...c, starts });
    try {
      await setCircleStart(c.id, starts);
      load();
    } catch {
      load();
    }
  };

  const leave = () => {
    const owner = c.creator === me;
    Alert.alert(owner && n > 1 ? 'Leave or delete?' : owner ? 'Delete this circle?' : 'Leave this circle?', owner && n > 1 ? 'If you leave, the circle carries on without you. Deleting removes it for everyone.' : owner ? 'It will be removed.' : 'Your ticks in this circle are removed. You can join again with the link.', [
      { text: 'Cancel', style: 'cancel' },
      ...(n > 1 || !owner ? [{ text: 'Leave', style: 'destructive' as const, onPress: () => leaveCircle(c.id).then(close).catch(() => toast('Couldn’t leave. Check your connection')) }] : []),
      ...(owner ? [{ text: 'Delete for everyone', style: 'destructive' as const, onPress: () => deleteCircle(c.id).then(close).catch(() => toast('Couldn’t delete. Check your connection')) }] : []),
    ]);
  };

  return (
    <View style={[styles.root, { backgroundColor: pal.bg }]}>
      <View style={[styles.head, { paddingTop: insets.top + 12 }]}>
        <View style={{ flex: 1 }}>
          <Text style={[styles.eyebrow, { color: pal.gold }]}>{c.kind === 'ramadan' ? 'RAMADAN TOGETHER' : 'FAMILY CIRCLE'}</Text>
          <Text style={[styles.title, { color: pal.text }]} numberOfLines={2}>{c.title}</Text>
        </View>
        <Pressable onPress={close} style={[styles.x, { borderColor: pal.line }]} accessibilityRole="button" accessibilityLabel="Close" hitSlop={8}>
          <Icon name="close" size={18} color={pal.text} />
        </Pressable>
      </View>
      <ScrollView
        contentContainerStyle={{ padding: 18, gap: 14, paddingBottom: insets.bottom + 40 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={async () => { setRefreshing(true); await load(); setRefreshing(false); }} />}
      >
        {c.salaams.length > 0 && (
          <View style={[styles.salaam, { backgroundColor: mix(pal.surface, pal.gold, 0.16), borderColor: pal.gold }]}>
            <GoldStar size={20} color={pal.gold} />
            <View style={{ flex: 1, gap: 2 }}>
              <Text style={[styles.salaamAr, { color: pal.text }]}>السَّلَامُ عَلَيْكُم</Text>
              <Text style={[styles.small, { color: pal.text }]}>{names(c.salaams)} sent you salaam.</Text>
            </View>
            <Pressable onPress={gotSalaams} hitSlop={8} accessibilityRole="button">
              <Text style={[styles.link, { color: pal.gold }]}>Wa ʿalaykum salaam</Text>
            </Pressable>
          </View>
        )}

        {(fresh || n === 1) && (
          <View style={[styles.card, { backgroundColor: pal.surface, borderColor: pal.line }]}>
            <Text style={[styles.h3, { color: pal.text }]}>{n === 1 ? 'It’s just you so far' : 'Your circle is ready'}</Text>
            <Text style={[styles.small, { color: pal.muted }]}>Send the link to the people you’d like in it. They tap it, join, and you’re reading together.</Text>
            <Pressable onPress={invite} style={[styles.btn, { backgroundColor: pal.text }]} accessibilityRole="button">
              <Text style={[styles.btnText, { color: pal.bg }]}>Invite</Text>
            </Pressable>
          </View>
        )}

        {c.kind === 'family' && c.today != null && <Family c={c} pal={pal} read={iRead} lang={prefs.lang} onRead={() => mark(c.today!, true)} onOpen={(s, a) => { prefs.readAt(s, a); showFeed(router); }} />}
        {c.kind === 'ramadan' && <Ramadan c={c} pal={pal} mine={mine} owner={c.creator === me} onMark={mark} onMove={moveStart} onOpen={(j) => { const [s, a] = juzStart(j); prefs.readAt(s, a); showFeed(router); }} />}

        <Text style={[styles.section, { color: pal.text }]}>In the circle</Text>
        <View style={[styles.group, { backgroundColor: pal.surface }]}>
          {c.members.map((m, i) => (
            <View key={m.id} style={[styles.member, i > 0 && { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: pal.line }]}>
              <Avatar id={m.id} name={m.handle ?? '?'} size={34} />
              <Text style={[styles.name, { color: pal.text }]} numberOfLines={1}>{m.handle ?? 'Someone'}{m.id === me ? ' (you)' : ''}</Text>
              {m.id !== me &&
                (c.sent.includes(m.id) ? (
                  <Text style={[styles.small, { color: pal.muted }]}>Salaam sent</Text>
                ) : (
                  <Pressable onPress={() => salaam(m.id)} style={({ pressed }) => [styles.chip, { borderColor: pal.gold, opacity: pressed ? 0.6 : 1 }]} accessibilityRole="button" accessibilityLabel={`Send salaam to ${m.handle ?? 'them'}`}>
                    <Text style={[styles.chipText, { color: pal.gold }]}>Send salaam</Text>
                  </Pressable>
                ))}
            </View>
          ))}
        </View>
        <Text style={[styles.small, { color: pal.muted, paddingHorizontal: 4 }]}>Munib shows the circle how many have read, never who. A salaam is a greeting of peace; they’ll see it the next time they open the circle.</Text>

        <Pressable onPress={invite} style={[styles.btn, { borderColor: pal.line, borderWidth: 1 }]} accessibilityRole="button">
          <Text style={[styles.btnText, { color: pal.text }]}>Invite someone · code {c.code}</Text>
        </Pressable>
        <Pressable onPress={leave} style={{ alignSelf: 'center', padding: 10 }} accessibilityRole="button">
          <Text style={[styles.small, { color: '#B4432F', textDecorationLine: 'underline' }]}>{c.creator === me && n === 1 ? 'Delete this circle' : 'Leave this circle'}</Text>
        </Pressable>
      </ScrollView>
    </View>
  );
}

/** How many of the circle have read: a row of lights, the lit ones first. Never says who. */
function Lights({ on, of, pal, label }: { on: number; of: number; pal: Palette; label: string }) {
  return (
    <View style={{ gap: 8 }} accessibilityLabel={label}>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
        {Array.from({ length: Math.min(of, 30) }, (_, i) => (
          <View key={i} style={[styles.light, i < on ? { backgroundColor: pal.gold, borderColor: pal.gold } : { borderColor: mix(pal.surface, pal.text, 0.2) }]} />
        ))}
      </View>
      <Text style={[styles.small, { color: pal.muted }]}>{label}</Text>
    </View>
  );
}

function Family({ c, pal, read, lang, onRead, onOpen }: { c: Circle; pal: Palette; read: boolean; lang: string; onRead: () => void; onOpen: (s: number, a: number) => void }) {
  const v = familyAyah(c.id, c.today!);
  const tr = (v.tr as Record<string, string[] | undefined>)[lang] ?? v.tr.en ?? [];
  const n = c.members.length;
  return (
    <View style={[styles.card, { backgroundColor: pal.surface, borderColor: pal.line, gap: 14 }]}>
      <Text style={[styles.eyebrow, { color: pal.gold }]}>TODAY’S AYAH FOR YOUR CIRCLE</Text>
      <Text style={[styles.ar, { color: pal.text }]}>{v.ar.map((a) => a[0]).join(' ')}</Text>
      <Text style={[styles.tr, { color: pal.text }]}>{tr.join(' ')}</Text>
      <Text style={[styles.small, { color: pal.muted }]}>{v.name} {v.k}</Text>
      <View style={{ flexDirection: 'row', gap: 8 }}>
        {read ? (
          <View style={[styles.btn, { flex: 1, backgroundColor: mix(pal.surface, pal.accent, 0.14), flexDirection: 'row', gap: 6 }]}>
            <Icon name="check" size={16} color={pal.accent} strokeWidth={2.4} />
            <Text style={[styles.btnText, { color: pal.accent }]}>You’ve read it</Text>
          </View>
        ) : (
          <Pressable onPress={onRead} style={[styles.btn, { flex: 1, backgroundColor: pal.text }]} accessibilityRole="button">
            <Text style={[styles.btnText, { color: pal.bg }]}>I’ve read it</Text>
          </Pressable>
        )}
        <Pressable onPress={() => onOpen(v.s, v.a)} style={[styles.btn, { paddingHorizontal: 16, borderWidth: 1, borderColor: pal.line }]} accessibilityRole="button" accessibilityLabel="Listen to it in the Quran">
          <Text style={[styles.btnText, { color: pal.text }]}>Listen</Text>
        </Pressable>
      </View>
      <Lights on={c.read_today} of={n} pal={pal} label={n === 1 ? (c.read_today ? 'You’ve read today’s ayah' : 'Waiting for today’s first reader') : `${c.read_today} of ${n} have read today’s ayah`} />
    </View>
  );
}

function Ramadan({ c, pal, mine, owner, onMark, onMove, onOpen }: { c: Circle; pal: Palette; mine: Set<number>; owner: boolean; onMark: (k: number, on: boolean) => void; onMove: (by: number) => void; onOpen: (juz: number) => void }) {
  const until = c.starts ? daysUntil(c.starts) : 0;
  const n = c.members.length;
  const started = until <= 0;
  return (
    <>
      {!started && c.starts && (
        <View style={[styles.card, { backgroundColor: pal.surface, borderColor: pal.line, alignItems: 'center', gap: 6 }]}>
          <Text style={[styles.eyebrow, { color: pal.gold }]}>RAMADAN IS EXPECTED IN</Text>
          <Text style={[styles.big, { color: pal.text }]}>{until}</Text>
          <Text style={[styles.h3, { color: pal.text }]}>{until === 1 ? 'day' : 'days'}</Text>
          <Text style={[styles.small, { color: pal.muted, textAlign: 'center' }]}>{niceDate(c.starts)}. From the first day, Munib opens a juz a day for everyone here, and you tick it when you’ve read it.</Text>
          {owner && (
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 14, marginTop: 4 }}>
              <Pressable onPress={() => onMove(-1)} hitSlop={8} accessibilityRole="button"><Text style={[styles.link, { color: pal.text }]}>A day earlier</Text></Pressable>
              <Text style={[styles.small, { color: pal.muted }]}>·</Text>
              <Pressable onPress={() => onMove(1)} hitSlop={8} accessibilityRole="button"><Text style={[styles.link, { color: pal.text }]}>A day later</Text></Pressable>
            </View>
          )}
          {owner && <Text style={[styles.small, { color: pal.muted, textAlign: 'center' }]}>Change it if the moon is sighted on a different day where you are.</Text>}
        </View>
      )}

      {started && c.today != null && (
        <View style={[styles.card, { backgroundColor: pal.surface, borderColor: pal.line, gap: 12 }]}>
          <Text style={[styles.eyebrow, { color: pal.gold }]}>DAY {c.today} OF RAMADAN</Text>
          <Text style={[styles.h2, { color: pal.text }]}>Today’s reading: juz {c.today}</Text>
          <View style={{ flexDirection: 'row', gap: 8 }}>
            <Pressable onPress={() => onOpen(c.today!)} style={[styles.btn, { flex: 1, backgroundColor: pal.text }]} accessibilityRole="button">
              <Text style={[styles.btnText, { color: pal.bg }]}>Read juz {c.today}</Text>
            </Pressable>
            <Pressable onPress={() => onMark(c.today!, !mine.has(c.today!))} style={[styles.btn, { paddingHorizontal: 14, flexDirection: 'row', gap: 6 }, mine.has(c.today) ? { backgroundColor: mix(pal.surface, pal.accent, 0.14) } : { borderWidth: 1, borderColor: pal.line }]} accessibilityRole="button">
              {mine.has(c.today) && <Icon name="check" size={16} color={pal.accent} strokeWidth={2.4} />}
              <Text style={[styles.btnText, { color: mine.has(c.today) ? pal.accent : pal.text }]}>{mine.has(c.today) ? 'Read' : 'I’ve read it'}</Text>
            </Pressable>
          </View>
          <Lights on={c.read_today} of={n} pal={pal} label={n === 1 ? (c.read_today ? 'You’ve read today’s juz' : 'Today’s juz is waiting') : `${c.read_today} of ${n} have read today’s juz`} />
        </View>
      )}

      {started && c.today == null && (
        <View style={[styles.card, { backgroundColor: pal.surface, borderColor: pal.line, gap: 6 }]}>
          <Text style={[styles.eyebrow, { color: pal.gold }]}>EID MUBARAK</Text>
          <Text style={[styles.h2, { color: pal.text }]}>Ramadan has ended</Text>
          <Text style={[styles.small, { color: pal.muted }]}>Together, this circle read {c.total} juz. You can still tick any you finish.</Text>
        </View>
      )}

      {started && (
        <View style={[styles.card, { backgroundColor: pal.surface, borderColor: pal.line, gap: 12 }]}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
            <Text style={[styles.h3, { color: pal.text }]}>You: {mine.size} of 30</Text>
            <Text style={[styles.small, { color: pal.muted }]}>The circle: {c.total} juz read</Text>
          </View>
          <View style={styles.grid}>
            {Array.from({ length: 30 }, (_, i) => i + 1).map((j) => {
              const done = mine.has(j);
              const today = j === c.today;
              return (
                <Pressable
                  key={j}
                  onPress={() => onMark(j, !done)}
                  style={[styles.cell, done ? { backgroundColor: pal.accent, borderColor: pal.accent } : { borderColor: today ? pal.gold : pal.line, borderWidth: today ? 2 : 1 }]}
                  accessibilityRole="button"
                  accessibilityLabel={`Juz ${j}${done ? ', read' : ''}${today ? ', today' : ''}`}
                >
                  <Text style={[styles.cellText, { color: done ? '#FFFFFF' : pal.text }]}>{j}</Text>
                </Pressable>
              );
            })}
          </View>
          <Text style={[styles.small, { color: pal.muted }]}>Tap a juz when you’ve read it, in Munib or from your own mushaf. Behind? Catch up whenever you can.</Text>
        </View>
      )}
    </>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  head: { flexDirection: 'row', alignItems: 'flex-start', gap: 12, paddingHorizontal: 18, paddingBottom: 8 },
  x: { width: 36, height: 36, borderRadius: 18, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  eyebrow: { fontFamily: fonts.uiBold, fontSize: 11, letterSpacing: 1.4 },
  title: { fontFamily: fonts.read, fontSize: 30, letterSpacing: -0.7, lineHeight: 36 },
  h2: { fontFamily: fonts.read, fontSize: 23, letterSpacing: -0.4, lineHeight: 29 },
  h3: { fontFamily: fonts.uiBold, fontSize: 17, letterSpacing: -0.2 },
  big: { fontFamily: fonts.read, fontSize: 64, lineHeight: 70, letterSpacing: -2 },
  body: { fontFamily: fonts.read, fontSize: 16, lineHeight: 24 },
  small: { fontFamily: fonts.ui, fontSize: 13, lineHeight: 18 },
  link: { fontFamily: fonts.uiBold, fontSize: 13, textDecorationLine: 'underline' },
  section: { fontFamily: fonts.read, fontSize: 21, letterSpacing: -0.4, marginTop: 6, paddingHorizontal: 4 },
  card: { borderWidth: 1, borderRadius: 18, padding: 16, gap: 8 },
  salaam: { flexDirection: 'row', alignItems: 'center', gap: 12, borderWidth: 1, borderRadius: 18, padding: 14 },
  salaamAr: { fontFamily: fonts.arabic, fontSize: 20, lineHeight: 34 },
  ar: { fontFamily: fonts.arabic, fontSize: 27, lineHeight: 52, textAlign: 'right', writingDirection: 'rtl' },
  tr: { fontFamily: fonts.read, fontSize: 17, lineHeight: 26 },
  btn: { borderRadius: 12, minHeight: 48, alignItems: 'center', justifyContent: 'center' },
  btnText: { fontFamily: fonts.uiBold, fontSize: 15 },
  light: { width: 16, height: 16, borderRadius: 8, borderWidth: 1.5 },
  group: { borderRadius: 18, paddingHorizontal: 14 },
  member: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 10 },
  name: { flex: 1, fontFamily: fonts.uiSemi, fontSize: 16 },
  chip: { borderWidth: 1.5, borderRadius: 999, paddingHorizontal: 12, paddingVertical: 6 },
  chipText: { fontFamily: fonts.uiBold, fontSize: 13 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  cell: { width: '15%', flexGrow: 1, aspectRatio: 1.25, borderRadius: 10, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  cellText: { fontFamily: fonts.uiBold, fontSize: 14 },
});
