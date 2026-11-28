/* The go-live post the way Discord shows it: the message, then Mergio's card for a YouTube stream (who is live,
 * the title, every live link, the stream's thumbnail and the channel names under it).
 * Used by the control panel and the phone screens: MergioDiscordPost.render(text, card, opts) -> element.
 *   text: the message, card: preview.discordCard from GET /api/golive (or null), opts: { links: false } for plain text */
(() => {
  const LINK = /(https?:\/\/[^\s<>]+)/g;

  function el(tag, cls, text) {
    const e = document.createElement(tag);
    if (cls) e.className = cls;
    if (text != null) e.textContent = text;
    return e;
  }

  /** Text with its links shown as links (Discord's <link> is just a link without a preview). */
  function withLinks(cls, text, links) {
    const e = el('div', cls);
    String(text || '').replace(/<(https?:\/\/[^>\s]+)>/g, '$1').split(LINK).forEach((part, i) => {
      if (!part) return;
      if (i % 2 === 0) return e.append(part);
      const a = el(links ? 'a' : 'span', 'dp-link', part);
      if (links) { a.href = part; a.target = '_blank'; a.rel = 'noopener'; }
      e.append(a);
    });
    return e;
  }

  function render(text, card, opts = {}) {
    const links = opts.links !== false;
    const box = el('div', 'dp');
    box.append(withLinks('dp-text', text || '…', links));
    if (!card) return box;
    const c = el('div', 'dp-card');
    if (card.author?.name) c.append(el('div', 'dp-author', card.author.name));
    if (card.title) {
      const t = el(links ? 'a' : 'div', 'dp-title', card.title);
      if (links && card.url) { t.href = card.url; t.target = '_blank'; t.rel = 'noopener'; }
      c.append(t);
    }
    if (card.description) c.append(withLinks('dp-desc', card.description, links));
    if (card.image?.url) {
      const img = el('img', 'dp-img');
      img.alt = 'The stream’s thumbnail';
      img.src = card.image.url;
      c.append(img);
    } else c.append(el('div', 'dp-img dp-empty', 'Your stream’s thumbnail shows here when you’re live'));
    if (card.footer?.text) c.append(el('div', 'dp-foot', card.footer.text));
    box.append(c);
    return box;
  }

  window.MergioDiscordPost = { render };
})();
