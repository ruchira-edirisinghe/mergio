/* Shared parts of the counter pages (Viewer count, Follower goals): a style picker with live mini previews,
   the "Add to OBS" card and number formatting. */
(() => {
  const { h, icon } = MG;
  MG.num = n => (n == null ? '–' : Math.round(n).toLocaleString('en-US'));

  /** Style cards; each shows the real overlay in that style with sample numbers. */
  MG.counterStyles = ({ section, path, styles, extra = '' }) => {
    const cur = MG.st.settings[section].style;
    const grid = h('div', { class: 'cstyles', role: 'radiogroup', 'aria-label': 'Style' });
    const fit = () => { for (const f of grid.querySelectorAll('.cmini iframe')) { const w = f.parentElement.clientWidth, k = w / 420; if (w) { f.style.transform = `scale(${k})`; f.style.height = `${f.parentElement.clientHeight / k}px`; } } };
    for (const [id, name, desc] of styles) {
      const frame = h('iframe', { src: `${path}?preview=1&demo=1&mid=1&style=${id}${extra}`, title: `${name} preview`, tabindex: '-1', loading: 'lazy', 'aria-hidden': 'true' });
      grid.append(h('button', { class: `cstyle ${cur === id ? 'on' : ''}`, 'data-id': id, role: 'radio', 'aria-checked': String(cur === id), onclick: () => {
        MG.save(section, 'style', id);
        for (const b of grid.children) { const on = b.dataset.id === id; b.classList.toggle('on', on); b.setAttribute('aria-checked', String(on)); }
      } }, h('div', { class: 'cmini' }, frame), h('b', { text: name }), h('span', { text: desc })));
    }
    requestAnimationFrame(fit);
    new ResizeObserver(fit).observe(grid);
    return grid;
  };

  /** Status pill + link + size for one counter overlay. */
  MG.counterObs = ({ title, url, name, w, ht, o, note }) => {
    const pill = o?.obs ? h('span', { class: 'pill live' }, h('span', { class: 'dot' }), 'In OBS')
      : o?.count ? h('span', { class: 'pill waiting' }, h('span', { class: 'dot' }), 'Open, not in OBS')
      : h('span', { class: 'pill' }, h('span', { class: 'dot' }), 'Not added yet');
    return h('section', { class: 'card' }, h('h2', {}, title, ' ', pill),
      h('p', { class: 'sub', text: note }),
      h('div', { class: 'urlbox' }, h('code', { text: url }), h('button', { class: 'btn primary', onclick: () => MG.copy(url) }, icon('copy'), 'Copy link')),
      h('ol', { class: 'big-steps compact' },
        h('li', {}, h('span', {}, 'In OBS add a ', h('b', { text: 'Browser' }), ' source and name it ', h('i', { text: name }), '.')),
        h('li', {}, h('span', {}, 'Paste the link and set Width ', h('kbd', { text: String(w) }), ' and Height ', h('kbd', { text: String(ht) }), '.')),
        h('li', {}, h('span', { text: 'Drag it where you like. Everything around the numbers is see-through.' }))));
  };

  /** A folding section of settings, like on the Chat style page. */
  MG.counterFold = (g, open) => {
    const d = h('details', { class: 'card fold searchable', 'data-id': g.id, open: open.has(g.id) },
      h('summary', {}, h('span', { class: 'fold-ic' }, icon(g.icon)), h('span', { class: 'fold-t' }, h('b', { text: g.title }), h('span', { text: g.sub })), h('span', { class: 'fold-n', text: `${g.items.filter(Array.isArray).length} settings` })),
      MG.fieldList(g.items));
    d.addEventListener('toggle', () => (d.open ? open.add(g.id) : open.delete(g.id)));
    return d;
  };
})();
