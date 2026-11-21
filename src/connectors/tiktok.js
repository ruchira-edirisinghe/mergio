'use strict';
const { Connector, textParts } = require('./base');
const { backoff, log } = require('../util');
const gifts = require('../gifts');

const TT_PINK = '#fe2c55';
let lib = null;
const loadLib = () => (lib ||= require('tiktok-live-connector'));

// Picture URL from an image object; browsers can't show HEIC, so prefer any other format.
const pic = img => {
  const urls = [img?.url, img?.urlList, img?.url_list].flat().filter(u => typeof u === 'string' && /^https:\/\//.test(u));
  return urls.find(u => !/\.heic/i.test(u)) || '';
};

class TikTokConnector extends Connector {
  start() {
    this.attempt = 0;
    this.streaks = new Map();   // user+gift -> message id while a gift combo is running
    this.likes = new Map();     // user -> { id, count, timer }
    gifts.warm();
    this.connect();
  }

  stop() {
    super.stop();
    clearTimeout(this.retryTimer);
    for (const l of this.likes.values()) clearTimeout(l.timer);
    try { this.conn?.disconnect(); } catch { /* ignore */ }
  }

  later(ms, why, state = 'waiting') {
    if (this.stopped) return;
    clearTimeout(this.retryTimer);
    this.setState(state, `${why} Checking again in ${Math.round(ms / 1000)}s.`);
    this.retryTimer = setTimeout(() => this.connect(), ms);
  }

  async connect() {
    if (this.stopped) return;
    const { TikTokLiveConnection, WebcastEvent, ControlEvent } = loadLib();
    const key = this.ctx.settings().advanced.tiktokSignApiKey || undefined;
    try { this.conn?.disconnect(); } catch { /* ignore */ }
    const conn = (this.conn = new TikTokLiveConnection(this.source.target, { signApiKey: key }));
    this.setState('connecting', 'Connecting to TikTok LIVE…');
    this.connectedAt = Date.now();
    // The first batch TikTok sends is recent history; skip anything older than ~10s before we connected.
    const fresh = d => !(Number(d?.common?.createTime) < this.connectedAt - 10000);

    conn.on(WebcastEvent.CHAT, d => fresh(d) && this.push({ id: d.common?.msgId && `tt${d.common.msgId}`, user: this.user(d.user, d.userIdentity), parts: textParts(d.content ?? d.comment ?? '') }));
    conn.on(WebcastEvent.MEMBER, d => fresh(d) && this.push({ type: 'join', user: this.user(d.user, d.userIdentity), event: { kind: 'join', title: 'joined the LIVE', color: TT_PINK } }));
    conn.on(WebcastEvent.GIFT, d => fresh(d) && this.onGift(d));
    conn.on(WebcastEvent.LIKE, d => fresh(d) && this.onLike(d));
    if (WebcastEvent.ROOM_USER) conn.on(WebcastEvent.ROOM_USER, d => { const n = Number(d.total ?? d.viewerCount); if (Number.isFinite(n)) this.setViewers(n); });
    conn.on(WebcastEvent.FOLLOW, d => this.setFollowers(d.followCount));
    conn.on(WebcastEvent.FOLLOW, d => this.push({ type: 'follow', user: this.user(d.user, d.userIdentity), event: { kind: 'follow', title: 'followed', color: TT_PINK } }));
    conn.on(WebcastEvent.SHARE, d => this.push({ type: 'share', user: this.user(d.user, d.userIdentity), event: { kind: 'share', title: 'shared the LIVE', color: TT_PINK } }));
    if (WebcastEvent.SUBSCRIBE) conn.on(WebcastEvent.SUBSCRIBE, d => this.push({ type: 'sub', user: this.user(d.user, d.userIdentity), event: { kind: 'sub', title: 'subscribed', amount: 'Subscriber', color: TT_PINK } }));
    conn.on(WebcastEvent.STREAM_END, () => this.later(30000, 'The LIVE has ended.'));
    conn.on(ControlEvent.DISCONNECTED, () => { if (!this.stopped && this.state === 'live') this.later(backoff(this.attempt++, 3000), 'Disconnected.'); });
    conn.on(ControlEvent.ERROR, e => log('tiktok', e?.info || e?.message || String(e)));

    try {
      const state = await conn.connect();
      this.attempt = 0;
      this.channelName = '@' + this.source.target;
      this.setState('live', `Connected to LIVE (room ${state?.roomId || '?'})`);
      const info = state?.roomInfo || conn.roomInfo || {};
      const owner = info.owner || info.data?.owner || {};
      this.setFollowers(owner.follow_info?.follower_count ?? owner.followInfo?.followerCount);
      const watching = Number(info.user_count ?? info.data?.user_count);
      if (Number.isFinite(watching) && watching > 0) this.setViewers(watching);
    } catch (e) {
      const msg = String(e?.message || e);
      if (/offline|not live|isn't online|UserOffline/i.test(msg) || e?.name === 'UserOfflineError') return this.later(30000, `@${this.source.target} is not live right now.`);
      if (/rate ?limit|429/i.test(msg)) return this.later(60000, 'TikTok sign server rate limit hit (add a free Euler Stream key in Settings > Advanced).', 'error');
      this.later(backoff(this.attempt++, 10000), `TikTok: ${msg.slice(0, 160)}.`, 'error');
    }
  }

  user(u = {}, ident = {}) {
    const roles = { broadcaster: !!ident?.isAnchor, mod: !!ident?.isModeratorOfAnchor, vip: false, sub: !!ident?.isSubscriberOfAnchor, member: false, verified: !!u.verified };
    const badges = [];
    if (roles.broadcaster) badges.push({ id: 'tt-host', title: 'Host' });
    if (roles.mod) badges.push({ id: 'tt-mod', title: 'Moderator' });
    if (roles.sub) badges.push({ id: 'tt-sub', title: 'Subscriber' });
    if (ident?.isGiftGiverOfAnchor) badges.push({ id: 'tt-gifter', title: 'Gifter' });
    const handle = u.displayId || u.uniqueId || '';
    const name = u.nickname || handle || 'TikTok user';
    return { id: String(u.id || u.userId || handle || name), login: handle, name, color: '', avatar: pic(u.avatarThumb) || pic(u.profilePicture) || pic(u.avatarMedium), badges, roles };
  }

  onGift(d) {
    const g = d.gift || d.giftDetails || {};        // current protocol: gift; older ones: giftDetails
    const ext = d.extendedGiftInfo || {};
    const known = gifts.tiktokGift(d.giftId, g.name || g.giftName || ext.name);
    const name = g.name || g.giftName || ext.name || known?.name || 'a gift';
    const diamonds = Number(g.diamondCount || g.diamond_count || ext.diamond_count || known?.diamonds || 0);
    const count = Number(d.repeatCount) || 1;
    const image = pic(g.image) || g.giftImage?.giftPictureUrl || pic(g.giftImage) || pic(ext.image) || known?.image || pic(g.icon) || '';
    const user = this.user(d.user, d.userIdentity);
    const key = `${user.id}:${d.giftId}`;
    const streakable = g.type === 1 || g.giftType === 1 || ext.type === 1;
    let id = this.streaks.get(key);
    if (!id) { id = `ttg${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`; this.streaks.set(key, id); }
    if (!streakable || d.repeatEnd) this.streaks.delete(key);
    this.push({
      id, type: 'gift', user,
      event: { kind: 'gift', title: `sent ${name}`, amount: `×${count}`, count, image, color: TT_PINK, value: diamonds * count, diamonds: diamonds * count, live: streakable && !d.repeatEnd },
    });
  }

  onLike(d) {
    const user = this.user(d.user, d.userIdentity);
    const n = Number(d.count ?? d.likeCount) || 1;
    let l = this.likes.get(user.id);
    if (!l) { l = { id: `ttl${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`, count: 0 }; this.likes.set(user.id, l); }
    l.count += n;
    clearTimeout(l.timer);
    l.timer = setTimeout(() => this.likes.delete(user.id), 15000); // a new like card after 15s of no likes
    this.push({ id: l.id, type: 'like', user, event: { kind: 'like', title: 'liked the LIVE', amount: `×${l.count}`, count: l.count, color: TT_PINK, value: l.count } });
  }
}

module.exports = { TikTokConnector };
