'use strict';
const fs = require('node:fs');
const path = require('node:path');
const { DATA_DIR, log } = require('./util');

const FILE = path.join(DATA_DIR, 'config.json');

/** Every overlay/app option with its default. The dashboard renders its form from SCHEMA (public/dashboard). */
const DEFAULTS = {
  appearance: {
    theme: 'glass',
    showPlatform: true,
    showAvatar: true,
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
    eventStyle: 'card',         // card | inline
    showEventLabels: true,      // 'NEW FOLLOWER - on TikTok' label on alerts
    followStyle: 'card',        // card | pill
  },
  general: {
    hideAfter: 0,
    excludeCommands: true,
    ignoreChatters: 'StreamElements,Streamlabs,Nightbot,Fossabot,Moobot,Sery_Bot,BotRixOficial',
    blockedWords: '',
    scrollDirection: 'normal',  // normal (newest at bottom) | reversed (newest on top)
    groupConsecutiveMessages: true,
    inlineChat: true,
    highlightMentions: true,
    mentionNames: '',
    imageEmbedPermissionLevel: 'vips', // broadcaster | mods | vips | subs | everyone | nobody
    joinLifetime: 6,
    uwuMode: false,
  },
  twitch: { messages: true, cheers: true, announcements: true, subs: true, giftSubs: true, raids: true, redemptions: true, watchStreaks: true, joins: false, sharedChat: 'show', thirdPartyEmotes: true },
  youtube: { messages: true, superChats: true, superStickers: true, memberships: true, giftedMemberships: true, milestones: true },
  kick: { messages: true, subs: true, giftSubs: true, hosts: true, rewards: true, kicksGifts: true, follows: true },
  tiktok: { messages: true, joins: true, gifts: true, likes: true, follows: true, shares: false, subs: true, minGiftDiamonds: 0 },
  facebook: { messages: true },
  advanced: { port: 8787, openDashboardOnStart: true, tiktokSignApiKey: '', facebookAccessToken: '' },
  sources: [],
};

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
  return typeof base === 'string' ? String(over) : over;
}

let current = load();
let saveTimer = null;

function load() {
  try { return merge(DEFAULTS, JSON.parse(fs.readFileSync(FILE, 'utf8'))); }
  catch (e) { if (e.code !== 'ENOENT') log('settings', 'could not read config, using defaults:', e.message); return structuredClone(DEFAULTS); }
}

function save() {
  clearTimeout(saveTimer);
  saveTimer = setTimeout(() => {
    try { fs.writeFileSync(FILE, JSON.stringify(current, null, 2)); } catch (e) { log('settings', 'save failed:', e.message); }
  }, 250);
}

const get = () => current;

/** Deep-merges a partial update (unknown keys are dropped, types are coerced to the default's type). */
function update(patch) {
  current = merge(DEFAULTS, merge(current, patch || {}));
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

module.exports = { DEFAULTS, FILE, get, update, reset, save, publicView };
