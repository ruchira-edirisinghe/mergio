/* Live chat: every chat in one readable list (handy as an OBS dock). */
(() => {
  const { h, icon } = MG;
  // Filters are remembered on this device, so an OBS dock keeps showing what you picked.
  const KEY = 'mergio.liveFilter';
  let saved = {};
  try { saved = JSON.parse(localStorage.getItem(KEY) || '{}') || {}; } catch {}
  const off = new Set(Array.isArray(saved.off) ? saved.off : []);
  let kind = ['all', 'chat', 'alerts'].includes(saved.kind) ? saved.kind : 'all';
  let query = '';
  // picking messages: hide them from the overlay, or keep only them when clearing
  let selecting = false;
  const picked = new Set();
  let lastPick = null;
  const save = () => { try { localStorage.setItem(KEY, JSON.stringify({ off: [...off], kind })); } catch {} };

  /** A viewer's own name colour, lightened when it's too dark to read on the dark page (like the overlay does). */
  function readable(hex) {
    const m = /^#?([\da-f]{2})([\da-f]{2})([\da-f]{2})$/i.exec(hex || '');
    if (!m) return 'var(--text)';
    let [r, g, b] = [1, 2, 3].map(i => parseInt(m[i], 16));
    const lum = (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255;
    if (lum < 0.45) { const k = Math.min(0.7, (0.45 - lum) * 1.6 + 0.2); r += (255 - r) * k; g += (255 - g) * k; b += (255 - b) * k; }
    return `rgb(${r | 0},${g | 0},${b | 0})`;
  }
  /** "is raiding with 128 viewers" doesn't need "· 128 viewers" after it: only amounts the title doesn't say. */
  function eventText(ev) {
    const amount = String(ev.amount || ''), num = amount.match(/\d[\d.,]*/)?.[0];
    const show = amount && (!num || /^[×x]/i.test(amount) || !(ev.title || '').includes(num));
    return `${ev.title || ''}${show ? ` · ${amount}` : ''}`;
  }

  /** One message, laid out like the overlay: the picture in its own column, then the name line and the message. */
  function item(m) {
    const head = h('div', { class: 'fh' }, h('span', { class: 'p' }, icon(m.platform)));
    const nm = h('b', { text: m.user.name }); nm.style.color = readable(m.user.color);
    head.append(nm, h('time', { text: new Date(m.time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) }));
    const t = h('div', { class: 't' });
    if (m.event && m.type !== 'chat') { const ev = h('span', { class: 'ev', text: eventText(m.event) }); if (m.event.color) ev.style.setProperty('--evc', m.event.color); if (/^https:\/\//.test(m.event.image || '')) ev.prepend(h('img', { class: 'e', src: m.event.image, alt: '', referrerpolicy: 'no-referrer' })); t.append(ev); }
    for (const p of m.parts || []) {
      if ((p.type === 'emote' || p.type === 'cheer') && /^https:\/\//.test(p.url)) t.append(h('img', { class: 'e', src: p.url, alt: p.name, title: p.name, referrerpolicy: 'no-referrer' }));
      else t.append(p.text || p.name || '');
    }
    const av = h('img', { class: 'av', src: /^(https:\/\/|\/avatar\/)/.test(m.user.avatar) ? m.user.avatar : `/avatar/default/${encodeURIComponent(m.user.name)}`, alt: '', loading: 'lazy', referrerpolicy: 'no-referrer' });
    const hidden = MG.hidden.has(m.id);
    if (hidden) head.insertBefore(h('span', { class: 'hid-tag', text: 'Hidden' }), head.querySelector('time'));
    const el = h('div', { class: `fi ${hidden ? 'hid' : ''} ${picked.has(m.id) ? 'picked' : ''}`, style: `--pc: var(--${m.platform})`, title: MG.pname(m.platform), 'data-id': m.id },
      h('span', { class: 'pick', 'aria-hidden': 'true' }, icon('check')), av, h('div', { class: 'fb' }, head, t));
    // a quick button on each message (shows on hover, always reachable with the keyboard)
    if (!hidden) el.append(h('div', { class: 'fi-act' },
      h('button', { type: 'button', class: 'icon-btn sm', title: 'Hide this message from the overlay', 'aria-label': `Hide the message from ${m.user.name} from the overlay`, onclick: e => { e.stopPropagation(); hide([m.id]); } }, icon('eyeoff'))));
    el.addEventListener('click', e => { if (selecting && !e.target.closest('button')) togglePick(m.id, e.shiftKey); });
    return el;
  }

  /** Takes messages off the overlay. They stay in this list, greyed out. */
  async function hide(ids) {
    try {
      await MG.api('POST', '/api/hide', { ids });
      for (const id of ids) { MG.hidden.add(id); picked.delete(id); }
      fill(); selBar();
      MG.toast(ids.length > 1 ? `${ids.length} messages hidden from the overlay` : 'Hidden from the overlay');
    } catch (e) { MG.toast(e.message, true); }
  }

  /** Clears the overlay and this list, except the picked messages. */
  async function keepOnly() {
    const keep = [...picked];
    if (!keep.length) return;
    if (!await MG.confirm({ title: `Keep only ${keep.length === 1 ? 'this message' : `these ${keep.length} messages`}?`, text: 'Everything else is cleared from your overlay and from this list. New messages keep coming in.', ok: 'Clear the rest' })) return;
    try {
      await MG.api('POST', '/api/clear', { keep });
      MG.feed = MG.feed.filter(m => keep.includes(m.id));
      setSelecting(false); fill();
      MG.toast('Cleared everything else');
    } catch (e) { MG.toast(e.message, true); }
  }

  const shownIds = () => [...document.querySelectorAll('#feed .fi:not(.hid)')].map(el => el.dataset.id);
  const markPicked = () => { for (const el of document.querySelectorAll('#feed .fi')) el.classList.toggle('picked', picked.has(el.dataset.id)); selBar(); };

  /** Click picks one message; Shift+click picks everything between it and the last one. */
  function togglePick(id, range) {
    const shown = shownIds();
    if (range && lastPick && shown.includes(lastPick) && shown.includes(id)) {
      const [a, b] = [shown.indexOf(lastPick), shown.indexOf(id)].sort((x, y) => x - y);
      for (const x of shown.slice(a, b + 1)) picked.add(x);
    } else if (picked.has(id)) picked.delete(id); else picked.add(id);
    lastPick = id;
    markPicked();
  }

  function setSelecting(on) {
    selecting = on;
    if (!on) { picked.clear(); lastPick = null; }
    document.getElementById('feed')?.classList.toggle('selecting', on);
    const b = document.getElementById('btnSelect');
    if (b) { b.classList.toggle('on', on); b.setAttribute('aria-pressed', String(on)); }
    markPicked();
  }

  /** The bar under the list while picking: how many are picked and what to do with them. */
  function selBar() {
    const bar = document.getElementById('selBar');
    if (!bar) return;
    bar.hidden = !selecting;
    bar.textContent = '';
    if (selecting) {
      const n = picked.size;
      bar.append(
        h('span', { class: 'sel-n' }, h('b', { text: String(n) }), n === 1 ? ' picked' : ' picked'),
        h('span', { class: 'sel-hint', text: n ? '' : 'Click messages to pick them. Shift+click picks a range.' }),
        h('span', { class: 'grow' }),
        h('button', { type: 'button', class: 'btn sm ghost', onclick: () => { for (const id of shownIds()) picked.add(id); markPicked(); } }, 'Pick all shown'),
        h('button', { type: 'button', class: 'btn sm', disabled: !n, title: 'Take the picked messages off your overlay', onclick: () => hide([...picked]) }, icon('eyeoff'), 'Hide from overlay'),
        h('button', { type: 'button', class: 'btn sm', disabled: !n, title: 'Clear everything else from your overlay and keep the picked messages', onclick: keepOnly }, icon('check'), 'Keep only these'),
        h('button', { type: 'button', class: 'btn sm ghost', onclick: () => setSelecting(false) }, 'Done'));
    }
    requestAnimationFrame(fitFeed);
  }
  const isAlert = m => m.type !== 'chat';
  const visible = m => !off.has(m.platform) && (kind === 'all' || (kind === 'alerts') === isAlert(m)) && (!query || `${m.user.name} ${(m.parts || []).map(p => p.text || p.name || '').join('')} ${m.event?.title || ''}`.toLowerCase().includes(query));

  function fill() {
    const el = document.getElementById('feed'); if (!el) return;
    el.textContent = '';
    const items = MG.feed.filter(visible).slice(-200);
    counts();
    const filtered = query || shownPlatforms().some(p => off.has(p.id)) || kind !== 'all';
    if (!items.length) { el.append(h('div', { class: 'empty' }, icon(filtered ? 'filter' : 'chat'), h('b', { text: query ? 'Nothing matches your search' : filtered ? 'Nothing here with these filters' : 'Waiting for messages' }), h('span', { text: query ? 'Try another word.' : filtered ? 'Pick All to see every message again.' : 'Messages from all your chats show up here. Press "Send test" to try it.' }))); return; }
    for (const m of items) el.append(item(m));
    el.scrollTop = el.scrollHeight;
  }

  /** The list fills the window below the filters, so the newest message is always in view, in a wide window and in a
      narrow OBS dock alike (there the top bar and the filters take more room). */
  function fitFeed() {
    const el = document.getElementById('feed'), content = document.getElementById('content');
    if (!el || !content) return;
    // layout offsets, not the on-screen box: they ignore scrolling and the page's slide-in animation
    let top = 0;
    for (let n = el; n; n = n.offsetParent) top += n.offsetTop;
    const card = el.closest('.feed-card');
    const bar = document.getElementById('selBar');
    const below = (card ? parseFloat(getComputedStyle(card).paddingBottom) || 0 : 0) + (parseFloat(getComputedStyle(content).paddingBottom) || 0) + 2 + (bar && !bar.hidden ? bar.offsetHeight + 10 : 0);
    const atEnd = el.scrollHeight - el.scrollTop - el.clientHeight < 80;
    el.style.maxHeight = `${Math.max(220, Math.floor(innerHeight - top - below))}px`;
    if (atEnd) el.scrollTop = el.scrollHeight;
  }
  addEventListener('resize', () => { if (MG.current() === 'live') fitFeed(); });
  const toolsWatch = window.ResizeObserver ? new ResizeObserver(() => fitFeed()) : null;

  /** The platforms worth a filter chip: the ones you added chats for, plus any that sent messages. */
  const shownPlatforms = () => {
    const used = new Set([...(MG.st.sources || []).map(x => x.platform), ...MG.feed.map(m => m.platform)]);
    const list = MG.PLATFORMS.filter(p => used.has(p.id));
    return list.length ? list : MG.PLATFORMS;
  };

  /** Message counts on the chips (what is in the list right now, before the filters). */
  function counts() {
    const bar = document.getElementById('feedFilter'); if (!bar) return;
    const n = {}; let all = 0;
    for (const m of MG.feed.slice(-500)) { if (kind !== 'all' && (kind === 'alerts') !== isAlert(m)) continue; n[m.platform] = (n[m.platform] || 0) + 1; all++; }
    for (const b of bar.querySelectorAll('[data-p]')) { const c = b.querySelector('.n'); if (c) c.textContent = b.dataset.p === 'all' ? all : (n[b.dataset.p] || 0); }
  }

  /** Clicking a platform while everything shows picks just that one; after that each click adds or removes one. */
  function filterBar() {
    const plats = shownPlatforms();
    const bar = h('div', { class: 'feed-filter', id: 'feedFilter', role: 'group', 'aria-label': 'Show messages from' });
    const sync = () => {
      for (const b of bar.querySelectorAll('[data-p]')) {
        const on = b.dataset.p === 'all' ? !plats.some(p => off.has(p.id)) : !off.has(b.dataset.p);
        b.classList.toggle('on', on); b.setAttribute('aria-pressed', String(on));
      }
      save(); fill();
    };
    const allBtn = h('button', { type: 'button', class: 'fchip all', 'data-p': 'all', title: 'Show every platform', onclick: () => { off.clear(); sync(); } }, icon('layers'), 'All', h('span', { class: 'n' }));
    const chips = plats.map(p => h('button', { type: 'button', class: 'fchip', 'data-p': p.id, style: `--pc: var(--${p.id})`,
      title: `Only ${p.name}, or add and remove it when you have already picked one`,
      onclick: () => {
        const everything = !plats.some(x => off.has(x.id));
        if (everything) plats.forEach(x => x.id !== p.id && off.add(x.id));
        else if (off.has(p.id)) off.delete(p.id);
        else off.add(p.id);
        if (plats.every(x => off.has(x.id))) off.clear(); // nothing left: show everything again
        sync();
      } }, icon(p.id), p.name, h('span', { class: 'n' })));
    bar.append(allBtn, ...chips);
    requestAnimationFrame(sync);
    return bar;
  }

  function render(c) {
    const search = h('input', { type: 'search', placeholder: 'Search chat', value: query, 'aria-label': 'Search messages', oninput: e => { query = e.target.value.trim().toLowerCase(); fill(); } });
    const kinds = MG.segmented({ id: 'feedKind', value: kind, label: 'Kind of messages', options: [['all', 'Everything'], ['chat', 'Chat'], ['alerts', 'Alerts']], onchange: v => { kind = v; save(); fill(); } });
    const tools = h('div', { class: 'feed-tools' },
      h('div', { class: 'feed-row' }, filterBar()),
      h('div', { class: 'feed-row' }, kinds, h('span', { class: 'grow' }),
        h('div', { class: 'mini-search' }, icon('search'), search),
        h('button', { class: `btn sm ghost ${selecting ? 'on' : ''}`, id: 'btnSelect', 'aria-pressed': String(selecting), title: 'Pick messages to hide from the overlay, or to keep when you clear it', onclick: () => setSelecting(!selecting) }, icon('check'), 'Select'),
        h('button', { class: 'btn sm ghost', title: 'Clear the overlay and this list', onclick: async () => {
          if (!await MG.confirm({ title: 'Clear the chat?', text: 'Removes all messages from your overlay and from this list. New messages keep coming in.', ok: 'Clear' })) return;
          await MG.api('POST', '/api/clear', {}); MG.feed = []; fill(); MG.toast('Chat cleared');
        } }, icon('trash'), 'Clear')));
    c.append(h('section', { class: 'card feed-card' }, tools, h('div', { class: `feed ${selecting ? 'selecting' : ''}`, id: 'feed' }), h('div', { class: 'sel-bar', id: 'selBar', hidden: true })));
    fill(); selBar();
    // the filters wrap onto more lines in narrow windows, so fit again whenever they change size
    if (toolsWatch) { toolsWatch.disconnect(); toolsWatch.observe(tools); }
    requestAnimationFrame(fitFeed);
  }

  MG.page({ id: 'live', order: 50, group: 'live', label: 'Live chat', icon: 'chat', title: 'Live chat', subtitle: 'Read all your chats in one list. Not affected by overlay filters', render });
  MG.on('hidden', () => { if (MG.current() === 'live') fill(); });
  MG.on('feed', () => { if (MG.current() !== 'live') return; const bar = document.getElementById('feedFilter'); if (bar) bar.replaceWith(filterBar()); else fill(); });
  // a chat added on another platform gets its own filter chip
  MG.on('sources', () => { const bar = document.getElementById('feedFilter'); if (bar && MG.current() === 'live') bar.replaceWith(filterBar()); });
  MG.on('msg', ({ msg, updated }) => {
    if (MG.current() !== 'live') return;
    const el = document.getElementById('feed');
    if (!el) return;
    // a platform without a chip yet (a test message, or a chat added elsewhere) gets one
    const bar = document.getElementById('feedFilter');
    if (bar && !bar.querySelector(`[data-p="${msg.platform}"]`) && MG.PLATFORMS.some(p => p.id === msg.platform)) {
      // while one platform is picked, a new one stays hidden instead of slipping into the list
      if (off.size) off.add(msg.platform);
      bar.replaceWith(filterBar());
      return;
    }
    if (!updated) counts();
    if (!visible(msg)) return;
    if (updated) return fill();
    const nearBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 80;
    el.querySelector('.empty')?.remove();
    el.append(item(msg));
    while (el.children.length > 200) el.firstChild.remove();
    if (nearBottom) el.scrollTop = el.scrollHeight;
  });
})();
