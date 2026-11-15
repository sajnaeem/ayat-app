// Munib · English read aloud for "A gathering of dua" (Supabase Edge Function "voice").
//
// Turns one English line (a translation of an established dua with the name of the person who has passed in it, or a
// short spoken link such as "We begin with Surah al-Fatihah") into speech with ElevenLabs, and returns the MP3.
// Only English: the Arabic is always a human reciter. Nothing is stored here: the phone keeps the audio so the same
// gathering can be played again without calling this. Signed-in readers only, 80 lines a day each (VOICE_PER_DAY).
//
// Secrets: ELEVENLABS_API_KEY (Saj adds it himself), optional ELEVENLABS_VOICE_ID (the voice Saj picks),
// ELEVENLABS_MODEL (default eleven_multilingual_v2).
//
// Request (POST JSON): { "text": "O Allah, forgive Naeem and have mercy on him…" }
// Answer: { "audio": "<base64 mp3>" } or { "error": "off" | "signin" | "limit" | … }

import { createClient } from 'npm:@supabase/supabase-js@2';

const KEY = Deno.env.get('ELEVENLABS_API_KEY') ?? '';
const VOICE = Deno.env.get('ELEVENLABS_VOICE_ID') ?? 'JBFqnCBsd6RMkjVDRZzb'; // "George", a warm British premade voice
const MODEL = Deno.env.get('ELEVENLABS_MODEL') ?? 'eleven_multilingual_v2';
const PER_DAY = Number(Deno.env.get('VOICE_PER_DAY') ?? 80);
const URL_ = Deno.env.get('SUPABASE_URL')!;
const ANON = Deno.env.get('SUPABASE_ANON_KEY')!;
const SERVICE = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const cors = { 'access-control-allow-origin': '*', 'access-control-allow-headers': 'authorization, x-client-info, apikey, content-type' };
const json = (b: unknown, status = 200) => new Response(JSON.stringify(b), { status, headers: { ...cors, 'content-type': 'application/json' } });

function b64(bytes: Uint8Array) {
  let s = '';
  for (let i = 0; i < bytes.length; i += 0x8000) s += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
  return btoa(s);
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors });
  if (!KEY) return json({ error: 'off' });
  const asUser = createClient(URL_, ANON, { global: { headers: { Authorization: req.headers.get('Authorization') ?? '' } } });
  const { data: who } = await asUser.auth.getUser();
  if (!who?.user) return json({ error: 'signin' }, 401);

  const body = await req.json().catch(() => ({}));
  const text = String(body.text ?? '').replace(/\s+/g, ' ').trim();
  if (text.length < 2 || text.length > 700) return json({ error: 'length' }, 400);
  // Latin letters only: this voice is for the English. The Arabic is never voiced by AI.
  if (/[؀-ۿ]/.test(text)) return json({ error: 'english only' }, 400);

  const admin = createClient(URL_, SERVICE);
  const { data: ok } = await admin.rpc('ai_take', { p_uid: who.user.id, p_what: 'voice', p_max: PER_DAY });
  if (!ok) return json({ error: 'limit' }, 429);

  const r = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${VOICE}?output_format=mp3_44100_64`, {
    method: 'POST',
    headers: { 'xi-api-key': KEY, 'content-type': 'application/json', accept: 'audio/mpeg' },
    body: JSON.stringify({ text, model_id: MODEL, voice_settings: { stability: 0.65, similarity_boost: 0.75, style: 0.1, speed: 0.9 } }),
  });
  if (!r.ok) return json({ error: `voice ${r.status}` }, 502);
  return json({ audio: b64(new Uint8Array(await r.arrayBuffer())) });
});
