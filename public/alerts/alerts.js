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

  const STYLES = ['levelup', 'achievement', 'loot', 'arcade', 'combo', 'quest', 'cyber', 'gacha', 'roulette', 'crt', 'transmission', 'bounty', 'spotlight', 'neon', 'bubble'];
  // Each theme's own font (used unless you pick one in Alerts settings) and its big word on top.
  const THEME_FONT = { levelup: 'Lilita One', loot: 'Lilita One', arcade: 'Press Start 2P', combo: 'Bangers', quest: 'Cinzel', cyber: 'Orbitron', achievement: 'Rubik',
    gacha: 'Baloo 2', roulette: 'Russo One', crt: 'VT323', transmission: 'Chakra Petch', bounty: 'Rye' };
  const TIERS = ['common', 'rare', 'epic', 'legendary'];
  const TIER_NAMES = ['Common', 'Rare', 'Epic', 'Legendary'];
  const TIER_COLORS = ['#a7b1c2', '#3fa1ff', '#b866ff', '#ffb627'];
  const POINTS = [50, 250, 1000, 5000];
  const HEADLINES = {
    levelup: () => 'LEVEL UP!',
    achievement: () => 'Achievement unlocked',
    loot: (kind, t) => `${TIER_NAMES[t]} drop`,
    arcade: kind => (kind === 'follow' ? 'NEW PLAYER!' : kind === 'raid' || kind === 'host' ? 'PARTY JOINED!' : '1UP!'),
    combo: () => 'COMBO!',
    quest: () => 'Quest complete',
    cyber: (kind, t, label) => `// incoming: ${label || 'alert'}`,
    gacha: (kind, t) => `${TIER_NAMES[t]} pull!`,
    roulette: (kind, t) => (t === 3 ? 'JACKPOT!' : 'ITEM GET!'),
    crt: () => 'PLAY ▶',
    transmission: () => 'Incoming transmission',
    bounty: () => 'WANTED',
  };
  // How big an alert is: common, rare, epic or legendary (the value at which each step starts)
  const TIER_STEPS = { gift: [100, 1000, 10000], kicks: [100, 1000, 10000], cheer: [100, 1000, 10000], superchat: [5, 20, 100], hypechat: [5, 20, 100], supersticker: [5, 20, 100],
    giftsub: [5, 10, 50], giftmember: [5, 10, 50], raid: [10, 50, 250], host: [10, 50, 250], sub: [6, 12, 24] };
  function tierOf(m) {
    const ev = m.event || {}, steps = TIER_STEPS[ev.kind];
    const v = Number(ev.value) || Number(ev.diamonds) || parseFloat(String(ev.amount || '').replace(/[^\d.]/g, '')) || 0;
    if (!steps) return ev.kind === 'follow' ? 0 : ev.kind === 'milestone' ? 2 : 1;
    const t = v >= steps[2] ? 3 : v >= steps[1] ? 2 : v >= steps[0] ? 1 : 0;
    return ev.kind === 'sub' ? Math.max(1, t) : t;
  }
  const levels = new Map(); // each viewer's level goes up with every alert they bring (this session)
  const SVG = 'http://www.w3.org/2000/svg';

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
    const look = s.templates?.alerts?.[Number(params.get('slot')) - 1]; // ?slot=2: saved look 2
    if (look) Object.assign(out.alerts, look.values?.alerts || {}, { placement: out.alerts.placement });
    for (const [k, v] of params) {
      if (k in out.alerts) { const cur = out.alerts[k]; out.alerts[k] = typeof cur === 'number' ? Number(v) : typeof cur === 'boolean' ? v === 'true' || v === '1' : v; }
    }
    return out;
  }
  const SYSTEM_FONTS = ['', 'system-ui', 'Segoe UI', 'Arial', 'Verdana', 'Tahoma', 'Trebuchet MS', 'Georgia', 'Times New Roman', 'Courier New', 'Impact', 'Comic Sans MS', 'Consolas'];
  let fontLoaded = '';
  function applySettings(raw) {
    S = withOverrides(raw);
    const a = S.alerts, r = document.documentElement.style;
    const style = STYLES.includes(a.style) ? a.style : 'levelup';
    const font = (a.font || THEME_FONT[style] || S.appearance.font || '').trim();
    if (font && font !== fontLoaded && !SYSTEM_FONTS.includes(font)) {
      fontLoaded = font;
      const link = document.createElement('link');
      link.rel = 'stylesheet';
      link.href = `https://fonts.googleapis.com/css2?family=${encodeURIComponent(font).replace(/%20/g, '+')}:wght@400;500;600;700;800;900&display=swap`;
      document.head.appendChild(link);
    }
    r.setProperty('--font', `${font ? `'${font.replace(/'/g, '')}', ` : ''}'Segoe UI', system-ui, sans-serif`);
    r.setProperty('--scale', String(Math.min(3, Math.max(0.4, Number(a.size) || 1))));
    r.setProperty('--text', /^#[\da-f]{6}$/i.test(a.textColor) ? a.textColor : '#ffffff');
    document.body.className = `pos-${a.position} st-${style}`;
    const b = document.body.classList;
    b.toggle('no-label', a.showLabel === false);
    b.toggle('no-platform', a.showPlatform === false);
    b.toggle('no-timer', a.showTimer === false);
    b.toggle('no-head', a.showHeadline === false);
    if (a.placement === 'chat' && !demo) { queue.length = 0; if (current) leave(); }
  }

  /* ---------------- which messages ---------------- */
  function wanted(m) {
    if (S && m.sourceId === 'demo') return true;
    if (!S || !m.event || NOT_ALERTS.has(m.type) || S.alerts.placement === 'chat') return false;
    const sec = S[m.platform];
    if (!sec) return false;
    const key = PLATFORM_KEYS[m.platform]?.[m.type];
    if (key && sec[key] === false) return false;
    if (m.platform === 'tiktok' && m.type === 'gift' && (m.event.diamonds || 0) < (sec.minGiftDiamonds || 0)) return false;
    if (m.platform === 'twitch' && m.flags?.shared && sec.sharedChat === 'hide') return false; // same as the chat
    const who = [m.user.name, m.user.login].map(x => String(x || '').toLowerCase());
    if (list(S.general.ignoreChatters).some(n => who.includes(n))) return false;
    return true;
  }

  /** The message has a word from Blocked words (the alert still shows, without the message). */
  const blocked = m => {
    const bad = list(S.general.blockedWords);
    const text = (m.parts || []).map(p => p.text || p.name || '').join('').toLowerCase();
    return bad.length > 0 && bad.some(w => text.includes(w));
  };

  /* ---------------- one alert ---------------- */
  function build(m) {
    const ev = m.event, a = S.alerts;
    const style = STYLES.includes(a.style) ? a.style : 'levelup';
    const tier = tierOf(m);
    const el = h('div', `alert ev-${ev.kind || m.type} p-${m.platform} t-${TIERS[tier]}`);
    el.style.setProperty('--pc', `var(--${m.platform})`);
    el.style.setProperty('--tier', TIER_COLORS[tier]);
    el.style.setProperty('--t', String(tier));
    // the accent colour: the platform's (or the event's own, like a Super Chat's), the size of the alert, or your own
    if (a.colorMode === 'tier') el.style.setProperty('--ev', TIER_COLORS[tier]);
    else if (a.colorMode === 'custom' && /^#[\da-f]{6}$/i.test(a.accent)) el.style.setProperty('--ev', a.accent);
    else if (ev.color) el.style.setProperty('--ev', ev.color);
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
    art.appendChild(h('i', 'ring'));

    let label = LABELS[ev.kind] || '';
    if (ev.kind === 'sub' && /resub|continued/i.test(ev.title || '')) label = 'Resubscribed';
    const lab = h('div', 'label');
    if (label) lab.appendChild(h('span', 'what-kind', label));
    const chip = h('span', 'pchip'); chip.appendChild(mergioIcon(m.platform)); chip.appendChild(document.createTextNode(`on ${PLATFORM_NAMES[m.platform] || m.platform}`));
    lab.appendChild(chip);

    const info = h('div', 'info');
    // the theme's big word ("LEVEL UP!", "Epic drop"…), or your own
    const head = String(a.headline || '').trim() || (HEADLINES[style] ? HEADLINES[style](ev.kind, tier, label) : '');
    if (head) info.appendChild(h('div', 'hw', head));
    info.append(lab, nameEl(m.user.name));
    if (ev.title) info.appendChild(h('div', 'title', ev.title));
    const num = String(ev.amount || '').match(/\d[\d.,]*/)?.[0];
    if (num && (/^[×x]/i.test(ev.amount) || !(ev.title || '').includes(num))) info.appendChild(h('div', 'amount', ev.amount));
    if (a.showMessage && !blocked(m)) { const msg = message(m); if (msg) info.appendChild(msg); }
    if (pic) el.classList.add('has-gift');
    // game bits some themes show: the viewer's level, points for the alert and how rare it is
    const key = `${m.platform}:${m.user.id || m.user.name}`;
    const lv = (levels.get(key) || 0) + 1;
    if (!m.event.live || !levels.has(key)) levels.set(key, lv);
    if (levels.size > 2000) levels.delete(levels.keys().next().value);
    const lvl = h('div', 'lvl');
    lvl.append(h('span', 'lv-t', 'LV'), h('span', 'lv-n'));
    lvl.lastChild.append(h('b', 'old', String(lv)), h('b', 'new', String(lv + 1)));
    const pts = h('div', 'pts', `+${POINTS[tier].toLocaleString('en-US')}`);
    pts.dataset.n = String(POINTS[tier]);
    const xp = h('div', 'xp'); xp.append(h('i'), h('span', 'xp-t', `+${POINTS[tier].toLocaleString('en-US')} XP`));
    info.appendChild(xp);
    art.append(lvl, h('div', 'rar', TIER_NAMES[tier]));
    if (style === 'achievement') info.appendChild(pts); else el.appendChild(pts);
    el.prepend(decor(), art, info);
    extras(style, el, art, info, tier);
    el.append(h('div', 'timer'));
    el.lastChild.appendChild(h('i'));
    if (style === 'arcade') countUp(pts, POINTS[tier]);
    return el;
  }

  /** Pieces some themes add around the shared parts: the capsule, the reel, the TV's on-screen display… */
  const STARS = [2, 3, 4, 5];
  const CHANNELS = ['03', '12', '42', '99'];
  const REEL = ['gift', 'coin', 'star', 'sparkle', 'crown', 'bolt', 'flame', 'cheer', 'money', 'gem', 'heart'];
  const MONTHS = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'];
  function extras(style, el, art, info, tier) {
    if (style === 'gacha') {
      // the capsule sits over the picture and cracks open; the stars count the rarity
      art.append(h('i', 'burst'), h('i', 'cap top'), h('i', 'cap bot'));
      const stars = h('div', 'stars');
      for (let i = 0; i < STARS[tier]; i++) { const s = h('i'); s.style.setProperty('--i', i); stars.appendChild(s); }
      info.prepend(stars);
    } else if (style === 'roulette') {
      // a reel of items spins past and stops on a copy of the real picture; rarer alerts spin longer
      el.style.setProperty('--spin', `${(1.1 + tier * 0.45).toFixed(2)}s`);
      const reel = h('div', 'reel'), strip = h('div', 'strip');
      for (let i = 0; i < 11; i++) { const c = h('span', 'cell'); c.appendChild(mergioIcon(REEL[(i * 4 + tier) % REEL.length])); strip.appendChild(c); }
      const last = h('span', 'cell last');
      if (art.firstChild) last.appendChild(art.firstChild.cloneNode(true));
      strip.appendChild(last);
      reel.appendChild(strip);
      art.appendChild(reel);
      art.appendChild(h('i', 'flash'));
    } else if (style === 'crt') {
      // on-screen display: the channel (higher for bigger alerts) and a VHS date and time
      const d = new Date(), hr = d.getHours();
      const osd = h('div', 'osd');
      osd.append(h('span', 'ch', `CH ${CHANNELS[tier]}`),
        h('span', 'stamp', `${hr < 12 ? 'AM' : 'PM'} ${hr % 12 || 12}:${String(d.getMinutes()).padStart(2, '0')}\n${MONTHS[d.getMonth()]}. ${String(d.getDate()).padStart(2, '0')} ${d.getFullYear()}`));
      el.appendChild(osd);
    } else if (style === 'transmission') {
      // signal bars (more for bigger alerts) and the message read out a word at a time
      const sig = h('div', 'sig');
      for (let i = 0; i < 4; i++) { const b = h('i'); b.style.setProperty('--i', i); sig.appendChild(b); }
      el.appendChild(sig);
      readOut(info.querySelector('.msg'));
    } else if (style === 'bounty') el.appendChild(h('i', 'badge'));
  }

  /** Transmission: the message comes in one word at a time (words keep their letters together in every script). */
  function readOut(msg) {
    if (!msg) return;
    let i = 0;
    for (const n of [...msg.childNodes]) {
      if (n.nodeType === 3) {
        const frag = document.createDocumentFragment();
        for (const part of n.textContent.split(/(\s+)/)) {
          if (!part) continue;
          if (/^\s+$/.test(part)) { frag.appendChild(document.createTextNode(part)); continue; }
          const w = h('span', 'w', part); w.style.setProperty('--i', Math.min(i++, 40)); frag.appendChild(w);
        }
        n.replaceWith(frag);
      } else if (n.nodeType === 1) { n.classList.add('w'); n.style.setProperty('--i', Math.min(i++, 40)); }
    }
  }

  /** Arcade score: counts up like an old high-score table. */
  function countUp(el, to) {
    const t0 = performance.now() + 700, d = 900;
    const step = now => {
      const k = Math.max(0, Math.min(1, (now - t0) / d));
      el.textContent = `SCORE +${String(Math.round(to * k)).padStart(6, '0')}`;
      if (k < 1 && el.isConnected) requestAnimationFrame(step);
    };
    el.textContent = 'SCORE +000000';
    requestAnimationFrame(step);
  }

  /** The name, one letter per span so styles can animate the letters in one after another. */
  function nameEl(name) {
    const el = h('div', 'name');
    const text = String(name || '');
    const seg = typeof Intl !== 'undefined' && Intl.Segmenter ? [...new Intl.Segmenter(undefined, { granularity: 'grapheme' }).segment(text)].map(x => x.segment) : Array.from(text);
    // Joined scripts (Arabic, Hebrew, Sinhala, Tamil, Hindi, Thai…) must stay in one piece, or their letters lose their shapes.
    // They animate in as a whole word; scripts whose letters stand alone animate letter by letter.
    const solo = /^[\p{Script=Latin}\p{Script=Cyrillic}\p{Script=Greek}\p{Script=Armenian}\p{Script=Georgian}\p{Script=Han}\p{Script=Hiragana}\p{Script=Katakana}\p{Script=Hangul}\p{Script=Common}\p{Script=Inherited}]*$/u.test(text);
    if (!solo || seg.length > 32) { const l = h('span', 'l', text); l.style.setProperty('--i', 0); el.appendChild(l); el.setAttribute('aria-label', text); return el; }
    seg.forEach((ch, i) => { const l = h('span', 'l', ch); l.style.setProperty('--i', i); el.appendChild(l); });
    el.setAttribute('aria-label', text);
    return el;
  }

  /** TV static for the CRT theme: SVG noise that jumps around while the channel tunes in. */
  let noiseId = 0;
  function staticNoise() {
    const id = `mg-noise-${++noiseId}`, make = (tag, attrs) => { const e = document.createElementNS(SVG, tag); for (const k in attrs) e.setAttribute(k, attrs[k]); return e; };
    const svg = make('svg', { class: 'static', 'aria-hidden': 'true' });
    const f = make('filter', { id, x: '0', y: '0', width: '100%', height: '100%' });
    f.append(make('feTurbulence', { type: 'fractalNoise', baseFrequency: '.9', numOctaves: '2', stitchTiles: 'stitch' }), make('feColorMatrix', { type: 'saturate', values: '0' }));
    svg.append(f, make('rect', { width: '100%', height: '100%', filter: `url(#${id})` }));
    return svg;
  }

  /** Decoration behind the alert: the neon tube, the sticker's glint, the glass card's glow. */
  function decor() {
    const fx = h('div', 'fx'), st = S.alerts.style;
    if (st === 'neon') {
      const svg = document.createElementNS(SVG, 'svg');
      svg.setAttribute('class', 'tube');
      for (const cls of ['glow', 'core']) {
        const r = document.createElementNS(SVG, 'rect');
        r.setAttribute('class', cls); r.setAttribute('pathLength', '1');
        svg.appendChild(r);
      }
      fx.appendChild(svg);
    } else if (st === 'bubble' || st === 'loot' || st === 'achievement' || st === 'levelup') fx.appendChild(h('i', 'shine'));
    if (st === 'loot') fx.appendChild(h('i', 'beam'));
    if (st === 'combo') fx.appendChild(h('i', 'streaks'));
    if (st === 'cyber') fx.append(h('i', 'scan'), h('i', 'corners'));
    if (st === 'quest') fx.append(h('i', 'roll l'), h('i', 'roll r'));
    if (st === 'roulette') fx.appendChild(h('i', 'bulbs'));
    if (st === 'crt') fx.append(staticNoise(), h('i', 'roll'));
    if (st === 'transmission') fx.appendChild(h('i', 'warp'));
    if (st === 'bounty') fx.append(h('i', 'poster'), h('i', 'nail l'), h('i', 'nail r'));
    return fx;
  }

  /* ---------------- sound: made on the fly in shared/sounds.js (no files) ---------------- */
  function chime(kind, tier) {
    if (!S.alerts.sound || isPreview || !window.mergioSound) return;
    window.mergioSound.play(window.mergioSound.forTier(S.alerts, tier), kind, S.alerts.volume);
  }

  /* ---------------- read aloud: the voice is made by Mergio on this computer (src/tts.js) ---------------- */
  const READ_FROM = { all: 0, rare: 1, epic: 2, legendary: 3 };
  const VOICE_DELAY = 0.9; // seconds after the alert appears, once the sound has played
  const readable = m => !!S && S.alerts.readAloud && !isPreview && !demo && tierOf(m) >= (READ_FROM[S.alerts.readMin] || 0);
  const speeches = new Map(); // alert id -> Promise<{ blob } | { text } | null>
  function speech(m) {
    const id = String(m.id).replace(/~r\d+$/, '');
    if (!speeches.has(id)) {
      speeches.set(id, fetch(`/api/tts?id=${encodeURIComponent(id)}`).then(async r => (r.status === 200 ? { blob: await r.blob() } : r.status === 503 ? { text: (await r.json()).text } : null)).catch(() => null));
      if (speeches.size > 40) speeches.delete(speeches.keys().next().value);
    }
    return speeches.get(id);
  }
  let voice = null; // { audio, url } or { utter }
  function hush() {
    if (!voice) return;
    if (voice.audio) { voice.audio.pause(); URL.revokeObjectURL(voice.url); }
    if (voice.utter) try { speechSynthesis.cancel(); } catch { /* none */ }
    voice = null;
  }
  /** Keeps the alert up until the voice has finished (plus a moment). */
  function stayFor(el, seconds) {
    if (!current || current.el !== el || !isFinite(seconds)) return;
    const shownFor = (Date.now() - current.shown) / 1000;
    const want = Math.min(40, VOICE_DELAY + seconds + 1) - shownFor;
    if (want > S.alerts.duration - shownFor) hold(want);
  }
  function readAloud(m, el) {
    if (!readable(m)) return;
    speech(m).then(got => {
      if (!got || !current || current.el !== el || el.classList.contains('out')) return;
      const wait = Math.max(0, VOICE_DELAY * 1000 - (Date.now() - current.shown));
      const vol = Math.min(1, Math.max(0, Number(S.alerts.ttsVolume) || 0));
      if (got.blob) {
        const url = URL.createObjectURL(got.blob), audio = new Audio(url);
        audio.volume = vol;
        voice = { audio, url };
        audio.onloadedmetadata = () => stayFor(el, audio.duration);
        setTimeout(() => { if (voice?.audio === audio) audio.play().catch(() => {}); }, wait);
      } else if (got.text && window.speechSynthesis) {
        // no voice on this computer for Mergio to use: the browser's own voice, if it has one
        const u = new SpeechSynthesisUtterance(got.text);
        u.volume = vol; u.rate = Number(S.alerts.ttsRate) || 1;
        voice = { utter: u };
        stayFor(el, got.text.length / 14);
        setTimeout(() => { if (voice?.utter === u) speechSynthesis.speak(u); }, wait);
      }
    });
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
    if (readable(m)) speech(m); // start making the voice now, so it's ready when the alert shows
    kick();
  }

  let paused = false;            // the streamer paused alerts: new ones wait in the queue
  // Space between alerts: after one leaves, the next waits until restUntil (Alerts settings, or ?gap= per browser source)
  let restUntil = 0, restTimer = 0;
  /** Shows the next alert as soon as nothing is on screen and the rest after the last one is over. */
  function kick() {
    if (current) return;
    const wait = restUntil - Date.now();
    clearTimeout(restTimer);
    if (wait > 0) { restTimer = setTimeout(kick, wait); return; }
    next();
  }
  function next() {
    if (paused && !isPreview && !demo) { current = null; return; }
    const m = queue.shift();
    if (!m) { current = null; return; }
    shown.add(m.id);
    if (shown.size > 500) shown.delete(shown.values().next().value);
    const el = build(m);
    stage.appendChild(el);
    current = { m, el, timer: 0, shown: Date.now() };
    hold(S.alerts.duration);
    chime(m.event.kind || m.type, tierOf(m));
    readAloud(m, el);
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
    hush();
    el.classList.add('out');
    current = { m: { id: null }, el, timer: 0 }; // keep the slot busy until it has faded out
    const rest = demo || isPreview ? 0 : Math.min(60, Math.max(0, Number(S.alerts.gap) || 0)) * 1000;
    setTimeout(() => { el.remove(); current = null; restUntil = Date.now() + 350 + rest; kick(); }, 550);
  }

  /* ---------------- samples: ?demo=1 plays example alerts on a loop (the style cards in the control panel) ---------------- */
  const TT = 'https://p16-webcast.tiktokcdn.com/img/maliva/webcast-va/';
  const SAMPLES = [
    { platform: 'tiktok', type: 'gift', user: { name: 'NovaRider' }, event: { kind: 'gift', title: 'sent Galaxy', amount: '×3', image: `${TT}resource/79a02148079526539f7599150da9fd28.png~tplv-obj.webp`, value: 3000 } },
    { platform: 'twitch', type: 'sub', user: { name: 'PixelPanda' }, parts: [{ type: 'text', text: 'six months already!' }], event: { kind: 'sub', title: 'resubscribed for 6 months', amount: 'Tier 1', value: 6 } },
    { platform: 'youtube', type: 'superchat', user: { name: 'LunaByte' }, parts: [{ type: 'text', text: 'Keep it up!' }], event: { kind: 'superchat', title: 'sent a Super Chat', amount: '$20.00', color: '#e91e63' } },
    { platform: 'kick', type: 'follow', user: { name: 'TurboTaco' }, event: { kind: 'follow', title: 'followed' } },
  ];
  let demoN = 0;
  function demoLoop() {
    if (!S) return setTimeout(demoLoop, 300);
    const base = SAMPLES[demoN++ % SAMPLES.length];
    onMsg({ ...base, id: `demo${demoN}`, time: Date.now(), sourceId: 'demo', parts: base.parts || [], user: { id: base.user.name, avatar: '', ...base.user } });
    setTimeout(demoLoop, (Math.max(2, S.alerts.duration) + 1.6) * 1000);
  }
  const demo = params.get('demo') === '1';

  /* ---------------- connection ---------------- */
  let retry = 0;
  function connect() {
    const ws = new WebSocket(`${location.protocol === 'https:' ? 'wss' : 'ws'}://${location.host}/ws?client=${isPreview ? 'alerts-preview' : 'alerts'}${window.obsstudio ? '&obs=1' : ''}`);
    ws.onopen = () => { retry = 0; connBadge.hidden = true; };
    ws.onmessage = e => {
      const d = JSON.parse(e.data);
      if (d.op === 'hello' || d.op === 'settings') applySettings(d.settings); // old alerts are never replayed
      if (d.op === 'hello') paused = !!d.live?.alertsPaused;
      else if (d.op === 'msg') { if (!demo) onMsg(d.msg); }
      else if (d.op === 'replay' && !demo && d.msg?.event) {
        // played again from the Gifts dock: a fresh copy, so it isn't skipped as already shown
        const m = { ...d.msg, id: `${d.msg.id}~r${Date.now()}`, event: { ...d.msg.event, live: false } };
        queue.push(m); kick();
      }
      else if (d.op === 'alerts') {
        paused = !!d.paused;
        if (d.skip && current && !isPreview && !demo) leave();
        else if (!paused) kick();
      }
      else if (d.op === 'clear') { queue.length = 0; if (current && !(d.keep || []).includes(current.m.id)) leave(); }
      else if (d.op === 'delete' && Array.isArray(d.ids)) {
        // hidden from the control panel (or deleted by a moderator): drop it, even mid-alert
        for (let i = queue.length - 1; i >= 0; i--) if (d.ids.includes(queue[i].id)) queue.splice(i, 1);
        if (current && d.ids.includes(current.m.id)) leave();
      }
    };
    ws.onclose = () => {
      if (!isPreview) connBadge.hidden = retry < 2;
      setTimeout(connect, Math.min(10000, 1000 * 2 ** retry++));
    };
  }
  connect();
  if (demo) demoLoop();
})();
