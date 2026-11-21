/* Add to OBS: the overlays (chat, alerts and the optional counters), live detection, and step-by-step instructions. */
(() => {
  const { h, icon } = MG;
  const alertsOn = () => MG.st.settings.alerts.placement !== 'chat';

  function status() {
    const o = MG.overlays, a = o.alerts || {};
    if (o.obs && alertsOn() && !a.obs) return h('div', { class: 'banner warn' }, icon('info'), h('div', {}, h('b', { text: 'The chat is in OBS. Add the alerts overlay too' }), h('span', { text: 'Alerts are set to show on their own overlay, so add it as a second Browser source (see below).' })));
    if (o.obs) return h('div', { class: 'banner ok' }, icon('check'), h('div', {}, h('b', { text: 'Mergio is showing in OBS' }), h('span', { text: alertsOn() ? 'Both overlays are connected. Changes appear in OBS instantly.' : 'Your overlay is connected. Style changes appear in OBS instantly.' })));
    if (o.count) return h('div', { class: 'banner warn' }, icon('info'), h('div', {}, h('b', { text: 'The overlay is open, but not in OBS' }), h('span', { text: "It's open in a browser or another streaming app. If that's your streaming app, you're good to go." })));
    return h('div', { class: 'banner' }, icon('monitor'), h('div', {}, h('b', { text: 'Not in OBS yet' }), h('span', { text: 'Follow the steps below. This box turns green as soon as OBS shows the overlay.' })));
  }

  /** Status pill for one overlay: in OBS, open elsewhere, or not added. */
  function pill(o, off) {
    if (off) return h('span', { class: 'pill' }, 'Off');
    if (o?.obs) return h('span', { class: 'pill live' }, h('span', { class: 'dot' }), 'In OBS');
    if (o?.count) return h('span', { class: 'pill waiting' }, h('span', { class: 'dot' }), 'Open, not in OBS');
    return h('span', { class: 'pill' }, h('span', { class: 'dot' }), 'Not added yet');
  }

  /** One overlay card: what it is, its link and the size to use in OBS. */
  function overlayCard({ cls, ic, title, text, o, url, name, w, ht, off, extra }) {
    return h('section', { class: `card ov ${cls} ${off ? 'off' : ''}` },
      h('div', { class: 'ov-h' }, h('span', { class: 'ov-ic' }, icon(ic)), h('div', {}, h('h2', {}, title, pill(o, off)), h('p', { class: 'sub', text }))),
      off ? extra : h('div', { class: 'ov-b' },
        h('div', { class: 'urlbox' }, h('code', { text: url }), h('button', { class: 'btn primary', onclick: () => MG.copy(url) }, icon('copy'), 'Copy link')),
        h('div', { class: 'ov-meta' }, h('span', {}, 'Name it ', h('i', { text: name })), h('span', {}, 'Size ', h('kbd', { text: String(w) }), ' × ', h('kbd', { text: String(ht) }))),
        extra || null));
  }

  function overlays() {
    const st = MG.st;
    const on = alertsOn();
    const turnOn = (id, msg) => { MG.save('alerts', 'placement', id); MG.render(); MG.toast(msg); };
    return h('div', { class: 'ovs', id: 'obsOverlays' },
      overlayCard({ cls: 'ov-chat', ic: 'chat', title: 'Chat overlay', text: 'Every chat in one box.' + (on ? '' : ' Alerts show inside it too.'), o: MG.overlays, url: st.overlayUrl, name: 'Mergio', w: 500, ht: 800 }),
      overlayCard({ cls: 'ov-alerts', ic: 'bell', title: 'Alerts overlay', text: 'Subs, gifts and Super Chats pop up big, anywhere you place it on your scene.', o: MG.overlays.alerts, url: st.alertsUrl, name: 'Mergio Alerts', w: 800, ht: 500, off: !on,
        extra: on
          ? h('div', { class: 'ov-meta' }, h('span', { text: st.settings.alerts.placement === 'both' ? 'Alerts also show as a small line in the chat.' : 'The chat stays clean: alerts only show here.' }),
            h('a', { href: '#alerts', onclick: e => { e.preventDefault(); MG.go('alerts'); } }, 'Change'))
          : h('div', { class: 'ov-b' },
            h('p', { class: 'hint', text: 'Off right now: alerts show inside the chat. Turn it on to give them their own spot on your stream.' }),
            h('div', { class: 'btn-row' },
              h('button', { class: 'btn primary', onclick: () => turnOn('overlay', 'Alerts overlay is on. Copy its link and add it to OBS.') }, icon('bell'), 'Turn on alerts overlay'),
              h('button', { class: 'btn ghost', onclick: () => turnOn('both', 'Alerts show in the chat and on their own overlay') }, 'Use both'))) }),
      ...counterCards());
  }

  /** The optional counter overlays, each linking to its own page. */
  function counterCards() {
    const st = MG.st;
    const more = (id, label) => h('div', { class: 'ov-meta' }, h('span', { text: 'Optional. Add it only if you want it on stream.' }),
      h('a', { href: `#${id}`, onclick: e => { e.preventDefault(); MG.go(id); } }, label));
    return [
      overlayCard({ cls: 'ov-viewers', ic: 'raid', title: 'Viewer count', text: 'How many people watch right now, in total and on each platform.', o: MG.overlays.viewers, url: st.viewersUrl, name: 'Mergio Viewers', w: 800, ht: 200, extra: more('viewers', 'Pick a style') }),
      overlayCard({ cls: 'ov-followers', ic: 'target', title: 'Follower goals', text: 'Your follower counts with goals and progress bars.', o: MG.overlays.followers, url: st.followersUrl, name: 'Mergio Followers', w: 1000, ht: 300, extra: more('followers', 'Pick a style') }),
    ];
  }

  function render(c) {
    const st = MG.st;
    const url = st.overlayUrl;
    const dash = `http://localhost:${st.settings.advanced.port}/dashboard`;
    const two = alertsOn();
    c.append(h('div', { id: 'obsStatus' }, status()));
    c.append(h('h2', { class: 'section-h', text: 'Your overlays' }));
    c.append(overlays());

    c.append(h('section', { class: 'card' }, h('h2', { text: two ? 'Add each overlay to OBS' : 'Add the overlay to OBS' }),
      two ? h('p', { class: 'sub', text: 'Do these steps twice: once for the chat overlay and once for the alerts overlay.' }) : null,
      h('ol', { class: 'big-steps' },
        h('li', {}, h('b', { text: 'Copy the overlay link' }),
          h('span', { text: 'Use the Copy link button above. Links never change, so you only do this once.' })),
        h('li', {}, h('b', { text: 'In OBS, add a Browser source' }),
          h('span', {}, 'Under ', h('b', { text: 'Sources' }), ' click ', h('kbd', { text: '+' }), ', choose ', h('b', { text: 'Browser' }), ', give it the name shown above and click OK.')),
        h('li', {}, h('b', { text: 'Paste the link and set the size' }),
          h('span', {}, 'Paste into ', h('b', { text: 'URL' }), ' and set Width and Height to the size shown above, then click OK.')),
        h('li', {}, h('b', { text: 'Place it on your scene' }),
          h('span', { text: two ? 'Drag and resize each overlay like any other source, for example the chat on the side and alerts at the top middle. The alerts overlay is see-through until an alert comes in.' : 'Drag and resize the chat like any other source. Press "Send test" at the top to see it in action.' })))));

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

  // highlighted in the sidebar; it pulses until OBS shows the chat overlay
  MG.page({ id: 'obs', order: 20, group: 'setup', highlight: () => (MG.overlays.obs ? 'done' : 'todo'), label: 'Add to OBS', icon: 'monitor', title: 'Add to OBS', subtitle: 'Show the overlay on your stream',
    badge: () => (MG.overlays.obs && (!MG.st || !alertsOn() || MG.overlays.alerts?.obs) ? { text: '✓', cls: 'good' } : null), render });
  MG.on('overlays', () => {
    const el = document.getElementById('obsStatus'); if (el) { el.textContent = ''; el.append(status()); }
    const ov = document.getElementById('obsOverlays'); if (ov) ov.replaceWith(overlays());
  });
})();
