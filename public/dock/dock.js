/* Mergio OBS docks: /dock/chat (every chat in one list), /dock/gifts (gifts, subs and other alerts, with replay)
   and /dock/viewers (live viewer numbers). Made for narrow OBS Custom Browser Docks. No user text is set as HTML. */
(() => {
  'use strict';
  const VIEW = (/^\/dock\/(chat|gifts|viewers)/.exec(location.pathname) || [])[1] || 'chat';
  const $ = id => document.getElementById(id);
  const main = $('main');
  const h = (tag, attrs = {}, ...kids) => {
    const e = document.createElement(tag);
    for (const [k, v] of Object.entries(attrs || {})) {
      if (v == null || v === false) continue;
      if (k === 'class') e.className = v;
      else if (k === 'text') e.textContent = v;
      else if (k.startsWith('on')) e.addEventListener(k.slice(2), v);
      else e.setAttribute(k, v === true ? '' : v);
    }
    for (const kid of kids.flat()) if (kid != null && kid !== false) e.append(kid.nodeType ? kid : document.createTextNode(String(kid)));
    return e;
  };
  const icon = (name, cls) => mergioIcon(name, { cls });
  const NAMES = { twitch: 'Twitch', youtube: 'YouTube', kick: 'Kick', tiktok: 'TikTok', facebook: 'Facebook' };
  const PLATFORMS = Object.keys(NAMES);
  const safe = u => (typeof u === 'string' && (/^https:\/\//i.test(u) || /^\/(avatar|shared)\//.test(u)) ? u : '');
  const fmt = n => Math.round(n).toLocaleString('en-US');
  const time = t => new Date(t).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  const store = { get: k => { try { return localStorage.getItem(k); } catch { return null; } }, set: (k, v) => { try { localStorage.setItem(k, v); } catch { /* private */ } } };
  let toastT;
  const toast = (msg, err) => { const t = $('toast'); t.textContent = msg; t.classList.toggle('err', !!err); t.classList.add('show'); clearTimeout(toastT); toastT = setTimeout(() => t.classList.remove('show'), 2200); };
  const api = async (path, body) => {
    const r = await fetch(path, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body || {}) });
    const j = await r.json().catch(() => ({}));
    if (!r.ok) throw new Error(j.error || `Something went wrong (${r.status})`);
    return j;
  };
  function readable(hex) {
    const m = /^#?([\da-f]{2})([\da-f]{2})([\da-f]{2})$/i.exec(hex || '');
    if (!m) return '';
    let [r, g, b] = [1, 2, 3].map(i => parseInt(m[i], 16));
    const lum = (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255;
    if (lum < 0.45) { const k = Math.min(0.7, (0.45 - lum) * 1.6 + 0.2); r += (255 - r) * k; g += (255 - g) * k; b += (255 - b) * k; }
    return `rgb(${r | 0},${g | 0},${b | 0})`;
  }
  const avatar = m => h('img', { class: 'av', alt: '', loading: 'lazy', referrerpolicy: 'no-referrer', src: safe(m.user.avatar) || `/avatar/default/${encodeURIComponent(m.user.name || '?')}` });
  const plat = p => { const s = h('span', { class: `pl p-${p}`, title: NAMES[p] || p }); s.append(icon(p)); return s; };
  /** Message text with emotes as pictures. */
  function parts(m) {
    const t = h('span', { class: 'txt' });
    for (const p of m.parts || []) {
      const u = (p.type === 'emote' || p.type === 'cheer') && safe(p.url);
      if (u) t.append(h('img', { class: 'em', src: u, alt: p.name, title: p.name, referrerpolicy: 'no-referrer' }));
      else t.append(p.text || p.name || '');
    }
    return t;
  }
  const evText = ev => {
    const amount = String(ev.amount || ''), num = amount.match(/\d[\d.,]*/)?.[0];
    return `${ev.title || ''}${amount && (!num || /^[×x]/i.test(amount) || !(ev.title || '').includes(num)) ? ` · ${amount}` : ''}`;
  };

  let settings = null, stats = null;
  const hidden = new Set();

  /* ======================= Chat ======================= */
  const chat = { list: [], off: new Set(JSON.parse(store.get('mg-dock-off') || '[]')), unseen: 0 };
  function chatRow(m) {
    const name = h('b', { class: 'nm', text: m.user.name });
    const c = readable(m.user.color); if (c) name.style.color = c;
    const isEv = m.event && m.type !== 'chat';
    const body = h('div', { class: 'bd' }, h('div', { class: 'hd' }, plat(m.platform), name, h('time', { text: time(m.time) })));
    if (isEv) { const e = h('span', { class: 'ev', text: evText(m.event) }); if (m.event.color) e.style.setProperty('--evc', m.event.color); body.append(e); }
    if ((m.parts || []).length) body.append(parts(m));
    const row = h('div', { class: `row ${isEv ? 'is-ev' : ''} ${hidden.has(m.id) ? 'hid' : ''}`, 'data-id': m.id, style: `--pc: var(--${m.platform})` }, avatar(m), body);
    if (!hidden.has(m.id) && !['join', 'like'].includes(m.type)) row.append(h('button', { class: 'act', title: 'Hide from the overlay', 'aria-label': `Hide the message from ${m.user.name} from the overlay`,
      onclick: async () => { try { await api('/api/hide', { ids: [m.id] }); } catch (e) { toast(e.message, true); } } }, icon('eyeoff')));
    return row;
  }
  const chatShown = m => !chat.off.has(m.platform) && m.type !== 'join';
  function chatTools() {
    const tools = $('tools'); tools.textContent = '';
    const used = PLATFORMS.filter(p => chat.list.some(m => m.platform === p) || (settings?.__sources || []).some(s => s.platform === p));
    for (const p of used) {
      const b = h('button', { class: `chip ${chat.off.has(p) ? 'off' : ''}`, style: `--pc: var(--${p})`, title: `${chat.off.has(p) ? 'Show' : 'Hide'} ${NAMES[p]} messages here`, 'aria-pressed': String(!chat.off.has(p)),
        onclick: () => { chat.off.has(p) ? chat.off.delete(p) : chat.off.add(p); store.set('mg-dock-off', JSON.stringify([...chat.off])); chatTools(); chatFill(); } }, icon(p));
      tools.append(b);
    }
  }
  const atBottom = () => main.scrollHeight - main.scrollTop - main.clientHeight < 60;
  function chatFill() {
    main.textContent = '';
    const list = chat.list.filter(chatShown).slice(-250);
    if (!list.length) main.append(h('div', { class: 'empty' }, icon('chat'), h('span', { text: 'Messages from all your chats show up here.' })));
    for (const m of list) main.append(chatRow(m));
    main.scrollTop = main.scrollHeight;
    jump(0);
  }
  function jump(n) {
    chat.unseen = n;
    let b = $('jump');
    if (!n) { b?.remove(); return; }
    if (!b) { b = h('button', { id: 'jump', class: 'jump', onclick: () => { main.scrollTop = main.scrollHeight; jump(0); } }); document.body.append(b); }
    b.textContent = `↓ ${n} new`;
  }
  main.addEventListener('scroll', () => { if (VIEW === 'chat' && atBottom()) jump(0); });
  function chatMsg(m) {
    const i = chat.list.findIndex(x => x.id === m.id);
    if (i >= 0) { chat.list[i] = m; const old = main.querySelector(`[data-id="${CSS.escape(m.id)}"]`); if (old) old.replaceWith(chatRow(m)); return; }
    chat.list.push(m); if (chat.list.length > 400) chat.list.shift();
    if (!chatShown(m)) return;
    main.querySelector('.empty')?.remove();
    const stick = atBottom();
    main.append(chatRow(m));
    while (main.children.length > 250) main.firstChild.remove();
    if (stick) main.scrollTop = main.scrollHeight; else jump(chat.unseen + 1);
    if (!$('tools').querySelector(`.chip[style*="--${m.platform})"]`)) chatTools();
  }

  /* ======================= Gifts ======================= */
  const gifts = { list: [], kind: store.get('mg-dock-kind') || 'all' };
  const KIND = { gift: 'gifts', kicks: 'gifts', cheer: 'money', superchat: 'money', hypechat: 'money', supersticker: 'money', sub: 'subs', giftsub: 'subs', giftmember: 'subs', member: 'subs', milestone: 'subs', follow: 'follows', raid: 'follows', host: 'follows' };
  const kindOf = m => KIND[m.event?.kind] || 'other';
  const ART = { gift: 'gift', kicks: 'coin', sub: 'star', giftsub: 'gift', giftmember: 'gift', raid: 'raid', host: 'raid', cheer: 'cheer', superchat: 'money', hypechat: 'money', supersticker: 'sparkle', member: 'crown', milestone: 'crown', redemption: 'sparkle', powerup: 'bolt', streak: 'flame', follow: 'follow' };
  function giftRow(m) {
    const ev = m.event || {};
    const pic = safe(ev.image);
    const art = h('span', { class: 'gart' }, pic ? h('img', { src: pic, alt: '', referrerpolicy: 'no-referrer' }) : icon(ART[ev.kind] || 'star'));
    if (ev.color) art.style.setProperty('--evc', ev.color);
    const name = h('b', { class: 'nm', text: m.user.name });
    const c = readable(m.user.color); if (c) name.style.color = c;
    return h('div', { class: `row gr ${hidden.has(m.id) ? 'hid' : ''}`, 'data-id': m.id, style: `--pc: var(--${m.platform})` }, art,
      h('div', { class: 'bd' }, h('div', { class: 'hd' }, plat(m.platform), name, h('time', { text: time(m.time) })), h('span', { class: 'ev', text: evText(ev) })),
      h('button', { class: 'act show', title: 'Play this alert again on the alerts overlay', 'aria-label': `Replay the alert from ${m.user.name}`,
        onclick: async () => { try { await api('/api/replay', { id: m.id }); toast('Replaying on the alerts overlay'); } catch (e) { toast(e.message, true); } } }, icon('play')));
  }
  function giftSummary() {
    const all = gifts.list;
    const n = k => all.filter(m => kindOf(m) === k).length;
    const by = new Map();
    for (const m of all) { if (kindOf(m) === 'follows') continue; const key = `${m.platform}:${m.user.name}`; const e = by.get(key) || { m, n: 0, diamonds: 0 }; e.n++; e.diamonds += Number(m.event?.diamonds) || 0; by.set(key, e); }
    const top = [...by.values()].sort((a, b) => b.diamonds - a.diamonds || b.n - a.n).slice(0, 3);
    return h('div', { class: 'sum' },
      h('div', { class: 'tot' }, ...[['gifts', 'gift', 'Gifts'], ['subs', 'star', 'Subs'], ['money', 'money', 'Bits & Super Chats'], ['follows', 'follow', 'Follows & raids']].map(([k, ic, t]) => h('span', { class: 'tc', title: t }, icon(ic), h('b', { text: String(n(k)) })))),
      top.length ? h('div', { class: 'top3' }, h('small', { text: 'Top supporters' }), ...top.map((e, i) => h('span', { class: 'sup' }, h('i', { text: String(i + 1) }), avatar(e.m), h('b', {}, plat(e.m.platform), ' ', e.m.user.name), h('small', { text: e.diamonds ? `${fmt(e.diamonds)} 💎` : `${e.n}×` })))) : null);
  }
  function giftTools() {
    const tools = $('tools'); tools.textContent = '';
    for (const [k, t] of [['all', 'All'], ['gifts', 'Gifts'], ['subs', 'Subs'], ['money', '$'], ['follows', 'Follows']]) {
      tools.append(h('button', { class: `seg ${gifts.kind === k ? 'on' : ''}`, 'aria-pressed': String(gifts.kind === k), onclick: () => { gifts.kind = k; store.set('mg-dock-kind', k); giftTools(); giftFill(); } }, t));
    }
  }
  function giftFill() {
    main.textContent = '';
    main.append(giftSummary());
    const list = gifts.list.filter(m => gifts.kind === 'all' || kindOf(m) === gifts.kind).slice(-200).reverse();
    if (!list.length) main.append(h('div', { class: 'empty' }, icon('gift'), h('span', { text: 'Gifts, subs, Super Chats, follows and raids show up here. Press ▶ on one to play it again on stream.' })));
    for (const m of list) main.append(giftRow(m));
  }
  function giftMsg(m) {
    if (!m.event || ['chat', 'join', 'like', 'share'].includes(m.type)) return;
    const i = gifts.list.findIndex(x => x.id === m.id);
    if (i >= 0) gifts.list[i] = m; else { gifts.list.push(m); if (gifts.list.length > 300) gifts.list.shift(); }
    const top = main.scrollTop;
    giftFill();
    main.scrollTop = top;
  }

  /* ======================= Viewers ======================= */
  function spark(hist) {
    if (!hist || hist.length < 2) return null;
    const W = 300, H = 46, max = Math.max(...hist.map(x => x[1]), 1), min = Math.min(...hist.map(x => x[1]));
    const pts = hist.map((x, i) => `${(i / (hist.length - 1)) * W},${H - 3 - ((x[1] - min) / Math.max(1, max - min)) * (H - 8)}`).join(' ');
    const NS = 'http://www.w3.org/2000/svg';
    const svg = document.createElementNS(NS, 'svg'); svg.setAttribute('viewBox', `0 0 ${W} ${H}`); svg.setAttribute('preserveAspectRatio', 'none'); svg.setAttribute('class', 'spark');
    const area = document.createElementNS(NS, 'polygon'); area.setAttribute('points', `0,${H} ${pts} ${W},${H}`); area.setAttribute('class', 'a');
    const line = document.createElementNS(NS, 'polyline'); line.setAttribute('points', pts); line.setAttribute('class', 'l');
    svg.append(area, line);
    return svg;
  }
  function viewersFill() {
    main.textContent = '';
    $('tools').textContent = '';
    const s = stats || { viewers: [], totalViewers: 0 };
    const per = {};
    for (const v of s.viewers) { if (v.count == null) { if (!(v.platform in per)) per[v.platform] = null; continue; } per[v.platform] = (per[v.platform] || 0) + v.count; }
    const live = s.viewers.some(v => v.count != null);
    $('sub').textContent = live ? 'live' : 'not live';
    $('sub').className = `sub ${live ? 'live' : ''}`;
    main.append(h('div', { class: 'big' },
      h('div', { class: 'bn' }, h('span', { class: `dot ${live ? 'live' : ''}` }), h('b', { text: fmt(s.totalViewers || 0) }), h('small', { text: 'watching' })),
      h('div', { class: 'pk' }, h('small', { text: 'Peak' }), h('b', { text: fmt(s.peakViewers || 0) }))));
    const sp = spark(s.history); if (sp) main.append(h('div', { class: 'sparkbox' }, sp, h('small', { text: 'Last hour' })));
    const plats = PLATFORMS.filter(p => p in per);
    const total = plats.reduce((n, p) => n + (per[p] || 0), 0);
    if (!plats.length) main.append(h('div', { class: 'empty' }, icon('raid'), h('span', { text: 'Add your channels in Mergio. Their viewer counts show up here when you go live.' })));
    for (const p of plats) {
      const n = per[p];
      main.append(h('div', { class: `vrow ${n == null ? 'off' : ''}`, style: `--pc: var(--${p})` }, plat(p), h('span', { class: 'vn', text: NAMES[p] }),
        h('span', { class: 'bar' }, h('i', { style: `width:${total && n ? Math.max(3, (n / total) * 100) : 0}%` })), h('b', { text: n == null ? 'Not live' : fmt(n) })));
    }
  }

  /* ======================= wiring ======================= */
  const TITLES = { chat: 'Chat', gifts: 'Gifts & alerts', viewers: 'Viewers' };
  $('title').textContent = TITLES[VIEW];
  document.title = `Mergio ${TITLES[VIEW]}`;
  document.body.dataset.view = VIEW;
  const fill = () => (VIEW === 'chat' ? (chatTools(), chatFill()) : VIEW === 'gifts' ? (giftTools(), giftFill()) : viewersFill());

  let retry = 0;
  function connect() {
    const ws = new WebSocket(`ws://${location.host}/ws?client=dock`);
    ws.onopen = () => { retry = 0; $('conn').hidden = true; };
    ws.onmessage = e => {
      const d = JSON.parse(e.data);
      if (d.op === 'hello') {
        settings = d.settings; settings.__sources = d.sources; stats = d.stats;
        chat.list = d.recent || []; gifts.list = d.events || [];
        fill();
      } else if (d.op === 'msg') { if (VIEW === 'chat') chatMsg(d.msg); else if (VIEW === 'gifts') giftMsg(d.msg); }
      else if (d.op === 'stats') { stats = d.stats; if (VIEW === 'viewers') viewersFill(); }
      else if (d.op === 'sources' && settings) settings.__sources = d.sources;
      else if (d.op === 'delete' && Array.isArray(d.ids)) {
        for (const id of d.ids) hidden.add(id);
        if (VIEW !== 'viewers') for (const id of d.ids) { const el = main.querySelector(`[data-id="${CSS.escape(id)}"]`); if (el) { el.classList.add('hid'); el.querySelector('.act:not(.show)')?.remove(); } }
      } else if (d.op === 'clear') {
        const keep = Array.isArray(d.keep) ? new Set(d.keep) : null;
        chat.list = keep ? chat.list.filter(m => keep.has(m.id)) : [];
        if (VIEW === 'chat') chatFill();
      }
    };
    ws.onclose = () => { $('conn').hidden = retry < 1; setTimeout(connect, Math.min(10000, 1000 * 2 ** retry++)); };
  }
  connect();
})();
