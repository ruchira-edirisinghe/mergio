/* Viewer count: how many people watch right now on every platform, as its own overlay. */
(() => {
  const { h, icon } = MG;
  const V = 'viewers';
  const STYLES = [
    ['pill', 'Pill', 'A dark pill with a live dot, and a chip per platform'],
    ['glass', 'Glass', 'A frosted card with a bar split by platform'],
    ['neon', 'Neon', 'Glowing outline and numbers'],
    ['broadcast', 'Broadcast', 'A TV-style strip with a red LIVE block'],
    ['minimal', 'Minimal', 'Just logos and numbers, for gameplay'],
  ];
  const GROUPS = [
    { id: 'show', icon: 'eye', title: 'What to show', sub: 'The total, each platform, and the extras', items: [
      { sub: 'Everyone together' },
      [V, { key: 'showTotal', icon: 'raid', label: 'Total viewers', hint: 'Everyone watching on every platform, added up', type: 'toggle' }],
      [V, { key: 'totalLabel', icon: 'type', label: 'Word after the total', hint: 'e.g. watching, viewers, live. Leave empty for none', type: 'text', placeholder: 'watching', when: s => s.viewers.showTotal }],
      [V, { key: 'showLiveDot', icon: 'live', label: 'Live dot', hint: 'Pulses while you are live, grey when not', type: 'toggle' }],
      { sub: 'Each platform' },
      [V, { key: 'showPlatforms', icon: 'layers', label: 'A number for each platform', hint: 'With the platform logo', type: 'toggle' }],
      [V, { key: 'showNames', icon: 'tag', label: 'Platform names', hint: '"Twitch 120" instead of just the logo', type: 'toggle', when: s => s.viewers.showPlatforms }],
      [V, { key: 'hideOffline', icon: 'eye', label: 'Only platforms that are live', hint: 'Hides platforms you are not streaming on right now', type: 'toggle', when: s => s.viewers.showPlatforms }],
      [V, { key: 'showShare', icon: 'bar', help: 'A thin bar split into the platform colours, sized by how many people watch on each. Shows in the Glass, Neon and Broadcast styles.', label: 'Share bar', hint: 'Glass, Neon and Broadcast styles', type: 'toggle', when: s => s.viewers.showPlatforms }],
    ] },
    { id: 'layout', icon: 'layout', title: 'Layout', sub: 'One line, side by side or stacked, and where it sits', items: [
      [V, { key: 'layout', icon: 'rows', label: 'Arrange the numbers', hint: 'One line keeps everything on a single row and shrinks it to fit', type: 'select', dropdown: true, options: [['line', 'All in one line'], ['row', 'Side by side, wraps when long'], ['column', 'Under each other']] }],
      [V, { key: 'align', icon: 'align', label: 'Line up on the', hint: 'Inside the browser source', type: 'select', options: [['left', 'Left'], ['center', 'Middle'], ['right', 'Right']] }],
      [V, { key: 'animate', icon: 'sparkle', label: 'Numbers roll to the new value', hint: 'Off = they change straight away', type: 'toggle' }],
    ] },
    { id: 'text', icon: 'type', title: 'Text & colours', sub: 'Font, size and colours', items: [
      [V, { key: 'font', icon: 'type', label: 'Font', hint: 'Any Google Font or a font on your PC', type: 'font', suggestions: MG.FONTS || [] }],
      [V, { key: 'fontSize', icon: 'textsize', label: 'Size', type: 'range', min: 14, max: 80, unit: 'px' }],
      [V, { key: 'textColor', icon: 'droplet', label: 'Text colour', type: 'color' }],
      [V, { key: 'accent', icon: 'palette', label: 'Accent colour', hint: 'The live dot, the Neon glow and the LIVE block', type: 'color' }],
      { sub: 'Background', text: 'Pill, Glass and Broadcast styles' },
      [V, { key: 'background', icon: 'layers', label: 'Background colour', type: 'color' }],
      [V, { key: 'bgOpacity', icon: 'contrast', label: 'How solid the background is', hint: '0% = invisible', type: 'range', min: 0, max: 1, step: 0.01, unit: '%' }],
    ] },
  ];
  const open = new Set(GROUPS.filter(g => g.open).map(g => g.id));

  /** Right now: the total and each chat's number. */
  function nowCard() {
    const s = MG.st.stats || { viewers: [], totalViewers: 0 };
    const live = s.viewers.some(v => v.count != null);
    const card = h('section', { class: 'card', id: 'viewersNow' }, h('h2', { text: 'Right now' }),
      h('p', { class: 'sub', text: live ? 'Updates by itself every half a minute or so.' : 'Numbers show up here as soon as you go live.' }));
    if (!s.viewers.length) { card.append(h('div', { class: 'empty' }, icon('chat'), h('b', { text: 'No chats added yet' }), h('span', { text: 'Add your channels on the Chats page. Their viewer counts show up here.' }))); return card; }
    card.append(h('div', { class: 'now' },
      h('div', { class: 'now-big' }, h('span', {}, h('span', { class: `dot ${live ? 'live' : ''}` }), live ? 'Watching now' : 'Not live'), h('b', { text: MG.num(s.totalViewers) })),
      h('div', { class: 'now-list' }, ...s.viewers.map(v => h('div', { class: `now-it ${v.count == null ? 'off' : ''}`, style: `--pc: var(--${v.platform})` },
        h('span', { class: 'logo' }, icon(v.platform)), h('b', { text: v.count == null ? 'Not live' : MG.num(v.count) }), h('small', { text: v.label }))))));
    return card;
  }

  function render(c) {
    c.append(nowCard());
    c.append(MG.card('Pick a style', 'Click one to use it. Fine-tune it below.', MG.counterStyles({ section: V, path: '/viewers', styles: STYLES, extra: '&align=center&fontSize=24' })));
    c.append(...GROUPS.map(g => MG.counterFold(g, open)));
    c.append(MG.counterObs({ title: 'Add it to OBS', url: MG.st.viewersUrl, name: 'Mergio Viewers', w: 800, ht: 200, o: MG.overlays.viewers,
      note: 'Shows your live viewer count on stream. It updates by itself, so you only add it once.' }));
    c.append(h('p', { class: 'hint', text: 'YouTube, Twitch, Kick and TikTok counts need nothing extra. Facebook needs your Page token (Settings → Accounts & keys).' }));
  }

  MG.page({ id: 'viewers', order: 45, group: 'counters', label: 'Viewer count', icon: 'raid', title: 'Viewer count', subtitle: 'How many people watch right now, on every platform', preview: '/viewers?preview=1&mid=1', render });
  MG.on('stats', () => { const el = document.getElementById('viewersNow'); if (el) el.replaceWith(nowCard()); });
  MG.on('overlays', () => MG.refreshIf('viewers'));
})();
