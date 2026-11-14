// Munib · which video is on air on the two Holy Mosque channels (for website/watch/, the app's Live TV player).
//
// YouTube's "embed/live_stream?channel=…" address answers "This video is unavailable" for these channels (Nov 2026),
// so the player embeds the live video by its own id, which this answers.
//  - With a YOUTUBE_API_KEY (Vercel → ayat-app-website → Settings → Environment Variables), it asks YouTube's official
//    Data API: is the known video still live? If not, which video is the channel broadcasting now?
//  - Without a key, it answers the video that was on air when last checked by hand (KNOWN below).
// YouTube's pages are never scraped (YouTube asks servers to sign in, and that isn't to be worked around).
// Only the two channels below can be asked about.

const CHANNELS = {
  makkah: 'UCos52azQNBgW63_9uDJoPDA', // KSA Qur'an TV (Saudi Broadcasting Authority), Masjid al-Haram
  madinah: 'UCROKYPep-UuODNwyipe6JMw', // Sunnah TV (Saudi Broadcasting Authority), Masjid an-Nabawi
};
// On air when last checked (15 Nov 2026). Sunnah TV had no live video on YouTube that day.
const KNOWN = { makkah: 'IsJTAdC3-Jw', madinah: null };

const api = async (path, params) => {
  const u = new URL('https://www.googleapis.com/youtube/v3/' + path);
  for (const [k, v] of Object.entries(params)) u.searchParams.set(k, v);
  u.searchParams.set('key', process.env.YOUTUBE_API_KEY);
  const r = await Promise.race([fetch(u), new Promise((_, no) => setTimeout(() => no(new Error('timeout')), 6000))]);
  if (!r.ok) throw new Error(String(r.status));
  return r.json();
};

/** True when this video is live now and may be embedded. Costs 1 of the day's 10,000 units. */
async function stillLive(id) {
  const j = await api('videos', { part: 'snippet,status', id });
  const v = (j.items || [])[0];
  return !!v && v.snippet && v.snippet.liveBroadcastContent === 'live' && v.status && v.status.embeddable !== false;
}

/** The video the channel is broadcasting now, or null. Costs 100 units, so only asked when the known one has ended. */
async function findLive(channelId) {
  const j = await api('search', { part: 'id', channelId, eventType: 'live', type: 'video', maxResults: '1' });
  const it = (j.items || [])[0];
  return (it && it.id && it.id.videoId) || null;
}

module.exports = async (req, res) => {
  const c = String((req.query || {}).c || '');
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  if (!CHANNELS[c]) {
    res.statusCode = 404;
    return res.end(JSON.stringify({ error: 'unknown channel' }));
  }
  let out = { id: KNOWN[c], checked: false };
  if (process.env.YOUTUBE_API_KEY) {
    try {
      if (KNOWN[c] && (await stillLive(KNOWN[c]))) out = { id: KNOWN[c], checked: true };
      else out = { id: await findLive(CHANNELS[c]), checked: true };
    } catch (e) {
      out = { id: KNOWN[c], checked: false };
    }
  }
  // On air: ask again after ten minutes. Not on air: after half an hour (that question costs more of the daily allowance).
  res.setHeader('Cache-Control', `public, s-maxage=${out.id ? 600 : 1800}, stale-while-revalidate=3600`);
  res.statusCode = 200;
  res.end(JSON.stringify(out));
};
