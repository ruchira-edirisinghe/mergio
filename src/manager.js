'use strict';
const { EventEmitter } = require('node:events');
const settings = require('./settings');
const stats = require('./stats');
const { detect } = require('./detect');
const { uid, log } = require('./util');
const { TwitchConnector } = require('./connectors/twitch');
const { YouTubeConnector } = require('./connectors/youtube');
const { KickConnector } = require('./connectors/kick');
const { TikTokConnector } = require('./connectors/tiktok');
const { FacebookConnector } = require('./connectors/facebook');

const CONNECTORS = { twitch: TwitchConnector, youtube: YouTubeConnector, kick: KickConnector, tiktok: TikTokConnector, facebook: FacebookConnector };

/** A chat from config.json must still pass the same checks as one added in the control panel. */
function valid(s) {
  try {
    if (!s || typeof s.id !== 'string' || !/^[\w-]{1,40}$/.test(s.id) || !CONNECTORS[s.platform]) throw new Error('unknown chat');
    detect(`${s.platform}:${s.target}`);
    return true;
  } catch { log('manager', `skipping an invalid chat in config.json: ${JSON.stringify(s).slice(0, 120)}`); return false; }
}
const BUFFER = 150;

/** Owns the list of chat sources, runs one connector per source and fans messages out to listeners. */
class Manager extends EventEmitter {
  constructor() {
    super();
    this.running = new Map();   // sourceId -> connector
    this.counts = new Map();    // sourceId -> messages received
    this.recent = [];           // last BUFFER messages (overlay backfill + dashboard feed)
    this.ctx = { settings: settings.get };
    this.on('status', list => stats.setSources(list));
  }

  startAll() {
    for (const s of settings.get().sources) if (s.enabled !== false && valid(s)) this.startSource(s);
  }

  stopAll() { for (const c of this.running.values()) c.stop(); this.running.clear(); }

  startSource(source) {
    this.running.get(source.id)?.stop();
    // Own keys only: a platform like "constructor" from a hand-edited config must not reach Object's constructor.
    const Impl = Object.hasOwn(CONNECTORS, source.platform) ? CONNECTORS[source.platform] : null;
    if (!Impl) return;
    const c = new Impl(source, this.ctx);
    c.on('message', m => this.onMessage(m));
    c.on('delete', d => this.onDelete(source, d));
    c.on('status', () => this.emit('status', this.list()));
    c.on('viewers', n => stats.setViewers(source.id, n));
    c.on('followers', n => stats.setFollowers(source.id, n));
    this.running.set(source.id, c);
    try { c.start(); } catch (e) { log('manager', e); c.setState('error', e.message); }
    this.emit('status', this.list());
  }

  add(input) {
    const found = detect(input);
    const all = settings.get().sources;
    if (all.some(s => s.platform === found.platform && s.target.toLowerCase() === found.target.toLowerCase())) {
      throw new Error(`${found.label} (${found.platform}) is already in your list.`);
    }
    const source = { id: uid('s'), ...found, enabled: true, addedAt: Date.now() };
    settings.update({ sources: [...all, source] });
    this.startSource(source);
    return source;
  }

  remove(id) {
    this.running.get(id)?.stop();
    this.running.delete(id);
    this.counts.delete(id);
    settings.update({ sources: settings.get().sources.filter(s => s.id !== id) });
    this.emit('status', this.list());
  }

  setEnabled(id, enabled) {
    const sources = settings.get().sources.map(s => (s.id === id ? { ...s, enabled } : s));
    settings.update({ sources });
    const s = sources.find(x => x.id === id);
    if (!s) return;
    if (enabled) this.startSource(s);
    else { this.running.get(id)?.stop(); this.running.delete(id); stats.setViewers(id, null); this.emit('status', this.list()); }
  }

  reconnect(id) {
    const s = settings.get().sources.find(x => x.id === id);
    if (s) { if (s.enabled === false) this.setEnabled(id, true); else this.startSource(s); }
  }

  reconnectPlatform(platform) {
    for (const s of settings.get().sources) if (s.platform === platform && s.enabled !== false) this.startSource(s);
  }

  list() {
    return settings.get().sources.map(s => {
      const c = this.running.get(s.id);
      return {
        ...s,
        channel: c?.channelName || s.label,
        state: s.enabled === false ? 'paused' : c?.state || 'idle',
        detail: s.enabled === false ? 'Paused' : c?.detail || '',
        count: this.counts.get(s.id) || 0,
      };
    });
  }

  onMessage(m) {
    if (m.sourceId) this.counts.set(m.sourceId, (this.counts.get(m.sourceId) || 0) + 1);
    const i = this.recent.findIndex(x => x.id === m.id);
    if (i >= 0) this.recent[i] = m; else { this.recent.push(m); if (this.recent.length > BUFFER) this.recent.shift(); }
    this.emit('message', m);
  }

  onDelete(source, d) {
    const payload = { platform: source.platform, sourceId: source.id, ...d };
    if (d.all) this.recent = this.recent.filter(m => m.sourceId !== source.id);
    else if (d.ids) this.recent = this.recent.filter(m => !d.ids.includes(m.id));
    else if (d.userId) this.recent = this.recent.filter(m => !(m.sourceId === source.id && m.user.id === d.userId));
    this.emit('delete', payload);
  }

  /** Injects a message that did not come from a connector (test messages). */
  inject(m) { this.onMessage(m); }
}

module.exports = { Manager };
