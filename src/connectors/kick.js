'use strict';
const WebSocket = require('ws');
const { Connector, textParts } = require('./base');
const { curlJson, backoff, log } = require('../util');
const { kickGiftImage } = require('../gifts');

/* Kick's realtime service is Centrifugo (it replaced Pusher). Guests get a short-lived token from Kick's web API. */
const WEB_API = 'https://web.kick.com/api/v1/realtime';
const DEFAULT_WS = 'wss://realtime.us-east-1.platform.kick.com/connection/websocket';
const KICK_GREEN = '#53fc18';

/** "[emote:37226:KEKW] hello" -> parts */
function kickParts(content = '') {
  const parts = [];
  const re = /\[emote:(\d+):([^\]]*)\]/g;
  let last = 0, m;
  while ((m = re.exec(content))) {
    if (m.index > last) parts.push(...textParts(content.slice(last, m.index)));
    parts.push({ type: 'emote', name: m[2], url: `https://files.kick.com/emotes/${m[1]}/fullsize` });
    last = m.index + m[0].length;
  }
  if (last < content.length) parts.push(...textParts(content.slice(last)));
  return parts;
}

class KickConnector extends Connector {
  start() {
    this.attempt = 0;
    this.clientId = `mergio-${Math.random().toString(36).slice(2, 12)}`;
    this.cmdId = 1;
    this.connect();
  }

  stop() {
    super.stop();
    clearTimeout(this.retryTimer); clearTimeout(this.refreshTimer);
    try { this.ws?.close(); } catch { /* ignore */ }
  }

  send(obj) { try { this.ws.send(JSON.stringify({ id: this.cmdId++, ...obj })); } catch { /* closed */ } }

  token() { return curlJson(`${WEB_API}/auth/connection`, { client_id: this.clientId }).then(r => r?.data?.token); }

  /** Guest tokens expire (~45 min); refresh shortly before that so the connection never drops. */
  scheduleRefresh(ttl) {
    clearTimeout(this.refreshTimer);
    if (!ttl) return;
    this.refreshTimer = setTimeout(async () => {
      try { this.send({ refresh: { token: await this.token() } }); } catch (e) { log('kick', 'token refresh failed', e.message); try { this.ws.close(); } catch { /* ignore */ } }
    }, Math.max(30, ttl - 120) * 1000);
  }

  retry(reason) {
    clearTimeout(this.refreshTimer);
    if (this.stopped) return;
    const wait = backoff(this.attempt++, 3000);
    this.setState(this.state === 'error' ? 'error' : 'waiting', `${reason || 'Disconnected'}. Retrying in ${Math.round(wait / 1000)}s`);
    this.retryTimer = setTimeout(() => this.connect(), wait);
  }

  async connect() {
    if (this.stopped) return;
    this.setState('connecting', 'Looking up the Kick channel…');
    try {
      const ch = await curlJson(`https://kick.com/api/v2/channels/${encodeURIComponent(this.source.target)}`);
      if (!ch?.chatroom?.id) throw new Error(ch?.message || 'Channel not found');
      this.channel = ch;
      this.channelName = ch.user?.username || ch.slug;
      this.subBadges = (ch.subscriber_badges || []).sort((a, b) => a.months - b.months);
    } catch (e) {
      this.state = 'error';
      return this.retry(`Kick lookup failed: ${e.message}`);
    }
    let url = DEFAULT_WS, token;
    try {
      const conf = await curlJson(`${WEB_API}/channels/${this.channel.id}/chat/connection`, {
        client: { id: this.clientId, type: 'web' }, capabilities: { accepted_providers: [{ provider: 'centrifugo' }] },
      });
      url = conf?.data?.connections?.find(c => c.provider === 'centrifugo')?.credentials?.url || DEFAULT_WS;
      token = await this.token();
      if (!token) throw new Error('no guest token');
    } catch (e) {
      this.state = 'error';
      return this.retry(`Kick realtime login failed: ${e.message}`);
    }
    const ws = (this.ws = new WebSocket(url, { headers: { Origin: 'https://kick.com' } }));
    ws.on('open', () => this.send({ connect: { token, name: 'js' } }));
    ws.on('message', raw => {
      for (const line of raw.toString().split('\n')) {
        if (!line) continue;
        if (line === '{}') { try { ws.send('{}'); } catch { /* closed */ } continue; } // Centrifugo ping -> pong
        let msg; try { msg = JSON.parse(line); } catch { continue; }
        if (msg.connect) { this.scheduleRefresh(msg.connect.ttl); this.subscribe(); continue; }
        if (msg.refresh) { this.scheduleRefresh(msg.refresh.ttl); continue; }
        if (msg.error) { log('kick', 'realtime error', msg.error); continue; }
        const pub = msg.push?.pub?.data;
        if (!pub?.event) continue;
        let data = pub.data;
        if (typeof data === 'string') { try { data = JSON.parse(data); } catch { /* keep string */ } }
        this.onEvent(pub.event, data || {});
      }
    });
    ws.on('close', (code, reason) => this.retry(code === 1000 ? 'Disconnected' : `Disconnected (${code} ${reason})`));
    ws.on('error', e => log('kick', e.message));
  }

  subscribe() {
    const { chatroom, id } = this.channel;
    for (const channel of [`chatrooms.${chatroom.id}.v2`, `chatroom_${chatroom.id}`, `channel.${id}`, `channel_${id}`]) this.send({ subscribe: { channel } });
    this.attempt = 0;
    this.setState('live', this.channel.livestream ? 'Connected to chat (live)' : 'Connected to chat (channel is offline right now)');
  }

  user(sender = {}) {
    const roles = { broadcaster: false, mod: false, vip: false, sub: false, member: false, verified: false };
    const badges = [];
    const v2 = sender.identity?.badges_v2 || [];
    for (const b of v2) if (b.image_url && b.badge_type === 'global' && b.name !== 'level') badges.push({ id: `kick-${b.name}`, title: b.name, img: b.image_url });
    for (const b of sender.identity?.badges || []) {
      const t = b.type;
      if (t === 'broadcaster') roles.broadcaster = true;
      if (t === 'moderator') roles.mod = true;
      if (t === 'vip') roles.vip = true;
      if (t === 'verified') roles.verified = true;
      if (t === 'subscriber' || t === 'founder') roles.sub = true;
      let img = '';
      if (t === 'subscriber' && this.subBadges?.length) {
        const fit = this.subBadges.filter(s => s.months <= (b.count || 1)).at(-1) || this.subBadges[0];
        img = fit?.badge_image?.src || '';
      }
      badges.push({ id: `kick-${t}`, title: b.text || t, img });
    }
    const login = sender.slug || (sender.username || '').toLowerCase();
    return {
      id: String(sender.id || login), login, name: sender.username || 'Kick user',
      color: sender.identity?.color || '', avatar: login ? `/avatar/kick/${encodeURIComponent(login)}` : '', badges, roles,
    };
  }

  simpleUser(name) {
    const login = String(name || '').toLowerCase();
    return { id: login, login, name: name || 'Someone', avatar: login ? `/avatar/kick/${encodeURIComponent(login)}` : '' };
  }

  onEvent(event, d) {
    switch (event) {
      case 'App\\Events\\ChatMessageEvent': {
        const flags = {};
        if (d.type === 'reply' && d.metadata?.original_sender) flags.reply = { name: d.metadata.original_sender.username, text: d.metadata.original_message?.content || '' };
        return this.push({ id: d.id, time: Date.parse(d.created_at) || Date.now(), user: this.user(d.sender), parts: kickParts(d.content), flags });
      }
      case 'App\\Events\\MessageDeletedEvent': return this.emit('delete', { ids: [d.message?.id] });
      case 'App\\Events\\UserBannedEvent': return this.emit('delete', { userId: String(d.user?.id || '') });
      case 'App\\Events\\ChatroomClearEvent': return this.emit('delete', { all: true });
      case 'App\\Events\\SubscriptionEvent': {
        const months = Number(d.months) || 1;
        return this.push({ type: 'sub', user: this.simpleUser(d.username), event: { kind: 'sub', title: months > 1 ? `resubscribed for ${months} months` : 'subscribed', amount: months > 1 ? `${months} months` : 'New sub', color: KICK_GREEN, value: months } });
      }
      case 'App\\Events\\GiftedSubscriptionsEvent': {
        const n = (d.gifted_usernames || []).length || 1;
        return this.push({ type: 'giftsub', user: this.simpleUser(d.gifter_username), event: { kind: 'giftsub', title: `gifted ${n} sub${n > 1 ? 's' : ''}${n === 1 && d.gifted_usernames?.[0] ? ' to ' + d.gifted_usernames[0] : ''}`, amount: `${n} gift${n > 1 ? 's' : ''}`, color: KICK_GREEN, value: n } });
      }
      case 'App\\Events\\StreamHostEvent': {
        const n = Number(d.number_viewers) || 0;
        return this.push({ type: 'raid', user: this.simpleUser(d.host_username), parts: textParts(d.optional_message || ''), event: { kind: 'host', title: `is hosting with ${n.toLocaleString()} viewers`, amount: `${n.toLocaleString()} viewers`, color: KICK_GREEN, value: n } });
      }
      case 'RewardRedeemedEvent':
      case 'App\\Events\\RewardRedeemedEvent':
        return this.push({ type: 'redemption', user: this.simpleUser(d.username), parts: textParts(d.user_input || ''), event: { kind: 'redemption', title: `redeemed ${d.reward_title || 'a reward'}`, color: d.reward_background_color || KICK_GREEN } });
      case 'KicksGifted':
      case 'App\\Events\\KicksGifted': {
        const g = d.gift || {};
        const amount = Number(g.amount) || 0;
        return this.push({ type: 'gift', user: { ...this.simpleUser(d.sender?.username), color: d.sender?.username_color || '' }, parts: textParts(d.message || ''), event: { kind: 'kicks', title: `sent ${g.name || 'Kicks'}`, amount: `${amount.toLocaleString()} Kicks`, image: kickGiftImage(g.gift_id), color: KICK_GREEN, value: amount } });
      }
      case 'App\\Events\\FollowersUpdated':
        if (d.followed && d.username) return this.push({ type: 'follow', user: this.simpleUser(d.username), event: { kind: 'follow', title: 'followed', color: KICK_GREEN } });
        return;
      case 'App\\Events\\StreamerIsLive':
        return this.setState('live', 'Connected to chat (live)');
      case 'App\\Events\\StopStreamBroadcast':
        return this.setState('live', 'Connected to chat (stream ended)');
      default:
        if (process.env.MERGIO_DEBUG) log('kick', 'unhandled', event, JSON.stringify(d).slice(0, 300));
    }
  }
}

module.exports = { KickConnector };
