/* The getting-started tour: opens on first launch and from the Guide button. */
(() => {
  const { h, icon } = MG;
  const PLATS = ['youtube', 'twitch', 'kick', 'tiktok', 'facebook'];
  const mockMsg = (p, name, text) => h('div', { class: 'gm-msg', style: `--pc: var(--${p})` }, h('span', { class: 'gm-p' }, icon(p)), h('b', { text: name }), h('span', { text }));
  const GUIDE = [
    {
      title: 'Welcome to Mergio',
      text: 'Mergio puts the chats from YouTube, Twitch, Kick, TikTok and Facebook into one overlay for OBS. Gifts, subs, follows and Super Chats show up as alerts. This tour takes about a minute.',
      art: () => h('div', { class: 'ga-welcome' }, h('img', { src: '/shared/logo.svg', alt: '', width: 92, height: 92 }),
        h('div', { class: 'ga-orbit' }, ...PLATS.map((p, i) => h('span', { style: `--pc: var(--${p}); --i: ${i}` }, icon(p))))),
      points: () => ['Runs quietly in the background and uses very little memory.', 'Everything stays on your computer. No account needed.', 'The Home page always shows what to do next.'],
    },
    {
      title: '1. Add your chats',
      text: 'Open Chats, pick a platform and type your username (or paste any stream link), then press Enter. Add one for every platform you stream on.',
      art: () => h('div', { class: 'ga-connect' },
        h('div', { class: 'ga-input' }, icon('twitch'), h('span', { class: 'ga-typed', text: 'yourname' }), h('kbd', { text: 'Enter' })),
        h('div', { class: 'ga-src' }, h('span', { class: 'dot live' }), h('b', { text: 'yourname' }), h('span', { text: 'Connected' }))),
      points: () => ['Not live yet? No problem: chats connect by themselves when you go live.', 'Facebook needs a free token; Settings explains how.'],
    },
    {
      title: '2. Make it yours',
      text: 'On the Style page, pick a ready-made look and adjust the text size, colours and more. The preview on the right updates as you go.',
      art: () => h('div', { class: 'ga-chat' }, mockMsg('twitch', 'PixelPanda', 'this overlay looks clean'), mockMsg('tiktok', 'LunaByte', 'hello from TikTok!'), mockMsg('youtube', 'NovaRider', 'GG that was insane')),
      points: () => ['Alerts: show them in the chat or on their own overlay that you can place anywhere.', 'Send test (top right) shows sample messages at any time.'],
    },
    {
      title: '3. Add it to OBS',
      text: 'In OBS, click + under Sources, choose Browser, paste your overlay link and set the size to 500 × 800. The Add to OBS page turns green when it works.',
      art: () => h('div', { class: 'ga-obs' },
        h('div', { class: 'ga-win' }, h('i'), h('i'), h('i'), h('span', { text: 'Properties for "Mergio"' })),
        h('div', { class: 'ga-row' }, h('span', { text: 'URL' }), h('code', { class: 'hl', text: MG.st.overlayUrl })),
        h('div', { class: 'ga-row' }, h('span', { text: 'Width' }), h('code', { text: '500' }), h('span', { text: 'Height' }), h('code', { text: '800' }))),
      points: () => ['The link never changes, and style changes reach OBS instantly.'],
      action: () => h('button', { class: 'btn sm', onclick: () => MG.copy(MG.st.overlayUrl) }, icon('copy'), 'Copy overlay link'),
    },
    {
      title: "4. You're ready to go live",
      text: 'Keep Mergio running while you stream. Every alert names the platform it came from.',
      art: () => h('div', { class: 'ga-alert', style: '--pc: var(--tiktok)' },
        h('span', { class: 'ga-label' }, 'NEW FOLLOWER', h('em', {}, icon('tiktok'), 'on TikTok')),
        h('div', { class: 'ga-alert-body' }, h('span', { class: 'ga-av' }, icon('follow')), h('div', {}, h('b', { text: 'mochi_moo' }), h('span', { text: 'followed' })))),
      points: () => [MG.st.autostart?.supported ? 'Turn on Start with Windows (Settings) so the overlay is always ready.' : 'Open Mergio before you go live; chats connect by themselves.',
        'Install the control panel as an app (Settings) to open it in its own window.', 'Need this tour again? Click Guide at the top of any page.'],
    },
  ];

  MG.openGuide = function openGuide(start = 0) {
    document.querySelector('dialog.guide')?.remove();
    let i = start;
    const art = h('div', { class: 'g-art' });
    const body = h('div', { class: 'g-body' });
    const dots = h('div', { class: 'g-dots', role: 'tablist', 'aria-label': 'Tour steps' });
    const back = h('button', { class: 'btn ghost', onclick: () => show(i - 1) }, 'Back');
    const next = h('button', { class: 'btn primary', onclick: () => (i < GUIDE.length - 1 ? show(i + 1) : dlg.close()) });
    const dlg = h('dialog', { class: 'guide', 'aria-labelledby': 'g-title' },
      h('button', { class: 'icon-btn g-close', title: 'Close', 'aria-label': 'Close the tour', onclick: () => dlg.close() }, icon('plus')),
      art, body, h('div', { class: 'g-foot' }, dots, h('span', { style: 'flex:1' }), back, next));

    function show(n) {
      const dir = n >= i ? 1 : -1;
      i = Math.max(0, Math.min(GUIDE.length - 1, n));
      const s = GUIDE[i];
      art.textContent = ''; art.append(s.art());
      body.textContent = '';
      body.append(h('h2', { id: 'g-title', text: s.title }), h('p', { class: 'sub', text: s.text }),
        h('ul', { class: 'g-points' }, ...s.points().map(p => h('li', {}, icon('check'), h('span', { text: p })))));
      if (s.action) body.append(s.action());
      for (const el of [art, body]) { el.classList.remove('in-l', 'in-r'); void el.offsetWidth; el.classList.add(dir > 0 ? 'in-r' : 'in-l'); }
      dots.textContent = '';
      GUIDE.forEach((_, k) => dots.append(h('button', { class: k === i ? 'on' : '', role: 'tab', 'aria-selected': String(k === i), 'aria-label': `Step ${k + 1}`, onclick: () => show(k) })));
      back.style.visibility = i ? 'visible' : 'hidden';
      next.textContent = i === GUIDE.length - 1 ? 'Start using Mergio' : i ? 'Next' : "Let's go";
      next.focus();
    }
    dlg.addEventListener('close', () => {
      dlg.remove();
      if (!MG.st.settings.advanced.welcomeSeen) { MG.save('advanced', 'welcomeSeen', true); MG.go('home'); }
    });
    dlg.addEventListener('keydown', e => {
      if (e.target.closest('input, textarea')) return;
      if (e.key === 'ArrowRight' && i < GUIDE.length - 1) show(i + 1);
      if (e.key === 'ArrowLeft' && i > 0) show(i - 1);
    });
    document.body.append(dlg);
    dlg.showModal();
    show(i);
  };

  MG.on('ready', () => { if (!MG.st.settings.advanced.welcomeSeen) MG.openGuide(); });
})();
