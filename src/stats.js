'use strict';
/* Live numbers for the counter overlays: how many people watch each stream right now, and how many
   followers each channel has. Connectors report viewers; src/followers.js (and some live events) report
   followers. Everything is keyed by chat source, and 'change' fires (throttled) when a number moves. */
const { EventEmitter } = require('node:events');

class Stats extends EventEmitter {
  constructor() {
    super();
    this.viewers = new Map();    // sourceId -> { count, at }   (count null = not live)
    this.followers = new Map();  // sourceId -> { count, at, err }
    this.sources = [];           // [{ id, platform, label, channel, enabled }]
    this.timer = null;
  }

  changed() {
    if (this.timer) return;
    this.timer = setTimeout(() => { this.timer = null; this.emit('change', this.view()); }, 150);
  }

  setSources(list) {
    this.sources = list.map(s => ({ id: s.id, platform: s.platform, label: s.channel || s.label, enabled: s.enabled !== false }));
    const ids = new Set(this.sources.map(s => s.id));
    for (const m of [this.viewers, this.followers]) for (const id of m.keys()) if (!ids.has(id)) m.delete(id);
    this.changed();
  }

  setViewers(sourceId, count) {
    const n = count == null || !Number.isFinite(Number(count)) ? null : Math.max(0, Math.round(Number(count)));
    const old = this.viewers.get(sourceId);
    if (old && old.count === n) return;
    this.viewers.set(sourceId, { count: n, at: Date.now() });
    this.changed();
  }

  setFollowers(sourceId, count, err = null) {
    const old = this.followers.get(sourceId);
    if (count == null || !Number.isFinite(Number(count))) {
      // keep the last good number; just remember what went wrong
      if (old) { if (old.err !== err) { old.err = err; this.changed(); } return; }
      this.followers.set(sourceId, { count: null, at: Date.now(), err });
      return this.changed();
    }
    const n = Math.max(0, Math.round(Number(count)));
    if (old && old.count === n) { old.err = null; old.at = Date.now(); return; }
    this.followers.set(sourceId, { count: n, at: Date.now(), err: null });
    this.changed();
  }

  /** What the overlays and the control panel get. */
  view() {
    const on = this.sources.filter(s => s.enabled);
    const viewers = on.map(s => ({ id: s.id, platform: s.platform, label: s.label, count: this.viewers.get(s.id)?.count ?? null }));
    const followers = on.map(s => { const f = this.followers.get(s.id); return { id: s.id, platform: s.platform, label: s.label, count: f?.count ?? null, err: f?.err || null, at: f?.at || 0 }; });
    const total = viewers.reduce((n, v) => n + (v.count || 0), 0);
    return { viewers, followers, totalViewers: total, live: viewers.some(v => v.count != null), totalFollowers: followers.reduce((n, f) => n + (f.count || 0), 0) };
  }
}

module.exports = new Stats();
