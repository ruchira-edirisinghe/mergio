/* OmniChat dashboard (control panel). Plain JS, no build step. */
(() => {
  'use strict';
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
  const icon = (name, cls) => omniIcon(name, { cls });

  let st = null;               // full state from /api/state
  let feed = [];               // live feed messages
  const feedOff = new Set();   // platforms hidden in the feed
  let page = (location.hash || '#connections').slice(1);

  /* ---------------- API ---------------- */
  async function api(method, path, body) {
    const res = await fetch(path, { method, headers: body ? { 'Content-Type': 'application/json' } : {}, body: body ? JSON.stringify(body) : undefined });
    const json = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(json.error || `Request failed (${res.status})`);
    return json;
  }
  let toastTimer;
  function toast(msg, err = false) {
    const t = $('#toast');
    t.textContent = msg; t.classList.toggle('err', err); t.classList.add('show');
    clearTimeout(toastTimer); toastTimer = setTimeout(() => t.classList.remove('show'), 2600);
  }

  const pending = {};
  let saveTimer;
  function save(section, key, value) {
    (pending[section] ||= {})[key] = value;
    st.settings[section][key] = value;
    clearTimeout(saveTimer);
    saveTimer = setTimeout(async () => {
      const patch = { ...pending }; for (const k of Object.keys(pending)) delete pending[k];
      try { st = await api('PUT', '/api/settings', patch); } catch (e) { toast(e.message, true); }
    }, 160);
  }

  /* ---------------- pages ---------------- */
  const PAGES = [
    { id: 'connections', label: 'Connections', icon: 'link', render: renderConnections },
    { id: 'feed', label: 'Live chat', icon: 'chat', render: renderFeed },
    { id: 'appearance', label: 'Appearance', icon: 'sun', render: renderAppearance },
    { id: 'behavior', label: 'Behavior', icon: 'settings', render: renderBehavior },
    { id: 'events', label: 'Events & alerts', icon: 'gift', render: renderEvents },
    { id: 'obs', label: 'Add to OBS', icon: 'eye', render: renderObs },
    { id: 'advanced', label: 'Advanced', icon: 'bolt', render: renderAdvanced },
    { id: 'help', label: 'Help', icon: 'help', render: renderHelp },
  ];

  function renderNav() {
    const nav = $('#nav'); nav.textContent = '';
    for (const p of PAGES) {
      const b = h('button', { class: p.id === page ? 'on' : '', onclick: () => go(p.id), 'aria-current': p.id === page ? 'page' : null },
        icon(p.icon), h('span', { class: 'lbl', text: p.label }));
      if (p.id === 'connections' && st?.sources.length) b.append(h('span', { class: 'count', text: st.sources.length }));
      nav.append(b);
    }
  }
  function go(id) { page = id; history.replaceState(null, '', `#${id}`); render(); }
  function render() {
    const p = PAGES.find(x => x.id === page) || PAGES[0];
    $('#pageTitle').textContent = p.label;
    renderNav();
    const c = $('#content'); c.textContent = '';
    p.render(c);
  }

  /* ---------------- connections ---------------- */
  const EXAMPLES = {
    youtube: 'youtube.com/watch?v=… or youtube.com/@channel',
    twitch: 'twitch.tv/yourname',
    kick: 'kick.com/yourname',
    tiktok: 'tiktok.com/@yourname/live',
    facebook: 'facebook.com/…/videos/1234567890 (needs a token, see Advanced)',
  };
  function guessPlatform(v) {
    v = v.toLowerCase();
    if (/youtu\.?be|^yt:/.test(v)) return 'youtube';
    if (/twitch\.tv|^tw(itch)?:/.test(v)) return 'twitch';
    if (/kick\.com|^kick:/.test(v)) return 'kick';
    if (/tiktok\.com|^t(iktok|t):/.test(v)) return 'tiktok';
    if (/facebook\.com|fb\.watch|^fb:/.test(v)) return 'facebook';
    return null;
  }

  function renderConnections(c) {
    const input = h('input', { type: 'text', placeholder: 'Paste your live stream link here and press Enter…', autocomplete: 'off', spellcheck: 'false', 'aria-label': 'Live stream link' });
    const det = h('span', { class: 'det' }, icon('link'));
    const err = h('div', { class: 'form-err', role: 'alert' });
    const btn = h('button', { class: 'btn primary' }, icon('plus'), 'Connect');
    input.addEventListener('input', () => {
      const p = guessPlatform(input.value);
      det.textContent = ''; det.append(icon(p || 'link')); det.style.color = p ? `var(--${p})` : '';
      err.textContent = '';
    });
    const submit = async () => {
      if (!input.value.trim()) { input.focus(); return; }
      btn.disabled = true;
      try { st = await api('POST', '/api/sources', { input: input.value }); input.value = ''; input.dispatchEvent(new Event('input')); toast('Connected! Messages will appear as soon as chat moves.'); render(); }
      catch (e) { err.textContent = e.message; }
      finally { btn.disabled = false; }
    };
    input.addEventListener('keydown', e => { if (e.key === 'Enter') submit(); });
    btn.addEventListener('click', submit);

    const plats = h('div', { class: 'plats' }, ...Object.keys(EXAMPLES).map(p =>
      h('span', { class: 'plat-chip', title: EXAMPLES[p], style: `--pc: var(--${p})` }, colorIcon(p), cap(p))));

    c.append(h('section', { class: 'card hero' },
      h('h2', { text: 'Bring every chat into one overlay' }),
      h('p', { class: 'sub', text: 'Paste the link of a live stream (or a channel) from YouTube, Twitch, Kick, TikTok or Facebook. You can add as many as you like; they all merge into one overlay.' }),
      h('div', { class: 'connect' }, h('div', { class: 'field' }, det, input), btn),
      err, plats));

    const list = h('section', { class: 'card' }, h('h2', { text: 'Your chats' }),
      h('p', { class: 'sub', text: 'Each connection reconnects by itself. Channel links wait for you to go live and connect automatically.' }));
    const wrap = h('div', { class: 'sources', id: 'sources' });
    list.append(wrap);
    c.append(list);
    fillSources(wrap);
    setTimeout(() => input.focus(), 50);
  }

  function colorIcon(p) { const s = icon(p); s.style.color = `var(--${p})`; return s; }
  const NAMES = { youtube: 'YouTube', twitch: 'Twitch', kick: 'Kick', tiktok: 'TikTok', facebook: 'Facebook' };
  const cap = s => NAMES[s] || s[0].toUpperCase() + s.slice(1);

  /** The preview shows the overlay at its real OBS width (500px) scaled down to fit the pane. */
  function fitPreview() {
    const stage = $('#stage'), frame = $('#previewFrame');
    if (!stage || !frame) return;
    const scale = Math.min(1, stage.clientWidth / 500);
    frame.style.transform = `scale(${scale})`;
    frame.style.height = `${stage.clientHeight / scale}px`;
  }
  window.addEventListener('resize', fitPreview);
  const STATE_TEXT = { live: 'Connected', connecting: 'Connecting', waiting: 'Waiting', error: 'Problem', paused: 'Paused', idle: 'Idle', stopped: 'Stopped' };

  function fillSources(wrap = $('#sources')) {
    if (!wrap) return;
    wrap.textContent = '';
    if (!st.sources.length) {
      wrap.append(h('div', { class: 'empty' },
        h('b', { text: 'No chats connected yet' }),
        h('ol', {}, h('li', { text: 'Copy the link of your live stream (or channel page).' }), h('li', { text: 'Paste it in the box above and press Enter.' }), h('li', {}, 'Open ', h('a', { href: '#obs', onclick: e => { e.preventDefault(); go('obs'); } }, 'Add to OBS'), ' and add the overlay as a Browser Source.'))));
      return;
    }
    for (const s of st.sources) {
      const paused = s.enabled === false;
      wrap.append(h('div', { class: 'src', style: `--pc: var(--${s.platform})` },
        h('div', { class: 'logo' }, icon(s.platform)),
        h('div', { style: 'min-width:0' },
          h('div', { class: 'nm' }, s.channel || s.label, h('span', { class: 'pill-n', title: 'Messages received this session', text: `${s.count} msgs` })),
          h('div', { class: 'meta' }, h('span', { class: `dot ${s.state}` }), h('b', { text: STATE_TEXT[s.state] || s.state }), h('span', { class: 'd', title: s.detail, text: s.detail ? `· ${s.detail}` : '' }))),
        h('div', { class: 'acts' },
          h('button', { class: 'icon-btn', title: paused ? 'Resume' : 'Pause', onclick: async () => { st = await api('POST', `/api/sources/${s.id}/enabled`, { enabled: paused }); fillSources(); updateSummary(); } }, icon(paused ? 'play' : 'pause')),
          h('button', { class: 'icon-btn', title: 'Reconnect', onclick: async () => { st = await api('POST', `/api/sources/${s.id}/reconnect`, {}); toast('Reconnecting…'); } }, icon('refresh')),
          h('button', { class: 'icon-btn', title: 'Remove', onclick: async () => { if (!confirm(`Remove ${s.channel || s.label} (${s.platform})?`)) return; st = await api('DELETE', `/api/sources/${s.id}`); render(); updateSummary(); } }, icon('trash')))));
    }
  }

  function updateSummary() {
    const live = st.sources.filter(s => s.state === 'live').length;
    const bad = st.sources.filter(s => s.state === 'error').length;
    const el = $('#liveSum'); el.textContent = '';
    const cls = !st.sources.length ? '' : bad ? 'error' : live ? 'live' : 'waiting';
    el.append(h('span', { class: `dot ${cls}` }), h('span', { text: !st.sources.length ? 'No chats connected' : `${live} of ${st.sources.length} chats connected${bad ? ` · ${bad} need attention` : ''}` }));
  }

  /* ---------------- live feed ---------------- */
  function renderFeed(c) {
    const tools = h('div', { class: 'feed-tools' },
      ...['twitch', 'youtube', 'kick', 'tiktok', 'facebook'].map(p => h('button', { class: `chip ${feedOff.has(p) ? 'off' : ''}`, style: `--pc: var(--${p})`, onclick: e => { feedOff.has(p) ? feedOff.delete(p) : feedOff.add(p); e.currentTarget.classList.toggle('off'); fillFeed(); } }, icon(p), cap(p))),
      h('span', { style: 'flex:1' }),
      h('button', { class: 'btn sm ghost', onclick: async () => { await api('POST', '/api/clear', {}); feed = []; fillFeed(); toast('Overlay and feed cleared'); } }, icon('trash'), 'Clear'));
    c.append(h('section', { class: 'card' }, h('h2', { text: 'Every chat in one place' }),
      h('p', { class: 'sub', text: 'Read all your chats here while streaming (this list is not filtered by overlay settings).' }), tools, h('div', { class: 'feed', id: 'feed' })));
    fillFeed();
  }
  function feedItem(m) {
    const t = h('div', { class: 't' });
    const nm = h('b', { text: m.user.name }); nm.style.color = m.user.color || 'var(--text)';
    t.append(nm);
    if (m.event && m.type !== 'chat') { const ev = h('span', { class: 'ev', text: `${m.event.title || ''}${m.event.amount ? ` · ${m.event.amount}` : ''}` }); if (m.event.color) ev.style.setProperty('--evc', m.event.color); t.append(ev); }
    for (const p of m.parts || []) {
      if ((p.type === 'emote' || p.type === 'cheer') && /^https:\/\//.test(p.url)) t.append(h('img', { class: 'e', src: p.url, alt: p.name, title: p.name, referrerpolicy: 'no-referrer' }));
      else t.append(p.text || p.name || '');
    }
    const av = h('img', { src: /^(https:\/\/|\/avatar\/)/.test(m.user.avatar) ? m.user.avatar : `/avatar/default/${encodeURIComponent(m.user.name)}`, alt: '', loading: 'lazy', referrerpolicy: 'no-referrer' });
    return h('div', { class: 'fi', style: `--pc: var(--${m.platform})` }, h('span', { class: 'p' }, icon(m.platform)), av, t,
      h('time', { text: new Date(m.time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) }));
  }
  function fillFeed() {
    const el = $('#feed'); if (!el) return;
    el.textContent = '';
    const items = feed.filter(m => !feedOff.has(m.platform)).slice(-200);
    if (!items.length) { el.append(h('div', { class: 'empty', text: 'Waiting for messages… Connect a chat or press "Test" at the top.' })); return; }
    for (const m of items) el.append(feedItem(m));
    el.scrollTop = el.scrollHeight;
  }
  function addFeed(m) {
    const i = feed.findIndex(x => x.id === m.id);
    if (i >= 0) feed[i] = m; else { feed.push(m); if (feed.length > 400) feed.shift(); }
    const el = $('#feed');
    if (!el || feedOff.has(m.platform)) return;
    if (i >= 0) return fillFeed();
    const nearBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 80;
    el.querySelector('.empty')?.remove();
    el.append(feedItem(m));
    while (el.children.length > 200) el.firstChild.remove();
    if (nearBottom) el.scrollTop = el.scrollHeight;
  }

  /* ---------------- generic settings form ---------------- */
  function field(section, f) {
    const v = st.settings[section][f.key];
    const label = h('label', { for: `f-${section}-${f.key}` }, f.label, f.hint ? h('span', { class: 'hint', text: f.hint }) : null);
    let ctl;
    const id = `f-${section}-${f.key}`;
    switch (f.type) {
      case 'toggle':
        ctl = h('span', { class: 'switch' }, h('input', { type: 'checkbox', id, checked: !!v, onchange: e => save(section, f.key, e.target.checked) }), h('span'));
        break;
      case 'select':
        ctl = h('select', { id, onchange: e => save(section, f.key, e.target.value) }, ...f.options.map(([val, txt]) => h('option', { value: val, selected: String(v) === String(val), text: txt })));
        break;
      case 'range': {
        const out = h('output', { text: fmt(f, v) });
        ctl = h('span', { class: 'range' }, h('input', { type: 'range', id, min: f.min, max: f.max, step: f.step || 1, value: v, oninput: e => { out.textContent = fmt(f, e.target.value); save(section, f.key, Number(e.target.value)); } }), out);
        break;
      }
      case 'number':
        ctl = h('input', { type: 'number', id, min: f.min, max: f.max, step: f.step || 1, value: v, onchange: e => save(section, f.key, Number(e.target.value)) });
        break;
      case 'color': {
        const code = h('code', { text: v });
        ctl = h('span', { class: 'color' }, h('input', { type: 'color', id, value: v, oninput: e => { code.textContent = e.target.value; save(section, f.key, e.target.value); } }), code);
        break;
      }
      case 'font':
        ctl = h('span', {}, h('input', { type: 'text', id, list: 'fontlist', value: v, placeholder: 'Inter', onchange: e => save(section, f.key, e.target.value.trim()) }));
        break;
      case 'textarea':
        ctl = h('textarea', { id, placeholder: f.placeholder || '', onchange: e => save(section, f.key, e.target.value) }, v);
        break;
      case 'secret':
        ctl = h('input', { type: 'password', id, value: v, placeholder: f.placeholder || '', autocomplete: 'off', onchange: e => save(section, f.key, e.target.value.trim()) });
        break;
      default:
        ctl = h('input', { type: 'text', id, value: v, placeholder: f.placeholder || '', onchange: e => save(section, f.key, e.target.value) });
    }
    return h('div', { class: `f ${f.wide ? 'wide' : ''}` }, label, ctl);
  }
  const fmt = (f, v) => (f.unit === '%' ? `${Math.round(v * 100)}%` : `${v}${f.unit || ''}`);
  function group(title, sub, section, fields, extra = {}) {
    return h('section', { class: `card ${extra.cls || ''}`, style: extra.style || '' },
      h('h2', {}, extra.icon || null, title), sub ? h('p', { class: 'sub', text: sub }) : null,
      h('div', { class: 'fields' }, ...fields.map(f => field(section, f))));
  }

  /* ---------------- appearance ---------------- */
  const PRESETS = [
    { id: 'glass', name: 'Glass', sw: ['rgba(18,18,26,.8)', 'rgba(18,18,26,.8)'], set: { theme: 'glass', useChatBubbles: true, bubbleColor: '#12121a', bubbleOpacity: 0.78, bubbleRadius: 14, textColor: '#ffffff', font: 'Inter', fontSize: 20, fontWeight: 500, accentBar: true, textShadow: true } },
    { id: 'neon', name: 'Neon', sw: ['#0b0b14', '#0b0b14'], border: true, set: { theme: 'neon', useChatBubbles: true, bubbleColor: '#0b0b14', bubbleOpacity: 0.86, bubbleRadius: 10, textColor: '#ffffff', font: 'Rajdhani', fontSize: 22, fontWeight: 600, accentBar: false, textShadow: false } },
    { id: 'minimal', name: 'Minimal', sw: ['transparent', 'transparent'], set: { theme: 'minimal', useChatBubbles: false, textColor: '#ffffff', font: 'Inter', fontSize: 21, fontWeight: 600, textShadow: true, accentBar: false } },
    { id: 'soft', name: 'Soft light', sw: ['#ffffff', '#f3eefe'], set: { theme: 'soft', useChatBubbles: true, bubbleColor: '#ffffff', bubbleOpacity: 0.94, bubbleRadius: 22, textColor: '#1d1d29', font: 'Nunito', fontSize: 20, fontWeight: 700, accentBar: false, textShadow: false } },
    { id: 'retro', name: 'Retro pixel', sw: ['#1b1035', '#1b1035'], set: { theme: 'retro', useChatBubbles: true, bubbleColor: '#1b1035', bubbleOpacity: 0.95, bubbleRadius: 0, textColor: '#f4f0ff', font: 'Pixelify Sans', fontSize: 20, fontWeight: 500, accentBar: false, textShadow: false } },
    { id: 'bold', name: 'Bold cards', sw: ['#16161f', '#2a1846'], set: { theme: 'glass', useChatBubbles: true, bubbleColor: '#16161f', bubbleOpacity: 0.9, bubbleRadius: 18, textColor: '#ffffff', font: 'Poppins', fontSize: 23, fontWeight: 600, accentBar: true, textShadow: true } },
  ];
  async function applyPreset(p) {
    try { st = await api('PUT', '/api/settings', { appearance: p.set }); render(); toast(`${p.name} style applied`); } catch (e) { toast(e.message, true); }
  }
  function renderAppearance(c) {
    const cur = st.settings.appearance.theme;
    c.append(h('section', { class: 'card' }, h('h2', { text: 'Start from a style' }), h('p', { class: 'sub', text: 'Pick a look, then fine-tune anything below. Changes show in the preview instantly.' }),
      h('div', { class: 'presets' }, ...PRESETS.map(p => h('button', { class: `preset ${cur === p.set.theme && st.settings.appearance.font === p.set.font ? 'on' : ''}`, onclick: () => applyPreset(p) },
        h('div', { class: 'sw' }, h('i', { style: `width:70%;background:${p.sw[0]};${p.border ? 'box-shadow:0 0 0 1px #9146ff,0 0 8px #9146ff;' : ''}${p.sw[0] === 'transparent' ? 'border-bottom:2px solid #fff;border-radius:0' : ''}` }), h('i', { style: `width:90%;background:${p.sw[1]};${p.border ? 'box-shadow:0 0 0 1px #53fc18,0 0 8px #53fc18;' : ''}${p.sw[1] === 'transparent' ? 'border-bottom:2px solid #fff;border-radius:0' : ''}` })),
        h('b', { text: p.name }))))));
    c.append(group('What to show', null, 'appearance', [
      { key: 'showPlatform', label: 'Platform icon', type: 'toggle' },
      { key: 'showAvatar', label: 'Profile pictures', type: 'toggle' },
      { key: 'showBadges', label: 'Badges', hint: 'Mod, VIP, sub, member…', type: 'toggle' },
      { key: 'showUsername', label: 'Usernames', type: 'toggle' },
      { key: 'showMessage', label: 'Message text', type: 'toggle' },
      { key: 'showPronouns', label: 'Pronouns', hint: 'Twitch, via pronouns.alejo.io', type: 'toggle' },
      { key: 'showTimestamps', label: 'Timestamps', type: 'toggle' },
      { key: 'timeFormat', label: 'Time format', type: 'select', options: [['12', '12-hour'], ['24', '24-hour']] },
    ]));
    c.append(group('Text', null, 'appearance', [
      { key: 'font', label: 'Font', hint: 'Any Google Font or installed font', type: 'font' },
      { key: 'fontSize', label: 'Font size', type: 'range', min: 12, max: 48, unit: 'px' },
      { key: 'fontWeight', label: 'Font weight', type: 'select', options: [[400, 'Regular'], [500, 'Medium'], [600, 'Semi-bold'], [700, 'Bold'], [800, 'Extra-bold']] },
      { key: 'lineSpacing', label: 'Space between messages', type: 'range', min: 0, max: 1.5, step: 0.05, unit: 'em' },
      { key: 'textColor', label: 'Text color', type: 'color' },
      { key: 'nameColorMode', label: 'Username color', type: 'select', options: [['user', "Viewer's own color"], ['platform', 'Platform color'], ['custom', 'One color for all']] },
      { key: 'nameColor', label: 'Custom username color', type: 'color' },
      { key: 'textShadow', label: 'Text shadow', hint: 'Keeps text readable on busy games', type: 'toggle' },
    ]));
    c.append(group('Bubbles & background', null, 'appearance', [
      { key: 'useChatBubbles', label: 'Chat bubbles', type: 'toggle' },
      { key: 'bubbleColor', label: 'Bubble color', type: 'color' },
      { key: 'bubbleOpacity', label: 'Bubble opacity', type: 'range', min: 0, max: 1, step: 0.01, unit: '%' },
      { key: 'bubbleRadius', label: 'Corner roundness', type: 'range', min: 0, max: 28, unit: 'px' },
      { key: 'accentBar', label: 'Platform color strip', type: 'toggle' },
      { key: 'background', label: 'Overlay background', type: 'color' },
      { key: 'opacity', label: 'Background opacity', type: 'range', min: 0, max: 1, step: 0.01, unit: '%' },
    ]));
    c.append(group('Layout & motion', null, 'appearance', [
      { key: 'animation', label: 'Entrance animation', type: 'select', options: [['slide', 'Slide in'], ['pop', 'Pop'], ['fade', 'Fade'], ['none', 'None']] },
      { key: 'align', label: 'Alignment', type: 'select', options: [['left', 'Left'], ['right', 'Right']] },
      { key: 'maxMessages', label: 'Max messages on screen', type: 'range', min: 5, max: 80 },
      { key: 'emoteScale', label: 'Emote size', type: 'range', min: 0.8, max: 3, step: 0.1, unit: '×' },
      { key: 'bigEmotes', label: 'Big emotes in emote-only messages', type: 'toggle' },
      { key: 'eventStyle', label: 'Event style', hint: 'Subs, gifts, Super Chats…', type: 'select', options: [['card', 'Highlighted cards'], ['inline', 'Inline with chat']] },
      { key: 'showEventLabels', label: 'Alert labels with platform', hint: 'e.g. NEW FOLLOWER on TikTok', type: 'toggle' },
      { key: 'followStyle', label: 'Follower alerts', type: 'select', options: [['card', 'Big alert card'], ['pill', 'Small pill']] },
    ]));
    c.append(h('datalist', { id: 'fontlist' }, ...['Inter', 'Poppins', 'Montserrat', 'Nunito', 'Rubik', 'Outfit', 'Lexend', 'Roboto', 'Lato', 'Quicksand', 'Fredoka', 'Baloo 2', 'Comfortaa', 'Space Grotesk', 'Kanit', 'Exo 2', 'Titillium Web', 'Rajdhani', 'Chakra Petch', 'Orbitron', 'Audiowide', 'Oswald', 'Bebas Neue', 'Bangers', 'Luckiest Guy', 'Permanent Marker', 'Pixelify Sans', 'Silkscreen', 'Press Start 2P', 'VT323', 'Segoe UI', 'Arial', 'Verdana', 'Georgia'].map(f => h('option', { value: f }))));
    c.append(resetRow('appearance'));
  }

  function resetRow(section) {
    return h('div', { style: 'display:flex;justify-content:flex-end' }, h('button', { class: 'btn sm ghost', onclick: async () => { if (!confirm('Reset these settings to defaults?')) return; st = await api('POST', '/api/settings/reset', { section }); render(); toast('Reset to defaults'); } }, icon('refresh'), 'Reset this page'));
  }

  /* ---------------- behavior ---------------- */
  function renderBehavior(c) {
    c.append(group('Chat behavior', null, 'general', [
      { key: 'hideAfter', label: 'Hide messages after', hint: '0 = keep them on screen', type: 'range', min: 0, max: 120, unit: 's' },
      { key: 'scrollDirection', label: 'Direction', type: 'select', options: [['normal', 'Newest at the bottom'], ['reversed', 'Newest at the top']] },
      { key: 'inlineChat', label: 'Name and message on one line', type: 'toggle' },
      { key: 'groupConsecutiveMessages', label: 'Group messages from the same person', type: 'toggle' },
      { key: 'joinLifetime', label: 'Show "joined" for', hint: 'Joins roll through one small pill', type: 'range', min: 2, max: 20, unit: 's' },
      { key: 'uwuMode', label: 'UwU mode', hint: 'Just for fun', type: 'toggle' },
    ]));
    c.append(group('Filters', null, 'general', [
      { key: 'excludeCommands', label: 'Hide !commands', type: 'toggle' },
      { key: 'imageEmbedPermissionLevel', label: 'Show image links as pictures for', type: 'select', options: [['nobody', 'Nobody'], ['broadcaster', 'Broadcaster only'], ['mods', 'Mods & broadcaster'], ['vips', 'VIPs, mods & broadcaster'], ['subs', 'Subs/members and above'], ['everyone', 'Everyone']] },
      { key: 'ignoreChatters', label: 'Ignore these chatters (bots)', hint: 'Comma separated', type: 'textarea', wide: true },
      { key: 'blockedWords', label: 'Hide messages containing', hint: 'Comma separated words or phrases', type: 'textarea', wide: true, placeholder: 'spoiler, some phrase' },
    ]));
    c.append(group('Mentions', null, 'general', [
      { key: 'highlightMentions', label: 'Highlight messages that mention you', hint: 'Your connected channel names are included automatically', type: 'toggle' },
      { key: 'mentionNames', label: 'Extra names to highlight', hint: 'Comma separated', type: 'text', wide: true, placeholder: 'yourname, nickname' },
    ]));
    c.append(resetRow('general'));
  }

  /* ---------------- events ---------------- */
  const EVENT_FIELDS = {
    twitch: [['messages', 'Chat messages'], ['cheers', 'Bits / cheers'], ['subs', 'Subs & resubs'], ['giftSubs', 'Gift subs'], ['raids', 'Raids'], ['announcements', 'Announcements'], ['redemptions', 'Channel point messages & Power-ups'], ['watchStreaks', 'Watch streaks'], ['joins', 'Viewers joining chat'], ['thirdPartyEmotes', '7TV / BTTV / FFZ emotes']],
    youtube: [['messages', 'Chat messages'], ['superChats', 'Super Chats'], ['superStickers', 'Super Stickers'], ['memberships', 'New members'], ['milestones', 'Member milestones'], ['giftedMemberships', 'Gifted memberships']],
    kick: [['messages', 'Chat messages'], ['subs', 'Subs'], ['giftSubs', 'Gifted subs'], ['kicksGifts', 'Kicks gifts'], ['hosts', 'Hosts'], ['rewards', 'Reward redemptions'], ['follows', 'Follows']],
    tiktok: [['messages', 'Comments'], ['joins', 'Viewers joining the LIVE'], ['gifts', 'Gifts'], ['likes', 'Likes'], ['follows', 'Follows'], ['shares', 'Shares'], ['subs', 'Subscriptions']],
    facebook: [['messages', 'Comments']],
  };
  const NOTES = {
    twitch: 'Anonymous connection, no login. Follows need Twitch login, so they are not shown.',
    youtube: 'Works with any public live stream. Paste a channel link to auto-connect whenever it goes live.',
    kick: 'No login needed.',
    tiktok: 'Gift images come straight from TikTok. Gift combos count up live on the same card.',
    facebook: 'Needs a Page access token (Advanced tab).',
  };
  function renderEvents(c) {
    for (const p of ['tiktok', 'twitch', 'youtube', 'kick', 'facebook']) {
      const fields = EVENT_FIELDS[p].map(([key, label]) => ({ key, label, type: 'toggle' }));
      if (p === 'twitch') fields.push({ key: 'sharedChat', label: 'Shared chat messages', type: 'select', options: [['show', 'Show'], ['highlight', 'Show & highlight'], ['hide', 'Hide']] });
      if (p === 'tiktok') fields.push({ key: 'minGiftDiamonds', label: 'Only gifts worth at least', hint: 'Diamonds (0 = all gifts)', type: 'number', min: 0, max: 100000 });
      c.append(group(cap(p), NOTES[p], p, fields, { cls: 'pcard', style: `--pc: var(--${p})`, icon: icon(p) }));
    }
  }

  /* ---------------- OBS ---------------- */
  function renderObs(c) {
    const url = st.overlayUrl;
    const dash = `http://localhost:${st.settings.advanced.port}/dashboard`;
    c.append(h('section', { class: 'card hero' }, h('h2', { text: 'Your overlay link' }), h('p', { class: 'sub', text: 'This link never changes. Style changes reach OBS instantly, so you never have to copy it again.' }),
      h('div', { class: 'urlbox' }, h('code', { text: url }), h('button', { class: 'btn primary sm', onclick: () => copy(url) }, icon('copy'), 'Copy'))));
    c.append(h('section', { class: 'card' }, h('h2', { text: 'Add it to OBS Studio (or Streamlabs, Meld, vMix)' }),
      h('ol', { class: 'steps' },
        h('li', {}, 'In OBS, click ', h('kbd', { text: '+' }), ' under Sources and choose ', h('b', { text: 'Browser' }), '.'),
        h('li', {}, 'Paste the overlay link into ', h('b', { text: 'URL' }), '. Set Width ', h('kbd', { text: '500' }), ' and Height ', h('kbd', { text: '800' }), ' (any size works).'),
        h('li', {}, 'Leave ', h('b', { text: 'Custom CSS' }), ' empty and click OK. Move and resize it like any other source.'),
        h('li', {}, 'Keep OmniChat running while you stream. It uses very little memory.'))));
    c.append(h('section', { class: 'card' }, h('h2', { text: 'Control OmniChat from inside OBS' }), h('p', { class: 'sub', text: 'Dock this control panel in OBS so you can read every chat without leaving OBS.' }),
      h('ol', { class: 'steps' },
        h('li', {}, 'In OBS open ', h('b', { text: 'Docks → Custom Browser Docks…' }), ' (older versions: View → Docks).'),
        h('li', {}, 'Name it ', h('b', { text: 'OmniChat' }), ' and use this URL: ', h('code', { text: dash }), ' ', h('button', { class: 'btn sm ghost', onclick: () => copy(dash) }, icon('copy'), 'Copy')),
        h('li', {}, 'Tip: open the ', h('b', { text: 'Live chat' }), ' tab in the dock to read all chats in one list.'))));
    c.append(h('section', { class: 'card' }, h('h2', { text: 'Different looks per scene' }), h('p', { class: 'sub', text: 'Add settings to the link to override them for one browser source only, for example a bigger chat for your "Just Chatting" scene:' }),
      h('div', { class: 'urlbox' }, h('code', { text: `${url}?fontSize=28&theme=neon&align=right` }), h('button', { class: 'btn sm ghost', onclick: () => copy(`${url}?fontSize=28&theme=neon&align=right`) }, icon('copy'))),
      h('p', { class: 'sub', style: 'margin-top:10px', text: 'Works for every Appearance and Behavior option (fontSize, theme, align, maxMessages, hideAfter, scrollDirection, showAvatar…).' })));
    c.append(h('section', { class: 'card' }, h('h2', { text: 'Test the overlay' }), h('p', { class: 'sub', text: 'Send sample messages and events to see how they look.' }),
      h('div', { class: 'test-grid' }, ...st.testKinds.map(k => h('button', { class: 'btn sm', onclick: () => test(k) }, k)), h('button', { class: 'btn sm primary', onclick: () => test('burst') }, 'Everything'))));
  }

  async function copy(text) {
    try { await navigator.clipboard.writeText(text); toast('Copied to clipboard'); }
    catch { prompt('Copy this:', text); }
  }
  async function test(kind) { try { await api('POST', '/api/test', { kind }); } catch (e) { toast(e.message, true); } }

  /* ---------------- advanced ---------------- */
  function renderAdvanced(c) {
    c.append(group('Accounts & keys', 'Only needed for some platforms. Stored on this computer only (config.json in the data folder).', 'advanced', [
      { key: 'facebookAccessToken', label: 'Facebook Page access token', hint: 'Required for Facebook comments. See Help → Facebook.', type: 'secret', wide: true, placeholder: 'EAAB…' },
      { key: 'tiktokSignApiKey', label: 'Euler Stream API key (optional)', hint: 'TikTok works without it. A free key from eulerstream.com raises the connection limits.', type: 'secret', wide: true },
    ]));
    const app = group('App', null, 'advanced', [
      { key: 'openDashboardOnStart', label: 'Open this control panel when OmniChat starts', type: 'toggle' },
      { key: 'port', label: 'Port', hint: 'Restart OmniChat after changing. The overlay link changes too.', type: 'number', min: 1024, max: 65535 },
    ]);
    if (st.autostart?.supported) {
      app.querySelector('.fields').prepend(h('div', { class: 'f' },
        h('label', { for: 'f-autostart' }, 'Start with Windows', h('span', { class: 'hint', text: 'Runs quietly in the background so the overlay is always ready' })),
        h('span', { class: 'switch' }, h('input', { type: 'checkbox', id: 'f-autostart', checked: st.autostart.enabled, onchange: async e => {
          try { st = await api('POST', '/api/autostart', { enabled: e.target.checked }); toast(e.target.checked ? 'OmniChat will start with Windows' : 'Removed from Windows startup'); }
          catch (err) { e.target.checked = !e.target.checked; toast(err.message, true); }
        } }), h('span'))));
    }
    c.append(app);
    const file = h('input', { type: 'file', accept: '.json,application/json', style: 'display:none', onchange: async e => {
      const f = e.target.files[0]; if (!f) return;
      try { const data = JSON.parse(await f.text()); delete data.sources; delete data.advanced; st = await api('PUT', '/api/settings', data); render(); toast('Settings imported'); } catch (err) { toast(`Import failed: ${err.message}`, true); }
    } });
    c.append(h('section', { class: 'card' }, h('h2', { text: 'Backup & data' }),
      h('p', { class: 'sub' }, 'Your settings live in ', h('code', { text: st.dataDir }), '.'),
      h('div', { style: 'display:flex;gap:8px;flex-wrap:wrap' },
        h('button', { class: 'btn', onclick: exportSettings }, icon('download'), 'Export style'),
        h('button', { class: 'btn', onclick: () => file.click() }, icon('upload'), 'Import style'), file,
        h('button', { class: 'btn danger', onclick: async () => { if (!confirm('Reset ALL overlay settings (your connections stay)?')) return; st = await api('POST', '/api/settings/reset', {}); render(); toast('All settings reset'); } }, icon('refresh'), 'Reset everything'),
        h('button', { class: 'btn danger', onclick: async () => { if (!confirm('Quit OmniChat? The overlay will stop until you start it again.')) return; await api('POST', '/api/quit', {}); document.body.innerHTML = '<p style="padding:40px;font:16px Inter,sans-serif;color:#ccc">OmniChat has been closed. Start it again from the OmniChat app.</p>'; } }, icon('power'), 'Quit OmniChat'))));
  }
  function exportSettings() {
    const { sources, advanced, ...style } = st.settings;
    const blob = new Blob([JSON.stringify(style, null, 2)], { type: 'application/json' });
    const a = h('a', { href: URL.createObjectURL(blob), download: 'omnichat-style.json' });
    document.body.append(a); a.click(); a.remove();
  }

  /* ---------------- help ---------------- */
  function renderHelp(c) {
    const qa = (q, ...a) => h('details', {}, h('summary', { text: q }), ...a);
    c.append(h('section', { class: 'card hero guide-cta' },
      h('div', {}, h('h2', { text: 'New here? Take the quick tour' }), h('p', { class: 'sub', text: 'Five short steps: connect your chats, style the overlay, add it to OBS and go live.' })),
      h('button', { class: 'btn primary', onclick: () => openGuide() }, icon('play'), 'Open the guide')));
    c.append(h('section', { class: 'card' }, h('h2', { text: 'Questions & fixes' }),
      qa('What links can I paste?', h('ul', {},
        h('li', { text: 'YouTube: a live video link (youtube.com/watch?v=…, youtu.be/…, youtube.com/live/…) or your channel (youtube.com/@name). With a channel link OmniChat finds your live stream by itself.' }),
        h('li', { text: 'Twitch: twitch.tv/yourname' }), h('li', { text: 'Kick: kick.com/yourname' }), h('li', { text: 'TikTok: tiktok.com/@yourname (or …/live)' }),
        h('li', { text: 'Facebook: the live video link (…/videos/1234567890 or facebook.com/watch/?v=…), plus a token (below).' }),
        h('li', { text: 'Shortcut: type "twitch:name", "kick:name", "tiktok:name" or "yt:@name".' }))),
      qa('A chat says "Waiting"', h('p', { text: 'That platform is not live yet (or the stream ended). OmniChat keeps checking and connects automatically when you go live. You do not need to do anything.' })),
      qa('How do I set up Facebook?', h('ol', {},
        h('li', {}, 'Go to ', h('a', { href: 'https://developers.facebook.com/tools/explorer/', target: '_blank', rel: 'noopener' }, 'Graph API Explorer'), ' and log in.'),
        h('li', { text: 'Under "User or Page" choose your Page, and add the permissions pages_read_engagement and pages_show_list.' }),
        h('li', { text: 'Click "Generate Access Token", copy it, and paste it into Advanced → Facebook Page access token.' }),
        h('li', { text: 'For a token that does not expire after an hour, follow the "long-lived Page token" steps in the README.' }))),
      qa('TikTok does not connect', h('p', { text: 'Make sure you are LIVE and the username is right. TikTok connections go through the free Euler Stream sign service; if you see a rate-limit message, create a free API key at eulerstream.com and paste it in Advanced.' })),
      qa('Why can\'t I see Twitch follows or Kick joins?', h('p', { text: 'Those platforms only share them with logged-in apps (Twitch follows) or not at all (Kick and YouTube joins). Everything that is public is supported.' })),
      qa('The overlay is empty in OBS', h('ul', {}, h('li', { text: 'Make sure OmniChat is running (this page loads).' }), h('li', { text: 'Use the exact link from "Add to OBS". Press "Test" to send a sample.' }), h('li', { text: 'Right-click the browser source → Refresh.' }))),
      qa('Does it slow down my stream?', h('p', { text: 'No. OmniChat is a tiny background app (about 50–80 MB of memory) with no window of its own, and the overlay only animates with GPU-friendly effects.' }))));
  }

  /* ---------------- getting-started guide ---------------- */
  const PLATS = ['youtube', 'twitch', 'kick', 'tiktok', 'facebook'];
  const mockMsg = (p, name, text) => h('div', { class: 'gm-msg', style: `--pc: var(--${p})` }, h('span', { class: 'gm-p' }, icon(p)), h('b', { text: name }), h('span', { text }));
  const GUIDE = [
    {
      title: 'Welcome to OmniChat',
      text: 'OmniChat puts the chats from YouTube, Twitch, Kick, TikTok and Facebook into one overlay for OBS. Gifts, subs, follows and Super Chats show up as alerts. This guide takes about a minute.',
      art: () => h('div', { class: 'ga-welcome' }, h('img', { src: '/shared/logo.svg', alt: '', width: 64, height: 64 }),
        h('div', { class: 'ga-orbit' }, ...PLATS.map((p, i) => h('span', { style: `--pc: var(--${p}); --i: ${i}` }, icon(p))))),
      points: ['Runs quietly in the background and uses very little memory.', 'Everything stays on your computer. No account needed.'],
    },
    {
      title: '1. Connect your chats',
      text: 'Copy the link of your live stream or channel, paste it in the box on the Connections page and press Enter. Add as many as you like.',
      art: () => h('div', { class: 'ga-connect' },
        h('div', { class: 'ga-input' }, icon('twitch'), h('span', { class: 'ga-typed', text: 'twitch.tv/yourname' }), h('kbd', { text: 'Enter' })),
        h('div', { class: 'ga-src' }, h('span', { class: 'dot live' }), h('b', { text: 'yourname' }), h('span', { text: 'Connected' }))),
      points: ['A channel link (like youtube.com/@you) waits for you to go live and connects by itself.', 'Facebook needs a Page token; see Advanced and Help.'],
    },
    {
      title: '2. Make it yours',
      text: 'Pick a style on the Appearance page, then change fonts, colors, bubbles and animations. The preview on the right updates as you go.',
      art: () => h('div', { class: 'ga-chat' }, mockMsg('twitch', 'PixelPanda', 'this overlay looks clean'), mockMsg('tiktok', 'LunaByte', 'hello from TikTok!'), mockMsg('youtube', 'NovaRider', 'GG that was insane')),
      points: ['Behavior: hide old messages, filter bots, block words.', 'Events & alerts: choose which gifts, subs and follows to show per platform.', 'Press Test at the top to send sample messages.'],
    },
    {
      title: '3. Add it to OBS',
      text: 'In OBS, click + under Sources, choose Browser, paste your overlay link and set the size to 500 × 800.',
      art: () => h('div', { class: 'ga-obs' },
        h('div', { class: 'ga-win' }, h('i'), h('i'), h('i'), h('span', { text: 'Properties for "OmniChat"' })),
        h('div', { class: 'ga-row' }, h('span', { text: 'URL' }), h('code', { class: 'hl', text: st.overlayUrl })),
        h('div', { class: 'ga-row' }, h('span', { text: 'Width' }), h('code', { text: '500' }), h('span', { text: 'Height' }), h('code', { text: '800' }))),
      points: ['The link never changes, and style changes reach OBS instantly.', 'Optional: add the control panel as an OBS dock (see Add to OBS).'],
      action: () => h('button', { class: 'btn sm', onclick: () => copy(st.overlayUrl) }, icon('copy'), 'Copy overlay link'),
    },
    {
      title: "4. You're ready to go live",
      text: 'Keep OmniChat running while you stream. Every alert names the platform it came from.',
      art: () => h('div', { class: 'ga-alert', style: '--pc: var(--tiktok)' },
        h('span', { class: 'ga-label' }, 'NEW FOLLOWER', h('em', {}, icon('tiktok'), 'on TikTok')),
        h('div', { class: 'ga-alert-body' }, h('span', { class: 'ga-av' }, icon('follow')), h('div', {}, h('b', { text: 'mochi_moo' }), h('span', { text: 'followed' })))),
      points: () => [st.autostart?.supported ? 'Turn on Start with Windows (Advanced) so the overlay is always ready.' : 'Start OmniChat before you go live; the overlay connects by itself.', 'Open this control panel any time from the OmniChat app icon.', 'Need this guide again? Click Guide at the top of any page.'],
    },
  ];

  let guideEl = null;
  function openGuide(start = 0) {
    guideEl?.remove();
    let i = start;
    const art = h('div', { class: 'g-art' });
    const body = h('div', { class: 'g-body' });
    const dots = h('div', { class: 'g-dots', role: 'tablist', 'aria-label': 'Guide steps' });
    const back = h('button', { class: 'btn ghost', onclick: () => show(i - 1) }, 'Back');
    const next = h('button', { class: 'btn primary', onclick: () => (i < GUIDE.length - 1 ? show(i + 1) : finish()) });
    const dlg = h('dialog', { class: 'guide', 'aria-labelledby': 'g-title' },
      h('button', { class: 'icon-btn g-close', title: 'Close guide', 'aria-label': 'Close guide', onclick: () => finish() }, icon('plus')),
      art, body, h('div', { class: 'g-foot' }, dots, h('span', { style: 'flex:1' }), back, next));
    guideEl = dlg;

    function show(n) {
      const dir = n >= i ? 1 : -1;
      i = Math.max(0, Math.min(GUIDE.length - 1, n));
      const s = GUIDE[i];
      art.textContent = ''; art.append(s.art());
      body.textContent = '';
      body.append(h('h2', { id: 'g-title', text: s.title }), h('p', { class: 'sub', text: s.text }),
        h('ul', { class: 'g-points' }, ...(typeof s.points === 'function' ? s.points() : s.points).map(p => h('li', {}, icon('check'), h('span', { text: p })))));
      if (s.action) body.append(s.action());
      for (const el of [art, body]) { el.classList.remove('in-l', 'in-r'); void el.offsetWidth; el.classList.add(dir > 0 ? 'in-r' : 'in-l'); }
      dots.textContent = '';
      GUIDE.forEach((_, k) => dots.append(h('button', { class: k === i ? 'on' : '', role: 'tab', 'aria-selected': String(k === i), 'aria-label': `Step ${k + 1}`, onclick: () => show(k) })));
      back.style.visibility = i ? 'visible' : 'hidden';
      next.textContent = i === GUIDE.length - 1 ? 'Start using OmniChat' : i ? 'Next' : "Let's go";
      next.focus();
    }
    function finish() {
      dlg.close();
    }
    dlg.addEventListener('close', () => {
      dlg.remove(); guideEl = null;
      if (!st.settings.advanced.welcomeSeen) { save('advanced', 'welcomeSeen', true); if (page !== 'connections') go('connections'); }
    });
    dlg.addEventListener('keydown', e => {
      if (e.target.closest('input, textarea')) return;
      if (e.key === 'ArrowRight' && i < GUIDE.length - 1) show(i + 1);
      if (e.key === 'ArrowLeft' && i > 0) show(i - 1);
    });
    document.body.append(dlg);
    dlg.showModal();
    show(i);
  }

  /* ---------------- live updates ---------------- */
  function connectWs() {
    const ws = new WebSocket(`ws://${location.host}/ws`);
    ws.onmessage = e => {
      const d = JSON.parse(e.data);
      if (d.op === 'hello') { feed = d.recent || []; fillFeed(); }
      if (d.op === 'sources') { st.sources = d.sources; if (page === 'connections') fillSources(); renderNav(); updateSummary(); }
      if (d.op === 'msg') addFeed(d.msg);
      if (d.op === 'clear') { feed = []; fillFeed(); }
    };
    ws.onclose = () => { $('#liveSum').innerHTML = '<span class="dot error"></span><span>OmniChat is not running</span>'; setTimeout(() => { connectWs(); refresh(); }, 2000); };
  }
  async function refresh() { try { st = await api('GET', '/api/state'); render(); updateSummary(); } catch { /* app not running */ } }

  /* ---------------- boot ---------------- */
  async function boot() {
    st = await api('GET', '/api/state');
    $('#version').textContent = `v${st.version}`;
    const bg = $('#btnGuide'); bg.append(icon('help'), h('span', { text: 'Guide' })); bg.onclick = () => openGuide();
    const bt = $('#btnTest'); bt.append(icon('sparkle'), h('span', { text: 'Test' })); bt.onclick = () => test('burst');
    const bc = $('#btnCopy'); bc.append(icon('copy'), h('span', { text: 'Copy overlay link' })); bc.onclick = () => copy(st.overlayUrl);
    for (const b of document.querySelectorAll('[data-test]')) b.onclick = () => test(b.dataset.test);
    for (const b of document.querySelectorAll('#bgSeg button')) b.onclick = () => {
      document.querySelectorAll('#bgSeg button').forEach(x => x.classList.toggle('on', x === b));
      $('#stage').className = `stage bg-${b.dataset.bg}`;
    };
    window.addEventListener('hashchange', () => { page = (location.hash || '#connections').slice(1); render(); });
    render(); updateSummary(); connectWs(); fitPreview();
    if (!st.settings.advanced.welcomeSeen) openGuide();
  }
  boot().catch(e => { document.body.textContent = `Could not load OmniChat: ${e.message}`; });
})();
