/* Help: the guide, common questions and where to get more help. */
(() => {
  const { h, icon } = MG;
  const qa = (q, ...a) => h('details', { class: 'qa' }, h('summary', { text: q }), ...a);
  const goto = (id, text) => h('a', { href: `#${id}`, onclick: e => { e.preventDefault(); MG.go(id); } }, text);

  function render(c) {
    c.append(h('section', { class: 'card hero guide-cta' },
      h('div', {}, h('h2', { text: 'New to Mergio? Take the 1-minute tour' }), h('p', { class: 'sub', text: 'Five short steps: connect your chats, style the overlay, add it to OBS and go live.' })),
      h('button', { class: 'btn primary', onclick: () => MG.openGuide() }, icon('play'), 'Start the tour')));

    c.append(MG.card('Common questions', null,
      qa('How do I open Mergio?', h('p', {}, 'Click the Mergio icon in the Start menu or on your desktop. Mergio runs in the background and opens this control panel in your browser. Clicking the icon again (while it runs) reopens this page. You can also ', goto('settings', 'install the control panel as an app'), ' so it opens in its own window.')),
      qa('Which links can I add?', h('ul', {},
        h('li', { text: 'YouTube: your channel (youtube.com/@name) or a live video link. With the channel link Mergio finds your live stream by itself.' }),
        h('li', { text: 'Twitch, Kick and TikTok: just pick the platform on the Chats page and type your username.' }),
        h('li', { text: 'Facebook: your Page link (facebook.com/yourpage), plus a token (see below). Mergio finds your live video by itself every time you go live.' }))),
      qa('A chat says "Waiting for you to go live"', h('p', { text: "That's normal while you're offline. Mergio keeps checking and connects by itself when your stream starts." })),
      qa('The chat does not show in OBS', h('p', {}, 'See the quick fixes on the ', goto('obs', 'Add to OBS'), ' page. That page also tells you whether OBS is showing the overlay right now.')),
      qa('How do I set up Facebook?', h('p', {}, 'Facebook needs a free Page token. The guide below shows each Facebook screen and what to click, then checks and saves the token for you. After that, on ',
        goto('chats', 'Chats'), ' pick Facebook and type your Page name once. Mergio connects whenever you go live.'), MG.fbGuideCallout()),
      qa('TikTok does not connect', h('p', {}, 'Make sure you are LIVE and the username is right. If it says it is busy, add a free key from eulerstream.com in ', goto('settings', 'Settings → Accounts'), '.')),
      qa("Why don't Twitch follows or Kick/YouTube joins show as alerts?", h('p', {}, 'Twitch only tells logged-in apps who just followed, and Kick and YouTube don\'t share joins at all. Your follower ', h('b', { text: 'counts' }), ' still work for every platform: see ', goto('followers', 'Follower goals'), '.')),
      qa('The viewer count or a follower goal shows –', h('ul', {},
        h('li', { text: 'Viewer count: a platform shows a number only while that chat is connected and you are live. Turn on "Only platforms that are live" to leave it out until then.' }),
        h('li', {}, 'Follower goals: counts are looked up every minute or two while the overlay or the ', goto('followers', 'Follower goals'), ' page is open. Press Refresh to look them up now.'),
        h('li', { text: 'TikTok and Facebook counts are read from your public profile in a hidden copy of Microsoft Edge or Google Chrome, so one of them must be installed. A Facebook video link has no follower count: add your Page instead.' }),
        h('li', {}, 'YouTube rounds big subscriber counts. For the exact number, add a free YouTube Data API key in ', goto('settings', 'Settings → Accounts & keys'), '.'))),
      qa('How do I tell my Discord or Telegram that I am live?', h('p', {}, 'Turn on the ', goto('golive', 'Go-live post'), '. When your stream starts, Mergio posts your title and link (plus your other channels) to Discord, Telegram, Slack or any app with a webhook, once per stream. WhatsApp doesn’t let apps post to groups, so that page has a one-tap WhatsApp button instead.')),
      qa('Does Mergio slow down my stream?', h('p', { text: 'No. It is a tiny background app (about 50 to 80 MB of memory) and the overlay only uses smooth, GPU-friendly animations.' }))));

    c.append(MG.card('Still stuck?', null,
      h('div', { class: 'btn-row' },
        h('a', { class: 'btn', href: 'https://github.com/ruchira-edirisinghe/mergio#complete-guide', target: '_blank', rel: 'noopener' }, icon('external'), 'Full online guide'),
        h('a', { class: 'btn', href: 'https://github.com/ruchira-edirisinghe/mergio/issues/new/choose', target: '_blank', rel: 'noopener' }, icon('chat'), 'Report a problem'))));
  }

  MG.page({ id: 'help', order: 90, group: 'app', label: 'Help', icon: 'help', title: 'Help', subtitle: 'Answers to common questions', render });
})();
