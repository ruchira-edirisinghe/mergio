/* Mergio alerts overlay: subs, gifts, Super Chats, follows and raids as one big alert at a time.
   It's its own OBS browser source, so it can sit anywhere on the scene. No user text is ever set as HTML. */
(() => {
  'use strict';
  const stage = document.getElementById('stage');
  const connBadge = document.getElementById('conn');
  const params = new URLSearchParams(location.search);
  const isPreview = params.has('preview');

  // Everything with an event counts as an alert, except the small notes that stay in the chat.
  const NOT_ALERTS = new Set(['chat', 'join', 'like', 'share', 'announcement']);
  const PLATFORM_KEYS = {
    twitch: { superchat: 'messages', cheer: 'cheers', sub: 'subs', notice: 'subs', giftsub: 'giftSubs', raid: 'raids', redemption: 'redemptions', powerup: 'redemptions', streak: 'watchStreaks' },
    youtube: { superchat: 'superChats', supersticker: 'superStickers', member: 'memberships', milestone: 'milestones', giftsub: 'giftedMemberships' },
    kick: { sub: 'subs', giftsub: 'giftSubs', raid: 'hosts', redemption: 'rewards', gift: 'kicksGifts', follow: 'follows' },
    tiktok: { gift: 'gifts', follow: 'follows', sub: 'subs' },
    facebook: {},
  };
  const PLATFORM_NAMES = { twitch: 'Twitch', youtube: 'YouTube', kick: 'Kick', tiktok: 'TikTok', facebook: 'Facebook' };
  const LABELS = {
    sub: 'New subscriber', giftsub: 'Gifted subs', giftmember: 'Gifted memberships', follow: 'New follower', gift: 'Gift', kicks: 'Kicks',
    cheer: 'Bits', superchat: 'Super Chat', hypechat: 'Hype Chat', supersticker: 'Super Sticker', member: 'New member', milestone: 'Member milestone',
    giftreceived: 'Gift membership', raid: 'Raid', host: 'Host', redemption: 'Reward', powerup: 'Power-up', streak: 'Watch streak', notice: 'Alert',
  };
  const ART = { gift: 'gift', kicks: 'coin', sub: 'star', giftsub: 'gift', giftmember: 'gift', raid: 'raid', host: 'raid', cheer: 'cheer', superchat: 'money', hypechat: 'money', supersticker: 'sparkle', member: 'crown', milestone: 'crown', giftreceived: 'crown', redemption: 'sparkle', powerup: 'bolt', streak: 'flame', follow: 'follow', notice: 'star' };

  const STYLES = ['spotlight', 'banner', 'neon', 'bubble', 'card', 'toast'];
  const PARTY = ['#ffffff', '#ffd166', '#ff5fa2', '#7c4dff', '#4ade80', '#38bdf8'];
  const rnd = (a, b) => a + Math.random() * (b - a);

  let S = null;
  const queue = [];
  let current = null;          // { m, el, timer }
  const shown = new Set();     // ids already shown, so a finished gift combo doesn't pop up twice

  /* ---------------- helpers ---------------- */
  const h = (tag, cls, text) => { const e = document.createElement(tag); if (cls) e.className = cls; if (text != null) e.textContent = text; return e; };
  const safeUrl = u => (typeof u === 'string' && (/^https:\/\//i.test(u) || /^\/(avatar|shared)\//.test(u)) ? u : '');
  const list = s => String(s || '').split(/[,\n]/).map(x => x.trim().toLowerCase()).filter(Boolean);
  const img = (src, cls, fallback) => {
    const i = h('img', cls); i.alt = ''; i.decoding = 'async'; i.referrerPolicy = 'no-referrer'; i.src = src;
    if (fallback) i.onerror = () => { i.onerror = null; if (typeof fallback === 'string') i.src = fallback; else i.replaceWith(fallback()); };
    return i;
  };

  /* ---------------- settings ---------------- */
  function withOverrides(s) {
    // Per browser source: /alerts?duration=8&position=top&size=1.2
    const out = JSON.parse(JSON.stringify(s));
    for (const [k, v] of params) {
      if (k in out.alerts) { const cur = out.alerts[k]; out.alerts[k] = typeof cur === 'number' ? Number(v) : typeof cur === 'boolean' ? v === 'true' || v === '1' : v; }
    }
    return out;
  }
  const SYSTEM_FONTS = ['', 'system-ui', 'Segoe UI', 'Arial', 'Verdana', 'Tahoma', 'Trebuchet MS', 'Georgia', 'Times New Roman', 'Courier New', 'Impact', 'Comic Sans MS', 'Consolas'];
  let fontLoaded = '';
  function applySettings(raw) {
    S = withOverrides(raw);
    const a = S.alerts, r = document.documentElement.style, font = (S.appearance.font || '').trim();
    if (font && font !== fontLoaded && !SYSTEM_FONTS.includes(font)) {
      fontLoaded = font;
      const link = document.createElement('link');
      link.rel = 'stylesheet';
      link.href = `https://fonts.googleapis.com/css2?family=${encodeURIComponent(font).replace(/%20/g, '+')}:wght@500;700;800;900&display=swap`;
      document.head.appendChild(link);
    }
    r.setProperty('--font', `${font ? `'${font.replace(/'/g, '')}', ` : ''}'Segoe UI', system-ui, sans-serif`);
    r.setProperty('--scale', String(Math.min(3, Math.max(0.4, Number(a.size) || 1))));
    document.body.className = `pos-${a.position} anim-${a.animation} st-${STYLES.includes(a.style) ? a.style : 'spotlight'}`;
    if (a.placement === 'chat') { queue.length = 0; if (current) leave(); }
  }

  /* ---------------- which messages ---------------- */
  function wanted(m) {
    if (!S || !m.event || NOT_ALERTS.has(m.type) || S.alerts.placement === 'chat') return false;
    const sec = S[m.platform];
    if (!sec) return false;
    const key = PLATFORM_KEYS[m.platform]?.[m.type];
    if (key && sec[key] === false) return false;
    if (m.platform === 'tiktok' && m.type === 'gift' && (m.event.diamonds || 0) < (sec.minGiftDiamonds || 0)) return false;
    const who = [m.user.name, m.user.login].map(x => String(x || '').toLowerCase());
    if (list(S.general.ignoreChatters).some(n => who.includes(n))) return false;
    return true;
  }

  /* ---------------- one alert ---------------- */
  function build(m) {
    const ev = m.event, a = S.alerts;
    const el = h('div', `alert ev-${ev.kind || m.type} p-${m.platform}`);
    el.style.setProperty('--pc', `var(--${m.platform})`);
    if (ev.color) el.style.setProperty('--ev', ev.color);
    const glyph = () => { const g = h('span', 'glyph'); g.appendChild(mergioIcon(ART[ev.kind] || 'star')); return g; };

    const art = h('div', 'art');
    const pic = safeUrl(ev.image);
    const avatar = safeUrl(m.user.avatar) || `/avatar/default/${encodeURIComponent(m.user.name || '?')}`;
    if (pic) {
      art.classList.add('gift');
      art.appendChild(img(pic, 'gift-img', glyph));
      if (a.showAvatar) art.appendChild(img(avatar, 'av-mini', `/avatar/default/${encodeURIComponent(m.user.name || '?')}`));
    } else if (a.showAvatar) {
      art.appendChild(img(avatar, 'av', `/avatar/default/${encodeURIComponent(m.user.name || '?')}`));
      const b = glyph(); b.classList.add('corner'); art.appendChild(b);
    } else art.appendChild(glyph());
    const burst = h('span', 'burst');
    for (let i = 0; i < 12; i++) { const d = h('i'); d.style.setProperty('--a', `${i * 30}deg`); burst.appendChild(d); }
    art.appendChild(burst);

    let label = LABELS[ev.kind] || '';
    if (ev.kind === 'sub' && /resub|continued/i.test(ev.title || '')) label = 'Resubscribed';
    const lab = h('div', 'label');
    if (label) lab.appendChild(h('span', 'what-kind', label));
    const chip = h('span', 'pchip'); chip.appendChild(mergioIcon(m.platform)); chip.appendChild(document.createTextNode(`on ${PLATFORM_NAMES[m.platform] || m.platform}`));
    lab.appendChild(chip);

    const info = h('div', 'info');
    info.append(lab, nameEl(m.user.name));
    if (ev.title) info.appendChild(h('div', 'title', ev.title));
    const num = String(ev.amount || '').match(/\d[\d.,]*/)?.[0];
    if (num && (/^[×x]/i.test(ev.amount) || !(ev.title || '').includes(num))) info.appendChild(h('div', 'amount', ev.amount));
    if (a.showMessage) { const msg = message(m); if (msg) info.appendChild(msg); }
    if (pic) el.classList.add('has-gift');
    el.append(decor(), art, info, h('div', 'timer'));
    el.lastChild.appendChild(h('i'));
    return el;
  }

  /** The name, one letter per span so styles can animate the letters in one after another. */
  function nameEl(name) {
    const el = h('div', 'name');
    const text = String(name || '');
    const seg = typeof Intl !== 'undefined' && Intl.Segmenter ? [...new Intl.Segmenter(undefined, { granularity: 'grapheme' }).segment(text)].map(x => x.segment) : Array.from(text);
    if (seg.length > 32) { el.textContent = text; return el; }
    seg.forEach((ch, i) => { const l = h('span', 'l', ch); l.style.setProperty('--i', i); el.appendChild(l); });
    el.setAttribute('aria-label', text);
    return el;
  }

  /** Decoration that depends on the style: light rays, rings, a running neon edge, floating hearts... */
  function decor() {
    const fx = h('div', 'fx'), st = S.alerts.style;
    if (st === 'spotlight') fx.append(h('i', 'glow'), h('i', 'rays'), h('i', 'ring'), h('i', 'ring'));
    else if (st === 'neon') fx.append(h('i', 'edge'), h('i', 'scan'));
    else if (st === 'banner' || st === 'card') fx.appendChild(h('i', 'sheen'));
    else if (st === 'bubble') {
      const fl = h('div', 'floaty');
      for (let i = 0; i < 9; i++) {
        const d = h('i', null, i % 3 ? '\u2665' : '\u2605');
        d.style.cssText = `--x:${rnd(5, 92)}%;--s:${rnd(0.7, 1.3).toFixed(2)}em;--c:${i % 2 ? 'var(--ev)' : PARTY[2]};--t:${rnd(2.2, 3.4).toFixed(2)}s;--d:${rnd(0.3, 2.5).toFixed(2)}s;--dx:${rnd(-1.5, 1.5).toFixed(2)}em;--r:${rnd(-40, 40) | 0}deg`;
        fl.appendChild(d);
      }
      fx.appendChild(fl);
    }
    return fx;
  }

  /** Spotlight: a shower of confetti over the whole browser source. */
  function confetti(color) {
    const box = h('div', 'confetti');
    const colors = [color, ...PARTY];
    for (let i = 0; i < 44; i++) {
      const c = h('i');
      c.style.cssText = `--x:${rnd(0, 100).toFixed(1)}%;--c:${colors[i % colors.length]};--t:${rnd(1.8, 3.2).toFixed(2)}s;--d:${rnd(0, 0.9).toFixed(2)}s;--dx:${rnd(-4, 4).toFixed(1)}em;--r:${rnd(-540, 540) | 0}deg`;
      box.appendChild(c);
    }
    document.body.appendChild(box);
    setTimeout(() => box.remove(), 4500);
  }

  /* ---------------- sound: a short chime made on the fly (no files) ---------------- */
  let audio = null;
  const NOTES = { gift: [659, 880, 1319], kicks: [659, 880, 1319], cheer: [784, 988, 1319], superchat: [523, 784, 1047, 1568], hypechat: [523, 784, 1047, 1568], raid: [392, 523, 659, 784], host: [392, 523, 659, 784], follow: [880, 1175] };
  function chime(kind) {
    if (!S.alerts.sound || isPreview) return;
    try {
      audio ||= new (window.AudioContext || window.webkitAudioContext)();
      const vol = Math.min(1, Math.max(0, Number(S.alerts.volume) || 0)) * 0.35;
      const notes = NOTES[kind] || [523, 659, 784, 1047];
      notes.forEach((f, i) => {
        const t = audio.currentTime + i * 0.09, o = audio.createOscillator(), g = audio.createGain();
        o.type = 'triangle'; o.frequency.value = f;
        g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(vol, t + 0.015); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.6);
        o.connect(g).connect(audio.destination); o.start(t); o.stop(t + 0.65);
      });
    } catch { /* no audio here */ }
  }

  function message(m) {
    const parts = (m.parts || []).filter(p => p.type !== 'cheer' && !(p.type === 'text' && !p.text.trim()));
    if (!parts.length) return null;
    const box = h('div', 'msg');
    for (const p of parts) {
      if (p.type === 'emote' && safeUrl(p.url)) { const e = img(p.url, 'emote'); e.alt = p.name; box.appendChild(e); }
      else box.appendChild(document.createTextNode(p.text || p.name || ''));
    }
    return box;
  }

  /* ---------------- queue: one alert at a time ---------------- */
  function onMsg(m) {
    if (!wanted(m)) return;
    if (current && current.m.id === m.id) return refresh(m);
    const i = queue.findIndex(x => x.id === m.id);
    if (i >= 0) { queue[i] = m; return; }
    if (shown.has(m.id)) return;
    queue.push(m);
    if (queue.length > 40) queue.shift();
    if (!current) next();
  }

  function next() {
    const m = queue.shift();
    if (!m) { current = null; return; }
    shown.add(m.id);
    if (shown.size > 500) shown.delete(shown.values().next().value);
    const el = build(m);
    stage.appendChild(el);
    current = { m, el, timer: 0 };
    hold(S.alerts.duration);
    if (S.alerts.style === 'spotlight') confetti(m.event.color || getComputedStyle(el).getPropertyValue('--pc').trim() || PARTY[3]);
    chime(m.event.kind || m.type);
  }

  function hold(seconds) {
    const s = Math.max(2, seconds);
    clearTimeout(current.timer);
    current.timer = setTimeout(leave, s * 1000);
    // restart the time-left bar
    const bar = current.el.querySelector('.timer i');
    if (bar) { const fresh = h('i'); current.el.style.setProperty('--hold', `${s}s`); bar.replaceWith(fresh); }
  }

  /** The same gift combo again: count up in place and stay a little longer. */
  function refresh(m) {
    current.m = m;
    const amount = current.el.querySelector('.amount');
    if (amount && m.event?.amount) { amount.textContent = m.event.amount; amount.classList.remove('bump'); void amount.offsetWidth; amount.classList.add('bump'); }
    hold(Math.max(3, S.alerts.duration * 0.6));
  }

  function leave() {
    if (!current || current.el.classList.contains('out')) return;
    const { el, timer } = current;
    clearTimeout(timer);
    el.classList.add('out');
    current = { m: { id: null }, el, timer: 0 }; // keep the slot busy until it has faded out
    setTimeout(() => { el.remove(); current = null; setTimeout(() => { if (!current) next(); }, 350); }, 550);
  }

  /* ---------------- connection ---------------- */
  let retry = 0;
  function connect() {
    const ws = new WebSocket(`${location.protocol === 'https:' ? 'wss' : 'ws'}://${location.host}/ws?client=${isPreview ? 'alerts-preview' : 'alerts'}${window.obsstudio ? '&obs=1' : ''}`);
    ws.onopen = () => { retry = 0; connBadge.hidden = true; };
    ws.onmessage = e => {
      const d = JSON.parse(e.data);
      if (d.op === 'hello' || d.op === 'settings') applySettings(d.settings); // old alerts are never replayed
      else if (d.op === 'msg') onMsg(d.msg);
      else if (d.op === 'clear') { queue.length = 0; if (current) leave(); }
    };
    ws.onclose = () => {
      if (!isPreview) connBadge.hidden = retry < 2;
      setTimeout(connect, Math.min(10000, 1000 * 2 ** retry++));
    };
  }
  connect();
})();
