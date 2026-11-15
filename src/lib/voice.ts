import { Platform } from 'react-native';
import { supabase } from './supabase';

/**
 * English lines read aloud by a voice (edge function `voice`, ElevenLabs) for "A gathering of dua".
 * Each line is made once and kept on the phone (documents/voice/<hash>.mp3), so a family playing the same gathering
 * every day only makes it the first time. On the web the audio is kept in memory for the visit.
 * Only ever English: the Arabic is always a human reciter.
 */

let FS: typeof import('expo-file-system') | null = null;
try {
  if (Platform.OS !== 'web') FS = require('expo-file-system');
} catch {
  FS = null;
}

const memory = new Map<string, string>();

/** A short, stable file name for a line (FNV-1a over the text, plus its length). */
function hash(text: string) {
  let h = 0x811c9dc5;
  for (let i = 0; i < text.length; i++) {
    h ^= text.charCodeAt(i);
    h = Math.imul(h, 0x01000193) >>> 0;
  }
  return `${h.toString(16)}-${text.length}`;
}

const B64 = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';
function fromB64(s: string) {
  const clean = s.replace(/[^A-Za-z0-9+/]/g, '');
  const out = new Uint8Array(Math.floor((clean.length * 3) / 4));
  let o = 0;
  for (let i = 0; i < clean.length; i += 4) {
    const n = (B64.indexOf(clean[i]) << 18) | (B64.indexOf(clean[i + 1]) << 12) | ((B64.indexOf(clean[i + 2]) & 63) << 6) | (B64.indexOf(clean[i + 3]) & 63);
    if (o < out.length) out[o++] = (n >> 16) & 255;
    if (o < out.length) out[o++] = (n >> 8) & 255;
    if (o < out.length) out[o++] = n & 255;
  }
  return out;
}

export type VoiceError = 'off' | 'signin' | 'limit' | 'failed';

/** The audio for a line: a file on the phone (or a data address on the web), made if it isn't there yet. */
export async function voiceLine(text: string): Promise<{ uri: string } | { error: VoiceError }> {
  const id = hash(text);
  if (memory.has(id)) return { uri: memory.get(id)! };
  let file: InstanceType<typeof import('expo-file-system').File> | null = null;
  if (FS) {
    try {
      const dir = new FS.Directory(FS.Paths.document, 'voice');
      if (!dir.exists) dir.create({ intermediates: true, idempotent: true });
      file = new FS.File(dir, `${id}.mp3`);
      if (file.exists && (file.size ?? 0) > 1000) {
        memory.set(id, file.uri);
        return { uri: file.uri };
      }
    } catch {
      file = null;
    }
  }
  if (!supabase) return { error: 'failed' };
  try {
    const { data, error } = await supabase.functions.invoke('voice', { body: { text } });
    const err = (data as { error?: string } | null)?.error ?? (error ? 'failed' : null);
    if (err || !data?.audio) {
      if (err === 'off' || err === 'signin' || err === 'limit') return { error: err };
      return { error: 'failed' };
    }
    if (file) {
      file.write(fromB64(data.audio));
      memory.set(id, file.uri);
      return { uri: file.uri };
    }
    const uri = `data:audio/mpeg;base64,${data.audio}`;
    memory.set(id, uri);
    return { uri };
  } catch {
    return { error: 'failed' };
  }
}
