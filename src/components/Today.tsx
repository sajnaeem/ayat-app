import * as Haptics from 'expo-haptics';
import { useRouter } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { GoldStar } from '@/components/Gold';
import { Icon } from '@/components/Icon';
import { SNIPPETS } from '@/data/snippets';
import { showFeed } from '@/lib/nav';
import { dayKey, useProgress } from '@/lib/progress';
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
const PRAYERS = [
  { id: 'fajr', name: 'Fajr' },
  { id: 'dhuhr', name: 'Dhuhr' },
  { id: 'asr', name: 'Asr' },
  { id: 'maghrib', name: 'Maghrib' },
  { id: 'isha', name: 'Isha' },
];
const TASBEEH_GOAL = 33;
const TRIES = SNIPPETS.filter((s) => s.kind === 'try' && s.id !== 't-tasbih') as { id: string; title: string; source: string }[];

type Extra = { title: string; sub: string; open?: () => void };

export function Today({ pal }: { pal: Palette }) {
  const prefs = usePrefs();
  const { progress } = useProgress();
  const router = useRouter();
  const now = new Date();
  const key = dayKey(now);
  const t = prefs.today?.day === key ? prefs.today : { day: key, done: [] as string[] };
  const has = (id: string) => t.done.includes(id);
  const toggle = (id: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    prefs.set({ today: { day: key, done: has(id) ? t.done.filter((x) => x !== id) : [...t.done, id] } });
  };

  const goal = prefs.dailyGoal || 10;
  const read = progress.days[key] ?? 0;
  const tasbeeh = prefs.tasbeeh.day === now.toISOString().slice(0, 10) ? prefs.tasbeeh.today : 0;

  const dow = now.getDay();
  const extra: Extra =
    dow === 5
      ? { title: 'Read Surah al-Kahf', sub: 'A Friday sunnah', open: () => { prefs.readAt(18, 1); showFeed(router); } }
      : dow === 1 || dow === 4
        ? { title: 'Fast today, if you’re able', sub: 'A sunnah on Mondays and Thursdays · Tirmidhi 745' }
        : (() => {
            const s = TRIES[Math.floor(now.getTime() / 86400000) % TRIES.length];
            return { title: s.title, sub: s.source };
          })();

  const prayed = PRAYERS.filter((p) => has(p.id)).length;
  const items = [
    { id: 'read', title: `Read ${goal} ayat`, sub: read >= goal ? `${read} read` : `${read} of ${goal}`, done: read >= goal, auto: true, open: () => showFeed(router) },
    { id: 'tasbeeh', title: `Remember Allah ${TASBEEH_GOAL} times`, sub: tasbeeh >= TASBEEH_GOAL ? `${tasbeeh} today` : `${tasbeeh} of ${TASBEEH_GOAL} · tasbeeh`, done: tasbeeh >= TASBEEH_GOAL, auto: true, open: () => router.push('/tasbeeh') },
    { id: 'selfdua', title: 'Make a dua for yourself', sub: 'Ask Allah for what you need, in your own words', done: has('selfdua'), open: () => router.push('/duas') },
    { id: 'dua', title: 'Make dua for someone', sub: 'A parent, a friend, someone who asked', done: has('dua'), open: () => router.push({ pathname: '/dua-requests', params: { how: '1' } }) },
    { id: 'extra', title: extra.title, sub: extra.sub, done: has('extra'), open: extra.open },
  ];
  const total = items.length + 1;
  const count = items.filter((i) => i.done).length + (prayed === 5 ? 1 : 0);
  const all = count === total;
  const gold = pal.gold;

  return (
    <View style={[styles.card, { backgroundColor: pal.surface, borderColor: all ? gold : pal.line }]}>
      <View style={styles.head}>
        <View style={{ flex: 1 }}>
          <Text style={[styles.eyebrow, { color: pal.accent }]}>TODAY</Text>
          <Text style={[styles.title, { color: pal.text }]}>Daily deeds</Text>
          <Text style={[styles.sub, { color: all ? pal.accent : pal.muted }]}>{all ? 'MashaAllah, all done for today' : 'A simple way to connect with Allah'}</Text>
        </View>
        {all ? <GoldStar size={26} color={gold} /> : <Text style={[styles.count, { color: pal.accent }]}>{count}/{total}</Text>}
      </View>

      {/* The five prayers, tapped one by one */}
      <View style={[styles.row, { borderTopColor: pal.line }]}>
        <Tick pal={pal} on={prayed === 5} />
        <View style={{ flex: 1, gap: 8 }}>
          <Text style={[styles.itemTitle, { color: pal.text }]}>Pray the five prayers</Text>
          <View style={styles.prayers}>
            {PRAYERS.map((p) => {
              const on = has(p.id);
              return (
                <Pressable key={p.id} onPress={() => toggle(p.id)} hitSlop={4} style={[styles.prayer, { borderColor: on ? pal.accent : pal.line, backgroundColor: on ? pal.accent : 'transparent' }]} accessibilityRole="checkbox" accessibilityState={{ checked: on }} accessibilityLabel={`${p.name} prayed`}>
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
            {!!it.open && (
              <Pressable onPress={it.open} hitSlop={10} accessibilityRole="button" accessibilityLabel={`Open: ${it.title}`} style={[styles.go, { backgroundColor: mix(pal.surface, pal.accent, 0.1) }]}>
                <Icon name="chevron" size={14} color={pal.accent} />
              </Pressable>
            )}
          </View>
        </View>
      ))}
    </View>
  );
}

function Tick({ pal, on }: { pal: Palette; on: boolean }) {
  return (
    <View style={[styles.tick, { borderColor: on ? pal.accent : pal.line, backgroundColor: on ? pal.accent : 'transparent' }]}>
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
  go: { width: 28, height: 28, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
});
