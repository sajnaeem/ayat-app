// Munib · Quran Foundation proxy (Supabase Edge Function "qf").
//
// The app never sees the Quran Foundation secret. It asks this function for a surah,
// and this function signs in to the Quran Foundation API with the secret stored in
// Supabase (Edge Functions → Secrets → QF_CLIENT_SECRET) and returns a compact list.
//
// Requests (POST JSON):
//   { "s": 2, "lang": "en" }        → { "by": "Saheeh International", "ayat": [{ "n": 1, "ar": "…", "tl": "…", "tr": "…" }, …] }
//   { "reciters": true }            → the ayah-by-ayah recitations Quran Foundation offers
//   { "s": 1, "audio": 7 }          → per-ayah audio for a surah, with word timings where available

const CLIENT_ID = Deno.env.get('QF_CLIENT_ID') ?? '833c983e-411c-47ae-8ebf-c46abc965f13'; // production client (not secret)
const SECRET = Deno.env.get('QF_CLIENT_SECRET') ?? '';
const AUTH = 'https://oauth2.quran.foundation/oauth2/token';
const API = 'https://apis.quran.foundation/content/api/v4';

// Translation resources on Quran Foundation, by app language. 57 is the full-ayah transliteration.
const TRANSLATIONS: Record<string, { id: number; by: string }> = {
  en: { id: 20, by: 'Saheeh International' },
  ur: { id: 97, by: "Abul A'la Maududi" },
  bn: { id: 161, by: 'Taisirul Quran' },
  id: { id: 33, by: 'Indonesian Ministry of Religious Affairs' },
  tr: { id: 77, by: 'Diyanet İşleri' },
  fr: { id: 31, by: 'Muhammad Hamidullah' },
  es: { id: 83, by: 'Muhammad Isa García' },
};
const TRANSLITERATION = 57;

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

let token: { value: string; until: number } | null = null;

async function getToken(): Promise<string> {
  if (token && Date.now() < token.until) return token.value;
  const r = await fetch(AUTH, {
    method: 'POST',
    headers: {
      Authorization: 'Basic ' + btoa(`${CLIENT_ID}:${SECRET}`),
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: 'grant_type=client_credentials&scope=content',
  });
  if (!r.ok) throw new Error(`token ${r.status}`);
  const d = await r.json();
  // Tokens last an hour; renew a few minutes early.
  token = { value: d.access_token, until: Date.now() + Math.max(60, (d.expires_in ?? 3600) - 300) * 1000 };
  return token.value;
}

async function qf(path: string): Promise<any> {
  for (let attempt = 0; attempt < 2; attempt++) {
    const r = await fetch(API + path, { headers: { 'x-auth-token': await getToken(), 'x-client-id': CLIENT_ID } });
    if (r.status === 401 && attempt === 0) {
      token = null; // expired early: get a fresh one and retry once
      continue;
    }
    if (!r.ok) throw new Error(`api ${r.status}`);
    return r.json();
  }
}

/** Translations come with footnote markers like <sup foot_note=123>1</sup>; keep only the words. */
const plain = (s: string) =>
  s.replace(/<sup[^>]*>.*?<\/sup>/g, '').replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim();

type Ayah = { n: number; ar: string; tl: string; tr: string };

async function chapter(s: number, lang: string): Promise<Ayah[]> {
  const t = TRANSLATIONS[lang] ?? TRANSLATIONS.en;
  const q = (page: number) =>
    `/verses/by_chapter/${s}?translations=${t.id},${TRANSLITERATION}&fields=text_uthmani&per_page=50&page=${page}`;
  const first = await qf(q(1));
  const pages = first.pagination?.total_pages ?? 1;
  const rest = await Promise.all(Array.from({ length: pages - 1 }, (_, i) => qf(q(i + 2))));
  const verses = [first, ...rest].flatMap((d) => d.verses ?? []);
  return verses.map((v: any) => {
    const trs: any[] = v.translations ?? [];
    return {
      n: v.verse_number,
      ar: v.text_uthmani ?? '',
      tl: plain(trs.find((x) => x.resource_id === TRANSLITERATION)?.text ?? ''),
      tr: plain(trs.find((x) => x.resource_id === t.id)?.text ?? ''),
    };
  });
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS });
  const json = (body: unknown, status = 200, extra: Record<string, string> = {}) =>
    new Response(JSON.stringify(body), { status, headers: { ...CORS, 'Content-Type': 'application/json', ...extra } });
  try {
    if (!SECRET) return json({ error: 'QF_CLIENT_SECRET is not set' }, 500);
    const body = req.method === 'POST' ? await req.json() : Object.fromEntries(new URL(req.url).searchParams);
    if (body.reciters) {
      const d = await qf('/resources/recitations?language=en');
      return json(d, 200, { 'Cache-Control': 'public, max-age=86400' });
    }
    const s = Number(body.s);
    const lang = String(body.lang ?? 'en');
    if (!Number.isInteger(s) || s < 1 || s > 114) return json({ error: 'bad surah' }, 400);
    if (body.audio) {
      const id = Number(body.audio);
      const q = (page: number) => `/recitations/${id}/by_chapter/${s}?fields=segments,duration&per_page=50&page=${page}`;
      const first = await qf(q(1));
      const pages = first.pagination?.total_pages ?? 1;
      const rest = await Promise.all(Array.from({ length: pages - 1 }, (_, i) => qf(q(i + 2))));
      const files = [first, ...rest].flatMap((d) => d.audio_files ?? []);
      return json({ files }, 200, { 'Cache-Control': 'public, max-age=86400' });
    }
    const ayat = await chapter(s, lang);
    return json({ by: (TRANSLATIONS[lang] ?? TRANSLATIONS.en).by, ayat }, 200, { 'Cache-Control': 'public, max-age=86400' });
  } catch (e) {
    return json({ error: String((e as Error).message ?? e) }, 502);
  }
});
