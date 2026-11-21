'use strict';
const fs = require('node:fs');
const path = require('node:path');
const { DATA_DIR, log } = require('./util');

const FILE = path.join(DATA_DIR, 'config.json');
// Tokens and keys: the control panel only ever gets MASK back, never the saved value.
const SECRETS = ['tiktokSignApiKey', 'facebookAccessToken'];
const MASK = '•'.repeat(12);

/** Every overlay/app option with its default. The dashboard renders its form from SCHEMA (public/dashboard). */
const DEFAULTS = {
  appearance: {
    theme: 'glass',
    showPlatform: true,
    showAvatar: true,
    avatarSize: 2,              // profile picture size in em (it sits in its own column)
    showBadges: true,
    showPronouns: false,
    showUsername: true,
    showMessage: true,
    showTimestamps: false,
    timeFormat: '12',
    font: 'Inter',
    fontSize: 20,
    fontWeight: 500,
    lineSpacing: 0.35,
    textColor: '#ffffff',
    nameColorMode: 'user',      // user | platform | custom
    nameColor: '#ffd36e',
    textShadow: true,
    useChatBubbles: true,
    bubbleColor: '#12121a',
    bubbleOpacity: 0.78,
    bubbleRadius: 14,
    accentBar: true,
    background: '#000000',
    opacity: 0,
    animation: 'slide',         // slide | fade | pop | none
    align: 'left',              // left | right
    emoteScale: 1.4,
    bigEmotes: true,
    maxMessages: 30,
    eventStyle: 'compact',      // compact (a chat line with the gift icon) | card (big highlighted card)
    showEventLabels: true,      // 'NEW FOLLOWER - on TikTok' label on alerts
    followStyle: 'card',        // card (like other alerts) | pill (small note)
  },
  general: {
    fadeMessages: false,        // messages disappear after hideAfter seconds
    hideAfter: 30,
    excludeCommands: true,
    ignoreChatters: 'StreamElements,Streamlabs,Nightbot,Fossabot,Moobot,Sery_Bot,BotRixOficial',
    blockedWords: '',
    scrollDirection: 'normal',  // normal (newest at bottom) | reversed (newest on top)
    groupConsecutiveMessages: true,
    groupStyle: 'tuck',         // tuck (own box under the picture) | merge (same box, one message per line)
    inlineChat: true,
    highlightMentions: true,
    mentionNames: '',
    imageEmbedPermissionLevel: 'vips', // broadcaster | mods | vips | subs | everyone | nobody
    joinLifetime: 6,
    uwuMode: false,
  },
  alerts: {
    placement: 'chat',          // chat | overlay (own browser source) | both
    duration: 6,                // seconds each alert stays on the alerts overlay
    position: 'center',         // top | center | bottom of the alerts browser source
    size: 1,
    style: 'spotlight',         // spotlight | banner | neon | bubble | card | toast
    animation: 'pop',           // pop | slide | fade (Card style)
    showMessage: true,
    showAvatar: true,
    sound: false,               // a short chime with each alert
    volume: 0.6,
  },
  viewers: {
    style: 'pill',              // pill | glass | neon | broadcast | minimal
    layout: 'row',              // row | column (platforms side by side or under each other)
    align: 'left',              // left | center | right
    showTotal: true,            // one number for every platform together
    totalLabel: 'watching',
    showPlatforms: true,        // a number for each platform
    showNames: false,           // "Twitch 120" instead of just the logo
    hideOffline: true,          // only platforms that are live right now
    showLiveDot: true,
    showShare: true,            // a bar split by how many watch on each platform
    animate: true,              // numbers roll to the new value
    font: 'Inter',
    fontSize: 28,
    textColor: '#ffffff',
    accent: '#ff2d55',
    background: '#0d0d14',
    bgOpacity: 0.78,
  },
  twitch: { messages: true, cheers: true, announcements: true, subs: true, giftSubs: true, raids: true, redemptions: true, watchStreaks: true, joins: false, sharedChat: 'show', thirdPartyEmotes: true },
  youtube: { messages: true, superChats: true, superStickers: true, memberships: true, giftedMemberships: true, milestones: true },
  kick: { messages: true, subs: true, giftSubs: true, hosts: true, rewards: true, kicksGifts: true, follows: true },
  tiktok: { messages: true, joins: true, gifts: true, likes: true, follows: true, shares: false, subs: true, minGiftDiamonds: 0 },
  facebook: { messages: true },
  advanced: { configVersion: 2, port: 8787, openDashboardOnStart: true, tiktokSignApiKey: '', facebookAccessToken: '', welcomeSeen: false, overlaySeen: false, styleSeen: false },
  sources: [],
};

const MAX_TEXT = 20000; // longest text setting (blocked words, ignored chatters, tokens)

function merge(base, over) {
  if (Array.isArray(base)) return Array.isArray(over) ? over : base;
  if (base && typeof base === 'object') {
    const out = {};
    for (const k of Object.keys(base)) out[k] = over && k in over ? merge(base[k], over[k]) : base[k];
    return out;
  }
  if (over === undefined || over === null) return base;
  if (typeof base === 'number') { const n = Number(over); return Number.isFinite(n) ? n : base; }
  if (typeof base === 'boolean') return over === true || over === 'true';
  return typeof base === 'string' ? String(over).slice(0, MAX_TEXT) : over;
}

/** Values that must stay in range whatever was saved or sent. */
function clamp(s) {
  const port = Math.trunc(s.advanced.port);
  if (!(port >= 1024 && port <= 65535)) s.advanced.port = DEFAULTS.advanced.port;
  else s.advanced.port = port;
  return s;
}

/** Brings configs from older versions up to date. */
function migrate(raw) {
  if (!raw || typeof raw !== 'object') return raw;
  const version = Number(raw.advanced?.configVersion) || 1;
  // 1.2 made alerts in chat calmer: older configs move from the big cards to the compact line once.
  if (version < 2 && raw.appearance) raw.appearance.eventStyle = 'compact';
  const g = raw.general;
  // Before 1.2, "hide after 0 seconds" meant "never hide"; now there is a separate switch.
  if (g && !('fadeMessages' in g)) {
    g.fadeMessages = Number(g.hideAfter) > 0;
    if (!g.fadeMessages) delete g.hideAfter;
  }
  if (version < 2) { (raw.advanced ||= {}).configVersion = 2; migrated = true; }
  return raw;
}

let migrated = false;
let saveTimer = null;
let current = load();
if (migrated) save();

function load() {
  try { return clamp(merge(DEFAULTS, migrate(JSON.parse(fs.readFileSync(FILE, 'utf8'))))); }
  catch (e) { if (e.code !== 'ENOENT') log('settings', 'could not read config, using defaults:', e.message); return structuredClone(DEFAULTS); }
}

function save() {
  clearTimeout(saveTimer);
  saveTimer = setTimeout(writeNow, 250);
}

/** Writes a temporary file and swaps it in, so a crash or power cut never leaves half a config. Owner-only. */
function writeNow() {
  const data = JSON.stringify(current, null, 2);
  const tmp = `${FILE}.tmp`;
  try {
    fs.writeFileSync(tmp, data, { mode: 0o600 });
    fs.renameSync(tmp, FILE);
  } catch (e) {
    // Some antivirus tools briefly lock the file: fall back to writing it in place.
    try { fs.writeFileSync(FILE, data, { mode: 0o600 }); } catch (e2) { log('settings', 'save failed:', e2.message); }
    try { fs.rmSync(tmp, { force: true }); } catch { /* ignore */ }
  }
}

const get = () => current;

/** Deep-merges a partial update (unknown keys are dropped, types are coerced to the default's type). */
function update(patch) {
  // The panel sends the mask back when a token field wasn't really changed: keep the saved token then.
  // Real tokens and keys are plain ASCII, so anything else (the mask, or the mask with text typed after it) is ignored.
  const adv = patch?.advanced;
  if (adv && typeof adv === 'object') {
    for (const k of SECRETS) if (typeof adv[k] === 'string' && /[^\x20-\x7e]/.test(adv[k].trim())) delete adv[k];
  }
  current = clamp(merge(DEFAULTS, merge(current, patch || {})));
  save();
  return current;
}

function reset(section) {
  if (section && DEFAULTS[section] && section !== 'sources') current[section] = structuredClone(DEFAULTS[section]);
  else current = { ...structuredClone(DEFAULTS), sources: current.sources, advanced: current.advanced };
  save();
  return current;
}

/** Overlay-facing view: never leaks tokens to browser sources. */
function publicView(s = current) {
  const { advanced, sources, ...rest } = s;
  return rest;
}

/** Control-panel view: everything, but a saved token shows as MASK (so the panel knows one is set). */
function panelView(s = current) {
  const advanced = { ...s.advanced };
  for (const k of SECRETS) if (advanced[k]) advanced[k] = MASK;
  return { ...s, advanced };
}

module.exports = { DEFAULTS, FILE, MASK, get, update, reset, save, publicView, panelView };
