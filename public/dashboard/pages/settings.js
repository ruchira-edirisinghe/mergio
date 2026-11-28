/* Settings: app options, accounts and keys, backup, and the "danger zone". */
(() => {
  const { h, icon } = MG;

  function render(c) {
    const st = MG.st;

    // ----- the app -----
    const app = [];
    if (st.autostart?.supported) {
      app.push({ sub: 'Starting up' });
      app.push(MG.row('power', 'Start Mergio with Windows', 'Runs quietly in the background so the overlay is always ready',
        h('span', { class: 'switch' }, h('input', { type: 'checkbox', 'aria-label': 'Start Mergio with Windows', checked: st.autostart.enabled, onchange: async e => {
          try { await MG.update('POST', '/api/autostart', { enabled: e.target.checked }); MG.toast(e.target.checked ? 'Mergio will start with Windows' : 'Mergio will no longer start with Windows'); }
          catch (err) { e.target.checked = !e.target.checked; MG.toast(err.message, true); }
        } }), h('span'))));
      app.push(MG.field('advanced', { key: 'openDashboardOnStart', icon: 'window', label: 'Open this control panel when Windows starts Mergio', hint: 'Opening Mergio yourself always shows it', type: 'toggle' }));
    }
    app.push({ sub: 'This control panel' });
    if (MG.install) app.push(MG.install.row());
    app.push(MG.field('advanced', { key: 'port', icon: 'plug', label: 'Port', hint: 'Leave it at 8787 unless another app uses it', help: 'The number at the end of your overlay link (localhost:8787). If you change it, restart Mergio and paste the new links into OBS.', type: 'number', min: 1024, max: 65535 }));
    c.append(MG.card('Mergio app', null, h('div', { class: 'fields' }, ...app.map(x => (x.sub ? MG.subhead(x.sub) : x)))));

    // ----- accounts -----
    c.append(MG.card('Accounts & keys', 'Only needed for some platforms. Saved on this computer only, never shown on stream.',
      h('div', { class: 'fields' },
        MG.subhead('Facebook'),
        MG.field('advanced', { key: 'facebookAccessToken', icon: 'key', label: 'Facebook Page token', hint: 'Needed for Facebook comments', help: 'Facebook only lets apps read Live comments with a free token from your Page. Click Show me how for step-by-step pictures.', type: 'secret', placeholder: 'Paste your token here' }),
        MG.fbGuideCallout(),
        MG.subhead('TikTok'),
        MG.field('advanced', { key: 'tiktokSignApiKey', icon: 'key', label: 'TikTok key (optional)', hint: 'TikTok works without it', help: 'A free key from eulerstream.com. TikTok limits how often apps can connect; with a key Mergio skips that limit.', type: 'secret', placeholder: 'Optional' }),
        MG.subhead('YouTube'),
        MG.field('advanced', { key: 'youtubeApiKey', icon: 'key', label: 'YouTube Data API key (optional)', hint: 'Only for the follower goals overlay', help: 'Mergio reads your subscriber count from your channel page. With a free key from the Google Cloud console (YouTube Data API v3) it asks YouTube directly instead, which is steadier.', type: 'secret', placeholder: 'Optional' }))));

    // ----- backup -----
    const file = h('input', { type: 'file', accept: '.json,application/json', hidden: true, onchange: async e => {
      const f = e.target.files[0]; if (!f) return;
      try { const data = JSON.parse(await f.text()); delete data.sources; delete data.advanced; delete data.golive; await MG.update('PUT', '/api/settings', data); MG.render(); MG.toast('Style imported'); }
      catch (err) { MG.toast(`That file could not be imported: ${err.message}`, true); }
    } });
    c.append(MG.card('Back up your style', 'Save your look to a file to keep it safe, move it to another PC or share it with friends.',
      h('div', { class: 'fields' },
        MG.row('download', 'Save style to a file', 'Every look, alert and overlay setting. Not your chats or keys.', h('button', { class: 'btn', onclick: exportStyle }, icon('download'), 'Save')),
        MG.row('upload', 'Load style from a file', 'Use a style file you saved before, or one a friend shared', h('button', { class: 'btn', onclick: () => file.click() }, icon('upload'), 'Load'), file)),
      h('p', { class: 'hint' }, 'Your settings are stored in ', h('code', { text: st.dataDir }), ' ',
        h('button', { class: 'link', onclick: () => MG.api('POST', '/api/open-data', {}).catch(e => MG.toast(e.message, true)) }, 'Open folder'))));

    // ----- danger zone -----
    c.append(h('section', { class: 'card danger-zone' }, h('h2', { text: 'Reset or quit' }),
      h('div', { class: 'fields' }, MG.row('refresh', 'Reset all settings', 'Style, alerts and filters go back to the defaults. Your chats and keys stay.',
        h('button', { class: 'btn danger', onclick: async () => {
          if (!await MG.confirm({ title: 'Reset all settings?', text: 'Style, alerts and filters go back to the defaults. Your chats and keys stay.', ok: 'Reset everything', danger: true })) return;
          await MG.update('POST', '/api/settings/reset', {}); MG.render(); MG.toast('All settings reset');
        } }, icon('refresh'), 'Reset')),
      MG.row('power', 'Quit Mergio', 'Stops reading chats; the overlays go empty until you open Mergio again.',
        h('button', { class: 'btn danger', onclick: async () => {
          if (!await MG.confirm({ title: 'Quit Mergio?', text: 'Your overlay stops showing chat until you open Mergio again from its icon.', ok: 'Quit', danger: true })) return;
          await MG.api('POST', '/api/quit', {}).catch(() => {});
          document.body.classList.add('offline', 'quit');
        } }, icon('power'), 'Quit')))));

    c.append(h('p', { class: 'about' }, `Mergio ${st.version} · Created by `,
      h('a', { href: 'https://ruchiraedirisinghe.vercel.app', target: '_blank', rel: 'noopener' }, 'Ruchira Edirisinghe'),
      ' · Free and open source (MIT, with credit to the creator) · ',
      h('a', { href: 'https://mergio-stream-overlay-gamma.vercel.app', target: '_blank', rel: 'noopener' }, 'Website'), ' · ',
      h('a', { href: 'https://github.com/ruchira-edirisinghe/mergio', target: '_blank', rel: 'noopener' }, 'GitHub'), ' · ',
      h('a', { href: 'https://github.com/ruchira-edirisinghe/mergio/issues/new/choose', target: '_blank', rel: 'noopener' }, 'Report a problem')));
  }

  function exportStyle() {
    const { sources, advanced, golive, ...style } = MG.st.settings; // a style file never carries your chats, keys or post links
    const blob = new Blob([JSON.stringify(style, null, 2)], { type: 'application/json' });
    const a = h('a', { href: URL.createObjectURL(blob), download: 'mergio-style.json' });
    document.body.append(a); a.click(); a.remove();
  }

  MG.page({ id: 'settings', order: 80, group: 'app', label: 'Settings', icon: 'gear', title: 'Settings', subtitle: 'App options, accounts and backups', render });
})();
