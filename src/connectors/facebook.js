'use strict';
const { Connector, textParts } = require('./base');
const { fetchJson, backoff } = require('../util');

const GRAPH = 'https://graph.facebook.com/v21.0';

/**
 * Facebook does not expose live comments without authentication, so this connector uses the official
 * Graph API with a Page access token (see README > Facebook). It polls the live video's comments every 3s.
 */
class FacebookConnector extends Connector {
  start() { this.attempt = 0; this.seen = new Set(); this.primed = false; this.run(); }
  stop() { super.stop(); clearTimeout(this.timer); }
  later(fn, ms) { clearTimeout(this.timer); if (!this.stopped) this.timer = setTimeout(fn, ms); }

  token() { return this.ctx.settings().advanced.facebookAccessToken.trim(); }

  async run() {
    if (this.stopped) return;
    if (!this.token()) {
      this.setState('error', 'Facebook needs a Page access token. Add it in Settings > Advanced (see the Help tab), then click Reconnect.');
      return;
    }
    try {
      this.setState('connecting', 'Opening the Facebook live video…');
      const info = await fetchJson(`${GRAPH}/${this.source.target}?fields=title,from,live_status&access_token=${encodeURIComponent(this.token())}`);
      this.channelName = info.from?.name || this.channelName;
      this.setState('live', `Connected${info.title ? ' to "' + info.title + '"' : ''}`);
      this.poll();
    } catch (e) {
      const msg = graphError(e);
      const wait = backoff(this.attempt++, 5000);
      this.setState('error', `${msg} Retrying in ${Math.round(wait / 1000)}s.`);
      this.later(() => this.run(), wait);
    }
  }

  async poll() {
    if (this.stopped) return;
    try {
      const url = `${GRAPH}/${this.source.target}/comments?order=reverse_chronological&live_filter=no_filter&filter=stream&limit=50&fields=id,message,created_time,from{id,name,picture.type(small)}&access_token=${encodeURIComponent(this.token())}`;
      const res = await fetchJson(url);
      const fresh = (res.data || []).filter(c => !this.seen.has(c.id)).reverse();
      for (const c of fresh) {
        this.seen.add(c.id);
        if (!this.primed) continue; // skip comments that existed before we connected
        this.push({
          id: `fb${c.id}`,
          time: Date.parse(c.created_time) || Date.now(),
          user: { id: c.from?.id || '', name: c.from?.name || 'Facebook user', login: c.from?.name || '', avatar: c.from?.picture?.data?.url || '' },
          parts: textParts(c.message || ''),
        });
      }
      this.primed = true;
      this.attempt = 0;
      if (this.state !== 'live') this.setState('live', 'Connected');
      this.later(() => this.poll(), 3000);
    } catch (e) {
      const wait = backoff(this.attempt++, 3000, 60000);
      this.setState('waiting', `${graphError(e)} Retrying in ${Math.round(wait / 1000)}s.`);
      this.later(() => this.poll(), wait);
    }
  }
}

function graphError(e) {
  try { const j = JSON.parse(e.body); if (j.error?.message) return `Facebook: ${j.error.message}`; } catch { /* not json */ }
  return `Facebook: ${e.message}`;
}

module.exports = { FacebookConnector };
