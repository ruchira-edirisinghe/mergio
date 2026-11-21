'use strict';
const { uid } = require('./util');
const gifts = require('./gifts');

/* Popular gifts for the samples; pictures come from the cached gift list, these are the fallback. */
const TT = 'https://p16-webcast.tiktokcdn.com/img/maliva/webcast-va/';
const TIKTOK_GIFTS = [
  ['Rose', 10, 1, TT + 'eba3a9bb85c33e017f3648eaf88d7189~tplv-obj.webp'],
  ['Finger Heart', 5, 5, TT + 'a4c4dc437fd3a6632aba149769491f49.png~tplv-obj.webp'],
  ['TikTok', 3, 1, TT + '802a21ae29f9fae5abe3693de9f874bd~tplv-obj.webp'],
  ['Doughnut', 2, 30, TT + '4e7ad6bdf0a1d860c538f38026d4e812~tplv-obj.webp'],
  ['Perfume', 1, 20, TT + '20b8f61246c7b6032777bb81bf4ee055~tplv-obj.webp'],
  ['Galaxy', 1, 1000, TT + 'resource/79a02148079526539f7599150da9fd28.png~tplv-obj.webp'],
  ['Lion', 1, 29999, TT + '4fb89af2082a290b37d704e20f4fe729~tplv-obj.webp'],
];
const KICK_GIFTS = [['hell_yeah', 'Hell Yeah', 1], ['hype', 'Hype', 10], ['full_send', 'Full Send', 100], ['rage_quit', 'Rage Quit', 500], ['pack_it_up', 'Pack It Up', 1000]];

/** Realistic fake messages so the overlay can be styled before going live. */
const NAMES = ['PixelPanda', 'NovaRider', 'LunaByte', 'ChaiAndChill', 'ZenMaster99', 'KiraNightfall', 'mochi_moo', 'TurboTaco', 'Saffron', 'GhostOfTsushima'];
const LINES = [
  'this overlay looks so clean 🔥', 'GG that was insane', 'hello everyone 👋', 'first time catching the stream live!',
  'what game is next?', 'LETS GOOOO', 'that clutch tho 😂', 'can you do a giveaway?', 'love the vibes today', 'W streamer',
];
/** Chat in other languages and scripts, so you can check your font shows them (RTL included). */
const WORLD = [
  ['youtube', 'සඳුනි', 'ආයුබෝවන්! නියමයි 🔥'],
  ['tiktok', 'தமிழ்செல்வி', 'வணக்கம் நண்பர்களே 👋'],
  ['twitch', 'राहुल', 'नमस्ते, शानदार स्ट्रीम!'],
  ['kick', 'ليلى', 'مرحبا بالجميع! بث رائع 🔥'],
  ['youtube', 'יעל', 'שלום לכולם, איזה כיף'],
  ['tiktok', 'さくら', 'こんにちは！最高の配信 ✨'],
  ['twitch', '민준', '안녕하세요! 오늘 방송 최고 👍'],
  ['youtube', '小龙', '大家好！直播太棒了'],
  ['kick', 'สมชาย', 'สวัสดีครับ สตรีมสนุกมาก'],
  ['facebook', 'Алексей', 'Привет всем! Отличный стрим'],
  ['twitch', 'Γιώργος', 'Γεια σας! Τέλειο'],
  ['tiktok', 'Minh Anh', 'Xin chào mọi người! Tuyệt vời quá'],
  ['youtube', '𝓢𝓽𝓪𝓻𝓵𝓲𝓰𝓱𝓽 ✨', 'fancy names work too 💜'],
  ['tiktok', 'Ayşe', 'Merhaba! Çok güzel yayın'],
];
const pick = a => a[Math.floor(Math.random() * a.length)];
const COLORS = ['#ff6b6b', '#ffd36e', '#6ee7ff', '#a78bfa', '#7cf29c', '#ff8fd8'];

function user(platform, extra = {}) {
  const name = pick(NAMES);
  return {
    id: name.toLowerCase(), login: name.toLowerCase(), name, color: pick(COLORS),
    avatar: `/avatar/default/${encodeURIComponent(name)}`,
    badges: [], roles: { broadcaster: false, mod: false, vip: false, sub: false, member: false, verified: false }, ...extra,
  };
}

const t = text => [{ type: 'text', text }];

function make(kind) {
  const base = { id: uid('test'), sourceId: 'test', time: Date.now(), flags: { test: true } };
  const emote = { type: 'emote', name: 'Kappa', url: 'https://static-cdn.jtvnw.net/emoticons/v2/25/default/dark/2.0' };
  switch (kind) {
    case 'twitch': return { ...base, platform: 'twitch', channel: 'twitch', type: 'chat', user: user('twitch', { badges: [{ id: 'subscriber', title: 'Subscriber', img: 'https://static-cdn.jtvnw.net/badges/v1/5d9f2208-5dd8-11e7-8513-2ff4adfae661/2' }], roles: { sub: true } }), parts: [...t(pick(LINES) + ' '), emote] };
    case 'youtube': return { ...base, platform: 'youtube', channel: 'youtube', type: 'chat', user: user('youtube', { color: '' }), parts: t(pick(LINES)) };
    case 'kick': return { ...base, platform: 'kick', channel: 'kick', type: 'chat', user: user('kick', { badges: [{ id: 'kick-og', title: 'OG' }] }), parts: t(pick(LINES)) };
    case 'tiktok': return { ...base, platform: 'tiktok', channel: 'tiktok', type: 'chat', user: user('tiktok', { color: '' }), parts: t(pick(LINES)) };
    case 'facebook': return { ...base, platform: 'facebook', channel: 'facebook', type: 'chat', user: user('facebook', { color: '' }), parts: t(pick(LINES)) };
    case 'superchat': return { ...base, platform: 'youtube', channel: 'youtube', type: 'superchat', user: user('youtube', { color: '' }), parts: t('Keep up the amazing work!'), event: { kind: 'superchat', title: 'sent a Super Chat', amount: '$20.00', color: '#e91e63' } };
    case 'cheer': return { ...base, platform: 'twitch', channel: 'twitch', type: 'cheer', user: user('twitch'), parts: [{ type: 'cheer', name: 'Cheer500', url: 'https://d3aqoihi2n8ty8.cloudfront.net/actions/cheer/dark/animated/100/2.gif', amount: 500, color: '#9c3ee8' }, ...t(' hype!')], event: { kind: 'cheer', title: 'cheered 500 bits', amount: '500 bits', image: 'https://d3aqoihi2n8ty8.cloudfront.net/actions/cheer/dark/animated/100/2.gif', color: '#9c3ee8', value: 500 } };
    case 'sub': return { ...base, platform: 'twitch', channel: 'twitch', type: 'sub', user: user('twitch'), parts: t('12 months already?!'), event: { kind: 'sub', title: 'resubscribed for 12 months', amount: 'Tier 1', color: '#9147ff', value: 12 } };
    case 'giftsub': return { ...base, platform: 'kick', channel: 'kick', type: 'giftsub', user: user('kick'), event: { kind: 'giftsub', title: 'gifted 5 subs', amount: '5 gifts', color: '#53fc18', value: 5 } };
    case 'twitchgiftsub': return { ...base, platform: 'twitch', channel: 'twitch', type: 'giftsub', user: user('twitch'), event: { kind: 'giftsub', title: 'gifted 10 subs to the community', amount: '10 gifts', color: '#9147ff', value: 10 } };
    case 'raid': return { ...base, platform: 'twitch', channel: 'twitch', type: 'raid', user: user('twitch'), event: { kind: 'raid', title: 'is raiding with 128 viewers', amount: '128 viewers', color: '#ff6b3d', value: 128 } };
    case 'gift': {
      const [name, count, diamonds, fallback] = pick(TIKTOK_GIFTS);
      const image = gifts.tiktokGift(null, name)?.image || fallback;
      return { ...base, platform: 'tiktok', channel: 'tiktok', type: 'gift', user: user('tiktok', { color: '' }), event: { kind: 'gift', title: `sent ${name}`, amount: `×${count}`, count, image, color: '#fe2c55', value: diamonds * count, diamonds: diamonds * count } };
    }
    case 'member': return { ...base, platform: 'youtube', channel: 'youtube', type: 'member', user: user('youtube', { color: '' }), event: { kind: 'member', title: 'Welcome to the channel!', amount: 'New member', color: '#0f9d58' } };
    case 'join': return { ...base, platform: 'tiktok', channel: 'tiktok', type: 'join', user: user('tiktok', { color: '' }), event: { kind: 'join', title: 'joined the LIVE', color: '#fe2c55' } };
    case 'follow': return { ...base, platform: 'tiktok', channel: 'tiktok', type: 'follow', user: user('tiktok', { color: '' }), event: { kind: 'follow', title: 'followed', color: '#fe2c55' } };
    case 'kickfollow': return { ...base, platform: 'kick', channel: 'kick', type: 'follow', user: user('kick'), event: { kind: 'follow', title: 'followed', color: '#53fc18' } };
    case 'tiktoksub': return { ...base, platform: 'tiktok', channel: 'tiktok', type: 'sub', user: user('tiktok', { color: '' }), event: { kind: 'sub', title: 'subscribed', amount: 'Subscriber', color: '#fe2c55' } };
    case 'kicksub': return { ...base, platform: 'kick', channel: 'kick', type: 'sub', user: user('kick'), event: { kind: 'sub', title: 'subscribed', amount: 'New sub', color: '#53fc18', value: 1 } };
    case 'like': return { ...base, platform: 'tiktok', channel: 'tiktok', type: 'like', user: user('tiktok', { color: '' }), event: { kind: 'like', title: 'liked the LIVE', amount: '×25', count: 25, color: '#fe2c55', value: 25 } };
    case 'kicks': {
      const [id, name, amount] = pick(KICK_GIFTS);
      return { ...base, platform: 'kick', channel: 'kick', type: 'gift', user: user('kick'), parts: t('for the vibes'), event: { kind: 'kicks', title: `sent ${name}`, amount: `${amount.toLocaleString()} Kicks`, image: gifts.kickGiftImage(id), color: '#53fc18', value: amount } };
    }
    case 'world': {
      const [platform, name, text] = pick(WORLD);
      return { ...base, platform, channel: platform, type: 'chat', user: { ...user(platform, { color: platform === 'twitch' || platform === 'kick' ? pick(COLORS) : '' }), id: name, login: name, name, avatar: `/avatar/default/${encodeURIComponent(name)}` }, parts: t(text) };
    }
    default: return make(pick(['twitch', 'youtube', 'kick', 'tiktok', 'facebook']));
  }
}

const KINDS = ['twitch', 'youtube', 'kick', 'tiktok', 'facebook', 'superchat', 'cheer', 'sub', 'tiktoksub', 'kicksub', 'giftsub', 'twitchgiftsub', 'raid', 'gift', 'member', 'follow', 'kickfollow', 'join', 'like', 'kicks', 'world'];

module.exports = { make, KINDS };
