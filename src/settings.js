'use strict';
const fs = require('node:fs');
const path = require('node:path');
const { DATA_DIR, log } = require('./util');

const FILE = path.join(DATA_DIR, 'config.json');
// Tokens and keys: the control panel only ever gets MASK back, never the saved value.
const SECRETS = ['tiktokSignApiKey', 'facebookAccessToken', 'youtubeApiKey'];
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
    showJoins: true,            // "X joined" notes in the chat (TikTok, Twitch)
    joinLifetime: 6,
    showLikes: true,            // TikTok likes in the chat
    uwuMode: false,
  },
  alerts: {
    placement: 'chat',          // chat | overlay (own browser source) | both
    duration: 6,                // seconds each alert stays on the alerts overlay
    position: 'center',         // top | center | bottom of the alerts browser source
    size: 1,
    style: 'levelup',           // levelup | achievement | loot | arcade | combo | quest | cyber | spotlight | neon | bubble
    animation: 'pop',           // (only the old Card style used it)
    showMessage: true,
    showAvatar: true,
    showLabel: true,            // "NEW SUBSCRIBER"
    showPlatform: true,         // "on Twitch"
    showHeadline: true,         // the theme's big word: "LEVEL UP!", "Epic drop"…
    headline: '',               // your own big word ('' = the theme's)
    showTimer: true,            // the bar that shows how long the alert stays
    colorMode: 'platform',      // platform | tier (by how big the alert is) | custom
    accent: '#8b5cf6',
    textColor: '#ffffff',
    font: '',                   // '' = the theme's own font
    sound: false,               // a short sound with each alert
    soundType: 'chime',         // chime | coin | levelup | arcade | soft
    volume: 0.6,
  },
  viewers: {
    style: 'pill',              // pill | glass | neon | broadcast | minimal
    layout: 'row',              // line | row | column (one line, side by side and wrapping, or under each other)
    align: 'left',              // left | center | right
    showTotal: true,            // one number for every platform together
    totalLabel: 'watching',
    showPlatforms: true,        // a number for each platform
    youtube: true, twitch: true, kick: true, tiktok: true, facebook: true, // which platforms get their own number
    totalAll: true,             // the total still counts platforms whose own number is hidden
    numberFormat: 'full',       // full (1,234) | short (1.2K)
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
  followers: {
    enabled: true,              // look follower counts up (off = no lookups at all)
    style: 'panel',             // panel | line | cards | neon | bars
    layout: 'row',              // line | row | column
    align: 'left',              // left | center | right
    showTitle: true,
    title: 'Follower goals',
    showTotal: false,           // every platform added up, as one extra goal
    showNames: false,           // platform names next to the logos
    hideEmpty: true,            // hide platforms whose number is not known yet
    youtube: true, twitch: true, kick: true, tiktok: true, facebook: true, // platforms to show
    showGoal: true,             // "436 / 500"
    goalStep: 100,              // automatic goals: the next multiple of this
    goalYoutube: 0, goalTwitch: 0, goalKick: 0, goalTiktok: 0, goalFacebook: 0, goalTotal: 0, // 0 = automatic
    showBar: true,              // a progress bar towards the goal
    showToGo: true,             // "64 to go"
    showPlus: true,             // "+3" pops up when followers come in
    celebrate: true,            // the goal flashes when it is reached
    animate: true,
    font: 'Bungee',
    fontSize: 34,
    textColor: '#ffffff',
    goalColor: '#ffe2bf',
    ink: '#4b2358',             // number outline, badges and the card edge
    barColor: '#a6ff94',
    outline: true,              // thick outline around the numbers
  },
  twitch: { messages: true, cheers: true, announcements: true, subs: true, giftSubs: true, raids: true, redemptions: true, watchStreaks: true, joins: false, sharedChat: 'show', thirdPartyEmotes: true },
  youtube: { messages: true, superChats: true, superStickers: true, memberships: true, giftedMemberships: true, milestones: true },
  kick: { messages: true, subs: true, giftSubs: true, hosts: true, rewards: true, kicksGifts: true, follows: true },
  tiktok: { messages: true, joins: true, gifts: true, likes: true, follows: true, shares: false, subs: true, minGiftDiamonds: 0 },
  facebook: { messages: true },
  advanced: { configVersion: 3, port: 8787, openDashboardOnStart: true, tiktokSignApiKey: '', facebookAccessToken: '', youtubeApiKey: '', welcomeSeen: false, overlaySeen: false, styleSeen: false },
  sources: [],
};

const MAX_TEXT = 20000; // longest text setting (blocked words, ignored chatters, tokens)

/* What each setting may be, whatever sends it (the control panel, an imported style file, a hand-edited
   config.json or a script): numbers stay in the range the control panel offers, choices must be one of
   the real ones and colours must be #rrggbb. Anything else keeps the value from before. */
const RANGES = {
  appearance: { avatarSize: [1.2, 3.5], fontSize: [12, 48], fontWeight: [100, 900, true], lineSpacing: [0, 1.5], bubbleOpacity: [0, 1], bubbleRadius: [0, 28, true],
    opacity: [0, 1], emoteScale: [0.8, 3], maxMessages: [5, 80, true] },
  general: { hideAfter: [5, 300, true], joinLifetime: [2, 20, true] },
  alerts: { duration: [2, 20], size: [0.6, 2], volume: [0, 1] },
  viewers: { fontSize: [14, 80], bgOpacity: [0, 1] },
  followers: { fontSize: [16, 90], goalStep: [1, 1e6, true], goalYoutube: [0, 1e9, true], goalTwitch: [0, 1e9, true], goalKick: [0, 1e9, true],
    goalTiktok: [0, 1e9, true], goalFacebook: [0, 1e9, true], goalTotal: [0, 1e9, true] },
  tiktok: { minGiftDiamonds: [0, 100000, true] },
};
const CHOICES = {
  appearance: { theme: ['glass', 'neon', 'minimal', 'soft', 'retro'], timeFormat: ['12', '24'], nameColorMode: ['user', 'platform', 'custom'],
    animation: ['slide', 'fade', 'pop', 'none'], align: ['left', 'right'], eventStyle: ['compact', 'card'], followStyle: ['card', 'pill'] },
  general: { scrollDirection: ['normal', 'reversed'], groupStyle: ['tuck', 'merge'], imageEmbedPermissionLevel: ['broadcaster', 'mods', 'vips', 'subs', 'everyone', 'nobody'] },
  alerts: { placement: ['chat', 'overlay', 'both'], position: ['top', 'center', 'bottom'], style: ['levelup', 'achievement', 'loot', 'arcade', 'combo', 'quest', 'cyber', 'spotlight', 'neon', 'bubble'],
    animation: ['pop', 'slide', 'fade'], colorMode: ['platform', 'tier', 'custom'], soundType: ['chime', 'coin', 'levelup', 'arcade', 'soft'] },
  viewers: { style: ['pill', 'glass', 'neon', 'broadcast', 'minimal'], layout: ['line', 'row', 'column'], align: ['left', 'center', 'right'], numberFormat: ['full', 'short'] },
  followers: { style: ['panel', 'line', 'cards', 'neon', 'bars'], layout: ['line', 'row', 'column'], align: ['left', 'center', 'right'] },
  twitch: { sharedChat: ['show', 'highlight', 'hide'] },
};
const COLOR = /^#[\da-f]{6}$/i;
const FONT = /^[\p{L}\p{N} _.-]{0,80}$/u; // a font name: letters, numbers, spaces (it ends up in CSS and a Google Fonts link)

/** Keeps every setting of s valid; prev holds the values to fall back to (the ones saved before). */
function validate(s, prev = DEFAULTS) {
  for (const [sec, keys] of Object.entries(RANGES)) {
    for (const [k, [min, max, whole]] of Object.entries(keys)) {
      let n = Math.min(max, Math.max(min, Number(s[sec][k])));
      if (whole) n = Math.round(n);
      s[sec][k] = Number.isFinite(n) ? n : prev[sec][k];
    }
  }
  for (const [sec, keys] of Object.entries(CHOICES)) {
    for (const [k, list] of Object.entries(keys)) if (!list.includes(s[sec][k])) s[sec][k] = list.includes(prev[sec][k]) ? prev[sec][k] : DEFAULTS[sec][k];
  }
  for (const sec of ['appearance', 'alerts', 'viewers', 'followers']) {
    for (const [k, def] of Object.entries(DEFAULTS[sec])) {
      if (typeof def === 'string' && COLOR.test(def) && !COLOR.test(s[sec][k])) s[sec][k] = COLOR.test(prev[sec][k]) ? prev[sec][k] : def;
    }
    if (!FONT.test(s[sec].font)) s[sec].font = FONT.test(prev[sec].font) ? prev[sec].font : DEFAULTS[sec].font;
  }
  return s;
}

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
function clamp(s, prev = DEFAULTS) {
  const port = Math.trunc(s.advanced.port);
  if (!(port >= 1024 && port <= 65535)) s.advanced.port = DEFAULTS.advanced.port;
  else s.advanced.port = port;
  return validate(s, prev);
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
  // 1.6 retired the Banner, Card and Minimal alert styles: they become Level up, the new default.
  if (version < 3 && raw.alerts && ['banner', 'card', 'toast'].includes(raw.alerts.style)) raw.alerts.style = 'levelup';
  if (version < 3) { (raw.advanced ||= {}).configVersion = 3; migrated = true; }
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
  // A key typed or pasted after the mask ("••••NEWKEY") is the new key. Real tokens and keys are plain ASCII,
  // so anything else is ignored.
  const adv = patch?.advanced;
  if (adv && typeof adv === 'object') {
    for (const k of SECRETS) {
      if (typeof adv[k] !== 'string') continue;
      const typed = adv[k].replaceAll(MASK[0], '').trim();
      if (!typed && adv[k].includes(MASK[0])) delete adv[k];
      else if (/[^\x20-\x7e]/.test(typed)) delete adv[k];
      else adv[k] = typed;
    }
  }
  current = clamp(merge(DEFAULTS, merge(current, patch || {})), current);
  save();
  return current;
}

function reset(section) {
  if (section && Object.hasOwn(DEFAULTS, section) && section !== 'sources') current[section] = structuredClone(DEFAULTS[section]);
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
