'use strict';
/**
 * Posts the go-live message with the streamer's own Discord bot, to channels picked by server and channel
 * name. Discord doesn't let apps post as a person, and a bot can find servers, channels and roles by name
 * (a webhook can't), so "Zenitron Gaming / live-alerts / @CUSTOMERS" is all the streamer types.
 */
const { log, redact } = require('./util');

// MERGIO_DISCORD_API: a stand-in Discord for the self-test (npm run check)
const api = () => process.env.MERGIO_DISCORD_API || 'https://discord.com/api/v10';
const UA = 'DiscordBot (https://github.com/ruchira-edirisinghe/mergio, 1.0)';
// View channel, Send messages, Embed links, Read message history, Mention everyone (lets role pings work)
const PERMS = 1024 + 2048 + 16384 + 65536 + 131072;
const CACHE_FOR = 5 * 60e3;
const TEXT = 0, NEWS = 5; // channel types that take messages

const sleep = ms => new Promise(r => { const t = setTimeout(r, ms); t.unref?.(); });

/** One request to Discord's API with the bot's token; waits and tries again once when Discord says "slow down". */
async function call(token, path, { method = 'GET', body } = {}, retried = false) {
  const res = await fetch(api() + path, {
    method,
    headers: { Authorization: `Bot ${token}`, 'User-Agent': UA, ...(body ? { 'Content-Type': 'application/json' } : {}) },
    body: body ? JSON.stringify(body) : undefined,
    signal: AbortSignal.timeout(15000),
  });
  const text = await res.text().catch(() => '');
  let json = null;
  try { json = text ? JSON.parse(text) : null; } catch { /* not json */ }
  if (res.status === 429 && !retried) {
    await sleep(Math.min(30, Number(json?.retry_after) || 2) * 1000);
    return call(token, path, { method, body }, true);
  }
  if (!res.ok) throw Object.assign(new Error(json?.message || `HTTP ${res.status}`), { status: res.status, code: json?.code });
  return json;
}

/** "📢┃Live-Alerts" and "live alerts" are the same name: letters and numbers only, any case. */
const core = s => String(s || '').normalize('NFKC').toLowerCase().replace(/[^\p{L}\p{N}]+/gu, '');

/** The item whose name matches: exactly, or else the only one that contains the name. */
function pick(list, name, nameOf = x => x.name) {
  const want = core(name);
  if (!want) return null;
  const exact = list.filter(x => core(nameOf(x)) === want);
  if (exact.length) return exact[0];
  const part = list.filter(x => core(nameOf(x)).includes(want));
  return part.length === 1 ? part[0] : null;
}

/** What to ping: "@everyone, @CUSTOMERS" -> Discord's mention text, the allowed_mentions and the roles not found. */
function mentionFor(ping, roles = []) {
  const parse = [], ids = [], text = [], missing = [];
  for (let tok of String(ping || '').split(',').map(x => x.trim()).filter(Boolean)) {
    let m;
    if ((m = /^<@&(\d{5,30})>$/.exec(tok) || /^(\d{5,30})$/.exec(tok))) { ids.push(m[1]); text.push(`<@&${m[1]}>`); continue; }
    tok = tok.replace(/^@/, '');
    if (/^(everyone|here)$/i.test(tok)) { text.push(`@${tok.toLowerCase()}`); if (!parse.length) parse.push('everyone'); continue; }
    const role = pick(roles.filter(r => r.name !== '@everyone'), tok);
    if (role) { ids.push(role.id); text.push(`<@&${role.id}>`); } else missing.push(`@${tok}`);
  }
  return { text: text.join(' '), allowed: { parse, roles: [...new Set(ids)], users: [] }, missing };
}

/* ---------- finding servers, channels and roles by name ---------- */

const cache = new Map(); // token -> { at, me, guilds, channels: Map, roles: Map }
async function look(token, fresh = false) {
  let c = cache.get(token);
  if (!c || fresh || Date.now() - c.at > CACHE_FOR) {
    const me = await call(token, '/users/@me');
    const guilds = await call(token, '/users/@me/guilds');
    c = { at: Date.now(), me, guilds, channels: new Map(), roles: new Map() };
    cache.clear();
    cache.set(token, c);
  }
  return c;
}
async function channelsOf(token, c, gid) {
  if (!c.channels.has(gid)) c.channels.set(gid, await call(token, `/guilds/${gid}/channels`));
  return c.channels.get(gid);
}
async function rolesOf(token, c, gid) {
  if (!c.roles.has(gid)) c.roles.set(gid, await call(token, `/guilds/${gid}/roles`));
  return c.roles.get(gid);
}

const label = t => `${t.server} › #${t.channel}`;
/** True when the ping names a role, which has to be looked up in that server. */
const needsRoles = ping => String(ping || '').split(',').map(x => x.trim().replace(/^@/, ''))
  .some(x => x && !/^(everyone|here)$/i.test(x) && !/^(?:<@&)?\d{5,30}>?$/.test(x));

/** Finds each { server, channel, ping } the streamer typed. Each answer has ok, or an error to show. */
async function resolve(token, targets, fresh = false) {
  const c = await look(token, fresh);
  const out = [];
  for (const t of targets) {
    const r = { target: t, label: label(t), ok: false };
    out.push(r);
    const guild = pick(c.guilds, t.server);
    if (!guild) { r.error = `The bot isn't in a server called “${t.server}”. Invite it with the link on this page.`; continue; }
    try {
      const channel = pick((await channelsOf(token, c, guild.id)).filter(ch => ch.type === TEXT || ch.type === NEWS), t.channel);
      if (!channel) { r.error = `There's no text channel called “#${t.channel}” in ${guild.name}.`; continue; }
      const mention = mentionFor(t.ping, needsRoles(t.ping) ? await rolesOf(token, c, guild.id) : []);
      Object.assign(r, { ok: true, guild, channel, mention, label: `${guild.name} › #${channel.name}` });
      if (mention.missing.length) r.warning = `No role called ${mention.missing.join(', ')} in ${guild.name}, so it posts without that ping.`;
    } catch (e) { r.error = explain(e, t); }
  }
  return out;
}

function explain(e, t) {
  if (e.status === 401) return 'Discord says the bot token is wrong or was reset. Copy a new one (Bot → Reset Token).';
  if (e.status === 403 || e.code === 50001 || e.code === 50013) return `The bot can't post in #${t?.channel || 'this channel'}. Let it view the channel and send messages there.`;
  if (e.status === 429) return 'Discord asked Mergio to slow down. Try again in a minute.';
  if (e.name === 'TimeoutError') return "Discord didn't answer in time.";
  if (!e.status) return `Couldn't reach Discord: ${redact(e.message)}`;
  return `Discord said no (${e.status}: ${redact(e.message).slice(0, 160)}).`;
}

/**
 * Posts content to one found channel. A real post is skipped when the bot already posted this stream's link
 * there, so Mergio on the PC and on the phone never post the same stream twice.
 */
async function send(token, r, content, { url, test = false } = {}) {
  const c = await look(token);
  try {
    if (!test && url) {
      const recent = await call(token, `/channels/${r.channel.id}/messages?limit=25`).catch(() => []);
      if (recent.some(m => m.author?.id === c.me.id && String(m.content || '').includes(url))) return { dest: 'discord', label: r.label, ok: true, skipped: true };
    }
    const msg = await call(token, `/channels/${r.channel.id}/messages`, { method: 'POST', body: { content, allowed_mentions: test ? { parse: [] } : r.mention.allowed } });
    // an announcement channel: publish it to the servers that follow it too (needs Manage Messages; fine without)
    if (r.channel.type === NEWS && !test) call(token, `/channels/${r.channel.id}/messages/${msg.id}/crosspost`, { method: 'POST' }).catch(() => {});
    return { dest: 'discord', label: r.label, ok: true, ...(r.warning ? { warning: r.warning } : {}) };
  } catch (e) {
    const error = explain(e, r.target);
    log('golive', `discord ${r.label}: ${error}`);
    return { dest: 'discord', label: r.label, ok: false, error };
  }
}

const invite = id => `https://discord.com/oauth2/authorize?client_id=${encodeURIComponent(id)}&scope=bot&permissions=${PERMS}`;

/** For the control panel: is the token right, which servers is the bot in, and can it find every channel? */
async function check(token, targets) {
  if (!token) return { ok: false, error: 'Paste your bot’s token first.' };
  try {
    const list = await resolve(token, targets, true);
    const c = await look(token);
    return {
      ok: list.every(r => r.ok), bot: { name: c.me.username, id: c.me.id }, invite: invite(c.me.id),
      servers: c.guilds.map(g => g.name), targets: list.map(r => ({ label: r.label, ok: r.ok, error: r.error, warning: r.warning })),
    };
  } catch (e) { return { ok: false, error: explain(e) }; }
}

module.exports = { resolve, send, check, mentionFor, pick, core, invite, PERMS };
