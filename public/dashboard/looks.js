/* Saved looks: three slots for each overlay type (chat, alerts, viewer count, follower goals). Save the look you
   have now, switch back to it with one click, or give a single OBS browser source its own look with ?slot=N. */
(() => {
  const { h, icon } = MG;
  const TITLES = { chat: 'chat', alerts: 'alerts', viewers: 'viewer count', followers: 'follower goals' };
  const cap = s => s.charAt(0).toUpperCase() + s.slice(1);

  /** One line about what a saved look looks like. */
  function describe(type, v) {
    if (type === 'chat') return `${cap(v.appearance?.theme || '')} · ${v.appearance?.font || 'Inter'} ${v.appearance?.fontSize || ''}px`;
    if (type === 'alerts') return `${(MG.ALERT_STYLES || []).find(s => s[0] === v.alerts?.style)?.[1] || cap(v.alerts?.style || '')} · ${v.alerts?.duration || ''}s`;
    const sec = v[type] || {};
    return `${cap(sec.style || '')} · ${sec.layout === 'line' ? 'one line' : sec.layout === 'column' ? 'stacked' : 'side by side'}`;
  }
  const when = at => (at ? new Date(at).toLocaleString([], { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }) : '');

  async function run(action, type, slot, name) {
    try { await MG.update('POST', '/api/templates', { action, type, slot, name }); MG.render(); return true; } catch (e) { MG.toast(e.message, true); return false; }
  }

  /** The "Saved looks" card for one overlay type. url: the overlay's link (for the per-source ?slot= link). */
  MG.savedLooks = (type, url) => {
    const list = MG.st.settings.templates?.[type] || [null, null, null];
    const tiles = list.map((t, i) => {
      const n = i + 1;
      const link = `${url}?slot=${n}`;
      if (!t) {
        return h('div', { class: 'look empty' },
          h('div', { class: 'look-h' }, h('span', { class: 'look-n', text: String(n) }), h('b', { text: 'Empty slot' })),
          h('p', { class: 'look-d', text: `Saves the ${TITLES[type]} look you have now.` }),
          h('div', { class: 'look-b' }, h('button', { class: 'btn sm primary', onclick: async () => {
            const name = await MG.ask({ title: `Save this look in slot ${n}`, label: 'Name', value: `Look ${n}`, ok: 'Save' });
            if (name != null && await run('save', type, i, name)) MG.toast(`Saved in slot ${n}`);
          } }, icon('plus'), 'Save current look')));
      }
      return h('div', { class: 'look' },
        h('div', { class: 'look-h' }, h('span', { class: 'look-n', text: String(n) }), h('b', { text: t.name, title: t.name })),
        h('p', { class: 'look-d', text: describe(type, t.values || {}) }),
        h('p', { class: 'look-t', text: `Saved ${when(t.at)}` }),
        h('div', { class: 'look-b' },
          h('button', { class: 'btn sm primary', title: 'Use this look everywhere', onclick: async () => { if (await run('load', type, i)) MG.toast(`Using “${t.name}”`); } }, icon('check'), 'Use'),
          h('button', { class: 'btn sm ghost', title: 'Replace it with the look you have now', onclick: async () => {
            if (!await MG.confirm({ title: `Replace “${t.name}”?`, text: `Slot ${n} gets the ${TITLES[type]} look you have now.`, ok: 'Replace' })) return;
            if (await run('save', type, i)) MG.toast(`Slot ${n} updated`);
          } }, icon('refresh'), 'Update'),
          h('span', { class: 'grow' }),
          h('button', { class: 'icon-btn', title: `Copy a link that always uses this look (for one OBS source): ${link}`, 'aria-label': `Copy the OBS link for ${t.name}`, onclick: () => MG.copy(link) }, icon('copy')),
          h('button', { class: 'icon-btn', title: 'Rename', 'aria-label': `Rename ${t.name}`, onclick: async () => {
            const name = await MG.ask({ title: 'Rename this look', label: 'Name', value: t.name, ok: 'Rename' });
            if (name != null) await run('rename', type, i, name);
          } }, icon('type')),
          h('button', { class: 'icon-btn', title: 'Delete', 'aria-label': `Delete ${t.name}`, onclick: async () => {
            if (!await MG.confirm({ title: `Delete “${t.name}”?`, text: 'The slot becomes empty. Your current look stays as it is.', ok: 'Delete', danger: true })) return;
            if (await run('delete', type, i)) MG.toast('Deleted');
          } }, icon('trash'))));
    });
    return h('details', { class: 'card fold looks-card', open: MG.store.get(`mg-looks-${type}`) !== 'closed',
      ontoggle: e => MG.store.set(`mg-looks-${type}`, e.target.open ? 'open' : 'closed') },
      h('summary', {}, h('span', { class: 'fold-ic' }, icon('layers')), h('span', { class: 'fold-t' }, h('b', { text: 'Saved looks' }),
        h('span', { text: `Keep up to three ${TITLES[type]} looks and switch with one click` })),
        h('span', { class: 'fold-n', text: `${list.filter(Boolean).length} of 3` })),
      h('div', { class: 'looks' }, ...tiles),
      h('p', { class: 'hint', text: `Tip: the copy button gives a link like …?slot=2. A browser source with that link always shows that look, so each scene can have its own ${TITLES[type]} style.` }));
  };
})();
