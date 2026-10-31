import { useAudioPlayer } from 'expo-audio';
import * as Haptics from 'expo-haptics';
import * as Notifications from 'expo-notifications';
import { useRouter } from 'expo-router';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { AccessibilityInfo, AppState, FlatList, Linking, Modal, Platform, Pressable, Share, StyleSheet, Text, View } from 'react-native';
import Animated, { SharedValue, useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Icon } from '@/components/Icon';
import { ReflectionsSheet } from '@/components/Reflections';
import { Sheet } from '@/components/Sheet';
import { useToast } from '@/components/Toast';
import { VerseCard } from '@/components/VerseCard';
import { ayahAudio, prefetchAudio, wordAt } from '@/lib/audio';
import { ayahKeys, feedRound, interleave, ladderCards, LEVELS, MOODS, MoodId, SUPPORT, SURAHS, translationFor, Verse } from '@/lib/quran';
import { useAccount } from '@/lib/account';
import { dayKey, useProgress } from '@/lib/progress';
import { askPermission, REMINDER_TIMES, ReminderData, scheduleReminders } from '@/lib/reminders';
import { usePrefs } from '@/lib/store';
import { fonts, mix, Palette, usePalette } from '@/lib/theme';

type VerseItem = { kind: 'verse'; key: string; v: Verse; i: number };
type OffItem = { kind: 'off'; key: string; i: number; s: number };
/** "Continue the Quran": every so often, a card that picks up the full Quran where the reader last stopped. */
type ContItem = { kind: 'cont'; key: string; i: number };
type Item = VerseItem | OffItem | ContItem;
const CONT_EVERY = 12;

/** How long someone scrolls before the "time check" card appears. */
const OFFRAMP_AFTER_MS = 20 * 60 * 1000;
/** How long a card must stay on screen to count as read. */
const DWELL_MS = 3500;

const withTimeout = <T,>(p: Promise<T>, ms: number, fallback: T) => Promise.race([p, new Promise<T>((r) => setTimeout(() => r(fallback), ms))]);

/**
 * The feed: rounds of curated ayat, forever, with the attention ladder's longer cards mixed in.
 * Never shows the same card twice in a row, and keeps recent cards from coming straight back.
 */
function useEndlessFeed(mood: MoodId | null) {
  const prefs = usePrefs();
  const { level, progress: readSoFar } = useProgress();
  const [items, setItems] = useState<Item[]>([]);
  const round = useRef(0);
  const gen = useRef(0);
  const busy = useRef(false);
  const live = useRef({ level, lang: prefs.lang, liked: Object.keys(prefs.likes), fresh: readSoFar.readings === 0 });
  live.current = { level, lang: prefs.lang, liked: Object.keys(prefs.likes), fresh: readSoFar.readings === 0 };

  const compose = (base: Item[], list: Verse[], r: number): Item[] => {
    const recent = new Set(base.slice(-14).flatMap((x) => (x.kind === 'verse' ? [x.v.k] : [])));
    let l = [...list.filter((v) => !recent.has(v.k)), ...list.filter((v) => recent.has(v.k))];
    const last = base[base.length - 1];
    if (last?.kind === 'verse' && l[0]?.k === last.v.k) l.push(l.shift()!);
    const out: Item[] = [...base];
    let verses = base.filter((x) => x.kind === 'verse').length;
    for (const v of l) {
      out.push({ kind: 'verse', key: `${r}-${v.k}`, v, i: out.length });
      if (++verses % CONT_EVERY === 0) out.push({ kind: 'cont', key: `cont-${r}-${verses}`, i: out.length });
    }
    return out;
  };

  const nextRound = async () => {
    const r = round.current++;
    const { level: lv, lang, liked, fresh } = live.current;
    const curated = feedRound(r, mood, liked, fresh);
    const extras = lv > 1 ? await withTimeout(ladderCards(lv, r, mood, lang).catch(() => []), 6000, [] as Verse[]) : [];
    return { r, list: interleave(curated, extras, lv) };
  };

  /** Replaces everything after `keep` with a fresh round (used after a level-up, or once ladder cards have loaded). */
  const refreshAhead = useCallback(
    async (keep: number) => {
      const g = gen.current;
      const { r, list } = await nextRound();
      if (g !== gen.current) return;
      setItems((prev) => compose(prev.slice(0, keep + 1), list, r));
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [mood],
  );

  const reset = useCallback(() => {
    const g = ++gen.current;
    round.current = 0;
    // Show curated ayat straight away; ladder cards join once their surahs have loaded.
    const r = round.current++;
    setItems(compose([], feedRound(r, mood, live.current.liked, live.current.fresh), r));
    if (live.current.level > 1) {
      setTimeout(() => {
        if (g === gen.current) refreshAhead(1);
      }, 0);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mood, refreshAhead]);

  const more = useCallback(async () => {
    if (busy.current) return;
    busy.current = true;
    const g = gen.current;
    try {
      const { r, list } = await nextRound();
      if (g === gen.current) setItems((prev) => compose(prev, list, r));
    } finally {
      busy.current = false;
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mood]);

  return { items, setItems, reset, more, refreshAhead };
}

export default function Feed() {
  const pal = usePalette();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const prefs = usePrefs();
  const prog = useProgress();
  const toast = useToast();
  const [height, setHeight] = useState(0);
  const [active, setActive] = useState(0);
  const [sheet, setSheet] = useState<null | 'mood' | 'context' | 'remind' | 'support'>(prefs.onboarded ? null : 'mood');
  const [remindAt, setRemindAt] = useState(2);
  const [contextVerse, setContextVerse] = useState<Verse | null>(null);
  const [resting, setResting] = useState(false);
  const [repeat, setRepeat] = useState<Record<string, number>>({});
  const listRef = useRef<FlatList<Item>>(null);

  /* ---------- controls fade away while reading ---------- */
  // A few seconds after a card settles, the top bar and buttons fade so the ayah has the whole screen.
  // Any tap brings them back. Never hidden for VoiceOver users.
  const chrome = useSharedValue(1);
  const [chromeOn, setChromeOn] = useState(true);
  const chromeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const screenReader = useRef(false);
  useEffect(() => {
    AccessibilityInfo.isScreenReaderEnabled().then((on) => (screenReader.current = on), () => {});
    const sub = AccessibilityInfo.addEventListener('screenReaderChanged', (on) => (screenReader.current = on));
    return () => sub.remove();
  }, []);
  const showChrome = useCallback(
    (holdMs = 5000) => {
      chrome.value = withTiming(1, { duration: 220 });
      setChromeOn(true);
      if (chromeTimer.current) clearTimeout(chromeTimer.current);
      chromeTimer.current = setTimeout(() => {
        if (screenReader.current) return;
        chrome.value = withTiming(0, { duration: 900 });
        setChromeOn(false);
      }, holdMs);
    },
    [chrome],
  );
  useEffect(() => () => void (chromeTimer.current && clearTimeout(chromeTimer.current)), []);
  const acct = useAccount();
  const [reflectFor, setReflectFor] = useState<Verse | null>(null);

  const { items, setItems, reset, more, refreshAhead } = useEndlessFeed(prefs.mood);

  // New mood → rebuild from the top, then jump back to the first card once the new cards are in.
  const pendingTop = useRef(false);
  useEffect(() => {
    pendingTop.current = true;
    reset();
  }, [reset]);
  useEffect(() => {
    if (!pendingTop.current || !items.length) return;
    pendingTop.current = false;
    const raf = requestAnimationFrame(() => {
      listRef.current?.scrollToOffset({ offset: 0, animated: false });
      setActive(0);
    });
    return () => cancelAnimationFrame(raf);
  }, [items]);

  /* ---------- recitation (with Memorise repeat) ---------- */
  const player = useAudioPlayer(null, { updateInterval: 100 });
  const queue = useRef<{ card: string; s: number; ayat: number[]; idx: number; pass: number; passes: number } | null>(null);
  const [playing, setPlaying] = useState<{ card: string; ayah: number; pass: number; passes: number } | null>(null);
  // Word-by-word: timings for the ayah being recited, and the word being said right now.
  const timings = useRef<[number, number, number][]>([]);
  const [word, setWord] = useState<{ pos: number; of: number } | null>(null);
  const [finished, setFinished] = useState(0);
  const [paused, setPausedState] = useState(false);
  const pausedRef = useRef(false);
  // Once someone pauses, the next cards stay quiet too until they choose to play again (this session).
  const [held, setHeldState] = useState(false);
  const heldRef = useRef(false);
  const setHeld = useCallback((v: boolean) => {
    heldRef.current = v;
    setHeldState(v);
  }, []);
  const setPaused = useCallback((v: boolean) => {
    pausedRef.current = v;
    setPausedState(v);
  }, []);

  useEffect(() => {
    const sub = player.addListener('playbackStatusUpdate', (st) => {
      if (st.didJustFinish) setFinished((n) => n + 1);
      const t = timings.current;
      if (!t.length) return;
      const pos = wordAt(t, st.currentTime * 1000);
      // Only re-render when the word actually changes.
      setWord((w) => (pos === null ? null : w?.pos === pos ? w : { pos, of: t[t.length - 1][0] }));
    });
    return () => sub.remove();
  }, [player]);

  const stop = useCallback(() => {
    player.pause();
    queue.current = null;
    timings.current = [];
    setWord(null);
    setPaused(false);
    setPlaying(null);
  }, [player]);

  const playIdx = useCallback(() => {
    const q = queue.current;
    if (!q) return;
    const n = q.ayat[q.idx];
    const at = { q, idx: q.idx, pass: q.pass };
    timings.current = [];
    setWord(null);
    setPlaying({ card: q.card, ayah: n, pass: q.pass, passes: q.passes });
    ayahAudio(prefs.reciter, q.s, n).then((a) => {
      // The reader may have moved on while the audio was being looked up.
      if (queue.current !== at.q || at.q.idx !== at.idx || at.q.pass !== at.pass) return;
      timings.current = a.words;
      player.replace(a.url);
      if (!pausedRef.current) player.play();
    });
  }, [player, prefs.reciter]);

  const startCard = useCallback(
    (item: Item | undefined, passes = 1) => {
      if (!item || item.kind !== 'verse') {
        stop();
        return;
      }
      queue.current = { card: item.key, s: item.v.s, ayat: item.v.ar.map(([, n]) => n), idx: 0, pass: 1, passes };
      setPaused(false);
      playIdx();
    },
    [playIdx, stop],
  );

  /** Tap the card or the Listen button: pause, carry on from the same word, or start again if it had finished. */
  const togglePlay = useCallback(
    (item: Item, passes: number) => {
      if (queue.current?.card === item.key) {
        if (paused) {
          player.play();
          setPaused(false);
          setHeld(false);
        } else {
          player.pause();
          setPaused(true);
          setHeld(true);
        }
      } else {
        setHeld(false);
        startCard(item, passes);
      }
    },
    [paused, player, startCard, setPaused, setHeld],
  );

  useEffect(() => {
    if (!finished || !queue.current) return;
    const q = queue.current;
    if (q.idx < q.ayat.length - 1) q.idx += 1;
    else if (q.pass < q.passes) {
      q.pass += 1;
      q.idx = 0;
    } else return stop();
    playIdx();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [finished]);

  // Look up the audio for this card and the next two ahead of time, so recitation starts without a wait.
  useEffect(() => {
    for (const it of items.slice(active, active + 3)) if (it.kind === 'verse') prefetchAudio(prefs.reciter, it.v.s);
  }, [items, active, prefs.reciter]);

  // Each time a new card settles, recite it (if sound is on). Keyed on the card itself, so it also starts
  // when the feed first loads on opening the app, and after a mood change swaps the cards.
  const activeKey = items[active]?.key;
  useEffect(() => {
    if (!items.length || sheet === 'mood' || resting) return;
    const it = items[active];
    if (prefs.sound && !heldRef.current) startCard(it, it?.kind === 'verse' ? (repeat[it.key] ?? 1) : 1);
    else stop();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeKey, prefs.sound, prefs.reciter, sheet === 'mood', resting]);

  // Each new card: controls visible while it arrives, then fade (after the translation and buttons have appeared).
  useEffect(() => {
    if (sheet) {
      chrome.value = withTiming(1, { duration: 200 });
      setChromeOn(true);
      if (chromeTimer.current) clearTimeout(chromeTimer.current);
    } else showChrome(6500);
  }, [active, sheet, showChrome, chrome]);

  const onViewable = useRef(({ viewableItems }: { viewableItems: { index?: number | null }[] }) => {
    const first = viewableItems[0];
    if (first?.index != null) setActive(first.index);
  }).current;

  /* ---------- reading progress, ladder level-ups, time check ---------- */
  const counted = useRef(new Set<string>());
  const sessionStart = useRef(Date.now());
  const lastOff = useRef(0);

  const announce = useCallback(
    (ev: { surahsCompleted: number[]; levelUp: number | null }) => {
      if (ev.levelUp) {
        toast(`Unlocked: ${LEVELS[ev.levelUp - 1].name.toLowerCase()} are now in your feed`);
        refreshAhead(active + 1);
      } else if (ev.surahsCompleted.length) toast(`MashaAllah, you've read all of ${SURAHS[ev.surahsCompleted[0] - 1][0]}`);
    },
    [toast, refreshAhead, active],
  );

  useEffect(() => {
    const it = items[active];
    if (!it || it.kind !== 'verse' || sheet === 'mood' || resting) return;
    const t = setTimeout(() => {
      if (counted.current.has(it.key)) return;
      counted.current.add(it.key);
      announce(prog.markRead(ayahKeys(it.v), 1));
    }, DWELL_MS);

    const now = Date.now();
    if (now - sessionStart.current > OFFRAMP_AFTER_MS && now - lastOff.current > OFFRAMP_AFTER_MS && prog.sessionAyat >= 10 && items[active + 1]?.kind !== 'off') {
      lastOff.current = now;
      const off: OffItem = { kind: 'off', key: `off-${now}`, i: it.i, s: it.v.s };
      setItems((prev) => [...prev.slice(0, active + 1), off, ...prev.slice(active + 1)]);
    }
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active, items.length, sheet === 'mood', resting]);

  // Like and reflection counts for the cards around the one on screen.
  useEffect(() => {
    if (!acct.online) return;
    const keys = items.slice(Math.max(0, active - 1), active + 4).flatMap((x) => (x.kind === 'verse' ? [x.v.k] : []));
    acct.loadStats(keys);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active, items.length, acct.online]);

  /* ---------- actions ---------- */
  const like = (k: string, viaDoubleTap = false) => {
    if (viaDoubleTap && prefs.likes[k]) return;
    const on = prefs.toggleLike(k);
    if (on) Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
  };
  const share = (v: Verse) => {
    const tr = translationFor(v, prefs.lang) ?? [];
    Share.share({ message: `${v.ar.map(([t]) => t).join(' ')}\n\n${tr.join(' ')}\n— Quran ${v.k}\n\nShared from Munib` }).catch(() => {});
  };
  const openSurah = (s: number, from = 1, to = 0) => {
    stop();
    router.push({ pathname: '/surah/[id]', params: { id: String(s), from: String(from), to: String(to || from) } });
  };

  /* ---------- daily check-in ---------- */
  // Re-plan the next week of reminders whenever the app opens or the settings change.
  const progRef = useRef(prog.progress);
  progRef.current = prog.progress;
  useEffect(() => {
    const plan = () => scheduleReminders({ ...prefs.reminders, lang: prefs.lang, progress: progRef.current }).catch(() => {});
    plan();
    const sub = AppState.addEventListener('change', (st) => st === 'active' && plan());
    return () => sub.remove();
  }, [prefs.reminders, prefs.lang]);

  // Offer reminders once, after someone has read a few cards and is having a good moment.
  useEffect(() => {
    if (!prefs.remindersOffered && !prefs.reminders.on && prog.progress.readings >= 5 && sheet === null && !resting) setSheet('remind');
  }, [prog.progress.readings, prefs.remindersOffered, prefs.reminders.on, sheet, resting]);

  const acceptReminders = async () => {
    const t = REMINDER_TIMES[remindAt];
    const ok = await askPermission();
    prefs.set({ remindersOffered: true, reminders: { ...prefs.reminders, on: ok, hour: t.hour, minute: t.minute } });
    setSheet(null);
    toast(ok ? `Daily reminder set for ${t.sub}` : 'Notifications are off for Munib. You can allow them in iPhone Settings.');
  };

  // Tapping a reminder opens the mood check-in, or the surah it mentioned.
  // Platform never changes while the app runs, so this conditional hook is safe. Notifications don't exist on web.
  // eslint-disable-next-line react-hooks/rules-of-hooks
  const lastResponse = Platform.OS === 'web' ? null : Notifications.useLastNotificationResponse();
  const handled = useRef<string | null>(null);
  useEffect(() => {
    if (!lastResponse || lastResponse.actionIdentifier !== Notifications.DEFAULT_ACTION_IDENTIFIER) return;
    const id = lastResponse.notification.request.identifier;
    if (handled.current === id) return;
    handled.current = id;
    const data = lastResponse.notification.request.content.data as unknown as ReminderData | undefined;
    if (data?.to === 'surah') openSurah(data.s, data.a ?? 1);
    else setSheet('mood');
    Notifications.clearLastNotificationResponseAsync().catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lastResponse]);
  const setRepeatFor = (item: VerseItem, n: number) => {
    setRepeat((r) => ({ ...r, [item.key]: n }));
    if (n > 1) startCard(item, n);
  };

  const moodLabel = MOODS.find((m) => m.id === prefs.mood)?.label ?? 'For you';
  const today = prog.progress.days[dayKey()] ?? 0;

  return (
    <View style={[styles.root, { backgroundColor: pal.bg }]} onLayout={(e) => setHeight(e.nativeEvent.layout.height)}>
      {height > 0 && (
        <FlatList
          ref={listRef}
          data={items}
          keyExtractor={(x) => x.key}
          renderItem={({ item, index }) => {
            const tone = pal.tones[item.i % pal.tones.length];
            if (item.kind === 'cont') {
              const next = nextPlace(prefs.place);
              return (
                <ContinueCard
                  pal={pal}
                  tone={tone}
                  height={height}
                  next={next}
                  started={!!prefs.place}
                  read={Object.keys(prog.progress.ayat).length}
                  onRead={() => openSurah(next.s, next.a)}
                />
              );
            }
            if (item.kind === 'off') {
              return (
                <OffRamp
                  pal={pal}
                  tone={tone}
                  height={height}
                  ayat={prog.sessionAyat}
                  minutes={Math.max(1, Math.round((Date.now() - sessionStart.current) / 60000))}
                  surahName={SURAHS[item.s - 1][0]}
                  onRead={() => openSurah(item.s)}
                  onRest={() => {
                    stop();
                    setResting(true);
                  }}
                />
              );
            }
            const isPlaying = playing?.card === item.key;
            const reps = repeat[item.key] ?? 1;
            return (
              <VerseCard
                verse={item.v}
                tone={tone}
                pal={pal}
                height={height}
                topInset={insets.top}
                bottomInset={insets.bottom}
                active={index === active && sheet !== 'mood'}
                lang={prefs.lang}
                showTl={prefs.showTl}
                mood={prefs.mood}
                liked={!!prefs.likes[item.v.k]}
                saved={!!prefs.saves[item.v.k]}
                playing={isPlaying}
                playingAyah={isPlaying ? playing!.ayah : null}
                playingWord={isPlaying ? word : null}
                first={item.i === 0}
                onLike={() => like(item.v.k)}
                onDoubleTap={() => like(item.v.k, true)}
                onSave={() => prefs.toggleSave(item.v.k)}
                paused={isPlaying ? paused : index === active && held}
                onListen={() => togglePlay(item, reps)}
                onSingleTap={() => togglePlay(item, reps)}
                onShare={() => share(item.v)}
                onKeepReading={() => openSurah(item.v.s, item.v.a, item.v.b)}
                onContext={() => {
                  setContextVerse(item.v);
                  setSheet('context');
                }}
                repeat={reps}
                repeatLabel={isPlaying && playing!.passes > 1 ? `${playing!.pass} of ${playing!.passes}` : null}
                onRepeat={(n) => setRepeatFor(item, n)}
                likeCount={acct.stats[item.v.k]?.likes ?? null}
                reflectionCount={acct.stats[item.v.k]?.reflections ?? null}
                onReflections={acct.online ? () => setReflectFor(item.v) : null}
                onSupport={() => setSheet('support')}
                chrome={chrome}
                chromeOn={chromeOn}
                onTap={() => showChrome()}
                onMemorised={() => {
                  prog.markMemorised(ayahKeys(item.v));
                  toast(`${item.v.k} marked as memorised`);
                }}
              />
            );
          }}
          pagingEnabled
          decelerationRate="fast"
          showsVerticalScrollIndicator={false}
          getItemLayout={(_, index) => ({ length: height, offset: height * index, index })}
          onViewableItemsChanged={onViewable}
          viewabilityConfig={{ itemVisiblePercentThreshold: 60 }}
          onEndReached={() => more()}
          onEndReachedThreshold={3}
          windowSize={5}
          initialNumToRender={2}
          maxToRenderPerBatch={3}
          removeClippedSubviews
        />
      )}

      <TopBar
        chrome={chrome}
        chromeOn={chromeOn}
        pal={pal}
        top={insets.top}
        moodLabel={moodLabel}
        showTl={prefs.showTl}
        sound={prefs.sound}
        onMood={() => setSheet('mood')}
        onTl={() => prefs.set({ showTl: !prefs.showTl })}
        onRead={() => {
          stop();
          router.push('/read');
        }}
        onSound={() => {
          // Turning sound on is a clear "play": release any pause.
          if (!prefs.sound) setHeld(false);
          prefs.set({ sound: !prefs.sound });
        }}
        onYou={() => {
          stop();
          router.push('/you');
        }}
      />

      <Sheet visible={sheet === 'mood'} onClose={() => { prefs.set({ onboarded: true }); setSheet(null); }} title="What's on your heart today?" pal={pal}>
        <Text style={[styles.lead, { color: pal.muted }]}>Pick one and your feed starts with ayat that speak to it. You can change it any time.</Text>
        {(['feeling', 'life'] as const).map((group) => (
          <View key={group} style={{ gap: 8, marginTop: group === 'life' ? 10 : 0 }}>
            {group === 'life' && <Text style={[styles.h3, { color: pal.muted }]}>SOMETHING HAPPENING IN MY LIFE</Text>}
            <View style={styles.grid}>
              {MOODS.filter((m) => m.group === group).map((m) => {
                const on = prefs.mood === m.id;
                return (
                  <Pressable key={m.id} onPress={() => { prefs.set({ mood: m.id, onboarded: true }); setSheet(null); }} style={[styles.opt, { borderColor: on ? pal.accent : pal.line, borderWidth: on ? 2 : 1 }]} accessibilityRole="button" accessibilityState={{ selected: on }}>
                    <Text style={[styles.optTitle, { color: pal.text }]}>{m.label}</Text>
                    <Text style={[styles.optSub, { color: pal.muted }]}>{m.sub}</Text>
                  </Pressable>
                );
              })}
            </View>
          </View>
        ))}
        <Text style={[styles.optSub, { color: pal.muted, marginTop: 6 }]}>What you pick stays on your phone and is never shown to anyone.</Text>
        <Pressable onPress={() => { prefs.set({ mood: null, onboarded: true }); setSheet(null); }} style={styles.skip} accessibilityRole="button">
          <Text style={[styles.skipText, { color: pal.muted }]}>Just let me scroll</Text>
        </Pressable>
      </Sheet>

      <Sheet visible={sheet === 'support'} onClose={() => setSheet(null)} title="Someone to talk to" pal={pal}>
        <Text style={[styles.lead, { color: pal.muted }]}>
          The Quran is a comfort, and so are people. If things feel too heavy, or you're not safe, these UK services are free and confidential.
        </Text>
        {SUPPORT.map((x) => (
          <Pressable key={x.phone} onPress={() => Linking.openURL(`tel:${x.phone.replace(/\s/g, '')}`).catch(() => {})} style={[styles.opt, { borderColor: pal.line, borderWidth: 1, flexBasis: 'auto' }]} accessibilityRole="button" accessibilityLabel={`Call ${x.name}, ${x.phone}`}>
            <Text style={[styles.optTitle, { color: pal.text }]}>{x.name}</Text>
            <Text style={[styles.optSub, { color: pal.muted }]}>{x.detail}</Text>
            <Text style={[styles.optTitle, { color: pal.accent, fontVariant: ['tabular-nums'] }]}>{x.phone}</Text>
          </Pressable>
        ))}
        <Text style={[styles.optSub, { color: pal.muted }]}>In an emergency, call 999.</Text>
      </Sheet>

      <Sheet visible={sheet === 'remind'} onClose={() => { prefs.set({ remindersOffered: true }); setSheet(null); }} title="A gentle daily reminder?" pal={pal}>
        <Text style={[styles.lead, { color: pal.muted }]}>
          Once a day, a short check-in: how your heart is, or an ayah to carry with you. Never more than one a day, and you can change or stop it any time.
        </Text>
        <View style={styles.grid}>
          {REMINDER_TIMES.map((t, i) => {
            const on = remindAt === i;
            return (
              <Pressable key={t.label} onPress={() => setRemindAt(i)} style={[styles.opt, { borderColor: on ? pal.accent : pal.line, borderWidth: on ? 2 : 1 }]} accessibilityRole="button" accessibilityState={{ selected: on }}>
                <Text style={[styles.optTitle, { color: pal.text }]}>{t.label}</Text>
                <Text style={[styles.optSub, { color: pal.muted }]}>{t.sub}</Text>
              </Pressable>
            );
          })}
        </View>
        <Pressable onPress={acceptReminders} style={[styles.primary, { backgroundColor: pal.text, marginTop: 8 }]} accessibilityRole="button">
          <Text style={[styles.primaryText, { color: pal.bg }]}>Yes, remind me</Text>
        </Pressable>
        <Pressable onPress={() => { prefs.set({ remindersOffered: true }); setSheet(null); }} style={styles.skip} accessibilityRole="button">
          <Text style={[styles.skipText, { color: pal.muted }]}>Not now</Text>
        </Pressable>
      </Sheet>

      <Sheet visible={sheet === 'context'} onClose={() => setSheet(null)} title={contextVerse ? `${contextVerse.name} ${contextVerse.k}` : 'Context'} pal={pal}>
        <Text style={[styles.note, { color: pal.text }]}>{contextVerse?.note}</Text>
        <Text style={[styles.optSub, { color: pal.muted }]}>Summary drawn from classical tafsir. The launch version will show a licensed tafsir with full citations.</Text>
      </Sheet>

      <ReflectionsSheet verseKey={reflectFor?.k ?? null} title={reflectFor ? `${reflectFor.name} ${reflectFor.k.replace('-', '–')}` : ''} pal={pal} onClose={() => setReflectFor(null)} />

      <Modal visible={resting} animationType="fade" onRequestClose={() => setResting(false)}>
        <View style={[styles.rest, { backgroundColor: pal.bg, paddingTop: insets.top + 24, paddingBottom: insets.bottom + 24 }]}>
          <Text style={[styles.restAr, { color: pal.accent }]}>أَلَا بِذِكۡرِ ٱللَّهِ تَطۡمَئِنُّ ٱلۡقُلُوبُ</Text>
          <Text style={[styles.restQuote, { color: pal.muted }]}>“Unquestionably, by the remembrance of Allah hearts are assured.” 13:28</Text>
          <Text style={[styles.restTitle, { color: pal.text }]}>Take a moment.</Text>
          <Text style={[styles.restBody, { color: pal.muted }]}>
            You read {today} ayat today. Put the phone down with a clear heart, and come back when you're ready.
          </Text>
          <Pressable onPress={() => setResting(false)} style={[styles.primary, { backgroundColor: pal.text }]} accessibilityRole="button">
            <Text style={[styles.primaryText, { color: pal.bg }]}>Back to the feed</Text>
          </Pressable>
        </View>
      </Modal>
    </View>
  );
}

/** The time-check card: shown once after 20 minutes of scrolling. Swipe past it to keep going. */
/** Where "Continue the Quran" picks up: the ayah after the last one read, or the very beginning. */
function nextPlace(place: { s: number; a: number } | null) {
  if (!place) return { s: 1, a: 1 };
  if (place.a < SURAHS[place.s - 1][3]) return { s: place.s, a: place.a + 1 };
  return { s: place.s === 114 ? 1 : place.s + 1, a: 1 };
}

function ContinueCard(p: { pal: Palette; tone: { bg: string; accent: string }; height: number; next: { s: number; a: number }; started: boolean; read: number; onRead: () => void }) {
  const { pal, tone, next } = p;
  const [name, arName, meaning, count] = SURAHS[next.s - 1];
  const pct = Math.min(1, p.read / 6236);
  return (
    <View style={[styles.off, { height: p.height, backgroundColor: tone.bg }]}>
      <Text style={[styles.offEyebrow, { color: tone.accent }]}>CONTINUE THE QURAN</Text>
      <Text style={[styles.offTitle, { color: pal.text }]}>
        {p.started ? (next.a === 1 ? `Next: ${name}` : `${name}, from ayah ${next.a}`) : 'Begin with Al-Fatihah'}
      </Text>
      <Text style={[styles.contAr, { color: pal.text }]}>{arName}</Text>
      <Text style={[styles.offBody, { color: mix(tone.bg, pal.text, 0.75) }]}>
        {p.started
          ? `${meaning} · ${count} ayat. Pick up where you left off, a little at a time.`
          : 'Read the whole Quran from the start, a little at a time. Munib keeps your place.'}
      </Text>
      <View style={{ gap: 6 }}>
        <View style={[styles.contBar, { backgroundColor: mix(tone.bg, pal.text, 0.12) }]}>
          <View style={{ width: `${Math.max(1.5, pct * 100)}%`, height: '100%', borderRadius: 3, backgroundColor: tone.accent }} />
        </View>
        <Text style={[styles.optSub, { color: mix(tone.bg, pal.text, 0.6) }]}>
          {p.read.toLocaleString()} of 6,236 ayat read
        </Text>
      </View>
      <Pressable onPress={p.onRead} style={[styles.primary, { backgroundColor: pal.text }]} accessibilityRole="button">
        <Text style={[styles.primaryText, { color: tone.bg }]}>{p.started ? 'Continue reading' : 'Start reading'}</Text>
      </Pressable>
      <Text style={[styles.optSub, { color: mix(tone.bg, pal.text, 0.6) }]}>Or swipe up to keep going.</Text>
    </View>
  );
}

function OffRamp(p: { pal: Palette; tone: { bg: string; accent: string }; height: number; ayat: number; minutes: number; surahName: string; onRead: () => void; onRest: () => void }) {
  const { pal, tone } = p;
  return (
    <View style={[styles.off, { height: p.height, backgroundColor: tone.bg }]}>
      <Text style={[styles.offEyebrow, { color: tone.accent }]}>TIME CHECK</Text>
      <Text style={[styles.offTitle, { color: pal.text }]}>
        You've read {p.ayat} ayat in {p.minutes} minute{p.minutes === 1 ? '' : 's'}.
      </Text>
      <Text style={[styles.offBody, { color: mix(tone.bg, pal.text, 0.75) }]}>That's real focus. Go deeper with the whole surah, or rest your eyes for a bit.</Text>
      <View style={styles.offRow}>
        <Pressable onPress={p.onRead} style={[styles.primary, { backgroundColor: pal.text, flex: 1 }]} accessibilityRole="button">
          <Text style={[styles.primaryText, { color: tone.bg }]}>Read {p.surahName} in full</Text>
        </Pressable>
        <Pressable onPress={p.onRest} style={[styles.ghost, { borderColor: mix(tone.bg, pal.text, 0.25), flex: 1 }]} accessibilityRole="button">
          <Text style={[styles.primaryText, { color: pal.text }]}>Take a break</Text>
        </Pressable>
      </View>
      <Text style={[styles.optSub, { color: mix(tone.bg, pal.text, 0.6) }]}>Or swipe up to keep going.</Text>
    </View>
  );
}

function TopBar(p: { chrome: SharedValue<number>; chromeOn: boolean; pal: Palette; top: number; moodLabel: string; showTl: boolean; sound: boolean; onMood: () => void; onTl: () => void; onSound: () => void; onRead: () => void; onYou: () => void }) {
  const { pal } = p;
  const pill = [styles.pill, { borderColor: pal.line, backgroundColor: pal.surface }];
  const fade = useAnimatedStyle(() => ({ opacity: p.chrome.value }));
  return (
    <Animated.View style={[styles.top, { paddingTop: p.top + 10 }, fade]} pointerEvents={p.chromeOn ? 'box-none' : 'none'}>
      <Text style={[styles.brand, { color: pal.text }]}>
        munib<Text style={{ color: pal.accent }}>.</Text>
      </Text>
      <View style={styles.topRight}>
        <Pressable onPress={p.onMood} style={[pill, { maxWidth: 100 }]} accessibilityRole="button" accessibilityLabel="Change what's on your heart">
          <Text style={[styles.pillText, { color: pal.text }]} numberOfLines={1}>
            {p.moodLabel}
          </Text>
        </Pressable>
        <Pressable onPress={p.onTl} style={[pill, p.showTl && { borderColor: pal.accent }]} accessibilityRole="switch" accessibilityState={{ checked: p.showTl }} accessibilityLabel="Show transliteration">
          <Text style={[styles.aa, { color: p.showTl ? pal.accent : pal.text }]}>Aa</Text>
        </Pressable>
        <Pressable onPress={p.onSound} style={pill} accessibilityRole="switch" accessibilityState={{ checked: p.sound }} accessibilityLabel="Recitation">
          <Icon name={p.sound ? 'sound' : 'mute'} size={17} color={p.sound ? pal.text : pal.muted} />
        </Pressable>
        <Pressable onPress={p.onRead} style={pill} accessibilityRole="button" accessibilityLabel="All surahs">
          <Icon name="book" size={17} color={pal.text} />
        </Pressable>
        <Pressable onPress={p.onYou} style={[pill, { backgroundColor: pal.text, borderColor: pal.text }]} accessibilityRole="button" accessibilityLabel="Your progress and settings">
          <Icon name="user" size={17} color={pal.bg} />
        </Pressable>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  contAr: { fontFamily: fonts.arabic, fontSize: 30, lineHeight: 56, textAlign: 'left' },
  contBar: { height: 6, borderRadius: 3, overflow: 'hidden' },
  top: { position: 'absolute', left: 0, right: 0, top: 0, paddingHorizontal: 16, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  brand: { fontFamily: fonts.uiBold, fontSize: 24, letterSpacing: -0.5 },
  topRight: { flexDirection: 'row', gap: 6, alignItems: 'center' },
  pill: { minHeight: 36, minWidth: 36, paddingHorizontal: 10, borderWidth: 1, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
  pillText: { fontFamily: fonts.uiSemi, fontSize: 13 },
  aa: { fontFamily: fonts.readItalic, fontSize: 15 },
  lead: { fontFamily: fonts.read, fontSize: 15, lineHeight: 22, marginBottom: 6 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  opt: { flexBasis: '47%', flexGrow: 1, borderRadius: 10, padding: 12, gap: 3 },
  optTitle: { fontFamily: fonts.uiSemi, fontSize: 15 },
  optSub: { fontFamily: fonts.ui, fontSize: 12, lineHeight: 17 },
  skip: { alignSelf: 'center', padding: 12 },
  skipText: { fontFamily: fonts.ui, fontSize: 14, textDecorationLine: 'underline' },
  note: { fontFamily: fonts.read, fontSize: 16, lineHeight: 25 },
  h3: { fontFamily: fonts.uiBold, fontSize: 11, letterSpacing: 1.2 },
  off: { width: '100%', justifyContent: 'center', paddingHorizontal: 24, gap: 16 },
  offEyebrow: { fontFamily: fonts.uiBold, fontSize: 12, letterSpacing: 1.4 },
  offTitle: { fontFamily: fonts.uiBold, fontSize: 32, lineHeight: 37, letterSpacing: -0.6 },
  offBody: { fontFamily: fonts.read, fontSize: 17, lineHeight: 26 },
  offRow: { flexDirection: 'row', gap: 10, marginTop: 6 },
  primary: { borderRadius: 10, paddingHorizontal: 16, paddingVertical: 14, alignItems: 'center', justifyContent: 'center', minHeight: 50 },
  ghost: { borderRadius: 10, borderWidth: 1, paddingHorizontal: 16, paddingVertical: 14, alignItems: 'center', justifyContent: 'center', minHeight: 50 },
  primaryText: { fontFamily: fonts.uiBold, fontSize: 15, textAlign: 'center' },
  rest: { flex: 1, justifyContent: 'center', paddingHorizontal: 24, gap: 18 },
  restAr: { fontFamily: fonts.arabic, fontSize: 30, lineHeight: 58, textAlign: 'center' },
  restQuote: { fontFamily: fonts.read, fontSize: 15, lineHeight: 22, textAlign: 'center' },
  restTitle: { fontFamily: fonts.uiBold, fontSize: 34, letterSpacing: -0.6, marginTop: 10 },
  restBody: { fontFamily: fonts.read, fontSize: 17, lineHeight: 26 },
});
