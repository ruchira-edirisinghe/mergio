'use strict';
/* Follower counts for the follower goals overlay, one per chat source, looked up every so often.
   No logins needed:
     Twitch    Twitch's public GraphQL API (the same one twitch.tv uses)
     YouTube   the subscriber count on the channel page (or the YouTube Data API with your own free key)
     Kick      Kick's channel API
     TikTok    the public profile page, read in a hidden browser (TikTok blocks plain requests)
     Facebook  the Graph API with your Page token, or the public Page in a hidden browser
   While live, TikTok and Kick follow events update the number straight away (see the connectors). */
const settings = require('./settings');
const stats = require('./stats');
const { dumpDom } = require('./browser');
const { fetchText, fetchJson, curlJson, log } = require('./util');

const EVERY = { twitch: 60e3, youtube: 120e3, kick: 60e3, tiktok: 300e3, facebook: 300e3 };
const FB_TOKEN_EVERY = 60e3;
// Refresh can't look a channel up more often than this, so a stuck button or a script can't flood the platforms
// (which could get your IP rate limited) or start hidden browsers over and over.
const MIN_FORCED = 15e3;
const last = new Map();     // sourceId -> time of the last lookup
const busy = new Set();
const ytChannel = new Map(); // YouTube video id -> channel id
let timer = null;

/** "1,182" / "12.5K" / "1.2M" -> number */
function parseCount(txt) {
  const m = /([\d.,]+)\s*([KkMmBb]?)/.exec(String(txt || ''));
  if (!m) return null;
  const n = parseFloat(m[1].replace(/,/g, ''));
  return Number.isFinite(n) ? Math.round(n * ({ k: 1e3, m: 1e6, b: 1e9 }[m[2].toLowerCase()] || 1)) : null;
}

async function twitch(s) {
  const res = await fetch('https://gql.twitch.tv/gql', {
    method: 'POST', headers: { 'Client-Id': 'kimne78kx3ncx6brgo4mv6wki5h1ko', 'Content-Type': 'text/plain' },
    body: JSON.stringify({ query: `query{user(login:${JSON.stringify(s.target)}){followers{totalCount}}}` }),
    signal: AbortSignal.timeout(10000),
  });
  const n = (await res.json())?.data?.user?.followers?.totalCount;
  if (n == null) throw new Error('channel not found');
  return n;
}

async function youtube(s) {
  let path = s.target;
  if (/^[\w-]{11}$/.test(path)) { // a single video: find its channel once
    if (!ytChannel.has(path)) {
      if (ytChannel.size > 200) ytChannel.clear(); // keep memory bounded
      const html = await fetchText(`https://www.youtube.com/watch?v=${path}&hl=en`, { headers: { Cookie: 'SOCS=CAI; CONSENT=YES+1' } });
      ytChannel.set(path, /"channelId":"(UC[\w-]{22})"/.exec(html)?.[1] || '');
    }
    if (!ytChannel.get(path)) throw new Error('could not find the channel of this video');
    path = `channel/${ytChannel.get(path)}`;
  }
  const key = settings.get().advanced.youtubeApiKey?.trim();
  if (key) {
    const q = path.startsWith('@') ? `forHandle=${encodeURIComponent(path)}` : path.startsWith('channel/') ? `id=${path.slice(8)}` : `forUsername=${encodeURIComponent(path.split('/')[1])}`;
    const r = await fetchJson(`https://www.googleapis.com/youtube/v3/channels?part=statistics&${q}&key=${encodeURIComponent(key)}`);
    const st = r.items?.[0]?.statistics;
    if (st) return Number(st.subscriberCount);
  }
  // The channel header says "395 subscribers" (YouTube rounds big channels, like everywhere else).
  const html = await fetchText(`https://www.youtube.com/${path}?hl=en`, { headers: { Cookie: 'SOCS=CAI; CONSENT=YES+1' } });
  // The header's metadata row ("15.8M subscribers") has an accessibility label; featured channels don't.
  const m = /"content":"([\d.,]+[KMB]?) subscribers?"\},"accessibilityLabel"/.exec(html)
    || /"subscriberCountText":\{[^}]*?"simpleText":"([\d.,]+[KMB]?)/.exec(html);
  if (!m) throw new Error('subscriber count is hidden on this channel');
  return parseCount(m[1]);
}

async function kick(s) {
  const ch = await curlJson(`https://kick.com/api/v2/channels/${encodeURIComponent(s.target)}`);
  const n = ch?.followers_count ?? ch?.followersCount;
  if (n == null) throw new Error(ch?.message || 'channel not found');
  return n;
}

async function tiktok(s) {
  const html = await dumpDom(`https://www.tiktok.com/@${encodeURIComponent(s.target)}?lang=en`);
  const m = /"followerCount"\s*:\s*(\d+)/.exec(html);
  if (m) return Number(m[1]);
  const code = Number(/"webapp\.user-detail":\{"statusCode":(\d+)/.exec(html)?.[1]);
  if (code === 10221 || code === 10202) throw new Error('TikTok account not found (check the @name)');
  const t = /(\d[\d.,]*[KMB]?)\s*<\/strong>\s*<span[^>]*>\s*Followers/i.exec(html) || /(\d[\d.,]*[KMB]?)\s+Followers/i.exec(html);
  if (!t) throw new Error('could not read the profile (TikTok may have changed its page)');
  return parseCount(t[1]);
}

async function facebook(s) {
  if (!s.target.startsWith('page:')) throw new Error('add your Page (not one video) to count followers');
  const page = s.target.slice(5);
  const token = settings.get().advanced.facebookAccessToken?.trim();
  if (token) {
    try {
      const d = await fetchJson(`https://graph.facebook.com/v21.0/${encodeURIComponent(page === 'me' ? 'me' : page)}?fields=followers_count,fan_count&access_token=${encodeURIComponent(token)}`);
      const n = d.followers_count ?? d.fan_count;
      if (n != null) return n;
    } catch (e) { log('followers', `facebook graph: ${e.message}`); }
  }
  if (page === 'me') throw new Error('needs a Page token');
  const html = await dumpDom(`https://www.facebook.com/${encodeURIComponent(page)}`);
  const m = /(\d[\d.,]*[KMB]?)\s+followers/i.exec(html);
  if (!m) throw new Error('could not read the Page (check the Page name)');
  return parseCount(m[1]);
}

const LOOKUPS = { twitch, youtube, kick, tiktok, facebook };

async function lookup(s) {
  if (busy.has(s.id)) return;
  busy.add(s.id);
  last.set(s.id, Date.now());
  try {
    const raw = await LOOKUPS[s.platform](s);
    const n = raw == null || raw === '' ? NaN : Number(raw);
    if (n == null || !Number.isFinite(n)) throw new Error('could not read the number');
    stats.setFollowers(s.id, n);
  }
  catch (e) { stats.setFollowers(s.id, null, e.message); log('followers', `${s.platform} ${s.label}: ${e.message}`); }
  finally { busy.delete(s.id); }
}

function every(s) {
  if (s.platform === 'facebook' && settings.get().advanced.facebookAccessToken) return FB_TOKEN_EVERY;
  return EVERY[s.platform] || 120e3;
}

let wantedUntil = 0;   // the Follower goals page was open recently
let isWatched = () => false;
/** Something shows follower counts: the overlay is open somewhere, or the control panel page is. */
const wanted = () => settings.get().followers.enabled && (isWatched() || Date.now() < wantedUntil);

/** Looks up whatever is due. Lookups only run when something shows follower counts (or force). */
function tick(force = false) {
  if (!force && !wanted()) return;
  for (const s of settings.get().sources) {
    if (s.enabled === false || !LOOKUPS[s.platform]) continue;
    const since = Date.now() - (last.get(s.id) || 0);
    if (since >= every(s) || (force && since >= MIN_FORCED)) lookup(s);
  }
}

/** watched(): true while a follower goals overlay is connected. */
function start(watched) {
  if (watched) isWatched = watched;
  if (timer) return;
  setTimeout(() => tick(), 3000).unref?.();
  timer = setInterval(() => tick(), 15e3);
  timer.unref?.();
}

/** Look everything up again now (the Refresh button), and keep looking while the page stays open. */
function refresh(force = true) {
  wantedUntil = Date.now() + 10 * 60e3;
  if (settings.get().followers.enabled) tick(force);
}

module.exports = { start, refresh, parseCount, MIN_FORCED };
