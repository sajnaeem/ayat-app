import { createAudioPlayer } from 'expo-audio';

/**
 * Small sound effects (Saj, 15 Nov 2026: a sound every time a daily deed is ticked, and one when the list is done).
 * Made by scripts/make-deed-sounds.py from shaped air only: no musical notes or instruments. Quiet, and the phone's
 * silent switch is respected (the default audio mode doesn't play in silent mode). No sound is always fine.
 */
const FILES = {
  tick: require('../../assets/sounds/tick.mp3'),
  done: require('../../assets/sounds/done.mp3'),
};
const VOLUME = { tick: 0.6, done: 0.8 };
type Sfx = keyof typeof FILES;
const players: Partial<Record<Sfx, ReturnType<typeof createAudioPlayer>>> = {};

export function playSfx(name: Sfx) {
  try {
    const p = (players[name] ??= createAudioPlayer(FILES[name]));
    p.volume = VOLUME[name];
    p.seekTo(0).catch(() => {});
    p.play();
  } catch {
    // no sound is fine
  }
}
