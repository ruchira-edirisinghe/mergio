/* The "I'm live" status picture (1080x1920, the size of a WhatsApp or Instagram status), drawn on a canvas.
 * Used by the control panel and the phone screens: MergioStatusCard.draw(canvas, card, opts) -> Promise.
 *   card: { name, title, platforms: [{ platform, handle }], thumb }   (from GET /api/golive -> preview.card)
 *   opts: { theme, headline, showTitle, showHandles }                 (the golive status settings) */
(() => {
  const W = 1080, H = 1920;
  const FONT = '"Segoe UI", Roboto, "Noto Sans", "Noto Sans Sinhala", "Nirmala UI", system-ui, sans-serif';
  const NAMES = { youtube: 'YouTube', twitch: 'Twitch', kick: 'Kick', tiktok: 'TikTok', facebook: 'Facebook' };
  const COLORS = { youtube: '#ff0000', twitch: '#9146ff', kick: '#53fc18', tiktok: '#111111', facebook: '#0866ff' };
  const THEMES = {
    neon: ctx => { fill(ctx, '#0b0b14'); glow(ctx, 160, 300, 900, 'rgba(255,45,143,.55)'); glow(ctx, 980, 1500, 1000, 'rgba(124,77,255,.6)'); },
    sunset: ctx => { grad(ctx, ['#ff512f', '#dd2476', '#ff9966']); shade(ctx, .1, .55); },
    ocean: ctx => { grad(ctx, ['#0f2027', '#203a43', '#2c5364']); glow(ctx, 900, 400, 900, 'rgba(0,210,255,.35)'); },
    mono: ctx => { fill(ctx, '#111114'); ctx.strokeStyle = 'rgba(255,255,255,.05)'; ctx.lineWidth = 2; for (let x = 0; x <= W; x += 90) line(ctx, x, 0, x, H); for (let y = 0; y <= H; y += 90) line(ctx, 0, y, W, y); },
  };

  function fill(ctx, c) { ctx.fillStyle = c; ctx.fillRect(0, 0, W, H); }
  function grad(ctx, stops) { const g = ctx.createLinearGradient(0, 0, W, H); stops.forEach((c, i) => g.addColorStop(i / (stops.length - 1), c)); ctx.fillStyle = g; ctx.fillRect(0, 0, W, H); }
  function glow(ctx, x, y, r, c) { const g = ctx.createRadialGradient(x, y, 0, x, y, r); g.addColorStop(0, c); g.addColorStop(1, 'rgba(0,0,0,0)'); ctx.fillStyle = g; ctx.fillRect(0, 0, W, H); }
  function shade(ctx, top, bottom) { const g = ctx.createLinearGradient(0, 0, 0, H); g.addColorStop(0, `rgba(0,0,0,${top})`); g.addColorStop(1, `rgba(0,0,0,${bottom})`); ctx.fillStyle = g; ctx.fillRect(0, 0, W, H); }
  function line(ctx, a, b, c, d) { ctx.beginPath(); ctx.moveTo(a, b); ctx.lineTo(c, d); ctx.stroke(); }
  function round(ctx, x, y, w, h, r) { ctx.beginPath(); ctx.roundRect ? ctx.roundRect(x, y, w, h, r) : ctx.rect(x, y, w, h); }

  /** Draws an image so it covers the box, cropping what sticks out. */
  function cover(ctx, img, x, y, w, h) {
    const s = Math.max(w / img.width, h / img.height);
    const iw = w / s, ih = h / s;
    ctx.drawImage(img, (img.width - iw) / 2, (img.height - ih) / 2, iw, ih, x, y, w, h);
  }

  /** Splits text into lines that fit maxW, at most max lines (the last one ends with … when cut). */
  function wrap(ctx, text, maxW, max) {
    const words = String(text || '').split(/\s+/).filter(Boolean);
    const lines = [];
    let cur = '';
    for (const w of words) {
      const next = cur ? `${cur} ${w}` : w;
      if (ctx.measureText(next).width <= maxW || !cur) cur = next;
      else { lines.push(cur); cur = w; }
    }
    if (cur) lines.push(cur);
    if (lines.length > max) {
      lines.length = max;
      let last = lines[max - 1];
      while (last && ctx.measureText(`${last}…`).width > maxW) last = last.slice(0, -1);
      lines[max - 1] = `${last.trimEnd()}…`;
    }
    // a single word wider than the picture: shrink it letter by letter
    return lines.map(l => { while (ctx.measureText(l).width > maxW && l.length > 2) l = `${l.slice(0, -2)}…`; return l; });
  }

  function load(src) {
    return new Promise(resolve => {
      if (!src) return resolve(null);
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = () => resolve(null);
      img.src = src;
    });
  }

  /** A platform's logo in a coloured circle. */
  function logo(ctx, platform, cx, cy, r) {
    ctx.save();
    ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI * 2);
    ctx.fillStyle = COLORS[platform] || '#333'; ctx.fill();
    if (platform === 'tiktok') { ctx.lineWidth = 3; ctx.strokeStyle = 'rgba(255,255,255,.25)'; ctx.stroke(); }
    const b = window.MERGIO_BRANDS && window.MERGIO_BRANDS[platform];
    if (b) {
      const size = r * 1.1, s = size / 24;
      ctx.translate(cx - size / 2, cy - size / 2); ctx.scale(s, s);
      ctx.fillStyle = platform === 'kick' ? '#000' : '#fff';
      ctx.fill(new Path2D(b.path));
    }
    ctx.restore();
  }

  async function draw(canvas, card = {}, opts = {}) {
    canvas.width = W; canvas.height = H;
    const ctx = canvas.getContext('2d');
    const thumb = await load(card.thumb);
    const theme = opts.theme === 'thumb' && !thumb ? 'neon' : (opts.theme || 'thumb');

    // ----- background -----
    if (theme === 'thumb') {
      ctx.save(); ctx.filter = 'blur(42px) saturate(1.3)'; cover(ctx, thumb, -80, -80, W + 160, H + 160); ctx.restore();
      shade(ctx, .45, .82);
    } else (THEMES[theme] || THEMES.neon)(ctx);

    // ----- measure what goes in the middle, then centre it -----
    const showTitle = opts.showTitle !== false && card.title;
    const platforms = (card.platforms || []).slice(0, 5);
    ctx.font = `800 84px ${FONT}`;
    const nameLines = wrap(ctx, card.name || 'I’m live', 940, 2);
    // everything has to fit between the pill (300) and the footer (1760): shrink the thumbnail first,
    // then use fewer title lines, then pack the platform rows closer
    const TOP = 300, BOTTOM = 1740;
    let thumbH = thumb ? 540 : 0, titleMax = thumb ? 3 : 4, rowGap = 128, titleLines = [];
    const measure = () => {
      ctx.font = `600 50px ${FONT}`;
      titleLines = showTitle ? wrap(ctx, card.title, 940, titleMax) : [];
      return (thumbH ? thumbH + 70 : 0) + nameLines.length * 96 + (titleLines.length ? 24 + titleLines.length * 64 : 0)
        + (platforms.length ? 140 + platforms.length * rowGap : 0);
    };
    let total = measure();
    if (total > BOTTOM - TOP && thumbH) { thumbH = Math.max(380, thumbH - (total - (BOTTOM - TOP))); total = measure(); }
    while (total > BOTTOM - TOP && titleMax > 1 && showTitle) { titleMax--; total = measure(); }
    if (total > BOTTOM - TOP) { rowGap = Math.max(100, rowGap - Math.ceil((total - (BOTTOM - TOP)) / Math.max(1, platforms.length))); total = measure(); }
    let y = TOP + Math.max(0, (BOTTOM - TOP - total) / 2);

    // ----- the LIVE pill at the top -----
    const head = String(opts.headline || 'LIVE NOW').toUpperCase();
    ctx.font = `800 58px ${FONT}`;
    const pw = ctx.measureText(head).width + 150;
    round(ctx, (W - pw) / 2, 130, pw, 104, 52);
    ctx.fillStyle = '#ff2d55'; ctx.shadowColor = 'rgba(255,45,85,.6)'; ctx.shadowBlur = 40; ctx.fill(); ctx.shadowBlur = 0;
    ctx.beginPath(); ctx.arc((W - pw) / 2 + 62, 182, 15, 0, Math.PI * 2); ctx.fillStyle = '#fff'; ctx.fill();
    ctx.fillStyle = '#fff'; ctx.textAlign = 'left'; ctx.textBaseline = 'middle';
    ctx.fillText(head, (W - pw) / 2 + 98, 184);

    // ----- the stream's thumbnail -----
    ctx.textAlign = 'center'; ctx.textBaseline = 'alphabetic';
    if (thumb) {
      const tw = Math.min(960, Math.round(thumbH * 16 / 9)), tx = (W - tw) / 2;
      ctx.save();
      round(ctx, tx, y, tw, thumbH, 36);
      ctx.shadowColor = 'rgba(0,0,0,.6)'; ctx.shadowBlur = 50; ctx.fillStyle = '#000'; ctx.fill(); ctx.shadowBlur = 0;
      ctx.clip(); cover(ctx, thumb, tx, y, tw, thumbH);
      ctx.restore();
      y += thumbH + 70;
    }

    // ----- name and title -----
    ctx.fillStyle = '#fff'; ctx.font = `800 84px ${FONT}`;
    ctx.shadowColor = 'rgba(0,0,0,.5)'; ctx.shadowBlur = 18;
    for (const l of nameLines) { y += 84; ctx.fillText(l, W / 2, y); y += 12; }
    if (titleLines.length) {
      y += 24; ctx.font = `600 50px ${FONT}`; ctx.fillStyle = 'rgba(255,255,255,.88)';
      for (const l of titleLines) { y += 54; ctx.fillText(l, W / 2, y); y += 10; }
    }
    ctx.shadowBlur = 0;

    // ----- where to watch -----
    if (platforms.length) {
      y += 70;
      ctx.font = `700 34px ${FONT}`; ctx.fillStyle = 'rgba(255,255,255,.6)';
      ctx.fillText('WATCH LIVE ON', W / 2, y + 30);
      y += 70;
      // rows are centred as a block, each row left-aligned inside it
      ctx.font = `700 46px ${FONT}`;
      const texts = platforms.map(p => (opts.showHandles !== false && p.handle ? p.handle : NAMES[p.platform] || p.platform));
      const blockW = Math.min(960, 110 + Math.max(...texts.map(t => ctx.measureText(t).width)));
      const x0 = (W - blockW) / 2;
      platforms.forEach((p, i) => {
        const cy = y + i * rowGap + 54;
        logo(ctx, p.platform, x0 + 44, cy, 44);
        ctx.fillStyle = '#fff'; ctx.textAlign = 'left'; ctx.textBaseline = 'middle';
        let t = texts[i];
        while (ctx.measureText(t).width > blockW - 110 && t.length > 3) t = `${t.slice(0, -2)}…`;
        ctx.fillText(t, x0 + 110, cy + 2);
      });
      ctx.textAlign = 'center'; ctx.textBaseline = 'alphabetic';
    }

    // ----- footer -----
    ctx.font = `600 34px ${FONT}`; ctx.fillStyle = 'rgba(255,255,255,.6)';
    ctx.fillText('Links below ↓', W / 2, H - 110);
    return canvas;
  }

  /** The picture as a PNG blob. */
  const blob = canvas => new Promise(r => canvas.toBlob(r, 'image/png'));

  window.MergioStatusCard = { draw, blob, W, H, THEMES: ['thumb', 'neon', 'sunset', 'ocean', 'mono'] };
})();
