'use strict';
/* Gift pictures. TikTok: the public gift list, cached in the data folder and refreshed every few days.
   Kick: KICKs gift images live on Kick's file server under a predictable name. */
const fs = require('node:fs');
const path = require('node:path');
const { DATA_DIR, fetchJson, log } = require('./util');

const FILE = path.join(DATA_DIR, 'tiktok-gifts.json');
const LIST_URL = 'https://webcast.tiktok.com/webcast/gift/list/?aid=1988&app_name=tiktok_web&device_platform=web_pc&browser_language=en-US';
const MAX_AGE = 3 * 86400e3;

let tt = null;        // { time, byId: { [id]: [name, imageUrl, diamonds] } }
let byName = null;    // lower-case name -> entry
let refreshing = null;

function load() {
  if (!tt) {
    try { tt = JSON.parse(fs.readFileSync(FILE, 'utf8')); } catch { tt = { time: 0, byId: {} }; }
    byName = null;
  }
  if (Date.now() - tt.time > MAX_AGE && !refreshing) refreshing = refresh().finally(() => { refreshing = null; });
  return tt;
}

async function refresh() {
  try {
    const j = await fetchJson(LIST_URL, { timeout: 20000 });
    const byId = {};
    for (const g of j?.data?.gifts || []) {
      const img = g.image?.url_list?.[0] || g.icon?.url_list?.[0];
      if (g.id && g.name && /^https:\/\//.test(img || '')) byId[g.id] = [g.name, img, g.diamond_count | 0];
    }
    if (!Object.keys(byId).length) throw new Error('empty list');
    tt = { time: Date.now(), byId };
    byName = null;
    fs.writeFile(FILE, JSON.stringify(tt), () => {});
  } catch (e) {
    log('gifts', 'could not refresh the TikTok gift list:', e.message);
    tt.time = Date.now() - MAX_AGE + 3600e3; // try again in an hour
  }
}

/** Looks a TikTok gift up by id (or by name); null when unknown. */
function tiktokGift(id, name) {
  const { byId } = load();
  let g = id != null ? byId[id] : null;
  if (!g && name) {
    byName ||= new Map(Object.values(byId).map(x => [x[0].toLowerCase(), x]));
    g = byName.get(String(name).toLowerCase());
  }
  return g ? { name: g[0], image: g[1], diamonds: g[2] } : null;
}

const KICK_FILES = { boooom: 'boom' };
/** Kick names its gift images after the gift id with dashes (hell_yeah -> hell-yeah.webp). */
function kickGiftImage(giftId) {
  if (!/^[\w-]{1,40}$/.test(giftId || '')) return '';
  return `https://files.kick.com/kicks/gifts/${KICK_FILES[giftId] || giftId.replace(/_/g, '-')}.webp`;
}

module.exports = { tiktokGift, kickGiftImage, warm: load };
