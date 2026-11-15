import { AudioPlayer, createAudioPlayer, setAudioModeAsync } from 'expo-audio';
import { createContext, ReactNode, useCallback, useContext, useEffect, useRef, useState } from 'react';
import { ayahAudio, RECITERS, type ReciterId } from '@/lib/audio';
import { closeRadio, registerSound } from '@/lib/radio';

/**
 * Play on repeat (Saj, 15 Nov 2026: "play a passage on repeat over and over again… when my dad passed, in his room
 * we played surah Baqarah on repeat all day long"). A surah or a passage recited again and again, ayah by ayah, that
 * keeps going while you use the app and with the phone locked (like the radio), until it is stopped or has gone
 * round the chosen number of times.
 * Two players take turns: while one recites an ayah the other loads the next, so there is hardly a gap between ayat
 * (which also keeps iOS from putting the app to sleep in a pause). Downloaded surahs play from the phone.
 */
export type Passage = { id: string; title: string; sub: string; parts: [s: number, from: number, to: number][] };

type LoopState = {
  passage: Passage | null;
  reciter: ReciterId;
  on: boolean;
  loading: boolean;
  /** Couldn't load the recitation (usually no connection). */
  error: boolean;
  /** Finished the chosen number of rounds. */
  finished: boolean;
  at: number;
  total: number;
  round: number;
  /** 0 = until stopped. */
  rounds: number;
  now: [number, number] | null;
  start: (p: Passage, reciter: ReciterId, rounds: number) => void;
  toggle: () => void;
  stop: () => void;
  close: () => void;
};

const noop = () => {};
const Ctx = createContext<LoopState>({ passage: null, reciter: 'alafasy', on: false, loading: false, error: false, finished: false, at: 0, total: 0, round: 1, rounds: 0, now: null, start: noop, toggle: noop, stop: noop, close: noop });
export const useLoop = () => useContext(Ctx);

export function LoopProvider({ children }: { children: ReactNode }) {
  const players = useRef<[AudioPlayer, AudioPlayer] | null>(null);
  const r = useRef({ list: [] as [number, number][], i: 0, round: 1, rounds: 0, reciter: 'alafasy' as ReciterId, cur: 0, ready: -1, token: 0, active: false, title: '' });
  const watchdog = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [passage, setPassage] = useState<Passage | null>(null);
  const [reciter, setReciter] = useState<ReciterId>('alafasy');
  const [on, setOn] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);
  const [finished, setFinished] = useState(false);
  const [pos, setPos] = useState({ at: 0, round: 1 });
  const [rounds, setRounds] = useState(0);

  const clearWatch = () => {
    if (watchdog.current) clearTimeout(watchdog.current);
    watchdog.current = null;
  };

  const halt = useCallback((keepMode?: boolean) => {
    r.current.active = false;
    r.current.token++;
    clearWatch();
    setOn(false);
    setLoading(false);
    const ps = players.current;
    if (!ps) return;
    for (const p of ps) {
      try {
        p.pause();
        p.setActiveForLockScreen(false);
      } catch {}
    }
    if (!keepMode) setAudioModeAsync({ shouldPlayInBackground: false, interruptionMode: 'mixWithOthers' }).catch(() => {});
  }, []);

  /** The ayah after `i`, or -1 when the last round has ended. */
  const after = (i: number) => {
    const st = r.current;
    if (i + 1 < st.list.length) return i + 1;
    return st.rounds && st.round >= st.rounds ? -1 : 0;
  };

  const playAt = useCallback(
    async (n: number) => {
      const st = r.current;
      const ps = players.current;
      if (!ps) return;
      const token = ++st.token;
      st.i = n;
      setPos({ at: n, round: st.round });
      clearWatch();
      watchdog.current = setTimeout(() => {
        if (r.current.token !== token) return;
        halt();
        setError(true);
      }, 25000);
      try {
        if (st.ready === n) {
          st.cur = 1 - st.cur; // the other player already holds this ayah
        } else {
          setLoading(true);
          const a = await ayahAudio(st.reciter, st.list[n][0], st.list[n][1], 2500);
          if (st.token !== token) return;
          ps[st.cur].replace({ uri: a.url });
        }
        st.ready = -1;
        const p = ps[st.cur];
        p.play();
        try {
          p.setActiveForLockScreen(true, { title: st.title, artist: `${RECITERS.find((x) => x.id === st.reciter)?.name ?? 'Munib'} · on repeat` });
        } catch {}
        // Load the one after into the other player while this one recites.
        const nn = after(n);
        if (nn < 0) return;
        const next = await ayahAudio(st.reciter, st.list[nn][0], st.list[nn][1], 2500);
        if (st.token !== token) return;
        ps[1 - st.cur].replace({ uri: next.url });
        st.ready = nn;
      } catch {
        if (st.token === token) {
          halt();
          setError(true);
        }
      }
    },
    [halt],
  );

  const ensure = useCallback(() => {
    if (players.current) return;
    const make = (k: number) => {
      const p = createAudioPlayer(null, { updateInterval: 500 });
      p.addListener('playbackStatusUpdate', (s) => {
        const st = r.current;
        if (!st.active || k !== st.cur) return;
        if (s.playing) {
          setLoading(false);
          clearWatch();
        }
        if (!s.didJustFinish) return;
        const nn = after(st.i);
        if (nn < 0) {
          halt();
          setFinished(true);
          return;
        }
        if (nn === 0) st.round++;
        playAt(nn);
      });
      return p;
    };
    players.current = [make(0), make(1)];
  }, [halt, playAt]);

  const begin = useCallback(
    (n: number) => {
      ensure();
      r.current.active = true;
      r.current.ready = -1;
      setOn(true);
      setError(false);
      setFinished(false);
      setAudioModeAsync({ playsInSilentMode: true, shouldPlayInBackground: true, interruptionMode: 'doNotMix' }).catch(() => {});
      playAt(n);
    },
    [ensure, playAt],
  );

  const start = useCallback(
    (p: Passage, rec: ReciterId, n: number) => {
      closeRadio();
      halt(true);
      const list: [number, number][] = [];
      for (const [s, from, to] of p.parts) for (let a = from; a <= to; a++) list.push([s, a]);
      if (!list.length) return;
      Object.assign(r.current, { list, i: 0, round: 1, rounds: n, reciter: rec, title: p.title });
      setPassage(p);
      setReciter(rec);
      setRounds(n);
      begin(0);
    },
    [begin, halt],
  );

  const stop = useCallback(() => halt(), [halt]);

  const toggle = useCallback(() => {
    if (!passage) return;
    if (on) return stop();
    // Carry on from the ayah it stopped at (from the start of it), or begin again if it had finished.
    if (finished) r.current.round = 1;
    begin(finished ? 0 : r.current.i);
  }, [passage, on, finished, stop, begin]);

  const close = useCallback(() => {
    halt();
    setPassage(null);
    setError(false);
    setFinished(false);
  }, [halt]);

  useEffect(
    () =>
      registerSound({
        pause: () => halt(true),
        close: () => {
          halt(true);
          setPassage(null);
        },
      }),
    [halt],
  );
  useEffect(() => () => players.current?.forEach((p) => p.remove()), []);

  const now = passage && r.current.list[pos.at] ? r.current.list[pos.at] : null;
  return (
    <Ctx.Provider value={{ passage, reciter, on, loading, error, finished, at: pos.at, total: r.current.list.length, round: pos.round, rounds, now, start, toggle, stop, close }}>
      {children}
    </Ctx.Provider>
  );
}
