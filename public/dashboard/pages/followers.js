/* Follower goals: each channel's follower count with a goal and a progress bar, as its own overlay. */
(() => {
  const { h, icon } = MG;
  const F = 'followers';
  const STYLES = [
    ['panel', 'Panel', 'A glass card with the title on a tab'],
    ['line', 'Line', 'Small, with no background'],
    ['cards', 'Cards', 'A dark card for each platform'],
    ['neon', 'Neon', 'Glowing numbers and bars'],
    ['bars', 'Bars', 'A wide bar per platform that fills up'],
  ];
  const on = key => s => s.followers[key];
  const GROUPS = [
    { id: 'show', icon: 'eye', title: 'What to show', sub: 'Platforms, the title and the parts of each goal', items: [
      { sub: 'Platforms' },
      [F, { key: 'youtube', icon: 'youtube', label: 'YouTube subscribers', type: 'toggle' }],
      [F, { key: 'twitch', icon: 'twitch', label: 'Twitch followers', type: 'toggle' }],
      [F, { key: 'kick', icon: 'kick', label: 'Kick followers', type: 'toggle' }],
      [F, { key: 'tiktok', icon: 'tiktok', label: 'TikTok followers', type: 'toggle' }],
      [F, { key: 'facebook', icon: 'facebook', label: 'Facebook followers', hint: 'Add your Page on the Chats page', type: 'toggle' }],
      [F, { key: 'showTotal', icon: 'heart', label: 'All platforms added up', hint: 'One extra goal for everyone together', type: 'toggle' }],
      [F, { key: 'hideEmpty', icon: 'eye', label: 'Hide platforms without a number', hint: 'Until their count has been looked up', type: 'toggle' }],
      { sub: 'Title' },
      [F, { key: 'showTitle', icon: 'type', label: 'Show a title', type: 'toggle' }],
      [F, { key: 'title', icon: 'tag', label: 'Title text', type: 'text', placeholder: 'Follower goals', when: on('showTitle') }],
      { sub: 'Each goal shows' },
      [F, { key: 'showNames', icon: 'tag', label: 'Platform names', hint: '"TWITCH" above the number', type: 'toggle' }],
      [F, { key: 'showGoal', icon: 'target', label: 'The goal', hint: '436 / 500', type: 'toggle' }],
      [F, { key: 'showBar', icon: 'bar', label: 'Progress bar', hint: 'Fills up towards the goal', type: 'toggle' }],
      [F, { key: 'showToGo', icon: 'flame', label: 'How many to go', hint: '"64 to go"', type: 'toggle' }],
    ] },
    { id: 'goals', icon: 'target', title: 'Goals', sub: 'Automatic steps, or your own number per platform', items: [
      [F, { key: 'goalStep', icon: 'trend', label: 'Automatic goal step', hint: 'The goal is the next multiple: 436 → 500 with 100', help: 'With a step of 100, 436 followers has a goal of 500. When you reach it, the next goal (600) appears by itself. Big channels get bigger steps by themselves, so 75,262 aims for 76,000. A platform with its own goal below uses that instead.', type: 'number', min: 1, max: 1000000 }],
      { sub: 'Your own goals', text: '0 = automatic. When you reach your own goal it shows "Goal reached!" until you set a new one.' },
      [F, { key: 'goalYoutube', icon: 'youtube', label: 'YouTube goal', type: 'number', min: 0, max: 1e9 }],
      [F, { key: 'goalTwitch', icon: 'twitch', label: 'Twitch goal', type: 'number', min: 0, max: 1e9 }],
      [F, { key: 'goalKick', icon: 'kick', label: 'Kick goal', type: 'number', min: 0, max: 1e9 }],
      [F, { key: 'goalTiktok', icon: 'tiktok', label: 'TikTok goal', type: 'number', min: 0, max: 1e9 }],
      [F, { key: 'goalFacebook', icon: 'facebook', label: 'Facebook goal', type: 'number', min: 0, max: 1e9 }],
      [F, { key: 'goalTotal', icon: 'heart', label: 'Goal for everyone together', type: 'number', min: 0, max: 1e9, when: on('showTotal') }],
    ] },
    { id: 'motion', icon: 'sparkle', title: 'When followers come in', sub: 'The little celebrations', items: [
      [F, { key: 'showPlus', icon: 'plus', label: '"+3" pops up', hint: 'Next to the number, then floats away', type: 'toggle' }],
      [F, { key: 'celebrate', icon: 'star', label: 'Flash when a goal is reached', type: 'toggle' }],
      [F, { key: 'animate', icon: 'trend', label: 'Numbers count up', hint: 'Off = they change straight away', type: 'toggle' }],
    ] },
    { id: 'layout', icon: 'layout', title: 'Layout', sub: 'One line, side by side or stacked, and where it sits', items: [
      [F, { key: 'layout', icon: 'rows', label: 'Arrange the goals', hint: 'One line keeps everything on a single row and shrinks it to fit', type: 'select', dropdown: true, options: [['line', 'All in one line'], ['row', 'Side by side, wraps when long'], ['column', 'Under each other']] }],
      [F, { key: 'align', icon: 'align', label: 'Line up on the', hint: 'Inside the browser source', type: 'select', options: [['left', 'Left'], ['center', 'Middle'], ['right', 'Right']] }],
    ] },
    { id: 'text', icon: 'type', title: 'Text & colours', sub: 'Font, size, outline and colours', items: [
      [F, { key: 'font', icon: 'type', label: 'Number font', hint: 'Any Google Font or a font on your PC', type: 'font', suggestions: ['Bungee', 'Titan One', 'Luckiest Guy', 'Lilita One', 'Bangers', 'Russo One', 'Anton', 'Inter', ...(MG.FONTS || [])] }],
      [F, { key: 'fontSize', icon: 'textsize', label: 'Size', type: 'range', min: 16, max: 90, unit: 'px' }],
      [F, { key: 'outline', icon: 'bold', label: 'Thick outline around the numbers', hint: 'Panel, Line and Cards styles', type: 'toggle' }],
      { sub: 'Colours' },
      [F, { key: 'textColor', icon: 'droplet', label: 'Numbers', type: 'color' }],
      [F, { key: 'goalColor', icon: 'target', label: 'Goal and "to go" text', type: 'color' }],
      [F, { key: 'ink', icon: 'contrast', label: 'Outline and badges', hint: 'Also the logo circles in Panel and Line', type: 'color' }],
      [F, { key: 'barColor', icon: 'bar', label: 'Progress bar', hint: 'Also the Neon glow', type: 'color' }],
    ] },
  ];
  const open = new Set(GROUPS.filter(g => g.open).map(g => g.id));
  const ago = t => { const s = Math.round((Date.now() - t) / 1000); return s < 60 ? 'just now' : s < 3600 ? `${Math.round(s / 60)} min ago` : `${Math.round(s / 3600)} h ago`; };

  /** Right now: each channel's follower count (or why it could not be read). */
  function nowCard() {
    const s = MG.st.stats || { followers: [], totalFollowers: 0 };
    const enabled = MG.st.settings.followers.enabled;
    const refresh = h('button', { class: 'btn ghost sm', disabled: !enabled, onclick: async e => {
      e.currentTarget.disabled = true;
      try { await MG.api('POST', '/api/followers/refresh', { force: true }); MG.toast('Looking up your follower counts…'); } catch (err) { MG.toast(err.message, true); }
    } }, icon('refresh'), 'Refresh');
    const card = h('section', { class: 'card', id: 'followersNow' }, h('h2', {}, 'Right now ', refresh),
      h('p', { class: 'sub', text: enabled ? 'Looked up every minute or two while the overlay or this page is open. TikTok and Kick also count follows live.' : 'Turned off below: Mergio is not looking anything up.' }));
    if (!s.followers.length) { card.append(h('div', { class: 'empty' }, icon('chat'), h('b', { text: 'No chats added yet' }), h('span', { text: 'Add your channels on the Chats page. Their follower counts show up here.' }))); return card; }
    card.append(h('div', { class: 'now' },
      h('div', { class: 'now-big' }, h('span', {}, icon('heart'), 'Followers in total'), h('b', { text: MG.num(s.totalFollowers) })),
      h('div', { class: 'now-list' }, ...s.followers.map(f => h('div', { class: `now-it ${f.count == null ? 'off' : ''}`, style: `--pc: var(--${f.platform})`, title: f.err ? `Could not update: ${f.err}` : f.at ? `Updated ${ago(f.at)}` : '' },
        h('span', { class: 'logo' }, icon(f.platform)),
        h('b', { text: f.count == null ? (f.err ? 'Can’t read' : 'Looking up…') : MG.num(f.count) }),
        h('small', { text: f.err && f.count == null ? f.err : f.label }))))));
    return card;
  }

  function render(c) {
    // the counts are looked up while this page is open
    MG.api('POST', '/api/followers/refresh', { force: false }).catch(() => {});
    c.append(nowCard());
    c.append(MG.savedLooks('followers', MG.st.followersUrl));
    c.append(MG.card('Pick a style', 'Click one to use it. Fine-tune it below.', MG.counterStyles({ section: F, path: '/followers', styles: STYLES, extra: '&align=center&fontSize=21&layout=row&kick=false&facebook=false' })));
    c.append(...GROUPS.map(g => MG.counterFold(g, open)));
    c.append(MG.counterObs({ title: 'Add it to OBS', url: MG.st.followersUrl, name: 'Mergio Followers', w: 1000, ht: 300, o: MG.overlays.followers,
      note: 'Shows your follower goals on stream. It updates by itself, so you only add it once.' }));
    c.append(MG.card('Where the numbers come from', null, h('div', { class: 'fields' },
      MG.field(F, { key: 'enabled', icon: 'power', label: 'Look up follower counts', hint: 'Off = Mergio never asks the platforms', type: 'toggle', onchange: () => MG.refreshIf('followers') }),
      MG.row('youtube', 'YouTube', 'From your channel page. Big channels are rounded by YouTube (12.5K). A free YouTube Data API key (Settings → Accounts & keys) makes the lookup steadier.', null),
      MG.row('twitch', 'Twitch and Kick', 'Read from their public channel info. Nothing to set up.', null),
      MG.row('tiktok', 'TikTok', 'Read from your public profile in a hidden Edge or Chrome window every few minutes. New follows while you are live count straight away.', null),
      MG.row('facebook', 'Facebook', 'Needs your Page added on the Chats page. With a Page token (Settings → Accounts & keys) it updates every minute.', null))));
  }

  MG.page({ id: 'followers', order: 47, group: 'counters', label: 'Follower goals', icon: 'target', title: 'Follower goals', subtitle: 'Your follower counts with goals and progress bars', preview: '/followers?preview=1&mid=1', render });
  MG.on('stats', () => { const el = document.getElementById('followersNow'); if (el) el.replaceWith(nowCard()); });
  MG.on('overlays', () => MG.refreshIf('followers'));
})();
