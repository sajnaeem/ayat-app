// Mosques near a position, from Geoapify Places (OpenStreetMap data: © OpenStreetMap contributors, ODbL;
// "Powered by Geoapify" is shown in the app). Secret: GEOAPIFY_KEY (free plan, commercial use allowed).
// The position comes in rounded to ~1 km, is used only to pick a map square and sort by distance,
// and is never stored or logged. Each 0.1° square's results are kept CACHE_DAYS in osm_mosques.
import { createClient } from 'jsr:@supabase/supabase-js@2';

const cors = { 'access-control-allow-origin': '*', 'access-control-allow-headers': 'authorization, x-client-info, apikey, content-type' };
const json = (b: unknown, status = 200) => new Response(JSON.stringify(b), { status, headers: { ...cors, 'content-type': 'application/json' } });
const admin = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!, { auth: { persistSession: false } });
const KEY = Deno.env.get('GEOAPIFY_KEY');

const CELL = 0.1;
const RADIUS = 13000; // metres around the square's centre: covers the square plus about 6 km around it
const CACHE_DAYS = Number(Deno.env.get('NEARBY_CACHE_DAYS') ?? 7);

type Place = { id: string; n: string; la: number; lo: number; w?: string; a?: string };

async function fetchCell(cy: number, cx: number): Promise<Place[] | null> {
  const lat = (cy + 0.5) * CELL, lon = (cx + 0.5) * CELL;
  const q = new URLSearchParams({
    categories: 'religion.place_of_worship.islam',
    filter: `circle:${lon.toFixed(4)},${lat.toFixed(4)},${RADIUS}`,
    bias: `proximity:${lon.toFixed(4)},${lat.toFixed(4)}`,
    limit: '200',
    lang: 'en',
    apiKey: KEY!,
  });
  try {
    const r = await fetch(`https://api.geoapify.com/v2/places?${q}`, { signal: AbortSignal.timeout(15000) });
    if (!r.ok) return null;
    const d = await r.json();
    if (!Array.isArray(d.features)) return null;
    return d.features
      .map((f: any) => {
        const p = f.properties ?? {};
        const raw = p.datasource?.raw ?? {};
        const web = p.website ?? raw.website ?? raw['contact:website'];
        const la = p.lat ?? f.geometry?.coordinates?.[1];
        const lo = p.lon ?? f.geometry?.coordinates?.[0];
        if (typeof la !== 'number' || typeof lo !== 'number') return null;
        const a = [p.address_line2, p.postcode && !String(p.address_line2 ?? '').includes(p.postcode) ? p.postcode : null].filter(Boolean).join(', ');
        return {
          id: String(p.place_id ?? `${la},${lo}`).slice(0, 80),
          n: String(p.name ?? raw['name:en'] ?? raw.name ?? 'Mosque').slice(0, 120),
          la: Math.round(la * 1e5) / 1e5,
          lo: Math.round(lo * 1e5) / 1e5,
          ...(web ? { w: String(web).slice(0, 300) } : {}),
          ...(a ? { a: a.slice(0, 160) } : {}),
        };
      })
      .filter(Boolean) as Place[];
  } catch {
    return null;
  }
}

const rad = (d: number) => (d * Math.PI) / 180;
function metres(a: number, b: number, c: number, d: number) {
  const x = Math.sin(rad(c - a) / 2) ** 2 + Math.cos(rad(a)) * Math.cos(rad(c)) * Math.sin(rad(d - b) / 2) ** 2;
  return Math.round(6371000 * 2 * Math.atan2(Math.sqrt(x), Math.sqrt(1 - x)));
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors });
  if (!KEY) return json({ error: 'off' }, 503);
  try {
    const { lat, lon } = await req.json();
    if (typeof lat !== 'number' || typeof lon !== 'number' || Math.abs(lat) > 85 || Math.abs(lon) > 180) return json({ error: 'position' }, 400);
    const cy = Math.floor(lat / CELL), cx = Math.floor(lon / CELL);
    const cell = `${cy}:${cx}`;
    const { data: hit } = await admin.from('osm_mosques').select('places, fetched_at').eq('cell', cell).maybeSingle();
    let places: Place[] | null = hit && Date.now() - new Date(hit.fetched_at).getTime() < CACHE_DAYS * 86400000 ? (hit.places as Place[]) : null;
    if (!places) {
      places = await fetchCell(cy, cx);
      if (places) await admin.from('osm_mosques').upsert({ cell, places, fetched_at: new Date().toISOString() });
      else if (hit) places = hit.places as Place[];
      else return json({ error: 'busy' }, 503);
    }
    const list = places
      .map((p) => ({ ...p, m: metres(lat, lon, p.la, p.lo) }))
      .filter((p) => p.m <= 15000)
      .sort((a, b) => a.m - b.m)
      .slice(0, 40);
    return json({ places: list });
  } catch {
    return json({ error: 'failed' }, 500);
  }
});
