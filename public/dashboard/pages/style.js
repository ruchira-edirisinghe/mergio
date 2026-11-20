/* Style: ready-made looks, the few settings most people change, and everything else in folding sections. */
(() => {
  const { h, icon } = MG;

  const PRESETS = [
    { id: 'glass', name: 'Glass', sw: ['rgba(18,18,26,.8)', 'rgba(18,18,26,.8)'], set: { theme: 'glass', useChatBubbles: true, bubbleColor: '#12121a', bubbleOpacity: 0.78, bubbleRadius: 14, textColor: '#ffffff', font: 'Inter', fontSize: 20, fontWeight: 500, accentBar: true, textShadow: true } },
    { id: 'neon', name: 'Neon', sw: ['#0b0b14', '#0b0b14'], border: true, set: { theme: 'neon', useChatBubbles: true, bubbleColor: '#0b0b14', bubbleOpacity: 0.86, bubbleRadius: 10, textColor: '#ffffff', font: 'Rajdhani', fontSize: 22, fontWeight: 600, accentBar: false, textShadow: false } },
    { id: 'minimal', name: 'Minimal', sw: ['transparent', 'transparent'], set: { theme: 'minimal', useChatBubbles: false, textColor: '#ffffff', font: 'Inter', fontSize: 21, fontWeight: 600, textShadow: true, accentBar: false } },
    { id: 'soft', name: 'Soft light', sw: ['#ffffff', '#f3eefe'], set: { theme: 'soft', useChatBubbles: true, bubbleColor: '#ffffff', bubbleOpacity: 0.94, bubbleRadius: 22, textColor: '#1d1d29', font: 'Nunito', fontSize: 20, fontWeight: 700, accentBar: false, textShadow: false } },
    { id: 'retro', name: 'Retro pixel', sw: ['#1b1035', '#1b1035'], set: { theme: 'retro', useChatBubbles: true, bubbleColor: '#1b1035', bubbleOpacity: 0.95, bubbleRadius: 0, textColor: '#f4f0ff', font: 'Pixelify Sans', fontSize: 20, fontWeight: 500, accentBar: false, textShadow: false } },
    { id: 'bold', name: 'Bold cards', sw: ['#16161f', '#2a1846'], set: { theme: 'glass', useChatBubbles: true, bubbleColor: '#16161f', bubbleOpacity: 0.9, bubbleRadius: 18, textColor: '#ffffff', font: 'Poppins', fontSize: 23, fontWeight: 600, accentBar: true, textShadow: true } },
  ];
  const FONTS = ['Inter', 'Poppins', 'Montserrat', 'Nunito', 'Rubik', 'Outfit', 'Lexend', 'Roboto', 'Lato', 'Quicksand', 'Fredoka', 'Baloo 2', 'Comfortaa', 'Space Grotesk', 'Kanit', 'Exo 2', 'Titillium Web', 'Rajdhani', 'Chakra Petch', 'Orbitron', 'Audiowide', 'Oswald', 'Bebas Neue', 'Bangers', 'Luckiest Guy', 'Permanent Marker', 'Pixelify Sans', 'Silkscreen', 'Press Start 2P', 'VT323', 'Segoe UI', 'Arial', 'Verdana', 'Georgia'];

  // [section, field] pairs, grouped into folding sections
  const A = 'appearance', G = 'general';
  const QUICK = [
    [A, { key: 'fontSize', label: 'Text size', type: 'range', min: 12, max: 48, unit: 'px' }],
    [A, { key: 'textColor', label: 'Text colour', type: 'color' }],
    [A, { key: 'showAvatar', label: 'Profile pictures', type: 'toggle' }],
    [A, { key: 'showPlatform', label: 'Platform icons', hint: 'Shows where each message came from', type: 'toggle' }],
    [A, { key: 'useChatBubbles', label: 'Bubbles behind messages', type: 'toggle' }],
    [A, { key: 'align', label: 'Line up messages on the', type: 'select', options: [['left', 'Left'], ['right', 'Right']] }],
    [G, { key: 'fadeMessages', label: 'Messages disappear after a while', hint: 'Only the newest messages stay on screen', type: 'toggle', keywords: 'fade disappear hide timeout timer' }],
    [G, { key: 'hideAfter', label: 'Disappear after', hint: 'Alerts stay twice as long', type: 'range', min: 5, max: 300, step: 5, unit: 's', keywords: 'fade disappear hide timeout timer', when: s => s.general.fadeMessages }],
    [G, { key: 'scrollDirection', label: 'New messages appear at the', type: 'select', options: [['normal', 'Bottom'], ['reversed', 'Top']], keywords: 'direction order' }],
  ];
  const GROUPS = [
    { title: 'What to show', sub: 'Pick what each message includes', items: [
      [A, { key: 'showBadges', label: 'Badges', hint: 'Mod, VIP, subscriber, member…', type: 'toggle' }],
      [A, { key: 'showUsername', label: 'Usernames', type: 'toggle' }],
      [A, { key: 'showMessage', label: 'Message text', type: 'toggle' }],
      [A, { key: 'showPronouns', label: 'Pronouns', hint: 'Twitch only', type: 'toggle' }],
      [A, { key: 'showTimestamps', label: 'Time of each message', type: 'toggle', keywords: 'timestamp clock' }],
      [A, { key: 'timeFormat', label: 'Time format', type: 'select', options: [['12', '12-hour (2:30 PM)'], ['24', '24-hour (14:30)']] }],
    ] },
    { title: 'Text & colours', sub: 'Fonts, weights and name colours', items: [
      [A, { key: 'font', label: 'Font', hint: 'Any Google Font or a font on your PC', type: 'font' }],
      [A, { key: 'fontWeight', label: 'Thickness', type: 'select', options: [[400, 'Regular'], [500, 'Medium'], [600, 'Semi-bold'], [700, 'Bold'], [800, 'Extra bold']], keywords: 'weight bold' }],
      [A, { key: 'lineSpacing', label: 'Space between messages', type: 'range', min: 0, max: 1.5, step: 0.05, unit: 'em', keywords: 'gap spacing' }],
      [A, { key: 'nameColorMode', label: 'Username colour', type: 'select', options: [['user', "Each viewer's own colour"], ['platform', 'Colour of the platform'], ['custom', 'One colour for everyone']] }],
      [A, { key: 'nameColor', label: 'Colour for everyone', hint: 'Used with "One colour for everyone"', type: 'color' }],
      [A, { key: 'textShadow', label: 'Text shadow', hint: 'Keeps text readable on busy games', type: 'toggle' }],
    ] },
    { title: 'Bubbles & background', sub: 'The box behind each message and the overlay', items: [
      [A, { key: 'bubbleColor', label: 'Bubble colour', type: 'color' }],
      [A, { key: 'bubbleOpacity', label: 'Bubble see-through', hint: '100% = solid', type: 'range', min: 0, max: 1, step: 0.01, unit: '%', keywords: 'opacity transparent' }],
      [A, { key: 'bubbleRadius', label: 'Rounded corners', type: 'range', min: 0, max: 28, unit: 'px', keywords: 'radius roundness' }],
      [A, { key: 'accentBar', label: 'Platform colour strip', hint: 'Thin coloured edge on each bubble', type: 'toggle' }],
      [A, { key: 'background', label: 'Overlay background', type: 'color' }],
      [A, { key: 'opacity', label: 'Background see-through', hint: '0% = invisible', type: 'range', min: 0, max: 1, step: 0.01, unit: '%', keywords: 'opacity transparent' }],
    ] },
    { title: 'Motion & layout', sub: 'Animations, emotes and how many messages fit', items: [
      [A, { key: 'animation', label: 'How new messages appear', type: 'select', options: [['slide', 'Slide in'], ['pop', 'Pop'], ['fade', 'Fade in'], ['none', 'No animation']], keywords: 'animation' }],
      [A, { key: 'maxMessages', label: 'Most messages on screen', type: 'range', min: 5, max: 80, keywords: 'limit max' }],
      [A, { key: 'emoteScale', label: 'Emote size', type: 'range', min: 0.8, max: 3, step: 0.1, unit: '×' }],
      [A, { key: 'bigEmotes', label: 'Bigger emotes when a message is only emotes', type: 'toggle' }],
      [G, { key: 'inlineChat', label: 'Name and message on one line', type: 'toggle', keywords: 'inline layout' }],
      [G, { key: 'groupConsecutiveMessages', label: 'Group messages from the same person', type: 'toggle' }],
    ] },
    { title: 'Alert look', sub: 'Subs, gifts, follows and Super Chats', items: [
      [A, { key: 'eventStyle', label: 'Alerts in chat look like', type: 'select', options: [['compact', 'Chat lines with the gift icon (calm)'], ['card', 'Big highlighted cards']], keywords: 'highlight card compact' }],
      [A, { key: 'showEventLabels', label: 'Label with the platform', hint: 'e.g. NEW FOLLOWER · on TikTok', type: 'toggle', when: s => s.appearance.eventStyle === 'card' }],
      [A, { key: 'followStyle', label: 'New followers appear as', type: 'select', options: [['card', 'Like other alerts'], ['pill', 'Small note']] }],
      [G, { key: 'joinLifetime', label: 'Show "joined" notes for', hint: 'They roll through one small note', type: 'range', min: 2, max: 20, unit: 's' }],
    ] },
    { title: 'Filters', sub: 'Keep bots, commands and unwanted words off screen', items: [
      [G, { key: 'excludeCommands', label: 'Hide !commands', hint: 'Messages starting with !', type: 'toggle' }],
      [G, { key: 'imageEmbedPermissionLevel', label: 'Show picture links as pictures for', type: 'select', options: [['nobody', 'Nobody'], ['broadcaster', 'Only me'], ['mods', 'Me and mods'], ['vips', 'Me, mods and VIPs'], ['subs', 'Subscribers and members too'], ['everyone', 'Everyone']], keywords: 'image embed' }],
      [G, { key: 'ignoreChatters', label: 'Never show these names', hint: 'Bots, separated by commas', type: 'textarea', wide: true, keywords: 'bots ignore' }],
      [G, { key: 'blockedWords', label: 'Hide messages containing', hint: 'Words or phrases, separated by commas', type: 'textarea', wide: true, placeholder: 'spoiler, some phrase', keywords: 'block filter' }],
    ] },
    { title: 'Mentions & extras', sub: 'Highlight your name, and a little fun', items: [
      [G, { key: 'highlightMentions', label: 'Highlight messages that mention me', hint: 'Your channel names are included automatically', type: 'toggle' }],
      [G, { key: 'mentionNames', label: 'Other names to highlight', hint: 'Separated by commas', type: 'text', wide: true, placeholder: 'nickname, team name' }],
      [G, { key: 'uwuMode', label: 'UwU mode', hint: 'Turns every message into cute speak', type: 'toggle' }],
    ] },
  ];

  const open = new Set(); // remember which sections were open
  const fieldsFor = items => h('div', { class: 'fields' }, ...items.map(([sec, f]) => MG.field(sec, f)));

  async function applyPreset(p) {
    try { await MG.update('PUT', '/api/settings', { appearance: p.set, advanced: { styleSeen: true } }); MG.render(); MG.toast(`${p.name} style applied`); } catch (e) { MG.toast(e.message, true); }
  }

  function render(c) {
    const a = MG.st.settings.appearance;
    const search = h('input', { type: 'search', placeholder: 'Find a setting, e.g. "font" or "bots"', 'aria-label': 'Find a setting' });
    const noHits = h('p', { class: 'no-hits', hidden: true, text: 'No settings match. Try another word.' });
    c.append(h('div', { class: 'searchbar' }, icon('search'), search));

    c.append(MG.card('Pick a style', 'One click changes the whole look. You can fine-tune it below.',
      h('div', { class: 'presets' }, ...PRESETS.map(p => h('button', { class: `preset ${a.theme === p.set.theme && a.font === p.set.font ? 'on' : ''}`, onclick: () => applyPreset(p) },
        h('div', { class: 'sw' }, ...[0, 1].map(i => h('i', { style: `width:${i ? 90 : 70}%;background:${p.sw[i]};${p.border ? `box-shadow:0 0 0 1px ${i ? '#53fc18' : '#9146ff'},0 0 8px ${i ? '#53fc18' : '#9146ff'};` : ''}${p.sw[i] === 'transparent' ? 'border-bottom:2px solid #fff;border-radius:0' : ''}` }))),
        h('b', { text: p.name }))))));

    const quick = MG.card('Quick settings', 'The ones most people change.', fieldsFor(QUICK));
    quick.classList.add('searchable');
    c.append(quick);

    const folds = GROUPS.map(g => {
      const d = h('details', { class: 'card fold searchable', open: open.has(g.title) }, h('summary', {}, h('b', { text: g.title }), h('span', { text: g.sub })), fieldsFor(g.items));
      d.addEventListener('toggle', () => (d.open ? open.add(g.title) : open.delete(g.title)));
      return d;
    });
    c.append(...folds, noHits);
    c.append(h('datalist', { id: 'fontlist' }, ...FONTS.map(f => h('option', { value: f }))));
    c.append(h('div', { class: 'row-end' }, h('button', { class: 'btn ghost sm', onclick: async () => {
      if (!await MG.confirm({ title: 'Reset the style?', text: 'All look and behaviour settings go back to how they were when you installed Mergio. Your chats stay.', ok: 'Reset style', danger: true })) return;
      await MG.update('POST', '/api/settings/reset', { section: 'appearance' }); await MG.update('POST', '/api/settings/reset', { section: 'general' });
      MG.render(); MG.toast('Style reset');
    } }, icon('refresh'), 'Reset style')));

    search.addEventListener('input', () => {
      const q = search.value.trim().toLowerCase();
      let hits = 0;
      for (const card of c.querySelectorAll('.searchable')) {
        let any = false;
        for (const f of card.querySelectorAll('.f')) { const m = !q || f.dataset.search.includes(q); f.hidden = !m; any ||= m; if (m && q) hits++; }
        card.hidden = !!q && !any;
        if (card.tagName === 'DETAILS') card.open = q ? any : open.has(card.querySelector('summary b').textContent);
      }
      noHits.hidden = !q || hits > 0;
    });
  }

  MG.page({ id: 'style', order: 30, group: 'custom', label: 'Style', icon: 'palette', title: 'Style', subtitle: 'How the chat looks and behaves on stream. The preview updates as you go', render });
})();
