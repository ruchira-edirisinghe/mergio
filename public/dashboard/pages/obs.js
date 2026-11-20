/* Add to OBS: live detection of the overlay plus step-by-step instructions. */
(() => {
  const { h, icon } = MG;

  function status() {
    const o = MG.overlays;
    if (o.obs) return h('div', { class: 'banner ok' }, icon('check'), h('div', {}, h('b', { text: 'Mergio is showing in OBS' }), h('span', { text: 'Your overlay is connected. Style changes appear in OBS instantly.' })));
    if (o.count) return h('div', { class: 'banner warn' }, icon('info'), h('div', {}, h('b', { text: 'The overlay is open, but not in OBS' }), h('span', { text: "It's open in a browser or another streaming app. If that's your streaming app, you're good to go." })));
    return h('div', { class: 'banner' }, icon('monitor'), h('div', {}, h('b', { text: 'Not in OBS yet' }), h('span', { text: 'Follow the steps below. This box turns green as soon as OBS shows the overlay.' })));
  }

  function render(c) {
    const st = MG.st;
    const url = st.overlayUrl;
    const dash = `http://localhost:${st.settings.advanced.port}/dashboard`;
    c.append(h('div', { id: 'obsStatus' }, status()));

    c.append(h('section', { class: 'card' }, h('h2', { text: 'Add the overlay to OBS' }),
      h('ol', { class: 'big-steps' },
        h('li', {}, h('b', { text: 'Copy your overlay link' }),
          h('div', { class: 'urlbox' }, h('code', { text: url }), h('button', { class: 'btn primary', onclick: () => MG.copy(url) }, icon('copy'), 'Copy link')),
          h('span', { class: 'hint', text: "This link never changes, so you only do this once." })),
        h('li', {}, h('b', { text: 'In OBS, add a Browser source' }),
          h('span', {}, 'Under ', h('b', { text: 'Sources' }), ' click ', h('kbd', { text: '+' }), ', choose ', h('b', { text: 'Browser' }), ', name it ', h('i', { text: 'Mergio' }), ' and click OK.')),
        h('li', {}, h('b', { text: 'Paste the link and set the size' }),
          h('span', {}, 'Paste into ', h('b', { text: 'URL' }), '. Set Width ', h('kbd', { text: '500' }), ' and Height ', h('kbd', { text: '800' }), ', then click OK.')),
        h('li', {}, h('b', { text: 'Place it on your scene' }),
          h('span', { text: 'Drag and resize the chat like any other source. Press "Send test" at the top to see it in action.' })))));

    c.append(h('section', { class: 'card' }, h('h2', { text: 'Control Mergio from inside OBS (optional)' }),
      h('p', { class: 'sub', text: 'Put this control panel in an OBS dock to read every chat and change settings without leaving OBS.' }),
      h('ol', { class: 'big-steps compact' },
        h('li', {}, h('span', {}, 'In OBS open ', h('b', { text: 'Docks → Custom Browser Docks…' }))),
        h('li', {}, h('span', {}, 'Name it ', h('b', { text: 'Mergio' }), ' and use this URL:'),
          h('div', { class: 'urlbox' }, h('code', { text: dash }), h('button', { class: 'btn sm', onclick: () => MG.copy(dash) }, icon('copy'), 'Copy'))),
        h('li', {}, h('span', {}, 'Click ', h('b', { text: 'Apply' }), '. Tip: the ', h('b', { text: 'Live chat' }), ' page fits a narrow dock nicely.')))));

    const scene = `${url}?fontSize=28&align=right`;
    c.append(h('details', { class: 'card fold' }, h('summary', {}, h('b', { text: 'Different look for one scene' }), h('span', { text: 'Bigger text in "Just Chatting", for example' })),
      h('p', { class: 'sub', text: 'Add options to the end of the link. They only change that one browser source:' }),
      h('div', { class: 'urlbox' }, h('code', { text: scene }), h('button', { class: 'btn sm', onclick: () => MG.copy(scene) }, icon('copy'), 'Copy')),
      h('p', { class: 'hint', text: 'Works with fontSize, theme (glass, neon, minimal, soft, retro), align, maxMessages, fadeMessages, hideAfter, scrollDirection, showAvatar and more.' })));

    c.append(h('details', { class: 'card fold' }, h('summary', {}, h('b', { text: 'Using Streamlabs, Meld, vMix or TikTok LIVE Studio?' }), h('span', { text: 'Same link, slightly different menus' })),
      h('p', { class: 'sub', text: 'Add a "Browser source" (Streamlabs, Meld), "Web Browser" input (vMix) or "Link" source (TikTok LIVE Studio) and paste the same overlay link.' })));

    c.append(h('details', { class: 'card fold' }, h('summary', {}, h('b', { text: 'The chat does not show up in OBS' }), h('span', { text: 'Quick fixes' })),
      h('ul', { class: 'checks' },
        h('li', { text: 'Make sure the URL in OBS is exactly your overlay link (copy it again above).' }),
        h('li', { text: 'Right-click the Browser source in OBS → Refresh.' }),
        h('li', { text: 'Press "Send test" at the top. If sample messages appear, the overlay works and chat shows up when people type.' }),
        h('li', { text: 'Keep Mergio running while you stream (it starts from the Mergio icon).' }))));
  }

  MG.page({ id: 'obs', order: 20, group: 'setup', label: 'Add to OBS', icon: 'monitor', title: 'Add to OBS', subtitle: 'Show the overlay on your stream',
    badge: () => (MG.overlays.obs ? { text: '✓', cls: 'good' } : null), render });
  MG.on('overlays', () => { const el = document.getElementById('obsStatus'); if (el) { el.textContent = ''; el.append(status()); } });
})();
