/* Alerts: what each platform shows on the overlay, with a "Try" button to preview every alert. */
(() => {
  const { h, icon } = MG;

  // key, label, short description, test kind (for the Try button)
  const EVENTS = {
    tiktok: [
      ['messages', 'Comments', 'Chat messages from viewers', 'tiktok'],
      ['gifts', 'Gifts', 'With the real gift picture; combos count up live', 'gift'],
      ['follows', 'New followers', 'When someone follows you', 'follow'],
      ['subs', 'Subscriptions', 'When someone subscribes to you', 'tiktoksub'],
      ['joins', 'Viewers joining', 'A small note when someone joins the LIVE', 'join'],
      ['likes', 'Likes', 'Grouped per viewer so it never floods', 'like'],
      ['shares', 'Shares', 'When someone shares your LIVE', null],
    ],
    twitch: [
      ['messages', 'Chat messages', 'Everything people type', 'twitch'],
      ['subs', 'Subs & resubs', 'Including the months and tier', 'sub'],
      ['giftSubs', 'Gifted subs', 'When someone gifts subs to the community', 'twitchgiftsub'],
      ['cheers', 'Bits', 'With animated cheer images', 'cheer'],
      ['raids', 'Raids', 'Who is raiding and with how many viewers', 'raid'],
      ['announcements', 'Announcements', 'Highlighted mod announcements', null],
      ['redemptions', 'Channel points & Power-ups', 'Highlighted messages and other paid extras', null],
      ['watchStreaks', 'Watch streaks', 'When a viewer shares their streak', null],
      ['joins', 'Viewers joining chat', 'Only for smaller channels (Twitch limit)', null],
      ['thirdPartyEmotes', '7TV, BTTV & FFZ emotes', 'Show emotes from these popular add-ons', null],
    ],
    youtube: [
      ['messages', 'Chat messages', 'Everything people type', 'youtube'],
      ['superChats', 'Super Chats', 'In their real colours', 'superchat'],
      ['superStickers', 'Super Stickers', 'With the sticker image', null],
      ['memberships', 'New members', 'When someone joins your membership', 'member'],
      ['milestones', 'Member milestones', 'Long-time members celebrating', null],
      ['giftedMemberships', 'Gifted memberships', 'When someone gifts memberships', null],
    ],
    kick: [
      ['messages', 'Chat messages', 'Everything people type', 'kick'],
      ['follows', 'New followers', 'When someone follows you', 'kickfollow'],
      ['subs', 'Subs', 'New and returning subscribers', 'kicksub'],
      ['giftSubs', 'Gifted subs', 'When someone gifts subs', 'giftsub'],
      ['kicksGifts', 'Kicks', "Kick's own gifts", 'kicks'],
      ['hosts', 'Hosts', 'When another channel hosts you', null],
      ['rewards', 'Reward redemptions', 'Channel reward messages', null],
    ],
    facebook: [['messages', 'Comments', 'Live comments (needs a Page token)', 'facebook']],
  };
  const NOTES = {
    twitch: 'New followers are not available: Twitch only shares them with logged-in apps.',
    facebook: 'Facebook needs a free Page token. Add it in Settings → Accounts.',
  };
  const ORDER = ['tiktok', 'twitch', 'youtube', 'kick', 'facebook'];

  /* ---------- where alerts show: in the chat, on their own overlay, or both ---------- */
  const PLACES = [
    ['chat', 'In the chat', 'Alerts show between messages in your chat overlay. Nothing else to set up.'],
    ['overlay', 'Their own overlay', 'A separate browser source you can put anywhere on your scene. The chat stays clean.'],
    ['both', 'Both', 'A small line in the chat, plus a big alert on its own overlay.'],
  ];
  const placeArt = id => h('div', { class: 'pa', 'aria-hidden': 'true' }, h('div', { class: 'scr' }),
    h('div', { class: 'chatcol' }, h('i'), id === 'overlay' ? h('i') : h('i', { class: 'al' }), h('i')),
    id === 'chat' ? null : h('div', { class: 'box' }));

  /* ---------- alert styles, each with a little looping preview ---------- */
  const STYLES = [
    ['spotlight', 'Spotlight', 'Big picture, light rays and confetti'],
    ['banner', 'Banner', 'A ribbon that sweeps across'],
    ['neon', 'Neon', 'A glowing sign with a moving edge'],
    ['bubble', 'Bubbly', 'Soft, bouncy and cute'],
    ['card', 'Card', 'The classic card'],
    ['toast', 'Minimal', 'A small, quiet pill'],
  ];
  const mini = id => h('div', { class: `ast ast-${id}`, 'aria-hidden': 'true' },
    h('i', { class: 'a1' }), h('i', { class: 'a2' }), h('i', { class: 'a3' }), h('b'), h('b'), h('b'), h('b'), h('b'), h('b'));
  function stylePicker() {
    const cur = MG.st.settings.alerts.style;
    const grid = h('div', { class: 'astyles', role: 'radiogroup', 'aria-label': 'Alert style' });
    const pick = id => {
      MG.save('alerts', 'style', id);
      for (const b of grid.children) { const on = b.dataset.id === id; b.classList.toggle('on', on); b.setAttribute('aria-checked', String(on)); }
      MG.refreshDeps();
      setTimeout(() => MG.test('gift'), 250); // show it in the preview (and in OBS)
    };
    for (const [id, name, desc] of STYLES)
      grid.append(h('button', { class: `astyle ${cur === id ? 'on' : ''}`, 'data-id': id, role: 'radio', 'aria-checked': String(cur === id), onclick: () => pick(id) },
        mini(id), h('b', { text: name }), h('span', { text: desc })));
    return MG.card('Alert style', 'Pick a look. Each one plays a test alert in the preview so you can see it move.', grid);
  }

  function alertsStatus() {
    const o = MG.overlays.alerts || {};
    if (o.obs) return h('div', { class: 'banner ok' }, icon('check'), h('div', {}, h('b', { text: 'The alerts overlay is in OBS' }), h('span', { text: 'Press Try below to see an alert on your stream.' })));
    if (o.count) return h('div', { class: 'banner warn' }, icon('info'), h('div', {}, h('b', { text: 'The alerts overlay is open, but not in OBS' }), h('span', { text: "It's open in a browser or another streaming app. If that's your streaming app, you're good to go." })));
    return h('div', { class: 'banner' }, icon('monitor'), h('div', {}, h('b', { text: 'Alerts overlay not added yet' }), h('span', { text: 'Follow the steps below. This box turns green when OBS shows it.' })));
  }

  /** Steps to add the alerts overlay to OBS (also used on the Add to OBS page). */
  MG.alertsSetup = () => {
    const url = MG.st.alertsUrl;
    return h('section', { class: 'card alerts-setup' }, h('h2', { text: 'Add the alerts overlay to OBS' }),
      h('div', { class: 'alerts-status' }, alertsStatus()),
      h('ol', { class: 'big-steps compact' },
        h('li', {}, h('b', { text: 'Copy the alerts link' }),
          h('div', { class: 'urlbox' }, h('code', { text: url }), h('button', { class: 'btn primary', onclick: () => MG.copy(url) }, icon('copy'), 'Copy link'))),
        h('li', {}, h('b', { text: 'Add another Browser source in OBS' }),
          h('span', {}, 'Name it ', h('i', { text: 'Mergio Alerts' }), ', paste the link and set Width ', h('kbd', { text: '800' }), ' and Height ', h('kbd', { text: '500' }), '.')),
        h('li', {}, h('b', { text: 'Put it anywhere' }),
          h('span', { text: 'Drag and resize it like any other source, for example to the top middle of your scene. It is see-through until an alert comes in.' }))));
  };

  function placement(c) {
    const cur = MG.st.settings.alerts.placement;
    const choose = id => { MG.save('alerts', 'placement', id); MG.render(); MG.toast(id === 'chat' ? 'Alerts show in the chat' : id === 'overlay' ? 'Alerts show on their own overlay' : 'Alerts show in the chat and on their own overlay'); };
    const card = MG.card('Where should alerts show?', 'Subs, gifts, Super Chats, follows and raids. Joins and likes always stay small in the chat.',
      h('div', { class: 'places', role: 'radiogroup', 'aria-label': 'Where alerts show' }, ...PLACES.map(([id, name, desc]) =>
        h('button', { class: `place ${cur === id ? 'on' : ''}`, role: 'radio', 'aria-checked': String(cur === id), onclick: () => choose(id) }, placeArt(id), h('b', { text: name }), h('span', { text: desc })))));
    if (cur === 'chat' && MG.overlays.alerts?.count) card.append(h('p', { class: 'hint', text: 'Your alerts overlay is open. Pick "Their own overlay" or "Both" to use it.' }));
    c.append(card);
    if (cur === 'chat') return;
    c.append(stylePicker());
    const A = 'alerts';
    c.append(MG.card('Timing, size and sound', 'The preview shows alerts at the top.',
      h('div', { class: 'fields' },
        MG.field(A, { key: 'duration', label: 'Each alert stays for', type: 'range', min: 2, max: 20, unit: 's', keywords: 'time seconds' }),
        MG.field(A, { key: 'size', label: 'Size', type: 'range', min: 0.6, max: 2, step: 0.1, unit: '×', keywords: 'scale bigger smaller' }),
        MG.field(A, { key: 'position', label: 'Where in its box', hint: 'Within the browser source', type: 'select', options: [['top', 'Top'], ['center', 'Middle'], ['bottom', 'Bottom']] }),
        MG.field(A, { key: 'animation', label: 'How alerts appear', hint: 'The other styles have their own entrance', type: 'select', options: [['pop', 'Pop'], ['slide', 'Slide up'], ['fade', 'Fade in']], when: s => ['card', 'toast'].includes(s.alerts.style) }),
        MG.field(A, { key: 'showAvatar', label: 'Profile picture', type: 'toggle' }),
        MG.field(A, { key: 'showMessage', label: 'Their message', hint: 'Super Chats, resubs and more', type: 'toggle' }),
        MG.field(A, { key: 'sound', label: 'Play a chime', hint: 'A short sound with each alert, made by Mergio', type: 'toggle', keywords: 'sound audio chime volume' }),
        MG.field(A, { key: 'volume', label: 'Chime volume', type: 'range', min: 0, max: 1, step: 0.05, unit: '%', keywords: 'sound audio', when: s => s.alerts.sound })),
      h('div', { class: 'btn-row' }, h('span', { class: 'lbl', text: 'Try:' }),
        ...[['gift', 'Gift'], ['sub', 'Sub'], ['superchat', 'Super Chat'], ['follow', 'Follow'], ['raid', 'Raid']].map(([k, t]) => h('button', { class: 'btn ghost sm', onclick: () => MG.test(k) }, icon('play'), t)))));
    c.append(MG.alertsSetup());
  }
  MG.on('overlays', () => { for (const el of document.querySelectorAll('.alerts-status')) { el.textContent = ''; el.append(alertsStatus()); } });

  function render(c) {
    const used = new Set(MG.st.sources.map(s => s.platform));
    const order = [...ORDER].sort((a, b) => used.has(b) - used.has(a));
    placement(c);
    c.append(h('h2', { class: 'section-h', text: 'Which alerts and messages to show' }));
    c.append(h('div', { class: 'note' }, icon('info'), h('span', {}, 'Press ', h('b', { text: 'Try' }), ' to see any alert in the preview (and in OBS). Change how alerts look inside the chat in ', h('a', { href: '#style', onclick: e => { e.preventDefault(); MG.go('style'); } }, 'Style → Alert look'), '.')));
    for (const p of order) {
      const sec = MG.st.settings[p];
      const rows = EVENTS[p].map(([key, label, desc, kind]) => {
        const id = `ev-${p}-${key}`;
        return h('div', { class: 'ev-row' },
          h('label', { for: id }, h('b', { text: label }), h('span', { text: desc })),
          kind ? h('button', { class: 'btn ghost sm', onclick: () => MG.test(kind) }, icon('play'), 'Try') : h('span'),
          h('span', { class: 'switch' }, h('input', { type: 'checkbox', id, checked: !!sec[key], onchange: e => { MG.save(p, key, e.target.checked); syncAll(); } }), h('span')));
      });
      const allBox = h('input', { type: 'checkbox', 'aria-label': `All ${MG.pname(p)} alerts` });
      const syncAll = () => { const vals = EVENTS[p].map(([k]) => !!MG.st.settings[p][k]); allBox.checked = vals.every(Boolean); allBox.indeterminate = !allBox.checked && vals.some(Boolean); };
      allBox.onchange = () => { for (const [k] of EVENTS[p]) MG.save(p, k, allBox.checked); MG.render(); };
      syncAll();
      const extra = [];
      if (p === 'twitch') extra.push(MG.field('twitch', { key: 'sharedChat', label: 'Messages from Shared Chat partners', type: 'select', options: [['show', 'Show'], ['highlight', 'Show and highlight'], ['hide', 'Hide']] }));
      if (p === 'tiktok') extra.push(MG.field('tiktok', { key: 'minGiftDiamonds', label: 'Only show gifts worth at least', hint: 'In diamonds. 0 = every gift', type: 'number', min: 0, max: 100000 }));
      c.append(h('details', { class: 'card fold pcard', style: `--pc: var(--${p})`, open: used.has(p) || !used.size },
        h('summary', {}, MG.colorIcon(p), h('b', { text: MG.pname(p) }), h('span', { text: used.has(p) ? 'In use' : 'Not connected' }),
          h('label', { class: 'all', onclick: e => e.stopPropagation() }, h('span', { text: 'All' }), h('span', { class: 'switch' }, allBox, h('span')))),
        NOTES[p] ? h('p', { class: 'sub', text: NOTES[p] }) : null,
        h('div', { class: 'ev-list' }, ...rows),
        extra.length ? h('div', { class: 'fields' }, ...extra) : null));
    }
  }

  MG.page({ id: 'alerts', order: 40, group: 'custom', label: 'Alerts', icon: 'bell', title: 'Alerts', subtitle: 'Where alerts show, and which ones appear for each platform', render });
})();
