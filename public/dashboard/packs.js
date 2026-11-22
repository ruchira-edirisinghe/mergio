/* Matching packs: one click gives the chat, the alerts, the viewer count and the follower goals the same look.
   Each pack is just a set of settings (the same ones you can change by hand), so everything stays editable after. */
(() => {
  const { h, icon } = MG;

  // chat: a ready-made chat style plus a few changes; alerts: the alert style (its own font); counters: style, font and colours
  const CHAT = {
    glass: { theme: 'glass', useChatBubbles: true, bubbleOpacity: 0.8, accentBar: true, textShadow: true },
    neon: { theme: 'neon', useChatBubbles: true, bubbleOpacity: 0.86, accentBar: false, textShadow: false },
    minimal: { theme: 'minimal', useChatBubbles: false, textShadow: true, accentBar: false },
    soft: { theme: 'soft', useChatBubbles: true, bubbleOpacity: 0.94, accentBar: false, textShadow: false },
    retro: { theme: 'retro', useChatBubbles: true, bubbleOpacity: 0.95, bubbleRadius: 0, accentBar: false, textShadow: false },
  };
  const PACKS = [
    { id: 'rpg', name: 'Level up', look: 'RPG panels in deep purple and gold', font: 'Lilita One', bg: '#120f22', bubble: '#1d1838', ink: '#ffffff', accent: '#ffb627',
      chat: { ...CHAT.glass, bubbleColor: '#1d1838', bubbleRadius: 12, fontWeight: 400, textColor: '#ffffff' }, alerts: 'levelup', viewers: 'pill', followers: 'bars', followInk: '#120f22', bar: '#ffcc3d' },
    { id: 'arcade', name: 'Arcade', look: '8-bit boxes and pixel type', font: 'Pixelify Sans', bg: '#08081a', bubble: '#1b1035', ink: '#f4f0ff', accent: '#5ef0ff',
      chat: { ...CHAT.retro, bubbleColor: '#1b1035', fontWeight: 500, textColor: '#f4f0ff' }, alerts: 'arcade', viewers: 'neon', followers: 'neon', counterFont: 'Press Start 2P', followInk: '#08081a', bar: '#ffe14d' },
    { id: 'cyber', name: 'Cyber', look: 'HUD brackets and cyan glow', font: 'Rajdhani', bg: '#03131d', bubble: '#0b0b14', ink: '#ffffff', accent: '#00e5ff',
      chat: { ...CHAT.neon, bubbleColor: '#0b0b14', bubbleRadius: 4, fontWeight: 600, textColor: '#ffffff' }, alerts: 'cyber', viewers: 'neon', followers: 'neon', counterFont: 'Orbitron', followInk: '#03131d', bar: '#00e5ff' },
    { id: 'gacha', name: 'Gacha', look: 'Capsules, stars and rarity colours', font: 'Baloo 2', bg: '#121027', bubble: '#1b1836', ink: '#ffffff', accent: '#b866ff',
      chat: { ...CHAT.glass, bubbleColor: '#1b1836', bubbleRadius: 18, fontWeight: 600, textColor: '#ffffff' }, alerts: 'gacha', viewers: 'glass', followers: 'cards', followInk: '#2a1452', bar: '#b866ff' },
    { id: 'space', name: 'Deep space', look: 'Holograms and hyperspace blue', font: 'Chakra Petch', bg: '#04101c', bubble: '#06182a', ink: '#e8f7ff', accent: '#57e1ff',
      chat: { ...CHAT.glass, bubbleColor: '#06182a', bubbleRadius: 6, fontWeight: 500, textColor: '#e8f7ff' }, alerts: 'transmission', viewers: 'glass', followers: 'neon', followInk: '#04101c', bar: '#57e1ff' },
    { id: 'tv', name: 'Late-night TV', look: 'CRT green on black, VHS type', font: 'VT323', bg: '#0a1016', bubble: '#0a1016', ink: '#e8ffe8', accent: '#7dff8a',
      chat: { ...CHAT.minimal, fontSize: 26, fontWeight: 400, textColor: '#e8ffe8' }, alerts: 'crt', viewers: 'neon', followers: 'line', followInk: '#0a1016', bar: '#7dff8a' },
    { id: 'quest', name: 'Fantasy quest', look: 'Parchment, wax seals and gold', font: 'Cinzel', bg: '#2a1a0e', bubble: '#2a1a0e', ink: '#f6e7c4', accent: '#d39b26',
      chat: { ...CHAT.glass, bubbleColor: '#2a1a0e', bubbleRadius: 6, fontWeight: 700, textColor: '#f6e7c4', accentBar: false }, alerts: 'quest', viewers: 'glass', followers: 'panel', followInk: '#3a2414', bar: '#d39b26' },
    { id: 'west', name: 'Wild West', look: 'Wanted posters and old wood', font: 'Rye', bg: '#3a2310', bubble: '#ead5a6', ink: '#3b2412', accent: '#e3a812',
      chat: { ...CHAT.soft, bubbleColor: '#ead5a6', bubbleRadius: 4, fontWeight: 400, textColor: '#3b2412', nameColorMode: 'custom', nameColor: '#8f1d17' }, alerts: 'bounty', viewers: 'pill', followers: 'panel', followInk: '#3a2310', bar: '#e3a812' },
    { id: 'bubbly', name: 'Bubbly', look: 'Bright stickers and soft pinks', font: 'Nunito', bg: '#fff4fa', bubble: '#ffffff', ink: '#1d1d29', accent: '#ff5fa2',
      chat: { ...CHAT.soft, bubbleColor: '#ffffff', bubbleRadius: 22, fontWeight: 700, textColor: '#1d1d29', nameColorMode: 'custom', nameColor: '#d6336c' }, alerts: 'bubble', viewers: 'pill', followers: 'cards', counterInk: '#1d1d29', counterBg: '#ffffff', followInk: '#4b2358', bar: '#ff8fc0' },
    { id: 'clean', name: 'Clean', look: 'Quiet glass that sits on any game', font: 'Inter', bg: '#12121a', bubble: '#12121a', ink: '#ffffff', accent: '#8b5cf6',
      chat: { ...CHAT.glass, bubbleColor: '#12121a', bubbleRadius: 14, fontWeight: 500, textColor: '#ffffff' }, alerts: 'spotlight', viewers: 'minimal', followers: 'line', followInk: '#12121a', bar: '#8b5cf6' },
  ];

  /** The settings a pack changes (nothing else is touched: chats, alert switches, goals, sizes and positions stay). */
  // light boxes get one dark name colour (viewers' own colours are often pale); dark ones go back to each viewer's colour
  const patchOf = p => ({
    appearance: { nameColorMode: 'user', ...p.chat, font: p.font },
    alerts: { style: p.alerts, font: '', headline: '', textColor: '#ffffff' },
    viewers: { style: p.viewers, font: p.counterFont || p.font, textColor: p.counterInk || '#ffffff', accent: p.accent, background: p.counterBg || p.bg },
    followers: { style: p.followers, font: p.counterFont || p.font, textColor: '#ffffff', ink: p.followInk, barColor: p.bar, goalColor: '#ffe2bf' },
  });
  MG.PACKS = PACKS;
  MG.packPatch = patchOf;
  const isOn = (p, s) => s.alerts.style === p.alerts && s.appearance.font === p.font && s.viewers.style === p.viewers && s.followers.style === p.followers;
  const STYLE_NAME = id => (MG.ALERT_STYLES || []).find(x => x[0] === id)?.[1] || id;

  // the packs' fonts, so each card shows its own type
  let fontsAdded = false;
  function addFonts() {
    if (fontsAdded) return;
    fontsAdded = true;
    const fam = [...new Set(PACKS.map(p => p.font))].filter(f => f !== 'Inter').map(f => `family=${encodeURIComponent(f).replace(/%20/g, '+')}`).join('&');
    document.head.append(h('link', { rel: 'stylesheet', href: `https://fonts.googleapis.com/css2?${fam}&display=swap` }));
  }

  let undo = null; // { name, before }
  async function apply(p, note) {
    const s = MG.st.settings, patch = patchOf(p), before = {};
    for (const [sec, vals] of Object.entries(patch)) before[sec] = Object.fromEntries(Object.keys(vals).map(k => [k, s[sec][k]]));
    try {
      await MG.update('PUT', '/api/settings', patch);
      undo = { name: p.name, before };
      MG.render();
      MG.toast(`${p.name} pack applied`);
    } catch (e) { MG.toast(e.message, true); }
  }
  async function undoLast() {
    if (!undo) return;
    const u = undo;
    try { await MG.update('PUT', '/api/settings', u.before); undo = null; MG.render(); MG.toast(`Back to how it was before ${u.name}`); } catch (e) { MG.toast(e.message, true); }
  }

  /** The card: a little scene for each pack (chat line, alert word and a counter in its colours and font). */
  MG.packsCard = () => {
    addFonts();
    const s = MG.st.settings;
    const grid = h('div', { class: 'packs' }, ...PACKS.map(p => {
      const on = isOn(p, s);
      return h('button', { type: 'button', class: `pack ${on ? 'on' : ''}`, 'aria-pressed': String(on), onclick: () => apply(p),
        style: `--pk-bg:${p.bg};--pk-bub:${p.bubble};--pk-ink:${p.ink};--pk-acc:${p.accent};--pk-font:'${p.font}'` },
        h('div', { class: 'pk-scene', 'aria-hidden': 'true' },
          h('span', { class: 'pk-count' }, h('i'), '1.2K'),
          h('span', { class: 'pk-alert', text: STYLE_NAME(p.alerts) }),
          h('span', { class: 'pk-msg' }, h('b', { text: 'Nova' }), ' gg!')),
        h('b', { class: 'pk-name', text: p.name }),
        h('span', { class: 'pk-look', text: p.look }),
        h('span', { class: 'pk-alerts' }, icon('sparkle'), `${STYLE_NAME(p.alerts)} alerts`));
    }));
    const foot = undo ? h('div', { class: 'pack-undo' }, h('span', { text: `${undo.name} pack applied to the chat, alerts, viewer count and follower goals.` }),
      h('button', { type: 'button', class: 'btn ghost sm', onclick: undoLast }, icon('refresh'), 'Undo')) : null;
    return MG.card('Matching packs', 'One click gives your chat, alerts, viewer count and follower goals the same look. Your chats, switches, goals, sizes and positions stay as they are, and you can fine-tune everything after.', grid, foot);
  };
})();
