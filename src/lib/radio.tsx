import { AudioPlayer, createAudioPlayer, setAudioModeAsync } from 'expo-audio';
import { createContext, ReactNode, useCallback, useContext, useEffect, useRef, useState } from 'react';
import type { Station } from '@/data/live';

/**
 * Quran radio: one live stream at a time that keeps playing while you move around the app and with the phone locked
 * (expo-audio background playback, in the build since 1.1.0), shown in a small player above the tab bar.
 * One sound at a time: starting the radio stops the feed's recitation (and other players call stopRadio()).
 */
type RadioState = {
  station: Station | null;
  /** The radio is on (playing or connecting). */
  on: boolean;
  loading: boolean;
  play: (s: Station) => void;
  toggle: () => void;
  stop: () => void;
  /** Stop and hide the mini player. */
  close: () => void;
};

const Ctx = createContext<RadioState>({ station: null, on: false, loading: false, play: () => {}, toggle: () => {}, stop: () => {}, close: () => {} });
export const useRadio = () => useContext(Ctx);

let stopper: (() => void) | null = null;
/** Stop the radio from anywhere (e.g. when a story or a recitation starts). */
export const stopRadio = () => stopper?.();

export function RadioProvider({ children }: { children: ReactNode }) {
  const player = useRef<AudioPlayer | null>(null);
  const [station, setStation] = useState<Station | null>(null);
  const [on, setOn] = useState(false);
  const [loading, setLoading] = useState(false);

  const get = () => {
    if (!player.current) {
      player.current = createAudioPlayer(null, { updateInterval: 1000 });
      player.current.addListener('playbackStatusUpdate', (st) => {
        if (st.playing) setLoading(false);
        else if (!st.isBuffering && st.isLoaded) setLoading(false);
      });
    }
    return player.current;
  };

  const play = useCallback((s: Station) => {
    const p = get();
    setStation(s);
    setOn(true);
    setLoading(true);
    setAudioModeAsync({ playsInSilentMode: true, shouldPlayInBackground: true, interruptionMode: 'doNotMix' }).catch(() => {});
    try {
      p.replace({ uri: s.url });
      p.play();
      p.setActiveForLockScreen(true, { title: s.name, artist: `Munib Radio · ${s.sub}` });
    } catch {
      setLoading(false);
    }
  }, []);

  // keepMode: another player is taking over the sound, so leave the audio mode to it.
  const halt = useCallback((keepMode?: boolean) => {
    const p = player.current;
    setOn(false);
    setLoading(false);
    if (!p) return;
    try {
      p.pause();
      p.setActiveForLockScreen(false);
    } catch {}
    if (!keepMode) setAudioModeAsync({ shouldPlayInBackground: false, interruptionMode: 'mixWithOthers' }).catch(() => {});
  }, []);
  const stop = useCallback(() => halt(), [halt]);

  const toggle = useCallback(() => {
    if (on) stop();
    else if (station) play(station); // a live stream starts again at "now" rather than where it paused
  }, [on, station, play, stop]);

  const close = useCallback(() => {
    stop();
    setStation(null);
  }, [stop]);

  useEffect(() => {
    stopper = () => halt(true);
    return () => {
      stopper = null;
    };
  }, [halt]);

  useEffect(() => () => player.current?.remove(), []);

  return <Ctx.Provider value={{ station, on, loading, play, toggle, stop, close }}>{children}</Ctx.Provider>;
}

