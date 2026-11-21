/* Mergio control panel: shared helpers, navigation, live updates. Pages live in /dashboard/pages/*.js
 * and register themselves with MG.page({...}). Plain JS, no build step. */
(() => {
  'use strict';
  const MG = (window.MG = {});
  const $ = (sel, root = document) => root.querySelector(sel);
  const h = (tag, attrs = {}, ...kids) => {
    const e = document.createElement(tag);
    for (const [k, v] of Object.entries(attrs || {})) {
      if (v == null || v === false) continue;
      if (k === 'class') e.className = v;
      else if (k === 'text') e.textContent = v;
      else if (k === 'style') e.style.cssText = v;
      else if (k.startsWith('on')) e.addEventListener(k.slice(2), v);
      else e.setAttribute(k, v === true ? '' : v);
    }
    for (const kid of kids.flat()) if (kid != null && kid !== false) e.append(kid.nodeType ? kid : document.createTextNode(String(kid)));
    return e;
  };
  const icon = (name, cls) => mergioIcon(name, { cls });
  Object.assign(MG, { $, h, icon });

  /* ---------------- platforms ---------------- */
  MG.PLATFORMS = [
    { id: 'youtube', name: 'YouTube', ask: 'Your YouTube channel or live video link', example: 'youtube.com/@yourname', prefix: 'yt:' },
    { id: 'twitch', name: 'Twitch', ask: 'Your Twitch username', example: 'yourname', prefix: 'twitch:' },
    { id: 'kick', name: 'Kick', ask: 'Your Kick username', example: 'yourname', prefix: 'kick:' },
    { id: 'tiktok', name: 'TikTok', ask: 'Your TikTok username', example: '@yourname', prefix: 'tiktok:' },
    { id: 'facebook', name: 'Facebook', ask: 'Your Facebook Page name or link', example: 'facebook.com/yourpage', prefix: 'fb:' },
  ];
  MG.pname = id => (MG.PLATFORMS.find(p => p.id === id) || {}).name || id;
  MG.colorIcon = p => { const s = icon(p); s.style.color = `var(--${p})`; return s; };

  /* ---------------- API & state ---------------- */
  MG.st = null;
  MG.feed = [];
  MG.overlays = { count: 0, obs: false, alerts: { count: 0, obs: false }, viewers: { count: 0, obs: false }, followers: { count: 0, obs: false } };
  MG.api = async (method, path, body) => {
    const res = await fetch(path, { method, headers: body ? { 'Content-Type': 'application/json' } : {}, body: body ? JSON.stringify(body) : undefined });
    const json = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(json.error || `Something went wrong (${res.status})`);
    return json;
  };
  /** Calls the API and replaces the state with the answer. */
  MG.update = async (method, path, body) => { MG.st = await MG.api(method, path, body); return MG.st; };

  let toastTimer;
  MG.toast = (msg, err = false) => {
    const t = $('#toast');
    t.textContent = msg; t.classList.toggle('err', err); t.classList.add('show');
    clearTimeout(toastTimer); toastTimer = setTimeout(() => t.classList.remove('show'), 2800);
  };
  MG.copy = async text => {
    try { await navigator.clipboard.writeText(text); MG.toast('Copied! Paste it into OBS.'); }
    catch { window.prompt('Copy this:', text); }
  };
  MG.test = async kind => { try { await MG.api('POST', '/api/test', { kind }); } catch (e) { MG.toast(e.message, true); } };

  const pending = {};
  let saveTimer;
  MG.save = (section, key, value) => {
    (pending[section] ||= {})[key] = value;
    MG.st.settings[section][key] = value;
    MG.refreshDeps();
    if ((section === 'appearance' || section === 'general') && !MG.st.settings.advanced.styleSeen) MG.save('advanced', 'styleSeen', true);
    clearTimeout(saveTimer);
    saveTimer = setTimeout(async () => {
      const patch = { ...pending }; for (const k of Object.keys(pending)) delete pending[k];
      try { await MG.update('PUT', '/api/settings', patch); emit('saved'); } catch (e) { MG.toast(e.message, true); }
    }, 160);
  };

  /* ---------------- events between pages ---------------- */
  const listeners = {};
  MG.on = (ev, fn) => (listeners[ev] ||= []).push(fn);
  const emit = (ev, data) => (listeners[ev] || []).forEach(fn => { try { fn(data); } catch (e) { console.error(e); } });
  MG.emit = emit;

  /* ---------------- confirm dialog (replaces the browser's confirm()) ---------------- */
  MG.confirm = ({ title, text, ok = 'OK', danger = false }) => new Promise(resolve => {
    const yes = h('button', { class: `btn ${danger ? 'danger solid' : 'primary'}`, text: ok });
    const no = h('button', { class: 'btn ghost', text: 'Cancel' });
    const dlg = h('dialog', { class: 'ask', 'aria-labelledby': 'ask-t' },
      h('h2', { id: 'ask-t', text: title }), text ? h('p', { text }) : null, h('div', { class: 'ask-btns' }, no, yes));
    let answer = false;
    yes.onclick = () => { answer = true; dlg.close(); };
    no.onclick = () => dlg.close();
    dlg.addEventListener('close', () => { dlg.remove(); resolve(answer); });
    document.body.append(dlg); dlg.showModal(); (danger ? no : yes).focus();
  });

  /* ---------------- pages & navigation ---------------- */
  const PAGES = [];
  MG.page = def => { PAGES.push(def); PAGES.sort((a, b) => a.order - b.order); };
  const GROUPS = { '': '', setup: 'Set up', custom: 'Chat & alerts', counters: 'Counters', live: 'While live', app: 'App' };
  let page = (location.hash || '#home').slice(1);
  MG.current = () => page;

  let navAt = null;
  /** A soft highlight that glides to the page you open instead of jumping. */
  function placeIndicator(nav) {
    const on = nav.querySelector('button.on');
    const ind = h('span', { class: 'nav-ind', 'aria-hidden': 'true' });
    nav.prepend(ind);
    if (!on) { ind.hidden = true; return; }
    const to = { x: on.offsetLeft, y: on.offsetTop, w: on.offsetWidth, hh: on.offsetHeight };
    const set = r => { ind.style.transform = `translate(${r.x}px, ${r.y}px)`; ind.style.width = `${r.w}px`; ind.style.height = `${r.hh}px`; };
    set(navAt && navAt.w ? navAt : to);
    if (navAt && (navAt.x !== to.x || navAt.y !== to.y)) { void ind.offsetWidth; ind.classList.add('move'); set(to); }
    navAt = to;
  }

  function renderNav() {
    const nav = $('#nav'); nav.textContent = '';
    let group = null;
    for (const p of PAGES) {
      if (p.group !== group) { group = p.group; if (GROUPS[group]) nav.append(h('div', { class: 'nav-h', text: GROUPS[group] })); }
      const b = h('button', { class: `${p.id === page ? 'on' : ''} ${p.highlight ? 'cta' : ''} ${p.highlight?.() === 'todo' ? 'todo' : ''}`.trim(), style: `--n:${PAGES.indexOf(p)}`, title: p.label, onclick: () => MG.go(p.id), 'aria-current': p.id === page ? 'page' : null },
        icon(p.icon), h('span', { class: 'lbl', text: p.label }));
      const badge = p.badge?.();
      if (badge) b.append(h('span', { class: `count ${badge.cls || ''}`, text: badge.text }));
      nav.append(b);
    }
    placeIndicator(nav);
    // on a phone the page bar scrolls sideways: keep the current page in view
    if (nav.scrollWidth > nav.clientWidth) nav.querySelector('.on')?.scrollIntoView({ inline: 'nearest', block: 'nearest' });
  }
  MG.renderNav = renderNav;
  const calm = () => matchMedia('(prefers-reduced-motion: reduce)').matches;
  /** Plays the page-change animation around a render. */
  function turnPage(fn) {
    const c = $('#content');
    const run = () => { fn(); c.scrollTop = 0; c.classList.remove('enter'); void c.offsetWidth; c.classList.add('enter'); clearTimeout(turnPage.t); turnPage.t = setTimeout(() => c.classList.remove('enter'), 1200); };
    if (calm()) return fn();
    if (document.startViewTransition) document.startViewTransition(run); else run();
  }
  MG.go = id => {
    if (id === page) { $('#content').scrollTo({ top: 0, behavior: 'smooth' }); return; }
    page = id; history.replaceState(null, '', `#${id}`);
    turnPage(MG.render);
  };
  MG.render = () => {
    const p = PAGES.find(x => x.id === page) || PAGES[0];
    if (!p) return;
    page = p.id;
    $('#pageTitle').textContent = p.title || p.label;
    $('#pageSub').textContent = p.subtitle || '';
    renderNav();
    const c = $('#content'); c.textContent = '';
    setPreviewKind(p.preview);
    document.body.dataset.page = p.id;
    p.render(c);
  };
  /** Pages for the counter overlays show that overlay in the preview instead of the chat. */
  function setPreviewKind(src) {
    document.body.dataset.preview = src ? 'counter' : 'chat';
    const f = $('#counterFrame');
    if (src && f.getAttribute('src') !== src) f.setAttribute('src', src);
    setTimeout(fitPreview, 30);
  }
  MG.refreshIf = (...ids) => { if (ids.includes(page)) MG.render(); else renderNav(); };

  /* ---------------- reusable settings controls ---------------- */
  const fmt = (f, v) => (f.unit === '%' ? `${Math.round(v * 100)}%` : `${v}${f.unit || ''}`);
  const ICON_BY_TYPE = { toggle: 'check', select: 'rows', range: 'size', number: 'hash', color: 'droplet', font: 'type', textarea: 'rows', secret: 'key' };
  MG.field = (section, f) => {
    const v = MG.st.settings[section][f.key];
    const id = `f-${section}-${f.key}`;
    const label = h('label', { for: id }, h('span', { class: 'lt' }, f.label, f.help ? MG.help(f.help) : null), f.hint ? h('span', { class: 'hint', text: f.hint }) : null);
    let ctl;
    switch (f.type) {
      case 'toggle':
        ctl = h('span', { class: 'switch' }, h('input', { type: 'checkbox', id, checked: !!v, onchange: e => { MG.save(section, f.key, e.target.checked); f.onchange?.(e.target.checked); } }), h('span'));
        break;
      case 'select': {
        const typed = x => (typeof v === 'boolean' ? String(x) === 'true' : typeof v === 'number' ? Number(x) : String(x));
        const pick = x => { MG.save(section, f.key, typed(x)); f.onchange?.(typed(x)); };
        const short = !f.dropdown && f.options.length <= 3 && f.options.every(o => String(o[1]).length <= 13);
        ctl = short ? MG.segmented({ id, value: v, options: f.options, onchange: pick, label: f.label }) : MG.dropdown({ id, value: v, options: f.options, onchange: pick, label: f.label });
        break;
      }
      case 'range': {
        const out = h('output', { text: fmt(f, v) });
        const fill = el => el.style.setProperty('--p', `${((el.value - f.min) / (f.max - f.min)) * 100}%`);
        const input = h('input', { type: 'range', id, min: f.min, max: f.max, step: f.step || 1, value: v, oninput: e => { fill(e.target); out.textContent = fmt(f, e.target.value); MG.save(section, f.key, Number(e.target.value)); } });
        fill(input);
        ctl = h('span', { class: 'range' }, input, out);
        break;
      }
      case 'number':
        ctl = h('input', { type: 'number', id, min: f.min, max: f.max, step: f.step || 1, value: v, onchange: e => MG.save(section, f.key, Number(e.target.value)) });
        break;
      case 'color': {
        const code = h('code', { text: v });
        ctl = h('span', { class: 'color' }, h('input', { type: 'color', id, value: v, oninput: e => { code.textContent = e.target.value; MG.save(section, f.key, e.target.value); } }), code);
        break;
      }
      case 'font':
        ctl = MG.combo({ id, value: v, placeholder: 'Inter', suggestions: f.suggestions || [], onchange: x => MG.save(section, f.key, x.trim()) });
        break;
      case 'textarea':
        ctl = h('textarea', { id, placeholder: f.placeholder || '', onchange: e => MG.save(section, f.key, e.target.value) }, v);
        break;
      case 'secret':
        ctl = h('input', { type: 'password', id, value: v, placeholder: f.placeholder || '', autocomplete: 'off', onchange: e => MG.save(section, f.key, e.target.value.trim()) });
        break;
      default:
        ctl = h('input', { type: 'text', id, value: v, placeholder: f.placeholder || '', onchange: e => MG.save(section, f.key, e.target.value) });
    }
    // Each setting is its own row: an icon, what it is (with a short line explaining it), and the control.
    const el = h('div', { class: `f ${f.wide ? 'wide' : ''}`, 'data-search': `${f.label} ${f.hint || ''} ${f.keywords || ''}`.toLowerCase() },
      h('span', { class: 'f-ic', 'aria-hidden': 'true' }, icon(f.icon || ICON_BY_TYPE[f.type] || 'settings')), label, h('div', { class: 'f-ctl' }, ctl));
    if (f.when) { el._when = f.when; el.classList.add('has-when'); el.classList.toggle('dep-off', !f.when(MG.st.settings)); }
    return el;
  };
  /* ---------------- themed controls: dropdown, segmented pills, font picker, (i) help ---------------- */
  let openMenu = null;
  const closeMenu = () => { if (openMenu) { const m = openMenu; openMenu = null; m.close(); } };
  document.addEventListener('pointerdown', e => { if (openMenu && !openMenu.owns(e.target)) closeMenu(); }, true);
  window.addEventListener('resize', closeMenu);
  document.addEventListener('scroll', e => { if (openMenu && !openMenu.menu.contains(e.target)) closeMenu(); }, true);

  /** A floating list under (or above) an anchor, styled like the app. items: [{ value, text, desc }] */
  function popMenu(anchor, items, current, onpick, { filter = '' } = {}) {
    closeMenu();
    const menu = h('div', { class: 'menu', role: 'listbox' });
    let active = Math.max(0, items.findIndex(it => String(it.value) === String(current)));
    const rows = items.map((it, i) => {
      const on = String(it.value) === String(current);
      const r = h('div', { class: `opt ${on ? 'on' : ''}`, role: 'option', 'aria-selected': String(on), id: `${anchor.id || 'm'}-o${i}` },
        h('span', { class: 'ot' }, h('b', { text: it.text }), it.desc ? h('small', { text: it.desc }) : null), on ? icon('check') : null);
      r.addEventListener('pointerenter', () => setActive(i));
      r.addEventListener('click', () => { onpick(it.value); closeMenu(); });
      return r;
    });
    menu.append(...rows);
    if (!rows.length) menu.append(h('div', { class: 'opt empty', text: filter ? 'No match. Press Enter to use it anyway.' : 'Nothing to pick' }));
    document.body.append(menu);
    const place = () => {
      const r = anchor.getBoundingClientRect(), vh = window.innerHeight;
      menu.style.minWidth = `${Math.max(r.width, 180)}px`;
      const below = vh - r.bottom - 12, above = r.top - 12;
      const up = below < Math.min(menu.scrollHeight, 280) && above > below;
      menu.style.maxHeight = `${Math.max(140, Math.min(320, up ? above : below))}px`;
      const w = menu.offsetWidth;
      menu.style.left = `${Math.max(8, Math.min(r.left, window.innerWidth - w - 8))}px`;
      menu.style.top = up ? `${r.top - menu.offsetHeight - 6}px` : `${r.bottom + 6}px`;
      menu.classList.toggle('up', up);
    };
    function setActive(i) {
      rows[active]?.classList.remove('act');
      active = Math.max(0, Math.min(rows.length - 1, i));
      rows[active]?.classList.add('act');
      rows[active]?.scrollIntoView({ block: 'nearest' });
      if (rows[active]) anchor.setAttribute('aria-activedescendant', rows[active].id);
    }
    place(); setActive(active);
    anchor.setAttribute('aria-expanded', 'true');
    openMenu = {
      menu,
      owns: t => menu.contains(t) || anchor.contains(t),
      close: () => { menu.remove(); anchor.setAttribute('aria-expanded', 'false'); anchor.removeAttribute('aria-activedescendant'); },
      key: e => {
        if (e.key === 'ArrowDown') { e.preventDefault(); setActive(active + 1); return true; }
        if (e.key === 'ArrowUp') { e.preventDefault(); setActive(active - 1); return true; }
        if (e.key === 'Home') { e.preventDefault(); setActive(0); return true; }
        if (e.key === 'End') { e.preventDefault(); setActive(rows.length - 1); return true; }
        if (e.key === 'Enter' && rows.length) { e.preventDefault(); onpick(items[active].value); closeMenu(); return true; }
        if (e.key === 'Escape' || e.key === 'Tab') { closeMenu(); return e.key === 'Escape'; }
        return false;
      },
    };
    return openMenu;
  }

  /** A dropdown that looks like the rest of Mergio. options: [[value, text, description?]] */
  MG.dropdown = ({ id, value, options, onchange, label }) => {
    let cur = value;
    const items = options.map(([v, text, desc]) => ({ value: v, text, desc }));
    const txt = h('span', { class: 'dd-v' });
    const show = () => { txt.textContent = (items.find(it => String(it.value) === String(cur)) || items[0] || {}).text || ''; };
    const btn = h('button', { type: 'button', class: 'dd', id, 'aria-haspopup': 'listbox', 'aria-expanded': 'false', 'aria-label': label }, txt, h('i', { class: 'dd-c' }));
    const pick = x => { cur = x; show(); onchange(x); btn.focus(); };
    btn.addEventListener('click', () => (openMenu?.owns(btn) ? closeMenu() : popMenu(btn, items, cur, pick)));
    btn.addEventListener('keydown', e => {
      if (openMenu?.owns(btn)) { openMenu.key(e); return; }
      if (['ArrowDown', 'ArrowUp', 'Enter', ' '].includes(e.key)) { e.preventDefault(); popMenu(btn, items, cur, pick); }
    });
    show();
    return btn;
  };

  /** Two or three short choices side by side. */
  MG.segmented = ({ id, value, options, onchange, label }) => {
    const wrap = h('div', { class: 'segs', id, role: 'radiogroup', 'aria-label': label });
    const btns = options.map(([v, text]) => h('button', { type: 'button', role: 'radio', 'aria-checked': String(String(v) === String(value)), class: String(v) === String(value) ? 'on' : '',
      onclick: () => { for (const b of btns) { const on = b === btn(v); b.classList.toggle('on', on); b.setAttribute('aria-checked', String(on)); } onchange(v); } }, text));
    const btn = v => btns[options.findIndex(o => String(o[0]) === String(v))];
    wrap.append(...btns);
    return wrap;
  };

  /** A text box with themed suggestions underneath (used for fonts). */
  MG.combo = ({ id, value, placeholder, suggestions, onchange }) => {
    const input = h('input', { type: 'text', id, value, placeholder, autocomplete: 'off', role: 'combobox', 'aria-expanded': 'false', 'aria-autocomplete': 'list' });
    const items = q => suggestions.filter(s => !q || s.toLowerCase().includes(q.toLowerCase())).slice(0, 60).map(s => ({ value: s, text: s }));
    const pick = x => { input.value = x; onchange(x); };
    const open = () => popMenu(input, items(input.value === value ? '' : input.value), input.value, pick, { filter: input.value });
    input.addEventListener('focus', open);
    input.addEventListener('input', () => popMenu(input, items(input.value), input.value, pick, { filter: input.value }));
    input.addEventListener('keydown', e => {
      if (openMenu?.owns(input) && openMenu.key(e)) return;
      if (e.key === 'Enter') { e.preventDefault(); onchange(input.value); closeMenu(); }
      if (e.key === 'ArrowDown' && !openMenu) open();
    });
    input.addEventListener('change', () => onchange(input.value));
    return h('span', { class: 'combo' }, input);
  };

  /** A small (i) that explains a setting in plain words. */
  MG.help = text => {
    const tip = h('span', { class: 'tip', role: 'tooltip', text });
    // keep the bubble inside the window (on a phone it would stick out on the right)
    const place = () => {
      tip.style.left = '';
      const r = tip.getBoundingClientRect(), room = document.documentElement.clientWidth - 8;
      if (r.width && r.right > room) tip.style.left = `${-10 - Math.min(r.right - room, r.left - 8)}px`;
    };
    const b = h('button', { type: 'button', class: 'info-tip', 'aria-label': `About this setting: ${text}`, onclick: e => { e.preventDefault(); e.stopPropagation(); b.classList.toggle('show'); place(); } }, icon('info'), tip);
    b.addEventListener('mouseenter', () => requestAnimationFrame(place));
    b.addEventListener('focus', () => requestAnimationFrame(place));
    b.addEventListener('blur', () => b.classList.remove('show'));
    return b;
  };

  /** Shows or hides fields that only apply when another setting is on (f.when). */
  MG.refreshDeps = () => { for (const el of document.querySelectorAll('.f.has-when')) el.classList.toggle('dep-off', !el._when(MG.st.settings)); };
  MG.fields = (section, list) => h('div', { class: 'fields' }, ...list.map(f => MG.field(section, f)));
  /** A settings row for anything that isn't a plain saved value (buttons, app switches). */
  MG.row = (ic, title, hint, control, { search = '', wide = false } = {}) =>
    h('div', { class: `f ${wide ? 'wide' : ''}`, 'data-search': `${title} ${hint || ''} ${search}`.toLowerCase() },
      h('span', { class: 'f-ic', 'aria-hidden': 'true' }, icon(ic)),
      h('label', {}, h('span', { class: 'lt' }, title), hint ? h('span', { class: 'hint', text: hint }) : null),
      h('div', { class: 'f-ctl' }, control));
  /** A small heading that splits a list of settings into named groups. */
  MG.subhead = (title, text) => h('div', { class: 'f-sub' }, h('b', { text: title }), text ? h('span', { text }) : null);
  /** A list of settings from [section, field] pairs, with { sub: 'Heading' } entries in between. */
  MG.fieldList = items => h('div', { class: 'fields' }, ...items.map(it => (Array.isArray(it) ? MG.field(it[0], it[1]) : MG.subhead(it.sub, it.text))));
  MG.card = (title, sub, ...body) => h('section', { class: 'card' }, title ? h('h2', {}, title) : null, sub ? h('p', { class: 'sub', text: sub }) : null, ...body);

  /* ---------------- friendly status text for a chat ---------------- */
  MG.describe = s => {
    const d = s.detail || '';
    if (s.enabled === false) return { tone: 'idle', label: 'Paused', text: 'Not reading this chat. Press Resume to continue.' };
    if (s.state === 'live') return { tone: 'live', label: 'Connected', text: 'Reading chat' };
    if (s.state === 'connecting') return { tone: 'waiting', label: 'Connecting…', text: 'This takes a few seconds' };
    if (s.state === 'waiting' || /room id|offline|not live|isn.t live|ended|no live/i.test(d))
      return { tone: 'waiting', label: 'Waiting for you to go live', text: 'Connects by itself as soon as the stream starts' };
    if (/rate.?limit|429|too many/i.test(d)) return { tone: 'error', label: 'Busy, retrying', text: 'TikTok is limiting connections. A free key in Settings → Accounts removes the limit.', fix: 'settings' };
    if (/token/i.test(d)) return { tone: 'error', label: 'Needs a token', text: 'Facebook only shares comments with a Page token. Add it in Settings → Accounts.', fix: 'settings' };
    if (/not found|404|does not exist|doesn.t exist|unknown channel/i.test(d)) return { tone: 'error', label: "Can't find this channel", text: 'Check the name or link, then remove it and add it again.' };
    if (s.state === 'error') return { tone: 'error', label: 'Having trouble', text: d ? `${d.replace(/\.+$/, '')}. Mergio keeps retrying.` : 'Mergio keeps retrying by itself.' };
    return { tone: 'idle', label: s.state, text: d };
  };

  /* ---------------- preview pane ---------------- */
  function fitPreview() {
    const stage = $('#stage'), frame = $('#previewFrame');
    if (!stage || !frame || !stage.clientWidth) return;
    const scale = Math.min(1, stage.clientWidth / 500);
    frame.style.transform = `scale(${scale})`;
    frame.style.height = `${stage.clientHeight / scale}px`;
    const alerts = $('#alertsFrame'); // the alerts overlay floats over the top of the preview
    if (alerts) alerts.style.transform = `scale(${Math.min(1, stage.clientWidth / 800)})`;
    const counter = $('#counterFrame'); // counters are drawn 560 wide and scaled to fit
    if (counter) { const k = Math.min(1, stage.clientWidth / 560); counter.style.transform = `scale(${k})`; counter.style.height = `${stage.clientHeight / k}px`; }
  }
  window.addEventListener('resize', fitPreview);
  const store = { get: k => { try { return localStorage.getItem(k); } catch { return null; } }, set: (k, v) => { try { localStorage.setItem(k, v); } catch { /* private mode */ } } };
  MG.store = store;
  /** The sidebar can shrink to just its icons (remembered on this computer). */
  function setSideMin(min, animate = true, remember = true) {
    document.body.classList.toggle('side-anim', animate && !calm());
    document.body.classList.toggle('side-min', min);
    const b = $('#btnSide');
    b.setAttribute('aria-expanded', String(!min));
    b.title = min ? 'Expand the sidebar' : 'Shrink the sidebar';
    b.setAttribute('aria-label', b.title);
    if (remember) store.set('mg-side', min ? 'min' : 'full');
    navAt = null;
    setTimeout(() => { renderNav(); fitPreview(); }, animate ? 260 : 0);
  }
  function setPreview(open) {
    document.body.classList.toggle('no-preview', !open);
    $('#btnPreview').hidden = open; // when it's open, the × in the preview closes it
    store.set('mg-preview', open ? '1' : '0');
    setTimeout(fitPreview, 60);
  }

  /** Settings changed somewhere else (another open control panel, an OBS dock): show them here too.
      Our own saves come back unchanged, so they never redraw the page while you drag a slider. */
  function syncSettings(incoming) {
    if (Object.keys(pending).length) return; // our own change is about to be saved
    let changed = false;
    for (const [sec, vals] of Object.entries(incoming || {})) {
      if (!Object.hasOwn(MG.st.settings, sec) || JSON.stringify(MG.st.settings[sec]) === JSON.stringify(vals)) continue;
      MG.st.settings[sec] = { ...MG.st.settings[sec], ...vals };
      changed = true;
    }
    if (changed && !document.activeElement?.closest('input, textarea, select')) MG.render();
  }

  /* ---------------- live updates ---------------- */
  function connectWs() {
    const ws = new WebSocket(`ws://${location.host}/ws?client=panel`);
    ws.onopen = () => document.body.classList.remove('offline');
    ws.onmessage = e => {
      const d = JSON.parse(e.data);
      if (d.op === 'hello') { MG.feed = d.recent || []; if (d.stats) MG.st.stats = d.stats; emit('feed'); emit('stats', MG.st.stats); }
      if (d.op === 'sources') { MG.st.sources = d.sources; emit('sources'); renderNav(); updateSummary(); }
      if (d.op === 'msg') {
        const i = MG.feed.findIndex(x => x.id === d.msg.id);
        if (i >= 0) MG.feed[i] = d.msg; else { MG.feed.push(d.msg); if (MG.feed.length > 400) MG.feed.shift(); }
        emit('msg', { msg: d.msg, updated: i >= 0 });
      }
      if (d.op === 'clear') { MG.feed = []; emit('feed'); }
      if (d.op === 'settings') syncSettings(d.settings);
      if (d.op === 'update') emit('update', d.update);
      if (d.op === 'stats') { MG.st.stats = d.stats; emit('stats', d.stats); }
      if (d.op === 'overlays') { MG.overlays = { count: d.count, obs: d.obs, alerts: d.alerts || { count: 0, obs: false }, viewers: d.viewers || { count: 0, obs: false }, followers: d.followers || { count: 0, obs: false } }; if (d.count) MG.st.settings.advanced.overlaySeen = true; emit('overlays'); renderNav(); }
    };
    ws.onclose = () => {
      document.body.classList.add('offline');
      setTimeout(async () => { connectWs(); try { await MG.update('GET', '/api/state'); MG.overlays = MG.st.overlays || MG.overlays; MG.render(); updateSummary(); } catch { /* still closed */ } }, 2000);
    };
  }

  function updateSummary() {
    const src = MG.st.sources;
    const live = src.filter(s => s.state === 'live' && s.enabled !== false).length;
    const el = $('#liveSum'); el.textContent = '';
    const cls = !src.length ? '' : live ? 'live' : 'waiting';
    el.append(h('span', { class: `dot ${cls}` }), h('span', { text: !src.length ? 'No chats added yet' : `${live} of ${src.length} chat${src.length > 1 ? 's' : ''} connected` }));
  }
  MG.updateSummary = updateSummary;

  /* ---------------- boot ---------------- */
  async function boot() {
    await MG.update('GET', '/api/state');
    MG.overlays = MG.st.overlays || MG.overlays;
    $('#version').textContent = `v${MG.st.version}`;
    const bg = $('#btnGuide'); bg.append(icon('help'), h('span', { text: 'Guide' })); bg.onclick = () => MG.openGuide?.();
    const bt = $('#btnTest'); bt.append(icon('sparkle'), h('span', { text: 'Send test' })); bt.onclick = () => { MG.test('burst'); MG.toast('Sample messages sent to the overlay'); };
    // takes you to Add to OBS, where every overlay has its link, its size and the steps
    const bc = $('#btnCopy'); bc.append(icon('monitor'), h('span', { text: 'Add to OBS' })); bc.onclick = () => MG.go('obs');
    const bp = $('#btnPreview'); bp.append(icon('eye'), h('span', { text: 'Show preview' })); bp.onclick = () => setPreview(document.body.classList.contains('no-preview'));
    $('#btnPreviewClose').append(icon('plus')); $('#btnPreviewClose').onclick = () => setPreview(false);
    const bs = $('#btnSide'); bs.append(icon('sidebar')); bs.onclick = () => setSideMin(!document.body.classList.contains('side-min'));
    // Until you choose, the sidebar shows just its icons on smaller laptop screens to leave room for the settings.
    const sideAuto = () => innerWidth > 1020 && innerWidth <= 1280;
    const sidePref = store.get('mg-side');
    setSideMin(sidePref ? sidePref === 'min' : sideAuto(), false, false);
    if (!sidePref) window.addEventListener('resize', () => { if (!store.get('mg-side') && document.body.classList.contains('side-min') !== sideAuto()) setSideMin(sideAuto(), false, false); });
    for (const b of document.querySelectorAll('[data-test]')) b.onclick = () => MG.test(b.dataset.test);
    for (const b of document.querySelectorAll('#bgSeg button')) b.onclick = () => {
      document.querySelectorAll('#bgSeg button').forEach(x => x.classList.toggle('on', x === b));
      $('#stage').className = `stage bg-${b.dataset.bg}`;
    };
    window.addEventListener('hashchange', () => { page = (location.hash || '#home').slice(1); turnPage(MG.render); });
    setPreview(store.get('mg-preview') !== '0' && window.innerWidth > 1020);
    MG.render(); updateSummary(); connectWs(); fitPreview();
    await reveal();
    emit('ready');
  }

  /** Lets the logo finish drawing, then lifts the splash and slides the panel in. */
  async function reveal() {
    const boot = $('#boot');
    if (!boot) return;
    let seen = false;
    try { seen = sessionStorage.getItem('mg-booted') === '1'; sessionStorage.setItem('mg-booted', '1'); } catch { /* private mode */ }
    if (seen) boot.classList.add('quick');
    const wait = calm() ? 0 : Math.max(0, (seen ? 350 : 1500) - performance.now());
    await new Promise(r => setTimeout(r, wait));
    document.body.classList.add('entering');
    $('#content').classList.add('enter');
    boot.classList.add('done');
    setTimeout(() => { boot.remove(); document.body.classList.remove('entering'); $('#content').classList.remove('enter'); }, calm() ? 0 : 1300);
  }
  // Page scripts load after this file; start once they've all registered.
  document.addEventListener('DOMContentLoaded', () => boot().catch(e => { document.body.classList.remove('entering'); document.body.textContent = `Could not load Mergio: ${e.message}`; }));
})();
