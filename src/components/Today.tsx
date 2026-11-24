import * as Haptics from 'expo-haptics';
import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback } from 'react';
import { Alert, Pressable, StyleSheet, Text, View } from 'react-native';
import { fireConfetti } from '@/components/Confetti';
import { useExplain } from '@/components/Explain';
import { GoldStar } from '@/components/Gold';
import { Icon } from '@/components/Icon';
import { SNIPPETS } from '@/data/snippets';
import { showFeed } from '@/lib/nav';
import { useDeeds } from '@/lib/deeds';
import { dayKey } from '@/lib/progress';
import { askPermission } from '@/lib/reminders';
import { playSfx } from '@/lib/sfx';
import { usePrefs } from '@/lib/store';
import { fonts, mix, type Palette } from '@/lib/theme';

/**
 * Today (Saj, 15 Nov 2026, from RuneScape's daily activities: "daily activities to check off… scroll X in the feed,
 * tasbeeh X times, pray 5 times"). A short fixed list at the top of the Prayer tab that starts fresh every day.
 * Reading and tasbeeh tick themselves from what the reader does; the rest are tapped (an honour system).
 * Nothing is kept from one day to the next, on purpose: no streaks, no history, nothing shown for a missed day,
 * and it never leaves the phone (prefs.today). One extra changes with the day: al-Kahf on Friday, the sunnah fast
 * on Monday and Thursday, a small sunnah from the feed's sourced "Try this today" cards otherwise.
 * Sources quoted here need a scholar's check like the rest of Munib.
 */
/** Outline of an empty tick or prayer pill: the hairline colour is too faint to see as something to tap. */
const edgeOf = (pal: Palette) => mix(pal.surface, pal.text, pal.dark ? 0.42 : 0.3);

const PRAYERS = [
  { id: 'fajr', name: 'Fajr' },
  { id: 'dhuhr', name: 'Dhuhr' },
  { id: 'asr', name: 'Asr' },
  { id: 'maghrib', name: 'Maghrib' },
  { id: 'isha', name: 'Isha' },
];
const TASBEEH_GOAL = 33; // same as deeds.ts
const TRIES = SNIPPETS.filter((s) => s.kind === 'try' && s.id !== 't-tasbih') as { id: string; title: string; source: string }[];

type Extra = { title: string; sub: string; info: string; fast?: boolean; open?: () => void };

export function Today({ pal }: { pal: Palette }) {
  const prefs = usePrefs();
  const deeds = useDeeds();
  const router = useRouter();
  const now = new Date();
  const key = dayKey(now);
  const t = prefs.today?.day === key ? prefs.today : { day: key, done: [] as string[] };
  const has = (id: string) => t.done.includes(id);
  const toggle = (id: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    if (!has(id)) playSfx('tick'); // a soft sound for every deed and prayer ticked (not when unticking)
    prefs.set({ today: { ...t, day: key, done: has(id) ? t.done.filter((x) => x !== id) : [...t.done, id] } });
  };

  const { goal, read, tasbeeh } = deeds;

  const dow = now.getDay();
  const extra: Extra =
    dow === 5
      ? { title: 'Read Surah al-Kahf', sub: 'A Friday sunnah', info: 'kahf', open: () => { prefs.readAt(18, 1); showFeed(router); } }
      : dow === 1 || dow === 4
        ? { title: 'Fast today, if you’re able', sub: 'A voluntary sunnah · already eaten? No harm, there’s always the next one', info: 'sunnahfast', fast: true }
        : (() => {
            const s = TRIES[Math.floor(now.getTime() / 86400000) % TRIES.length];
            return { title: s.title, sub: s.source, info: 'sunnah' };
          })();
  // The evening before a fast day (Sunday and Wednesday from 3pm): a heads-up, so nobody finds out after breakfast.
  const tomorrowFast = (dow === 0 || dow === 3) && now.getHours() >= 15 ? (dow === 0 ? 'Monday' : 'Thursday') : null;
  const [explain, explainSheet] = useExplain(pal);

  const prayed = PRAYERS.filter((p) => has(p.id)).length;
  const items = [
    { id: 'read', info: 'dailyquran', title: `Read ${goal} ayat`, sub: read >= goal ? `${read} read` : `${read} of ${goal}`, done: read >= goal, auto: true, open: () => showFeed(router) },
    { id: 'tasbeeh', info: 'dhikr', title: `Remember Allah ${TASBEEH_GOAL} times`, sub: tasbeeh >= TASBEEH_GOAL ? `${tasbeeh} today` : `${tasbeeh} of ${TASBEEH_GOAL} · tasbeeh`, done: tasbeeh >= TASBEEH_GOAL, auto: true, open: () => router.push('/tasbeeh') },
    { id: 'selfdua', info: 'dua', title: 'Make a dua for yourself', sub: 'Ask Allah for what you need, in your own words', done: has('selfdua'), open: () => router.push('/duas') },
    { id: 'dua', info: 'duaothers', title: 'Make dua for someone', sub: 'A parent, a friend, someone who asked', done: has('dua'), open: () => router.push({ pathname: '/dua-requests', params: { how: '1' } }) },
    { id: 'extra', info: extra.info, fast: extra.fast, title: extra.title, sub: extra.sub, done: has('extra'), open: extra.open },
  ];
  const { total, count, all } = deeds;
  const gold = pal.gold;

  // The whole list done: once a day, while this tab is open (reading and tasbeeh tick themselves elsewhere, so the
  // celebration waits until the reader is back here to see it). Unticking and re-ticking doesn't replay it.
  const cheered = !!t.cheered;
  const firstName = prefs.firstName;
  const setPrefs = prefs.set;
  useFocusEffect(
    useCallback(() => {
      if (!all || cheered) return;
      setPrefs({ today: { day: key, done: t.done, cheered: true } });
      // No cleanup on purpose: marking it cheered re-runs this effect, which must not cancel the celebration.
      setTimeout(() => {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
        playSfx('done');
        fireConfetti(firstName ? `MashaAllah, ${firstName}` : 'MashaAllah');
      }, 350);
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [all, cheered, key, firstName]),
  );

  // Someone coming back to Allah (their journey answer) shouldn't open on a "0/6" scoreboard:
  // until the day's first tick, a kinder line and no count (Saj, 23 Nov 2026).
  const gentle = prefs.journey?.journey === 'returning' && count === 0;

  return (
    <View style={[styles.card, { backgroundColor: pal.surface, borderColor: all ? gold : pal.line }]}>
      <View style={styles.head}>
        <View style={{ flex: 1 }}>
          <Text style={[styles.eyebrow, { color: pal.accent }]}>TODAY</Text>
          <Text style={[styles.title, { color: pal.text }]}>Daily deeds</Text>
          <Text style={[styles.sub, { color: all ? pal.accent : pal.muted }]}>{all ? 'MashaAllah, all done for today' : gentle ? 'Start with one. Whatever you do today counts.' : 'A simple way to connect with Allah'}</Text>
        </View>
        {all ? <GoldStar size={26} color={gold} /> : gentle ? null : <Text style={[styles.count, { color: pal.accent }]}>{count}/{total}</Text>}
      </View>

      {/* The five prayers, tapped one by one */}
      <View style={[styles.row, { borderTopColor: pal.line }]}>
        <Tick pal={pal} on={prayed === 5} />
        <View style={{ flex: 1, gap: 8 }}>
          <View style={styles.titleRow}>
            <Text style={[styles.itemTitle, { color: pal.text, flex: 1 }]}>Pray the five prayers</Text>
            <Info pal={pal} label="What is salah?" onPress={() => explain('salah')} />
          </View>
          <View style={styles.prayers}>
            {PRAYERS.map((p) => {
              const on = has(p.id);
              return (
                <Pressable key={p.id} onPress={() => toggle(p.id)} hitSlop={4} style={[styles.prayer, { borderColor: on ? pal.accent : edgeOf(pal), backgroundColor: on ? pal.accent : 'transparent' }]} accessibilityRole="checkbox" accessibilityState={{ checked: on }} accessibilityLabel={`${p.name} prayed`}>
                  <Text style={[styles.prayerText, { color: on ? pal.onAccent : pal.muted }]}>{p.name}</Text>
                </Pressable>
              );
            })}
          </View>
        </View>
      </View>

      {items.map((it) => (
        <View key={it.id} style={[styles.rowWrap, { borderTopColor: pal.line }]}>
          <View style={styles.rowIn}>
            <Pressable onPress={it.auto ? it.open : () => toggle(it.id)} hitSlop={8} accessibilityRole={it.auto ? 'button' : 'checkbox'} accessibilityState={it.auto ? undefined : { checked: it.done }} accessibilityLabel={it.title}>
              <Tick pal={pal} on={it.done} />
            </Pressable>
            <Pressable onPress={it.auto ? it.open : () => toggle(it.id)} style={{ flex: 1, gap: 1 }}>
              <Text style={[styles.itemTitle, { color: pal.text }, it.done && { color: pal.muted }]}>{it.title}</Text>
              <Text style={[styles.itemSub, { color: pal.muted }]}>{it.sub}</Text>
            </Pressable>
            <Info pal={pal} label={`About: ${it.title}`} onPress={() => explain(it.info)} />
            {!!it.open && (
              <Pressable onPress={it.open} hitSlop={10} accessibilityRole="button" accessibilityLabel={`Open: ${it.title}`} style={[styles.go, { backgroundColor: mix(pal.surface, pal.accent, pal.dark ? 0.22 : 0.1) }]}>
                <Icon name="chevron" size={14} color={pal.accent} />
              </Pressable>
            )}
          </View>
          {it.fast && <FastRemind pal={pal} />}
        </View>
      ))}

      {tomorrowFast && (
        <View style={[styles.rowWrap, { borderTopColor: pal.line }]}>
          <View style={[styles.tomorrow, { backgroundColor: mix(pal.surface, pal.accent, pal.dark ? 0.16 : 0.07) }]}>
            <View style={styles.rowIn}>
              <Icon name="moon" size={20} color={pal.accent} />
              <View style={{ flex: 1, gap: 1 }}>
                <Text style={[styles.itemTitle, { color: pal.text }]}>Tomorrow is {tomorrowFast}</Text>
                <Text style={[styles.itemSub, { color: pal.muted }]}>A sunnah fast day. Fasting? Eat suhoor before Fajr.</Text>
              </View>
              <Info pal={pal} label="Why fast on Mondays and Thursdays?" onPress={() => explain('sunnahfast')} />
            </View>
            <FastRemind pal={pal} />
          </View>
        </View>
      )}
      {explainSheet}
    </View>
  );
}

/** The small ? that opens the explainer for a deed. */
function Info({ pal, label, onPress }: { pal: Palette; label: string; onPress: () => void }) {
  return (
    <Pressable onPress={onPress} hitSlop={10} accessibilityRole="button" accessibilityLabel={label} style={[styles.info, { borderColor: mix(pal.surface, pal.accent, 0.45) }]}>
      <Text style={[styles.infoText, { color: pal.accent }]}>?</Text>
    </Pressable>
  );
}

/** "Remind me the night before" for Monday and Thursday fasts (prefs.fastReminder; scheduled in reminders.ts). */
function FastRemind({ pal }: { pal: Palette }) {
  const prefs = usePrefs();
  const on = !!prefs.fastReminder;
  const flip = async () => {
    if (on) return prefs.set({ fastReminder: false });
    if (!(await askPermission())) {
      Alert.alert('Notifications are off', 'To get a reminder the night before, allow notifications for Munib in your iPhone’s Settings.');
      return;
    }
    prefs.set({ fastReminder: true });
  };
  return (
    <Pressable onPress={flip} style={[styles.remind, { borderColor: on ? pal.accent : pal.line, backgroundColor: on ? mix(pal.surface, pal.accent, 0.12) : 'transparent' }]} accessibilityRole="switch" accessibilityState={{ checked: on }} accessibilityLabel="Remind me the night before Monday and Thursday fasts">
      <Icon name="bell" size={15} color={pal.accent} />
      <Text style={[styles.remindText, { color: on ? pal.accent : pal.text }]}>{on ? 'Reminder on · 9pm the night before' : 'Remind me the night before'}</Text>
      {on && <Icon name="check" size={14} color={pal.accent} strokeWidth={2.4} />}
    </Pressable>
  );
}

function Tick({ pal, on }: { pal: Palette; on: boolean }) {
  return (
    <View style={[styles.tick, { borderColor: on ? pal.accent : edgeOf(pal), backgroundColor: on ? pal.accent : 'transparent' }]}>
      {on && <Icon name="check" size={13} color={pal.onAccent} strokeWidth={2.6} />}
    </View>
  );
}

const styles = StyleSheet.create({
  card: { borderRadius: 22, borderWidth: 1, paddingHorizontal: 16, paddingTop: 14, paddingBottom: 4, marginBottom: 12 },
  head: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingBottom: 12 },
  title: { fontFamily: fonts.read, fontSize: 24, letterSpacing: -0.3 },
  sub: { fontFamily: fonts.ui, fontSize: 13, marginTop: 1 },
  count: { fontFamily: fonts.read, fontSize: 22, fontVariant: ['tabular-nums'] },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 12, borderTopWidth: StyleSheet.hairlineWidth },
  rowWrap: { paddingVertical: 12, borderTopWidth: StyleSheet.hairlineWidth, gap: 10 },
  rowIn: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  eyebrow: { fontFamily: fonts.uiBold, fontSize: 11, letterSpacing: 1.3, marginBottom: 1 },
  tick: { width: 24, height: 24, borderRadius: 12, borderWidth: 1.5, alignItems: 'center', justifyContent: 'center' },
  itemTitle: { fontFamily: fonts.uiSemi, fontSize: 15.5, lineHeight: 20 },
  itemSub: { fontFamily: fonts.ui, fontSize: 12.5, lineHeight: 17 },
  prayers: { flexDirection: 'row', gap: 6, flexWrap: 'wrap' },
  prayer: { borderWidth: 1, borderRadius: 999, paddingHorizontal: 10, paddingVertical: 6 },
  prayerText: { fontFamily: fonts.uiSemi, fontSize: 12.5 },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  info: { width: 24, height: 24, borderRadius: 12, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  infoText: { fontFamily: fonts.uiBold, fontSize: 13 },
  tomorrow: { borderRadius: 16, padding: 12, gap: 10 },
  remind: { flexDirection: 'row', alignItems: 'center', gap: 8, alignSelf: 'flex-start', borderWidth: 1, borderRadius: 999, paddingHorizontal: 12, paddingVertical: 7, marginLeft: 36 },
  remindText: { fontFamily: fonts.uiSemi, fontSize: 13 },
  go: { width: 28, height: 28, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
});
