/* OmniChat overlay: connects to the local OmniChat app and renders chat + events. No user text is ever set as HTML. */
(() => {
  'use strict';
  const chat = document.getElementById('chat');
  const connBadge = document.getElementById('conn');
  const params = new URLSearchParams(location.search);
  const isPreview = params.has('preview');

  let S = null;                 // settings (appearance, general, per-platform)
  let history = [];             // messages we know about (for re-render on settings change)
  let mentionNames = [];
  const els = new Map();        // message id -> element
  let lastChat = null;          // { key, time, el } for grouping consecutive messages
  let joinPill = null;          // the single rolling "X joined" pill
  const pronounCache = new Map();
  const loadedFonts = new Set();
  const SYSTEM_FONTS = ['', 'system-ui', 'Segoe UI', 'Arial', 'Verdana', 'Tahoma', 'Trebuchet MS', 'Georgia', 'Times New Roman', 'Courier New', 'Impact', 'Comic Sans MS', 'Consolas'];

  const PLATFORM_KEYS = {
    twitch: { chat: 'messages', superchat: 'messages', cheer: 'cheers', announcement: 'announcements', sub: 'subs', notice: 'subs', giftsub: 'giftSubs', raid: 'raids', redemption: 'redemptions', powerup: 'redemptions', streak: 'watchStreaks', join: 'joins' },
    youtube: { chat: 'messages', superchat: 'superChats', supersticker: 'superStickers', member: 'memberships', milestone: 'milestones', giftsub: 'giftedMemberships' },
    kick: { chat: 'messages', sub: 'subs', giftsub: 'giftSubs', raid: 'hosts', redemption: 'rewards', gift: 'kicksGifts', follow: 'follows' },
    tiktok: { chat: 'messages', join: 'joins', gift: 'gifts', like: 'likes', follow: 'follows', share: 'shares', sub: 'subs' },
    facebook: { chat: 'messages' },
  };
  const COMPACT = new Set(['join', 'like', 'share']);
  const PLATFORM_NAMES = { twitch: 'Twitch', youtube: 'YouTube', kick: 'Kick', tiktok: 'TikTok', facebook: 'Facebook' };
  const LABELS = {
    sub: 'New subscriber', giftsub: 'Gifted subs', giftmember: 'Gifted memberships', follow: 'New follower', gift: 'Gift', kicks: 'Kicks',
    cheer: 'Bits', superchat: 'Super Chat', hypechat: 'Hype Chat', supersticker: 'Super Sticker', member: 'New member', milestone: 'Member milestone',
    giftreceived: 'Gift membership', raid: 'Raid', host: 'Host', redemption: 'Reward', powerup: 'Power-up', streak: 'Watch streak', announcement: 'Announcement', notice: 'Alert',
  };
  const CELEBRATE = new Set(['sub', 'giftsub', 'giftmember', 'follow', 'member', 'milestone', 'raid', 'host']);
  const ART = { gift: 'gift', kicks: 'coin', sub: 'star', giftsub: 'gift', giftmember: 'gift', raid: 'raid', host: 'raid', cheer: 'cheer', superchat: 'money', hypechat: 'money', supersticker: 'sparkle', member: 'crown', milestone: 'crown', giftreceived: 'crown', redemption: 'sparkle', powerup: 'bolt', streak: 'flame', announcement: 'megaphone', follow: 'follow', join: 'join', like: 'heart', share: 'share', notice: 'star' };
  const BADGE_GLYPH = {
    owner: ['camera', 'g-host'], broadcaster: ['camera', 'g-host'], 'tt-host': ['camera', 'g-host'], 'kick-broadcaster': ['camera', 'g-host'],
    moderator: ['sword', 'g-mod'], 'tt-mod': ['sword', 'g-mod'], 'kick-moderator': ['sword', 'g-mod'],
    vip: ['gem', 'g-vip'], 'kick-vip': ['gem', 'g-vip'],
    verified: ['check', 'g-verified'], 'kick-verified': ['check', 'g-verified'],
    member: ['star', 'g-sub'], subscriber: ['star', 'g-sub'], 'tt-sub': ['star', 'g-sub'], 'kick-subscriber': ['star', 'g-sub'],
    'tt-gifter': ['gift', 'g-gifter'], 'kick-sub_gifter': ['gift', 'g-gifter'],
  };

  /* ---------------- helpers ---------------- */
  const h = (tag, cls, text) => { const e = document.createElement(tag); if (cls) e.className = cls; if (text != null) e.textContent = text; return e; };
  const safeUrl = u => (typeof u === 'string' && (/^https:\/\//i.test(u) || /^\/(avatar|shared)\//.test(u)) ? u : '');
  const hexA = (hex, a) => {
    const m = /^#?([\da-f]{2})([\da-f]{2})([\da-f]{2})/i.exec(hex || '#000000');
    return m ? `rgba(${parseInt(m[1], 16)},${parseInt(m[2], 16)},${parseInt(m[3], 16)},${a})` : `rgba(0,0,0,${a})`;
  };
  const NAME_PALETTE = ['#ff7a7a', '#ffb86b', '#ffe066', '#8dff8a', '#6bf3ff', '#8fa8ff', '#c792ff', '#ff8fd8', '#7cf2c4', '#ffd0a1'];
  function readable(hex) {
    const m = /^#?([\da-f]{2})([\da-f]{2})([\da-f]{2})$/i.exec(hex || '');
    if (!m) return hex;
    let [r, g, b] = [1, 2, 3].map(i => parseInt(m[i], 16));
    const lum = (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255;
    if (lum < 0.38) { const k = 0.38 / Math.max(lum, 0.05) * 0.6; r = Math.min(255, r + (255 - r) * Math.min(.7, k * .5)); g = Math.min(255, g + (255 - g) * Math.min(.7, k * .5)); b = Math.min(255, b + (255 - b) * Math.min(.7, k * .5)); }
    return `rgb(${r | 0},${g | 0},${b | 0})`;
  }
  function nameColor(m) {
    const a = S.appearance;
    if (a.nameColorMode === 'custom') return a.nameColor;
    if (a.nameColorMode === 'platform') return `var(--${m.platform})`;
    if (m.user.color) return readable(m.user.color);
    let hsh = 0; for (const ch of m.user.name || '') hsh = (hsh * 31 + ch.codePointAt(0)) >>> 0;
    return NAME_PALETTE[hsh % NAME_PALETTE.length];
  }
  const fmtTime = t => {
    const d = new Date(t);
    return S.appearance.timeFormat === '24' ? d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false })
      : d.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit', hour12: true });
  };
  const list = s => String(s || '').split(/[,\n]/).map(x => x.trim().toLowerCase()).filter(Boolean);
  const plainText = m => (m.parts || []).map(p => p.text || p.name || '').join('');
  function uwu(t) {
    return t.replace(/[rl]/g, 'w').replace(/[RL]/g, 'W').replace(/n([aeiou])/g, 'ny$1').replace(/N([aeiou])/g, 'Ny$1')
      + (Math.random() < 0.3 ? ' ' + ['uwu', 'owo', '>w<', '^w^'][Math.floor(Math.random() * 4)] : '');
  }
  const canEmbed = roles => {
    switch (S.general.imageEmbedPermissionLevel) {
      case 'everyone': return true;
      case 'subs': return roles.broadcaster || roles.mod || roles.vip || roles.sub || roles.member;
      case 'vips': return roles.broadcaster || roles.mod || roles.vip;
      case 'mods': return roles.broadcaster || roles.mod;
      case 'broadcaster': return roles.broadcaster;
      default: return false;
    }
  };

  /* ---------------- settings ---------------- */
  function withOverrides(s) {
    // Any appearance/general key can be overridden per browser source: /overlay?fontSize=28&theme=neon
    const out = JSON.parse(JSON.stringify(s));
    for (const [k, v] of params) {
      for (const sec of ['appearance', 'general']) {
        if (k in out[sec]) {
          const cur = out[sec][k];
          out[sec][k] = typeof cur === 'number' ? Number(v) : typeof cur === 'boolean' ? v === 'true' || v === '1' : v;
        }
      }
    }
    return out;
  }

  function applySettings(raw) {
    S = withOverrides(raw);
    const a = S.appearance, r = document.documentElement.style, b = document.body.classList;
    const font = (a.font || '').trim();
    if (font && !SYSTEM_FONTS.includes(font) && !loadedFonts.has(font)) {
      loadedFonts.add(font);
      const link = document.createElement('link');
      link.rel = 'stylesheet';
      link.href = `https://fonts.googleapis.com/css2?family=${encodeURIComponent(font).replace(/%20/g, '+')}:wght@400;500;600;700;800;900&display=swap`;
      document.head.appendChild(link);
    }
    r.setProperty('--font', `${font ? `'${font.replace(/'/g, '')}', ` : ''}'Segoe UI', system-ui, sans-serif`);
    r.setProperty('--fs', `${a.fontSize}px`);
    r.setProperty('--fw', a.fontWeight);
    r.setProperty('--gap', `${a.lineSpacing}em`);
    r.setProperty('--text', a.textColor);
    r.setProperty('--bubble', hexA(a.bubbleColor, a.bubbleOpacity));
    r.setProperty('--bubble-solid', hexA(a.bubbleColor, Math.max(0.85, a.bubbleOpacity)));
    r.setProperty('--radius', `${a.bubbleRadius}px`);
    r.setProperty('--page', hexA(a.background, a.opacity));
    r.setProperty('--emote', a.emoteScale);
    b.toggle('bubbles', a.useChatBubbles);
    b.toggle('accent', a.accentBar);
    b.toggle('shadow', a.textShadow);
    b.toggle('inline', S.general.inlineChat);
    b.toggle('reversed', S.general.scrollDirection === 'reversed');
    b.toggle('align-right', a.align === 'right');
    for (const c of [...b]) if (c.startsWith('theme-')) b.remove(c);
    b.add(`theme-${a.theme}`);
    rerender();
  }

  /* ---------------- filtering ---------------- */
  function allowed(m) {
    const sec = S[m.platform];
    if (!sec) return false;
    const key = PLATFORM_KEYS[m.platform]?.[m.type] || 'messages';
    if (sec[key] === false) return false;
    if (m.platform === 'tiktok' && m.type === 'gift' && (m.event?.diamonds || 0) < (sec.minGiftDiamonds || 0)) return false;
    if (m.platform === 'twitch' && m.flags?.shared && sec.sharedChat === 'hide') return false;
    const g = S.general;
    const who = [m.user.name, m.user.login].map(x => String(x || '').toLowerCase());
    if (list(g.ignoreChatters).some(n => who.includes(n))) return false;
    const text = plainText(m);
    if (m.type === 'chat' && g.excludeCommands && /^\s*!/.test(text)) return false;
    const bad = list(g.blockedWords);
    if (bad.length && bad.some(w => text.toLowerCase().includes(w))) return false;
    return true;
  }

  /* ---------------- building blocks ---------------- */
  function platIcon(m) { const s = h('span', 'plat'); s.title = m.platform; s.appendChild(omniIcon(m.platform)); return s; }
  function avatar(m, cls = 'av') {
    const src = safeUrl(m.user.avatar);
    const img = h('img', cls);
    img.alt = ''; img.decoding = 'async'; img.referrerPolicy = 'no-referrer';
    img.src = src || `/avatar/default/${encodeURIComponent(m.user.name || '?')}`;
    img.onerror = () => { img.onerror = null; img.src = `/avatar/default/${encodeURIComponent(m.user.name || '?')}`; };
    return img;
  }
  function badges(m) {
    const wrap = h('span', 'badges');
    for (const b of m.user.badges || []) {
      const url = safeUrl(b.img);
      if (url) {
        const img = h('img', 'badge'); img.src = url; img.alt = b.title || ''; img.title = b.title || ''; img.referrerPolicy = 'no-referrer';
        const g = BADGE_GLYPH[b.id];
        img.onerror = () => { const fb = g ? glyphBadge(g, b) : textBadge(b); img.replaceWith(fb); };
        wrap.appendChild(img);
      } else if (BADGE_GLYPH[b.id]) wrap.appendChild(glyphBadge(BADGE_GLYPH[b.id], b));
      else wrap.appendChild(textBadge(b));
    }
    return wrap;
  }
  function glyphBadge([icon, cls], b) { const s = h('span', `badge glyph ${cls}`); s.title = b.title || ''; s.appendChild(omniIcon(icon, { stroke: 2.6 })); return s; }
  function textBadge(b) { return h('span', 'badge txt', String(b.title || b.id || '').replace(/^kick-/, '').slice(0, 12)); }

  function nameEl(m) {
    const n = h('span', 'name', m.user.name);
    n.style.color = nameColor(m);
    return n;
  }

  function pronounsEl(m) {
    if (!S.appearance.showPronouns || m.platform !== 'twitch' || !m.user.login) return null;
    const span = h('span', 'pron');
    span.hidden = true;
    const login = m.user.login.toLowerCase();
    const fill = p => { if (p) { span.textContent = p; span.hidden = false; } };
    if (pronounCache.has(login)) { const v = pronounCache.get(login); if (typeof v === 'string') fill(v); else v.then(fill); }
    else {
      const pr = fetch(`/api/pronouns/${encodeURIComponent(login)}`).then(r => r.json()).then(j => j.pronouns || '').catch(() => '');
      pronounCache.set(login, pr);
      pr.then(v => { pronounCache.set(login, v); fill(v); });
    }
    return span;
  }

  function head(m) {
    const a = S.appearance, hd = h('span', 'head');
    if (a.showTimestamps) hd.appendChild(h('span', 'time', fmtTime(m.time)));
    if (a.showPlatform) hd.appendChild(platIcon(m));
    if (a.showAvatar) hd.appendChild(avatar(m));
    if (a.showBadges && m.user.badges?.length) hd.appendChild(badges(m));
    if (m.flags?.shared && S.twitch.sharedChat === 'highlight') hd.appendChild(h('span', 'shared-tag', 'SHARED'));
    if (a.showUsername) hd.appendChild(nameEl(m));
    const p = pronounsEl(m); if (p) hd.appendChild(p);
    return hd;
  }

  function body(m) {
    const bd = h('span', 'body');
    if (m.flags?.action) bd.style.setProperty('--uc', nameColor(m));
    const names = mentionNames;
    let embedded = 0;
    for (const p of m.parts || []) {
      if (p.type === 'emote') {
        const url = safeUrl(p.url);
        if (!url) { bd.appendChild(document.createTextNode(p.name)); continue; }
        const img = h('img', 'emote'); img.src = url; img.alt = p.name; img.title = p.name; img.referrerPolicy = 'no-referrer';
        bd.appendChild(img);
      } else if (p.type === 'cheer') {
        const img = h('img', 'cheer'); img.src = safeUrl(p.url); img.alt = p.name;
        bd.appendChild(img);
        const amt = h('span', 'cheer-amt', String(p.amount)); amt.style.color = p.color; bd.appendChild(amt);
      } else if (p.type === 'link') {
        if (embedded < 1 && /\.(png|jpe?g|gif|webp)(\?|$)/i.test(p.url) && canEmbed(m.user.roles) && safeUrl(p.url)) {
          const img = h('img', 'embed'); img.src = p.url; img.alt = ''; img.referrerPolicy = 'no-referrer';
          img.onerror = () => img.replaceWith(h('span', 'link', p.text));
          bd.appendChild(img); embedded++;
        } else bd.appendChild(h('span', 'link', p.text));
      } else {
        let text = p.text || '';
        if (S.general.uwuMode) text = uwu(text);
        if (S.general.highlightMentions && names.length && /@?\w/.test(text)) {
          const re = new RegExp(`(@?\\b(?:${names.map(n => n.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|')})\\b)`, 'ig');
          const chunks = text.split(re);
          for (let i = 0; i < chunks.length; i++) {
            if (!chunks[i]) continue;
            if (i % 2) bd.appendChild(h('span', 'mention-hl', chunks[i])); else bd.appendChild(document.createTextNode(chunks[i]));
          }
        } else bd.appendChild(document.createTextNode(text));
      }
    }
    return bd;
  }

  function isEmoteOnly(m) {
    const ps = (m.parts || []).filter(p => !(p.type === 'text' && !p.text.trim()));
    return ps.length > 0 && ps.length <= 6 && ps.every(p => p.type === 'emote');
  }
  function hasMention(m) {
    if (!S.general.highlightMentions || !mentionNames.length || m.type !== 'chat') return false;
    const t = plainText(m).toLowerCase();
    return mentionNames.some(n => new RegExp(`(^|[^\\w])@?${n.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}(\\b|$)`, 'i').test(t));
  }

  /* ---------------- renderers ---------------- */
  function renderChat(m) {
    const el = h('div', `msg chat p-${m.platform}`);
    const bubble = h('div', 'bubble');
    if (m.flags?.reply) {
      const r = h('span', 'reply');
      r.appendChild(omniIcon('reply'));
      r.appendChild(document.createTextNode(`${m.flags.reply.name}: ${m.flags.reply.text || ''}`));
      bubble.appendChild(r);
    }
    bubble.appendChild(head(m));
    if (S.appearance.showMessage) bubble.appendChild(body(m));
    el.appendChild(bubble);
    if (S.appearance.bigEmotes && isEmoteOnly(m)) el.classList.add('emote-only');
    if (m.flags?.gigantify) el.classList.add('gigantify');
    if (m.flags?.firstMessage) el.classList.add('first');
    if (m.flags?.action) el.classList.add('action');
    if (hasMention(m)) el.classList.add('mention');
    return el;
  }

  function renderCard(m) {
    const ev = m.event || {};
    const el = h('div', `msg event ev-${m.type} ev-${ev.kind || m.type} p-${m.platform}`);
    if (S.appearance.eventStyle === 'inline') {
      const c = renderChat(m);
      c.classList.add('event-inline');
      const t = h('span', 'title', ` ${ev.title || ''}${ev.amount ? ` · ${ev.amount}` : ''} `);
      t.style.fontWeight = 800; t.style.color = ev.color || 'var(--pc)';
      c.querySelector('.head')?.appendChild(t);
      return c;
    }
    const card = h('div', 'card');
    if (ev.color) card.style.setProperty('--ev', ev.color);
    if (ev.live) card.classList.add('live-combo');
    const art = h('div', 'art');
    const imgUrl = safeUrl(ev.image);
    if (imgUrl) { const img = h('img'); img.src = imgUrl; img.alt = ''; img.referrerPolicy = 'no-referrer'; img.onerror = () => img.replaceWith(omniIcon(ART[ev.kind] || 'star')); art.appendChild(img); }
    else art.appendChild(omniIcon(ART[ev.kind] || 'star'));
    if (S.appearance.showAvatar && m.user.avatar) art.appendChild(avatar(m, 'av-mini'));
    if (CELEBRATE.has(ev.kind) && S.appearance.animation !== 'none') {
      const burst = h('span', 'burst');
      for (let i = 0; i < 8; i++) { const d = h('i'); d.style.setProperty('--a', `${i * 45}deg`); burst.appendChild(d); }
      art.appendChild(burst);
      card.classList.add('celebrate');
    }
    const info = h('div', 'info');
    if (S.appearance.showEventLabels) {
      let label = LABELS[ev.kind] || '';
      if (ev.kind === 'sub' && /resub|continued/i.test(ev.title || '')) label = 'Resubscribed';
      const rib = h('div', 'ribbon');
      if (label) rib.appendChild(h('span', 'rlabel', label));
      const chip = h('span', 'pchip');
      chip.appendChild(omniIcon(m.platform));
      chip.appendChild(document.createTextNode(`on ${PLATFORM_NAMES[m.platform] || m.platform}`));
      rib.appendChild(chip);
      info.appendChild(rib);
    }
    const top = h('div', 'top');
    if (S.appearance.showPlatform && !S.appearance.showEventLabels) top.appendChild(platIcon(m));
    if (S.appearance.showBadges && m.user.badges?.length) top.appendChild(badges(m));
    top.appendChild(nameEl(m));
    if (ev.title) top.appendChild(h('span', 'title', ev.title));
    info.appendChild(top);
    if (ev.amount) info.appendChild(h('span', 'amount', ev.amount));
    if (S.appearance.showMessage && (m.parts || []).length) { const bd = body(m); bd.classList.add('body'); info.appendChild(bd); }
    card.append(art, info);
    el.appendChild(card);
    return el;
  }

  function renderPill(m) {
    const ev = m.event || {};
    const el = h('div', `msg compact ev-${m.type} p-${m.platform}`);
    const pill = h('div', 'pill');
    if (S.appearance.showPlatform) { const g = h('span', 'gl'); g.appendChild(omniIcon(m.platform)); pill.appendChild(g); }
    if (S.appearance.showAvatar) pill.appendChild(avatar(m));
    const g2 = h('span', 'gl'); g2.appendChild(omniIcon(ART[ev.kind] || 'star')); pill.appendChild(g2);
    const nm = h('b', '', m.user.name); nm.style.color = nameColor(m);
    pill.append(nm, document.createTextNode(` ${ev.title || ''}${S.appearance.showEventLabels && m.type !== 'like' ? ` on ${PLATFORM_NAMES[m.platform] || m.platform}` : ''}`));
    if (ev.amount) pill.appendChild(h('span', 'amt', ` ${ev.amount}`));
    el.appendChild(pill);
    return el;
  }

  function build(m) {
    const compact = COMPACT.has(m.type) || (m.type === 'follow' && S.appearance.followStyle === 'pill');
    const el = compact ? renderPill(m) : m.event && m.type !== 'chat' ? renderCard(m) : renderChat(m);
    el.dataset.id = m.id;
    el.dataset.user = `${m.sourceId}:${m.user.id}`;
    el.dataset.source = m.sourceId;
    el.style.setProperty('--pc', `var(--${m.platform})`);
    return el;
  }

  /* ---------------- placement ---------------- */
  function insert(el) {
    if (S.general.scrollDirection === 'reversed') chat.prepend(el); else chat.appendChild(el);
    const max = Math.max(5, S.appearance.maxMessages | 0);
    while (chat.children.length > max) {
      const old = S.general.scrollDirection === 'reversed' ? chat.lastElementChild : chat.firstElementChild;
      els.delete(old.dataset.id); old.remove();
    }
  }

  function scheduleHide(el, seconds) {
    if (!seconds) return;
    clearTimeout(el._hide);
    el._hide = setTimeout(() => removeEl(el), seconds * 1000);
  }

  function removeEl(el) {
    if (!el || !el.isConnected) return;
    els.delete(el.dataset.id);
    if (el === joinPill) joinPill = null;
    el.classList.add('leaving');
    setTimeout(() => el.remove(), 420);
  }

  function show(m, animate = true) {
    if (!allowed(m)) return;
    const existing = els.get(m.id);
    if (existing && existing.isConnected) return update(existing, m);

    // Joins: one rolling pill instead of a flood of separate rows.
    if (m.type === 'join') {
      const el = build(m);
      if (joinPill && joinPill.isConnected) { joinPill.replaceWith(el); }
      else { insert(el); if (animate) el.classList.add(`enter-${S.appearance.animation}`); }
      joinPill = el;
      els.set(m.id, el);
      scheduleHide(el, S.general.joinLifetime || 6);
      lastChat = null;
      return;
    }

    const el = build(m);
    const key = `${m.platform}:${m.user.id}`;
    if (m.type === 'chat' && S.general.groupConsecutiveMessages && lastChat && lastChat.key === key && m.time - lastChat.time < 90000 && lastChat.el.isConnected && !m.flags?.reply) {
      el.classList.add('grouped');
    }
    if (animate && S.appearance.animation !== 'none') el.classList.add(`enter-${S.appearance.animation}`);
    insert(el);
    els.set(m.id, el);
    lastChat = m.type === 'chat' ? { key, time: m.time, el } : null;
    const hideAfter = S.general.hideAfter;
    if (hideAfter > 0) scheduleHide(el, m.event && m.type !== 'chat' ? hideAfter * 2 : hideAfter);
  }

  /** Same id again = an update (gift combo count, like counter): patch in place with a little bump. */
  function update(el, m) {
    const amount = el.querySelector('.amount, .amt');
    if (amount && m.event?.amount) {
      amount.textContent = m.event.amount.startsWith(' ') ? m.event.amount : (amount.classList.contains('amt') ? ' ' : '') + m.event.amount;
      amount.classList.remove('bump'); void amount.offsetWidth; amount.classList.add('bump');
    }
    const card = el.querySelector('.card');
    if (card) card.classList.toggle('live-combo', !!m.event?.live);
    if (S.general.hideAfter > 0) scheduleHide(el, S.general.hideAfter * 2);
  }

  function rerender() {
    chat.textContent = ''; els.clear(); lastChat = null; joinPill = null;
    const now = Date.now();
    const max = Math.max(5, S.appearance.maxMessages | 0);
    const keep = history.filter(m => m.type !== 'join' && (!S.general.hideAfter || now - m.time < S.general.hideAfter * 1000));
    for (const m of keep.slice(-max)) show(m, false);
  }

  function remember(m) {
    const i = history.findIndex(x => x.id === m.id);
    if (i >= 0) history[i] = m; else { history.push(m); if (history.length > 120) history.shift(); }
  }

  function onDelete(d) {
    const match = m => (d.all ? m.sourceId === d.sourceId : d.ids ? d.ids.includes(m.id) : d.userId ? m.sourceId === d.sourceId && m.user.id === d.userId : false);
    history = history.filter(m => !match(m));
    for (const el of [...chat.children]) {
      const hit = d.all ? el.dataset.source === d.sourceId
        : d.ids ? d.ids.includes(el.dataset.id)
        : d.userId ? el.dataset.user === `${d.sourceId}:${d.userId}` : false;
      if (hit) removeEl(el);
    }
  }

  function setSources(sources) {
    mentionNames = [...new Set([...(sources || []).flatMap(s => [s.channel, s.target]).map(x => String(x || '').replace(/^@/, '').toLowerCase()).filter(x => x && !/^[\w-]{11}$/.test(x) && !/^\d+$/.test(x)),
      ...list(S?.general.mentionNames)])];
  }

  /* ---------------- connection ---------------- */
  let retry = 0, lastSources = [];
  function connect() {
    const ws = new WebSocket(`${location.protocol === 'https:' ? 'wss' : 'ws'}://${location.host}/ws`);
    ws.onopen = () => { retry = 0; connBadge.hidden = true; };
    ws.onmessage = e => {
      const d = JSON.parse(e.data);
      switch (d.op) {
        case 'hello':
          lastSources = d.sources; history = d.recent || [];
          applySettings(d.settings); setSources(lastSources); rerender();
          break;
        case 'settings': applySettings(d.settings); setSources(lastSources); break;
        case 'sources': lastSources = d.sources; setSources(d.sources); break;
        case 'msg': remember(d.msg); show(d.msg); break;
        case 'delete': onDelete(d); break;
        case 'clear': history = []; rerender(); break;
      }
    };
    ws.onclose = () => {
      if (!isPreview) connBadge.hidden = retry < 2;
      setTimeout(connect, Math.min(10000, 1000 * 2 ** retry++));
    };
  }
  connect();
})();
