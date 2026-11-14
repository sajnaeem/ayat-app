import { useState } from 'react';
import { Image, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { ART, poseArt } from '@/lib/art';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Icon } from './Icon';
import { EXPLAINERS } from '@/data/explainers';
import { Journey, JourneyAnswers, usePrefs } from '@/lib/store';
import { fonts, mix, usePalette } from '@/lib/theme';

/**
 * First open: a few questions about where someone is on their journey, so Munib fits them from the first card.
 * The answers stay on the phone (prefs.journey) and only change settings; nothing is sent anywhere.
 * Personal (Saj, 14 Nov 2026): it asks their name and brother/sister first, then talks to them by name and ends
 * with a short note written from their answers. Every line is written here in advance; no AI writes to people.
 */
type Opt<T extends string | number> = { id: T; label: string; sub?: string };

const JOURNEY: Opt<Journey>[] = [
  { id: 'returning', label: 'I’m Muslim and want to come back to the Quran', sub: 'It’s been a while, and I want to make it part of my life again' },
  { id: 'new', label: 'I’m new to Islam', sub: 'I’ve taken my shahadah, or I’m about to' },
  { id: 'exploring', label: 'I’m curious about Islam', sub: 'I’m not Muslim, and I’d like to understand' },
  { id: 'growing', label: 'I practise and want to go deeper', sub: 'I read already, and want more understanding' },
];
const ARABIC: Opt<JourneyAnswers['arabic']>[] = [
  { id: 'none', label: 'Not yet', sub: 'I can’t read the Arabic letters' },
  { id: 'letters', label: 'I’m learning the letters' },
  { id: 'slow', label: 'Slowly', sub: 'I can read, but it takes me time' },
  { id: 'fluent', label: 'Comfortably' },
];
const READING: Opt<JourneyAnswers['reading']>[] = [
  { id: 'rarely', label: 'Rarely or never' },
  { id: 'ramadan', label: 'Mostly in Ramadan' },
  { id: 'weekly', label: 'Every week or so' },
  { id: 'daily', label: 'Most days' },
];
const GOALS: Opt<string>[] = [
  { id: 'habit', label: 'Read the Quran regularly' },
  { id: 'understand', label: 'Understand what I read' },
  { id: 'surahs', label: 'Learn surahs for my prayer' },
  { id: 'pray', label: 'Pray on time' },
  { id: 'close', label: 'Feel closer to Allah' },
  { id: 'calm', label: 'Find calm' },
  { id: 'basics', label: 'Learn the basics of Islam' },
];
const TIME: Opt<number>[] = [
  { id: 2, label: '2 minutes', sub: 'A few ayat' },
  { id: 5, label: '5 minutes', sub: 'About 10 ayat' },
  { id: 10, label: '10 minutes', sub: 'About 20 ayat' },
  { id: 20, label: '20 minutes or more', sub: 'About 40 ayat' },
];
const GOAL_AYAT: Record<number, number> = { 2: 5, 5: 10, 10: 20, 20: 40 };

export function JourneyFlow({ onDone, startAt = 0, onBack }: { onDone: () => void; /** 1 skips the intro (the welcome screen has already said hello) */ startAt?: number; onBack?: () => void }) {
  const pal = usePalette();
  const prefs = usePrefs();
  const insets = useSafeAreaInsets();
  const old = prefs.journey;
  const [step, setStep] = useState(startAt);
  const [a, setA] = useState<Partial<JourneyAnswers>>(old ?? { goals: [] });
  const STEPS = 10; // intro, name, brother/sister, 5 questions, your note, sharing
  const [name, setName] = useState(prefs.firstName ?? '');
  const [gender, setGender] = useState<'brother' | 'sister' | 'skip' | undefined>(prefs.gender);
  const nm = name.trim().split(/\s+/)[0]?.slice(0, 24) ?? '';
  const hi = (t: string) => (nm ? `${t}, ${nm}` : t); // "Where are you on your journey, Saj?" style

  const pick = <K extends keyof JourneyAnswers>(k: K, v: JourneyAnswers[K]) => {
    setA((x) => ({ ...x, [k]: v }));
    setTimeout(() => setStep((s) => s + 1), 180);
  };
  const toggleGoal = (id: string) =>
    setA((x) => {
      const g = x.goals ?? [];
      return { ...x, goals: g.includes(id) ? g.filter((y) => y !== id) : g.length >= 3 ? g : [...g, id] };
    });

  const skip = () => {
    prefs.set({ journeySkipped: true });
    onDone();
  };

  const finish = (share: boolean) => {
    const ans = { journey: a.journey ?? 'returning', arabic: a.arabic ?? 'slow', reading: a.reading ?? 'rarely', goals: a.goals ?? [], minutes: a.minutes ?? 5, at: Date.now() } as JourneyAnswers;
    const hide = new Set(prefs.feedHide ?? []);
    if (ans.arabic === 'fluent' || ans.journey === 'growing') hide.add('letters');
    if (ans.arabic === 'fluent') hide.add('words');
    const fresh = ans.journey === 'new' || ans.journey === 'exploring';
    prefs.set({
      journey: ans,
      shareInsights: share,
      firstName: nm || undefined,
      gender,
      ...(gender === 'brother' || gender === 'sister' ? { prayFigure: gender } : {}),
      showTl: ans.arabic !== 'fluent',
      feedHide: [...hide],
      dailyGoal: GOAL_AYAT[ans.minutes] ?? 10,
      // Someone who practises already knows these words: the "New to this?" cards become small links.
      explained: ans.journey === 'growing' ? EXPLAINERS.map((e) => e.id) : prefs.explained ?? [],
      // New or curious: start on the gentle New to Islam feed rather than asking about feelings first.
      ...(fresh ? { mood: 'newmuslim', onboarded: true, feedMode: 'foryou' } : {}),
    });
    onDone();
  };

  /** A short note written to them from their answers (the first thing on the ready screen). */
  const note = (): string => {
    const lead = nm ? `${nm}, ` : '';
    const mins = a.minutes ?? 5;
    const ayat = GOAL_AYAT[mins] ?? 10;
    const tl = a.arabic && a.arabic !== 'fluent' ? ' with the pronunciation under every word' : '';
    const surahs = a.goals?.includes('surahs') ? ' Al-Fatihah and the short surahs are waiting for you, easiest first, so your prayer feels steady.' : '';
    const calm = a.goals?.includes('calm') || a.goals?.includes('close') ? ' Whenever your heart is heavy, tell Munib how you feel and it will find you ayat for that moment.' : '';
    switch (a.journey) {
      case 'new':
        return `${lead}welcome to your new beginning. The Prophet ﷺ said that Islam wipes away what came before it (Sahih Muslim 121), so you are starting fresh. We’ll go gently: ${ayat} ayat a day${tl}, with short lessons on the basics in between. Nothing here assumes you already know.${surahs}`;
      case 'exploring':
        return `${lead}thank you for coming to see for yourself. Munib shows the Quran one ayah at a time, in plain English${tl}, with short notes on what Muslims believe and why. Take it at your own pace: ${ayat} ayat a day is a lovely start, and no question is a silly one.`;
      case 'growing':
        return `${lead}may Allah increase you. Your goal is ${ayat} ayat a day, and every ayah has Tafsir Ibn Kathir and an Ask button when you want to go deeper.${surahs}${calm}`;
      default:
        return `${lead}coming back is the hardest step, and you’ve just taken it. We’ll start gently: ${ayat} ayat a day${tl}, about ${mins} minute${mins === 1 ? '' : 's'}. Miss a day and nothing breaks; there are no streaks here, just the next ayah whenever you’re ready.${surahs}${calm}`;
    }
  };

  const summary = (): string[] => {
    const out: string[] = [];
    const j = a.journey;
    if (j === 'new' || j === 'exploring') out.push('Your For you feed starts with ayat and short lessons for your first steps.');
    if (j === 'returning') out.push('Next, tell Munib how you feel today, and your feed will start there.');
    if (j === 'growing') out.push('The beginner explanations step back, and the Ask button explains any ayah from Tafsir Ibn Kathir.');
    if (a.arabic && a.arabic !== 'fluent') out.push('Pronunciation is switched on under every ayah, and each word lights up as it’s recited.');
    if (a.arabic === 'none' || a.arabic === 'letters') out.push('Cards teaching the Arabic letters will appear in your feed.');
    if (a.goals?.includes('surahs')) out.push('Surahs for your prayer is waiting on the Quran tab, easiest first.');
    if (a.goals?.includes('pray')) out.push('Set up prayer times and alerts on the Prayer tab.');
    if (a.goals?.includes('understand')) out.push('Tap Tafsir or Ask on any ayah to understand it better.');
    if (a.goals?.includes('basics')) out.push('Words like salah and dua are explained wherever they appear.');
    if (a.minutes) out.push(`Your daily goal is about ${GOAL_AYAT[a.minutes]} ayat. No streaks, no guilt: come back when you can.`);
    return out;
  };

  const q = (title: string, sub: string | null, body: React.ReactNode, next?: { label: string; on: () => void; disabled?: boolean }) => (
    <>
      <ScrollView contentContainerStyle={styles.qBody}>
        <Text style={[styles.h1, { color: pal.text }]}>{title}</Text>
        {!!sub && <Text style={[styles.lead, { color: pal.muted }]}>{sub}</Text>}
        <View style={{ gap: 10, marginTop: 18 }}>{body}</View>
      </ScrollView>
      {next && (
        <View style={styles.foot}>
          <Big pal={pal} label={next.label} onPress={next.on} disabled={next.disabled} />
        </View>
      )}
    </>
  );

  const options = <T extends string | number>(list: Opt<T>[], value: T | undefined, on: (v: T) => void) =>
    list.map((o) => {
      const sel = value === o.id;
      return (
        <Pressable
          key={String(o.id)}
          onPress={() => on(o.id)}
          accessibilityRole="radio"
          accessibilityState={{ selected: sel }}
          style={({ pressed }) => [styles.opt, { backgroundColor: sel ? pal.accent : pal.surface, borderColor: sel ? pal.accent : pal.line, opacity: pressed ? 0.85 : 1 }]}
        >
          <Text style={[styles.optLabel, { color: sel ? pal.onAccent : pal.text }]}>{o.label}</Text>
          {!!o.sub && <Text style={[styles.optSub, { color: sel ? pal.onAccent : pal.muted }]}>{o.sub}</Text>}
        </Pressable>
      );
    });

  let body: React.ReactNode;
  if (step === 0)
    body = (
      <View style={[styles.intro, { paddingBottom: insets.bottom + 20 }]}>
        <View style={{ flex: 1, justifyContent: 'center', gap: 14 }}>
          <Image source={ART.star8} style={{ width: 150, height: 150, marginLeft: -8, marginBottom: 6 }} resizeMode="contain" accessibilityIgnoresInvertColors />
          <Text style={[styles.hero, { color: pal.text }]}>Welcome to Munib</Text>
          <Text style={[styles.lead, { color: pal.muted }]}>Munib means “one who turns back to Allah”. Wherever you’re starting from, you’re welcome here.</Text>
          <Text style={[styles.lead, { color: pal.muted }]}>Five quick questions so Munib fits where you are. It takes about a minute.</Text>
        </View>
        <Big pal={pal} label="Let’s begin" onPress={() => setStep(1)} />
        <Pressable onPress={skip} style={styles.skipBtn} accessibilityRole="button">
          <Text style={[styles.skipText, { color: pal.muted }]}>Skip for now</Text>
        </Pressable>
      </View>
    );
  else if (step === 1)
    body = q(
      'What should we call you?',
      'Your first name is enough. It stays on this phone.',
      <TextInput
        value={name}
        onChangeText={setName}
        placeholder="Your first name"
        placeholderTextColor={pal.muted}
        autoFocus
        autoCapitalize="words"
        autoComplete="given-name"
        textContentType="givenName"
        returnKeyType="next"
        maxLength={40}
        onSubmitEditing={() => setStep(2)}
        style={[styles.input, { color: pal.text, borderColor: pal.line, backgroundColor: pal.surface }]}
        accessibilityLabel="Your first name"
      />,
      { label: nm ? `Next` : 'Skip this', on: () => setStep(2) },
    );
  else if (step === 2)
    body = q(
      hi('Brother or sister') + '?',
      'So the prayer guide and anything just for sisters or brothers fits you.',
      <>
        <View style={{ flexDirection: 'row', gap: 12 }}>
          {(['brother', 'sister'] as const).map((g) => {
            const sel = gender === g;
            return (
              <Pressable
                key={g}
                onPress={() => {
                  setGender(g);
                  setTimeout(() => setStep(3), 180);
                }}
                accessibilityRole="radio"
                accessibilityState={{ selected: sel }}
                style={({ pressed }) => [styles.fig, { backgroundColor: sel ? pal.accent : pal.surface, borderColor: sel ? pal.accent : pal.line, opacity: pressed ? 0.85 : 1 }]}
              >
                <Image source={poseArt(g, 'stand')} style={{ width: '100%', height: 130 }} resizeMode="contain" accessibilityIgnoresInvertColors />
                <Text style={[styles.optLabel, { color: sel ? pal.onAccent : pal.text, textAlign: 'center' }]}>{g === 'brother' ? 'Brother' : 'Sister'}</Text>
              </Pressable>
            );
          })}
        </View>
        <Pressable onPress={() => { setGender('skip'); setStep(3); }} style={styles.skipBtn} accessibilityRole="button">
          <Text style={[styles.skipText, { color: pal.muted }]}>I’d rather not say</Text>
        </Pressable>
      </>,
    );
  else if (step === 3) body = q(hi('Where are you on your journey') + '?', null, options(JOURNEY, a.journey, (v) => pick('journey', v)));
  else if (step === 4) body = q('How easily can you read Arabic?', 'There’s no wrong answer. Munib shows pronunciation and meaning for every ayah.', options(ARABIC, a.arabic, (v) => pick('arabic', v)));
  else if (step === 5) body = q('How often do you read the Quran at the moment?', 'Be honest: this is just for you.', options(READING, a.reading, (v) => pick('reading', v)));
  else if (step === 6)
    body = q(
      nm ? `What would you like help with, ${nm}?` : 'What would you like help with?',
      'Choose up to three.',
      <View style={styles.chips}>
        {GOALS.map((g) => {
          const sel = (a.goals ?? []).includes(g.id);
          return (
            <Pressable
              key={g.id}
              onPress={() => toggleGoal(g.id)}
              accessibilityRole="checkbox"
              accessibilityState={{ checked: sel }}
              style={[styles.chip, { borderColor: sel ? pal.text : pal.line, backgroundColor: sel ? mix(pal.bg, pal.text, 0.12) : 'transparent' }]}
            >
              {sel && <Icon name="check" size={14} color={pal.text} strokeWidth={2.4} />}
              <Text style={[styles.chipText, { color: pal.text }]}>{g.label}</Text>
            </Pressable>
          );
        })}
      </View>,
      { label: 'Next', on: () => setStep(7), disabled: !(a.goals ?? []).length },
    );
  else if (step === 7) body = q('How much time can you give each day?', 'Small and steady is the Sunnah way. You can always read more.', options(TIME, a.minutes, (v) => pick('minutes', v)));
  else if (step === 8)
    body = q(
      nm ? `Your Munib is ready, ${nm}` : 'Your Munib is ready',
      null,
      <>
        <View style={[styles.letter, { backgroundColor: pal.surface, borderColor: mix(pal.surface, pal.accent, 0.35) }]}>
          {(gender === 'brother' || gender === 'sister') && (
            <Image source={poseArt(gender, 'takbir')} style={styles.letterArt} resizeMode="contain" accessibilityIgnoresInvertColors />
          )}
          <Text style={[styles.letterText, { color: pal.text }]}>{note()}</Text>
        </View>
        <Text style={[styles.setUp, { color: pal.muted }]}>WHAT WE’VE SET UP</Text>
        {summary().map((t, i) => (
          <View key={i} style={[styles.sumRow, { backgroundColor: pal.surface }]}>
            <View style={[styles.sumDot, { backgroundColor: [pal.pop.emerald, pal.pop.violet, pal.pop.amber, pal.pop.sky, pal.pop.coral, pal.pop.teal][i % 6] }]}>
              <Icon name="check" size={14} color="#FFFFFF" strokeWidth={2.6} />
            </View>
            <Text style={[styles.sumText, { color: pal.text }]}>{t}</Text>
          </View>
        ))}
        <Text style={[styles.privacy, { color: pal.muted }]}>You can change any of it from the You tab.</Text>
      </>,
      { label: 'Continue', on: () => setStep(9) },
    );
  else {
    // Sharing is asked plainly as its own question, with two equal answers (UK GDPR: consent must be a clear, active choice).
    const who = a.journey === 'new' ? 'people who are new to Islam' : a.journey === 'exploring' ? 'people curious about Islam' : a.journey === 'growing' ? 'people growing in their deen' : 'people coming back to the Quran';
    body = (
      <View style={[styles.intro, { paddingBottom: 8 }]}>
        <ScrollView contentContainerStyle={{ paddingTop: 18, gap: 12 }}>
          <Image source={ART.globe} style={{ width: 120, height: 120, marginLeft: -6 }} resizeMode="contain" accessibilityIgnoresInvertColors />
          <Text style={[styles.h1, { color: pal.text }]}>{nm ? `${nm}, will you help Munib help more ${who}?` : `Will you help Munib help more ${who}?`}</Text>
          <Text style={[styles.lead, { color: pal.muted }]}>Your answers (never your name) can be added, anonymously, to totals from large groups of readers. It tells us what people like you need, so we build the right things next.</Text>
          <Text style={[styles.lead, { color: pal.muted }]}>Nothing is linked to you or this phone, groups smaller than 20 are never shown, and you can change your mind any time in You → Your data.</Text>
        </ScrollView>
        <View style={{ gap: 10, paddingTop: 10 }}>
          <Big pal={pal} label="Yes, share anonymously" onPress={() => finish(true)} />
          <Pressable onPress={() => finish(false)} style={({ pressed }) => [styles.big, { borderWidth: 1.5, borderColor: pal.line, opacity: pressed ? 0.85 : 1 }]} accessibilityRole="button">
            <Text style={[styles.bigText, { color: pal.text }]}>No thanks</Text>
          </Pressable>
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.root, { backgroundColor: pal.bg, paddingTop: insets.top + 10 }]}>
      {step > 0 && (
        <View style={styles.top}>
          <Pressable onPress={() => (step <= startAt && onBack ? onBack() : setStep((s) => s - 1))} hitSlop={10} accessibilityRole="button" accessibilityLabel="Back" style={styles.back}>
            <View style={{ transform: [{ rotate: '180deg' }] }}>
              <Icon name="chevron" size={20} color={pal.text} />
            </View>
          </Pressable>
          <View style={styles.bars}>
            {Array.from({ length: STEPS - 1 }, (_, i) => (
              <View key={i} style={[styles.bar, { backgroundColor: i < step ? pal.text : mix(pal.bg, pal.text, 0.18) }]} />
            ))}
          </View>
          <Pressable onPress={skip} hitSlop={10} accessibilityRole="button">
            <Text style={[styles.skipTop, { color: pal.muted }]}>Skip</Text>
          </Pressable>
        </View>
      )}
      <View style={{ flex: 1, paddingBottom: step > 0 ? insets.bottom + 12 : 0 }}>{body}</View>
    </View>
  );
}

function Big({ pal, label, onPress, disabled }: { pal: ReturnType<typeof usePalette>; label: string; onPress: () => void; disabled?: boolean }) {
  const bg = pal.bold ? pal.text : pal.accent;
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      accessibilityRole="button"
      style={({ pressed }) => [styles.big, { backgroundColor: bg, opacity: disabled ? 0.4 : pressed ? 0.85 : 1 }]}
    >
      <Text style={[styles.bigText, { color: pal.bold ? pal.bg : pal.onAccent }]}>{label}</Text>
      <Icon name="chevron" size={16} color={pal.bold ? pal.bg : pal.onAccent} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  top: { flexDirection: 'row', alignItems: 'center', gap: 14, paddingHorizontal: 20, paddingBottom: 8 },
  back: { width: 32, height: 32, alignItems: 'center', justifyContent: 'center' },
  bars: { flex: 1, flexDirection: 'row', gap: 6 },
  bar: { flex: 1, height: 4, borderRadius: 2 },
  skipTop: { fontFamily: fonts.uiSemi, fontSize: 14 },
  intro: { flex: 1, paddingHorizontal: 24 },
  badge: { width: 96, height: 96, borderRadius: 26, alignItems: 'center', justifyContent: 'center', marginBottom: 10 },
  badgeAr: { fontFamily: fonts.arabic, fontSize: 30, lineHeight: 52, color: '#FFFFFF' },
  hero: { fontFamily: fonts.uiBold, fontSize: 38, letterSpacing: -1, lineHeight: 42 },
  h1: { fontFamily: fonts.uiBold, fontSize: 30, letterSpacing: -0.8, lineHeight: 35 },
  lead: { fontFamily: fonts.read, fontSize: 16, lineHeight: 24, marginTop: 6 },
  qBody: { paddingHorizontal: 22, paddingTop: 18, paddingBottom: 20 },
  opt: { borderRadius: 18, borderWidth: 1.5, paddingHorizontal: 18, paddingVertical: 16, gap: 3 },
  optLabel: { fontFamily: fonts.uiSemi, fontSize: 17, lineHeight: 22 },
  optSub: { fontFamily: fonts.ui, fontSize: 14, lineHeight: 19 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  chip: { flexDirection: 'row', alignItems: 'center', gap: 6, borderWidth: 1.5, borderRadius: 14, paddingHorizontal: 14, paddingVertical: 11 },
  chipText: { fontFamily: fonts.uiSemi, fontSize: 15 },
  foot: { paddingHorizontal: 22, paddingTop: 8 },
  big: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, borderRadius: 999, paddingVertical: 17 },
  bigText: { fontFamily: fonts.uiBold, fontSize: 17 },
  skipBtn: { alignSelf: 'center', paddingVertical: 14 },
  skipText: { fontFamily: fonts.uiSemi, fontSize: 15 },
  sumRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 12, borderRadius: 16, padding: 14 },
  sumDot: { width: 26, height: 26, borderRadius: 13, alignItems: 'center', justifyContent: 'center', marginTop: 1 },
  sumText: { flex: 1, fontFamily: fonts.ui, fontSize: 15.5, lineHeight: 21 },
  input: { borderWidth: 1.5, borderRadius: 16, paddingHorizontal: 18, paddingVertical: 16, fontFamily: fonts.uiSemi, fontSize: 19 },
  fig: { flex: 1, borderRadius: 20, borderWidth: 1.5, padding: 12, gap: 8 },
  letter: { borderRadius: 20, borderWidth: 1.5, padding: 18, gap: 10 },
  letterArt: { width: 90, height: 90, alignSelf: 'flex-start' },
  letterText: { fontFamily: fonts.read, fontSize: 17, lineHeight: 26 },
  setUp: { fontFamily: fonts.uiBold, fontSize: 11.5, letterSpacing: 1.2, marginTop: 10, paddingHorizontal: 4 },
  privacy: { fontFamily: fonts.ui, fontSize: 13, lineHeight: 18, marginTop: 8, paddingHorizontal: 4 },
});
