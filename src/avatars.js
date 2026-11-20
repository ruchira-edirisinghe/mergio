'use strict';
/* Profile pictures for chats that don't include them (Twitch, Kick).
   Twitch: up to 100 chatters per request through Twitch's public GraphQL API (decapi.me as a fallback).
   Kick: the channel info API, a few lookups at a time.
   Results are kept in memory and in the data folder, so a restart doesn't look everyone up again. */
const fs = require('node:fs');
const path = require('node:path');
const { DATA_DIR, fetchText, curlJson, log } = require('./util');

const FILE = path.join(DATA_DIR, 'avatars.json');
const TTL = 7 * 86400e3;        // pictures change rarely
const NONE_TTL = 6 * 3600e3;    // "this user has no picture"
const MAX = 20000;
const TWITCH_GQL = 'https://gql.twitch.tv/gql';
const TWITCH_CLIENT_ID = 'kimne78kx3ncx6brgo4mv6wki5h1ko'; // the public client id of twitch.tv itself

/* ---------- cache ---------- */
const cache = new Map(); // "twitch:login" -> [url, time]
try { for (const [k, v] of Object.entries(JSON.parse(fs.readFileSync(FILE, 'utf8')))) cache.set(k, v); } catch { /* first run */ }
let saveTimer = null;
function save() {
  saveTimer ||= setTimeout(() => {
    saveTimer = null;
    fs.writeFile(FILE, JSON.stringify(Object.fromEntries(cache)), () => {});
  }, 30000);
  saveTimer.unref?.();
}
function cached(key) {
  const c = cache.get(key);
  if (!c) return undefined;
  return Date.now() - c[1] < (c[0] ? TTL : NONE_TTL) ? c[0] : undefined;
}
function remember(key, url) {
  cache.delete(key);
  cache.set(key, [url, Date.now()]);
  while (cache.size > MAX) cache.delete(cache.keys().next().value);
  save();
}

/* ---------- a small concurrency limit for one-by-one lookups ---------- */
function limiter(n) {
  let active = 0;
  const queue = [];
  const next = () => { if (active >= n || !queue.length) return; active++; const [fn, res] = queue.shift(); fn().then(res, () => res(null)).finally(() => { active--; next(); }); };
  return fn => new Promise(res => { queue.push([fn, res]); next(); });
}
const oneByOne = limiter(4);

/* ---------- Twitch: batched ---------- */
let batch = new Map(); // login -> [resolve]
let batchTimer = null;
function twitch(login) {
  return new Promise(resolve => {
    if (!batch.has(login)) batch.set(login, []);
    batch.get(login).push(resolve);
    if (batch.size >= 100) flushTwitch();
    else batchTimer ||= setTimeout(flushTwitch, 80);
  });
}
async function flushTwitch() {
  clearTimeout(batchTimer); batchTimer = null;
  const mine = batch; batch = new Map();
  const logins = [...mine.keys()];
  let found = null;
  try {
    const res = await fetch(TWITCH_GQL, {
      method: 'POST',
      headers: { 'Client-Id': TWITCH_CLIENT_ID, 'Content-Type': 'text/plain;charset=UTF-8' },
      body: JSON.stringify({ query: 'query Avatars($l:[String!]){users(logins:$l){login profileImageURL(width:70)}}', variables: { l: logins } }),
      signal: AbortSignal.timeout(8000),
    });
    const j = await res.json();
    if (!Array.isArray(j?.data?.users)) throw new Error(`unexpected answer (${res.status})`);
    found = new Map(j.data.users.filter(Boolean).map(u => [String(u.login).toLowerCase(), u.profileImageURL || '']));
  } catch (e) { log('avatars', 'Twitch lookup failed, using the fallback:', e.message); }
  for (const [login, resolvers] of mine) {
    const url = found ? found.get(login) ?? '' : await oneByOne(() => decapi(login));
    for (const r of resolvers) r(url);
  }
}
async function decapi(login) {
  const url = (await fetchText(`https://decapi.me/twitch/avatar/${encodeURIComponent(login)}`, { timeout: 5000 })).trim();
  return /^https:\/\//.test(url) ? url : '';
}

/* ---------- Kick ---------- */
async function kick(login) {
  const ch = await curlJson(`https://kick.com/api/v2/channels/${encodeURIComponent(login)}/info`);
  if (ch?.status === 404 || /not found/i.test(ch?.message || '')) return '';
  if (!ch?.user) return null; // blocked or rate limited: try again later
  return /^https:\/\//.test(ch.user.profile_pic || '') ? ch.user.profile_pic : '';
}

/* ---------- public ---------- */
const pending = new Map();
/** Resolves to the picture URL ('' when the user has none or the lookup failed). */
function resolve(platform, login) {
  const key = `${platform}:${login}`;
  const hit = cached(key);
  if (hit !== undefined) return Promise.resolve(hit);
  if (pending.has(key)) return pending.get(key);
  const lookup = platform === 'twitch' ? twitch(login) : oneByOne(() => kick(login));
  const p = lookup.then(url => {
    pending.delete(key);
    if (url !== null && url !== undefined) remember(key, url);
    return url || '';
  });
  pending.set(key, p);
  return p;
}

module.exports = { resolve };
