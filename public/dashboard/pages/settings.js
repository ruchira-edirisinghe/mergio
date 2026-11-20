/* Settings: app options, accounts and keys, backup, and the "danger zone". */
(() => {
  const { h, icon } = MG;

  /**
   * Step-by-step guide to a Facebook Page token that does not expire. Shown under the token field and on
   * the Help page. Facebook's own tools only list the right permissions after you create a (free) app.
   */
  MG.fbTokenGuide = () => {
    const link = (href, text) => h('a', { href, target: '_blank', rel: 'noopener' }, text);
    const c = text => h('code', { text });
    const b = text => h('b', { text });
    const step = (title, ...body) => h('li', {}, h('b', { class: 'fbg-t', text: title }), h('div', {}, ...body));
    return h('details', { class: 'qa fb-guide' },
      h('summary', { text: 'How do I get a Facebook Page token? (about 5 minutes, free)' }),
      h('p', { class: 'fbg-intro', text: 'You only do this once. Use the Facebook account that manages your Page, on a computer browser.' }),
      h('ol', {},
        step('Create a free app',
          'Open ', link('https://developers.facebook.com/apps/creation/', 'Meta for Developers'), ' and log in. If it asks, register as a developer first (free). ',
          'Name the app ', b('Mergio'), '. Under ', b('Use cases'), ' pick ', b('Content management'), ' then ', b('Manage everything on your Page'), '. ',
          'Choose ', b("I don't want to connect a business portfolio yet"), ', then ', b('Create app'), '.'),
        step('Turn on the permissions',
          'In your new app open ', b('Use cases'), ' → ', b('Manage everything on your Page'), ' → ', b('Customize'), '. Click ', b('Add'), ' next to ',
          c('pages_read_engagement'), ', ', c('pages_read_user_content'), ', ', b('Live Video API'), ' and ', b('Business Asset User Profile Access'), ' (this one shows viewers\' names and pictures).'),
        step('Generate a token',
          'Open the ', link('https://developers.facebook.com/tools/explorer/', 'Graph API Explorer'), '. Set ', b('Meta App'), ' to Mergio and add the permissions ',
          c('pages_show_list'), ', ', c('pages_read_engagement'), ' and ', c('pages_read_user_content'), '. Click ', b('Generate Access Token'), '. ',
          'In the popup click ', b('Continue'), ', choose ', b('Opt in to current Pages only'), ', tick your Page, then ', b('Continue'), ' and ', b('Save'), '. ',
          h('span', { class: 'hint', text: 'If Facebook asks you to switch accounts, click Continue: tokens come from your own profile, not from the Page profile.' })),
        step('Make it last',
          'Copy the token, open the ', link('https://developers.facebook.com/tools/debug/accesstoken/', 'Access Token Debugger'), ', paste it and click ', b('Debug'), '. ',
          'At the bottom click ', b('Extend Access Token'), ' and copy the new, long-lived token it shows.'),
        step('Get the Page token',
          'Back in the Graph API Explorer, paste the long-lived token into the ', b('Access Token'), ' box. In the query bar type your Page name followed by ',
          c('?fields=access_token'), ' (for example ', c('mypage?fields=access_token'), ') and click ', b('Submit'), '. Copy the ', c('access_token'), ' value from the answer.'),
        step('Paste it into Mergio',
          'Paste it into ', b('Settings → Accounts & keys → Facebook Page token'), '. Then on ', h('a', { href: '#chats', onclick: e => { e.preventDefault(); MG.go('chats'); } }, 'Chats'),
          ', add Facebook with your Page name. Mergio connects by itself every time you go live.')),
      h('p', { class: 'hint fbg-foot' }, 'A Page token made this way does not expire (the Access Token Debugger shows ', b('Expires: Never'), '). If Facebook ever asks you to log in again, about every 3 months, repeat steps 3 to 6.'));
  };

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
        MG.field('advanced', { key: 'facebookAccessToken', label: 'Facebook Page token', hint: 'Needed for Facebook comments', help: 'Facebook only lets apps read Live comments with a free token from your Page. The steps just below walk you through it.', type: 'secret', placeholder: 'Paste your token here' }),
        MG.fbTokenGuide(),
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

    c.append(h('p', { class: 'about' }, `Mergio ${st.version} · Free and open source (MIT) · `,
      h('a', { href: 'https://github.com/ruchira-edirisinghe/mergio', target: '_blank', rel: 'noopener' }, 'Website'), ' · ',
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
