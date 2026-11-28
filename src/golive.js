'use strict';
/**
 * Go-live post: when you start streaming, Mergio posts "I'm live" with the stream's title and link, plus your
 * other channels, to Discord, Telegram, Slack or any app that takes a webhook. It posts once per stream: a
 * restart of Mergio or a platform that joins a minute later doesn't post again.
 */
const fs = require('node:fs');
const path = require('node:path');
const settings = require('./settings');
const discord = require('./discord');
const { DATA_DIR, log } = require('./util');

const FILE = path.join(DATA_DIR, 'golive.json');
const ORDER = ['youtube', 'twitch', 'facebook', 'tiktok', 'kick'];
const NAMES = { youtube: 'YouTube', twitch: 'Twitch', kick: 'Kick', tiktok: 'TikTok', facebook: 'Facebook' };
const DOTS = { youtube: '🔴', twitch: '🟣', kick: '🟢', tiktok: '⚫', facebook: '🔵' };
const LINK_KEY = { youtube: 'linkYoutube', twitch: 'linkTwitch', kick: 'linkKick', tiktok: 'linkTiktok', facebook: 'linkFacebook' };
const QUIET_ENDS = 15 * 60e3;  // nothing live for this long: the stream is over, the next one gets a new post
const LOOK_EVERY = 15e3;       // Twitch and Kick say they're live through their viewer count, which isn't an event
const RECHECK = 30e3;          // a scheduled YouTube stream: look again this often until it starts
const HISTORY = 10;
const MAX_POST = 2000;         // Discord's limit per message
// MERGIO_YTIMG: a stand-in for YouTube's thumbnail server in the self-test (npm run check)
const ytimg = () => process.env.MERGIO_YTIMG || 'https://i.ytimg.com';
const THUMBS = ['maxresdefault_live.jpg', 'maxresdefault.jpg', 'hqdefault_live.jpg', 'hqdefault.jpg']; // biggest first

/* ---------- the post ---------- */

/** A channel's public link from its chat source, live or not. */
function channelLink(source, conn) {
  const t = source.target;
  switch (source.platform) {
    case 'youtube': return /^[\w-]{11}$/.test(t) ? `https://www.youtube.com/watch?v=${t}` : `https://www.youtube.com/${encodeURI(t)}/live`;
    case 'twitch': return `https://www.twitch.tv/${t}`;
    case 'kick': return `https://kick.com/${t}`;
    case 'tiktok': return `https://www.tiktok.com/@${t}/live`;
    case 'facebook': {
      if (!t.startsWith('page:')) return `https://www.facebook.com/watch/live/?v=${encodeURIComponent(t)}`;
      const page = t.slice(5) === 'me' ? conn?.page?.id : t.slice(5);
      return page ? `https://www.facebook.com/${encodeURIComponent(page)}` : '';
    }
    default: return '';
  }
}

/**
 * Fills the message template. A line whose placeholders (other than {mention} and {name}) are all empty is left
 * out, so "🎬 {title}" disappears when there is no title and {others} when there are no other channels.
 */
function render(template, vars) {
  const lines = [];
  for (const line of String(template).split('\n')) {
    const keys = [...line.matchAll(/\{(\w+)\}/g)].map(m => m[1]).filter(k => Object.hasOwn(vars, k));
    const content = keys.filter(k => k !== 'mention' && k !== 'name');
    if (content.length && content.every(k => !vars[k])) continue;
    lines.push(line.replace(/\{(\w+)\}/g, (m, k) => (Object.hasOwn(vars, k) ? vars[k] : m)).replace(/^[ \t]+|[ \t]+$/g, ''));
  }
  return lines.join('\n').replace(/\n{3,}/g, '\n\n').trim().slice(0, MAX_POST);
}

/**
 * Everything a post needs: { platform, url, title, name, links: { youtube: url, … } }.
 * dest changes the details: on Discord the ping goes in and only the stream gets a preview card.
 */
function textFor(post, g, dest, mention = '') {
  const others = ORDER.filter(p => p !== post.platform && post.links[p]);
  // On Discord <link> stops the extra link previews, so only the stream itself gets a big card. A YouTube stream
  // gets Mergio's own card (see cardFor) with every live link in it, so its link is kept plain too, or Discord
  // would add a second card, and the "Also live on" list is left to the card.
  const card = dest === 'discord' && hasCard(post);
  const wrap = url => (dest === 'discord' ? `<${url}>` : url);
  const link = card ? wrap(post.url) : post.url;
  const own = p => (p === post.platform ? link : wrap(post.links[p]));
  const line = p => `${DOTS[p]} ${NAMES[p]}: ${own(p)}`;
  const all = ORDER.filter(p => post.links[p]);
  const vars = Object.fromEntries([
    ['mention', dest === 'discord' ? mention : ''],
    ['name', post.name], ['title', post.title], ['link', link], ['platform', NAMES[post.platform] || ''],
    ['others', others.length && !card ? ['Also live on:', ...others.map(line)].join('\n') : ''],
    ['all', all.map(line).join('\n')],
    ...ORDER.map(p => [p, post.links[p] ? own(p) : '']),
  ]);
  return render(dest === 'caption' ? g.caption : g.message, vars);
}

/** A YouTube stream that has started gets a card with its thumbnail; Discord's own preview of a live link often has none. */
const hasCard = post => post.platform === 'youtube' && !!post.thumb && !!post.url;

/**
 * The Discord card for a YouTube stream, without its picture: who is live, the title linking to the stream,
 * every live link, and under the thumbnail the channel names. YouTube red.
 */
function cardBody(post) {
  const live = ORDER.filter(p => post.links[p]);
  const tags = live.filter(p => post.handles?.[p]).map(p => `${DOTS[p]} ${post.handles[p]}`);
  return {
    color: 0xff0000,
    author: { name: (post.name ? `${post.name} is live on YouTube` : 'Live on YouTube').slice(0, 256) },
    title: (post.title || 'Watch the stream').slice(0, 256),
    url: post.url,
    description: live.map(p => `${DOTS[p]} ${NAMES[p]}: ${post.links[p]}`).join('\n').slice(0, 4000),
    ...(tags.length ? { footer: { text: tags.join('  ·  ').slice(0, 2000) } } : {}),
  };
}

/** The card a post gets on Discord, with the stream's biggest thumbnail. */
async function cardFor(post) {
  if (!hasCard(post)) return null;
  return { ...cardBody(post), image: { url: await thumbUrl(post.thumb) }, timestamp: new Date().toISOString() };
}

/** Where posts go by themselves: the Discord channels, once the bot's token and a channel are filled in. */
function destinations(g) {
  return { discord: !!(g.discordBotToken && g.discordTargets.length) };
}

/* ---------- sending ---------- */

/** Posts to every Discord channel in the list. Tests ping nobody. */
async function sendAll(post, g) {
  if (!destinations(g).discord) return [];
  let found;
  try { found = await discord.resolve(g.discordBotToken, g.discordTargets); }
  catch (e) { return [{ dest: 'discord', label: 'Discord', ok: false, error: (await discord.check(g.discordBotToken, [])).error || e.message }]; }
  const card = found.some(r => r.ok) ? await cardFor(post) : null;
  return Promise.all(found.map(r => (r.ok
    ? discord.send(g.discordBotToken, r, textFor(post, g, 'discord', post.test ? '' : r.mention.text), { url: post.url, test: post.test, embeds: card ? [card] : [] })
    : { dest: 'discord', label: r.label, ok: false, error: r.error })));
}

/* ---------- when to post ---------- */

let store = load();
function load() {
  try {
    const s = JSON.parse(fs.readFileSync(FILE, 'utf8'));
    return { keys: Array.isArray(s.keys) ? s.keys.slice(-20) : [], open: !!s.open, platform: s.platform || '', liveAt: Number(s.liveAt) || 0, history: Array.isArray(s.history) ? s.history.slice(0, HISTORY) : [] };
  } catch { return { keys: [], open: false, platform: '', liveAt: 0, history: [] }; }
}
function persist() {
  try { fs.writeFileSync(FILE, JSON.stringify(store, null, 2), { mode: 0o600 }); } catch (e) { log('golive', `could not save: ${e.message}`); }
}

/**
 * Should this stream get a post? A stream with an id (YouTube, Facebook, TikTok) posts once per id; one without
 * (Twitch, Kick) posts once per streaming session. While a session is open, another platform going live is the
 * same stream, so it doesn't post again.
 */
function isNew(st, platform, key) {
  if (st.open && st.platform && platform !== st.platform) return false;
  return key ? !st.keys.includes(key) : !st.open;
}

let manager = null, onChange = () => {}, pending = null, timer = null;
const rechecked = new Map(); // source id -> when its scheduled stream was last looked at

/** The chats that are live right now, for the platforms the trigger allows, in a fixed order. */
function liveNow(trigger) {
  const out = [];
  for (const s of settings.get().sources) {
    const c = manager?.running.get(s.id);
    if (!c || s.enabled === false || (trigger !== 'any' && s.platform !== trigger)) continue;
    const info = c.liveInfo?.();
    if (info) out.push({ source: s, conn: c, info });
  }
  return out.sort((a, b) => ORDER.indexOf(a.source.platform) - ORDER.indexOf(b.source.platform));
}

/** A YouTube stream that is only scheduled: look at its page now and then until it starts. */
function recheck(list) {
  for (const { source, conn, info } of list) {
    if (info.started || typeof conn.refreshLive !== 'function') continue;
    if (Date.now() - (rechecked.get(source.id) || 0) < RECHECK) continue;
    rechecked.set(source.id, Date.now());
    conn.refreshLive().then(i => { if (i?.started) check(); }).catch(() => {});
  }
}

const keyOf = (platform, info) => (info.videoId ? `${platform}:${info.videoId}` : '');

function check() {
  if (!manager) return;
  const g = settings.get().golive;
  const all = liveNow(g.trigger);
  recheck(all);
  const live = all.filter(x => x.info.started);
  const now = Date.now();
  // Nothing has been live for a while (also across restarts of Mergio): that stream is over.
  if (store.open && now - store.liveAt > QUIET_ENDS) { store.open = false; store.platform = ''; persist(); }
  if (!live.length) return;
  if (now - store.liveAt > 60e3) { store.liveAt = now; persist(); } else store.liveAt = now;
  if (pending) return;
  const first = live[0];
  const key = keyOf(first.source.platform, first.info);
  if (!isNew(store, first.source.platform, key)) return;
  const ready = g.enabled && Object.values(destinations(g)).some(Boolean);
  // Switched off (or nowhere to post): remember this stream, so turning the post on mid-stream doesn't post it.
  if (!ready) return markPosted(first.source.platform, live);
  const wait = g.delay * 1000;
  log('golive', `${NAMES[first.source.platform]} is live; posting in ${g.delay}s`);
  pending = { platform: first.source.platform, sourceId: first.source.id, at: Date.now() + wait, timer: setTimeout(() => fire(first.source.id), wait) };
  onChange(view());
}

function markPosted(platform, live) {
  for (const x of live) { const k = keyOf(x.source.platform, x.info); if (k && !store.keys.includes(k)) store.keys.push(k); }
  store.keys = store.keys.slice(-20);
  store.open = true; store.platform = platform;
  persist();
}

/** The post for the stream on this source (its link, title and the other channels' links). */
async function buildPost(sourceId, { test = false } = {}) {
  const g = settings.get().golive;
  const sources = settings.get().sources.filter(s => s.enabled !== false);
  const src = sources.find(s => s.id === sourceId);
  const conn = src && manager?.running.get(src.id);
  let info = conn?.liveInfo?.() || null;
  // the newest title (it is often changed right after going live), and a last check that YouTube really is live
  if (info && conn.refreshLive) info = await conn.refreshLive().catch(() => info);
  const platform = src?.platform || '';
  const url = info?.url || (src ? channelLink(src, conn) : '');
  // each platform's link (the first chat of that platform), built from the fixed platform list only
  const linkOf = p => {
    if (p === platform && url) return url;
    const s = sources.find(x => x.platform === p);
    if (!s || !g[LINK_KEY[p]]) return '';
    const c = manager?.running.get(s.id);
    return c?.liveInfo?.()?.url || channelLink(s, c);
  };
  const links = Object.fromEntries(ORDER.map(p => [p, linkOf(p)]).filter(([, u]) => u));
  // the channel names the status picture shows next to each logo
  const handleOf = p => {
    const s = sources.find(x => x.platform === p);
    if (!s) return '';
    if (p === 'facebook') return manager?.running.get(s.id)?.page?.name || s.label;
    return p === 'youtube' || p === 'tiktok' ? (s.label.startsWith('@') ? s.label : `@${s.label}`) : s.label;
  };
  const handles = Object.fromEntries(Object.keys(links).map(p => [p, handleOf(p)]));
  // the YouTube stream's thumbnail, for the status picture
  const yt = sources.find(x => x.platform === 'youtube');
  const ytLive = yt && manager?.running.get(yt.id)?.liveInfo?.();
  const thumb = ytLive?.videoId && ytLive.started ? ytLive.videoId : '';
  const name = g.name || String(conn?.channelName || src?.label || '').replace(/^@/, '');
  return { platform, url, title: info?.title || (test ? 'Your stream title shows here' : ''), name, links, handles, thumb, info, test };
}

async function fire(sourceId) {
  const platform = pending?.platform;
  pending = null;
  const g = settings.get().golive;
  const live = () => liveNow(g.trigger).filter(x => x.info.started);
  // switched off while Mergio waited: this stream stays unposted for good
  if (!g.enabled) { markPosted(platform, live()); onChange(view()); return; }
  const post = await buildPost(sourceId);
  // a false start: the stream ended (or YouTube says it hasn't started) while Mergio waited
  if (!post.info?.started) { log('golive', 'not live any more; nothing posted'); onChange(view()); return; }
  markPosted(platform, live());
  await deliver(post);
}

async function deliver(post) {
  const g = settings.get().golive;
  const results = await sendAll(post, g);
  const entry = { at: Date.now(), test: !!post.test, platform: post.platform, title: post.title, url: post.url, text: textFor(post, g, 'caption'), results };
  store.history.unshift(entry);
  store.history = store.history.slice(0, HISTORY);
  persist();
  log('golive', `${post.test ? 'test ' : ''}post: ${results.map(r => `${r.label} ${r.skipped ? 'already posted' : r.ok ? 'ok' : 'failed'}`).join(', ') || 'nowhere to send'}`);
  onChange(view());
  return entry;
}

/* ---------- control panel ---------- */

function start(m, opts = {}) {
  manager = m;
  onChange = opts.onChange || onChange;
  manager.on('status', () => setTimeout(check, 50));
  clearInterval(timer);
  timer = setInterval(check, LOOK_EVERY);
  timer.unref?.();
}

/** Posts now, by hand: the stream that is live (the trigger's platform first). */
async function postNow() {
  if (pending) { clearTimeout(pending.timer); pending = null; }
  const g = settings.get().golive;
  const list = liveNow(g.trigger).filter(x => x.info.started);
  const pick = list[0] || liveNow('any').filter(x => x.info.started)[0];
  if (!pick) throw new Error("You're not live right now, so there's no stream link to post.");
  if (!destinations(g).discord) throw new Error('Add your Discord bot and a channel first.');
  const post = await buildPost(pick.source.id);
  markPosted(pick.source.platform, list.length ? list : [pick]);
  return deliver(post);
}

/** A test post with your real links (and the real title when you're live), without pinging anyone. */
async function sendTest() {
  const g = settings.get().golive;
  if (!destinations(g).discord) throw new Error('Add your Discord bot and a channel first.');
  const post = await buildPost(previewSource(g)?.id, { test: true });
  post.title = `[Test] ${post.title}`;
  return deliver(post);
}

function cancel() {
  if (!pending) return view();
  clearTimeout(pending.timer);
  // this stream counts as posted, so it isn't posted again a moment later
  markPosted(pending.platform, liveNow(settings.get().golive.trigger).filter(x => x.info.started));
  pending = null;
  onChange(view());
  return view();
}

/** The source a preview or test is about: what's live, else the trigger's platform, else the first chat. */
function previewSource(g) {
  const live = liveNow(g.trigger).filter(x => x.info.started)[0];
  if (live) return live.source;
  const sources = settings.get().sources.filter(s => s.enabled !== false);
  return sources.find(s => s.platform === g.trigger) || [...sources].sort((a, b) => ORDER.indexOf(a.platform) - ORDER.indexOf(b.platform))[0] || null;
}

/** For the control panel: where posts go, the preview, the countdown and the last posts. */
async function viewFull() {
  const g = settings.get().golive;
  const src = previewSource(g);
  const post = await buildPost(src?.id, { test: true });
  const live = !!post.info?.started;
  const card = post.platform === 'youtube' && !!post.url;
  const ping = g.discordTargets[0]?.ping ? discord.mentionFor(g.discordTargets[0].ping).text || g.discordTargets[0].ping : '';
  return { ...view(), preview: {
    // the post as it goes out when the stream starts: a YouTube stream gets the card (without its thumbnail until then)
    discord: textFor(card ? { ...post, thumb: post.thumb || 'not-live-yet' } : post, g, 'discord', ping), caption: textFor(post, g, 'caption'), url: post.url, live,
    discordCard: card ? { ...cardBody(post), image: post.thumb ? { url: `/api/golive/thumb?id=${post.thumb}` } : null } : null,
    // what the status picture shows
    card: { name: post.name, title: live ? post.title : '', platforms: ORDER.filter(p => post.links[p]).map(p => ({ platform: p, handle: post.handles[p] || '' })),
      thumb: post.thumb ? `/api/golive/thumb?id=${post.thumb}` : '' },
  } };
}

function view() {
  const g = settings.get().golive;
  return {
    destinations: destinations(g),
    pending: pending ? { platform: pending.platform, at: pending.at } : null,
    history: store.history,
  };
}

/** The biggest thumbnail YouTube has for a video: { url, res } with the answer still unread, or null. */
async function findThumb(id) {
  if (!/^[\w-]{11}$/.test(id)) return null;
  for (const name of THUMBS) {
    const url = `${ytimg()}/vi/${id}/${name}`;
    try {
      const res = await fetch(url, { signal: AbortSignal.timeout(10000) });
      if (res.ok) return { url, res };
      res.body?.cancel().catch(() => {});
    } catch { /* try the next size */ }
  }
  return null;
}

/** The YouTube stream's thumbnail, for the status picture: fetched here so the page can draw it. */
async function thumbnail(id) {
  const t = await findThumb(id);
  return t ? Buffer.from(await t.res.arrayBuffer()) : null;
}

/** The link to the stream's biggest thumbnail, for the Discord card (every video has the small one). */
async function thumbUrl(id) {
  const t = await findThumb(id);
  t?.res.body?.cancel().catch(() => {});
  return t ? t.url : `${ytimg()}/vi/${id}/hqdefault.jpg`;
}

module.exports = { start, check, view, viewFull, postNow, sendTest, cancel, thumbnail, render, textFor, cardFor, channelLink, isNew, destinations };
