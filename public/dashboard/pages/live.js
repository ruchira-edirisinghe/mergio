/* Live chat: every chat in one readable list (handy as an OBS dock). */
(() => {
  const { h, icon } = MG;
  const off = new Set();
  let query = '';

  function item(m) {
    const t = h('div', { class: 't' });
    const nm = h('b', { text: m.user.name }); nm.style.color = m.user.color || 'var(--text)';
    t.append(nm);
    if (m.event && m.type !== 'chat') { const ev = h('span', { class: 'ev', text: `${m.event.title || ''}${m.event.amount ? ` · ${m.event.amount}` : ''}` }); if (m.event.color) ev.style.setProperty('--evc', m.event.color); t.append(ev); }
    for (const p of m.parts || []) {
      if ((p.type === 'emote' || p.type === 'cheer') && /^https:\/\//.test(p.url)) t.append(h('img', { class: 'e', src: p.url, alt: p.name, title: p.name, referrerpolicy: 'no-referrer' }));
      else t.append(p.text || p.name || '');
    }
    const av = h('img', { src: /^(https:\/\/|\/avatar\/)/.test(m.user.avatar) ? m.user.avatar : `/avatar/default/${encodeURIComponent(m.user.name)}`, alt: '', loading: 'lazy', referrerpolicy: 'no-referrer' });
    return h('div', { class: 'fi', style: `--pc: var(--${m.platform})`, title: MG.pname(m.platform) }, h('span', { class: 'p' }, icon(m.platform)), av, t,
      h('time', { text: new Date(m.time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) }));
  }
  const visible = m => !off.has(m.platform) && (!query || `${m.user.name} ${(m.parts || []).map(p => p.text || p.name || '').join('')} ${m.event?.title || ''}`.toLowerCase().includes(query));

  function fill() {
    const el = document.getElementById('feed'); if (!el) return;
    el.textContent = '';
    const items = MG.feed.filter(visible).slice(-200);
    if (!items.length) { el.append(h('div', { class: 'empty' }, icon('chat'), h('b', { text: query ? 'Nothing matches your search' : 'Waiting for messages' }), h('span', { text: query ? 'Try another word.' : 'Messages from all your chats show up here. Press "Send test" to try it.' }))); return; }
    for (const m of items) el.append(item(m));
    el.scrollTop = el.scrollHeight;
  }

  function render(c) {
    const search = h('input', { type: 'search', placeholder: 'Search messages or names', value: query, 'aria-label': 'Search messages', oninput: e => { query = e.target.value.trim().toLowerCase(); fill(); } });
    const tools = h('div', { class: 'feed-tools' },
      ...MG.PLATFORMS.map(p => h('button', { class: `chip ${off.has(p.id) ? 'off' : ''}`, 'aria-pressed': String(!off.has(p.id)), title: `Show or hide ${p.name}`, style: `--pc: var(--${p.id})`,
        onclick: e => { off.has(p.id) ? off.delete(p.id) : off.add(p.id); e.currentTarget.classList.toggle('off'); e.currentTarget.setAttribute('aria-pressed', String(!off.has(p.id))); fill(); } }, icon(p.id), p.name)),
      h('span', { class: 'grow' }),
      h('div', { class: 'mini-search' }, icon('search'), search),
      h('button', { class: 'btn sm ghost', title: 'Clear the overlay and this list', onclick: async () => {
        if (!await MG.confirm({ title: 'Clear the chat?', text: 'Removes all messages from your overlay and from this list. New messages keep coming in.', ok: 'Clear' })) return;
        await MG.api('POST', '/api/clear', {}); MG.feed = []; fill(); MG.toast('Chat cleared');
      } }, icon('trash'), 'Clear'));
    c.append(h('section', { class: 'card feed-card' }, tools, h('div', { class: 'feed', id: 'feed' })));
    fill();
  }

  MG.page({ id: 'live', order: 50, group: 'live', label: 'Live chat', icon: 'chat', title: 'Live chat', subtitle: 'Read all your chats in one list. Not affected by overlay filters', render });
  MG.on('feed', () => MG.current() === 'live' && fill());
  MG.on('msg', ({ msg, updated }) => {
    if (MG.current() !== 'live') return;
    const el = document.getElementById('feed');
    if (!el || !visible(msg)) return;
    if (updated) return fill();
    const nearBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 80;
    el.querySelector('.empty')?.remove();
    el.append(item(msg));
    while (el.children.length > 200) el.firstChild.remove();
    if (nearBottom) el.scrollTop = el.scrollHeight;
  });
})();
