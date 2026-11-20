/* Alerts: what each platform shows on the overlay, with a "Try" button to preview every alert. */
(() => {
  const { h, icon } = MG;

  // key, label, short description, test kind (for the Try button)
  const EVENTS = {
    tiktok: [
      ['messages', 'Comments', 'Chat messages from viewers', 'tiktok'],
      ['gifts', 'Gifts', 'With the real gift picture; combos count up live', 'gift'],
      ['follows', 'New followers', 'A big "NEW FOLLOWER" card', 'follow'],
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
      ['follows', 'New followers', 'A big "NEW FOLLOWER" card', 'kickfollow'],
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

  function render(c) {
    const used = new Set(MG.st.sources.map(s => s.platform));
    const order = [...ORDER].sort((a, b) => used.has(b) - used.has(a));
    c.append(h('div', { class: 'note' }, icon('info'), h('span', {}, 'Press ', h('b', { text: 'Try' }), ' to see any alert in the preview (and in OBS). Change how alerts look in ', h('a', { href: '#style', onclick: e => { e.preventDefault(); MG.go('style'); } }, 'Style → Alert look'), '.')));
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

  MG.page({ id: 'alerts', order: 40, group: 'custom', label: 'Alerts', icon: 'bell', title: 'Alerts', subtitle: 'Choose which messages and alerts appear for each platform', render });
})();
