/* Update popup: when a newer Mergio is out, show what's new and offer to update. On the installed Windows
   app the update downloads and installs by itself; elsewhere the button opens the download page.
   "What's new" popup: the first time the panel opens after a new version is installed (however it was
   installed), it shows that version's release notes once. */
(() => {
  'use strict';
  const { h, icon, $ } = MG;
  const SKIP = 'mg-update-later';
  let dlg = null;
  let waiting = false;

  const ago = iso => {
    const d = Math.round((Date.now() - new Date(iso)) / 864e5);
    return !iso || isNaN(d) ? '' : d <= 0 ? 'Released today' : d === 1 ? 'Released yesterday' : d < 30 ? `Released ${d} days ago` : `Released ${new Date(iso).toLocaleDateString()}`;
  };
  const skipped = u => { try { return sessionStorage.getItem(SKIP) === u.latest; } catch { return false; } };
  const later = u => { try { sessionStorage.setItem(SKIP, u.latest); } catch { /* private mode */ } };

  /* ---------- sidebar pill ---------- */
  function badge(u) {
    let b = $('#updPill');
    if (!u?.available) { b?.remove(); return; }
    if (!b) {
      b = h('button', { id: 'updPill', class: 'upd-pill', type: 'button', onclick: () => open(MG.st.update, true) },
        h('span', { class: 'upd-dot' }), h('span', { class: 'lbl' }));
      $('.brand').append(b);
    }
    b.querySelector('.lbl').textContent = `Update to v${u.latest}`;
    b.title = `Mergio ${u.latest} is ready. Click to see what's new.`;
  }

  /* ---------- the popup ---------- */
  function close(remember = true) {
    if (!dlg || dlg.classList.contains('out')) return;
    if (remember) later(MG.st.update);
    const d = dlg;
    d.classList.add('out');
    const done = () => { d.close(); d.remove(); if (dlg === d) dlg = null; };
    if (matchMedia('(prefers-reduced-motion: reduce)').matches) done(); else setTimeout(done, 260);
  }

  const noteItems = notes => notes.map((n, i) => h('li', { style: `--i:${i}` },
    h('span', { class: 'ic' }, icon('sparkle')),
    h('div', {}, n.title ? h('b', { text: n.title }) : null, n.text ? h('p', { text: n.text }) : null)));
  const hero = onClose => h('div', { class: 'upd-hero' },
    h('div', { class: 'upd-glow' }), h('div', { class: 'upd-rings' }, h('i'), h('i'), h('i')),
    h('div', { class: 'upd-logo' }, h('img', { src: '/shared/logo.svg', alt: '' })),
    h('button', { class: 'upd-x', type: 'button', 'aria-label': 'Close', onclick: onClose }, icon('plus')));

  function open(u, force = false) {
    if (!u?.available || dlg || wn || (!force && skipped(u))) return;
    const notes = (u.notes || []).slice(0, 6);
    const list = h('ul', { class: 'upd-list' }, noteItems(notes));
    const more = (u.notes || []).length > notes.length || u.behind > 1;

    const primary = h('button', { class: 'btn primary upd-go', type: 'button', onclick: () => go(u) },
      icon(u.canInstall ? 'download' : 'external'), h('span', { text: u.canInstall ? 'Download and install' : 'Get the new version' }));
    const actions = h('div', { class: 'upd-actions' },
      h('button', { class: 'btn ghost', type: 'button', onclick: () => close() }, 'Not now'), primary);
    const progress = h('div', { class: 'upd-progress', hidden: true },
      h('div', { class: 'upd-bar' }, h('i')),
      h('div', { class: 'upd-ptext' }, h('span', { class: 'st', text: 'Starting the download…' }), h('span', { class: 'pc', text: '' })));

    dlg = h('dialog', { class: 'upd', 'aria-labelledby': 'updTitle' },
      hero(() => close()),
      h('div', { class: 'upd-body' },
        h('div', { class: 'upd-vers' },
          h('span', { class: 'old', text: `v${u.current}` }), h('span', { class: 'arr' }, icon('chevron')), h('span', { class: 'new', text: `v${u.latest}` }),
          u.publishedAt ? h('span', { class: 'when', text: ago(u.publishedAt) }) : null),
        h('h2', { id: 'updTitle' }, 'Mergio ', h('span', { class: 'grad', text: u.latest }), ' is here'),
        h('p', { class: 'upd-sub', text: u.behind > 1 ? `You're ${u.behind} updates behind. Here's what you're missing:` : "Here's what's new:" }),
        list,
        more ? h('a', { class: 'upd-all', href: u.url, target: '_blank', rel: 'noopener' }, 'See everything that changed', icon('external')) : null,
        h('div', { class: 'upd-warn' }, icon('info'),
          h('p', {}, h('b', { text: 'Updating is highly recommended. ' }),
            `Many bugs in v${u.current} have been fixed in v${u.latest}. Your chats, style and settings stay as they are.`)),
        actions, progress));
    dlg.addEventListener('cancel', e => { e.preventDefault(); if (!waiting) close(); });
    dlg.addEventListener('click', e => { if (e.target === dlg && !waiting) close(); });
    document.body.append(dlg);
    dlg.showModal();
    primary.focus();
  }

  async function go(u) {
    if (!u.canInstall) { window.open(u.url, '_blank', 'noopener'); close(); return; }
    try {
      waiting = true;
      dlg.classList.add('busy');
      dlg.querySelector('.upd-actions').hidden = true;
      dlg.querySelector('.upd-progress').hidden = false;
      MG.st.update = await MG.api('POST', '/api/update/install', {});
      show(MG.st.update);
    } catch (e) { waiting = false; fail(e.message); }
  }

  function fail(msg) {
    if (!dlg) return MG.toast(msg, true);
    dlg.classList.remove('busy');
    dlg.querySelector('.upd-actions').hidden = false;
    dlg.querySelector('.upd-progress').hidden = true;
    dlg.querySelector('.upd-go span').textContent = 'Try again';
    MG.toast(msg, true);
  }

  /** Mirrors the download/install progress the app reports over the live connection. */
  function show(u) {
    const job = u?.job || {};
    if (job.state === 'error' && waiting) { waiting = false; return fail(job.error || 'The update failed. Please try again.'); }
    if (!dlg || !['downloading', 'installing'].includes(job.state)) return;
    const bar = dlg.querySelector('.upd-bar'), st = dlg.querySelector('.upd-progress .st'), pc = dlg.querySelector('.upd-progress .pc');
    if (job.state === 'downloading') {
      bar.classList.remove('indet');
      bar.firstChild.style.transform = `scaleX(${Math.max(0.02, job.progress)})`;
      st.textContent = `Downloading Mergio ${u.latest}…`;
      pc.textContent = `${Math.round(job.progress * 100)}%`;
    } else {
      bar.classList.add('indet');
      st.textContent = 'Installing. Mergio will close and open again by itself…';
      pc.textContent = '';
      document.body.classList.add('updating');
      watchRestart(u.latest);
    }
  }

  /** Waits for the new version to answer, then reloads the panel. */
  let watching = false;
  function watchRestart(version) {
    if (watching) return;
    watching = true;
    const started = Date.now();
    const tick = async () => {
      try {
        const st = await fetch('/api/state', { cache: 'no-store' }).then(r => r.json());
        if (st.version === version) { location.reload(); return; }
      } catch { /* still restarting */ }
      if (Date.now() - started > 120000) { document.body.classList.remove('updating'); waiting = false; fail('The update is taking longer than expected. Open Mergio again from its icon.'); watching = false; return; }
      setTimeout(tick, 1500);
    };
    setTimeout(tick, 2500);
  }

  /* ---------- "What's new" after an update ---------- */
  let wn = null;

  /** Fills in the notes; they may arrive a moment after the popup opens (Mergio fetches them from GitHub). */
  function wnNotes(w) {
    if (!wn) return;
    const list = wn.querySelector('.upd-list'), sub = wn.querySelector('.upd-sub');
    const notes = (w.notes || []).slice(0, 8);
    if (w.url) wn.querySelector('.upd-all').href = w.url;
    if (w.publishedAt) wn.querySelector('.upd-vers .when').textContent = ago(w.publishedAt);
    if (notes.length) {
      list.replaceChildren(...noteItems(notes));
      list.hidden = false;
      sub.textContent = "Here's what's new in this version:";
    } else if (wn.dataset.waited) {
      list.hidden = true;
      sub.textContent = "The release notes couldn't be loaded right now. You can read them on GitHub.";
    }
  }

  function closeWhatsNew() {
    if (!wn || wn.classList.contains('out')) return;
    const d = wn;
    d.classList.add('out');
    MG.api('POST', '/api/update/seen', {}).then(u => { MG.st.update = u; }).catch(() => {});
    const done = () => {
      d.close(); d.remove(); if (wn === d) wn = null;
      if (MG.st.update?.available) setTimeout(() => open(MG.st.update), 300); // an even newer version is out
    };
    if (matchMedia('(prefers-reduced-motion: reduce)').matches) done(); else setTimeout(done, 260);
  }

  function openWhatsNew(w) {
    if (!w?.show || wn || dlg || document.querySelector('dialog.guide[open]')) return;
    wn = h('dialog', { class: 'upd wn', 'aria-labelledby': 'wnTitle' },
      hero(closeWhatsNew),
      h('div', { class: 'upd-body' },
        h('div', { class: 'upd-vers' },
          h('span', { class: 'done' }, icon('check'), 'Installed'), h('span', { class: 'new', text: `v${w.version}` }),
          h('span', { class: 'when', text: w.publishedAt ? ago(w.publishedAt) : '' })),
        h('h2', { id: 'wnTitle' }, 'Welcome to Mergio ', h('span', { class: 'grad', text: w.version })),
        h('p', { class: 'upd-sub', text: 'Getting the release notes…' }),
        h('ul', { class: 'upd-list' }, [0, 1, 2].map(i => h('li', { class: 'wn-wait', style: `--i:${i}` }, h('span', { class: 'ic' }), h('div', {}, h('i'), h('i'))))),
        h('a', { class: 'upd-all', href: w.url, target: '_blank', rel: 'noopener' }, 'Read the full release notes', icon('external')),
        h('div', { class: 'upd-warn ok' }, icon('check'),
          h('p', {}, h('b', { text: "You're up to date. " }), 'Your chats, style and settings were kept.')),
        h('div', { class: 'upd-actions' }, h('button', { class: 'btn primary', type: 'button', onclick: closeWhatsNew }, 'Got it'))));
    wn.addEventListener('cancel', e => { e.preventDefault(); closeWhatsNew(); });
    wn.addEventListener('click', e => { if (e.target === wn) closeWhatsNew(); });
    document.body.append(wn);
    wn.showModal();
    wn.querySelector('.upd-actions .btn').focus();
    wnNotes(w);
    if (!(w.notes || []).length) waitForNotes();
  }

  /** Right after an update the notes can arrive before the live connection is open, so ask for them
      directly until they're there. If GitHub can't be reached, point to the online notes instead. */
  function waitForNotes(tries = 0) {
    setTimeout(async () => {
      if (!wn) return;
      try { MG.st.update = await MG.api('GET', '/api/update'); } catch { /* still starting */ }
      const w = MG.st.update?.whatsNew || {};
      if ((w.notes || []).length) return wnNotes(w);
      if (tries < 7) return waitForNotes(tries + 1);
      wn.dataset.waited = '1';
      wnNotes(w);
    }, 1000);
  }

  MG.openUpdate = (force = true) => open(MG.st.update, force);
  MG.on('ready', () => {
    badge(MG.st.update);
    // Give the opening animation a moment before a popup appears. "What's new" goes first.
    setTimeout(() => {
      const u = MG.st.update;
      if (u?.whatsNew?.show) openWhatsNew(u.whatsNew);
      else if (u?.available) open(u);
    }, 900);
  });
  MG.on('update', u => {
    const was = MG.st.update?.available;
    MG.st.update = u;
    badge(u);
    show(u);
    if (wn) wnNotes(u.whatsNew || {});
    if (u.available && !was) open(u);
  });
})();
