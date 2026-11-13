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
//   { "s": 1, "words": true, "lang": "en" } → word-by-word: { words: { "1": [[arabic, meaning, transliteration], …] } }
//   { "key": "2:255", "tafsir": true, "lang": "en" } → { by, keys: ["2:255"], html } (Ibn Kathir)
//   { "page": 3 }                   → one Madani Mushaf page, line by line (QCF V2 glyph codes), for page view
//   { "offline": 7, "s": 2 }        → a reciter's audio list for a surah from the synced copy, for downloading
//   { "sync": true }                → keeps the synced copy fresh (called daily by pg_cron; see 014_offline_audio.sql)
//
// Deployed with JWT verification off, so people can read the Quran tab before signing in.
// It only ever returns public Quran content.

import { createClient } from 'npm:@supabase/supabase-js@2';

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

// Tafsir Ibn Kathir: English (abridged), Urdu and Bengali; other languages read the English.
const TAFSIR: Record<string, { id: number; by: string }> = {
  en: { id: 169, by: 'Tafsir Ibn Kathir (abridged)' },
  ur: { id: 160, by: 'Tafsir Ibn Kathir' },
  bn: { id: 164, by: 'Tafsir Ibn Kathir' },
};
// Word-by-word meanings exist in these languages; others use English.
const WORD_LANGS = new Set(['en', 'ur', 'bn', 'id', 'tr']);

// Recitations the app offers (Alafasy, Sudais, al-Husary, al-Minshawi), kept in sync for offline listening.
const RECITATIONS = [7, 3, 6, 9];
const admin = createClient(Deno.env.get('SUPABASE_URL') ?? '', Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '', { auth: { persistSession: false } });

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

/* ---------- search: the whole Quran, in Arabic and in translation (QF Search API, scope "search") ---------- */

let searchToken: { value: string; until: number } | null = null;
async function getSearchToken(): Promise<string> {
  if (searchToken && Date.now() < searchToken.until) return searchToken.value;
  const r = await fetch(AUTH, {
    method: 'POST',
    headers: { Authorization: 'Basic ' + btoa(`${CLIENT_ID}:${SECRET}`), 'Content-Type': 'application/x-www-form-urlencoded' },
    body: 'grant_type=client_credentials&scope=search',
  });
  if (!r.ok) throw new Error(`search token ${r.status}`);
  const d = await r.json();
  searchToken = { value: d.access_token, until: Date.now() + Math.max(60, (d.expires_in ?? 3600) - 300) * 1000 };
  return searchToken.value;
}

async function searchQuran(query: string, lang: string) {
  const t = TRANSLATIONS[lang] ?? TRANSLATIONS.en;
  const qs = new URLSearchParams({
    mode: 'quick',
    query,
    get_text: '1',
    highlight: '1',
    versesResultsNumber: '30',
    navigationalResultsNumber: '5',
    translation_ids: String(t.id),
    filter_translations: String(t.id),
  });
  for (let attempt = 0; attempt < 2; attempt++) {
    const r = await fetch(`https://apis.quran.foundation/search/api/v1/search?${qs}`, { headers: { 'x-auth-token': await getSearchToken(), 'x-client-id': CLIENT_ID } });
    if (r.status === 401 && attempt === 0) {
      searchToken = null;
      continue;
    }
    if (!r.ok) throw new Error(`search ${r.status}`);
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

/* ---------- page view: one Madani Mushaf page, line by line ---------- */

type Line = { n: number; t: 'w'; w: [string, string, string, number, number][] } | { n: number; t: 'h' | 'b'; s: number } | { n: number; t: 'e' };

async function mushafPage(p: number) {
  const q = (page: number) =>
    `/verses/by_page/${p}?mushaf=1&words=true&word_fields=code_v2,text_qpc_hafs,line_number,position&fields=chapter_id,verse_number&per_page=50&page=${page}`;
  const first = await qf(q(1));
  const pages = first.pagination?.total_pages ?? 1;
  const rest = await Promise.all(Array.from({ length: pages - 1 }, (_, i) => qf(q(i + 2))));
  const verses: any[] = [first, ...rest].flatMap((d) => d.verses ?? []);
  const byLine = new Map<number, [string, string, string, number, number][]>();
  const firstLineOf = new Map<number, number>(); // surah → first line its words appear on, when it starts on this page
  for (const v of verses) {
    for (const w of v.words ?? []) {
      const n = Number(w.line_number);
      if (!byLine.has(n)) byLine.set(n, []);
      // [glyph code, ayah key, plain text (fallback while the page font loads), 1 if this is the ayah-end marker, position in the ayah]
      byLine.get(n)!.push([w.code_v2 ?? '', v.verse_key, w.text_qpc_hafs ?? '', w.char_type_name === 'end' ? 1 : 0, Number(w.position) || 0]);
      if (v.verse_number === 1 && !firstLineOf.has(v.chapter_id)) firstLineOf.set(v.chapter_id, n);
    }
  }
  const last = p <= 2 ? 8 : 15;
  const lines: Line[] = [];
  for (let n = 1; n <= last; n++) {
    const w = byLine.get(n);
    lines.push(w ? { n, t: 'w', w } : { n, t: 'e' });
  }
  // Empty lines just before a surah starts hold its name and (except al-Fatihah and at-Tawbah) the basmalah.
  for (const [s, n] of firstLineOf) {
    let at = n - 2; // index of the line before
    if (s !== 1 && s !== 9 && lines[at]?.t === 'e') {
      lines[at] = { n: at + 1, t: 'b', s };
      at--;
    }
    if (lines[at]?.t === 'e') lines[at] = { n: at + 1, t: 'h', s };
  }
  return { p, lines };
}

/* ---------- offline audio: a synced copy of each reciter's ayah audio list ---------- */

const absoluteAudio = (u: string) => (/^https?:/.test(u) ? u : u.startsWith('//') ? `https:${u}` : `https://verses.quran.com/${u.replace(/^\//, '')}`);
const fromV4 = (path: string) => path.replace(/^\/api\/v4/, '').replace(/^\/content\/api\/v4/, '');

function rowOf(recitation: number, r: any) {
  return {
    recitation,
    s: r.chapter_id,
    a: r.verse_number,
    file_id: r.id ?? null,
    url: r.url,
    seg: (r.segments ?? []).filter((g: any) => Array.isArray(g) && g.length >= 4).map((g: number[]) => [g[1], g[2], g[3]]),
    updated_at: r.updated_at ?? null,
  };
}

async function replaceAll(recitation: number, snapshotPath: string) {
  const snap = await qf(fromV4(snapshotPath));
  const rows = (snap.records ?? []).filter((r: any) => (r.record_type ?? 'audio_file') === 'audio_file' && r.verse_key).map((r: any) => rowOf(recitation, r));
  if (!rows.length) throw new Error('empty snapshot');
  const { error: delErr } = await admin.from('qf_audio').delete().eq('recitation', recitation);
  if (delErr) throw delErr;
  for (let i = 0; i < rows.length; i += 1000) {
    const { error } = await admin.from('qf_audio').insert(rows.slice(i, i + 1000));
    if (error) throw error;
  }
  return rows.length;
}

async function syncRecitation(id: number, force = false): Promise<{ id: number; changes?: number; skipped?: boolean; rows?: number }> {
  const filter = `recitations:${id}`;
  const { data: st } = await admin.from('qf_sync').select('*').eq('filter', filter).maybeSingle();
  if (!force && st?.token && Date.now() - Date.parse(st.synced_at) < 6 * 86400000) return { id, skipped: true };
  let tokenIn: string | null = st?.token ?? null;
  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      let path = tokenIn
        ? `/resources/sync?resources=${filter}&sync_token=${encodeURIComponent(tokenIn)}&per_page=100`
        : `/resources/sync?resources=${filter}&bootstrap=true&per_page=100`;
      let changes = 0;
      let rows = st?.rows ?? 0;
      for (let guard = 0; guard < 500; guard++) {
        const d = (await qf(path)).sync;
        for (const m of d.mutations ?? []) {
          if (m.resource_group !== 'recitations' || m.resource_id !== id) continue;
          if ((m.type === 'RESOURCE_CREATE' || m.type === 'RESOURCE_INVALIDATE') && m.snapshot_url) {
            rows = await replaceAll(id, m.snapshot_url);
            changes++;
          } else if (m.type === 'RESOURCE_DELETE') {
            await admin.from('qf_audio').delete().eq('recitation', id);
            rows = 0;
            changes++;
          } else if ((m.type === 'ROW_CREATE' || m.type === 'ROW_UPDATE') && m.data?.verse_key) {
            await admin.from('qf_audio').upsert(rowOf(id, m.data));
            changes++;
          } else if (m.type === 'ROW_DELETE') {
            const fid = Number(m.source_record_id ?? m.record_key);
            if (fid) await admin.from('qf_audio').delete().eq('recitation', id).eq('file_id', fid);
            changes++;
          }
        }
        if (d.has_more && d.next_page_url) path = fromV4(d.next_page_url);
        else {
          const { error } = await admin.from('qf_sync').upsert({ filter, token: d.next_sync_token, synced_at: new Date().toISOString(), rows });
          if (error) throw error;
          return { id, changes, rows };
        }
      }
      throw new Error('sync did not finish');
    } catch (e) {
      // The checkpoint is too old or doesn't match: start again from a full copy.
      if (tokenIn && /api (410|422)/.test(String((e as Error).message))) {
        tokenIn = null;
        continue;
      }
      throw e;
    }
  }
  throw new Error('sync failed');
}

async function syncAll(force: boolean) {
  const out = [];
  const started = Date.now();
  for (const id of RECITATIONS) {
    if (Date.now() - started > 100000) break; // leave the rest for the next run
    try {
      out.push(await syncRecitation(id, force));
    } catch (e) {
      out.push({ id, error: String((e as Error).message ?? e) });
    }
  }
  return { results: out };
}

async function offlineSurah(id: number, s: number) {
  const { data: st } = await admin.from('qf_sync').select('synced_at, token').eq('filter', `recitations:${id}`).maybeSingle();
  // Never hand out a copy that hasn't been synced in the last 7 days.
  if (!st?.token || Date.now() - Date.parse(st.synced_at) > 7 * 86400000) await syncRecitation(id, true);
  const { data, error } = await admin.from('qf_audio').select('a, url, seg, updated_at').eq('recitation', id).eq('s', s).order('a');
  if (error) throw error;
  return { files: (data ?? []).map((r) => ({ a: r.a, url: absoluteAudio(r.url), w: r.seg ?? [], v: r.updated_at })) };
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
    if (body.tafsir) {
      const key = String(body.key ?? '');
      if (!/^\d{1,3}:\d{1,3}$/.test(key)) return json({ error: 'bad key' }, 400);
      const t = TAFSIR[String(body.lang ?? 'en')] ?? TAFSIR.en;
      const d = await qf(`/tafsirs/${t.id}/by_ayah/${key}`);
      const tf = d.tafsir ?? {};
      const verses = tf.verses ?? {};
      const html = tf.text ?? (Object.values(verses)[0] as any)?.text ?? '';
      return json({ by: t.by, keys: Object.keys(verses), html }, 200, { 'Cache-Control': 'public, max-age=86400' });
    }
    if (body.search) {
      const q = String(body.search).trim().slice(0, 80);
      if (q.length < 2) return json({ error: 'too short' }, 400);
      const d = await searchQuran(q, String(body.lang ?? 'en'));
      return json(body.raw ? d : d, 200, { 'Cache-Control': 'public, max-age=3600' });
    }
    if (body.sync) return json(await syncAll(false));
    if (body.offline) {
      const id = Number(body.offline);
      const sn = Number(body.s);
      if (!RECITATIONS.includes(id) || !Number.isInteger(sn) || sn < 1 || sn > 114) return json({ error: 'bad request' }, 400);
      return json(await offlineSurah(id, sn));
    }
    if (body.page) {
      const p = Number(body.page);
      if (!Number.isInteger(p) || p < 1 || p > 604) return json({ error: 'bad page' }, 400);
      return json(await mushafPage(p), 200, { 'Cache-Control': 'public, max-age=86400' });
    }
    const s = Number(body.s);
    const lang = String(body.lang ?? 'en');
    if (!Number.isInteger(s) || s < 1 || s > 114) return json({ error: 'bad surah' }, 400);
    if (body.words) {
      const wl = WORD_LANGS.has(lang) ? lang : 'en';
      const q = (page: number) =>
        `/verses/by_chapter/${s}?words=true&language=${wl}&word_fields=text_uthmani&fields=verse_number&per_page=50&page=${page}`;
      const first = await qf(q(1));
      const pages = first.pagination?.total_pages ?? 1;
      const rest = await Promise.all(Array.from({ length: pages - 1 }, (_, i) => qf(q(i + 2))));
      const words: Record<string, [string, string, string][]> = {};
      for (const v of [first, ...rest].flatMap((d) => d.verses ?? [])) {
        words[v.verse_number] = (v.words ?? [])
          .filter((w: any) => w.char_type_name === 'word')
          .map((w: any) => [w.text_uthmani ?? w.text ?? '', w.translation?.text ?? '', w.transliteration?.text ?? '']);
      }
      return json({ lang: wl, words }, 200, { 'Cache-Control': 'public, max-age=86400' });
    }
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
