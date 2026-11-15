import * as Haptics from 'expo-haptics';
import { useRouter } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { Image, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useExplain } from '@/components/Explain';
import { GoldStar } from '@/components/Gold';
import { Icon } from '@/components/Icon';
import { Group, Row, Section } from '@/components/List';
import { DUA_TOPICS, type Dua } from '@/data/duas';
import { juzStart } from '@/data/mushaf';
import { DUA_IDS, FOOD_RULES, HEALTH_NOTE, IFTAR, QADR_DUA, QADR_SRC, SLEEP_TIPS, SUHOOR, type Meal } from '@/data/ramadan';
import { ART } from '@/lib/art';
import { showFeed } from '@/lib/nav';
import { calcDay, hm, until } from '@/lib/prayertimes';
import { isOddNight, longDate, ramadanNow, ramadanStartDate, sleepPlan } from '@/lib/ramadan';
import { usePrefs } from '@/lib/store';
import { fonts, mix, usePalette, type Palette } from '@/lib/theme';

/**
 * Ramadan companion (Saj, 15 Nov 2026). Before the month: a countdown and how to get ready. During it: today's fast
 * with suhoor and iftar times, the duas, tonight's juz for taraweeh, the last ten nights, a private fasting log, and
 * (Saj's own ask) a sleep plan and meal ideas. Everything is worked out and kept on the phone; nothing is sent.
 * No streaks and no guilt: a missed fast is "to make up", with a pointer to the imam.
 * Religious lines are sourced and need a scholar's check; sleep and food are general ideas, not medical advice.
 */
const NIGHT = '#0E1530';
const GOLD = '#E2B76A';

const duaById = (id: string): { d: Dua; src: string } | null => {
  for (const t of DUA_TOPICS) {
    const d = t.duas.find((x) => x.id === id);
    if (d) return { d, src: t.src };
  }
  return null;
};

export default function Ramadan() {
  const pal = usePalette();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const prefs = usePrefs();
  const [explain, explainSheet] = useExplain(pal);
  const [now, setNow] = useState(() => new Date());
  const [meal, setMeal] = useState<'suhoor' | 'iftar'>('suhoor');
  const [moreSleep, setMoreSleep] = useState(false);
  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 30000);
    return () => clearInterval(t);
  }, []);

  const mine = prefs.ramadan ?? { shift: 0, log: {} };
  const r = useMemo(() => ramadanNow(mine.shift, prefs.prayer, now), [mine.shift, prefs.prayer, now]);
  const times = useMemo(() => {
    try {
      return prefs.prayer?.loc ? (calcDay(prefs.prayer, now)?.times ?? null) : null;
    } catch {
      return null;
    }
  }, [prefs.prayer, now]);
  const plan = useMemo(() => sleepPlan(prefs.prayer, now), [prefs.prayer, now]);
  const log = mine.log[r.year] ?? {};
  const kept = Object.values(log).filter((x) => x === 'f').length;
  const owed = Object.values(log).filter((x) => x === 'm').length;

  const setShift = (shift: -1 | 0 | 1) => prefs.set({ ramadan: { ...mine, shift } });
  const mark = (day: number, to?: 'f' | 'm') => {
    Haptics.selectionAsync().catch(() => {});
    const cur = log[day];
    const next = to !== undefined ? (cur === to ? undefined : to) : cur === undefined ? 'f' : cur === 'f' ? 'm' : undefined;
    const year = { ...log };
    if (next) year[day] = next;
    else delete year[day];
    prefs.set({ ramadan: { ...mine, log: { ...mine.log, [r.year]: year } } });
  };
  const readJuz = (j: number) => {
    const [s, a] = juzStart(j);
    prefs.readAt(s, a);
    showFeed(router);
  };

  const start = ramadanStartDate(r);
  const eve = new Date(start.getFullYear(), start.getMonth(), start.getDate() - 1, 12);
  // What the fast is waiting for right now.
  const waiting = !times || r.phase !== 'during' ? null : now < times.fajr ? { label: 'Suhoor ends in', ms: times.fajr.getTime() - now.getTime() } : now < times.maghrib ? { label: 'Iftar in', ms: times.maghrib.getTime() - now.getTime() } : null;
  const lastTen = r.night >= 21;
  const iftarDua = duaById(DUA_IDS.iftar), moonDua = duaById(DUA_IDS.moon), rudeDua = duaById(DUA_IDS.rude);
  const meals = meal === 'suhoor' ? SUHOOR : IFTAR;

  return (
    <View style={[styles.root, { backgroundColor: pal.bg }]}>
      <View style={[styles.head, { paddingTop: insets.top + 14, borderBottomColor: pal.line }]}>
        <Text style={[styles.title, { color: pal.text }]}>Ramadan</Text>
        <Pressable onPress={() => router.back()} style={[styles.x, { borderColor: pal.line }]} accessibilityRole="button" accessibilityLabel="Close" hitSlop={8}>
          <Icon name="close" size={18} color={pal.text} />
        </Pressable>
      </View>
      <ScrollView contentContainerStyle={{ padding: 18, paddingBottom: insets.bottom + 40, gap: 12 }} showsVerticalScrollIndicator={false}>
        {/* The night-sky card: where we are in the month */}
        <View style={styles.hero}>
          <Image source={ART.moon} style={styles.heroArt} resizeMode="contain" accessibilityIgnoresInvertColors />
          {r.phase === 'during' ? (
            <>
              <Text style={styles.heroEyebrow}>RAMADAN {r.year}</Text>
              <Text style={styles.heroBig}>Day {r.day}</Text>
              <Text style={styles.heroLine}>{lastTen ? `The last ten nights${r.night ? ` · night ${r.night}` : ''}` : `of ${r.length}, by the calendar`}</Text>
            </>
          ) : r.phase === 'eid' ? (
            <>
              <Text style={styles.heroEyebrow}>1 SHAWWAL{r.eidDay > 1 ? ` · DAY ${r.eidDay}` : ''}</Text>
              <Text style={[styles.heroBig, { fontSize: 42, lineHeight: 54 }]}>Eid Mubarak</Text>
              <Text style={styles.heroLine}>May Allah accept it from us and from you.</Text>
            </>
          ) : (
            <>
              <Text style={styles.heroEyebrow}>RAMADAN {r.year}</Text>
              <Text style={styles.heroBig}>{r.daysTo === 1 ? 'Tomorrow' : `${r.daysTo} days`}</Text>
              <Text style={styles.heroLine}>
                {r.daysTo === 1 ? 'The first fast is tomorrow, if the moon is sighted tonight.' : `until the first fast, expected on ${longDate(start)}. The first taraweeh is the evening before, ${longDate(eve)}.`}
              </Text>
            </>
          )}
          {r.phase === 'during' && (
            <View style={styles.timesRow}>
              <View style={styles.timeBox}>
                <Text style={styles.timeLabel}>SUHOOR ENDS</Text>
                <Text style={styles.timeBig}>{times ? hm(times.fajr) : '–'}</Text>
                <Text style={styles.timeSub}>Fajr</Text>
              </View>
              <View style={styles.timeBox}>
                <Text style={styles.timeLabel}>IFTAR</Text>
                <Text style={styles.timeBig}>{times ? hm(times.maghrib) : '–'}</Text>
                <Text style={styles.timeSub}>Maghrib</Text>
              </View>
            </View>
          )}
          {!!waiting && (
            <Text style={styles.waiting}>
              {waiting.label} <Text style={{ color: GOLD }}>{until(waiting.ms)}</Text>
            </Text>
          )}
          {r.phase === 'during' && !times && (
            <Pressable onPress={() => router.push('/prayertimes')} style={styles.setUp} accessibilityRole="button">
              <Text style={styles.setUpText}>Set up prayer times to see suhoor and iftar</Text>
              <Icon name="chevron" size={15} color="#FFFFFF" />
            </Pressable>
          )}
          {r.phase !== 'eid' && (
            <View style={{ gap: 8, marginTop: 16 }}>
              <Text style={styles.heroNote}>Ramadan begins when the new moon is sighted, so your mosque may start a day either side:</Text>
              <View style={{ flexDirection: 'row', gap: 8 }}>
                {([[-1, 'A day earlier'], [0, 'As calculated'], [1, 'A day later']] as const).map(([v, label]) => (
                  <Pressable key={v} onPress={() => setShift(v)} style={[styles.shift, mine.shift === v && { backgroundColor: GOLD, borderColor: GOLD }]} accessibilityRole="button" accessibilityState={{ selected: mine.shift === v }}>
                    <Text style={[styles.shiftText, mine.shift === v && { color: '#1A1408' }]}>{label}</Text>
                  </Pressable>
                ))}
              </View>
            </View>
          )}
        </View>

        <Pressable onPress={() => explain('ramadan')} style={styles.link} accessibilityRole="button">
          <Icon name="info" size={15} color={pal.accent} />
          <Text style={[styles.linkText, { color: pal.accent }]}>New to Ramadan? What it is and how to begin</Text>
        </Pressable>

        {/* Today */}
        {r.phase === 'during' && (
          <>
            <Section pal={pal} title="Today" />
            <View style={[styles.card, { backgroundColor: pal.surface }]}>
              <Text style={[styles.cardTitle, { color: pal.text }]}>Today’s fast</Text>
              <Text style={[styles.body, { color: pal.muted }]}>Just for you: nobody else sees this, and it never leaves your phone.</Text>
              <View style={{ flexDirection: 'row', gap: 8, marginTop: 4 }}>
                <Choice pal={pal} on={log[r.day] === 'f'} label="I’m fasting" onPress={() => mark(r.day, 'f')} />
                <Choice pal={pal} on={log[r.day] === 'm'} label="Not today" onPress={() => mark(r.day, 'm')} />
              </View>
              {log[r.day] === 'm' && <Text style={[styles.body, { color: pal.muted }]}>That’s all right. Illness, travel and other reasons are part of the mercy of this month; days like this are made up later. Your imam can tell you what applies to you.</Text>}
            </View>

            {r.night > 0 && (
              <View style={[styles.card, { backgroundColor: pal.surface }]}>
                <Text style={[styles.eyebrow, { color: pal.accent }]}>TONIGHT · NIGHT {r.night}</Text>
                <Text style={[styles.cardTitle, { color: pal.text }]}>Taraweeh: around juz {r.night}</Text>
                <Text style={[styles.body, { color: pal.muted }]}>Many mosques recite about one juz a night. Reading it beforehand helps you follow what you’ll hear.</Text>
                <View style={{ flexDirection: 'row', gap: 8, marginTop: 4, alignItems: 'center' }}>
                  <Pressable onPress={() => readJuz(r.night)} style={[styles.btn, { backgroundColor: pal.text }]} accessibilityRole="button">
                    <Text style={[styles.btnText, { color: pal.bg }]}>Read juz {r.night}</Text>
                  </Pressable>
                  <Pressable onPress={() => explain('taraweeh')} hitSlop={8} accessibilityRole="button">
                    <Text style={[styles.linkText, { color: pal.accent }]}>What is taraweeh?</Text>
                  </Pressable>
                </View>
              </View>
            )}

            {lastTen && (
              <View style={[styles.card, { backgroundColor: NIGHT }]}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                  <GoldStar size={13} color={GOLD} />
                  <Text style={[styles.eyebrow, { color: GOLD }]}>{isOddNight(r.night) ? 'AN ODD NIGHT' : 'THE LAST TEN NIGHTS'}</Text>
                </View>
                <Text style={[styles.cardTitle, { color: '#FFFFFF' }]}>Laylat al-Qadr is better than a thousand months.</Text>
                <Text style={[styles.body, { color: 'rgba(255,255,255,0.78)' }]}>
                  The Prophet ﷺ said: “Seek it in the odd nights of the last ten nights of Ramadan.” {isOddNight(r.night) ? `Tonight is the ${r.night}${r.night === 21 || r.night === 23 ? (r.night === 21 ? 'st' : 'rd') : 'th'} night.` : 'Give each of these nights something, even a little.'}
                </Text>
                <Text style={styles.qadrAr}>{QADR_DUA.ar}</Text>
                <Text style={[styles.body, { color: GOLD }]}>{QADR_DUA.tl}</Text>
                <Text style={[styles.body, { color: '#FFFFFF' }]}>{QADR_DUA.en}</Text>
                <Text style={[styles.small, { color: 'rgba(255,255,255,0.6)' }]}>Quran 97:3 · Sahih al-Bukhari 2017 · {QADR_SRC}</Text>
                <Pressable onPress={() => explain('qadr')} hitSlop={8} accessibilityRole="button">
                  <Text style={[styles.linkText, { color: GOLD }]}>What is Laylat al-Qadr?</Text>
                </Pressable>
              </View>
            )}
            {r.day >= 25 && (
              <Group pal={pal}>
                <Row pal={pal} icon="heart" title="Zakat al-Fitr" sub="A small charity for each person in your home, given before the Eid prayer" onPress={() => explain('fitr')} />
              </Group>
            )}
          </>
        )}

        {r.phase === 'eid' && (
          <View style={[styles.card, { backgroundColor: pal.surface }]}>
            <Text style={[styles.cardTitle, { color: pal.text }]}>A day to celebrate</Text>
            <Text style={[styles.body, { color: pal.muted }]}>The Prophet ﷺ would not go out on the morning of Eid al-Fitr until he had eaten some dates (Sahih al-Bukhari 953). The day of Eid is not a day to fast. Afterwards, many people fast six days of Shawwal (Sahih Muslim 1164).</Text>
            <Pressable onPress={() => explain('eid')} hitSlop={8} accessibilityRole="button">
              <Text style={[styles.linkText, { color: pal.accent }]}>What is Eid al-Fitr?</Text>
            </Pressable>
          </View>
        )}

        {/* Duas */}
        {r.phase !== 'eid' && (
          <>
            <Section pal={pal} title="Duas for the month" />
            {r.phase === 'before' && moonDua && <DuaCard pal={pal} label="WHEN YOU SEE THE NEW MOON" d={moonDua.d} src={moonDua.src} showTl={prefs.showTl} />}
            {iftarDua && <DuaCard pal={pal} label="WHEN YOU BREAK YOUR FAST" d={iftarDua.d} src={iftarDua.src} showTl={prefs.showTl} />}
            {rudeDua && <DuaCard pal={pal} label="IF SOMEONE IS RUDE TO YOU WHILE YOU FAST" d={rudeDua.d} src={rudeDua.src} showTl={prefs.showTl} />}
            {!lastTen && <DuaCard pal={pal} label="FOR LAYLAT AL-QADR, IN THE LAST TEN NIGHTS" d={QADR_DUA} src={QADR_SRC} showTl={prefs.showTl} />}
            <Pressable onPress={() => router.push('/duas')} style={styles.link} accessibilityRole="button">
              <Icon name="hands" size={15} color={pal.accent} />
              <Text style={[styles.linkText, { color: pal.accent }]}>Find a dua for anything else</Text>
            </Pressable>
          </>
        )}

        {/* Sleep and food: for the fasting month, so not on Eid */}
        {r.phase !== 'eid' && (
          <>
        <Section pal={pal} title="Sleep and energy" />
        <View style={[styles.card, { backgroundColor: pal.surface }]}>
          {plan ? (
            <>
              <Text style={[styles.cardTitle, { color: pal.text }]}>{r.phase === 'during' ? 'Tonight’s plan' : 'A Ramadan night, from your prayer times'}</Text>
              <View style={{ gap: 2 }}>
                <PlanRow pal={pal} at={hm(plan.bed)} what="In bed" note="after Isha and taraweeh" />
                <PlanRow pal={pal} at={hm(plan.wake)} what="Up for suhoor" note="time to eat without rushing" />
                <PlanRow pal={pal} at={hm(plan.back)} what="Back to sleep" note="after Fajr, if your day allows" />
                <PlanRow pal={pal} at={hm(plan.nap)} what="Or a 20-minute nap" note="after Dhuhr" last />
              </View>
              <Text style={[styles.body, { color: pal.muted }]}>
                That’s about {plan.night.toFixed(1).replace('.0', '')} hours before suhoor{plan.need > 0.4 ? `, so look for another ${plan.need.toFixed(1).replace('.0', '')} or so after Fajr or in a nap to reach seven` : ''}.{r.phase !== 'during' ? ' Based on tonight’s times where you are; Ramadan’s will differ.' : ''}
              </Text>
            </>
          ) : (
            <>
              <Text style={[styles.cardTitle, { color: pal.text }]}>A plan from your prayer times</Text>
              <Text style={[styles.body, { color: pal.muted }]}>Set up prayer times and Munib works out when to sleep, wake for suhoor and nap, around your own Fajr and Isha.</Text>
              <Pressable onPress={() => router.push('/prayertimes')} style={[styles.btn, { backgroundColor: pal.text, alignSelf: 'flex-start' }]} accessibilityRole="button">
                <Text style={[styles.btnText, { color: pal.bg }]}>Set up prayer times</Text>
              </Pressable>
            </>
          )}
        </View>
        <View style={[styles.card, { backgroundColor: pal.surface, gap: 14 }]}>
          {(moreSleep ? SLEEP_TIPS : SLEEP_TIPS.slice(0, 3)).map((t) => (
            <View key={t.title} style={{ gap: 3 }}>
              <Text style={[styles.tipTitle, { color: pal.text }]}>{t.title}</Text>
              <Text style={[styles.body, { color: pal.muted }]}>{t.body}</Text>
            </View>
          ))}
          {!moreSleep && (
            <Pressable onPress={() => setMoreSleep(true)} hitSlop={8} accessibilityRole="button">
              <Text style={[styles.linkText, { color: pal.accent }]}>Show {SLEEP_TIPS.length - 3} more</Text>
            </Pressable>
          )}
        </View>

        {/* Food */}
        <Section pal={pal} title="What to eat" />
        <View style={{ flexDirection: 'row', gap: 8 }}>
          <Choice pal={pal} on={meal === 'suhoor'} label="Suhoor" onPress={() => setMeal('suhoor')} />
          <Choice pal={pal} on={meal === 'iftar'} label="Iftar" onPress={() => setMeal('iftar')} />
        </View>
        <Text style={[styles.body, { color: pal.muted }]}>
          {meal === 'suhoor' ? 'Aim for slow energy, protein and water, and go easy on salt. The Prophet ﷺ said: “Eat suhoor, for in suhoor there is blessing” (Sahih al-Bukhari 1923).' : 'Open gently, pray, then eat a balanced plate. You’ll feel lighter for taraweeh and sleep better afterwards.'}
        </Text>
        {meals.map((m) => (
          <MealCard key={m.name} pal={pal} m={m} />
        ))}
        <View style={[styles.card, { backgroundColor: pal.surface, gap: 10 }]}>
          {FOOD_RULES.map((t) => (
            <View key={t} style={{ flexDirection: 'row', gap: 10 }}>
              <View style={{ marginTop: 7 }}>
                <GoldStar size={9} color={pal.gold} />
              </View>
              <Text style={[styles.body, { color: pal.text, flex: 1 }]}>{t}</Text>
            </View>
          ))}
        </View>
        <Text style={[styles.small, { color: pal.muted }]}>{HEALTH_NOTE}</Text>
          </>
        )}

        {/* The private log */}
        {r.phase !== 'before' && (
          <>
            <Section pal={pal} title="Your fasts" />
            <View style={[styles.card, { backgroundColor: pal.surface }]}>
              <Text style={[styles.body, { color: pal.muted }]}>
                {kept ? `${kept} ${kept === 1 ? 'fast' : 'fasts'} kept` : 'Tap a day to mark it'}
                {owed ? ` · ${owed} to make up` : ''}. Tap again to change it.
              </Text>
              <View style={styles.grid}>
                {Array.from({ length: r.length }, (_, i) => i + 1).map((d) => {
                  const v = log[d];
                  const open = r.phase === 'eid' || d <= r.day;
                  return (
                    <Pressable
                      key={d}
                      disabled={!open}
                      onPress={() => mark(d)}
                      style={[styles.cell, { borderColor: v === 'f' ? pal.accent : v === 'm' ? pal.gold : pal.line, backgroundColor: v === 'f' ? pal.accent : v === 'm' ? mix(pal.surface, pal.gold, 0.2) : 'transparent', opacity: open ? 1 : 0.4 }, d === r.day && !v && { borderColor: pal.text, borderWidth: 1.5 }]}
                      accessibilityRole="button"
                      accessibilityLabel={`Day ${d}${v === 'f' ? ', fasted' : v === 'm' ? ', to make up' : ''}`}
                    >
                      <Text style={[styles.cellText, { color: v === 'f' ? pal.onAccent : pal.text }]}>{d}</Text>
                    </Pressable>
                  );
                })}
              </View>
              <View style={{ flexDirection: 'row', gap: 16 }}>
                <Legend pal={pal} colour={pal.accent} label="Fasted" />
                <Legend pal={pal} colour={mix(pal.surface, pal.gold, 0.5)} label="To make up" />
              </View>
              <Text style={[styles.small, { color: pal.muted }]}>Kept on this phone only. No streaks: every fast counts on its own.</Text>
            </View>
          </>
        )}

        {/* With others */}
        <Section pal={pal} title="Together" />
        <Group pal={pal}>
          <Row pal={pal} icon="people" title="Ramadan together" sub="A juz a day with your family or friends" onPress={() => router.push('/circle?kind=ramadan')} />
          <Row pal={pal} icon="book" title="Read together" sub="Share out a whole Quran between you" onPress={() => router.push('/together')} divider />
        </Group>

        <Section pal={pal} title="Explained" />
        <Group pal={pal}>
          <Row pal={pal} icon="moon" title="Fasting" sub="What it involves, and who is excused" onPress={() => explain('sawm')} />
          <Row pal={pal} icon="bell" title="Suhoor and iftar" sub="The meal before dawn and the one at sunset" onPress={() => explain('suhoor')} divider />
          <Row pal={pal} icon="mosque" title="Taraweeh" sub="The night prayers of Ramadan" onPress={() => explain('taraweeh')} divider />
          <Row pal={pal} icon="info" title="Laylat al-Qadr" sub="The Night of Decree" onPress={() => explain('qadr')} divider />
          <Row pal={pal} icon="heart" title="Zakat al-Fitr and Eid" sub="How the month ends" onPress={() => explain('fitr')} divider />
        </Group>
      </ScrollView>
      {explainSheet}
    </View>
  );
}

function Choice({ pal, on, label, onPress }: { pal: Palette; on: boolean; label: string; onPress: () => void }) {
  return (
    <Pressable onPress={onPress} style={[styles.choice, { borderColor: on ? pal.accent : pal.line, backgroundColor: on ? pal.accent : pal.surface }]} accessibilityRole="button" accessibilityState={{ selected: on }}>
      {on && <Icon name="check" size={15} color={pal.onAccent} strokeWidth={2.4} />}
      <Text style={[styles.choiceText, { color: on ? pal.onAccent : pal.text }]}>{label}</Text>
    </Pressable>
  );
}

function PlanRow({ pal, at, what, note, last }: { pal: Palette; at: string; what: string; note: string; last?: boolean }) {
  return (
    <View style={[styles.planRow, !last && { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: pal.line }]}>
      <Text style={[styles.planAt, { color: pal.accent }]}>{at}</Text>
      <View style={{ flex: 1 }}>
        <Text style={[styles.tipTitle, { color: pal.text }]}>{what}</Text>
        <Text style={[styles.small, { color: pal.muted }]}>{note}</Text>
      </View>
    </View>
  );
}

function MealCard({ pal, m }: { pal: Palette; m: Meal }) {
  return (
    <View style={[styles.card, { backgroundColor: pal.surface, gap: 5 }]}>
      <Text style={[styles.tipTitle, { color: pal.text }]}>{m.name}</Text>
      <Text style={[styles.body, { color: pal.text }]}>{m.what}</Text>
      <Text style={[styles.body, { color: pal.muted }]}>{m.why}</Text>
    </View>
  );
}

function DuaCard({ pal, label, d, src, showTl }: { pal: Palette; label: string; d: Dua; src: string; showTl: boolean }) {
  return (
    <View style={[styles.card, { backgroundColor: pal.surface, gap: 8 }]}>
      <Text style={[styles.eyebrow, { color: pal.accent }]}>{label}</Text>
      <Text style={[styles.ar, { color: pal.text }]}>{d.ar}</Text>
      {showTl && !!d.tl && <Text style={[styles.body, { color: pal.accent }]}>{d.tl}</Text>}
      <Text style={[styles.body, { color: pal.text }]}>{d.en}</Text>
      <Text style={[styles.small, { color: pal.muted }]}>{src}</Text>
    </View>
  );
}

function Legend({ pal, colour, label }: { pal: Palette; colour: string; label: string }) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
      <View style={{ width: 12, height: 12, borderRadius: 4, backgroundColor: colour }} />
      <Text style={[styles.small, { color: pal.muted }]}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  head: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 18, paddingBottom: 12, borderBottomWidth: StyleSheet.hairlineWidth },
  title: { fontFamily: fonts.read, fontSize: 28, letterSpacing: -0.5 },
  x: { width: 36, height: 36, borderRadius: 18, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  hero: { backgroundColor: NIGHT, borderRadius: 24, padding: 22, overflow: 'hidden' },
  heroArt: { position: 'absolute', right: -6, top: -10, width: 122, height: 122, opacity: 0.95 },
  heroEyebrow: { fontFamily: fonts.uiBold, fontSize: 12, letterSpacing: 1.6, color: GOLD },
  heroBig: { fontFamily: fonts.read, fontSize: 52, lineHeight: 62, letterSpacing: -1.2, color: '#FFFFFF', marginTop: 6 },
  heroLine: { fontFamily: fonts.ui, fontSize: 15, lineHeight: 22, color: 'rgba(255,255,255,0.82)', maxWidth: '78%' },
  heroNote: { fontFamily: fonts.ui, fontSize: 13, lineHeight: 18, color: 'rgba(255,255,255,0.62)' },
  timesRow: { flexDirection: 'row', gap: 10, marginTop: 18 },
  timeBox: { flex: 1, borderRadius: 16, padding: 14, backgroundColor: 'rgba(255,255,255,0.08)', borderWidth: StyleSheet.hairlineWidth, borderColor: 'rgba(255,255,255,0.22)' },
  timeLabel: { fontFamily: fonts.uiBold, fontSize: 11, letterSpacing: 1.2, color: 'rgba(255,255,255,0.7)' },
  timeBig: { fontFamily: fonts.read, fontSize: 26, color: '#FFFFFF', marginTop: 4 },
  timeSub: { fontFamily: fonts.ui, fontSize: 12, color: 'rgba(255,255,255,0.6)' },
  waiting: { fontFamily: fonts.uiSemi, fontSize: 16, color: '#FFFFFF', marginTop: 14 },
  setUp: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 10, marginTop: 16, borderRadius: 14, paddingHorizontal: 14, minHeight: 46, backgroundColor: 'rgba(255,255,255,0.1)' },
  setUpText: { fontFamily: fonts.uiSemi, fontSize: 14, color: '#FFFFFF', flex: 1 },
  shift: { flex: 1, minHeight: 36, borderRadius: 10, borderWidth: 1, borderColor: 'rgba(255,255,255,0.28)', alignItems: 'center', justifyContent: 'center', paddingHorizontal: 4 },
  shiftText: { fontFamily: fonts.uiSemi, fontSize: 12, color: '#FFFFFF', textAlign: 'center' },
  link: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 6 },
  linkText: { fontFamily: fonts.uiSemi, fontSize: 14 },
  card: { borderRadius: 18, padding: 16, gap: 8 },
  eyebrow: { fontFamily: fonts.uiBold, fontSize: 11, letterSpacing: 1.2 },
  cardTitle: { fontFamily: fonts.read, fontSize: 20, lineHeight: 26, letterSpacing: -0.3 },
  body: { fontFamily: fonts.ui, fontSize: 15, lineHeight: 22 },
  small: { fontFamily: fonts.ui, fontSize: 12.5, lineHeight: 18 },
  tipTitle: { fontFamily: fonts.uiBold, fontSize: 16 },
  btn: { borderRadius: 999, minHeight: 42, paddingHorizontal: 18, alignItems: 'center', justifyContent: 'center' },
  btnText: { fontFamily: fonts.uiBold, fontSize: 15 },
  choice: { flex: 1, flexDirection: 'row', gap: 6, minHeight: 44, borderRadius: 12, borderWidth: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 10 },
  choiceText: { fontFamily: fonts.uiSemi, fontSize: 15 },
  planRow: { flexDirection: 'row', alignItems: 'center', gap: 14, paddingVertical: 9 },
  planAt: { fontFamily: fonts.uiBold, fontSize: 15, width: 76 },
  ar: { fontFamily: fonts.arabic, fontSize: 24, lineHeight: 46, textAlign: 'right', writingDirection: 'rtl' },
  qadrAr: { fontFamily: fonts.arabic, fontSize: 24, lineHeight: 46, textAlign: 'right', writingDirection: 'rtl', color: '#FFFFFF' },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 7, marginVertical: 4 },
  cell: { width: 40, height: 40, borderRadius: 11, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  cellText: { fontFamily: fonts.uiSemi, fontSize: 14 },
});
