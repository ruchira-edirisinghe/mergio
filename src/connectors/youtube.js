'use strict';
const { Connector, textParts } = require('./base');
const { fetchText, backoff, log, UA } = require('../util');

const COOKIE = 'SOCS=CAI; CONSENT=YES+1';
const pickThumb = t => { const u = t?.thumbnails?.at(-1)?.url || ''; return u.startsWith('//') ? 'https:' + u : u; };
const argb = n => {
  if (n == null) return '';
  n >>>= 0;
  return `#${[(n >> 16) & 255, (n >> 8) & 255, n & 255].map(x => x.toString(16).padStart(2, '0')).join('')}`;
};
const simple = t => (t ? t.simpleText ?? (t.runs || []).map(r => r.text ?? r.emoji?.emojiId ?? '').join('') : '');

function runsToParts(runs = []) {
  const parts = [];
  for (const r of runs) {
    if (r.text != null) parts.push(...textParts(r.text));
    else if (r.emoji) {
      const e = r.emoji;
      if (!e.isCustomEmoji && e.emojiId && !e.emojiId.includes('/')) parts.push({ type: 'text', text: e.emojiId });
      else parts.push({ type: 'emote', name: e.shortcuts?.[0] || e.emojiId || '', url: pickThumb(e.image) });
    }
  }
  return parts;
}

function author(r) {
  const roles = { broadcaster: false, mod: false, vip: false, sub: false, member: false, verified: false };
  const badges = [];
  for (const b of r.authorBadges || []) {
    const br = b.liveChatAuthorBadgeRenderer || {};
    const type = br.icon?.iconType;
    if (type === 'OWNER') { roles.broadcaster = true; badges.push({ id: 'owner', title: 'Owner' }); }
    else if (type === 'MODERATOR') { roles.mod = true; badges.push({ id: 'moderator', title: 'Moderator' }); }
    else if (type === 'VERIFIED') { roles.verified = true; badges.push({ id: 'verified', title: 'Verified' }); }
    else if (br.customThumbnail) { roles.member = true; roles.sub = true; badges.push({ id: 'member', title: br.tooltip || 'Member', img: pickThumb(br.customThumbnail) }); }
  }
  const name = simple(r.authorName) || 'YouTube user';
  return { id: r.authorExternalChannelId || name, login: name, name, avatar: pickThumb(r.authorPhoto), color: '', badges, roles };
}

class YouTubeConnector extends Connector {
  start() {
    this.attempt = 0;
    this.seen = new Set();
    this.run();
  }

  stop() { super.stop(); clearTimeout(this.timer); }

  later(fn, ms) { clearTimeout(this.timer); if (!this.stopped) this.timer = setTimeout(fn, ms); }

  async resolveVideoId() {
    const t = this.source.target;
    if (/^[\w-]{11}$/.test(t)) return t;
    // "@handle" | "channel/UC…" | "c/name" | "user/name" (checked when the chat was added)
    const html = await fetchText(`https://www.youtube.com/${encodeURI(t)}/live?hl=en`, { headers: { Cookie: COOKIE } });
    const canon = /<link rel="canonical" href="https:\/\/www\.youtube\.com\/watch\?v=([\w-]{11})"/.exec(html);
    const title = /<meta name="title" content="([^"]*)"/.exec(html);
    if (title) this.channelName = t.startsWith('@') ? t : this.channelName;
    return canon ? canon[1] : null;
  }

  async run() {
    if (this.stopped) return;
    try {
      this.setState('connecting', 'Looking for the live stream…');
      const videoId = await this.resolveVideoId();
      if (!videoId) {
        this.setState('waiting', 'Not live right now. Checking again every 30s.');
        return this.later(() => this.run(), 30000);
      }
      this.videoId = videoId;
      const html = await fetchText(`https://www.youtube.com/live_chat?is_popout=1&hl=en&v=${videoId}`, { headers: { Cookie: COOKIE } });
      this.apiKey = /"INNERTUBE_API_KEY":"([^"]+)"/.exec(html)?.[1] || '';
      this.clientVersion = /"INNERTUBE_CLIENT_VERSION":"([^"]+)"/.exec(html)?.[1] || /"clientVersion":"([^"]+)"/.exec(html)?.[1] || '2.20250101.00.00';
      const dataJson = /(?:window\["ytInitialData"\]|var ytInitialData|ytInitialData)\s*=\s*(\{.+?\});\s*<\/script>/s.exec(html)?.[1];
      const lcr = dataJson && JSON.parse(dataJson)?.contents?.liveChatRenderer;
      if (!lcr) {
        this.setState('waiting', 'Live chat is not available for this video (not live, ended, or chat disabled). Retrying in 30s.');
        return this.later(() => this.run(), 30000);
      }
      const items = lcr.header?.liveChatHeaderRenderer?.viewSelector?.sortFilterSubMenuRenderer?.subMenuItems || [];
      const all = items.find(i => /live chat/i.test(i.title || '') && !/top/i.test(i.title || '')) || items[1];
      this.continuation = all?.continuation?.reloadContinuationData?.continuation || contOf(lcr.continuations?.[0]).token;
      if (!this.continuation) throw new Error('Could not find the chat continuation token');
      this.startedAt = Date.now() * 1000 - 15e6; // ignore backlog older than ~15s (µs)
      this.attempt = 0;
      this.setState('live', `Connected to chat of video ${videoId}`);
      this.poll();
    } catch (e) {
      const wait = backoff(this.attempt++, 5000);
      this.setState('error', `${e.message}. Retrying in ${Math.round(wait / 1000)}s`);
      this.later(() => this.run(), wait);
    }
  }

  async poll() {
    if (this.stopped) return;
    try {
      const res = await fetch(`https://www.youtube.com/youtubei/v1/live_chat/get_live_chat?prettyPrint=false${this.apiKey ? '&key=' + this.apiKey : ''}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'User-Agent': UA, Cookie: COOKIE, Origin: 'https://www.youtube.com' },
        body: JSON.stringify({ context: { client: { clientName: 'WEB', clientVersion: this.clientVersion, hl: 'en', gl: 'US' } }, continuation: this.continuation }),
        signal: AbortSignal.timeout(15000),
      });
      if (!res.ok) throw new Error(`YouTube answered ${res.status}`);
      const json = await res.json();
      const lcc = json.continuationContents?.liveChatContinuation;
      if (!lcc) {
        this.setState('waiting', 'The stream has ended. Watching for the next one…');
        return this.later(() => this.run(), 30000);
      }
      for (const a of lcc.actions || []) this.onAction(a);
      const next = contOf(lcc.continuations?.[0]);
      if (next.token) this.continuation = next.token;
      this.attempt = 0;
      if (this.state !== 'live') this.setState('live', `Connected to chat of video ${this.videoId}`);
      this.later(() => this.poll(), Math.min(4000, Math.max(1000, next.timeout || 2000)));
    } catch (e) {
      const wait = backoff(this.attempt++, 2000, 30000);
      this.setState('waiting', `${e.message}. Retrying in ${Math.round(wait / 1000)}s`);
      this.later(() => (this.attempt > 4 ? this.run() : this.poll()), wait);
    }
  }

  onAction(a) {
    if (a.markChatItemAsDeletedAction) return this.emit('delete', { ids: [a.markChatItemAsDeletedAction.targetItemId] });
    if (a.removeChatItemAction) return this.emit('delete', { ids: [a.removeChatItemAction.targetItemId] });
    if (a.markChatItemsByAuthorAsDeletedAction) return this.emit('delete', { userId: a.markChatItemsByAuthorAsDeletedAction.externalChannelId });
    const item = a.addChatItemAction?.item;
    if (!item) return;
    const [kind, r] = Object.entries(item)[0] || [];
    if (!r || !r.id || this.seen.has(r.id)) return;
    if (r.timestampUsec && Number(r.timestampUsec) < this.startedAt) return;
    this.seen.add(r.id);
    if (this.seen.size > 5000) this.seen = new Set([...this.seen].slice(-2000));
    const time = r.timestampUsec ? Math.floor(Number(r.timestampUsec) / 1000) : Date.now();

    switch (kind) {
      case 'liveChatTextMessageRenderer':
        return this.push({ id: r.id, time, user: author(r), parts: runsToParts(r.message?.runs) });
      case 'liveChatPaidMessageRenderer':
        return this.push({ id: r.id, time, type: 'superchat', user: author(r), parts: runsToParts(r.message?.runs),
          event: { kind: 'superchat', title: 'sent a Super Chat', amount: simple(r.purchaseAmountText), color: argb(r.bodyBackgroundColor) || '#ffca28', headerColor: argb(r.headerBackgroundColor) } });
      case 'liveChatPaidStickerRenderer':
        return this.push({ id: r.id, time, type: 'supersticker', user: author(r),
          event: { kind: 'supersticker', title: 'sent a Super Sticker', amount: simple(r.purchaseAmountText), image: pickThumb(r.sticker), color: argb(r.backgroundColor) || '#ffca28' } });
      case 'liveChatMembershipItemRenderer': {
        const milestone = simple(r.headerPrimaryText);
        return this.push({ id: r.id, time, type: milestone ? 'milestone' : 'member', user: author(r), parts: runsToParts(r.message?.runs),
          event: { kind: milestone ? 'milestone' : 'member', title: milestone ? milestone : (simple(r.headerSubtext) || 'became a member'), amount: milestone ? '' : 'New member', color: '#0f9d58' } });
      }
      case 'liveChatSponsorshipsGiftPurchaseAnnouncementRenderer': {
        const h = r.header?.liveChatSponsorshipsHeaderRenderer || {};
        const title = simple(h.primaryText) || 'gifted memberships';
        const n = Number(/(\d+)/.exec(title)?.[1]) || 1;
        return this.push({ id: r.id, time, type: 'giftsub', user: { ...author({ ...h, authorExternalChannelId: r.authorExternalChannelId }) },
          event: { kind: 'giftmember', title: title.replace(/^Gifted/i, 'gifted'), amount: `${n} gifts`, image: pickThumb(h.image), color: '#0f9d58', value: n } });
      }
      case 'liveChatSponsorshipsGiftRedemptionAnnouncementRenderer':
        return this.push({ id: r.id, time, type: 'member', user: author(r),
          event: { kind: 'giftreceived', title: simple(r.message) || 'received a gift membership', color: '#0f9d58' } });
      default:
        if (process.env.MERGIO_DEBUG) log('youtube', 'unhandled renderer', kind);
    }
  }
}

function contOf(c) {
  if (!c) return {};
  const d = c.invalidationContinuationData || c.timedContinuationData || c.reloadContinuationData || c.liveChatReplayContinuationData;
  return { token: d?.continuation, timeout: d?.timeoutMs };
}

module.exports = { YouTubeConnector };
