'use strict';
const WebSocket = require('ws');
const { Connector, textParts, applyWordEmotes } = require('./base');
const { fetchJson, backoff, log } = require('../util');

/* Global Twitch badge images (public CDN). Channel-specific sub badges fall back to the default sub badge. */
const BADGE = id => `https://static-cdn.jtvnw.net/badges/v1/${id}/2`;
const BADGES = {
  broadcaster: ['Broadcaster', BADGE('5527c58c-fb7d-422d-b71b-f309dcb85cc1')],
  moderator: ['Moderator', BADGE('3267646d-33f0-4b17-b3df-f923a41db1d0')],
  vip: ['VIP', BADGE('b817aba4-fad8-49e2-b88a-7cc744dfa6ec')],
  partner: ['Verified', BADGE('d12a2e27-16f6-41d0-ab77-b780518f00a3')],
  staff: ['Staff', BADGE('d97c37bd-a6f5-4c38-8f57-4e4bef88af34')],
  subscriber: ['Subscriber', BADGE('5d9f2208-5dd8-11e7-8513-2ff4adfae661')],
  founder: ['Founder', BADGE('511b78a9-ab37-472f-9569-457753bbe7d3')],
  premium: ['Prime Gaming', BADGE('bbbe0db0-a598-423e-86d0-f9fb98ca1933')],
  turbo: ['Turbo', BADGE('bd444ec6-8f34-4bf9-91f4-af1e3428d80f')],
  'artist-badge': ['Artist', BADGE('4300a897-03dc-4e83-8c0e-c332fee7057f')],
  'sub-gifter': ['Sub Gifter', BADGE('a5ef6c17-2e5b-4d8f-9b80-2779fd722414')],
};

const CHEER_PREFIXES = new Set(['cheer', 'cheerwhal', 'corgo', 'uni', 'showlove', 'party', 'seemsgood', 'pride', 'kappa', 'frankerz', 'heyguys', 'dansgame', 'elegiggle', 'trihard', 'kreygasm', '4head', 'swiftrage', 'notlikethis', 'failfish', 'vohiyo', 'pjsalt', 'mrdestructoid', 'bday', 'ripcheer', 'shamrock', 'biblethump', 'doodlecheer', 'streamlabs', 'muxy', 'holidaycheer', 'goal', 'anon']);
const cheerTier = n => (n >= 10000 ? 10000 : n >= 5000 ? 5000 : n >= 1000 ? 1000 : n >= 100 ? 100 : 1);
const CHEER_COLORS = { 1: '#979797', 100: '#9c3ee8', 1000: '#1db2a5', 5000: '#0099fe', 10000: '#f43021' };
const cheerUrl = (prefix, tier) => `https://d3aqoihi2n8ty8.cloudfront.net/actions/${prefix}/dark/animated/${tier}/2.gif`;
const SUB_PLAN = { Prime: 'Prime', 1000: 'Tier 1', 2000: 'Tier 2', 3000: 'Tier 3' };

function unescapeTag(v = '') {
  return v.replace(/\\(.)/g, (_, c) => ({ s: ' ', ':': ';', '\\': '\\', r: '\r', n: '\n' }[c] ?? c));
}

function parseLine(line) {
  let rest = line, tags = {}, prefix = '';
  if (rest.startsWith('@')) {
    const sp = rest.indexOf(' ');
    for (const kv of rest.slice(1, sp).split(';')) { const i = kv.indexOf('='); tags[kv.slice(0, i)] = unescapeTag(kv.slice(i + 1)); }
    rest = rest.slice(sp + 1);
  }
  if (rest.startsWith(':')) { const sp = rest.indexOf(' '); prefix = rest.slice(1, sp); rest = rest.slice(sp + 1); }
  const ti = rest.indexOf(' :');
  const trailing = ti >= 0 ? rest.slice(ti + 2) : null;
  const params = (ti >= 0 ? rest.slice(0, ti) : rest).split(' ').filter(Boolean);
  const command = params.shift();
  return { tags, prefix, command, params, trailing, nick: prefix.split('!')[0] };
}

/* Third-party emotes (7TV / BTTV / FFZ) are cached per channel and globally. */
let globalEmotes = null;
async function loadGlobalEmotes() {
  if (globalEmotes) return globalEmotes;
  const map = new Map();
  await Promise.allSettled([
    fetchJson('https://api.betterttv.net/3/cached/emotes/global').then(list => list.forEach(e => map.set(e.code, `https://cdn.betterttv.net/emote/${e.id}/2x.webp`))),
    fetchJson('https://7tv.io/v3/emote-sets/global').then(set => (set.emotes || []).forEach(e => map.set(e.name, `https:${e.data.host.url}/2x.webp`))),
    fetchJson('https://api.frankerfacez.com/v1/set/global').then(r => (r.default_sets || []).forEach(id => (r.sets[id]?.emoticons || []).forEach(e => map.set(e.name, e.urls['2'] || e.urls['1'])))),
  ]);
  globalEmotes = map;
  return map;
}
async function loadChannelEmotes(roomId) {
  const map = new Map(await loadGlobalEmotes());
  await Promise.allSettled([
    fetchJson(`https://api.betterttv.net/3/cached/users/twitch/${roomId}`).then(r => [...(r.channelEmotes || []), ...(r.sharedEmotes || [])].forEach(e => map.set(e.code, `https://cdn.betterttv.net/emote/${e.id}/2x.webp`))),
    fetchJson(`https://api.frankerfacez.com/v1/room/id/${roomId}`).then(r => Object.values(r.sets || {}).forEach(s => (s.emoticons || []).forEach(e => map.set(e.name, e.urls['2'] || e.urls['1'])))),
    fetchJson(`https://7tv.io/v3/users/twitch/${roomId}`).then(r => (r.emote_set?.emotes || []).forEach(e => map.set(e.name, `https:${e.data.host.url}/2x.webp`))),
  ]);
  return map;
}

class TwitchConnector extends Connector {
  start() {
    this.attempt = 0;
    this.thirdParty = null;
    this.connect();
  }

  connect() {
    if (this.stopped) return;
    this.setState('connecting', 'Joining Twitch chat…');
    const ws = (this.ws = new WebSocket('wss://irc-ws.chat.twitch.tv:443'));
    const chan = this.source.target;
    ws.on('open', () => {
      ws.send('CAP REQ :twitch.tv/tags twitch.tv/commands twitch.tv/membership');
      ws.send('PASS SCHMOOPIIE');
      ws.send(`NICK justinfan${10000 + Math.floor(Math.random() * 80000)}`);
      ws.send(`JOIN #${chan}`);
    });
    ws.on('message', data => {
      for (const line of data.toString().split('\r\n')) if (line) this.handle(parseLine(line));
    });
    ws.on('close', () => this.retry());
    ws.on('error', e => log('twitch', e.message));
    clearInterval(this.pingTimer);
    this.pingTimer = setInterval(() => { try { ws.send('PING :mergio'); } catch { /* closed */ } }, 240000);
  }

  retry() {
    clearInterval(this.pingTimer);
    if (this.stopped) return;
    const wait = backoff(this.attempt++);
    this.setState('waiting', `Disconnected, retrying in ${Math.round(wait / 1000)}s`);
    this.retryTimer = setTimeout(() => this.connect(), wait);
  }

  stop() {
    super.stop();
    clearTimeout(this.retryTimer); clearInterval(this.pingTimer);
    try { this.ws?.close(); } catch { /* ignore */ }
  }

  user(tags, nick) {
    const badges = [];
    const roles = { broadcaster: false, mod: false, vip: false, sub: false, member: false, verified: false };
    for (const b of (tags.badges || '').split(',').filter(Boolean)) {
      const [set, ver] = b.split('/');
      if (set === 'broadcaster') roles.broadcaster = true;
      if (set === 'moderator') roles.mod = true;
      if (set === 'vip') roles.vip = true;
      if (set === 'subscriber' || set === 'founder') roles.sub = true;
      if (set === 'partner') roles.verified = true;
      if (set === 'bits') { badges.push({ id: 'bits', title: `Bits ${ver}`, img: BADGE('73b5c3fb-24f9-4a82-a852-2f475b59411c') }); continue; }
      const known = BADGES[set];
      if (known) badges.push({ id: set, title: set === 'subscriber' ? `Subscriber (${ver} months)` : known[0], img: known[1] });
    }
    if (tags.mod === '1') roles.mod = true;
    const login = tags.login || nick || (tags['display-name'] || '').toLowerCase();
    return {
      id: tags['user-id'] || login,
      login,
      name: tags['display-name'] || login,
      color: tags.color || '',
      avatar: login ? `/avatar/twitch/${encodeURIComponent(login)}` : '',
      badges, roles,
    };
  }

  parts(text, tags) {
    let parts = [];
    const chars = Array.from(text || '');
    const ranges = [];
    for (const group of (tags.emotes || '').split('/').filter(Boolean)) {
      const [id, pos] = group.split(':');
      for (const r of (pos || '').split(',')) { const [s, e] = r.split('-').map(Number); ranges.push({ s, e, id }); }
    }
    ranges.sort((a, b) => a.s - b.s);
    let i = 0;
    for (const r of ranges) {
      if (r.s > i) parts.push(...textParts(chars.slice(i, r.s).join('')));
      parts.push({ type: 'emote', name: chars.slice(r.s, r.e + 1).join(''), url: `https://static-cdn.jtvnw.net/emoticons/v2/${r.id}/default/dark/2.0` });
      i = r.e + 1;
    }
    if (i < chars.length) parts.push(...textParts(chars.slice(i).join('')));
    if (this.thirdParty && this.ctx.settings().twitch.thirdPartyEmotes) parts = applyWordEmotes(parts, this.thirdParty);
    if (tags.bits) {
      parts = parts.flatMap(p => {
        if (p.type !== 'text') return [p];
        return p.text.split(/(\s+)/).filter(Boolean).map(w => {
          const m = /^([a-z0-9]+?)(\d+)$/i.exec(w);
          if (m && CHEER_PREFIXES.has(m[1].toLowerCase())) {
            const n = Number(m[2]);
            return { type: 'cheer', name: w, url: cheerUrl(m[1].toLowerCase(), cheerTier(n)), amount: n, color: CHEER_COLORS[cheerTier(n)] };
          }
          return { type: 'text', text: w };
        });
      });
    }
    return parts;
  }

  handle(msg) {
    const { command, tags, trailing, nick } = msg;
    const chan = this.source.target;
    switch (command) {
      case 'PING': this.ws.send(`PONG :${trailing || 'tmi.twitch.tv'}`); return;
      case 'RECONNECT': try { this.ws.close(); } catch { /* ignore */ } return;
      case '001': return;
      case 'ROOMSTATE':
        if (tags['room-id'] && this.roomId !== tags['room-id']) {
          this.roomId = tags['room-id'];
          this.attempt = 0;
          this.setState('live', 'Connected to chat');
          loadChannelEmotes(this.roomId).then(m => { this.thirdParty = m; }).catch(() => {});
        }
        return;
      case 'NOTICE':
        if (/does not exist|suspended|banned/i.test(trailing || '')) { this.setState('error', trailing); this.stopped = true; }
        return;
      case 'JOIN': {
        if (!nick || nick.startsWith('justinfan') || nick === chan) return;
        this.push({ type: 'join', user: { id: nick, login: nick, name: nick, avatar: `/avatar/twitch/${nick}` }, event: { kind: 'join', title: 'joined the chat' } });
        return;
      }
      case 'CLEARCHAT':
        this.emit('delete', tags['target-user-id'] ? { userId: tags['target-user-id'] } : { all: true });
        return;
      case 'CLEARMSG':
        if (tags['target-msg-id']) this.emit('delete', { ids: [tags['target-msg-id']] });
        return;
      case 'PRIVMSG': return this.onPrivmsg(tags, nick, trailing || '');
      case 'USERNOTICE': return this.onUserNotice(tags, trailing || '');
      default:
    }
  }

  onPrivmsg(tags, nick, text) {
    let action = false;
    if (text.startsWith('\u0001ACTION ') && text.endsWith('\u0001')) { text = text.slice(8, -1); action = true; }
    const user = this.user(tags, nick);
    const flags = { action, firstMessage: tags['first-msg'] === '1' };
    if (tags['reply-parent-display-name']) flags.reply = { name: tags['reply-parent-display-name'], text: tags['reply-parent-msg-body'] };
    if (tags['source-room-id'] && tags['room-id'] && tags['source-room-id'] !== tags['room-id']) flags.shared = true;
    const base = { id: tags.id, user, parts: this.parts(text, tags), flags, time: Number(tags['tmi-sent-ts']) || Date.now() };

    if (tags.bits) {
      const n = Number(tags.bits);
      return this.push({ ...base, type: 'cheer', event: { kind: 'cheer', title: `cheered ${n.toLocaleString()} bits`, amount: `${n.toLocaleString()} bits`, image: cheerUrl('cheer', cheerTier(n)), color: CHEER_COLORS[cheerTier(n)], value: n } });
    }
    if (tags['pinned-chat-paid-amount']) {
      const amt = Number(tags['pinned-chat-paid-amount']) / 10 ** Number(tags['pinned-chat-paid-exponent'] || 2);
      return this.push({ ...base, type: 'superchat', event: { kind: 'hypechat', title: 'sent a Hype Chat', amount: `${amt.toFixed(2)} ${tags['pinned-chat-paid-currency'] || ''}`.trim(), color: '#9147ff' } });
    }
    if (tags['msg-id'] === 'highlighted-message') return this.push({ ...base, type: 'redemption', event: { kind: 'redemption', title: 'highlighted their message', color: '#9147ff' } });
    if (tags['custom-reward-id']) return this.push({ ...base, type: 'redemption', event: { kind: 'redemption', title: 'redeemed a reward', color: '#9147ff' } });
    if (tags['msg-id'] === 'gigantified-emote-message') { base.flags.gigantify = true; return this.push({ ...base, type: 'powerup', event: { kind: 'powerup', title: 'used Power-up: Gigantify an Emote', color: '#9147ff' } }); }
    if (tags['msg-id'] === 'animated-message') return this.push({ ...base, type: 'powerup', event: { kind: 'powerup', title: 'used Power-up: Message Effects', color: '#9147ff' } });
    this.push(base);
  }

  onUserNotice(tags, text) {
    const id = tags['msg-id'];
    const user = this.user(tags, tags.login);
    const parts = this.parts(text, tags);
    const p = k => tags[`msg-param-${k}`];
    const plan = SUB_PLAN[p('sub-plan')] || 'Tier 1';
    const base = { id: tags.id, user, parts, time: Number(tags['tmi-sent-ts']) || Date.now() };
    switch (id) {
      case 'sub':
      case 'resub': {
        const months = Number(p('cumulative-months')) || 1;
        return this.push({ ...base, type: 'sub', event: { kind: 'sub', title: id === 'sub' ? `subscribed with ${plan === 'Prime' ? 'Prime' : plan}` : `resubscribed for ${months} months`, amount: plan, color: '#9147ff', value: months } });
      }
      case 'subgift':
        return this.push({ ...base, type: 'giftsub', event: { kind: 'giftsub', title: `gifted a ${plan} sub to ${p('recipient-display-name')}`, amount: '1 gift', color: '#9147ff', value: 1 } });
      case 'submysterygift': {
        const n = Number(p('mass-gift-count')) || 1;
        return this.push({ ...base, type: 'giftsub', event: { kind: 'giftsub', title: `is gifting ${n} ${plan} subs to the community`, amount: `${n} gifts`, color: '#9147ff', value: n } });
      }
      case 'giftpaidupgrade':
      case 'primepaidupgrade':
        return this.push({ ...base, type: 'sub', event: { kind: 'sub', title: 'continued their sub', color: '#9147ff' } });
      case 'raid': {
        const n = Number(p('viewerCount')) || 0;
        return this.push({ ...base, type: 'raid', user: { ...user, name: p('displayName') || user.name }, event: { kind: 'raid', title: `is raiding with ${n.toLocaleString()} viewers`, amount: `${n.toLocaleString()} viewers`, color: '#ff6b3d', value: n } });
      }
      case 'announcement':
        return this.push({ ...base, type: 'announcement', event: { kind: 'announcement', title: 'Announcement', color: { BLUE: '#00d6d6', GREEN: '#00db84', ORANGE: '#ffb31a', PURPLE: '#9147ff' }[p('color')] || '#9147ff' } });
      case 'viewermilestone':
        return this.push({ ...base, type: 'streak', event: { kind: 'streak', title: `is on a ${p('value')}-stream watch streak`, color: '#ff9a3d' } });
      default:
        if (tags['system-msg']) this.push({ ...base, type: 'notice', parts: textParts(tags['system-msg']), event: { kind: 'notice', title: '', color: '#9147ff' } });
    }
  }
}

module.exports = { TwitchConnector };
