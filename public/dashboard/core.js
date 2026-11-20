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
    { id: 'facebook', name: 'Facebook', ask: 'Your Facebook live video link', example: 'facebook.com/yourpage/videos/123…', prefix: '' },
  ];
  MG.pname = id => (MG.PLATFORMS.find(p => p.id === id) || {}).name || id;
  MG.colorIcon = p => { const s = icon(p); s.style.color = `var(--${p})`; return s; };

  /* ---------------- API & state ---------------- */
  MG.st = null;
  MG.feed = [];
  MG.overlays = { count: 0, obs: false, alerts: { count: 0, obs: false } };
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
  const GROUPS = { '': '', setup: 'Set up', custom: 'Customize', live: 'While live', app: 'App' };
  let page = (location.hash || '#home').slice(1);
  MG.current = () => page;

  function renderNav() {
    const nav = $('#nav'); nav.textContent = '';
    let group = null;
    for (const p of PAGES) {
      if (p.group !== group) { group = p.group; if (GROUPS[group]) nav.append(h('div', { class: 'nav-h', text: GROUPS[group] })); }
      const b = h('button', { class: p.id === page ? 'on' : '', onclick: () => MG.go(p.id), 'aria-current': p.id === page ? 'page' : null },
        icon(p.icon), h('span', { class: 'lbl', text: p.label }));
      const badge = p.badge?.();
      if (badge) b.append(h('span', { class: `count ${badge.cls || ''}`, text: badge.text }));
      nav.append(b);
    }
  }
  MG.renderNav = renderNav;
  MG.go = id => { page = id; history.replaceState(null, '', `#${id}`); MG.render(); $('#content').scrollTop = 0; };
  MG.render = () => {
    const p = PAGES.find(x => x.id === page) || PAGES[0];
    if (!p) return;
    page = p.id;
    $('#pageTitle').textContent = p.title || p.label;
    $('#pageSub').textContent = p.subtitle || '';
    renderNav();
    const c = $('#content'); c.textContent = '';
    p.render(c);
  };
  MG.refreshIf = (...ids) => { if (ids.includes(page)) MG.render(); else renderNav(); };

  /* ---------------- reusable settings controls ---------------- */
  const fmt = (f, v) => (f.unit === '%' ? `${Math.round(v * 100)}%` : `${v}${f.unit || ''}`);
  MG.field = (section, f) => {
    const v = MG.st.settings[section][f.key];
    const id = `f-${section}-${f.key}`;
    const label = h('label', { for: id }, f.label, f.hint ? h('span', { class: 'hint', text: f.hint }) : null);
    let ctl;
    switch (f.type) {
      case 'toggle':
        ctl = h('span', { class: 'switch' }, h('input', { type: 'checkbox', id, checked: !!v, onchange: e => { MG.save(section, f.key, e.target.checked); f.onchange?.(e.target.checked); } }), h('span'));
        break;
      case 'select':
        ctl = h('select', { id, onchange: e => MG.save(section, f.key, e.target.value) }, ...f.options.map(([val, txt]) => h('option', { value: val, selected: String(v) === String(val), text: txt })));
        break;
      case 'range': {
        const out = h('output', { text: fmt(f, v) });
        ctl = h('span', { class: 'range' }, h('input', { type: 'range', id, min: f.min, max: f.max, step: f.step || 1, value: v, oninput: e => { out.textContent = fmt(f, e.target.value); MG.save(section, f.key, Number(e.target.value)); } }), out);
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
        ctl = h('input', { type: 'text', id, list: 'fontlist', value: v, placeholder: 'Inter', onchange: e => MG.save(section, f.key, e.target.value.trim()) });
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
    const el = h('div', { class: `f ${f.wide ? 'wide' : ''}`, 'data-search': `${f.label} ${f.hint || ''} ${f.keywords || ''}`.toLowerCase() }, label, ctl);
    if (f.when) { el._when = f.when; el.classList.add('has-when'); el.classList.toggle('dep-off', !f.when(MG.st.settings)); }
    return el;
  };
  /** Shows or hides fields that only apply when another setting is on (f.when). */
  MG.refreshDeps = () => { for (const el of document.querySelectorAll('.f.has-when')) el.classList.toggle('dep-off', !el._when(MG.st.settings)); };
  MG.fields = (section, list) => h('div', { class: 'fields' }, ...list.map(f => MG.field(section, f)));
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
  }
  window.addEventListener('resize', fitPreview);
  const store = { get: k => { try { return localStorage.getItem(k); } catch { return null; } }, set: (k, v) => { try { localStorage.setItem(k, v); } catch { /* private mode */ } } };
  MG.store = store;
  function setPreview(open) {
    document.body.classList.toggle('no-preview', !open);
    $('#btnPreview').hidden = open; // when it's open, the × in the preview closes it
    store.set('mg-preview', open ? '1' : '0');
    setTimeout(fitPreview, 60);
  }

  /* ---------------- live updates ---------------- */
  function connectWs() {
    const ws = new WebSocket(`ws://${location.host}/ws?client=panel`);
    ws.onopen = () => document.body.classList.remove('offline');
    ws.onmessage = e => {
      const d = JSON.parse(e.data);
      if (d.op === 'hello') { MG.feed = d.recent || []; emit('feed'); }
      if (d.op === 'sources') { MG.st.sources = d.sources; emit('sources'); renderNav(); updateSummary(); }
      if (d.op === 'msg') {
        const i = MG.feed.findIndex(x => x.id === d.msg.id);
        if (i >= 0) MG.feed[i] = d.msg; else { MG.feed.push(d.msg); if (MG.feed.length > 400) MG.feed.shift(); }
        emit('msg', { msg: d.msg, updated: i >= 0 });
      }
      if (d.op === 'clear') { MG.feed = []; emit('feed'); }
      if (d.op === 'overlays') { MG.overlays = { count: d.count, obs: d.obs, alerts: d.alerts || { count: 0, obs: false } }; if (d.count) MG.st.settings.advanced.overlaySeen = true; emit('overlays'); renderNav(); }
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
    const bc = $('#btnCopy'); bc.append(icon('copy'), h('span', { text: 'Copy overlay link' })); bc.onclick = () => MG.copy(MG.st.overlayUrl);
    const bp = $('#btnPreview'); bp.append(icon('eye'), h('span', { text: 'Show preview' })); bp.onclick = () => setPreview(document.body.classList.contains('no-preview'));
    $('#btnPreviewClose').append(icon('plus')); $('#btnPreviewClose').onclick = () => setPreview(false);
    for (const b of document.querySelectorAll('[data-test]')) b.onclick = () => MG.test(b.dataset.test);
    for (const b of document.querySelectorAll('#bgSeg button')) b.onclick = () => {
      document.querySelectorAll('#bgSeg button').forEach(x => x.classList.toggle('on', x === b));
      $('#stage').className = `stage bg-${b.dataset.bg}`;
    };
    window.addEventListener('hashchange', () => { page = (location.hash || '#home').slice(1); MG.render(); });
    setPreview(store.get('mg-preview') !== '0' && window.innerWidth > 1020);
    MG.render(); updateSummary(); connectWs(); fitPreview();
    emit('ready');
  }
  // Page scripts load after this file; start once they've all registered.
  document.addEventListener('DOMContentLoaded', () => boot().catch(e => { document.body.textContent = `Could not load Mergio: ${e.message}`; }));
})();
