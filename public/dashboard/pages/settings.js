/* Settings: app options, accounts and keys, backup, and the "danger zone". */
(() => {
  const { h, icon } = MG;

  function row(title, hint, control) {
    return h('div', { class: 'f' }, h('label', {}, title, hint ? h('span', { class: 'hint', text: hint }) : null), control);
  }

  function render(c) {
    const st = MG.st;

    // ----- the app -----
    const app = [];
    if (st.autostart?.supported) {
      app.push(row('Start Mergio with Windows', 'Runs quietly in the background so the overlay is always ready',
        h('span', { class: 'switch' }, h('input', { type: 'checkbox', 'aria-label': 'Start Mergio with Windows', checked: st.autostart.enabled, onchange: async e => {
          try { await MG.update('POST', '/api/autostart', { enabled: e.target.checked }); MG.toast(e.target.checked ? 'Mergio will start with Windows' : 'Mergio will no longer start with Windows'); }
          catch (err) { e.target.checked = !e.target.checked; MG.toast(err.message, true); }
        } }), h('span'))));
      app.push(MG.field('advanced', { key: 'openDashboardOnStart', label: 'Open this control panel when Windows starts Mergio', hint: 'Opening Mergio yourself always shows it', type: 'toggle' }));
    }
    if (MG.install) app.push(MG.install.row());
    c.append(MG.card('Mergio app', null, h('div', { class: 'fields one' }, ...app.filter(Boolean),
      MG.field('advanced', { key: 'port', label: 'Port', hint: 'Leave it at 8787 unless another app uses it', help: 'The number at the end of your overlay link (localhost:8787). If you change it, restart Mergio and paste the new link into OBS.', type: 'number', min: 1024, max: 65535 }))));

    // ----- accounts -----
    c.append(MG.card('Accounts & keys', 'Only needed for some platforms. Saved on this computer only.',
      h('div', { class: 'fields one' },
        MG.field('advanced', { key: 'facebookAccessToken', label: 'Facebook Page token', hint: 'Needed for Facebook comments', help: 'Facebook only lets apps read Live comments with a free token from your Page. Click Show me how for step-by-step pictures.', type: 'secret', placeholder: 'Paste your token here' }),
        MG.fbGuideCallout(),
        MG.field('advanced', { key: 'tiktokSignApiKey', label: 'TikTok key (optional)', hint: 'TikTok works without it', help: 'A free key from eulerstream.com. TikTok limits how often apps can connect; with a key Mergio skips that limit.', type: 'secret', placeholder: 'Optional' }))));

    // ----- backup -----
    const file = h('input', { type: 'file', accept: '.json,application/json', hidden: true, onchange: async e => {
      const f = e.target.files[0]; if (!f) return;
      try { const data = JSON.parse(await f.text()); delete data.sources; delete data.advanced; await MG.update('PUT', '/api/settings', data); MG.render(); MG.toast('Style imported'); }
      catch (err) { MG.toast(`That file could not be imported: ${err.message}`, true); }
    } });
    c.append(MG.card('Back up your style', 'Save your look to a file to keep it safe, move it to another PC or share it with friends.',
      h('div', { class: 'btn-row' },
        h('button', { class: 'btn', onclick: exportStyle }, icon('download'), 'Save style to a file'),
        h('button', { class: 'btn', onclick: () => file.click() }, icon('upload'), 'Load style from a file'), file),
      h('p', { class: 'hint' }, 'Your settings are stored in ', h('code', { text: st.dataDir }), ' ',
        h('button', { class: 'link', onclick: () => MG.api('POST', '/api/open-data', {}).catch(e => MG.toast(e.message, true)) }, 'Open folder'))));

    // ----- danger zone -----
    c.append(h('section', { class: 'card danger-zone' }, h('h2', { text: 'Reset or quit' }),
      h('div', { class: 'dz' },
        h('div', {}, h('b', { text: 'Reset all settings' }), h('span', { text: 'Style, alerts and filters go back to the defaults. Your chats and keys stay.' })),
        h('button', { class: 'btn danger', onclick: async () => {
          if (!await MG.confirm({ title: 'Reset all settings?', text: 'Style, alerts and filters go back to the defaults. Your chats and keys stay.', ok: 'Reset everything', danger: true })) return;
          await MG.update('POST', '/api/settings/reset', {}); MG.render(); MG.toast('All settings reset');
        } }, icon('refresh'), 'Reset')),
      h('div', { class: 'dz' },
        h('div', {}, h('b', { text: 'Quit Mergio' }), h('span', { text: 'Stops reading chats; the overlay goes empty until you open Mergio again.' })),
        h('button', { class: 'btn danger', onclick: async () => {
          if (!await MG.confirm({ title: 'Quit Mergio?', text: 'Your overlay stops showing chat until you open Mergio again from its icon.', ok: 'Quit', danger: true })) return;
          await MG.api('POST', '/api/quit', {}).catch(() => {});
          document.body.classList.add('offline', 'quit');
        } }, icon('power'), 'Quit'))));

    c.append(h('p', { class: 'about' }, `Mergio ${st.version} · Created by `,
      h('a', { href: 'https://ruchiraedirisinghe.vercel.app', target: '_blank', rel: 'noopener' }, 'Ruchira Edirisinghe'),
      ' · Free and open source (MIT, with credit to the creator) · ',
      h('a', { href: 'https://mergio-stream-overlay-gamma.vercel.app', target: '_blank', rel: 'noopener' }, 'Website'), ' · ',
      h('a', { href: 'https://github.com/ruchira-edirisinghe/mergio', target: '_blank', rel: 'noopener' }, 'GitHub'), ' · ',
      h('a', { href: 'https://github.com/ruchira-edirisinghe/mergio/issues/new/choose', target: '_blank', rel: 'noopener' }, 'Report a problem')));
  }

  function exportStyle() {
    const { sources, advanced, ...style } = MG.st.settings;
    const blob = new Blob([JSON.stringify(style, null, 2)], { type: 'application/json' });
    const a = h('a', { href: URL.createObjectURL(blob), download: 'mergio-style.json' });
    document.body.append(a); a.click(); a.remove();
  }

  MG.page({ id: 'settings', order: 80, group: 'app', label: 'Settings', icon: 'gear', title: 'Settings', subtitle: 'App options, accounts and backups', render });
})();
