/* Style: ready-made looks, then every setting in clearly named folding sections. Inside a section each
   setting is its own row with an icon, a plain-words explanation, and sub-headings that split the list. */
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
  MG.FONTS = FONTS;

  // Sections: [section, field] pairs, with { sub } headings in between. The first two start open.
  const A = 'appearance', G = 'general';
  const GROUPS = [
    { id: 'layout', icon: 'layout', title: 'Layout', sub: 'Where messages go and how they line up', open: true, items: [
      [G, { key: 'inlineChat', icon: 'rows', help: 'One line: "Name: message". Name on top: the name gets its own line and the message goes underneath, like a phone chat.', label: 'Message layout', hint: 'Name and message on one line, or the name on top', type: 'select', options: [[true, 'One line'], [false, 'Name on top']], keywords: 'inline layout stacked name line' }],
      [A, { key: 'align', icon: 'align', label: 'Line up messages on the', hint: 'Right suits a chat on the right side of your scene', type: 'select', options: [['left', 'Left'], ['right', 'Right']] }],
      [G, { key: 'scrollDirection', icon: 'updown', help: 'Bottom: new messages appear at the bottom and push older ones up, like most chats. Top: the newest is always at the top.', label: 'New messages appear at the', hint: 'Bottom is like most chat apps', type: 'select', options: [['normal', 'Bottom'], ['reversed', 'Top']], keywords: 'direction order' }],
      [A, { key: 'maxMessages', icon: 'hash', help: 'Older messages are removed once there are more than this on screen.', label: 'Most messages on screen', hint: 'Older ones are removed after this', type: 'range', min: 5, max: 80, keywords: 'limit max' }],
      { sub: 'Several messages in a row', text: 'When one person sends a few messages one after another' },
      [G, { key: 'groupConsecutiveMessages', icon: 'layers', help: 'When one person sends a few messages in a row, Mergio shows their name and picture once instead of on every message.', label: 'Group them together', hint: 'Name and picture shown once', type: 'toggle', keywords: 'group stack merge' }],
      [G, { key: 'groupStyle', icon: 'box', help: 'Own boxes: each message keeps its own box, tucked under the first one. Same box: all their messages go in one box, one per line.', label: 'Grouped messages go in', type: 'select', options: [['tuck', 'Own boxes'], ['merge', 'Same box']], keywords: 'group stack merge box', when: s => s.general.groupConsecutiveMessages }],
    ] },
    { id: 'show', icon: 'eye', title: 'What each message shows', sub: 'Pictures, icons, names and times', open: true, items: [
      { sub: 'Who sent it' },
      [A, { key: 'showAvatar', icon: 'image', label: 'Profile pictures', hint: "The viewer's picture next to their message", type: 'toggle' }],
      [A, { key: 'avatarSize', icon: 'size', help: 'The picture sits in its own column, so the name and message line up next to it. Around 2× fits a name and a line of text.', label: 'Picture size', type: 'range', min: 1.2, max: 3.5, step: 0.1, unit: '×', keywords: 'avatar profile picture size big', when: s => s.appearance.showAvatar }],
      [A, { key: 'showUsername', icon: 'user', label: 'Usernames', type: 'toggle' }],
      [A, { key: 'showBadges', icon: 'shield', help: 'Small icons for moderators, VIPs, subscribers and members, shown before the name.', label: 'Badges', hint: 'Mod, VIP, subscriber, member…', type: 'toggle' }],
      [A, { key: 'showPronouns', icon: 'tag', help: 'Pronouns that viewers set on Twitch (through the pronouns extension), shown next to their name.', label: 'Pronouns', hint: 'Twitch only', type: 'toggle' }],
      { sub: 'Extras' },
      [A, { key: 'showPlatform', icon: 'host', help: 'A small YouTube, Twitch, Kick, TikTok or Facebook logo in front of each message, so you know where it came from.', label: 'Platform icons', hint: 'Shows where each message came from', type: 'toggle' }],
      [A, { key: 'showMessage', icon: 'chat', label: 'Message text', hint: 'Turn off to show only names (rarely needed)', type: 'toggle' }],
      [A, { key: 'showTimestamps', icon: 'clock', label: 'Time of each message', type: 'toggle', keywords: 'timestamp clock' }],
      [A, { key: 'timeFormat', icon: 'clock', label: 'Time format', type: 'select', options: [['12', '12-hour (2:30 PM)'], ['24', '24-hour (14:30)']], when: s => s.appearance.showTimestamps }],
    ] },
    { id: 'text', icon: 'type', title: 'Text', sub: 'Font, size, colour and spacing', items: [
      [A, { key: 'font', icon: 'type', help: 'Type the name of any Google Font (fonts.google.com) or a font installed on this PC. Mergio loads it for you.', label: 'Font', hint: 'Any Google Font or a font on your PC', type: 'font', suggestions: FONTS }],
      [A, { key: 'fontSize', icon: 'textsize', help: 'How big the chat text is on your stream. 20 to 26 px suits most 1080p scenes.', label: 'Text size', hint: '20 to 26 px suits most streams', type: 'range', min: 12, max: 48, unit: 'px' }],
      [A, { key: 'fontWeight', icon: 'bold', label: 'Thickness', type: 'select', options: [[400, 'Regular'], [500, 'Medium'], [600, 'Semi-bold'], [700, 'Bold'], [800, 'Extra bold']], keywords: 'weight bold' }],
      [A, { key: 'textColor', icon: 'droplet', label: 'Text colour', type: 'color' }],
      [A, { key: 'textShadow', icon: 'contrast', help: 'A soft dark shadow behind the letters, so white text stays readable over bright games.', label: 'Text shadow', hint: 'Keeps text readable on busy games', type: 'toggle' }],
      [A, { key: 'lineSpacing', icon: 'spacing', label: 'Space between messages', type: 'range', min: 0, max: 1.5, step: 0.05, unit: 'em', keywords: 'gap spacing' }],
      { sub: 'Name colours' },
      [A, { key: 'nameColorMode', icon: 'palette', help: "Own colour: the colour each viewer picked on their platform. Platform: everyone from Twitch is purple, YouTube red, and so on.", label: 'Username colour', type: 'select', options: [['user', "Each viewer's own colour"], ['platform', 'Colour of the platform'], ['custom', 'One colour for everyone']] }],
      [A, { key: 'nameColor', icon: 'droplet', label: 'Colour for everyone', type: 'color', when: s => s.appearance.nameColorMode === 'custom' }],
    ] },
    { id: 'box', icon: 'box', title: 'Message box & background', sub: 'The box behind each message, and behind the whole chat', items: [
      [A, { key: 'useChatBubbles', icon: 'box', help: 'Each message sits in its own rounded box. Turn it off for plain text straight on your stream.', label: 'Box behind each message', hint: 'Off = plain text with nothing around it', type: 'toggle', keywords: 'bubble box border background card' }],
      [A, { key: 'bubbleColor', icon: 'droplet', label: 'Box colour', type: 'color', keywords: 'bubble', when: s => s.appearance.useChatBubbles }],
      [A, { key: 'bubbleOpacity', icon: 'contrast', help: 'How solid the box is. Lower lets your game show through the box.', label: 'How solid the box is', hint: '100% = solid', type: 'range', min: 0, max: 1, step: 0.01, unit: '%', keywords: 'bubble opacity transparent see-through', when: s => s.appearance.useChatBubbles }],
      [A, { key: 'bubbleRadius', icon: 'corner', label: 'Rounded corners', type: 'range', min: 0, max: 28, unit: 'px', keywords: 'bubble radius roundness', when: s => s.appearance.useChatBubbles }],
      [A, { key: 'accentBar', icon: 'strip', help: 'A thin line on the edge of each box in the colour of the platform the message came from.', label: 'Platform colour strip', hint: 'Thin coloured edge on each box', type: 'toggle', when: s => s.appearance.useChatBubbles }],
      { sub: 'Behind the whole chat', text: 'Usually left invisible' },
      [A, { key: 'background', icon: 'layers', help: 'A colour behind the whole chat area. Leave it at 0% to show only the messages.', label: 'Background colour', type: 'color' }],
      [A, { key: 'opacity', icon: 'contrast', label: 'How solid the background is', hint: '0% = invisible', type: 'range', min: 0, max: 1, step: 0.01, unit: '%', keywords: 'opacity transparent see-through' }],
    ] },
    { id: 'motion', icon: 'sparkle', title: 'Motion & timing', sub: 'How messages appear, and when they leave', items: [
      [A, { key: 'animation', icon: 'sparkle', label: 'How new messages appear', type: 'select', options: [['slide', 'Slide in'], ['pop', 'Pop'], ['fade', 'Fade in'], ['none', 'No animation']], keywords: 'animation' }],
      [G, { key: 'fadeMessages', icon: 'timer', help: "Old messages fade away after a while, so the chat doesn't sit on screen when nobody is talking.", label: 'Messages disappear after a while', hint: 'Only the newest messages stay on screen', type: 'toggle', keywords: 'fade disappear hide timeout timer' }],
      [G, { key: 'hideAfter', icon: 'clock', label: 'Disappear after', hint: 'Alerts stay twice as long', type: 'range', min: 5, max: 300, step: 5, unit: 's', keywords: 'fade disappear hide timeout timer', when: s => s.general.fadeMessages }],
      [G, { key: 'joinLifetime', icon: 'join', help: 'TikTok and Twitch can say when someone joins. These notes roll through one small line and vanish after this time.', label: 'Show "joined" notes for', hint: 'They roll through one small line', type: 'range', min: 2, max: 20, unit: 's' }],
    ] },
    { id: 'emotes', icon: 'smile', title: 'Emotes & pictures', sub: 'Emote size and picture links', items: [
      [A, { key: 'emoteScale', icon: 'size', label: 'Emote size', type: 'range', min: 0.8, max: 3, step: 0.1, unit: '×' }],
      [A, { key: 'bigEmotes', icon: 'smile', help: 'When a message is only emotes, they are shown bigger, like on Twitch.', label: 'Bigger emotes', hint: 'When a message is only emotes', type: 'toggle' }],
      [G, { key: 'imageEmbedPermissionLevel', icon: 'image', help: 'When someone posts a link to a picture, Mergio can show the picture itself. Choose who is trusted to do that.', label: 'Show picture links as pictures for', type: 'select', options: [['nobody', 'Nobody'], ['broadcaster', 'Only me'], ['mods', 'Me and mods'], ['vips', 'Me, mods and VIPs'], ['subs', 'Subscribers and members too'], ['everyone', 'Everyone']], keywords: 'image embed' }],
    ] },
    { id: 'filters', icon: 'filter', title: 'Filters', sub: 'Keep bots, commands and unwanted words off screen', items: [
      [G, { key: 'excludeCommands', icon: 'terminal', help: 'Messages that start with ! (like !discord) are bot commands. This keeps them off your overlay.', label: 'Hide !commands', hint: 'Messages starting with !', type: 'toggle' }],
      [G, { key: 'ignoreChatters', icon: 'ban', help: 'Messages from these names never show. Handy for bots like Nightbot or StreamElements.', label: 'Never show these names', hint: 'Bots, separated by commas', type: 'textarea', wide: true, keywords: 'bots ignore' }],
      [G, { key: 'blockedWords', icon: 'filter', label: 'Hide messages containing', hint: 'Words or phrases, separated by commas', type: 'textarea', wide: true, placeholder: 'spoiler, some phrase', keywords: 'block filter' }],
    ] },
    { id: 'mentions', icon: 'at', title: 'Mentions & fun', sub: 'Highlight your name, and a little fun', items: [
      [G, { key: 'highlightMentions', icon: 'at', help: 'Messages that say your name get a glow so you notice them.', label: 'Highlight messages that mention me', hint: 'Your channel names are included automatically', type: 'toggle' }],
      [G, { key: 'mentionNames', icon: 'tag', label: 'Other names to highlight', hint: 'Separated by commas', type: 'text', wide: true, placeholder: 'nickname, team name', when: s => s.general.highlightMentions }],
      [G, { key: 'uwuMode', icon: 'heart', help: 'Just for fun: every message is rewritten in cute speak.', label: 'UwU mode', hint: 'Turns every message into cute speak', type: 'toggle' }],
    ] },
  ];

  const open = new Set(GROUPS.filter(g => g.open).map(g => g.id)); // remember which sections are open
  const settingsIn = g => g.items.filter(Array.isArray).length;

  async function applyPreset(p) {
    try { await MG.update('PUT', '/api/settings', { appearance: p.set, advanced: { styleSeen: true } }); MG.render(); MG.toast(`${p.name} style applied`); } catch (e) { MG.toast(e.message, true); }
  }

  function render(c) {
    const a = MG.st.settings.appearance;
    const search = h('input', { type: 'search', placeholder: 'Find a setting, e.g. "font" or "bots"', 'aria-label': 'Find a setting' });
    const noHits = h('p', { class: 'no-hits', hidden: true, text: 'No settings match. Try another word.' });
    c.append(h('div', { class: 'searchbar' }, icon('search'), search));
    if (MG.store.get('mg-style-tip') !== 'off') {
      const tip = h('div', { class: 'tipbar' }, icon('sparkle'),
        h('span', {}, h('b', { text: 'New here? ' }), 'Pick a style, then open a section below to fine-tune it. Every change shows in the preview straight away. Hover ', h('span', { class: 'i-inline' }, icon('info')), ' to see what a setting does.'),
        h('button', { class: 'x', 'aria-label': 'Hide this tip', onclick: () => { MG.store.set('mg-style-tip', 'off'); tip.remove(); } }, icon('plus')));
      c.append(tip);
    }

    c.append(MG.card('Pick a style', 'One click changes the whole look. You can fine-tune it below.',
      h('div', { class: 'presets' }, ...PRESETS.map(p => h('button', { class: `preset ${a.theme === p.set.theme && a.font === p.set.font ? 'on' : ''}`, onclick: () => applyPreset(p) },
        h('div', { class: 'sw' }, ...[0, 1].map(i => h('i', { style: `width:${i ? 90 : 70}%;background:${p.sw[i]};${p.border ? `box-shadow:0 0 0 1px ${i ? '#53fc18' : '#9146ff'},0 0 8px ${i ? '#53fc18' : '#9146ff'};` : ''}${p.sw[i] === 'transparent' ? 'border-bottom:2px solid #fff;border-radius:0' : ''}` }))),
        h('b', { text: p.name }))))));

    const folds = GROUPS.map(g => {
      const d = h('details', { class: 'card fold searchable', 'data-id': g.id, open: open.has(g.id) },
        h('summary', {}, h('span', { class: 'fold-ic' }, icon(g.icon)), h('span', { class: 'fold-t' }, h('b', { text: g.title }), h('span', { text: g.sub })), h('span', { class: 'fold-n', text: `${settingsIn(g)} settings` })),
        MG.fieldList(g.items));
      d.addEventListener('toggle', () => (d.open ? open.add(g.id) : open.delete(g.id)));
      return d;
    });
    c.append(...folds, noHits);
    c.append(h('div', { class: 'row-end' }, h('button', { class: 'btn ghost sm', onclick: async () => {
      if (!await MG.confirm({ title: 'Reset the style?', text: 'All look and behaviour settings go back to how they were when you installed Mergio. Your chats stay.', ok: 'Reset style', danger: true })) return;
      await MG.update('POST', '/api/settings/reset', { section: 'appearance' }); await MG.update('POST', '/api/settings/reset', { section: 'general' });
      MG.render(); MG.toast('Style reset');
    } }, icon('refresh'), 'Reset style')));

    MG.searchFolds(c, search, noHits, open);
  }

  /** Live search over the setting rows of the folding sections on a page. */
  MG.searchFolds = (c, search, noHits, open) => search.addEventListener('input', () => {
    const q = search.value.trim().toLowerCase();
    let hits = 0;
    for (const card of c.querySelectorAll('.searchable')) {
      let any = false;
      for (const f of card.querySelectorAll('.f')) { const m = !q || (f.dataset.search || '').includes(q); f.hidden = !m; any ||= m; if (m && q) hits++; }
      for (const s of card.querySelectorAll('.f-sub')) s.hidden = !!q;
      card.hidden = !!q && !any;
      if (card.tagName === 'DETAILS') card.open = q ? any : open.has(card.dataset.id);
    }
    noHits.hidden = !q || hits > 0;
  });

  MG.page({ id: 'style', order: 30, group: 'custom', label: 'Chat style', icon: 'palette', title: 'Chat style', subtitle: 'How the chat looks and behaves on stream. The preview updates as you go', render });
})();
