'use strict';
const { Connector, textParts } = require('./base');
const { fetchJson, backoff } = require('../util');

const GRAPH = 'https://graph.facebook.com/v21.0';
const LOOK_EVERY = 30000;   // how often to look for a new live video while offline
const CHECK_EVERY = 20000;  // how often to check that the live video is still live (and how many watch)

/**
 * Facebook does not expose live comments without authentication, so this connector uses the official
 * Graph API with a Page access token (see README > Facebook).
 *
 * Two kinds of source:
 *  - "page:<name or id>" (or "page:me" for the token's own Page): waits for the Page to go live, connects to
 *    that live video's comments, and goes back to waiting when it ends. Add it once, works for every stream.
 *  - a video id: reads the comments of that one live video.
 */
class FacebookConnector extends Connector {
  start() { this.attempt = 0; this.run(); }
  stop() { super.stop(); clearTimeout(this.timer); }
  later(fn, ms) { clearTimeout(this.timer); if (!this.stopped) this.timer = setTimeout(fn, ms); }

  token() { return this.ctx.settings().advanced.facebookAccessToken.trim(); }
  api(path, params = '') { return fetchJson(`${GRAPH}/${path}${path.includes('?') ? '&' : '?'}${params}${params ? '&' : ''}access_token=${encodeURIComponent(this.token())}`); }
  get pageMode() { return this.source.target.startsWith('page:'); }

  async run() {
    if (this.stopped) return;
    if (!this.token()) {
      this.setState('error', 'Facebook needs a Page token. Open Settings > Accounts & keys and click Show me how. It takes about 5 minutes.');
      return;
    }
    try {
      if (this.pageMode) return await this.findLive();
      this.setState('connecting', 'Opening the Facebook live video…');
      const info = await this.api(this.source.target, 'fields=title,from,live_status');
      this.channelName = info.from?.name || this.channelName;
      this.watch(this.source.target, info.title);
    } catch (e) {
      const wait = backoff(this.attempt++, 5000);
      this.setState('error', `${graphError(e)} Retrying in ${Math.round(wait / 1000)}s.`);
      this.later(() => this.run(), wait);
    }
  }

  /** Page mode: is the Page live right now? If so, connect to that video; otherwise look again shortly. */
  async findLive() {
    if (!this.page) {
      const slug = this.source.target.slice(5) || 'me';
      const page = await this.api(encodeURIComponent(slug), 'fields=id,name');
      this.page = { id: page.id, name: page.name || slug };
      this.channelName = this.page.name;
    }
    const res = await this.api(`${this.page.id}/live_videos`, `broadcast_status=${encodeURIComponent('["LIVE"]')}&fields=id,title,status,permalink_url&limit=1`);
    const live = (res.data || []).find(v => !v.status || v.status === 'LIVE');
    this.attempt = 0;
    if (!live) {
      this.setState('waiting', `${this.page.name} is not live right now. Checking again in ${LOOK_EVERY / 1000}s.`);
      return this.later(() => this.run(), LOOK_EVERY);
    }
    this.watch(live.id, live.title, live.permalink_url);
  }

  /** Starts reading the comments of one live video. */
  watch(videoId, title, permalink) {
    this.videoId = videoId;
    this.liveTitle = title || '';
    // Facebook answers with a link without the host ("/123/videos/456")
    this.liveUrl = /^\/[\w./-]+$/.test(permalink || '') ? `https://www.facebook.com${permalink}` : `https://www.facebook.com/watch/live/?v=${encodeURIComponent(videoId)}`;
    this.seen = new Set();
    this.primed = false;
    this.checkedAt = 0; // look up the viewer count straight away
    this.setState('live', `Connected${title ? ' to "' + title + '"' : ''}`);
    this.poll();
  }

  /** The live video's link and title, for the go-live alert (null while the Page isn't live). */
  liveInfo() {
    if (this.state === 'live' && this.videoId) return { url: this.liveUrl, title: this.liveTitle || '', videoId: this.videoId, started: true };
    return null;
  }

  async poll() {
    if (this.stopped) return;
    try {
      // Page mode: once a minute make sure the stream hasn't ended, then wait for the next one.
      if (Date.now() - this.checkedAt > CHECK_EVERY) {
        this.checkedAt = Date.now();
        const v = await this.api(this.videoId, 'fields=status,live_views');
        if (this.pageMode && v.status && v.status !== 'LIVE') { this.videoId = null; return this.run(); }
        this.setViewers(v.status && v.status !== 'LIVE' ? null : Number(v.live_views) || 0);
      }
      const res = await this.api(`${this.videoId}/comments`, 'order=reverse_chronological&live_filter=no_filter&filter=stream&limit=50&fields=id,message,created_time,from{id,name,picture.type(small)}');
      const fresh = (res.data || []).filter(c => !this.seen.has(c.id)).reverse();
      for (const c of fresh) {
        this.seen.add(c.id);
        // only the newest 50 comments are ever asked for, so the last 2000 ids are plenty on a long stream
        if (this.seen.size > 5000) this.seen = new Set([...this.seen].slice(-2000));
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
      // Page mode looks for the live video again (it may have ended); a single video keeps retrying.
      this.later(() => (this.pageMode ? this.run() : this.poll()), wait);
    }
  }
}

function graphError(e) {
  try { const j = JSON.parse(e.body); if (j.error?.message) return `Facebook: ${j.error.message}`; } catch { /* not json */ }
  return `Facebook: ${e.message}`;
}

/**
 * Tells the user, in plain words, what a pasted token is: a Page token (good), a personal token (one step
 * short), or not valid. Used by the token guide before saving.
 */
async function checkToken(raw) {
  const token = String(raw || '').trim().replace(/^["']|["']$/g, '');
  if (!/^EA[A-Za-z0-9]{40,}$/.test(token)) return { ok: false, kind: 'format', message: "That doesn't look like a Facebook token. It should be one long line that starts with EA." };
  const q = `access_token=${encodeURIComponent(token)}`;
  let d;
  try { d = (await fetchJson(`${GRAPH}/debug_token?input_token=${encodeURIComponent(token)}&${q}`)).data || {}; }
  catch (e) { return { ok: false, kind: 'invalid', message: `Facebook didn't accept this token. ${graphError(e).replace(/^Facebook: /, '')}` }; }
  if (!d.is_valid) return { ok: false, kind: 'invalid', message: 'This token has expired or was cancelled. Make a new one (steps 3 to 6).' };
  const scopes = d.scopes || [];
  const missing = ['pages_read_engagement', 'pages_read_user_content'].filter(x => !scopes.includes(x));
  const expires = d.expires_at || 0;
  if (d.type !== 'PAGE') {
    return { ok: false, kind: 'user', expires, message: "This is your personal token, not your Page's. Do step 6 to turn it into a Page token." };
  }
  let name = '';
  try { name = (await fetchJson(`${GRAPH}/${d.profile_id}?fields=name&${q}`)).name || ''; } catch { /* the name is only for the message */ }
  if (missing.length) return { ok: false, kind: 'scopes', name, message: `This Page token is missing ${missing.join(' and ')}. Tick it in step 3 and make the token again.` };
  return { ok: true, kind: 'page', name, id: d.profile_id, expires };
}

module.exports = { FacebookConnector, checkToken };
