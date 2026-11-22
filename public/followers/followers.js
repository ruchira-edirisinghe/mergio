/* Mergio follower goals: each platform's follower count with a goal, a progress bar and a "+3" when
   new followers come in. Counts come from Mergio (looked up every minute or so, and straight away on
   follow events where the platform sends them). */
(() => {
  'use strict';
  const C = window.MGCounter, { h } = C;
  const root = document.getElementById('root');
  const demo = C.params.get('demo') === '1';
  const GOAL_KEY = { youtube: 'goalYoutube', twitch: 'goalTwitch', kick: 'goalKick', tiktok: 'goalTiktok', facebook: 'goalFacebook', total: 'goalTotal' };

  let S = null;            // followers settings
  let data = null;         // last stats from Mergio
  let fake = null;         // sample numbers for previews and ?demo=1
  let built = '';
  const els = {};
  const shown = {};        // what each item shows now, to spot new followers

  function applySettings(all) {
    S = C.withOverrides(all.followers || {}, all.templates?.followers);
    const r = document.documentElement.style;
    r.setProperty('--font', C.font(S.font));
    r.setProperty('--fs', `${S.fontSize}px`);
    r.setProperty('--text', S.textColor);
    r.setProperty('--goal', S.goalColor);
    r.setProperty('--ink', S.ink);
    r.setProperty('--bar', S.barColor);
    built = '';
    draw();
  }

  const useFake = () => demo || (C.isPreview && !(data?.followers || []).some(f => f.count != null));

  /** Followers per platform (several channels on one platform are added up). */
  function perPlatform() {
    if (useFake()) return { ...fake };
    const out = {};
    for (const f of data?.followers || []) {
      if (f.count == null) { if (!(f.platform in out)) out[f.platform] = null; continue; }
      out[f.platform] = (out[f.platform] || 0) + f.count;
    }
    return out;
  }

  function startFake() {
    fake = { youtube: 381, twitch: 97, kick: 58, tiktok: 1182, facebook: 436 };
    setInterval(() => {
      if (!useFake()) return;
      const k = C.PLATFORMS[Math.floor(Math.random() * C.PLATFORMS.length)];
      fake[k] += 1 + Math.floor(Math.random() * 4);
      draw();
    }, 4000);
  }

  /** The goal for a count: your own goal, otherwise the next multiple of the step. Big channels get
      bigger steps (12,674,396 with a step of 100 aims for 13,000,000, not 12,674,400). */
  function goalFor(key, n) {
    const own = Number(S[GOAL_KEY[key]]) || 0;
    let step = Math.max(1, Number(S.goalStep) || 100);
    while (n / step >= 100) step *= 10;
    if (own > 0) return { goal: own, base: 0, own: true };
    const goal = (Math.floor(n / step) + 1) * step;
    return { goal, base: goal - step, own: false };
  }

  function draw() {
    if (!S) return;
    const per = perPlatform();
    const plats = C.PLATFORMS.filter(p => S[p] !== false && p in per && (!S.hideEmpty || per[p] != null));
    const items = [...plats];
    if (S.showTotal && plats.length) { items.push('total'); per.total = plats.reduce((n, p) => n + (per[p] || 0), 0); }
    const shape = [S.style, S.layout, S.align, S.showTitle, S.title, S.showNames, S.showGoal, S.showBar, S.showToGo, S.outline, S.fontSize, items.join()].join('|');
    if (shape !== built) build(items, shape);
    for (const k of items) update(k, per[k]);
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


  function update(k, n) {
    const it = els[k];
    if (!it) return;
    it.el.classList.toggle('empty', n == null);
    if (n == null) { it.cnt.textContent = '–'; it.cnt.dataset.n = ''; it.goal.textContent = ''; it.togo.textContent = ''; it.fill.style.width = '0%'; delete shown[k]; return; }
    const { goal, base } = goalFor(k, n);
    const done = n >= goal;
    it.goal.textContent = `/ ${C.fmt(goal)}`;
    it.togo.textContent = done ? 'Goal reached!' : `${C.fmt(goal - n)} to go`;
    it.el.classList.toggle('done', done);
    it.fill.style.width = `${Math.max(2, Math.min(100, ((n - base) / Math.max(1, goal - base)) * 100))}%`;
    const prev = shown[k];
    C.roll(it.cnt, n, { animate: S.animate && prev !== undefined });
    if (prev !== undefined && n > prev) {
      if (S.showPlus) { it.plus.textContent = `+${C.fmt(n - prev)}`; C.replay(it.plus, 'go'); }
      C.replay(it.el, 'hit');
      const before = goalFor(k, prev);
      if (S.celebrate && prev < before.goal && n >= before.goal) C.replay(it.el, 'win');
    }
    shown[k] = n;
  }

  /** A thick outline made of text shadows (works in OBS, unlike -webkit-text-stroke with every font). */
  function outline(el, w) {
    const s = [];
    for (let i = 0; i < 16; i++) { const a = (i / 16) * Math.PI * 2; s.push(`${(Math.cos(a) * w).toFixed(1)}px ${(Math.sin(a) * w).toFixed(1)}px 0 var(--ink)`); }
    el.style.textShadow = `${s.join(',')},0 ${(w + 2).toFixed(1)}px 0 var(--ink)`;
  }

  function build(items, shape) {
    built = shape;
    root.className = `fg st-${S.style} lay-${S.style === 'bars' && S.layout !== 'line' ? 'column' : S.layout} al-${S.align}`;
    root.textContent = '';
    for (const k of Object.keys(els)) delete els[k];
    const box = h('div', 'box');
    if (S.showTitle && S.title) box.appendChild(h('div', 'title', S.title));
    const list = h('div', 'items');
    for (const k of items) {
      const el = h('div', `it p-${k}`);
      el.style.setProperty('--pc', k === 'total' ? 'var(--bar)' : C.COLORS[k]);
      const tx = h('div', 'tx');
      if (S.showNames) tx.appendChild(h('span', 'nm', k === 'total' ? 'Total' : C.NAMES[k]));
      const cnt = h('span', 'num cnt'), goal = h('span', 'num goal');
      const top = h('div', 'top'); top.append(cnt);
      if (S.showGoal) top.appendChild(goal);
      tx.appendChild(top);
      const bar = h('div', 'bar'), fill = h('i');
      bar.appendChild(fill);
      if (S.showBar) tx.appendChild(bar);
      const togo = h('span', 'togo');
      if (S.showToGo) tx.appendChild(togo);
      const plus = h('span', 'num plus');
      el.append(C.icon(k === 'total' ? 'heart' : k, 'ic'), tx, plus);
      list.appendChild(el);
      els[k] = { el, cnt, goal, fill, togo, plus };
      if (S.outline && !['neon', 'bars'].includes(S.style)) { const w = Math.max(1.5, S.fontSize * 0.075); outline(cnt, w); outline(goal, w * 0.8); outline(plus, w * 0.8); }
      if (k in shown) { cnt.dataset.n = String(shown[k]); cnt.textContent = C.fmt(shown[k]); }
    }
    box.appendChild(list);
    root.appendChild(box);
  }

  if (demo || C.isPreview) startFake();
  C.connect('followers', { onSettings: applySettings, onStats: s => { data = s; draw(); } });
})();
