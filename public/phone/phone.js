/* Mergio for Android: the phone's screens (Chat, Alerts, Viewers, Chats, Settings). Mergio's own server runs on
   the phone and connects to the chats; this page talks to it like the OBS docks do. No user text is set as HTML.
   window.MergioAndroid (from the app) keeps the screen on, reads aloud, vibrates and opens links. */
(() => {
  'use strict';
  const $ = id => document.getElementById(id);
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
  const A = window.MergioAndroid || null;
  const NAMES = { twitch: 'Twitch', youtube: 'YouTube', kick: 'Kick', tiktok: 'TikTok', facebook: 'Facebook' };
  const PLATFORMS = Object.keys(NAMES);
  const safe = u => (typeof u === 'string' && (/^https:\/\//i.test(u) || /^\/(avatar|shared)\//.test(u)) ? u : '');
  const fmt = n => Math.round(n).toLocaleString('en-US');
  const list = s => String(s || '').split(/[,\n]/).map(x => x.trim().toLowerCase()).filter(Boolean);
  const plainText = m => (m.parts || []).map(p => p.text || p.name || '').join('');

  /* ---------- this phone's own choices (not Mergio settings) ---------- */
  const PREFS = { fontSize: 15, screenOn: true, sound: false, soundType: 'chime', vibrate: true, read: 'off', off: [] };
  const prefs = (() => { try { return { ...PREFS, ...JSON.parse(localStorage.getItem('mg-phone') || '{}') }; } catch { return { ...PREFS }; } })();
  const savePrefs = () => { try { localStorage.setItem('mg-phone', JSON.stringify(prefs)); } catch { /* private */ } };
  const off = () => new Set(prefs.off || []);

  let toastT;
  const toast = (msg, err) => { const t = $('toast'); t.textContent = msg; t.classList.toggle('err', !!err); t.classList.add('show'); clearTimeout(toastT); toastT = setTimeout(() => t.classList.remove('show'), 2400); };
  const api = async (method, path, body) => {
    const r = await fetch(path, { method, headers: body ? { 'Content-Type': 'application/json' } : {}, body: body ? JSON.stringify(body) : undefined });
    const j = await r.json().catch(() => ({}));
    if (!r.ok) throw new Error(j.error || `Something went wrong (${r.status})`);
    return j;
  };
  const save = async patch => { try { const st = await api('PUT', '/api/settings', patch); S = st.settings; panel = st; } catch (e) { toast(e.message, true); } };

  function readable(hex) {
    const m = /^#?([\da-f]{2})([\da-f]{2})([\da-f]{2})$/i.exec(hex || '');
    if (!m) return '';
    let [r, g, b] = [1, 2, 3].map(i => parseInt(m[i], 16));
    const lum = (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255;
    if (lum < 0.45) { const k = Math.min(0.7, (0.45 - lum) * 1.6 + 0.2); r += (255 - r) * k; g += (255 - g) * k; b += (255 - b) * k; }
    return `rgb(${r | 0},${g | 0},${b | 0})`;
  }
  const avatar = m => {
    const img = h('img', { class: 'av', alt: '', loading: 'lazy', referrerpolicy: 'no-referrer', src: safe(m.user.avatar) || `/avatar/default/${encodeURIComponent(m.user.name || '?')}` });
    img.onerror = () => { img.onerror = null; img.src = `/avatar/default/${encodeURIComponent(m.user.name || '?')}`; };
    return img;
  };
  const plat = p => { const s = h('span', { class: 'pl', style: `--pc: var(--${p})`, title: NAMES[p] || p }); s.append(icon(p)); return s; };
  const time = t => new Date(t).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit', hour12: S?.appearance?.timeFormat !== '24' });
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

  /* ---------- state ---------- */
  let S = null;          // settings (public view, from the live connection)
  let panel = null;      // /api/state: sources, version, masked tokens
  let sources = [];
  let stats = { viewers: [], totalViewers: 0, peakViewers: 0, history: [] };
  let feed = [];         // recent messages
  let events = [];       // gifts, subs and other alerts
  let update = null;
  const hidden = new Set();
  let tab = (/^#(chat|alerts|viewers|chats|settings)$/.exec(location.hash) || [])[1] || 'chat';
  let newAlerts = 0;

  /* ---------- what the chat shows: the same filters as the overlay ---------- */
  const PLATFORM_KEYS = {
    twitch: { chat: 'messages', superchat: 'messages', cheer: 'cheers', announcement: 'announcements', sub: 'subs', notice: 'subs', giftsub: 'giftSubs', raid: 'raids', redemption: 'redemptions', powerup: 'redemptions', streak: 'watchStreaks', join: 'joins' },
    youtube: { chat: 'messages', superchat: 'superChats', supersticker: 'superStickers', member: 'memberships', milestone: 'milestones', giftsub: 'giftedMemberships' },
    kick: { chat: 'messages', sub: 'subs', giftsub: 'giftSubs', raid: 'hosts', redemption: 'rewards', gift: 'kicksGifts', follow: 'follows' },
    tiktok: { chat: 'messages', join: 'joins', gift: 'gifts', like: 'likes', follow: 'follows', share: 'shares', sub: 'subs' },
    facebook: { chat: 'messages' },
  };
  function allowed(m) {
    if (!S) return true;
    const sec = S[m.platform] || {};
    const key = PLATFORM_KEYS[m.platform]?.[m.type] || 'messages';
    if (sec[key] === false) return false;
    const g = S.general || {};
    if (m.type === 'join' && g.showJoins === false) return false;
    if (m.type === 'like' && g.showLikes === false) return false;
    if (m.platform === 'tiktok' && m.type === 'gift' && (m.event?.diamonds || 0) < (sec.minGiftDiamonds || 0)) return false;
    if (m.platform === 'twitch' && m.flags?.shared && sec.sharedChat === 'hide') return false;
    const who = [m.user.name, m.user.login].map(x => String(x || '').toLowerCase());
    if (list(g.ignoreChatters).some(n => who.includes(n))) return false;
    const text = plainText(m);
    if (m.type === 'chat' && g.excludeCommands && /^\s*!/.test(text)) return false;
    const bad = list(g.blockedWords);
    if (bad.length && bad.some(w => text.toLowerCase().includes(w))) return false;
    return true;
  }
  const isAlert = m => m.event && !['chat', 'join', 'like', 'share'].includes(m.type);
  /** My own names: a message that says one of them stands out. */
  function mentions(m) {
    if (!S?.general?.highlightMentions || m.type !== 'chat') return false;
    const names = [...list(S.general.mentionNames), ...sources.map(s => String(s.channel || s.target || '').replace(/^@/, '').toLowerCase())].filter(n => n.length > 2);
    const text = plainText(m).toLowerCase();
    return names.some(n => text.includes(`@${n}`) || text.includes(n));
  }

  /* ---------- read aloud, sound, vibration ---------- */
  function say(text) {
    text = String(text || '').replace(/https?:\/\/\S+/g, 'a link').slice(0, 220);
    if (!text.trim()) return;
    if (A?.speak) A.speak(text);
    else if (window.speechSynthesis) speechSynthesis.speak(new SpeechSynthesisUtterance(text));
  }
  function announce(m) {
    if (!allowed(m) || off().has(m.platform) || m.flags?.test && !A) return;
    const alert = isAlert(m);
    if (alert) {
      if (prefs.sound && window.mergioSound) mergioSound.play(prefs.soundType, m.event?.kind, 0.7);
      if (prefs.vibrate) { if (A?.vibrate) A.vibrate(70); else navigator.vibrate?.(70); }
    }
    const text = plainText(m).trim();
    if (prefs.read === 'all' && m.type === 'chat' && text) say(`${m.user.name}: ${text}`);
    else if ((prefs.read === 'all' || prefs.read === 'alerts') && alert) say(`${m.user.name} ${evText(m.event)}${text ? `. ${text}` : ''}`);
  }
  function applyScreenOn() { try { A?.setKeepScreenOn?.(!!prefs.screenOn); } catch { /* not in the app */ } }

  /* ======================= Chat ======================= */
  let feedEl = null, unseen = 0;
  function row(m) {
    const small = ['join', 'like', 'share'].includes(m.type);
    const ev = m.event && m.type !== 'chat';
    const name = h('b', { class: 'nm', text: m.user.name });
    const c = readable(m.user.color); if (c) name.style.color = c;
    const head = h('div', { class: 'hd' }, plat(m.platform));
    if (S?.appearance?.showBadges !== false) for (const b of (m.user.badges || []).slice(0, 3)) { const u = safe(b.img); if (u) head.append(h('img', { class: 'bdg', src: u, alt: b.title || '', title: b.title || '', referrerpolicy: 'no-referrer' })); }
    head.append(name, h('time', { text: time(m.time) }));
    const body = h('div', { class: 'bd' }, head);
    if (ev) {
      const line = h('span', { class: 'ev' });
      const pic = safe(m.event.image); if (pic && !small) line.append(h('img', { src: pic, alt: '', referrerpolicy: 'no-referrer' }));
      line.append(evText(m.event));
      if (m.event.color) line.style.setProperty('--evc', m.event.color);
      body.append(line);
    }
    if ((m.parts || []).length) body.append(parts(m));
    const r = h('div', { class: `row ${ev && !small ? 'is-ev' : ''} ${small ? 'small' : ''} ${hidden.has(m.id) ? 'hid' : ''} ${mentions(m) ? 'mention' : ''}`, 'data-id': m.id, style: `--pc: var(--${m.platform})`, onclick: () => actions(m) }, avatar(m), body);
    return r;
  }
  const shown = m => allowed(m) && !off().has(m.platform);
  const atBottom = () => !feedEl || feedEl.scrollHeight - feedEl.scrollTop - feedEl.clientHeight < 80;
  function jump(n) {
    unseen = n;
    let b = $('jump');
    if (!n) { b?.remove(); return; }
    if (!b) { b = h('button', { id: 'jump', class: 'jump', type: 'button', onclick: () => { feedEl.scrollTop = feedEl.scrollHeight; jump(0); } }); feedEl.parentElement.append(b); }
    b.textContent = `↓ ${n} new message${n === 1 ? '' : 's'}`;
  }
  function fillFeed() {
    if (!feedEl) return;
    feedEl.textContent = '';
    const items = feed.filter(shown).slice(-250);
    if (!items.length) {
      feedEl.append(h('div', { class: 'empty' }, icon('chat'),
        h('span', { text: sources.length ? 'Messages from all your chats show up here when you are live.' : 'Add your channels and their chats show up here.' }),
        sources.length ? null : h('button', { class: 'btn primary', type: 'button', onclick: () => go('chats') }, icon('plus'), 'Add a chat')));
    }
    for (const m of items) feedEl.append(row(m));
    feedEl.scrollTop = feedEl.scrollHeight;
    jump(0);
  }
  function chatScreen(main) {
    const used = PLATFORMS.filter(p => sources.some(s => s.platform === p) || feed.some(m => m.platform === p));
    const bar = h('div', { class: 'bar' });
    for (const p of used) {
      const isOff = off().has(p);
      bar.append(h('button', { class: `chip ${isOff ? 'off' : 'on'}`, type: 'button', style: `--pc: var(--${p})`, 'aria-pressed': String(!isOff),
        onclick: () => { const o = off(); o.has(p) ? o.delete(p) : o.add(p); prefs.off = [...o]; savePrefs(); render(); } }, icon(p), NAMES[p]));
    }
    feedEl = h('div', { class: 'feed', role: 'log', 'aria-live': 'polite' });
    feedEl.addEventListener('scroll', () => { if (atBottom()) jump(0); }, { passive: true });
    const wrap = h('div', { class: `chat ${S?.appearance?.showAvatar === false ? 'no-av' : ''}` }, used.length > 1 ? bar : null, feedEl);
    main.append(wrap);
    fillFeed();
  }
  function onMessage(m) {
    const i = feed.findIndex(x => x.id === m.id);
    const isNew = i < 0;
    if (i >= 0) feed[i] = m; else { feed.push(m); if (feed.length > 500) feed.shift(); }
    if (isAlert(m)) {
      const j = events.findIndex(x => x.id === m.id);
      if (j >= 0) events[j] = m; else { events.push(m); if (events.length > 300) events.shift(); if (tab !== 'alerts' && allowed(m)) { newAlerts++; tabs(); } }
    }
    if (isNew) announce(m);
    if (tab === 'chat' && feedEl) {
      if (!isNew) { const old = feedEl.querySelector(`[data-id="${CSS.escape(m.id)}"]`); if (old) old.replaceWith(row(m)); return; }
      if (!shown(m)) return;
      feedEl.querySelector('.empty')?.remove();
      const stick = atBottom();
      feedEl.append(row(m));
      while (feedEl.children.length > 250) feedEl.firstChild.remove();
      if (stick) feedEl.scrollTop = feedEl.scrollHeight; else jump(unseen + 1);
    } else if (tab === 'alerts' && isAlert(m)) render(true);
  }

  /* ---------- tap a message: copy, hide, mute ---------- */
  /** A panel that slides up from the bottom. build(close) returns its contents; Back closes it. */
  function sheet(build) {
    const close = () => scrim.remove();
    const scrim = h('div', { class: 'scrim', onclick: e => { if (e.target === scrim) { close(); if (history.state?.sheet) history.back(); } } }, h('div', { class: 'sheet', role: 'dialog', 'aria-modal': 'true' }, h('div', { class: 'grab' }), ...build(close)));
    document.body.append(scrim);
    history.pushState({ sheet: 1 }, '');
    const back = () => { close(); window.removeEventListener('popstate', back); };
    window.addEventListener('popstate', back);
    return close;
  }
  const item = (ic, text, fn, cls = '') => h('button', { class: `item ${cls}`, type: 'button', onclick: fn }, icon(ic), text);
  function actions(m) {
    const text = plainText(m);
    sheet(close => {
      const done = () => { close(); if (history.state?.sheet) history.back(); };
      return [
        h('div', { class: 'who' }, avatar(m), h('div', {}, h('b', {}, m.user.name), h('span', { text: text || (m.event ? evText(m.event) : NAMES[m.platform]) }))),
        text ? item('copy', 'Copy message', async () => { try { await navigator.clipboard.writeText(text); toast('Copied'); } catch { A?.copy?.(text); toast('Copied'); } done(); }) : null,
        !hidden.has(m.id) ? item('eyeoff', 'Hide this message', async () => { done(); try { await api('POST', '/api/hide', { ids: [m.id] }); } catch (e) { toast(e.message, true); } }) : null,
        m.user.name ? item('ban', `Mute ${m.user.name}`, async () => {
          done();
          const names = list(S.general.ignoreChatters);
          const who = String(m.user.login || m.user.name).toLowerCase();
          if (!names.includes(who)) await save({ general: { ignoreChatters: [...String(S.general.ignoreChatters || '').split(',').map(x => x.trim()).filter(Boolean), m.user.login || m.user.name].join(', ') } });
          toast(`${m.user.name} is muted. Unmute in Settings.`); render();
        }, 'danger') : null,
      ];
    });
  }
  function confirmSheet(title, text, ok, fn) {
    sheet(close => {
      const done = () => { close(); if (history.state?.sheet) history.back(); };
      return [h('h3', { text: title }), h('p', { text }), h('div', { class: 'btns' }, h('button', { class: 'btn ghost', type: 'button', onclick: done }, 'Cancel'), h('button', { class: 'btn primary', type: 'button', onclick: () => { done(); fn(); } }, ok))];
    });
  }

  /* ======================= Alerts ======================= */
  const KIND = { gift: 'gifts', kicks: 'gifts', cheer: 'money', superchat: 'money', hypechat: 'money', supersticker: 'money', sub: 'subs', giftsub: 'subs', giftmember: 'subs', member: 'subs', milestone: 'subs', follow: 'follows', raid: 'follows', host: 'follows' };
  const kindOf = m => KIND[m.event?.kind] || 'other';
  const ART = { gift: 'gift', kicks: 'coin', sub: 'star', giftsub: 'gift', giftmember: 'gift', raid: 'raid', host: 'raid', cheer: 'cheer', superchat: 'money', hypechat: 'money', supersticker: 'sparkle', member: 'crown', milestone: 'crown', redemption: 'sparkle', powerup: 'bolt', streak: 'flame', follow: 'follow' };
  let alertKind = 'all';
  function giftRow(m) {
    const ev = m.event || {};
    const pic = safe(ev.image);
    const art = h('span', { class: 'gart' }, pic ? h('img', { src: pic, alt: '', referrerpolicy: 'no-referrer' }) : icon(ART[ev.kind] || 'star'));
    if (ev.color) art.style.setProperty('--evc', ev.color);
    const name = h('b', { class: 'nm', text: m.user.name });
    const c = readable(m.user.color); if (c) name.style.color = c;
    const body = h('div', { class: 'bd' }, h('div', { class: 'hd' }, plat(m.platform), name, h('time', { text: time(m.time) })), h('span', { class: 'ev', text: evText(ev) }));
    if ((m.parts || []).length) body.append(parts(m));
    return h('div', { class: 'row gr', style: `--pc: var(--${m.platform})`, onclick: () => actions(m) }, art, body);
  }
  function alertsScreen(main) {
    const all = events.filter(allowed);
    const n = k => all.filter(m => kindOf(m) === k).length;
    const by = new Map();
    for (const m of all) { if (kindOf(m) === 'follows') continue; const key = `${m.platform}:${m.user.name}`; const e = by.get(key) || { m, n: 0, diamonds: 0 }; e.n++; e.diamonds += Number(m.event?.diamonds) || 0; by.set(key, e); }
    const top = [...by.values()].sort((a, b) => b.diamonds - a.diamonds || b.n - a.n).slice(0, 3);
    const scr = h('div', { class: 'screen' });
    scr.append(h('div', { class: 'sum' },
      h('div', { class: 'tot' }, ...[['gifts', 'gift', 'Gifts'], ['subs', 'star', 'Subs'], ['money', 'money', 'Bits & Super Chats'], ['follows', 'follow', 'Follows']].map(([k, ic, t]) => h('span', { class: 'tc' }, icon(ic), h('b', { text: String(n(k)) }), t))),
      top.length ? h('div', { class: 'top3' }, h('small', { text: 'Top supporters' }), ...top.map((e, i) => h('span', { class: 'sup' }, h('i', { text: String(i + 1) }), avatar(e.m), h('b', {}, plat(e.m.platform), e.m.user.name), h('small', { text: e.diamonds ? `${fmt(e.diamonds)} 💎` : `${e.n}×` })))) : null));
    const segs = h('div', { class: 'segs' });
    for (const [k, t] of [['all', 'All'], ['gifts', 'Gifts'], ['subs', 'Subs'], ['money', 'Bits & Super Chats'], ['follows', 'Follows & raids']]) {
      segs.append(h('button', { class: `chip ${alertKind === k ? 'on' : ''}`, type: 'button', 'aria-pressed': String(alertKind === k), onclick: () => { alertKind = k; render(); } }, t));
    }
    scr.append(segs);
    const items = all.filter(m => alertKind === 'all' || kindOf(m) === alertKind).slice(-200).reverse();
    if (!items.length) scr.append(h('div', { class: 'empty' }, icon('gift'), h('span', { text: 'Gifts, subs, Super Chats, follows and raids show up here.' })));
    const box = h('div', { class: 'feed', style: 'padding:0;overflow:visible' });
    for (const m of items) box.append(giftRow(m));
    scr.append(box);
    main.append(scr);
  }

  /* ======================= Viewers ======================= */
  function spark(hist) {
    if (!hist || hist.length < 2) return null;
    const W = 300, H = 60, max = Math.max(...hist.map(x => x[1]), 1), min = Math.min(...hist.map(x => x[1]));
    const pts = hist.map((x, i) => `${(i / (hist.length - 1)) * W},${H - 3 - ((x[1] - min) / Math.max(1, max - min)) * (H - 8)}`).join(' ');
    const NS = 'http://www.w3.org/2000/svg';
    const svg = document.createElementNS(NS, 'svg'); svg.setAttribute('viewBox', `0 0 ${W} ${H}`); svg.setAttribute('preserveAspectRatio', 'none'); svg.setAttribute('class', 'spark');
    const area = document.createElementNS(NS, 'polygon'); area.setAttribute('points', `0,${H} ${pts} ${W},${H}`); area.setAttribute('class', 'a');
    const line = document.createElementNS(NS, 'polyline'); line.setAttribute('points', pts); line.setAttribute('class', 'l');
    svg.append(area, line);
    return svg;
  }
  const perPlatform = () => {
    const per = new Map();
    for (const v of stats.viewers || []) { if (v.count == null) { if (!per.has(v.platform)) per.set(v.platform, null); continue; } per.set(v.platform, (per.get(v.platform) || 0) + v.count); }
    return per;
  };
  const isLive = () => (stats.viewers || []).some(v => v.count != null) || sources.some(s => s.state === 'live');
  function viewersScreen(main) {
    const scr = h('div', { class: 'screen' });
    const per = perPlatform();
    const live = (stats.viewers || []).some(v => v.count != null);
    scr.append(h('div', { class: 'big' },
      h('div', { class: 'bn' }, h('span', { class: `dot ${live ? 'live' : ''}` }), h('b', { text: fmt(stats.totalViewers || 0) }), h('small', { text: 'watching' })),
      h('div', { class: 'pk' }, h('small', { text: 'Peak' }), h('b', { text: fmt(stats.peakViewers || 0) }))));
    const sp = spark(stats.history); if (sp) scr.append(h('div', { class: 'sparkbox' }, sp, h('small', { text: 'Last hour' })));
    const plats = PLATFORMS.filter(p => per.has(p));
    const total = plats.reduce((n, p) => n + (per.get(p) || 0), 0);
    if (!plats.length) scr.append(h('div', { class: 'empty' }, icon('raid'), h('span', { text: 'Viewer counts for each platform show up here when you go live.' })));
    for (const p of plats) {
      const n = per.get(p);
      scr.append(h('div', { class: `vrow ${n == null ? 'off' : ''}`, style: `--pc: var(--${p})` }, plat(p), h('span', { text: NAMES[p] }),
        h('span', { class: 'bar' }, h('i', { style: `width:${total && n ? Math.max(3, (n / total) * 100) : 0}%` })), h('b', { text: n == null ? 'Not live' : fmt(n) })));
    }
    main.append(scr);
  }

  /* ======================= Chats (channels) ======================= */
  const STATE = { live: ['live', 'Connected'], waiting: ['waiting', 'Waiting for you to go live'], connecting: ['connecting', 'Connecting…'], error: ['error', 'Problem'], paused: ['', 'Paused'], idle: ['', 'Starting…'] };
  function chatsScreen(main) {
    const scr = h('div', { class: 'screen' });
    const input = h('input', { type: 'text', placeholder: 'Channel link or @name', 'aria-label': 'Channel link or name', autocapitalize: 'off', autocorrect: 'off', spellcheck: 'false', enterkeyhint: 'go' });
    const add = h('button', { class: 'btn primary', type: 'submit' }, icon('plus'), 'Add');
    const form = h('form', { class: 'add', onsubmit: async e => {
      e.preventDefault();
      const v = input.value.trim(); if (!v) return input.focus();
      add.disabled = true;
      try { const st = await api('POST', '/api/sources', { input: v }); sources = st.sources; input.value = ''; toast('Added. Mergio connects when you go live.'); render(); }
      catch (err) { toast(err.message, true); }
      add.disabled = false;
    } }, input, add);
    scr.append(h('div', { class: 'h', text: 'Add a chat' }), form,
      h('p', { class: 'hint', text: 'Paste a link like youtube.com/@name, twitch.tv/name, tiktok.com/@name, kick.com/name or facebook.com/yourpage.' }));
    scr.append(h('div', { class: 'h', text: `Your chats (${sources.length})` }));
    if (!sources.length) scr.append(h('div', { class: 'card' }, h('div', { class: 'empty' }, icon('link'), h('span', { text: 'No chats yet. Add your channels above.' }))));
    else {
      const card = h('div', { class: 'card' });
      for (const s of sources) {
        const [cls, label] = STATE[s.state] || STATE.idle;
        const sw = h('button', { class: 'sw', type: 'button', role: 'switch', 'aria-checked': String(s.enabled !== false), 'aria-label': `Connect to ${s.channel || s.target}`,
          onclick: async () => { try { const st = await api('POST', `/api/sources/${encodeURIComponent(s.id)}/enabled`, { enabled: s.enabled === false }); sources = st.sources; render(); } catch (e) { toast(e.message, true); } } });
        card.append(h('div', { class: 'src', style: `--pc: var(--${s.platform})` },
          h('span', { class: 'pi' }, icon(s.platform)),
          h('div', { style: 'min-width:0' }, h('b', { text: s.channel || s.label || s.target }), h('span', { class: 'st' }, h('span', { class: `dot ${cls}` }), s.state === 'live' && s.count ? `${label} · ${fmt(s.count)} message${s.count === 1 ? '' : 's'}` : label)),
          h('div', { style: 'display:flex;align-items:center;gap:2px' }, sw, h('button', { class: 'more', type: 'button', 'aria-label': `More for ${s.channel || s.target}`, onclick: () => sourceMenu(s) }, icon('settings'))),
          s.detail && s.state !== 'live' && s.state !== 'paused' && s.detail !== label ? h('div', { class: 'detail', text: s.detail }) : null));
      }
      scr.append(card);
    }
    scr.append(h('p', { class: 'hint', text: 'Your phone connects to these chats by itself. Keep Mergio open (or in the background) while you stream.' }));
    main.append(scr);
  }
  function sourceMenu(s) {
    sheet(close => {
      const done = () => { close(); if (history.state?.sheet) history.back(); };
      return [
        h('div', { class: 'who' }, h('span', { class: 'pl', style: `--pc: var(--${s.platform}); width:36px; height:36px` }, icon(s.platform)), h('div', {}, h('b', {}, s.channel || s.target), h('span', { text: NAMES[s.platform] }))),
        item('refresh', 'Reconnect now', async () => { done(); try { const st = await api('POST', `/api/sources/${encodeURIComponent(s.id)}/reconnect`, {}); sources = st.sources; render(); toast('Reconnecting…'); } catch (e) { toast(e.message, true); } }),
        item('trash', 'Remove this chat', () => { done(); setTimeout(() => confirmSheet(`Remove ${s.channel || s.target}?`, 'Its messages stop showing on this phone. You can add it again any time.', 'Remove', async () => { try { const st = await api('DELETE', `/api/sources/${encodeURIComponent(s.id)}`); sources = st.sources; render(); } catch (e) { toast(e.message, true); } }), 50); }, 'danger'),
      ];
    });
  }

  /* ======================= Settings ======================= */
  const sw = (on, fn, label) => h('button', { class: 'sw', type: 'button', role: 'switch', 'aria-checked': String(!!on), 'aria-label': label, onclick: e => { const b = e.currentTarget; const v = b.getAttribute('aria-checked') !== 'true'; b.setAttribute('aria-checked', String(v)); fn(v); } });
  const setRow = (ic, title, sub, control) => h('div', { class: 'set' }, h('span', { class: 'ic' }, icon(ic)), h('div', { class: 'tx' }, h('b', { text: title }), sub ? h('span', { text: sub }) : null), control);
  const colRow = (ic, title, sub, control) => h('div', { class: 'set col' }, h('div', { class: 'head' }, h('span', { class: 'ic' }, icon(ic)), h('div', { class: 'tx' }, h('b', { text: title }), sub ? h('span', { text: sub }) : null)), control);
  function seg(options, value, fn) {
    const box = h('div', { class: 'seg', role: 'radiogroup' });
    for (const [v, t] of options) box.append(h('button', { class: v === value ? 'on' : '', type: 'button', role: 'radio', 'aria-checked': String(v === value), onclick: () => { for (const b of box.children) { b.classList.remove('on'); b.setAttribute('aria-checked', 'false'); } const b = box.children[options.findIndex(o => o[0] === v)]; b.classList.add('on'); b.setAttribute('aria-checked', 'true'); fn(v); } }, t));
    return box;
  }
  /** A text box that saves when you leave it. */
  function textSetting(section, key, placeholder, rows = 2) {
    const t = h('textarea', { rows: String(rows), placeholder, autocapitalize: 'off', spellcheck: 'false' });
    t.value = S?.[section]?.[key] || '';
    t.addEventListener('change', () => save({ [section]: { [key]: t.value } }));
    return t;
  }
  function secretSetting(key, placeholder) {
    const saved = panel?.settings?.advanced?.[key];
    const t = h('input', { type: 'password', placeholder: saved ? 'Saved. Type to replace it.' : placeholder, autocomplete: 'off', autocapitalize: 'off', spellcheck: 'false' });
    const b = h('button', { class: 'btn sm', type: 'button', onclick: async () => { const v = t.value.trim(); if (!v) return t.focus(); await save({ advanced: { [key]: v } }); t.value = ''; t.placeholder = 'Saved. Type to replace it.'; toast('Saved'); } }, 'Save');
    return h('div', { class: 'add' }, t, b);
  }
  function settingsScreen(main) {
    const scr = h('div', { class: 'screen' });
    const g = S?.general || {}, a = S?.appearance || {};
    const gen = (key, v) => save({ general: { [key]: v } });
    scr.append(h('div', { class: 'h', text: 'Chat' }), h('div', { class: 'card' },
      setRow('join', 'Show who joins', 'TikTok and Twitch "joined" notes', sw(g.showJoins !== false, v => gen('showJoins', v), 'Show who joins')),
      setRow('heart', 'Show TikTok likes', null, sw(g.showLikes !== false, v => gen('showLikes', v), 'Show TikTok likes')),
      setRow('terminal', 'Hide !commands', 'Messages that start with !', sw(!!g.excludeCommands, v => gen('excludeCommands', v), 'Hide commands')),
      setRow('at', 'Highlight mentions', 'Messages with your name stand out', sw(!!g.highlightMentions, v => gen('highlightMentions', v), 'Highlight mentions')),
      colRow('user', 'Your other names', 'Also highlight these (comma separated)', textSetting('general', 'mentionNames', 'nickname, other name', 1)),
      colRow('ban', 'Muted people and bots', 'Their messages are hidden (comma separated)', textSetting('general', 'ignoreChatters', 'Nightbot, StreamElements')),
      colRow('filter', 'Blocked words', 'Messages with these words are hidden', textSetting('general', 'blockedWords', 'word, another word'))));

    const size = h('input', { type: 'range', min: '12', max: '24', step: '1', value: String(prefs.fontSize), 'aria-label': 'Text size' });
    const sizeLbl = h('span', { text: `${prefs.fontSize} px` });
    size.addEventListener('input', () => { prefs.fontSize = Number(size.value); sizeLbl.textContent = `${prefs.fontSize} px`; document.documentElement.style.setProperty('--fs', `${prefs.fontSize}px`); savePrefs(); });
    scr.append(h('div', { class: 'h', text: 'Look' }), h('div', { class: 'card' },
      colRow('textsize', 'Text size', null, h('div', { style: 'display:flex;align-items:center;gap:12px' }, size, sizeLbl)),
      setRow('user', 'Profile pictures', null, sw(a.showAvatar !== false, v => save({ appearance: { showAvatar: v } }), 'Profile pictures')),
      setRow('star', 'Badges', 'Subscriber, moderator and other badges', sw(a.showBadges !== false, v => save({ appearance: { showBadges: v } }), 'Badges')),
      setRow('clock', '24-hour clock', null, sw(a.timeFormat === '24', v => save({ appearance: { timeFormat: v ? '24' : '12' } }), '24-hour clock'))));

    const sound = h('div', { class: 'set', style: prefs.sound ? '' : 'display:none' }, seg((window.mergioSound?.TYPES || [['chime', 'Chime']]).slice(0, 4).map(([v, t]) => [v, t.split(' (')[0]]), prefs.soundType, v => { prefs.soundType = v; savePrefs(); window.mergioSound?.play(v, 'gift', 0.7); }));
    scr.append(h('div', { class: 'h', text: 'Phone' }), h('div', { class: 'card' },
      A ? setRow('sun', 'Keep the screen on', 'While Mergio is open', sw(prefs.screenOn, v => { prefs.screenOn = v; savePrefs(); applyScreenOn(); }, 'Keep the screen on')) : null,
      colRow('volume', 'Read aloud', 'Your phone reads messages to you', seg([['off', 'Off'], ['alerts', 'Alerts'], ['all', 'Everything']], prefs.read, v => { prefs.read = v; savePrefs(); if (v !== 'off') say(v === 'all' ? 'Mergio will read your chat aloud.' : 'Mergio will read your alerts aloud.'); else A?.stopSpeaking?.(); })),
      setRow('bell', 'Sound for alerts', 'Gifts, subs, Super Chats, follows', sw(prefs.sound, v => { prefs.sound = v; savePrefs(); sound.style.display = v ? '' : 'none'; if (v) window.mergioSound?.play(prefs.soundType, 'gift', 0.7); }, 'Sound for alerts')),
      sound,
      setRow('bolt', 'Vibrate for alerts', null, sw(prefs.vibrate, v => { prefs.vibrate = v; savePrefs(); }, 'Vibrate for alerts'))));

    scr.append(h('div', { class: 'h', text: 'Platform keys' }), h('div', { class: 'card' },
      colRow('key', 'TikTok sign key', 'Optional. Helps when TikTok is busy (eulerstream.com).', secretSetting('tiktokSignApiKey', 'Paste your key')),
      colRow('key', 'Facebook Page token', 'Needed for Facebook chat. Make it on the desktop app (Settings > Facebook) and paste it here.', secretSetting('facebookAccessToken', 'Paste the Page token'))));

    const ver = panel?.version || '';
    scr.append(h('div', { class: 'about' }, h('img', { src: '/shared/logo.svg', alt: '' }), h('b', { text: `Mergio ${ver} for Android` }),
      h('span', { text: 'Your phone connects to the chats itself. Nothing goes through a server.' }),
      h('div', { style: 'display:flex;gap:8px;margin-top:10px;flex-wrap:wrap;justify-content:center' },
        h('button', { class: 'btn sm', type: 'button', onclick: checkUpdate }, icon('refresh'), 'Check for updates'),
        h('button', { class: 'btn sm ghost', type: 'button', onclick: () => open('https://github.com/ruchira-edirisinghe/mergio') }, icon('external'), 'GitHub'))));
    main.append(scr);
  }
  // only GitHub links (the project page and release downloads) ever open from here
  const LINK_HOSTS = ['github.com', 'objects.githubusercontent.com', 'release-assets.githubusercontent.com'];
  const open = url => {
    let u;
    try { u = new URL(url); } catch { return; }
    if (u.protocol !== 'https:' || !LINK_HOSTS.includes(u.hostname)) return;
    if (A?.openUrl) A.openUrl(u.href); else window.open(u.href, '_blank', 'noopener');
  };

  /* ---------- updates: the app can't install itself, so it links to the download ---------- */
  function showUpdate() {
    const b = $('banner'); b.textContent = '';
    if (!update?.available) return;
    b.append(h('div', { class: 'banner' }, icon('download'), h('span', { text: `Mergio ${update.latest} is out.` }), h('button', { class: 'btn sm primary', type: 'button', onclick: () => open(update.url) }, 'Download')));
  }
  async function checkUpdate() {
    try { update = await api('POST', '/api/update/check', {}); showUpdate(); toast(update.available ? `Mergio ${update.latest} is out.` : 'You have the newest version.'); }
    catch (e) { toast(e.message, true); }
  }

  /* ======================= tabs and wiring ======================= */
  const TABS = [['chat', 'chat', 'Chat'], ['alerts', 'gift', 'Alerts'], ['viewers', 'raid', 'Viewers'], ['chats', 'link', 'Chats'], ['settings', 'settings', 'Settings']];
  function tabs() {
    const nav = $('tabs'); nav.textContent = '';
    for (const [id, ic, label] of TABS) {
      const b = h('button', { class: tab === id ? 'on' : '', type: 'button', 'aria-current': tab === id ? 'page' : null, onclick: () => go(id) }, icon(ic), label);
      if (id === 'alerts' && newAlerts && tab !== 'alerts') b.append(h('span', { class: 'badge', text: newAlerts > 99 ? '99+' : String(newAlerts) }));
      if (id === 'chats' && sources.some(s => s.state === 'error')) b.append(h('span', { class: 'badge', text: '!' }));
      nav.append(b);
    }
  }
  function go(id) {
    if (id === tab) { const s = document.querySelector('.screen, .feed'); s?.scrollTo({ top: id === 'chat' ? s.scrollHeight : 0, behavior: 'smooth' }); return; }
    tab = id; history.replaceState(history.state, '', `#${id}`);
    if (id === 'alerts') newAlerts = 0;
    render();
  }
  function liveChip() {
    const c = $('liveChip'); c.textContent = '';
    const live = isLive();
    c.hidden = !sources.length;
    c.append(h('span', { class: `dot ${live ? 'live' : ''}` }), ...(live ? [icon('eye'), fmt(stats.totalViewers || 0)] : ['Offline']));
    c.onclick = () => go('viewers');
  }
  /** keepScroll: redraw the alerts list without jumping to the top */
  function render(keepScroll) {
    const main = $('main');
    const old = main.querySelector('.screen');
    const top = keepScroll && old ? old.scrollTop : 0;
    main.textContent = ''; feedEl = null;
    if (!S) { main.append(h('div', { class: 'empty' }, icon('chat'), h('span', { text: 'Starting Mergio…' }))); tabs(); return; }
    const screens = new Map([['chat', chatScreen], ['alerts', alertsScreen], ['viewers', viewersScreen], ['chats', chatsScreen], ['settings', settingsScreen]]);
    (screens.get(tab) || chatScreen)(main);
    if (top) main.querySelector('.screen').scrollTop = top;
    tabs(); liveChip();
  }

  document.documentElement.style.setProperty('--fs', `${prefs.fontSize}px`);
  applyScreenOn();
  let retry = 0, first = true;
  async function loadPanel() { try { panel = await api('GET', '/api/state'); update = panel.update; showUpdate(); if (tab === 'settings') render(true); } catch { /* the live connection retries */ } }
  function connect() {
    const ws = new WebSocket(`ws://${location.host}/ws?client=phone`);
    ws.onopen = () => { retry = 0; $('conn').hidden = true; };
    ws.onmessage = e => {
      const d = JSON.parse(e.data);
      if (d.op === 'hello') {
        S = d.settings; sources = d.sources || []; stats = d.stats || stats;
        feed = d.recent || []; events = d.events || [];
        if (first) { first = false; loadPanel(); }
        render();
      } else if (d.op === 'msg') onMessage(d.msg);
      else if (d.op === 'settings') { S = d.settings; if (tab !== 'settings') render(true); }
      else if (d.op === 'sources') { sources = d.sources; if (tab === 'chats') render(true); else { tabs(); liveChip(); } }
      else if (d.op === 'stats') { stats = d.stats; liveChip(); if (tab === 'viewers') render(true); }
      else if (d.op === 'update') { update = d.update; showUpdate(); }
      else if (d.op === 'delete' && Array.isArray(d.ids)) {
        for (const id of d.ids) { hidden.add(id); const el = feedEl?.querySelector(`[data-id="${CSS.escape(id)}"]`); if (el) el.classList.add('hid'); }
      } else if (d.op === 'clear') {
        const keep = Array.isArray(d.keep) ? new Set(d.keep) : null;
        feed = keep ? feed.filter(m => keep.has(m.id)) : [];
        if (tab === 'chat') fillFeed();
      }
    };
    ws.onclose = () => { $('conn').hidden = retry < 2; setTimeout(connect, Math.min(5000, 500 * 2 ** retry++)); };
  }
  render();
  connect();
  // the app calls this when it comes back to the front
  window.mergioResume = () => { applyScreenOn(); };
})();
