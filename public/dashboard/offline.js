/* The "Mergio isn't running" page (kept by the service worker). A separate file so the page needs no inline script. */
// macOS opens the app from Applications; Windows and Linux installs register the mergio:// link.
if (/Mac/.test(navigator.platform)) {
  document.getElementById('how').textContent = 'Open Mergio from your Applications folder. This window opens the control panel by itself.';
  document.getElementById('start').remove();
}
setInterval(() => fetch('/api/state', { cache: 'no-store' }).then(r => { if (r.ok) location.replace('/dashboard'); }).catch(() => {}), 2000);
