/* Alerts: what each platform shows on the overlay, with a "Try" button to preview every alert. */
(() => {
  const openPlatforms = new Set();
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
  const EV_ICON = { messages: 'chat', gifts: 'gift', follows: 'follow', subs: 'star', joins: 'join', likes: 'heart', shares: 'share', giftSubs: 'gift', cheers: 'cheer', raids: 'raid', announcements: 'megaphone', redemptions: 'sparkle', watchStreaks: 'flame', thirdPartyEmotes: 'smile', superChats: 'money', superStickers: 'sparkle', memberships: 'crown', milestones: 'crown', giftedMemberships: 'gift', kicksGifts: 'coin', hosts: 'host', rewards: 'sparkle' };
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
    ['levelup', 'Level up', 'An RPG panel: the XP bar fills and the viewer levels up', 'Game'],
    ['achievement', 'Achievement', 'A medal spins down onto a trophy plaque. Bronze to gold by size', 'Game'],
    ['loot', 'Loot drop', 'A card flips over in its rarity colour: Common to Legendary', 'Game'],
    ['arcade', 'Arcade', '8-bit box, blinking 1UP and a score that counts up', 'Game'],
    ['combo', 'Combo', 'A fighting-game hit: COMBO! slams in over speed lines', 'Game'],
    ['quest', 'Quest', 'A parchment scroll unrolls with a wax seal', 'Game'],
    ['cyber', 'Cyber HUD', 'Brackets lock on, a scan line sweeps, the name decodes', 'Game'],
    ['gacha', 'Gacha pull', 'A capsule cracks open; its light shows the rarity, then 2 to 5 stars', 'Game'],
    ['roulette', 'Item roulette', 'A slot spins through items and lands on the gift. Rarer spins longer', 'Game'],
    ['crt', 'CRT broadcast', 'The TV tunes in through static: channel number and VHS time stamp', 'Game'],
    ['transmission', 'Transmission', 'Hyperspace streaks settle into a hologram that reads the message out', 'Game'],
    ['bounty', 'Bounty poster', 'A wanted poster drops onto a board and a sheriff badge stamps it', 'Game'],
    ['spotlight', 'Spotlight', 'The picture big, with the name rising in'],
    ['neon', 'Neon', 'A glowing sign that lights up'],
    ['bubble', 'Bubbly', 'A bright sticker that slaps on'],
  ];
  MG.ALERT_STYLES = STYLES;
  /** A small live preview: the real alerts overlay playing sample alerts in that style. */
  const mini = id => {
    const f = h('iframe', { src: `/alerts?preview=1&demo=1&style=${id}&position=center&duration=3`, title: `${id} preview`, tabindex: '-1', loading: 'lazy', 'aria-hidden': 'true' });
    return h('div', { class: 'ast', 'aria-hidden': 'true' }, f);
  };
  const fitMinis = grid => { for (const f of grid.querySelectorAll('.ast iframe')) { const w = f.parentElement.clientWidth; if (!w) continue; const k = Math.min(w / 800, f.parentElement.clientHeight / 340); f.style.transform = `translate(${(w - 800 * k) / 2}px, ${(f.parentElement.clientHeight - 500 * k) / 2}px) scale(${k})`; } };
  function stylePicker() {
    const cur = MG.st.settings.alerts.style;
    const grid = h('div', { class: 'astyles', role: 'radiogroup', 'aria-label': 'Alert style' });
    const pick = id => {
      MG.save('alerts', 'style', id);
      for (const b of grid.children) { const on = b.dataset.id === id; b.classList.toggle('on', on); b.setAttribute('aria-checked', String(on)); }
      MG.refreshDeps();
      setTimeout(() => MG.test('gift'), 250); // show it in the preview (and in OBS)
    };
    for (const [id, name, desc, tag] of STYLES)
      grid.append(h('button', { class: `astyle ${cur === id ? 'on' : ''}`, 'data-id': id, role: 'radio', 'aria-checked': String(cur === id), onclick: () => pick(id) },
        mini(id), tag ? h('span', { class: 'tag', text: tag }) : null, h('b', { text: name }), h('span', { text: desc })));
    requestAnimationFrame(() => fitMinis(grid));
    new ResizeObserver(() => fitMinis(grid)).observe(grid);
    return MG.card('Alert style', 'Pick a look. Each card plays sample alerts; picking one also plays a test alert in the preview.', grid);
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
    if (cur !== 'overlay') {
      const P = 'appearance';
      c.append(MG.card('Alerts inside the chat', 'How subs, gifts and Super Chats look between the chat messages.',
        MG.fieldList([
          [P, { key: 'eventStyle', icon: 'chat', help: 'Chat lines: a calm line with the gift picture, like a normal message. Big cards: a highlighted card that stands out.', label: 'Alerts in the chat look like', type: 'select', dropdown: true, options: [['compact', 'Chat lines with the gift picture (calm)'], ['card', 'Big highlighted cards']], keywords: 'highlight card compact' }],
          [P, { key: 'showEventLabels', icon: 'tag', label: 'Label with the platform', hint: 'e.g. NEW FOLLOWER · on TikTok', type: 'toggle', when: s => s.appearance.eventStyle === 'card' }],
          [P, { key: 'followStyle', icon: 'follow', help: "Like other alerts: new followers look like subs and gifts. Small note: a quiet line that doesn't take much space.", label: 'New followers appear as', type: 'select', options: [['card', 'Like other alerts'], ['pill', 'Small note']] }],
        ])));
    }
    if (cur === 'chat') return;
    c.append(MG.savedLooks('alerts', MG.st.alertsUrl));
    c.append(stylePicker());
    const A = 'alerts';
    c.append(MG.card('Alerts overlay settings', 'The preview shows alerts at the top.',
      MG.fieldList([
        { sub: 'Timing and size' },
        [A, { key: 'duration', icon: 'timer', label: 'Each alert stays for', hint: 'Seconds on screen', type: 'range', min: 2, max: 20, unit: 's', keywords: 'time seconds' }],
        [A, { key: 'size', icon: 'size', label: 'Size', hint: 'Bigger or smaller than normal', type: 'range', min: 0.6, max: 2, step: 0.1, unit: '×', keywords: 'scale bigger smaller' }],
        [A, { key: 'position', icon: 'move', label: 'Where in its box', hint: 'Within the browser source', type: 'select', options: [['top', 'Top'], ['center', 'Middle'], ['bottom', 'Bottom']] }],
        { sub: 'Colours and font' },
        [A, { key: 'colorMode', icon: 'palette', help: 'Platform: Twitch alerts are purple, TikTok pink and so on (Super Chats keep their own colour). By size: grey for small alerts, blue, purple, then gold for the biggest, like loot in a game. One colour: your own colour for everything.', label: 'Accent colour', type: 'select', dropdown: true, options: [['platform', 'Colour of the platform'], ['tier', 'By size: Common, Rare, Epic, Legendary'], ['custom', 'One colour for everything']], keywords: 'color colour tier rarity legendary' }],
        [A, { key: 'accent', icon: 'droplet', label: 'Your colour', type: 'color', when: s => s.alerts.colorMode === 'custom' }],
        [A, { key: 'textColor', icon: 'droplet', label: 'Text colour', hint: 'Quest and Bubbly keep their dark ink', type: 'color' }],
        [A, { key: 'font', icon: 'type', help: 'Each style has a font that suits it (Arcade uses a pixel font, Quest an old serif). Type any Google Font or a font on your PC to use it instead. Leave empty for the style’s own font.', label: 'Font', hint: 'Empty = the style’s own font', type: 'font', placeholder: 'Style’s own font', suggestions: ['Lilita One', 'Press Start 2P', 'Bangers', 'Cinzel', 'Orbitron', 'Rubik', ...(MG.FONTS || [])], keywords: 'font typeface' }],
        { sub: 'What each alert shows' },
        [A, { key: 'showHeadline', icon: 'sparkle', label: 'The big word on top', hint: '"LEVEL UP!", "Epic drop", "Quest complete"…', type: 'toggle', when: s => !['spotlight', 'neon', 'bubble'].includes(s.alerts.style) }],
        [A, { key: 'headline', icon: 'type', label: 'Your own big word', hint: 'Empty = the style’s own words', type: 'text', placeholder: 'e.g. THANK YOU!', when: s => s.alerts.showHeadline && !['spotlight', 'neon', 'bubble'].includes(s.alerts.style) }],
        [A, { key: 'showLabel', icon: 'tag', label: 'What happened', hint: '"NEW SUBSCRIBER", "GIFT"…', type: 'toggle' }],
        [A, { key: 'showPlatform', icon: 'host', label: 'Which platform', hint: '"on Twitch"', type: 'toggle' }],
        [A, { key: 'showAvatar', icon: 'image', label: 'Profile picture', type: 'toggle' }],
        [A, { key: 'showMessage', icon: 'chat', label: 'Their message', hint: 'Super Chats, resubs and more', type: 'toggle' }],
        [A, { key: 'showTimer', icon: 'timer', label: 'Time-left bar', hint: 'A thin bar that runs out', type: 'toggle' }],
        { sub: 'Sound' },
        [A, { key: 'sound', icon: 'volume', label: 'Play a sound', hint: 'A short sound with each alert, made by Mergio', type: 'toggle', keywords: 'sound audio chime volume' }],
        [A, { key: 'soundType', icon: 'volume', label: 'Sound', type: 'select', dropdown: true, options: [['chime', 'Chime (changes with the alert)'], ['coin', 'Coin pickup'], ['levelup', 'Level up'], ['arcade', '8-bit arcade'], ['soft', 'Soft bell']], keywords: 'sound audio', when: s => s.alerts.sound }],
        [A, { key: 'volume', icon: 'volume', label: 'Volume', type: 'range', min: 0, max: 1, step: 0.05, unit: '%', keywords: 'sound audio', when: s => s.alerts.sound }],
      ]),
      h('div', { class: 'btn-row try-row' }, h('span', { class: 'lbl', text: 'Try:' }),
        ...[['gift', 'Gift'], ['sub', 'Sub'], ['superchat', 'Super Chat'], ['follow', 'Follow'], ['raid', 'Raid']].map(([k, t]) => h('button', { class: 'btn ghost sm', onclick: () => MG.test(k) }, icon('play'), t)))));
    c.append(MG.alertsSetup());
  }
  MG.on('overlays', () => { for (const el of document.querySelectorAll('.alerts-status')) { el.textContent = ''; el.append(alertsStatus()); } });

  function controls() {
    const paused = MG.live.alertsPaused;
    return h('div', { class: `alert-live ${paused ? 'paused' : ''}`, id: 'alertLive' },
      h('span', { class: 'al-state' + (paused ? ' paused' : '') }, h('i'), h('b', { text: paused ? 'Alerts are paused' : 'Alerts are on' }), h('span', { text: paused ? 'New alerts wait in line and play when you resume.' : 'Pause during a quiet moment; nothing gets lost.' })),
      h('button', { type: 'button', class: `btn sm ${paused ? 'primary' : 'ghost'}`, onclick: () => MG.alertControl(paused ? 'resume' : 'pause') }, icon(paused ? 'play' : 'pause'), paused ? 'Resume' : 'Pause'),
      h('button', { type: 'button', class: 'btn sm ghost', onclick: () => MG.alertControl('skip') }, icon('skip'), 'Skip current'));
  }
  MG.on('live', () => { const el = document.getElementById('alertLive'); if (el) el.replaceWith(controls()); });

  function render(c) {
    c.append(controls());
    const used = new Set(MG.st.sources.map(s => s.platform));
    const order = [...ORDER].sort((a, b) => used.has(b) - used.has(a));
    placement(c);
    c.append(h('h2', { class: 'section-h', text: 'Which alerts and messages to show' }));
    c.append(h('div', { class: 'note' }, icon('info'), h('span', {}, 'Press ', h('b', { text: 'Try' }), ' to see any alert in the preview (and in OBS). Turn off anything you don’t want on stream.')));
    for (const p of order) {
      const sec = MG.st.settings[p];
      const rows = EVENTS[p].map(([key, label, desc, kind]) => {
        const id = `ev-${p}-${key}`;
        return h('div', { class: 'ev-row' },
          h('span', { class: 'f-ic', 'aria-hidden': 'true' }, icon(EV_ICON[key] || 'star')),
          h('label', { for: id }, h('b', { text: label }), h('span', { text: desc })),
          kind ? h('button', { class: 'btn ghost sm', onclick: () => MG.test(kind) }, icon('play'), 'Try') : h('span'),
          h('span', { class: 'switch' }, h('input', { type: 'checkbox', id, checked: !!sec[key], onchange: e => { MG.save(p, key, e.target.checked); syncAll(); } }), h('span')));
      });
      const allBox = h('input', { type: 'checkbox', 'aria-label': `All ${MG.pname(p)} alerts` });
      const syncAll = () => { const vals = EVENTS[p].map(([k]) => !!MG.st.settings[p][k]); allBox.checked = vals.every(Boolean); allBox.indeterminate = !allBox.checked && vals.some(Boolean); };
      allBox.onchange = () => { for (const [k] of EVENTS[p]) MG.save(p, k, allBox.checked); MG.render(); };
      syncAll();
      const extra = [];
      if (p === 'twitch') extra.push(MG.field('twitch', { key: 'sharedChat', icon: 'raid', label: 'Messages from Shared Chat partners', type: 'select', options: [['show', 'Show'], ['highlight', 'Show and highlight'], ['hide', 'Hide']] }));
      if (p === 'tiktok') extra.push(MG.field('tiktok', { key: 'minGiftDiamonds', icon: 'gem', label: 'Only show gifts worth at least', hint: 'In diamonds. 0 = every gift', type: 'number', min: 0, max: 100000 }));
      // every section starts folded; one you open stays open while you change things
      const fold = h('details', { class: 'card fold pcard', style: `--pc: var(--${p})`, open: openPlatforms.has(p) },
        h('summary', {}, MG.colorIcon(p), h('b', { text: MG.pname(p) }), h('span', { text: used.has(p) ? 'In use' : 'Not connected' }),
          h('label', { class: 'all', onclick: e => e.stopPropagation() }, h('span', { text: 'All' }), h('span', { class: 'switch' }, allBox, h('span')))),
        NOTES[p] ? h('p', { class: 'sub', text: NOTES[p] }) : null,
        h('div', { class: 'ev-list' }, ...rows),
        extra.length ? h('div', { class: 'fields' }, ...extra) : null);
      fold.addEventListener('toggle', () => (fold.open ? openPlatforms.add(p) : openPlatforms.delete(p)));
      c.append(fold);
    }
  }

  MG.page({ id: 'alerts', order: 40, group: 'custom', label: 'Alerts', icon: 'bell', title: 'Alerts', subtitle: 'Where alerts show, and which ones appear for each platform', render });
})();
