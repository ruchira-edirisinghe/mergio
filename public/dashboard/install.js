/* Install the control panel as an app: its own window and taskbar icon instead of a browser tab. */
(() => {
  const { h, icon } = MG;
  let deferred = null; // the browser's install prompt, when it offers one

  const installed = () => ['standalone', 'window-controls-overlay', 'minimal-ui'].some(m => matchMedia(`(display-mode: ${m})`).matches);

  function refresh() {
    const b = document.getElementById('btnInstall');
    if (b) b.hidden = !deferred || installed();
    MG.refreshIf('settings', 'home');
  }

  window.addEventListener('beforeinstallprompt', e => { e.preventDefault(); deferred = e; refresh(); });
  window.addEventListener('appinstalled', () => {
    deferred = null;
    MG.toast('Mergio is installed. Opening Mergio now uses its own window.');
    refresh();
  });

  async function prompt() {
    if (!deferred) { MG.go('settings'); return false; }
    deferred.prompt();
    const { outcome } = await deferred.userChoice;
    deferred = null;
    refresh();
    return outcome === 'accepted';
  }

  /** The "Install as an app" row on the Settings page. */
  function row() {
    let ctl;
    if (installed()) ctl = h('span', { class: 'pill-ok' }, icon('check'), "You're using the app");
    else if (deferred) ctl = h('button', { class: 'btn primary sm', onclick: prompt }, icon('download'), 'Install app');
    else ctl = h('span', { class: 'hint install-how', text: 'Click the install icon at the right end of the address bar, or open the browser menu and choose "Install Mergio". (Not offered? Your browser may not support apps; Chrome, Edge and Brave do.)' });
    return MG.row('window', 'Use Mergio as an app', 'Opens the control panel in its own window, with its own icon. Opening Mergio then opens that window.', ctl, { search: 'install app window pwa taskbar' });
  }

  MG.install = { available: () => !!deferred && !installed(), installed, prompt, row };

  if ('serviceWorker' in navigator) navigator.serviceWorker.register('/sw.js').catch(() => {});
  MG.on('ready', () => {
    const b = document.getElementById('btnInstall');
    if (!b) return;
    b.append(icon('download'), h('span', { text: 'Install app' }));
    b.onclick = prompt;
    refresh();
  });
})();
