/* Facebook token guide: a step-by-step popup. Each step has a picture of the Facebook screen with the
   button to press highlighted, short instructions, and a button that opens the right Facebook page.
   The last step checks the pasted token and saves it. */
(() => {
  const { h, icon } = MG;
  const URL = {
    create: 'https://developers.facebook.com/apps/creation/',
    apps: 'https://developers.facebook.com/apps/',
    explorer: 'https://developers.facebook.com/tools/explorer/',
    debugger: 'https://developers.facebook.com/tools/debug/accesstoken/',
  };

  /** The Page name from the user's Facebook chat (page:name), so the example is their own. */
  const pageName = () => {
    const s = (MG.st.sources || []).find(x => x.platform === 'facebook' && String(x.target).startsWith('page:'));
    const slug = s && s.target.slice(5);
    return slug && slug !== 'me' ? slug : 'yourpage';
  };

  /* ---------- little drawing kit for the pictures ---------- */
  const SVG = 'http://www.w3.org/2000/svg';
  const pointer = () => {
    const s = document.createElementNS(SVG, 'svg');
    s.setAttribute('viewBox', '0 0 24 24'); s.setAttribute('class', 'fw-cursor'); s.setAttribute('aria-hidden', 'true');
    const p = document.createElementNS(SVG, 'path');
    p.setAttribute('d', 'M5 2.5l14.5 8.6-6.3 1.6 3.6 6.4-2.6 1.5-3.6-6.4L6 18.7z');
    s.append(p);
    return s;
  };
  /** Marks the thing to click: a pulsing ring and a pointer. */
  const hl = el => { el.classList.add('fw-hl'); el.append(pointer()); return el; };
  const win = (url, ...body) => h('div', { class: 'fw-win' },
    h('div', { class: 'fw-bar' }, h('i'), h('i'), h('i'), h('span', { class: 'fw-url', text: url })),
    h('div', { class: 'fw-page' }, ...body));
  const btn = (text, cls = '') => h('span', { class: `fw-btn ${cls}` }, text);
  const tick = (text, on = true) => h('div', { class: `fw-tick${on ? ' on' : ''}` }, h('span', { class: 'box' }, on ? icon('check') : null), h('span', { text }));
  const radio = (text, on) => h('div', { class: `fw-radio${on ? ' on' : ''}` }, h('span', { class: 'dot' }), h('span', { text }));
  const chip = text => h('code', { class: 'fw-chip', text });

  /** Turns "Click **Next**" into text with the bold parts. */
  const rich = s => String(s).split(/\*\*(.+?)\*\*/).map((part, i) => (i % 2 ? h('b', { text: part }) : part));
  const copyBtn = (text, label = 'Copy') => h('button', { type: 'button', class: 'fw-copy', onclick: async e => {
    try { await navigator.clipboard.writeText(text); } catch { window.prompt('Copy this:', text); return; }
    const b = e.currentTarget; b.classList.add('done'); b.lastChild.textContent = 'Copied';
    setTimeout(() => { b.classList.remove('done'); b.lastChild.textContent = label; }, 1600);
  } }, icon('copy'), h('span', { text: label }));
  const openBtn = (href, text) => h('a', { class: 'btn primary sm', href, target: '_blank', rel: 'noopener' }, icon('external'), text);

  /* ---------- the steps ---------- */
  /** Built when the guide opens, so the examples use the Page from your Facebook chat. */
  const steps = () => [
    {
      title: 'Connect your Facebook Page',
      text: 'Facebook only lets Mergio read your live comments with a free key called a Page token. You make it once, and it takes about 5 minutes.',
      art: () => h('div', { class: 'fw-intro' },
        h('span', { class: 'fw-tile fb' }, icon('facebook')), h('span', { class: 'fw-flow' }, h('i'), h('i'), h('i')),
        h('span', { class: 'fw-tile key' }, h('b', { text: 'EA…' }), h('small', { text: 'Page token' })), h('span', { class: 'fw-flow' }, h('i'), h('i'), h('i')),
        h('span', { class: 'fw-tile mg' }, h('img', { src: '/shared/logo.svg', alt: '' }))),
      todo: ['Use a **computer** (not your phone).', 'Log in to Facebook with the account that **manages your Page**.', 'Keep this window open. Every step has a button that opens the right Facebook page.'],
    },
    {
      title: 'Create a free app',
      text: 'Facebook only gives tokens to apps, so you make your own. Only you can see it.',
      art: () => win('developers.facebook.com/apps/creation',
        h('div', { class: 'fw-h', text: 'Create an app' }),
        h('div', { class: 'fw-field' }, h('small', { text: 'App name' }), h('span', { class: 'fw-input', text: 'Mergio' })),
        h('div', { class: 'fw-card on' }, h('span', { class: 'box' }, icon('check')), h('div', {}, h('b', { text: 'Manage everything on your Page' }), h('small', { text: 'Content management' }))),
        h('div', { class: 'fw-row end' }, hl(btn('Create app', 'blue')))),
      todo: ['Click **Open Meta for Developers** below and log in. If it asks you to register, follow it (it\'s free).',
        'App name: type **Mergio**, then click **Next**.',
        'Under **Content management**, tick **Manage everything on your Page**, then **Next**.',
        'Choose **I don\'t want to connect a business portfolio yet**, then **Next**, **Next** and **Create app**.',
        'If Facebook asks for your password, type it.'],
      actions: () => [openBtn(URL.create, 'Open Meta for Developers'), copyBtn('Mergio', 'Copy app name')],
    },
    {
      title: 'Switch on the permissions',
      text: 'This lets your app read your Page\'s live videos and their comments. Nothing else.',
      art: () => win('developers.facebook.com/apps › Use cases › Customize',
        h('div', { class: 'fw-h', text: 'Permissions and features' }),
        ...['pages_read_engagement', 'pages_read_user_content', 'Live Video API', 'Business Asset User Profile Access'].map((p, i) =>
          h('div', { class: 'fw-perm' }, h('span', { text: p }), i === 0 ? hl(btn('+ Add', 'line')) : btn(i === 1 ? 'Ready for testing' : '+ Add', i === 1 ? 'ok' : 'line')))),
      todo: ['In your new app, click **Use cases** on the left.',
        'Next to **Manage everything on your Page**, click **Customize**.',
        ['Click **Add** next to each of these 4:', h('span', { class: 'fw-chips' }, chip('pages_read_engagement'), chip('pages_read_user_content'), chip('Live Video API'), chip('Business Asset User Profile Access'))],
        'Each one now says **Ready for testing**.'],
      actions: () => [openBtn(URL.apps, 'Open my apps')],
    },
    {
      title: 'Make a token',
      text: 'The Graph API Explorer is Facebook\'s tool for making tokens.',
      art: () => win('developers.facebook.com/tools/explorer',
        h('div', { class: 'fw-side' },
          h('div', { class: 'fw-field' }, h('small', { text: 'Meta App' }), h('span', { class: 'fw-input sel', text: 'Mergio' })),
          h('div', { class: 'fw-field' }, h('small', { text: 'Permissions' }),
            h('span', { class: 'fw-chips' }, chip('pages_show_list'), chip('pages_read_engagement'), chip('pages_read_user_content'))),
          hl(btn('Generate Access Token', 'blue wide')))),
      todo: ['Click **Open Graph API Explorer** below.',
        'On the right, under **Meta App**, choose **Mergio**.',
        ['Click **Add a Permission** and tick these 3:', h('span', { class: 'fw-chips' }, chip('pages_show_list'), chip('pages_read_engagement'), chip('pages_read_user_content'))],
        'Click **Generate Access Token**.'],
      actions: () => [openBtn(URL.explorer, 'Open Graph API Explorer')],
    },
    {
      title: 'Allow your Page',
      text: 'A Facebook window pops up and asks which Page Mergio may use.',
      art: () => h('div', { class: 'fw-pop' },
        h('div', { class: 'fw-h', text: 'Choose the Pages you want Mergio to access' }),
        radio('Opt in to all current and future Pages', false),
        radio('Opt in to current Pages only', true),
        h('div', { class: 'fw-pages' }, tick('Another Page', false), tick('Your Page', true)),
        h('div', { class: 'fw-row end' }, btn('Back', 'line'), hl(btn('Continue', 'blue')))),
      todo: ['Click **Continue**. If it says **Switching accounts**, click **Continue** there too.',
        'Choose **Opt in to current Pages only**.',
        'Tick **your Page** (only that one), then click **Continue**.',
        'Click **Save**, then **Got it**. The window closes and a token shows up in the Explorer.'],
    },
    {
      title: 'Make the token last',
      text: 'The token you just made stops working after an hour. This swaps it for one that lasts.',
      art: () => win('developers.facebook.com/tools/debug/accesstoken',
        h('div', { class: 'fw-row' }, h('span', { class: 'fw-input grow', text: 'EAAGx7Qp2ZBw…' }), btn('Debug', 'blue')),
        h('div', { class: 'fw-info' }, h('span', { text: 'Type' }), h('b', { text: 'User' }), h('span', { text: 'Expires' }), h('b', { text: 'in about an hour' })),
        h('div', { class: 'fw-row' }, hl(btn('Extend Access Token', 'line'))),
        h('div', { class: 'fw-new' }, h('small', { text: 'This new long-lived access token will expire on…' }), h('code', { text: 'EAAGx7Qp2ZBwLk9…' }))),
      todo: ['In the Explorer, click the **copy** icon next to the token.',
        'Click **Open Access Token Debugger** below, paste the token and click **Debug**.',
        'Scroll down and click **Extend Access Token**.',
        'Copy the **new token** that appears under that button.'],
      actions: () => [openBtn(URL.debugger, 'Open Access Token Debugger')],
    },
    {
      title: 'Get your Page\'s token',
      text: 'Last step on Facebook: swap your new token for your Page\'s own token, which never expires.',
      art: () => win('developers.facebook.com/tools/explorer',
        h('div', { class: 'fw-row' }, btn('GET', 'line'), hl(h('span', { class: 'fw-input grow mono', text: `${pageName()}?fields=access_token` })), btn('Submit', 'blue')),
        h('pre', { class: 'fw-json' }, '{\n  ', h('span', { class: 'k', text: '"access_token"' }), ': ', h('span', { class: 'v', text: '"EAAGx7Qp2ZBw…"' }), ',\n  "id": "1234567890…"\n}')),
      todo: ['Go back to the **Graph API Explorer**.',
        'Paste the long-lasting token into the **Access Token** box on the right, replacing what\'s there.',
        ['In the bar at the top, delete what\'s there and type:', h('span', { class: 'fw-code' }, h('code', { text: `${pageName()}?fields=access_token` }), copyBtn(`${pageName()}?fields=access_token`))],
        pageName() === 'yourpage' ? 'Use your Page\'s name from its link (facebook.com/**yourpage**).' : `That's your Page name from your Facebook chat. Use another one if your Page is different.`,
        'Click **Submit**, then copy the long text after **"access_token"** (without the quotes).'],
      actions: () => [openBtn(URL.explorer, 'Open Graph API Explorer')],
    },
    {
      title: 'Paste it into Mergio',
      text: 'Mergio checks the token with Facebook, then saves it on this computer.',
      art: () => h('div', { class: 'fw-done-art' },
        h('span', { class: 'fw-tile fb' }, icon('facebook')),
        h('span', { class: 'fw-link' }, icon('check')),
        h('span', { class: 'fw-tile mg' }, h('img', { src: '/shared/logo.svg', alt: '' }))),
      todo: [],
      form: true,
    },
  ];

  /* ---------- the last step: check and save ---------- */
  function tokenForm(onSaved) {
    const input = h('input', { type: 'password', class: 'fw-token', placeholder: 'Paste the Page token here (it starts with EA)', autocomplete: 'off', spellcheck: 'false', 'aria-label': 'Facebook Page token' });
    const show = h('button', { type: 'button', class: 'icon-btn', title: 'Show or hide', 'aria-label': 'Show or hide the token', onclick: () => { input.type = input.type === 'password' ? 'text' : 'password'; } }, icon('eye'));
    const result = h('div', { class: 'fw-result', role: 'status' });
    const go = h('button', { type: 'button', class: 'btn primary', onclick: check }, icon('check'), 'Check and save');
    async function check() {
      const token = input.value.trim().replace(/^["']|["']$/g, '');
      if (!token) { input.focus(); return; }
      go.disabled = true; result.className = 'fw-result wait'; result.textContent = 'Checking with Facebook…';
      try {
        const r = await MG.api('POST', '/api/facebook/check', { token });
        if (!r.ok) { result.className = 'fw-result bad'; result.replaceChildren(icon('info'), h('span', { text: r.message })); return; }
        await MG.update('PUT', '/api/settings', { advanced: { facebookAccessToken: token } });
        result.className = 'fw-result good';
        result.replaceChildren(icon('check'), h('span', {}, h('b', { text: `All set! This is the Page token for ${r.name || 'your Page'}. ` }),
          r.expires ? `It expires on ${new Date(r.expires * 1000).toLocaleDateString()}.` : 'It never expires.'));
        input.value = '';
        onSaved(r);
      } catch (e) { result.className = 'fw-result bad'; result.replaceChildren(icon('info'), h('span', { text: e.message })); }
      finally { go.disabled = false; }
    }
    input.addEventListener('keydown', e => { if (e.key === 'Enter') check(); });
    const has = !!MG.st.settings.advanced.facebookAccessToken;
    return h('div', { class: 'fw-form' },
      has ? h('p', { class: 'hint', text: 'A token is already saved. Pasting a new one replaces it.' }) : null,
      h('div', { class: 'fw-paste' }, input, show), go, result);
  }

  /* ---------- the popup ---------- */
  MG.openFbGuide = function openFbGuide(start = 0) {
    document.querySelector('dialog.fbw')?.remove();
    let i = start;
    const STEPS = steps();
    const art = h('div', { class: 'g-art fw-art' });
    const body = h('div', { class: 'g-body' });
    const dots = h('div', { class: 'g-dots', role: 'tablist', 'aria-label': 'Steps' });
    const back = h('button', { class: 'btn ghost', onclick: () => show(i - 1) }, 'Back');
    const next = h('button', { class: 'btn primary', onclick: () => (i < STEPS.length - 1 ? show(i + 1) : dlg.close()) });
    const dlg = h('dialog', { class: 'guide fbw', 'aria-labelledby': 'fw-title' },
      h('button', { class: 'icon-btn g-close', title: 'Close', 'aria-label': 'Close the guide', onclick: () => dlg.close() }, icon('plus')),
      art, body, h('div', { class: 'g-foot' }, dots, h('span', { style: 'flex:1' }), back, next));

    function show(n) {
      const dir = n >= i ? 1 : -1;
      i = Math.max(0, Math.min(STEPS.length - 1, n));
      const s = STEPS[i];
      art.replaceChildren(s.art());
      const label = i === 0 ? 'Before you start' : `Step ${i} of ${STEPS.length - 1}`;
      body.replaceChildren(...[
        h('span', { class: 'fw-step', text: label }),
        h('h2', { id: 'fw-title', text: s.title }), h('p', { class: 'sub', text: s.text }),
        s.todo.length ? h(i === 0 ? 'ul' : 'ol', { class: `fw-todo${i === 0 ? ' plain' : ''}` }, ...s.todo.map(t => h('li', {}, ...(Array.isArray(t) ? [rich(t[0]), ...t.slice(1)] : rich(t))))) : null,
        s.actions ? h('div', { class: 'fw-actions' }, ...s.actions()) : null,
        s.form ? tokenForm(() => { next.textContent = 'Done'; next.focus(); }) : null].filter(Boolean));
      for (const el of [art, body]) { el.classList.remove('in-l', 'in-r'); void el.offsetWidth; el.classList.add(dir > 0 ? 'in-r' : 'in-l'); }
      dots.replaceChildren(...STEPS.map((_, k) => h('button', { class: k === i ? 'on' : '', role: 'tab', 'aria-selected': String(k === i), 'aria-label': k ? `Step ${k}` : 'Before you start', onclick: () => show(k) })));
      back.style.visibility = i ? 'visible' : 'hidden';
      next.textContent = i === STEPS.length - 1 ? 'Close' : i ? 'Next step' : 'Start';
      if (s.form) body.querySelector('.fw-token').focus(); else next.focus();
      body.scrollTop = 0; dlg.scrollTop = 0;
    }
    dlg.addEventListener('close', () => { dlg.remove(); MG.render?.(); });
    dlg.addEventListener('keydown', e => {
      if (e.target.closest('input, textarea')) return;
      if (e.key === 'ArrowRight' && i < STEPS.length - 1) show(i + 1);
      if (e.key === 'ArrowLeft' && i > 0) show(i - 1);
    });
    document.body.append(dlg);
    dlg.showModal();
    show(i);
  };

  /** The "Show me how" box used on Settings, Help and Chats. */
  MG.fbGuideCallout = (compact = false) => h('div', { class: `fw-callout${compact ? ' compact' : ''}` },
    h('span', { class: 'fw-tile fb sm' }, icon('facebook')),
    h('div', {}, h('b', { text: MG.st.settings.advanced.facebookAccessToken ? 'Need a new Facebook token?' : 'No Facebook token yet?' }),
      h('span', { text: 'Follow 7 short steps with pictures. About 5 minutes, free.' })),
    h('button', { type: 'button', class: 'btn primary sm', onclick: () => MG.openFbGuide() }, 'Show me how'));
})();
