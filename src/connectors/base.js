'use strict';
const { EventEmitter } = require('node:events');
const { log, uid } = require('../util');

/**
 * Every platform connector extends this. It emits:
 *   'message' (normalized message, see README "Message format")
 *   'delete'  ({ ids?: string[], userId?: string })   moderation sync
 *   'status'  ()                                       when state/detail changed
 *   'viewers' (number | null)                          people watching right now (null = not live)
 *   'followers' (number)                               the channel's follower count, when a live event tells us
 */
class Connector extends EventEmitter {
  constructor(source, ctx) {
    super();
    this.source = source;          // { id, platform, target, label }
    this.ctx = ctx;                // { settings: () => settings }
    this.state = 'idle';           // idle | connecting | live | waiting | error | stopped
    this.detail = '';
    this.stopped = false;
    this.channelName = source.label;
  }

  setState(state, detail = '') {
    if (this.state === state && this.detail === detail) return;
    this.state = state; this.detail = detail;
    if (state !== 'live') this.setViewers(null);
    // Just connected: look up the viewer count now instead of at the next regular check.
    else if (typeof this.lookViewers === 'function') setTimeout(() => { if (!this.stopped) this.lookViewers().catch(() => {}); }, 1500);
    log(this.source.platform, `${this.source.label}: ${state}${detail ? ' - ' + detail : ''}`);
    this.emit('status');
  }

  /** Builds a normalized message with sane defaults. */
  push(m) {
    const msg = {
      id: m.id || uid(this.source.platform[0]),
      platform: this.source.platform,
      sourceId: this.source.id,
      channel: this.channelName,
      type: m.type || 'chat',
      time: m.time || Date.now(),
      user: {
        id: '', name: 'Unknown', login: '', color: '', avatar: '', badges: [],
        roles: { broadcaster: false, mod: false, vip: false, sub: false, member: false, verified: false },
        ...(m.user || {}),
      },
      parts: m.parts || [],
      event: m.event || null,
      flags: m.flags || {},
    };
    msg.user.roles = { broadcaster: false, mod: false, vip: false, sub: false, member: false, verified: false, ...(m.user?.roles || {}) };
    this.emit('message', msg);
  }

  setViewers(n) {
    const v = n == null ? null : Number(n);
    if (this.viewers === v) return;
    this.viewers = v;
    this.emit('viewers', v);
  }

  setFollowers(n) { if (Number.isFinite(Number(n)) && Number(n) > 0) this.emit('followers', Number(n)); }

  /** Runs fn every `ms` while this connector is running (used to look up the viewer count). */
  every(ms, fn) {
    clearInterval(this.everyTimer);
    const tick = () => { if (!this.stopped) Promise.resolve().then(fn).catch(() => {}); };
    tick();
    this.everyTimer = setInterval(tick, ms);
    this.everyTimer.unref?.();
  }

  /** The live stream's { url, title, videoId, started } for the go-live alert, when the platform tells us. */
  liveInfo() { return null; }

  start() {}
  stop() { this.stopped = true; clearInterval(this.everyTimer); this.setViewers(null); this.setState('stopped'); }
}

/** Splits plain text into parts, turning http(s) links into link parts (overlay may embed images). */
function textParts(text) {
  if (!text) return [];
  const out = [];
  const re = /(https?:\/\/[^\s<>"]+)/g;
  let last = 0, m;
  while ((m = re.exec(text))) {
    if (m.index > last) out.push({ type: 'text', text: text.slice(last, m.index) });
    out.push({ type: 'link', text: m[1], url: m[1] });
    last = m.index + m[1].length;
  }
  if (last < text.length) out.push({ type: 'text', text: text.slice(last) });
  return out;
}

/** Replaces words that match an emote map ({ name: url }) inside text parts. */
function applyWordEmotes(parts, map) {
  if (!map || !map.size) return parts;
  const out = [];
  for (const p of parts) {
    if (p.type !== 'text') { out.push(p); continue; }
    const words = p.text.split(/(\s+)/);
    let buf = '';
    for (const w of words) {
      const url = map.get(w);
      if (url) {
        if (buf) out.push({ type: 'text', text: buf });
        buf = '';
        out.push({ type: 'emote', name: w, url });
      } else buf += w;
    }
    if (buf) out.push({ type: 'text', text: buf });
  }
  return out;
}

module.exports = { Connector, textParts, applyWordEmotes };
