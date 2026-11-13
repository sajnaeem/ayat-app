import { useAudioPlayer } from 'expo-audio';
import * as Haptics from 'expo-haptics';
import * as Notifications from 'expo-notifications';
import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { AccessibilityInfo, ActivityIndicator, Alert, AppState, FlatList, Linking, Modal, Platform, Pressable, Share, StyleSheet, Text, View } from 'react-native';
import Animated, { SharedValue, useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Icon } from '@/components/Icon';
import { ReflectionsSheet } from '@/components/Reflections';
import { ShareSheet } from '@/components/ShareCard';
import { ReadingSheet } from '@/components/ReadingSheet';
import { Sheet } from '@/components/Sheet';
import { useToast } from '@/components/Toast';
import { VerseCard } from '@/components/VerseCard';
import { ayahAudio, prefetchAudio, wordAt } from '@/lib/audio';
import { ayahKeys, ayahWords, feedRound, interleave, ladderCards, loadChapter, orderCards, MOODS, MoodId, revealedIn, SUPPORT, SURAHS, translationFor, Verse } from '@/lib/quran';
import { useAccount } from '@/lib/account';
import { dayKey, useProgress } from '@/lib/progress';
import { refreshMosque } from '@/lib/mosque';
import { schedulePrayerCalcAlerts } from '@/lib/prayertimes';
import { askPermission, REMINDER_TIMES, ReminderData, scheduleReminders } from '@/lib/reminders';
import { usePrefs } from '@/lib/store';
import type { FeedVideo, Snippet } from '@/data/snippets';
import { freshTimelyCard, markTimelySeen, SNIPPET_EVERY, snippetOrder, Timely, VIDEO_EVERY, videoOrder } from '@/lib/extras';
import { ProgressCard, SnippetCard, TimelyCard, VideoCard } from '@/components/FeedExtras';
import { PostCard } from '@/components/PostCard';
import { followingIds, followingReposts, myReposts, setRepost } from '@/lib/profiles';
import { approvedPosts, myPostLikes, Post, postKey, postsForMood, reportPost, setPostLike } from '@/lib/posts';
import { fonts, mix, Palette, usePalette } from '@/lib/theme';
import { noteQuranRead, syncMyParts } from '@/lib/together';
import { recheckDownloads } from '@/lib/offline';
import { pageOf } from '@/data/mushaf';

type VerseItem = { kind: 'verse'; key: string; v: Verse; i: number; ord?: boolean };
type OffItem = { kind: 'off'; key: string; i: number; s: number };
/** "Continue the Quran": every so often, a card that picks up the full Quran where the reader last stopped. */
type ContItem = { kind: 'cont'; key: string; i: number };
/** In order: the opening of each surah. */
type TitleItem = { kind: 'title'; key: string; i: number; s: number };
/** For you only: a fact, myth or Arabic word, or one of Munib's short videos, to break up the ayat. */
type SnipItem = { kind: 'snip'; key: string; i: number; s: Snippet; part?: number };
/** Once a visit: a card for this time of day, week or year; and how much of the Quran the reader has covered. */
type TimeItem = { kind: 'time'; key: string; i: number; t: Timely };
type ProgressItem = { kind: 'progress'; key: string; i: number };
/** For you only: an approved post from the community. */
type PostItem = { kind: 'post'; key: string; i: number; p: Post };
type VideoItem = { kind: 'video'; key: string; i: number; v: FeedVideo };
/** For you without an account: now and then, a gentle invitation to create one (never a wall). */
type JoinItem = { kind: 'join'; key: string; i: number };
type Item = VerseItem | OffItem | ContItem | TitleItem | SnipItem | VideoItem | TimeItem | ProgressItem | PostItem | JoinItem;
/** Guests see the invitation after this many For you ayat, then every JOIN_EVERY after. */
const JOIN_FIRST = 8;
const JOIN_EVERY = 24;
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
function useEndlessFeed(mood: MoodId | null, mode: 'foryou' | 'order', jump: number, guest = false) {
  const prefs = usePrefs();
  const me = useAccount().userId;
  // In order: which surah to load next, and where to start (read when the feed is rebuilt).
  const placeRef = useRef(prefs.place);
  placeRef.current = prefs.place;
  const nextSurah = useRef(1);
  const [orderFailed, setOrderFailed] = useState(false);
  const orderChunk = (base: Item[], s: number, list: Verse[]): Item[] => {
    const out = [...base];
    if (list[0]?.a === 1) out.push({ kind: 'title', key: `t-${s}`, i: out.length, s });
    for (const v of list) out.push({ kind: 'verse', key: `o-${v.k}`, v, i: out.length, ord: true });
    return out;
  };
  const { level, progress: readSoFar } = useProgress();
  const [items, setItems] = useState<Item[]>([]);
  const round = useRef(0);
  const gen = useRef(0);
  const busy = useRef(false);
  const live = useRef({ level, lang: prefs.lang, liked: Object.keys(prefs.likes), fresh: readSoFar.readings === 0 });
  live.current = { level, lang: prefs.lang, liked: Object.keys(prefs.likes), fresh: readSoFar.readings === 0 };

  // Extras for this mood, in a fresh order each visit; each is shown once before any repeats.
  const extras = useRef({ mood, snips: snippetOrder(mood), vids: videoOrder(mood), si: 0, vi: 0 });
  if (extras.current.mood !== mood) extras.current = { mood, snips: snippetOrder(mood), vids: videoOrder(mood), si: 0, vi: 0 };
  // Approved community posts, for this mood first. Each is shown once per visit, in every other extras slot.
  const posts = useRef<{ list: Post[]; pi: number }>({ list: [], pi: 0 });
  useEffect(() => {
    if (mode !== 'foryou') return;
    (async () => {
      const [l, fol] = await Promise.all([approvedPosts(), me ? followingIds(me).catch(() => new Set<string>()) : Promise.resolve(new Set<string>())]);
      const re = fol.size ? await followingReposts([...fol]).catch(() => [] as Post[]) : [];
      return [l, fol, re] as const;
    })().then(([l, fol, re]) => {
      // People you follow come first, then what they've reposted, then this mood's posts, then the rest. Each post once.
      const ordered = postsForMood(l, mood);
      const theirs = ordered.filter((x) => fol.has(x.user_id));
      const shared = re.filter((x) => x.user_id !== me && !fol.has(x.user_id));
      const taken = new Set([...theirs, ...shared].map((x) => x.id));
      posts.current = { list: [...theirs, ...shared, ...ordered.filter((x) => !taken.has(x.id))], pi: 0 };
      // The feed is usually built before posts arrive: swap every other upcoming single-card extra for a post.
      setItems((prev) => {
        let slot = 0;
        return prev.map((it, idx) => {
          if (idx < 4 || it.kind !== 'snip' || it.s.kind === 'story' || slot++ % 2 === 1) return it;
          if (posts.current.pi >= posts.current.list.length) return it;
          const post = posts.current.list[posts.current.pi++];
          return { kind: 'post', key: `post-${post.id}-early`, i: it.i, p: post };
        });
      });
    });
  }, [mood, mode, me]);

  const compose = (base: Item[], list: Verse[], r: number): Item[] => {
    const recent = new Set(base.slice(-14).flatMap((x) => (x.kind === 'verse' ? [x.v.k] : [])));
    let l = [...list.filter((v) => !recent.has(v.k)), ...list.filter((v) => recent.has(v.k))];
    const last = base[base.length - 1];
    if (last?.kind === 'verse' && l[0]?.k === last.v.k) l.push(l.shift()!);
    const out: Item[] = [...base];
    let verses = base.filter((x) => x.kind === 'verse').length;
    for (const v of l) {
      out.push({ kind: 'verse', key: `${r}-${v.k}`, v, i: out.length });
      const n = ++verses, x = extras.current;
      if (guest && mode === 'foryou' && n >= JOIN_FIRST && (n - JOIN_FIRST) % JOIN_EVERY === 0) {
        out.push({ kind: 'join', key: `join-${r}-${n}`, i: out.length });
        continue;
      }
      // Once per feed: a card for this time of day (early on), and later how far the reader has come.
      if (n >= 2 && !out.some((it) => it.kind === 'time')) {
        // Shown once per time window per day (remembered on the phone), so rebuilding the feed doesn't repeat it.
        const t = freshTimelyCard();
        if (t) {
          markTimelySeen(t);
          out.push({ kind: 'time', key: `time-${t.id}-${r}`, i: out.length, t });
          continue;
        }
      }
      if (n >= 14 && !out.some((it) => it.kind === 'progress') && Object.keys(readSoFar.ayat ?? {}).length >= 20) {
        out.push({ kind: 'progress', key: `progress-${r}`, i: out.length });
        continue;
      }
      if (n % CONT_EVERY === 0) out.push({ kind: 'cont', key: `cont-${r}-${n}`, i: out.length });
      else if (n % VIDEO_EVERY === 0 && x.vids.length) out.push({ kind: 'video', key: `vid-${r}-${n}`, i: out.length, v: x.vids[x.vi++ % x.vids.length] });
      else if (n % SNIPPET_EVERY === 0 && (n / SNIPPET_EVERY) % 2 === 1 && posts.current.pi < posts.current.list.length) {
        const post = posts.current.list[posts.current.pi++];
        out.push({ kind: 'post', key: `post-${post.id}-${r}`, i: out.length, p: post });
      } else if (n % SNIPPET_EVERY === 0 && x.snips.length) {
        const s = x.snips[x.si++ % x.snips.length];
        // A story is told over three cards in a row.
        for (let part = 0; part < (s.kind === 'story' ? s.parts.length : 1); part++) out.push({ kind: 'snip', key: `snip-${r}-${n}-${part}`, i: out.length, s, part });
      }
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
      if (mode === 'order') return;
      const g = gen.current;
      const { r, list } = await nextRound();
      if (g !== gen.current) return;
      setItems((prev) => compose(prev.slice(0, keep + 1), list, r));
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [mood, mode],
  );

  const reset = useCallback(() => {
    const g = ++gen.current;
    round.current = 0;
    if (mode === 'order') {
      const start = nextPlace(placeRef.current);
      setItems([]);
      setOrderFailed(false);
      orderCards(start.s, live.current.lang, start.a).then(
        (list) => {
          if (g !== gen.current) return;
          nextSurah.current = start.s === 114 ? 1 : start.s + 1;
          setItems(orderChunk([], start.s, list));
          // Have the next surah ready too (and saved for offline).
          loadChapter(nextSurah.current, live.current.lang).catch(() => {});
        },
        () => g === gen.current && setOrderFailed(true),
      );
      return;
    }
    // Show curated ayat straight away; ladder cards join once their surahs have loaded.
    const r = round.current++;
    setItems(compose([], feedRound(r, mood, live.current.liked, live.current.fresh), r));
    if (live.current.level > 1) {
      setTimeout(() => {
        if (g === gen.current) refreshAhead(1);
      }, 0);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mood, mode, jump, refreshAhead]);

  const more = useCallback(async () => {
    if (busy.current) return;
    busy.current = true;
    const g = gen.current;
    try {
      if (mode === 'order') {
        const sNext = nextSurah.current;
        const list = await orderCards(sNext, live.current.lang, 1);
        if (g !== gen.current) return;
        nextSurah.current = sNext === 114 ? 1 : sNext + 1;
        setItems((prev) => orderChunk(prev, sNext, list));
        return;
      }
      const { r, list } = await nextRound();
      if (g === gen.current) setItems((prev) => compose(prev, list, r));
    } catch {
      // Couldn't load the next surah (offline?): onEndReached will try again.
    } finally {
      busy.current = false;
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mood, mode]);

  return { items, setItems, reset, more, refreshAhead, orderFailed };
}

// Auto scroll reading pace: seconds per Arabic word plus translation words per minute.
const PACE = { slow: { ar: 0.9, wpm: 150 }, medium: { ar: 0.6, wpm: 200 }, fast: { ar: 0.4, wpm: 260 } };

export default function Feed() {
  const pal = usePalette();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const prefs = usePrefs();
  const prog = useProgress();
  const toast = useToast();
  const [height, setHeight] = useState(0);
  const [active, setActive] = useState(0);
  const acctEarly = useAccount();
  // Without an account, people can read the Quran tab; For you, reflections and You ask them to sign in.
  const guest = acctEarly.status === 'signedOut';
  // Since 10 Nov 2026 guests can try For you too (pick a mood, see ayat that speak to it) before being asked to sign up.
  const mode: 'foryou' | 'order' = prefs.feedMode;
  const [sheet, setSheet] = useState<null | 'mood' | 'context' | 'remind' | 'support' | 'reading'>(prefs.onboarded ? null : 'mood');
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
  // Controls used to fade a few seconds after each card; Saj found that annoying, so they now always stay.
  const showChrome = useCallback(
    (_holdMs = 5000) => {
      chrome.value = 1;
      setChromeOn(true);
    },
    [chrome],
  );
  useEffect(() => () => void (chromeTimer.current && clearTimeout(chromeTimer.current)), []);
  const acct = useAccount();
  const [reflectFor, setReflectFor] = useState<Verse | null>(null);
  const [reflectPost, setReflectPost] = useState<Post | null>(null);
  const [postLikes, setPostLikes] = useState<Set<string>>(new Set());
  useEffect(() => {
    if (acct.userId) myPostLikes(acct.userId).then(setPostLikes, () => {});
    if (acct.userId) syncMyParts();
  }, [acct.userId]);
  const likePost = (p: Post) => {
    if (!acct.userId) return;
    const on = !postLikes.has(p.id);
    setPostLikes((s) => {
      const n = new Set(s);
      if (on) n.add(p.id);
      else n.delete(p.id);
      return n;
    });
    setPostLike(acct.userId, p.id, on).catch(() => {});
  };
  const [reposts, setReposts] = useState<Set<string>>(new Set());
  useEffect(() => {
    if (acct.userId) myReposts(acct.userId).then(setReposts, () => {});
  }, [acct.userId]);
  const repost = (p: Post) => {
    if (!acct.userId) return;
    const on = !reposts.has(p.id);
    setReposts((s) => {
      const n = new Set(s);
      if (on) n.add(p.id);
      else n.delete(p.id);
      return n;
    });
    if (Platform.OS !== 'web') Haptics.selectionAsync().catch(() => {});
    toast(on ? 'Reposted to your profile and followers' : 'Repost removed');
    setRepost(acct.userId, p.id, on).catch(() => {
      setReposts((s) => {
        const n = new Set(s);
        if (on) n.delete(p.id);
        else n.add(p.id);
        return n;
      });
      toast("Couldn't repost. Try again");
    });
  };
  const postOptions = (p: Post) => {
    if (!acct.userId) return;
    Alert.alert(`Post by ${p.handle}`, undefined, [
      { text: 'Report this post', onPress: () => reportPost(p.id, acct.userId!).then(() => toast('Thanks. We’ll review it within 24 hours'), () => toast('Couldn’t send the report. Try again')) },
      { text: `Block ${p.handle}`, style: 'destructive', onPress: () => acct.blockUser(p.user_id).then(() => toast(`Blocked ${p.handle}`), () => toast('Couldn’t block. Try again')) },
      { text: 'Cancel', style: 'cancel' },
    ]);
  };

  const { items, setItems, reset, more, refreshAhead, orderFailed } = useEndlessFeed(prefs.mood, mode, mode === 'order' ? prefs.jump : 0, guest);

  /** For you (curated, by mood) or In order (the whole Quran, from where you left off). */
  const switchMode = (m: 'foryou' | 'order') => {
    if (m === mode) return;
    if (Platform.OS !== 'web') Haptics.selectionAsync().catch(() => {});
    prefs.set({ feedMode: m });
  };

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
  // (Older versions had a mute button; anyone who had muted starts paused instead.)
  const [held, setHeldState] = useState(!prefs.sound);
  const heldRef = useRef(!prefs.sound);
  useEffect(() => {
    if (!prefs.sound) prefs.set({ sound: true });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
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
      player.setPlaybackRate(speedRef.current, 'high');
      if (!pausedRef.current) player.play();
    });
  }, [player, prefs.reciter]);
  // Recitation speed (You → Reading → Speed), applied straight away too.
  const speedRef = useRef(prefs.speed ?? 1);
  speedRef.current = prefs.speed ?? 1;
  useEffect(() => {
    try {
      player.setPlaybackRate(prefs.speed ?? 1, 'high');
    } catch {}
  }, [player, prefs.speed]);

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
    } else if (autoRef.current) {
      // Auto scroll: the reciter has finished this card, so bring the next one (it starts reciting when it settles).
      advance();
      return;
    } else return stop();
    playIdx();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [finished]);

  // Recitation stops when another tab is open, and the card starts again on coming back to Home.
  const [focused, setFocused] = useState(true);
  useFocusEffect(
    useCallback(() => {
      setFocused(true);
      return () => setFocused(false);
    }, []),
  );

  /* ---------- auto scroll (Quran tab): follows the recitation, or a reading pace when the sound is paused ---------- */
  const [autoPaused, setAutoPaused] = useState(false);
  const autoOn = mode === 'order' && (prefs.autoScroll ?? 'off') !== 'off';
  const autoRef = useRef(false);
  autoRef.current = autoOn && !autoPaused && !sheet && !resting && focused;
  const activeRef = useRef(0);
  activeRef.current = active;
  function advance() {
    const next = activeRef.current + 1;
    if (next < items.length) listRef.current?.scrollToIndex({ index: next, animated: true });
  }
  const audioOn = prefs.sound && !held && !paused;
  useEffect(() => {
    if (!autoRef.current || audioOn) return;
    const it = items[active];
    const pace = PACE[prefs.autoScroll as Exclude<typeof prefs.autoScroll, 'off'>] ?? PACE.medium;
    let ms = 5000;
    if (it?.kind === 'verse') {
      const ar = it.v.ar.reduce((n, [x]) => n + ayahWords(x).length, 0);
      const tr = (translationFor(it.v, prefs.lang) ?? []).join(' ').split(/\s+/).length;
      ms = Math.max(5000, ar * pace.ar * 1000 + (tr / pace.wpm) * 60000);
    }
    const t = setTimeout(advance, ms);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active, autoOn, autoPaused, audioOn, sheet, resting, prefs.autoScroll, items.length, focused]);

  // Look up the audio for this card and the next two ahead of time, so recitation starts without a wait.
  useEffect(() => {
    for (const it of items.slice(active, active + 3)) if (it.kind === 'verse') prefetchAudio(prefs.reciter, it.v.s);
    // And the text, so curated cards already show the Quran Foundation text when they arrive.
    for (const it of items.slice(active, active + 4)) if (it.kind === 'verse') loadChapter(it.v.s, prefs.lang).catch(() => {});
  }, [items, active, prefs.reciter, prefs.lang]);

  // Each time a new card settles, recite it (if sound is on). Keyed on the card itself, so it also starts
  // when the feed first loads on opening the app, and after a mood change swaps the cards.
  const activeKey = items[active]?.key;
  useEffect(() => {
    if (!focused) return stop();
    if (!items.length || sheet === 'mood' || resting) return;
    const it = items[active];
    if (prefs.sound && !heldRef.current) startCard(it, it?.kind === 'verse' ? (repeat[it.key] ?? 1) : 1);
    else stop();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeKey, prefs.sound, prefs.reciter, sheet === 'mood', resting, focused]);

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
      // The feed still stretches quietly as someone reads more (longer passages); no levels are shown (Saj, 13 Nov 2026).
      if (ev.levelUp && mode === 'foryou') refreshAhead(active + 1);
      if (ev.surahsCompleted.length) toast(`MashaAllah, you've read all of ${SURAHS[ev.surahsCompleted[0] - 1][0]}`);
    },
    [toast, refreshAhead, active, mode],
  );

  useEffect(() => {
    const it = items[active];
    if (!it || it.kind !== 'verse' || sheet === 'mood' || resting) return;
    const t = setTimeout(() => {
      if (counted.current.has(it.key)) return;
      counted.current.add(it.key);
      announce(prog.markRead(ayahKeys(it.v), 1));
      if (it.ord) {
        prefs.set({ place: { s: it.v.s, a: it.v.b } });
        // Counts towards any juz this person is reading in a khatm (Read together).
        noteQuranRead(ayahKeys(it.v)).then((ev) => ev.finished.forEach((f) => toast(`MashaAllah, juz ${f.juz} is finished for “${f.title}”`)));
      }
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
  // Share opens a preview of the ayah as an image (colours, an optional greeting), or as text.
  const [shareVerse, setShareVerse] = useState<Verse | null>(null);
  const share = (v: Verse) => setShareVerse(v);
  /** Every "read more" opens the Quran tab at that ayah: one reading experience, always swipeable. */
  const openSurah = (s: number, from = 1) => {
    stop();
    prefs.readAt(s, from);
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
  // Prayer alerts for my mosque: fresh times and the next week's alerts every time Munib opens.
  const mosqueId = prefs.mosque?.id;
  const alertsRef = useRef({ alerts: prefs.prayerAlerts, jumuah: prefs.jumuah });
  alertsRef.current = { alerts: prefs.prayerAlerts, jumuah: prefs.jumuah };
  useEffect(() => {
    if (!mosqueId) return;
    const go = () => refreshMosque({ id: mosqueId, ...alertsRef.current }).catch(() => {});
    go();
    const sub = AppState.addEventListener('change', (st) => st === 'active' && go());
    return () => sub.remove();
  }, [mosqueId]);

  // General prayer-time alerts (worked out on the phone): re-planned every time Munib opens.
  const prayerRef = useRef(prefs.prayer);
  prayerRef.current = prefs.prayer;
  useEffect(() => {
    const go = () => schedulePrayerCalcAlerts(prayerRef.current, !!prefs.mosque).catch(() => {});
    go();
    const sub = AppState.addEventListener('change', (st) => st === 'active' && go());
    return () => sub.remove();
  }, [prefs.prayer, !!prefs.mosque]);

  // Downloaded recitations: re-checked against the synced list at least weekly (Quran Foundation terms).
  useEffect(() => {
    const t = setTimeout(() => recheckDownloads().catch(() => {}), 5000);
    const sub = AppState.addEventListener('change', (st) => st === 'active' && recheckDownloads().catch(() => {}));
    return () => {
      clearTimeout(t);
      sub.remove();
    };
  }, []);

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
    else if (data?.to === 'mosque') router.push('/mosque');
    else if (data?.to === 'prayertimes') router.push('/prayertimes');
    else setSheet('mood');
    Notifications.clearLastNotificationResponseAsync().catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lastResponse]);
  const setRepeatFor = (item: VerseItem, n: number) => {
    setRepeat((r) => ({ ...r, [item.key]: n }));
    if (n > 1) startCard(item, n);
  };

  // The feeling picked on "What's on your heart today?", or just "Mood" until one is chosen.
  const moodLabel = MOODS.find((m) => m.id === prefs.mood)?.label ?? 'Mood';
  const today = prog.progress.days[dayKey()] ?? 0;

  return (
    <View style={[styles.root, { backgroundColor: pal.bg }]} onLayout={(e) => setHeight(e.nativeEvent.layout.height)}>
      {items.length === 0 && (
        <View style={[StyleSheet.absoluteFill, { alignItems: 'center', justifyContent: 'center', gap: 14, padding: 32 }]}>
          {orderFailed ? (
            <>
              <Text style={[styles.offBody, { color: pal.muted, textAlign: 'center' }]}>Couldn't load the Quran. Check your connection.</Text>
              <Pressable onPress={reset} style={[styles.primary, { backgroundColor: pal.text, paddingHorizontal: 28 }]} accessibilityRole="button">
                <Text style={[styles.primaryText, { color: pal.bg }]}>Try again</Text>
              </Pressable>
            </>
          ) : (
            <ActivityIndicator color={pal.accent} />
          )}
        </View>
      )}
      {height > 0 && (
        <FlatList
          ref={listRef}
          data={items}
          keyExtractor={(x) => x.key}
          renderItem={({ item, index }) => {
            const tone = pal.tones[item.i % pal.tones.length];
            if (item.kind === 'title') return <SurahStart pal={pal} tone={tone} height={height} s={item.s} />;
            if (item.kind === 'snip') {
              return (
                <SnippetCard
                  s={item.s}
                  part={item.part}
                  pal={pal}
                  tone={tone}
                  height={height}
                  bottomInset={0}
                  active={index === active && sheet !== 'mood'}
                  autoplay={prefs.sound && !held}
                />
              );
            }
            if (item.kind === 'time') {
              return (
                <TimelyCard
                  t={item.t}
                  pal={pal}
                  tone={tone}
                  height={height}
                  bottomInset={0}
                  onAction={(s, a) => (s === 0 ? switchMode('order') : openSurah(s, a))}
                />
              );
            }
            if (item.kind === 'post') {
              return (
                <PostCard
                  post={item.p}
                  pal={pal}
                  tone={tone}
                  height={height}
                  bottomInset={0}
                  active={index === active && sheet !== 'mood'}
                  autoplay={prefs.sound && !held}
                  liked={postLikes.has(item.p.id)}
                  onLike={() => likePost(item.p)}
                  onComment={() => setReflectPost(item.p)}
                  onMore={() => postOptions(item.p)}
                  reposted={reposts.has(item.p.id)}
                  onRepost={acct.userId && item.p.user_id !== acct.userId ? () => repost(item.p) : undefined}
                  onAuthor={() => (acct.userId ? router.push(`/profile/${item.p.user_id}`) : router.push({ pathname: '/signin', params: { why: 'profile' } }))}
                />
              );
            }
            if (item.kind === 'progress') return <ProgressCard read={Object.keys(prog.progress.ayat).length} pal={pal} tone={tone} height={height} bottomInset={0} />;
            if (item.kind === 'video') {
              return (
                <VideoCard
                  v={item.v}
                  pal={pal}
                  tone={tone}
                  height={height}
                  bottomInset={0}
                  active={index === active && sheet !== 'mood'}
                  near={Math.abs(index - active) <= 1}
                  autoplay={prefs.sound && !held}
                />
              );
            }
            if (item.kind === 'join') {
              return <JoinCard pal={pal} tone={tone} height={height} onJoin={() => router.push({ pathname: '/signin', params: { why: 'keep' } })} />;
            }
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
                  onRead={() => switchMode('order')}
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
                  onRead={mode === 'order' ? null : () => openSurah(item.s)}
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
                bottomInset={0}
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
                onKeepReading={item.ord ? null : () => openSurah(item.v.s, item.v.a)}
                onContext={() => {
                  setContextVerse(item.v);
                  setSheet('context');
                }}
                repeat={reps}
                repeatLabel={isPlaying && playing!.passes > 1 ? `${playing!.pass} of ${playing!.passes}` : null}
                onRepeat={(n) => setRepeatFor(item, n)}
                likeCount={acct.stats[item.v.k]?.likes ?? null}
                reflectionCount={acct.stats[item.v.k]?.reflections ?? null}
                onReflections={acct.online ? () => (guest ? router.push({ pathname: '/signin', params: { why: 'reflect' } }) : setReflectFor(item.v)) : null}
                onSupport={() => setSheet('support')}
                onRef={() => {
                  stop();
                  router.push('/read');
                }}
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

      {autoOn && (
        <Pressable
          onPress={() => setAutoPaused((x) => !x)}
          style={[styles.autoPill, { top: insets.top + 58, borderColor: autoPaused ? pal.line : pal.accent, backgroundColor: pal.surface }]}
          accessibilityRole="button"
          accessibilityLabel={autoPaused ? 'Resume auto scroll' : 'Pause auto scroll'}
          hitSlop={6}
        >
          <Icon name={autoPaused ? 'play' : 'pause'} size={11} color={autoPaused ? pal.muted : pal.accent} fill />
          <Text style={[styles.autoText, { color: autoPaused ? pal.muted : pal.accent }]}>Auto</Text>
        </Pressable>
      )}

      <TopBar
        chrome={chrome}
        chromeOn={chromeOn}
        pal={pal}
        onDark={(() => {
          // Videos and photo/video posts sit on a dark ground: switch the top bar to light text so it stays readable.
          const it = items[active];
          return !pal.dark && !!it && (it.kind === 'video' || (it.kind === 'post' && it.p.kind !== 'text'));
        })()}
        top={insets.top}
        moodLabel={moodLabel}
        mode={mode}
        onMode={switchMode}
        showTl={prefs.showTl}
        onMood={() => setSheet('mood')}
        onTl={() => setSheet('reading')}
        onRead={() => {
          stop();
          router.push('/search');
        }}
        onPages={() => {
          stop();
          const it = items[active];
          const at = it && it.kind === 'verse' && it.ord ? { s: it.v.s, a: it.v.a } : prefs.place ?? { s: 1, a: 1 };
          router.push({ pathname: '/mushaf', params: { page: String(pageOf(at.s, at.a)) } });
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
                  <Pressable key={m.id} onPress={() => { prefs.set({ mood: m.id, onboarded: true, feedMode: 'foryou' }); setSheet(null); }} style={[styles.opt, { borderColor: on ? pal.accent : pal.line, borderWidth: on ? 2 : 1 }]} accessibilityRole="button" accessibilityState={{ selected: on }}>
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

      <ReadingSheet visible={sheet === 'reading'} onClose={() => setSheet(null)} pal={pal} />

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

      <ShareSheet verse={shareVerse} lang={prefs.lang} pal={pal} onClose={() => setShareVerse(null)} />
      <ReflectionsSheet verseKey={reflectPost ? postKey(reflectPost.id) : null} title={reflectPost ? `Post by ${reflectPost.handle}` : ''} pal={pal} onClose={() => setReflectPost(null)} />
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
/** In order: the opening card of each surah, with the basmalah (except at-Tawbah, which has none). */
function SurahStart(p: { pal: Palette; tone: { bg: string; accent: string }; height: number; s: number }) {
  const { pal, tone, s } = p;
  const [name, arName, meaning, count] = SURAHS[s - 1];
  return (
    <View style={[styles.off, { height: p.height, backgroundColor: tone.bg, alignItems: 'center' }]}>
      <Text style={[styles.offEyebrow, { color: tone.accent }]}>SURAH {s}</Text>
      <Text style={[styles.titleAr, { color: pal.text }]}>{arName}</Text>
      <Text style={[styles.offTitle, { color: pal.text, textAlign: 'center' }]}>{name}</Text>
      <Text style={[styles.offBody, { color: mix(tone.bg, pal.text, 0.75), textAlign: 'center' }]}>
        {meaning} · {count} ayat
      </Text>
      <Text style={[styles.optSub, { color: tone.accent, marginTop: 6 }]}>Revealed in {revealedIn(s)}</Text>
      {s !== 9 && s !== 1 && <Text style={[styles.basmalah, { color: pal.text }]}>بِسْمِ ٱللَّهِ ٱلرَّحْمَـٰنِ ٱلرَّحِيمِ</Text>}
      <Text style={[styles.optSub, { color: mix(tone.bg, pal.text, 0.6) }]}>Swipe up to begin</Text>
    </View>
  );
}

/** Where "Continue the Quran" picks up: the ayah after the last one read, or the very beginning. */
function nextPlace(place: { s: number; a: number } | null) {
  if (!place) return { s: 1, a: 1 };
  if (place.a < SURAHS[place.s - 1][3]) return { s: place.s, a: place.a + 1 };
  return { s: place.s === 114 ? 1 : place.s + 1, a: 1 };
}

/** For you without an account: an invitation, not a wall. Swiping past it simply carries on. */
function JoinCard(p: { pal: Palette; tone: { bg: string; accent: string }; height: number; onJoin: () => void }) {
  const { pal, tone } = p;
  return (
    <View style={[styles.off, { height: p.height, backgroundColor: tone.bg }]}>
      <Text style={[styles.offEyebrow, { color: tone.accent }]}>KEEP YOUR FEED</Text>
      <Text style={[styles.offTitle, { color: pal.text }]}>Make Munib yours.</Text>
      <Text style={[styles.offBody, { color: mix(tone.bg, pal.text, 0.75) }]}>
        A free account keeps the ayat you save, remembers how far you’ve read, and lets you ask about any ayah and share reflections.
      </Text>
      <Pressable onPress={p.onJoin} style={[styles.primary, { backgroundColor: pal.text }]} accessibilityRole="button">
        <Text style={[styles.primaryText, { color: tone.bg }]}>Create a free account</Text>
      </Pressable>
      <Text style={[styles.optSub, { color: mix(tone.bg, pal.text, 0.6) }]}>Or swipe up to keep reading.</Text>
    </View>
  );
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

function OffRamp(p: { pal: Palette; tone: { bg: string; accent: string }; height: number; ayat: number; minutes: number; surahName: string; onRead: (() => void) | null; onRest: () => void }) {
  const { pal, tone } = p;
  return (
    <View style={[styles.off, { height: p.height, backgroundColor: tone.bg }]}>
      <Text style={[styles.offEyebrow, { color: tone.accent }]}>TIME CHECK</Text>
      <Text style={[styles.offTitle, { color: pal.text }]}>
        You've read {p.ayat} ayat in {p.minutes} minute{p.minutes === 1 ? '' : 's'}.
      </Text>
      <Text style={[styles.offBody, { color: mix(tone.bg, pal.text, 0.75) }]}>{p.onRead ? "That's real focus. Go deeper with the whole surah, or rest your eyes for a bit." : "That's real focus. Rest your eyes for a bit, or keep going."}</Text>
      <View style={styles.offRow}>
        {p.onRead && (
          <Pressable onPress={p.onRead} style={[styles.primary, { backgroundColor: pal.text, flex: 1 }]} accessibilityRole="button">
            <Text style={[styles.primaryText, { color: tone.bg }]}>Read {p.surahName} in full</Text>
          </Pressable>
        )}
        <Pressable onPress={p.onRest} style={[styles.ghost, { borderColor: mix(tone.bg, pal.text, 0.25), flex: 1 }]} accessibilityRole="button">
          <Text style={[styles.primaryText, { color: pal.text }]}>Take a break</Text>
        </Pressable>
      </View>
      <Text style={[styles.optSub, { color: mix(tone.bg, pal.text, 0.6) }]}>Or swipe up to keep going.</Text>
    </View>
  );
}

function TopBar(p: { chrome: SharedValue<number>; chromeOn: boolean; pal: Palette; onDark?: boolean; top: number; moodLabel: string; mode: 'foryou' | 'order'; onMode: (m: 'foryou' | 'order') => void; showTl: boolean; onMood: () => void; onTl: () => void; onRead: () => void; onPages: () => void }) {
  // On a dark card (a video, a photo post) switch to light text and dark see-through buttons, with a shadow under the tab names.
  const pal: Palette = p.onDark ? { ...p.pal, text: '#FFFFFF', muted: 'rgba(255,255,255,0.72)', surface: 'rgba(20,24,22,0.55)', line: 'rgba(255,255,255,0.28)', bg: '#121A16', accent: '#7FE0B5' } : p.pal;
  const pill = [styles.pill, { borderColor: pal.line, backgroundColor: pal.surface }];
  const fade = useAnimatedStyle(() => ({ opacity: p.chrome.value }));
  return (
    <Animated.View style={[styles.top, { paddingTop: p.top + 10 }, fade]} pointerEvents={p.chromeOn ? 'box-none' : 'none'}>
      <View style={styles.tabs} accessibilityRole="tablist">
        {(
          [
            ['foryou', 'For you'],
            ['order', 'Quran'],
          ] as const
        ).map(([m, label]) => {
          const on = p.mode === m;
          return (
            <Pressable key={m} onPress={() => p.onMode(m)} hitSlop={6} accessibilityRole="tab" accessibilityState={{ selected: on }} accessibilityLabel={m === 'order' ? 'The whole Quran, in order' : 'For you'}>
              <Text style={[styles.tab, { color: on ? pal.text : pal.muted }, p.onDark && styles.tabShadow]}>{label}</Text>
              <View style={[styles.tabLine, { backgroundColor: on ? pal.accent : 'transparent' }]} />
            </Pressable>
          );
        })}
      </View>
      <View style={styles.topRight}>
        {p.mode === 'foryou' && (
          <Pressable onPress={p.onMood} style={[pill, { maxWidth: 88, flexShrink: 1, overflow: 'hidden' }]} accessibilityRole="button" accessibilityLabel="Change what's on your heart">
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, flexShrink: 1, maxWidth: '100%' }}>
              <View style={{ flexShrink: 0 }}>
                <Icon name="heart" size={13} color={pal.accent} strokeWidth={2} />
              </View>
              <Text style={[styles.pillText, { color: pal.text, flexShrink: 1 }]} numberOfLines={1}>
                {p.moodLabel}
              </Text>
            </View>
          </Pressable>
        )}
        {p.mode === 'order' && (
          <Pressable onPress={p.onPages} style={pill} accessibilityRole="button" accessibilityLabel="Page view: read the Quran as printed pages">
            <Icon name="book" size={17} color={pal.text} />
          </Pressable>
        )}
        <Pressable onPress={p.onRead} style={pill} accessibilityRole="button" accessibilityLabel="Search surahs, ayat, people and posts">
          <Icon name="search" size={17} color={pal.text} />
        </Pressable>
        <Pressable onPress={p.onTl} style={[pill, p.showTl && { borderColor: pal.accent }]} accessibilityRole="button" accessibilityLabel="Reading options: transliteration, text size, speed and auto scroll">
          <Text style={[styles.aa, { color: p.showTl ? pal.accent : pal.text }]}>Aa</Text>
        </Pressable>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  titleAr: { fontFamily: fonts.arabic, fontSize: 44, lineHeight: 84 },
  basmalah: { fontFamily: fonts.arabic, fontSize: 24, lineHeight: 48, marginTop: 8, textAlign: 'center' },
  contAr: { fontFamily: fonts.arabic, fontSize: 30, lineHeight: 56, textAlign: 'left' },
  contBar: { height: 6, borderRadius: 3, overflow: 'hidden' },
  top: { position: 'absolute', left: 0, right: 0, top: 0, paddingHorizontal: 16, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  brand: { fontFamily: fonts.uiBold, fontSize: 24, letterSpacing: -0.5 },
  topRight: { flexDirection: 'row', gap: 6, alignItems: 'center', flexShrink: 1, marginLeft: 10 },
  tabs: { flexDirection: 'row', gap: 12, alignItems: 'flex-start', flexShrink: 0 },
  tab: { fontFamily: fonts.uiBold, fontSize: 16, letterSpacing: -0.3 },
  tabShadow: { textShadowColor: 'rgba(0,0,0,0.6)', textShadowOffset: { width: 0, height: 1 }, textShadowRadius: 6 },
  tabLine: { height: 2.5, borderRadius: 2, marginTop: 3, width: 18 },
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
  autoPill: { position: 'absolute', right: 16, flexDirection: 'row', alignItems: 'center', gap: 5, borderWidth: 1, borderRadius: 999, paddingHorizontal: 10, paddingVertical: 5 },
  autoText: { fontFamily: fonts.uiBold, fontSize: 12 },
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
