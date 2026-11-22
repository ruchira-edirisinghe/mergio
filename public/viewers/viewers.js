/* Mergio viewer count: everyone watching right now, all platforms together, and each platform on its own. */
(() => {
  'use strict';
  const C = window.MGCounter, { h } = C;
  const root = document.getElementById('root');
  const demo = C.params.get('demo') === '1';

  let S = null;            // viewers settings
  let data = null;         // last stats from Mergio
  let fake = null;         // sample numbers for the preview and ?demo=1
  let built = '';          // the structure currently drawn (rebuilt only when it changes)
  const els = {};

  function applySettings(all) {
    S = C.withOverrides(all.viewers || {}, all.templates?.viewers);
    const r = document.documentElement.style;
    r.setProperty('--font', C.font(S.font));
    r.setProperty('--fs', `${S.fontSize}px`);
    r.setProperty('--text', S.textColor);
    r.setProperty('--accent', S.accent);
    r.setProperty('--bg', C.hexA(S.background, S.bgOpacity));
    built = '';
    draw();
  }

  /** Viewers per platform (several chats on one platform are added up). */
  function perPlatform() {
    if (useFake()) return fake;
    const out = {};
    for (const v of data?.viewers || []) {
      if (v.count == null) { if (!(v.platform in out)) out[v.platform] = null; continue; }
      out[v.platform] = (out[v.platform] || 0) + v.count;
    }
    return out;
  }
  const useFake = () => demo || (C.isPreview && !(data?.viewers || []).some(v => v.count != null));

  function startFake() {
    fake = { youtube: 412, twitch: 186, kick: 74, tiktok: 538, facebook: 41 };
    setInterval(() => {
      if (!useFake()) return;
      for (const k of Object.keys(fake)) fake[k] = Math.max(3, fake[k] + Math.round((Math.random() - 0.42) * fake[k] * 0.06));
      draw();
    }, 2600);
  }

  function draw() {
    if (!S) return;
    const per = perPlatform();
    // every platform that is there (for the total), and the ones that get their own number
    const all = C.PLATFORMS.filter(p => p in per && (!S.hideOffline || per[p] != null));
    const plats = all.filter(p => S[p] !== false);
    const live = all.some(p => per[p] != null);
    const total = (S.totalAll ? all : plats).reduce((n, p) => n + (per[p] || 0), 0);
    const fmt = S.numberFormat === 'short' ? C.short : C.fmt;
    const shape = [S.style, S.layout, S.align, S.showTotal, S.showPlatforms, S.showNames, S.showLiveDot, S.showShare, S.totalLabel, plats.join()].join('|');
    if (shape !== built) build(plats, shape);
    root.classList.toggle('offline', !live);
    if (els.total) C.roll(els.total, total, { animate: S.animate, format: fmt });
    for (const p of plats) {
      const n = per[p];
      const row = els[p];
      if (!row) continue;
      row.el.classList.toggle('off', n == null);
      if (n == null) { row.num.textContent = '–'; row.num.dataset.n = ''; }
      else {
        const before = Number(row.num.dataset.n);
        C.roll(row.num, n, { animate: S.animate, format: fmt });
        if (Number.isFinite(before) && before !== n) C.replay(row.el, n > before ? 'up' : 'down');
      }
      if (row.seg) row.seg.style.flexGrow = String(n || 0);
    }
    if (els.share) els.share.hidden = !total;
    fitLine();
  }

  /** "All in one line": when the line is wider than the browser source, shrink it to fit instead of wrapping. */
  function fitLine() {
    const box = root.querySelector('.box');
    if (!box) return;
    if (sizeWatch && watched !== box) { sizeWatch.disconnect(); sizeWatch.observe(root); sizeWatch.observe(box); watched = box; }
    box.style.transform = '';
    if (S.layout !== 'line') return;
    const cs = getComputedStyle(root);
    const room = root.clientWidth - parseFloat(cs.paddingLeft) - parseFloat(cs.paddingRight);
    const w = box.offsetWidth;
    if (w > room && room > 0) {
      box.style.transformOrigin = S.align === 'center' ? 'center' : S.align === 'right' ? 'right center' : 'left center';
      box.style.transform = `scale(${room / w})`;
    }
  }
  addEventListener('resize', () => S && fitLine());
  // numbers count up and fonts load after the first draw, so fit again whenever the line changes size
  const sizeWatch = window.ResizeObserver ? new ResizeObserver(() => S && fitLine()) : null;
  let watched = null;
  document.fonts && document.fonts.ready.then(() => S && fitLine());


  function build(plats, shape) {
    built = shape;
    root.className = `vw st-${S.style} lay-${S.layout} al-${S.align}`;
    root.textContent = '';
    for (const k of Object.keys(els)) delete els[k];

    const box = h('div', 'box');
    if (S.showTotal) {
      const t = h('div', 'total');
      if (S.showLiveDot) t.appendChild(h('span', 'live', S.style === 'broadcast' ? 'LIVE' : ''));
      const ic = C.icon('eye', 'eye');
      els.total = h('span', 'num');
      t.append(ic, els.total);
      if (S.totalLabel) t.appendChild(h('span', 'lbl', S.totalLabel));
      box.appendChild(t);
    }
    if (S.showShare && S.showPlatforms && plats.length > 1 && ['glass', 'neon', 'broadcast'].includes(S.style)) {
      els.share = h('div', 'share');
      for (const p of plats) { const seg = h('i', `seg p-${p}`); seg.style.background = C.COLORS[p]; els.share.appendChild(seg); (els[p] ||= {}).seg = seg; }
      box.appendChild(els.share);
    }
    if (S.showPlatforms && plats.length) {
      const list = h('div', 'plats');
      for (const p of plats) {
        const el = h('div', `pl p-${p}`);
        el.style.setProperty('--pc', C.COLORS[p]);
        const num = h('span', 'num');
        el.append(C.icon(p, 'ic'));
        if (S.showNames) el.appendChild(h('span', 'nm', C.NAMES[p]));
        el.appendChild(num);
        list.appendChild(el);
        Object.assign((els[p] ||= {}), { el, num });
      }
      box.appendChild(list);
    }
    root.appendChild(box);
  }

  if (demo || C.isPreview) startFake();
  C.connect('viewers', { onSettings: applySettings, onStats: s => { data = s; draw(); } });
})();
