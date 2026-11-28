'use strict';
/**
 * Go-live post: when you start streaming, Mergio posts "I'm live" with the stream's title and link, plus your
 * other channels, to Discord, Telegram, Slack or any app that takes a webhook. It posts once per stream: a
 * restart of Mergio or a platform that joins a minute later doesn't post again.
 */
const fs = require('node:fs');
const path = require('node:path');
const settings = require('./settings');
const { DATA_DIR, UA, log, redact } = require('./util');

const FILE = path.join(DATA_DIR, 'golive.json');
const ORDER = ['youtube', 'twitch', 'facebook', 'tiktok', 'kick'];
const NAMES = { youtube: 'YouTube', twitch: 'Twitch', kick: 'Kick', tiktok: 'TikTok', facebook: 'Facebook' };
const DOTS = { youtube: '🔴', twitch: '🟣', kick: '🟢', tiktok: '⚫', facebook: '🔵' };
const LINK_KEY = { youtube: 'linkYoutube', twitch: 'linkTwitch', kick: 'linkKick', tiktok: 'linkTiktok', facebook: 'linkFacebook' };
const DESTS = ['discord', 'telegram', 'slack', 'webhook'];
const QUIET_ENDS = 15 * 60e3;  // nothing live for this long: the stream is over, the next one gets a new post
const LOOK_EVERY = 15e3;       // Twitch and Kick say they're live through their viewer count, which isn't an event
const RECHECK = 30e3;          // a scheduled YouTube stream: look again this often until it starts
const HISTORY = 10;
const MAX_POST = 2000;         // Discord's limit per message

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

/** "@everyone 1234…" -> what Discord pings, and the allowed_mentions that let it ping only those. */
function discordMention(raw) {
  const roles = [], users = [], parse = [], out = [];
  for (const tok of String(raw || '').split(/[\s,]+/).filter(Boolean)) {
    let m;
    if (tok === '@everyone' || tok === '@here') { out.push(tok); if (!parse.includes('everyone')) parse.push('everyone'); }
    else if ((m = /^(?:<@&(\d{5,30})>|(\d{5,30}))$/.exec(tok))) { const id = m[1] || m[2]; roles.push(id); out.push(`<@&${id}>`); }
    else if ((m = /^<@!?(\d{5,30})>$/.exec(tok))) { users.push(m[1]); out.push(`<@${m[1]}>`); }
  }
  return { text: out.join(' '), allowed: { parse, roles, users } };
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
 * dest changes the details: Discord pings and shows a preview of the stream link only.
 */
function textFor(post, g, dest) {
  const others = ORDER.filter(p => p !== post.platform && post.links[p]);
  // On Discord <link> stops the extra link previews, so only the stream itself gets a big card.
  const wrap = url => (dest === 'discord' ? `<${url}>` : url);
  // one fill-in per platform; the stream's own link keeps its preview on Discord
  const own = p => (p === post.platform ? post.url : wrap(post.links[p]));
  const vars = Object.fromEntries([
    ['mention', dest === 'discord' ? discordMention(g.discordMention).text : ''],
    ['name', post.name], ['title', post.title], ['link', post.url], ['platform', NAMES[post.platform] || ''],
    ['others', others.length ? ['Also live on:', ...others.map(p => `${DOTS[p]} ${NAMES[p]}: ${wrap(post.links[p])}`)].join('\n') : ''],
    ...ORDER.map(p => [p, post.links[p] ? own(p) : '']),
  ]);
  return render(g.message, vars);
}

/** Which places a post goes to: the ones that are filled in. */
function destinations(g) {
  return {
    discord: !!g.discordWebhook,
    telegram: !!(g.telegramBotToken && g.telegramChat),
    slack: !!g.slackWebhook,
    webhook: !!g.webhookUrl,
  };
}

/* ---------- sending ---------- */

async function postJson(url, body) {
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'User-Agent': UA },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(15000),
  });
  const text = await res.text().catch(() => '');
  if (!res.ok) throw Object.assign(new Error(`HTTP ${res.status}`), { status: res.status, body: text, retryAfter: Number(res.headers.get('retry-after')) || 0 });
  return text;
}

/** What went wrong, in words the streamer can act on. */
function explain(dest, e) {
  let detail = '';
  try { const j = JSON.parse(e.body); detail = j.description || j.message || ''; } catch { /* not json */ }
  const s = e.status;
  if (dest === 'discord') {
    if (s === 401 || s === 404) return 'Discord says this webhook link was deleted or is wrong. Copy it again from the channel settings.';
    if (s === 429) return 'Discord asked Mergio to slow down. Try again in a minute.';
  }
  if (dest === 'telegram') {
    if (s === 401 || s === 404) return 'Telegram says the bot token is wrong. Copy it again from @BotFather.';
    if (/chat not found/i.test(detail)) return "Telegram can't find that chat. Add the bot to the channel or group, then check the @name or number.";
    if (/not enough rights|administrator|kicked|not a member/i.test(detail)) return 'Make the bot an admin of the channel (with permission to post), then try again.';
  }
  if (dest === 'slack' && (s === 403 || s === 404 || s === 410)) return 'Slack says this webhook link was removed or is wrong.';
  if (e.name === 'TimeoutError') return `${NAMES_DEST[dest]} didn't answer in time.`;
  if (!s) return `Couldn't reach ${NAMES_DEST[dest]}: ${redact(e.message)}`;
  return `${NAMES_DEST[dest]} said no (${s}${detail ? ': ' + redact(detail).slice(0, 160) : ''}).`;
}
const NAMES_DEST = { discord: 'Discord', telegram: 'Telegram', slack: 'Slack', webhook: 'Your webhook' };

/** Sends one post to one place. */
function sendTo(dest, post, g) {
  if (dest === 'discord') {
    const m = discordMention(g.discordMention);
    return postJson(g.discordWebhook, { content: textFor(post, g, 'discord'), allowed_mentions: m.allowed });
  }
  if (dest === 'telegram') {
    return postJson(`https://api.telegram.org/bot${g.telegramBotToken}/sendMessage`, {
      chat_id: g.telegramChat, text: textFor(post, g, 'telegram'),
      link_preview_options: post.url ? { url: post.url, prefer_large_media: true } : { is_disabled: true },
    });
  }
  if (dest === 'slack') return postJson(g.slackWebhook, { text: textFor(post, g, 'slack') });
  return postJson(g.webhookUrl, {
    event: post.test ? 'test' : 'live', name: post.name, title: post.title, platform: post.platform, url: post.url,
    links: post.links, text: textFor(post, g, 'webhook'), at: new Date().toISOString(),
  });
}

const sleep = ms => new Promise(r => setTimeout(r, ms).unref?.());

/** Sends a post everywhere it should go; a place that is busy or down is tried again a few times. */
async function sendAll(post, g, only) {
  const on = destinations(g);
  const list = DESTS.filter(d => on[d] && (!only || d === only));
  return Promise.all(list.map(async dest => {
    for (let attempt = 0; ; attempt++) {
      try { await sendTo(dest, post, g); return { dest, ok: true }; }
      catch (e) {
        const retry = attempt < 2 && (!e.status || e.status === 429 || e.status >= 500);
        if (!retry) { const error = explain(dest, e); log('golive', `${dest}: ${error}`); return { dest, ok: false, error }; }
        await sleep(Math.min(60e3, (e.retryAfter || 5 * 3 ** attempt) * 1000));
      }
    }
  }));
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
  const name = g.name || String(conn?.channelName || src?.label || '').replace(/^@/, '');
  return { platform, url, title: info?.title || (test ? 'Your stream title shows here' : ''), name, links, info, test };
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

async function deliver(post, only) {
  const g = settings.get().golive;
  const results = await sendAll(post, g, only);
  const entry = { at: Date.now(), test: !!post.test, platform: post.platform, title: post.title, url: post.url, text: textFor(post, g, 'share'), results };
  store.history.unshift(entry);
  store.history = store.history.slice(0, HISTORY);
  persist();
  log('golive', `${post.test ? 'test ' : ''}post: ${results.map(r => `${r.dest} ${r.ok ? 'ok' : 'failed'}`).join(', ') || 'nowhere to send'}`);
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
  if (!Object.values(destinations(g)).some(Boolean)) throw new Error('Add a place to post to first (Discord, Telegram, Slack or a webhook).');
  const post = await buildPost(pick.source.id);
  markPosted(pick.source.platform, list.length ? list : [pick]);
  return deliver(post);
}

/** A test post with your real links (and the real title when you're live), without pinging anyone. */
async function sendTest(only) {
  const g = settings.get().golive;
  if (only && !DESTS.includes(only)) throw new Error('Unknown place.');
  if (!Object.values(destinations(g)).some(Boolean)) throw new Error('Add a place to post to first.');
  const post = await buildPost(previewSource(g)?.id, { test: true });
  post.title = `[Test] ${post.title}`;
  return deliver(post, only);
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
  if (!post.info) post.title = post.title || 'Your stream title shows here';
  return { ...view(), preview: { discord: textFor(post, g, 'discord'), plain: textFor(post, g, 'share'), url: post.url, live: !!post.info?.started } };
}

function view() {
  const g = settings.get().golive;
  return {
    destinations: destinations(g),
    pending: pending ? { platform: pending.platform, at: pending.at } : null,
    history: store.history,
  };
}

module.exports = { start, check, view, viewFull, postNow, sendTest, cancel, render, textFor, discordMention, channelLink, isNew, destinations };
