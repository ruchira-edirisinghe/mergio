/* Shared bits of Mergio's counter overlays (viewer count, follower goals): the live connection,
   per-source overrides from the link, web fonts and numbers that roll to their new value. */
(() => {
  'use strict';
  const params = new URLSearchParams(location.search);
  const C = (window.MGCounter = {});
  C.params = params;
  C.isPreview = params.has('preview');
  // previews centre the counter vertically in their frame
  if (params.get('mid') === '1') document.documentElement.classList.add('mid');
  C.PLATFORMS = ['youtube', 'twitch', 'kick', 'tiktok', 'facebook'];
  C.NAMES = { twitch: 'Twitch', youtube: 'YouTube', kick: 'Kick', tiktok: 'TikTok', facebook: 'Facebook' };
  C.COLORS = { twitch: '#9146ff', youtube: '#ff0033', kick: '#53fc18', tiktok: '#fe2c55', facebook: '#0866ff' };

  C.h = (tag, cls, text) => { const e = document.createElement(tag); if (cls) e.className = cls; if (text != null) e.textContent = text; return e; };
  C.fmt = n => Math.round(n).toLocaleString('en-US');
  C.short = n => (n >= 1e6 ? `${(n / 1e6).toFixed(n >= 1e7 ? 0 : 1)}M` : n >= 1e4 ? `${(n / 1e3).toFixed(n >= 1e5 ? 0 : 1)}K` : C.fmt(n)).replace('.0', '');
  C.hexA = (hex, a) => {
    const m = /^#?([\da-f]{2})([\da-f]{2})([\da-f]{2})/i.exec(hex || '#000000');
    return m ? `rgba(${parseInt(m[1], 16)},${parseInt(m[2], 16)},${parseInt(m[3], 16)},${a})` : `rgba(0,0,0,${a})`;
  };

  /** Settings of one section, with any of its keys overridden from the link (?style=neon&fontSize=40). */
  C.withOverrides = (section, looks) => {
    // ?slot=2: this browser source uses saved look 2
    const look = Array.isArray(looks) ? looks[Number(params.get('slot')) - 1] : null;
    const out = { ...section, ...(look?.values ? Object.values(look.values)[0] : {}) };
    for (const [k, v] of params) {
      if (!(k in out)) continue;
      const cur = out[k];
      out[k] = typeof cur === 'number' ? Number(v) : typeof cur === 'boolean' ? v === 'true' || v === '1' : v;
    }
    return out;
  };

  const SYSTEM_FONTS = ['', 'system-ui', 'Segoe UI', 'Arial', 'Verdana', 'Tahoma', 'Trebuchet MS', 'Georgia', 'Times New Roman', 'Courier New', 'Impact', 'Comic Sans MS', 'Consolas'];
  const loaded = new Set();
  /** Loads a Google Font once and returns the CSS font-family for it. */
  C.font = name => {
    const font = String(name || '').trim();
    if (font && !SYSTEM_FONTS.includes(font) && !loaded.has(font)) {
      loaded.add(font);
      const link = document.createElement('link');
      link.rel = 'stylesheet';
      link.href = `https://fonts.googleapis.com/css2?family=${encodeURIComponent(font).replace(/%20/g, '+')}:wght@400;500;600;700;800;900&display=swap`;
      document.head.appendChild(link);
    }
    return `${font ? `'${font.replace(/'/g, '')}', ` : ''}'Segoe UI', system-ui, sans-serif`;
  };

  /** Rolls the number in el from what it shows now to `to`. */
  C.roll = (el, to, { animate = true, format = C.fmt } = {}) => {
    const from = Number(el.dataset.n);
    el.dataset.n = String(to);
    cancelAnimationFrame(el._raf);
    if (!animate || !Number.isFinite(from) || from === to || matchMedia('(prefers-reduced-motion: reduce)').matches) { el.textContent = format(to); return; }
    const t0 = performance.now(), d = 900;
    const step = now => {
      const k = Math.min(1, (now - t0) / d), e = 1 - (1 - k) ** 3;
      el.textContent = format(from + (to - from) * e);
      if (k < 1) el._raf = requestAnimationFrame(step);
    };
    el._raf = requestAnimationFrame(step);
  };

  /** Plays a one-off CSS animation class again. */
  C.replay = (el, cls) => { el.classList.remove(cls); void el.offsetWidth; el.classList.add(cls); };

  C.icon = (name, cls) => { const s = C.h('span', cls); s.appendChild(mergioIcon(name)); return s; };

  /** Connects to Mergio and calls onSettings(settings) / onStats(stats) as they arrive. */
  C.connect = (client, { onSettings, onStats }) => {
    let retry = 0;
    const open = () => {
      const ws = new WebSocket(`${location.protocol === 'https:' ? 'wss' : 'ws'}://${location.host}/ws?client=${C.isPreview ? 'preview' : client}${window.obsstudio ? '&obs=1' : ''}`);
      ws.onopen = () => { retry = 0; };
      ws.onmessage = e => {
        const d = JSON.parse(e.data);
        if (d.op === 'hello') { onSettings(d.settings); if (d.stats) onStats(d.stats); }
        if (d.op === 'settings') onSettings(d.settings);
        if (d.op === 'stats') onStats(d.stats);
      };
      ws.onclose = () => setTimeout(open, Math.min(10000, 1000 * 2 ** retry++));
    };
    open();
  };
})();
