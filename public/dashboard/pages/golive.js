/* Go-live post: posts to your Discord channels by itself when you go live, and makes the post, a status
 * picture and share buttons for everything else (WhatsApp status, WhatsApp, Telegram, Facebook, X). */
(() => {
  const { h, icon } = MG;
  const PLATS = [['youtube', 'YouTube'], ['twitch', 'Twitch'], ['facebook', 'Facebook'], ['tiktok', 'TikTok'], ['kick', 'Kick']];
  const LINK_KEY = { youtube: 'linkYoutube', twitch: 'linkTwitch', kick: 'linkKick', tiktok: 'linkTiktok', facebook: 'linkFacebook' };
  const THEMES = [['thumb', 'Stream thumbnail'], ['neon', 'Neon'], ['sunset', 'Sunset'], ['ocean', 'Ocean'], ['mono', 'Mono']];
  const DEFAULT = '{mention} 🚨\n\n🔴 {name} is now LIVE!\n\n🎬 {title}\n{link}\n\n{others}';
  const DEFAULT_CAPTION = '🔴 {name} is LIVE now!\n\n🎬 {title}\n\n{all}';
  const BOT_TOKEN = /^[\w-]{20,40}\.[\w-]{4,12}\.[\w-]{20,80}$/;

  let data = null;   // GET /api/golive: { destinations, pending, history, preview }
  let checked = null; // the last Discord check
  let tick = null;

  // Discord shows <link> as a plain link (the brackets only stop its preview card)
  const shown = t => String(t || '').replace(/<(https?:\/\/[^>\s]+)>/g, '$1');
  const g = () => MG.st.settings.golive;

  async function load() {
    try { data = await MG.api('GET', '/api/golive'); } catch (e) { MG.toast(e.message, true); }
    if (MG.current() === 'golive') refresh();
  }

  /** Redraws only what comes from the server (status, preview, picture, history), never the fields you may be typing in. */
  function refresh() {
    const swap = (id, el) => { const old = document.getElementById(id); if (old) { el.id = id; old.replaceWith(el); } };
    swap('gl-status', statusLine());
    swap('gl-hist', history());
    const pre = document.getElementById('gl-preview');
    if (pre) pre.textContent = shown(data?.preview?.discord);
    const cap = document.getElementById('gl-caption');
    if (cap) cap.textContent = data?.preview?.caption || '';
    drawCard();
    MG.renderNav();
  }

  /* ---------- buttons ---------- */
  const results = r => {
    const bad = r.results.filter(x => !x.ok);
    if (!r.results.length) return MG.toast('Add your Discord bot and a channel first', true);
    if (bad.length) return MG.toast(bad.map(x => `${x.label}: ${x.error}`).join(' '), true);
    const skipped = r.results.filter(x => x.skipped).length;
    MG.toast(r.test ? `Test sent to ${r.results.length} channel${r.results.length > 1 ? 's' : ''}` : `Posted${skipped ? ` (${skipped} already had it)` : ''}. Your viewers know you are live!`);
  };
  async function test() {
    await MG.flush();
    try { results(await MG.api('POST', '/api/golive/test', {})); } catch (e) { MG.toast(e.message, true); }
    load();
  }
  async function postNow() {
    await MG.flush();
    if (!await MG.confirm({ title: 'Post that you are live?', text: 'Mergio posts your live stream to your Discord channels right now and pings who you chose. A channel that already has this stream is skipped.', ok: 'Post now' })) return;
    try { results(await MG.api('POST', '/api/golive/post', {})); } catch (e) { MG.toast(e.message, true); }
    load();
  }
  async function checkBot(box) {
    await MG.flush();
    box.replaceChildren(h('p', { class: 'hint', text: 'Checking…' }));
    try { checked = await MG.api('POST', '/api/golive/discord/check', {}); } catch (e) { checked = { ok: false, error: e.message }; }
    box.replaceChildren(checkResult());
  }

  /* ---------- page parts ---------- */
  function statusLine() {
    const box = h('div', { class: 'gl-status', id: 'gl-status' });
    const p = data?.pending;
    if (p) {
      const left = () => Math.max(0, Math.ceil((p.at - Date.now()) / 1000));
      const n = h('b', { text: `${left()}s` });
      clearInterval(tick);
      tick = setInterval(() => { if (!n.isConnected) return clearInterval(tick); n.textContent = `${left()}s`; }, 500);
      box.append(h('span', { class: 'pill live' }, h('span', { class: 'dot' }), 'Going live'),
        h('span', {}, `You are live on ${MG.pname(p.platform)}. Posting in `, n),
        h('button', { class: 'btn sm', onclick: async () => { await MG.api('POST', '/api/golive/cancel', {}).catch(() => {}); MG.toast('Cancelled. This stream will not be posted.'); load(); } }, 'Don’t post'));
      return box;
    }
    const n = g().discordTargets.length;
    if (!g().enabled) box.append(h('span', { class: 'pill' }, 'Off'), h('span', { text: 'Turn it on and Mergio posts to your Discord by itself every time you go live.' }));
    else if (!data?.destinations?.discord) box.append(h('span', { class: 'pill waiting' }, 'Almost'), h('span', { text: 'Add your Discord bot and at least one channel below.' }));
    else box.append(h('span', { class: 'pill live' }, h('span', { class: 'dot' }), 'Ready'),
      h('span', { text: `Posts to ${n} Discord channel${n > 1 ? 's' : ''} when you go live on ${g().trigger === 'any' ? 'any platform' : MG.pname(g().trigger)}.` }));
    return box;
  }

  function checkResult() {
    const c = checked;
    if (!c) return h('span');
    if (c.error) return h('div', { class: 'note warn' }, icon('info'), h('span', { text: c.error }));
    return h('div', { class: 'gl-check' },
      h('p', {}, icon('check'), ' Signed in as ', h('b', { text: c.bot.name }), c.servers.length ? ` · in ${c.servers.length} server${c.servers.length > 1 ? 's' : ''}: ${c.servers.join(', ')}` : ' · not in any server yet'),
      ...c.targets.map(t => h('p', { class: t.ok ? (t.warning ? 'warn' : 'ok') : 'bad' }, icon(t.ok ? 'check' : 'info'), ' ', h('b', { text: t.label }), t.error || t.warning ? ` · ${t.error || t.warning}` : '')),
      h('div', { class: 'btn-row' }, h('a', { class: 'btn sm', href: c.invite, target: '_blank', rel: 'noopener' }, icon('plus'), 'Invite the bot to a server')));
  }

  /** The Discord channels, by name: server, channel and who to ping. */
  function targets() {
    const list = h('div', { class: 'gl-targets' });
    const save = rows => { MG.save('golive', 'discordTargets', rows); };
    const draw = () => {
      const rows = g().discordTargets.map(t => ({ ...t }));
      list.replaceChildren(...rows.map((t, i) => {
        const input = (key, ph, label) => h('input', { type: 'text', value: t[key] || '', placeholder: ph, 'aria-label': label, maxlength: key === 'ping' ? 200 : 100,
          onchange: e => { rows[i][key] = e.target.value; if (rows[i].server.trim() && rows[i].channel.trim()) save(rows); } });
        return h('div', { class: 'gl-trow' },
          input('server', 'Server name', 'Server'), input('channel', '#channel', 'Channel'), input('ping', '@everyone, @Role', 'Who to ping'),
          h('button', { class: 'icon-btn', title: 'Remove', 'aria-label': 'Remove this channel', onclick: () => { rows.splice(i, 1); save(rows); draw(); } }, icon('trash')));
      }));
      if (!rows.length) list.append(h('p', { class: 'hint', text: 'No channels yet.' }));
    };
    draw();
    const add = h('div', { class: 'gl-trow add' });
    const s = h('input', { type: 'text', placeholder: 'Server name', 'aria-label': 'Server', maxlength: 100 });
    const ch = h('input', { type: 'text', placeholder: '#channel', 'aria-label': 'Channel', maxlength: 100 });
    const pg = h('input', { type: 'text', placeholder: '@everyone, @Role (optional)', 'aria-label': 'Who to ping', maxlength: 200 });
    const doAdd = () => {
      if (!s.value.trim() || !ch.value.trim()) return MG.toast('Type the server name and the channel name', true);
      if (g().discordTargets.length >= 10) return MG.toast('Up to 10 channels', true);
      save([...g().discordTargets, { server: s.value.trim(), channel: ch.value.trim().replace(/^#+/, ''), ping: pg.value.trim() }]);
      s.value = ch.value = pg.value = ''; draw();
    };
    add.append(s, ch, pg, h('button', { class: 'btn sm primary', onclick: doAdd }, icon('plus'), 'Add'));
    return h('div', {}, h('div', { class: 'gl-thead' }, h('span', { text: 'Server' }), h('span', { text: 'Channel' }), h('span', { text: 'Ping' }), h('span')), list, add);
  }

  /* ---------- the status picture ---------- */
  let canvas = null;
  async function drawCard() {
    if (!canvas || !canvas.isConnected || !window.MergioStatusCard) return;
    const s = g();
    await MergioStatusCard.draw(canvas, data?.preview?.card || {}, { theme: s.statusTheme, headline: s.statusHeadline, showTitle: s.statusTitle, showHandles: s.statusHandles });
  }
  async function pictureFile() {
    await drawCard();
    const b = await MergioStatusCard.blob(canvas);
    return new File([b], 'live-status.png', { type: 'image/png' });
  }
  const caption = () => data?.preview?.caption || '';
  async function savePicture() {
    const f = await pictureFile();
    const a = h('a', { href: URL.createObjectURL(f), download: f.name });
    document.body.append(a); a.click(); a.remove();
    MG.toast('Picture saved');
  }
  async function copyCaption() {
    try { await navigator.clipboard.writeText(caption()); MG.toast('Caption copied. Paste it under the picture.'); } catch { window.prompt('Copy this:', caption()); }
  }
  /** PC: Windows' share window (WhatsApp, Telegram, Mail…), or save the picture and copy the caption. */
  async function addToStatus() {
    const f = await pictureFile();
    if (navigator.canShare?.({ files: [f] })) {
      try { await navigator.share({ files: [f], text: caption() }); return; } catch (e) { if (e.name === 'AbortError') return; }
    }
    await savePicture(); await copyCaption();
    MG.toast('Picture saved and caption copied. For your WhatsApp status, tap Add to status in the Mergio phone app.');
  }
  function shareRow() {
    const text = () => caption(), url = () => data?.preview?.url || '';
    const open = href => window.open(href, '_blank', 'noopener');
    const b = (cls, ic, label, fn) => h('button', { class: `btn sm share ${cls}`, onclick: fn }, icon(ic), label);
    return h('div', { class: 'btn-row gl-share' },
      h('button', { class: 'btn primary', onclick: addToStatus }, icon('image'), 'Add to status'),
      b('wa', 'whatsapp', 'WhatsApp', () => open(`https://wa.me/?text=${encodeURIComponent(text())}`)),
      b('tg', 'telegram', 'Telegram', () => open(`https://t.me/share/url?url=${encodeURIComponent(url())}&text=${encodeURIComponent(text().replace(url(), '').replace(/\n{3,}/g, '\n\n').trim())}`)),
      b('fb', 'facebook', 'Facebook', () => open(`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url())}`)),
      b('x', 'x', 'X', () => { const t = text(), u = url(); open(`https://x.com/intent/post?text=${encodeURIComponent(u && t.includes(u) ? t.slice(0, t.indexOf(u) + u.length) : t)}`); }),
      b('', 'copy', 'Copy', copyCaption),
      b('', 'download', 'Save picture', savePicture));
  }

  /* ---------- page ---------- */
  function paint(c) {
    const s = g();
    const have = new Set(MG.st.sources.map(x => x.platform));
    const trig = PLATS.filter(([p]) => have.has(p) || p === s.trigger);

    // ----- on/off and when -----
    c.append(MG.card('Go-live post', 'When your stream starts, Mergio posts your title and link (plus your other channels) in your Discord channels. Once per stream.',
      statusLine(),
      h('div', { class: 'fields' },
        MG.field('golive', { key: 'enabled', icon: 'megaphone', label: 'Post to Discord when I go live', hint: 'Every stream, by itself', type: 'toggle' }),
        MG.field('golive', { key: 'trigger', icon: 'live', label: 'Going live on', hint: 'Its stream link is the main link', type: 'select', dropdown: true, options: [...trig, ['any', 'Any platform (the first one)']] }),
        MG.field('golive', { key: 'delay', icon: 'timer', label: 'Wait before posting', hint: 'So your other streams (and Facebook’s link) are up too', type: 'range', min: 0, max: 180, step: 5, unit: 's' }),
        MG.field('golive', { key: 'name', icon: 'user', label: 'Your name in the post', hint: 'Empty = your channel name', placeholder: 'Zenitron Gaming' })),
      h('div', { class: 'btn-row' },
        h('button', { class: 'btn', onclick: test }, icon('play'), 'Send a test post'),
        h('button', { class: 'btn', onclick: postNow }, icon('megaphone'), 'Post now'),
        h('span', { class: 'hint', text: 'Test posts say [Test] and ping nobody. Post now is for a stream that already started.' }))));

    // ----- Discord -----
    const checkBox = h('div', {}, checkResult());
    c.append(MG.card('Discord', 'Your own Discord bot posts for you (Discord doesn’t let apps post as you). Make it once, invite it to your servers, then just type the server and channel names.',
      h('details', { class: 'gl-guide', open: !s.discordBotToken },
        h('summary', { text: 'Make your bot (about 3 minutes, free)' }),
        h('ol', {},
          h('li', {}, 'Open ', h('a', { href: 'https://discord.com/developers/applications', target: '_blank', rel: 'noopener' }, 'discord.com/developers/applications'), ', press ', h('b', { text: 'New Application' }), ' and give it a name (like “Zenitron Live”). The name and picture are what your viewers see.'),
          h('li', {}, 'Open ', h('b', { text: 'Bot' }), ' on the left, press ', h('b', { text: 'Reset Token' }), ', then ', h('b', { text: 'Copy' }), '. Paste it below.'),
          h('li', {}, 'Press ', h('b', { text: 'Check' }), ', then ', h('b', { text: 'Invite the bot to a server' }), ' and pick your server. Do this once for each server.'),
          h('li', {}, 'Add your channels below. The bot needs to see the channel and send messages there (it can, unless the channel is private).'))),
      h('div', { class: 'fields' },
        MG.field('golive', { key: 'discordBotToken', icon: 'key', label: 'Bot token', hint: 'From Bot → Reset Token', type: 'secret', wide: true, placeholder: 'Paste your bot’s token',
          check: v => BOT_TOKEN.test(v) || 'That is not a bot token. Copy it from Bot → Reset Token in the Discord Developer Portal.' })),
      h('div', { class: 'btn-row' }, h('button', { class: 'btn', onclick: () => checkBot(checkBox) }, icon('check'), 'Check'), h('span', { class: 'hint', text: 'Shows the bot’s servers and whether it can find each channel.' })),
      checkBox,
      MG.subhead('Channels', 'Type the names as you see them in Discord. Ping roles by name, like @CUSTOMERS'),
      targets()));

    // ----- the Discord post -----
    c.append(MG.card('The Discord post', 'Write it your way. Lines with nothing to fill in (no title, no other channels) are left out.',
      h('div', { class: 'gl-msg' },
        h('div', {},
          h('div', { class: 'fields' }, MG.field('golive', { key: 'message', icon: 'type', label: 'Message', type: 'textarea', wide: true })),
          h('p', { class: 'hint gl-keys' }, 'Fill-ins: ', ...['{mention}', '{name}', '{title}', '{link}', '{platform}', '{others}', '{all}', '{youtube}', '{twitch}', '{facebook}', '{tiktok}', '{kick}'].map(k => h('code', { text: k })),
            ' · {mention} is the ping, {others} the “Also live on” list, {all} every stream.'),
          h('button', { class: 'link', onclick: () => { MG.save('golive', 'message', DEFAULT); MG.render(); } }, 'Use the standard message')),
        h('div', {},
          h('div', { class: 'gl-prev-h' }, h('b', { text: 'Preview' })),
          h('pre', { class: 'gl-preview', id: 'gl-preview', text: shown(data?.preview?.discord) || '…' }))),
      MG.subhead('Also live on', 'Your other channels, in the post, the caption and the status picture'),
      h('div', { class: 'fields' }, ...PLATS.filter(([p]) => have.has(p)).map(([p, name]) =>
        MG.field('golive', { key: LINK_KEY[p], icon: p, label: name, hint: MG.st.sources.find(x => x.platform === p)?.label || '', type: 'toggle' }))),
      have.size ? null : h('p', { class: 'hint' }, 'Add your channels on the Chats page first: their links come from there.')));

    // ----- share & status -----
    canvas = h('canvas', { class: 'gl-card', width: 1080, height: 1920, 'aria-label': 'Your status picture' });
    c.append(MG.card('Share & status', 'A picture for your WhatsApp (or any) status, and the caption with every stream’s link. Share them yourself, wherever you like.',
      h('div', { class: 'gl-status-grid' },
        h('div', { class: 'gl-card-wrap' }, canvas),
        h('div', {},
          h('div', { class: 'fields' },
            MG.field('golive', { key: 'statusTheme', icon: 'image', label: 'Background', type: 'select', dropdown: true, options: THEMES, onchange: drawCard }),
            MG.field('golive', { key: 'statusHeadline', icon: 'type', label: 'Headline', hint: 'On the red pill', placeholder: 'LIVE NOW' }),
            MG.field('golive', { key: 'statusTitle', icon: 'textsize', label: 'Show the stream title', type: 'toggle', onchange: drawCard }),
            MG.field('golive', { key: 'statusHandles', icon: 'at', label: 'Show channel names', hint: 'Next to each logo', type: 'toggle', onchange: drawCard }),
            MG.field('golive', { key: 'caption', icon: 'chat', label: 'Caption', hint: 'Under the picture, and what the share buttons send', type: 'textarea', wide: true })),
          h('button', { class: 'link', onclick: () => { MG.save('golive', 'caption', DEFAULT_CAPTION); MG.render(); } }, 'Use the standard caption'),
          h('div', { class: 'gl-prev-h' }, h('b', { text: 'Caption' })),
          h('pre', { class: 'gl-preview plain', id: 'gl-caption', text: data?.preview?.caption || '' }))),
      shareRow(),
      h('p', { class: 'hint', text: 'WhatsApp status is posted from your phone: open the Mergio app and tap Add to status. On this PC, Add to status opens Windows’ share window, or saves the picture and copies the caption.' })));

    c.append(MG.card('Recent posts', null, history()));
    drawCard();
  }

  function history() {
    const hist = data?.history || [];
    return hist.length ? h('div', { class: 'gl-hist', id: 'gl-hist' }, ...hist.map(x => h('div', { class: 'gl-h' },
      h('span', { class: 'gl-h-t', text: new Date(x.at).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' }) }),
      h('span', { class: 'gl-h-title', text: `${x.test ? 'Test · ' : ''}${x.title || x.url || 'Your stream'}` }),
      h('span', { class: 'gl-h-r' }, ...(x.results.length ? x.results : [{ label: 'Nowhere', ok: false, error: 'There was nowhere to post.' }]).map(r =>
        h('span', { class: `pill ${r.ok ? 'live' : 'error'}`, title: r.error || r.warning || (r.skipped ? 'Already posted there' : 'Sent') }, r.ok ? icon('check') : null, String(r.label || r.dest || '').split(' › ').pop() + (r.skipped ? ' (had it)' : ''))))))) :
      h('div', { class: 'empty', id: 'gl-hist' }, icon('megaphone'), h('b', { text: 'No posts yet' }), h('span', { text: 'Send a test post to see how it looks.' }));
  }

  function render(c) { paint(c); load(); }
  MG.on('golive', v => { data = { ...(data || {}), ...v }; if (MG.current() === 'golive') load(); else MG.renderNav(); });
  // a post went out while another page is open: say so, with the result
  MG.on('golive', v => {
    const last = v.history?.[0];
    if (!last || last.test || last.at === MG.golivePosted) return;
    if (Date.now() - last.at < 60e3) {
      const bad = last.results.filter(x => !x.ok);
      MG.toast(bad.length ? `Go-live post: ${bad.map(x => `${x.label} failed`).join(', ')}` : 'You are live! Your go-live post went out.', !!bad.length);
    }
    MG.golivePosted = last.at;
  });
  MG.on('saved', () => { if (MG.current() === 'golive') { clearTimeout(render.t); render.t = setTimeout(load, 250); } });
  MG.on('sources', () => { if (MG.current() === 'golive') load(); });

  MG.page({ id: 'golive', order: 55, group: 'live', label: 'Go-live post', icon: 'megaphone', title: 'Go-live post',
    subtitle: 'Post to Discord by itself, and share your live stream everywhere else',
    badge: () => (data?.pending ? { text: 'now', cls: 'live' } : null), render });
})();
