/* Home: a setup checklist for new users and an at-a-glance status board once everything works. */
(() => {
  const { h, icon } = MG;

  function steps() {
    const st = MG.st;
    return [
      { done: st.sources.length > 0, title: 'Add your chats', text: 'Paste your channel or live link for each platform you stream on.', action: 'Add a chat', go: 'chats' },
      { done: !!(st.settings.advanced.overlaySeen || MG.overlays.count), title: 'Put the overlay in OBS', text: 'Add one Browser source with your overlay link. Takes a minute.', action: 'Show me how', go: 'obs' },
      { done: !!st.settings.advanced.styleSeen, title: 'Choose a look', text: 'Pick a ready-made style, then tweak colours and sizes if you like.', action: 'Choose a style', go: 'style' },
    ];
  }

  function render(c) {
    const st = MG.st;
    const list = steps();
    const left = list.filter(s => !s.done).length;

    // ----- checklist (stays until everything is done) -----
    if (left) {
      c.append(h('section', { class: 'card hero checklist' },
        h('div', { class: 'hero-top' },
          h('div', {}, h('h2', { text: left === 3 ? "Let's get your chat on stream" : `Almost there: ${left} step${left > 1 ? 's' : ''} left` }),
            h('p', { class: 'sub', text: 'Follow these steps once. After that, Mergio works by itself every time you go live.' })),
          h('div', { class: 'progress', role: 'img', 'aria-label': `${3 - left} of 3 steps done` },
            h('b', { text: `${3 - left}/3` }), h('span', { style: `--p:${(3 - left) / 3}` }))),
        h('ol', { class: 'todo' }, ...list.map((s, i) => h('li', { class: s.done ? 'done' : '' },
          h('span', { class: 'num' }, s.done ? icon('check') : String(i + 1)),
          h('div', { class: 'tx' }, h('b', { text: s.title }), h('span', { text: s.done ? 'Done' : s.text })),
          s.done ? h('button', { class: 'btn ghost sm', onclick: () => MG.go(s.go), text: 'Open' })
            : h('button', { class: 'btn primary sm', onclick: () => MG.go(s.go) }, s.action, icon('play')))))));
    } else {
      c.append(h('section', { class: 'card hero ready' },
        h('div', { class: 'ready-ic' }, icon('check')),
        h('div', {}, h('h2', { text: "You're all set" }), h('p', { class: 'sub', text: 'Mergio connects to your chats and updates OBS by itself. Just go live.' }))));
    }

    // ----- status tiles -----
    const live = st.sources.filter(s => s.state === 'live' && s.enabled !== false).length;
    const msgs = st.sources.reduce((n, s) => n + (s.count || 0), 0);
    const ov = MG.overlays;
    c.append(h('div', { class: 'tiles' },
      tile('chat', 'Chats', st.sources.length ? `${live} of ${st.sources.length} connected` : 'None yet', live ? 'ok' : st.sources.length ? 'warn' : '', 'chats'),
      tile('eye', 'Overlay', ov.obs ? 'Showing in OBS' : ov.count ? 'Open in a browser' : 'Not open right now', ov.obs ? 'ok' : ov.count ? 'warn' : '', 'obs'),
      tile('sparkle', 'Messages', msgs ? `${msgs.toLocaleString()} this session` : 'Waiting for chat', msgs ? 'ok' : '', 'live')));

    // ----- your chats -----
    if (st.sources.length) {
      c.append(MG.card('Your chats', null,
        h('div', { class: 'mini-list' }, ...st.sources.map(s => {
          const d = MG.describe(s);
          return h('button', { class: 'mini', style: `--pc: var(--${s.platform})`, onclick: () => MG.go('chats') },
            h('span', { class: 'logo' }, icon(s.platform)),
            h('span', { class: 'nm', text: s.channel || s.label }),
            h('span', { class: `pill ${d.tone}`, text: d.label }));
        })),
        h('div', { class: 'row-end' }, h('button', { class: 'btn ghost sm', onclick: () => MG.go('chats') }, icon('plus'), 'Add another chat'))));
    }

    // ----- helpful extras -----
    const tips = [];
    if (st.autostart?.supported && !st.autostart.enabled) tips.push(h('div', { class: 'tip' }, icon('power'),
      h('div', {}, h('b', { text: 'Start Mergio with Windows' }), h('span', { text: 'Then the overlay is ready whenever you open OBS.' })),
      h('button', { class: 'btn sm', onclick: async () => { try { await MG.update('POST', '/api/autostart', { enabled: true }); MG.toast('Mergio will start with Windows'); MG.render(); } catch (e) { MG.toast(e.message, true); } } }, 'Turn on')));
    if (MG.install?.available()) tips.push(h('div', { class: 'tip' }, icon('download'),
      h('div', {}, h('b', { text: 'Install the control panel as an app' }), h('span', { text: 'Opens in its own window, with its own icon on your taskbar.' })),
      h('button', { class: 'btn sm', onclick: () => MG.install.prompt() }, 'Install')));
    tips.push(h('div', { class: 'tip' }, icon('sparkle'),
      h('div', {}, h('b', { text: 'See how alerts look' }), h('span', { text: 'Sends sample messages, gifts and subs to the overlay and the preview.' })),
      h('button', { class: 'btn sm', onclick: () => { MG.test('burst'); MG.toast('Sample messages sent'); } }, 'Send test')));
    c.append(MG.card('Tips', null, h('div', { class: 'tips' }, ...tips)));
  }

  function tile(ic, label, value, tone, go) {
    return h('button', { class: `tile ${tone}`, onclick: () => MG.go(go) },
      h('span', { class: 'ic' }, icon(ic)), h('span', { class: 'k', text: label }), h('b', { text: value }));
  }

  MG.page({ id: 'home', order: 0, group: '', label: 'Home', icon: 'home', title: 'Home', subtitle: 'Your setup and what Mergio is doing right now', render });
  for (const ev of ['sources', 'overlays', 'saved']) MG.on(ev, () => MG.refreshIf('home'));
})();
