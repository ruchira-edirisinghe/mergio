/* Chats: add a chat by picking a platform (or pasting any link) and manage the connected ones. */
(() => {
  const { h, icon } = MG;
  let picked = null; // platform id chosen with a tile, or null for "paste any link"

  function guess(v) {
    v = v.toLowerCase();
    if (/youtu\.?be|^yt:/.test(v)) return 'youtube';
    if (/twitch\.tv|^tw(itch)?:/.test(v)) return 'twitch';
    if (/kick\.com|^kick:/.test(v)) return 'kick';
    if (/tiktok\.com|^t(iktok|t):/.test(v)) return 'tiktok';
    if (/facebook\.com|fb\.watch|^fb:/.test(v)) return 'facebook';
    return null;
  }

  function render(c) {
    const st = MG.st;
    const P = MG.PLATFORMS.find(p => p.id === picked);
    const input = h('input', { type: 'text', autocomplete: 'off', spellcheck: 'false', 'aria-label': P ? P.ask : 'Live stream or channel link',
      placeholder: P ? `${P.ask}, e.g. ${P.example}` : 'Paste a link from YouTube, Twitch, Kick, TikTok or Facebook' });
    const det = h('span', { class: 'det' }, P ? MG.colorIcon(P.id) : icon('link'));
    const err = h('div', { class: 'form-err', role: 'alert' });
    const btn = h('button', { class: 'btn primary' }, icon('plus'), 'Add chat');
    input.addEventListener('input', () => {
      if (P) return;
      const g = guess(input.value);
      det.textContent = ''; det.append(g ? MG.colorIcon(g) : icon('link'));
      err.textContent = '';
    });
    const submit = async () => {
      let v = input.value.trim();
      if (!v) { input.focus(); err.textContent = P ? `Type ${P.ask.toLowerCase()} first.` : 'Paste a link first.'; return; }
      // With a platform picked, a bare username is enough.
      if (P && P.prefix && !/[./:]/.test(v.replace(/^@/, ''))) v = P.prefix + v;
      btn.disabled = true;
      try {
        await MG.update('POST', '/api/sources', { input: v });
        input.value = '';
        MG.toast('Chat added! Messages appear as soon as people type.');
        MG.render(); MG.updateSummary();
      } catch (e) { err.textContent = friendlyAddError(e.message); }
      finally { btn.disabled = false; }
    };
    input.addEventListener('keydown', e => { if (e.key === 'Enter') submit(); });
    btn.addEventListener('click', submit);

    const tiles = h('div', { class: 'ptiles', role: 'radiogroup', 'aria-label': 'Platform' },
      h('button', { class: `ptile ${!picked ? 'on' : ''}`, role: 'radio', 'aria-checked': String(!picked), onclick: () => { picked = null; MG.render(); } }, icon('link'), h('span', { text: 'Any link' })),
      ...MG.PLATFORMS.map(p => h('button', { class: `ptile ${picked === p.id ? 'on' : ''}`, role: 'radio', 'aria-checked': String(picked === p.id), style: `--pc: var(--${p.id})`,
        onclick: () => { picked = p.id; MG.render(); } }, MG.colorIcon(p.id), h('span', { text: p.name }))));

    const note = picked === 'facebook' && !st.settings.advanced.facebookAccessToken
      ? h('div', { class: 'note warn' }, icon('info'), h('span', {}, 'Facebook needs a free Page token before it can read comments. ', h('a', { href: '#settings', onclick: e => { e.preventDefault(); MG.go('settings'); } }, 'Add it in Settings'), '.'))
      : picked === 'youtube' ? h('div', { class: 'note' }, icon('info'), h('span', { text: 'Tip: use your channel link (youtube.com/@you). Mergio then finds your stream by itself every time you go live.' }))
      : picked === 'tiktok' ? h('div', { class: 'note' }, icon('info'), h('span', { text: 'TikTok connects while you are LIVE. Add it now and it connects as soon as you start.' }))
      : picked === 'facebook' ? h('div', { class: 'note' }, icon('info'), h('span', { text: 'Tip: add your Page (facebook.com/yourpage) once. Mergio then finds your live video by itself every time you go live.' }))
      : null;

    c.append(h('section', { class: 'card hero' },
      h('h2', { text: 'Add a chat' }),
      h('p', { class: 'sub', text: 'Choose a platform and type your username, or paste any stream or channel link. Add one for every platform you stream on.' }),
      tiles,
      h('div', { class: 'connect' }, h('div', { class: 'field' }, det, input), btn),
      err, note));

    const wrap = h('div', { class: 'sources' });
    c.append(MG.card('Your chats', st.sources.length ? 'Each chat reconnects by itself if the connection drops.' : null, wrap));
    fill(wrap);
    setTimeout(() => input.focus(), 50);
  }

  function friendlyAddError(msg) {
    if (/already/i.test(msg)) return 'That chat is already in your list.';
    if (/does not look like a link|not supported yet/i.test(msg)) return "That doesn't look like a YouTube, Twitch, Kick, TikTok or Facebook link. Pick the platform above and type just your username.";
    return msg;
  }

  function fill(wrap) {
    const st = MG.st;
    wrap.textContent = '';
    if (!st.sources.length) {
      wrap.append(h('div', { class: 'empty' }, icon('chat'),
        h('b', { text: 'No chats yet' }),
        h('span', { text: 'Add your first one above. You can add as many platforms as you like.' })));
      return;
    }
    for (const s of st.sources) {
      const d = MG.describe(s);
      const paused = s.enabled === false;
      wrap.append(h('div', { class: `src ${d.tone}`, style: `--pc: var(--${s.platform})` },
        h('div', { class: 'logo' }, icon(s.platform)),
        h('div', { class: 'info' },
          h('div', { class: 'nm' }, h('span', { text: s.channel || s.label }), h('small', { text: MG.pname(s.platform) }), s.count ? h('span', { class: 'pill-n', text: `${s.count.toLocaleString()} messages` }) : null),
          h('div', { class: 'meta' }, h('span', { class: `pill ${d.tone}` }, h('span', { class: 'dot' }), d.label), h('span', { class: 'd', title: s.detail || '', text: d.text }),
            d.fix ? h('a', { href: `#${d.fix}`, onclick: e => { e.preventDefault(); MG.go(d.fix); }, text: 'Fix it' }) : null)),
        h('div', { class: 'acts' },
          act(paused ? 'play' : 'pause', paused ? 'Resume' : 'Pause', async () => { await MG.update('POST', `/api/sources/${s.id}/enabled`, { enabled: paused }); MG.render(); MG.updateSummary(); }),
          act('refresh', 'Reconnect', async () => { await MG.update('POST', `/api/sources/${s.id}/reconnect`, {}); MG.toast('Reconnecting…'); }),
          act('trash', 'Remove', async () => {
            if (!await MG.confirm({ title: `Remove ${s.channel || s.label}?`, text: `Mergio stops reading this ${MG.pname(s.platform)} chat. You can add it again any time.`, ok: 'Remove', danger: true })) return;
            await MG.update('DELETE', `/api/sources/${s.id}`); MG.render(); MG.updateSummary(); MG.toast('Chat removed');
          }))));
    }
  }
  const act = (ic, label, fn) => h('button', { class: 'act', title: label, onclick: async () => { try { await fn(); } catch (e) { MG.toast(e.message, true); } } }, icon(ic), h('span', { text: label }));

  MG.page({ id: 'chats', order: 10, group: 'setup', label: 'Chats', icon: 'link', title: 'Chats', subtitle: 'Connect the chats you want on your overlay',
    badge: () => { const n = MG.st?.sources.length; const bad = MG.st?.sources.filter(s => MG.describe(s).tone === 'error').length; return n ? { text: bad ? '!' : n, cls: bad ? 'bad' : '' } : null; },
    render });
  MG.on('sources', () => { if (MG.current() === 'chats') { const w = document.querySelector('.sources'); if (w) fill(w); } });
})();
