/* Go-live post: tells your Discord, Telegram, Slack (or any app with a webhook) the moment you go live. */
(() => {
  const { h, icon } = MG;
  const PLATS = [['youtube', 'YouTube'], ['twitch', 'Twitch'], ['facebook', 'Facebook'], ['tiktok', 'TikTok'], ['kick', 'Kick']];
  const LINK_KEY = { youtube: 'linkYoutube', twitch: 'linkTwitch', kick: 'linkKick', tiktok: 'linkTiktok', facebook: 'linkFacebook' };
  const DEST_NAMES = { discord: 'Discord', telegram: 'Telegram', slack: 'Slack', webhook: 'Webhook' };

  // the same checks the app makes before it saves a link or token
  const CHECK = {
    discordWebhook: v => /^https:\/\/(?:(?:canary|ptb)\.)?discord(?:app)?\.com\/api\/(?:v\d+\/)?webhooks\/\d{5,30}\/[\w-]{20,200}$/.test(v) || 'That is not a Discord webhook link. It starts with https://discord.com/api/webhooks/',
    discordMention: v => /^(?:(?:@everyone|@here|<@&?\d{5,30}>|\d{5,30})(?:[\s,]+|$))*$/.test(v) || 'Discord webhooks can only ping @everyone, @here or a role by its number (Role ID), not by its name.',
    telegramBotToken: v => /^\d{5,15}:[\w-]{30,80}$/.test(v) || 'That is not a bot token. @BotFather gives one like 123456789:AAH…',
    telegramChat: v => /^(?:@[A-Za-z][\w]{3,63}|-?\d{1,20})$/.test(v) || 'Use the @name of a public channel or group, or the chat number (like -1001234567890).',
    slackWebhook: v => /^https:\/\/hooks\.slack\.com\/(?:services|workflows|triggers)\/[\w/-]{10,300}$/.test(v) || 'That is not a Slack webhook link. It starts with https://hooks.slack.com/',
    webhookUrl: v => /^https?:\/\/[^\s"<>]{4,500}$/.test(v) || 'Use a full link that starts with https://',
  };

  let data = null;       // { destinations, pending, history, preview }
  let tick = null;

  // Discord shows <link> as a plain link (the brackets only stop its preview card)
  const shown = t => String(t || '').replace(/<(https?:\/\/[^>\s]+)>/g, '$1');

  async function load() {
    try { data = await MG.api('GET', '/api/golive'); } catch (e) { MG.toast(e.message, true); }
    if (MG.current() === 'golive') refresh();
  }

  /** Redraws only what the server tells us (status, preview, history), never the fields you may be typing in. */
  function refresh() {
    const swap = (id, el) => { const old = document.getElementById(id); if (old) { el.id = id; old.replaceWith(el); } };
    swap('gl-status', statusLine());
    swap('gl-share', shareButtons());
    swap('gl-hist', history());
    const pre = document.getElementById('gl-preview');
    if (pre) pre.textContent = shown(data?.preview?.discord);
    const ph = document.getElementById('gl-prev-h');
    if (ph) ph.textContent = data?.preview?.live ? 'Preview (your live stream, on Discord)' : 'Preview (on Discord)';
    for (const el of document.querySelectorAll('.gl-dest[data-dest]')) {
      const on = !!data?.destinations?.[el.dataset.dest];
      el.classList.toggle('on', on);
      const b = el.querySelector('.gl-test');
      if (b) { b.disabled = !on; b.title = on ? '' : 'Fill this in first'; }
    }
    MG.renderNav();
  }

  /* ---------- sharing by hand (WhatsApp has no way for apps to post to groups) ---------- */
  const shareText = () => data?.history?.find(x => !x.test)?.text || data?.preview?.plain || '';
  const shareUrl = () => data?.history?.find(x => !x.test)?.url || data?.preview?.url || '';
  function shareButtons() {
    const text = shareText(), url = shareUrl();
    // X only takes a short post: everything up to the stream link
    const short = url && text.includes(url) ? text.slice(0, text.indexOf(url) + url.length) : text;
    const a = (cls, ic, label, href) => h('a', { class: `btn sm share ${cls}`, href, target: '_blank', rel: 'noopener' }, icon(ic), label);
    return h('div', { class: 'btn-row gl-share', id: 'gl-share' },
      a('wa', 'whatsapp', 'WhatsApp', `https://wa.me/?text=${encodeURIComponent(text)}`),
      a('tg', 'telegram', 'Telegram', `https://t.me/share/url?url=${encodeURIComponent(url)}&text=${encodeURIComponent(url ? text.replace(url, '').replace(/\n{3,}/g, '\n\n').trim() : text)}`),
      a('x', 'x', 'X', `https://x.com/intent/post?text=${encodeURIComponent(short)}`),
      h('button', { class: 'btn sm', onclick: async () => {
        try { await navigator.clipboard.writeText(text); MG.toast('Copied. Paste it anywhere.'); } catch { window.prompt('Copy this:', text); }
      } }, icon('copy'), 'Copy'));
  }

  /* ---------- buttons ---------- */
  async function test(to) {
    await MG.flush();
    try {
      const r = await MG.api('POST', '/api/golive/test', to ? { to } : {});
      const bad = r.results.filter(x => !x.ok);
      if (!r.results.length) MG.toast('Fill in a place to post to first', true);
      else if (bad.length) MG.toast(bad.map(x => `${DEST_NAMES[x.dest]}: ${x.error}`).join(' '), true);
      else MG.toast(`Test post sent to ${r.results.map(x => DEST_NAMES[x.dest]).join(', ')}`);
    } catch (e) { MG.toast(e.message, true); }
    load();
  }
  async function postNow() {
    await MG.flush();
    if (!await MG.confirm({ title: 'Post that you are live?', text: 'Mergio posts your live stream right now to every place filled in below, and pings who you chose on Discord.', ok: 'Post now' })) return;
    try {
      const r = await MG.api('POST', '/api/golive/post', {});
      const bad = r.results.filter(x => !x.ok);
      MG.toast(bad.length ? bad.map(x => `${DEST_NAMES[x.dest]}: ${x.error}`).join(' ') : 'Posted. Your viewers know you are live!', !!bad.length);
    } catch (e) { MG.toast(e.message, true); }
    load();
  }

  /* ---------- page ---------- */
  function statusLine() {
    const g = MG.st.settings.golive;
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
    const any = data && Object.values(data.destinations).some(Boolean);
    if (!g.enabled) box.append(h('span', { class: 'pill' }, 'Off'), h('span', { text: 'Turn it on and Mergio posts by itself every time you go live.' }));
    else if (!any) box.append(h('span', { class: 'pill waiting' }, 'Almost'), h('span', { text: 'Fill in at least one place to post to below.' }));
    else box.append(h('span', { class: 'pill live' }, h('span', { class: 'dot' }), 'Ready'),
      h('span', { text: `Posts to ${Object.entries(data.destinations).filter(([, on]) => on).map(([d]) => DEST_NAMES[d]).join(', ')} when you go live on ${g.trigger === 'any' ? 'any platform' : MG.pname(g.trigger)}.` }));
    return box;
  }

  const TILE_ICON = { slack: 'hash', webhook: 'plug' };
  function dest(key, title, text, fields, extra) {
    const on = !!data?.destinations?.[key];
    const testable = key !== 'whatsapp';
    return h('div', { class: `gl-dest ${on ? 'on' : ''}`, 'data-dest': testable ? key : null },
      h('div', { class: 'gl-dest-h' },
        h('span', { class: `gl-tile ${key}` }, icon(TILE_ICON[key] || key)),
        h('div', {}, h('b', { text: title }), h('span', { class: 'hint', text })),
        testable ? h('button', { class: 'btn sm gl-test', disabled: !on, title: on ? '' : 'Fill this in first', onclick: () => test(key) }, icon('play'), 'Test') : null),
      fields ? h('div', { class: 'fields' }, ...fields.map(f => MG.field('golive', f))) : null,
      extra || null);
  }

  function paint() {
    const c = document.getElementById('content');
    if (!c || MG.current() !== 'golive') return;
    c.textContent = '';
    const g = MG.st.settings.golive;
    const have = new Set(MG.st.sources.map(s => s.platform));
    const trig = [['youtube', 'YouTube'], ['twitch', 'Twitch'], ['facebook', 'Facebook'], ['tiktok', 'TikTok'], ['kick', 'Kick']].filter(([p]) => have.has(p) || p === g.trigger);

    // ----- on/off and when -----
    c.append(MG.card('Go-live post', 'When your stream starts, Mergio posts your title and link (plus your other channels) for you. Once per stream.',
      statusLine(),
      h('div', { class: 'fields' },
        MG.field('golive', { key: 'enabled', icon: 'megaphone', label: 'Post when I go live', hint: 'Every stream, by itself', type: 'toggle' }),
        MG.field('golive', { key: 'trigger', icon: 'live', label: 'Going live on', hint: 'Its stream link is the main link', type: 'select', dropdown: true,
          options: [...trig, ['any', 'Any platform (the first one)']] }),
        MG.field('golive', { key: 'delay', icon: 'timer', label: 'Wait before posting', hint: 'So your other streams (and Facebook’s link) are up too', type: 'range', min: 0, max: 180, step: 5, unit: 's' }),
        MG.field('golive', { key: 'name', icon: 'user', label: 'Your name in the post', hint: 'Empty = your channel name', placeholder: 'Zenitron Gaming' })),
      h('div', { class: 'btn-row' },
        h('button', { class: 'btn', onclick: () => test() }, icon('play'), 'Send a test post'),
        h('button', { class: 'btn', onclick: postNow }, icon('megaphone'), 'Post now'),
        h('span', { class: 'hint', text: 'Test posts say [Test] and ping nobody. Post now is for a stream that already started.' }))));

    // ----- where -----
    c.append(MG.card('Where to post', 'Fill in the places you use. Links and tokens stay on this computer and are never shown on stream.',
      h('div', { class: 'gl-dests' },
        dest('discord', 'Discord', 'In your server: Edit channel → Integrations → Webhooks → New Webhook → Copy Webhook URL.', [
          { key: 'discordWebhook', icon: 'link', label: 'Webhook link', type: 'secret', wide: true, placeholder: 'https://discord.com/api/webhooks/…', check: CHECK.discordWebhook },
          { key: 'discordMention', icon: 'at', label: 'Ping', hint: '@everyone, @here or a Role ID', wide: true, placeholder: '@everyone   or   123456789012345678', check: CHECK.discordMention,
            help: 'To ping a role like @CUSTOMERS: in Discord turn on User Settings → Advanced → Developer Mode, then Server Settings → Roles, right-click the role and Copy Role ID. Paste that number here. The role must be allowed to be mentioned.' },
        ]),
        dest('telegram', 'Telegram', 'Message @BotFather, send /newbot and copy the token. Then add your bot to the channel or group as an admin.', [
          { key: 'telegramBotToken', icon: 'key', label: 'Bot token', type: 'secret', wide: true, placeholder: '123456789:AAH…', check: CHECK.telegramBotToken },
          { key: 'telegramChat', icon: 'chat', label: 'Channel or group', hint: '@name, or the chat number', wide: true, placeholder: '@yourchannel', check: CHECK.telegramChat,
            help: 'A public channel or group: its @name. A private one: its number, which starts with -100. Forward a message from it to @userinfobot to see the number.' },
        ]),
        dest('whatsapp', 'WhatsApp', 'WhatsApp doesn’t let apps post to groups, communities or channels. When you go live, tap WhatsApp: the post opens ready to send and you pick where.', null, shareButtons()),
        dest('slack', 'Slack', 'Slack: Apps → Incoming Webhooks → Add to Slack → pick a channel → copy the Webhook URL.', [
          { key: 'slackWebhook', icon: 'link', label: 'Webhook link', type: 'secret', wide: true, placeholder: 'https://hooks.slack.com/services/…', check: CHECK.slackWebhook },
        ]),
        dest('webhook', 'Other apps', 'Zapier, Make, n8n, IFTTT, your own bot…: gets the post as JSON (title, links and the text) and can pass it on anywhere.', [
          { key: 'webhookUrl', icon: 'link', label: 'Webhook link', type: 'secret', wide: true, placeholder: 'https://hooks.zapier.com/…', check: CHECK.webhookUrl },
        ]))));

    // ----- the message -----
    const preview = h('pre', { class: 'gl-preview', id: 'gl-preview', text: shown(data?.preview?.discord) || '…' });
    c.append(MG.card('The post', 'Write it your way. Lines with nothing to fill in (no title, no other channels) are left out.',
      h('div', { class: 'gl-msg' },
        h('div', {},
          h('div', { class: 'fields' }, MG.field('golive', { key: 'message', icon: 'type', label: 'Message', type: 'textarea', wide: true })),
          h('p', { class: 'hint gl-keys' }, 'Fill-ins: ', ...['{mention}', '{name}', '{title}', '{link}', '{platform}', '{others}', '{youtube}', '{twitch}', '{facebook}', '{tiktok}', '{kick}'].map(k => h('code', { text: k })),
            ' · {mention} is the Discord ping, {others} the “Also live on” list.'),
          h('button', { class: 'link', onclick: () => { MG.save('golive', 'message', DEFAULT); MG.render(); } }, 'Use the standard message')),
        h('div', {},
          h('div', { class: 'gl-prev-h' }, h('b', { id: 'gl-prev-h', text: data?.preview?.live ? 'Preview (your live stream, on Discord)' : 'Preview (on Discord)' })),
          preview)),
      MG.subhead('Also live on', 'Your other channels listed under the main link'),
      h('div', { class: 'fields' }, ...PLATS.filter(([p]) => have.has(p)).map(([p, name]) =>
        MG.field('golive', { key: LINK_KEY[p], icon: p, label: name, hint: MG.st.sources.find(s => s.platform === p)?.label || '', type: 'toggle' }))),
      have.size ? null : h('p', { class: 'hint' }, 'Add your channels on the Chats page first: their links come from there.')));

    c.append(MG.card('Recent posts', null, history()));
  }

  function history() {
    const hist = data?.history || [];
    return hist.length ? h('div', { class: 'gl-hist', id: 'gl-hist' }, ...hist.map(x => h('div', { class: 'gl-h' },
      h('span', { class: 'gl-h-t', text: new Date(x.at).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' }) }),
      h('span', { class: 'gl-h-title', text: `${x.test ? 'Test · ' : ''}${x.title || x.url || 'Your stream'}` }),
      h('span', { class: 'gl-h-r' }, ...(x.results.length ? x.results : [{ dest: 'none', ok: false, error: 'There was nowhere to post.' }]).map(r =>
        h('span', { class: `pill ${r.ok ? 'live' : 'error'}`, title: r.error || 'Sent' }, r.ok ? icon('check') : null, DEST_NAMES[r.dest] || 'Nowhere')))))) :
      h('div', { class: 'empty', id: 'gl-hist' }, icon('megaphone'), h('b', { text: 'No posts yet' }), h('span', { text: 'Send a test post to see how it looks.' }));
  }

  const DEFAULT = '{mention} 🚨\n\n🔴 {name} is now LIVE!\n\n🎬 {title}\n{link}\n\n{others}';

  function render() { paint(); load(); }
  MG.on('golive', v => { data = { ...(data || {}), ...v }; if (MG.current() === 'golive') load(); else MG.renderNav(); });
  // a post went out while another page is open: say so, with the result
  MG.on('golive', v => {
    const last = v.history?.[0];
    if (!last || last.test || last.at === MG.golivePosted) return;
    if (Date.now() - last.at < 60e3) {
      const bad = last.results.filter(x => !x.ok);
      MG.toast(bad.length ? `Go-live post: ${bad.map(x => `${DEST_NAMES[x.dest]} failed`).join(', ')}` : 'You are live! Your go-live post went out.', !!bad.length);
    }
    MG.golivePosted = last.at;
  });
  MG.on('saved', () => { if (MG.current() === 'golive') { clearTimeout(render.t); render.t = setTimeout(load, 250); } });
  MG.on('sources', () => { if (MG.current() === 'golive') load(); });

  MG.page({ id: 'golive', order: 55, group: 'live', label: 'Go-live post', icon: 'megaphone', title: 'Go-live post',
    subtitle: 'Tell your Discord, Telegram and more the moment you go live',
    badge: () => (data?.pending ? { text: 'now', cls: 'live' } : null), render });
})();
