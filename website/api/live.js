// Munib · which video is live right now on the two Holy Mosque channels (for website/watch/, the app's Live TV player).
// YouTube's "embed/live_stream?channel=…" address stopped working for these channels ("This video is unavailable",
// 14 Nov 2026), so this looks up the channel's current live video and the page embeds that video by its id instead.
// Only the two channels below can be asked about. Answers are kept for five minutes.

const CHANNELS = {
  makkah: 'UCos52azQNBgW63_9uDJoPDA', // KSA Qur'an TV (Saudi Broadcasting Authority), Masjid al-Haram
  madinah: 'UCROKYPep-UuODNwyipe6JMw', // Sunnah TV (Saudi Broadcasting Authority), Masjid an-Nabawi
};
const HEADERS = {
  'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.4 Safari/605.1.15',
  'Accept-Language': 'en-GB,en;q=0.9',
  // Says "cookies answered", so YouTube sends the page itself and not its cookie-consent page.
  Cookie: 'SOCS=CAI; CONSENT=YES+1',
};

const get = async (url) => {
  const r = await Promise.race([fetch(url, { headers: HEADERS, redirect: 'follow' }), new Promise((_, no) => setTimeout(() => no(new Error('timeout')), 6000))]);
  if (!r.ok) throw new Error(String(r.status));
  return r.text();
};

/** The channel's live video, from its /live page: { id, live } or null when nothing is on air. */
async function fromLivePage(channel) {
  const html = await get(`https://www.youtube.com/channel/${channel}/live`);
  const id = (/<link rel="canonical" href="https:\/\/www\.youtube\.com\/watch\?v=([\w-]{11})"/.exec(html) || /"videoDetails":\{"videoId":"([\w-]{11})"/.exec(html) || [])[1];
  if (!id) return null;
  const live = /"isLive":true|"isLiveNow":true/.test(html);
  const embed = !/"playableInEmbed":false/.test(html);
  return live && embed ? { id, live: true } : null;
}

module.exports = async (req, res) => {
  const c = String((req.query || {}).c || '');
  const channel = CHANNELS[c];
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.setHeader('Access-Control-Allow-Origin', '*');
  if (!channel) {
    res.statusCode = 404;
    return res.end(JSON.stringify({ error: 'unknown channel' }));
  }
  let out = { id: null, live: false, checked: false };
  if ((req.query || {}).debug) {
    // What YouTube sent this server, in brief (no personal data): for finding out why a look-up fails.
    try {
      const html = await get(`https://www.youtube.com/channel/${channel}/live`);
      return res.end(JSON.stringify({ len: html.length, title: (/<title>([^<]*)/.exec(html) || [])[1], canonical: (/<link rel="canonical" href="([^"]*)"/.exec(html) || [])[1], vd: (/"videoDetails":\{"videoId":"([\w-]{11})"/.exec(html) || [])[1], isLive: /"isLive":true/.test(html), isLiveNow: /"isLiveNow":true/.test(html), status: (/"playabilityStatus":\{"status":"([A-Z_]+)"/.exec(html) || [])[1], reason: (/"reason":"([^"]{0,120})/.exec(html) || [])[1], consent: /consent\.youtube|Before you continue/.test(html), ids: [...new Set([...html.matchAll(/"videoId":"([\w-]{11})"/g)].map((m) => m[1]))].slice(0, 5) }));
    } catch (e) {
      return res.end(JSON.stringify({ error: String(e && e.message) }));
    }
  }
  try {
    const v = await fromLivePage(channel);
    out = v ? { ...v, checked: true } : { id: null, live: false, checked: true };
  } catch (e) {
    out = { id: null, live: false, checked: false };
  }
  // Found: keep five minutes. Not found or couldn't look: ask again sooner.
  res.setHeader('Cache-Control', out.id ? 'public, s-maxage=300, stale-while-revalidate=600' : 'public, s-maxage=45');
  res.statusCode = 200;
  res.end(JSON.stringify(out));
};
