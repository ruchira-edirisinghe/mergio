/* What search engines read about each page: title, description and structured data (JSON-LD).
   scripts/prerender.mjs writes these into the HTML of every page at build time. */
import bundled from './lib/releases.json';
import { compareTags } from './lib/releases';
import { DOWNLOADS, REPO, SITE } from './lib/links';
import { CREATOR } from './sections/Closing';
import { FAQ } from './sections/More';

export interface PageMeta { path: string; file: string; title: string; description: string; name: string }

export const PAGES: PageMeta[] = [
  {
    path: '/', file: 'index.html', name: 'Mergio',
    title: 'Mergio · Free multistream chat overlay for OBS',
    description: 'Merge YouTube, Twitch, Kick, TikTok and Facebook live chat into one OBS overlay with game-style alerts and OBS docks. Free, open source, runs on your own PC.',
  },
  {
    path: '/privacy', file: 'privacy.html', name: 'Privacy policy',
    title: 'Privacy policy · Mergio',
    description: 'Mergio runs on your own computer: no account, no tracking and nothing sent to the developer. What the app keeps, what it connects to and how to delete it.',
  },
  {
    path: '/terms', file: 'terms.html', name: 'Terms of use',
    title: 'Terms of use · Mergio',
    description: 'The terms of use for Mergio, the free and open source live chat overlay for OBS, in plain words. MIT License, no account and no fees.',
  },
];

/** The newest version this page knows about, like "1.5.1". */
export function latestVersion() {
  const tags = (bundled.releases as { tag: string }[]).map(r => r.tag).sort((a, b) => compareTags(b, a));
  return (tags[0] || 'v1.0.0').replace(/^v/, '');
}

/** The JSON-LD graph for one page. */
export function jsonLd(page: PageMeta) {
  const url = `${SITE}${page.path === '/' ? '/' : page.path}`;
  const creator = { '@type': 'Person', '@id': `${SITE}/#creator`, name: CREATOR.name, url: CREATOR.url };
  const website = { '@type': 'WebSite', '@id': `${SITE}/#website`, url: `${SITE}/`, name: 'Mergio', inLanguage: 'en', publisher: { '@id': `${SITE}/#creator` } };
  const app = {
    '@type': 'SoftwareApplication',
    '@id': `${SITE}/#app`,
    name: 'Mergio',
    alternateName: 'Mergio multistream chat overlay',
    description: PAGES[0].description,
    url: `${SITE}/`,
    image: `${SITE}/og.png`,
    screenshot: `${SITE}/og.png`,
    applicationCategory: 'MultimediaApplication',
    applicationSubCategory: 'Live streaming chat overlay',
    operatingSystem: 'Windows, macOS, Linux',
    softwareVersion: latestVersion(),
    downloadUrl: DOWNLOADS.map(d => d.href),
    installUrl: `${REPO}/releases/latest`,
    softwareHelp: `${REPO}#readme`,
    license: 'https://opensource.org/licenses/MIT',
    isAccessibleForFree: true,
    offers: { '@type': 'Offer', price: '0', priceCurrency: 'USD' },
    featureList: [
      'YouTube, Twitch, Kick, TikTok and Facebook chat in one OBS browser source',
      'Ten game-style alert themes for gifts, subs, Super Chats, raids and follows, with gift rarity and viewer levels',
      'OBS docks for the chat, gifts received and live viewers',
      'Three saved looks for every overlay',
      'Live viewer count and follower goals for every platform, showing only the numbers you pick',
      'Hide any message from the chat overlay',
      'Real gift pictures and profile pictures',
      '7TV, BTTV and FFZ emotes',
      'Runs on your own PC with no account and no cloud',
    ],
    author: creator,
    publisher: { '@id': `${SITE}/#creator` },
    sameAs: [REPO],
  };
  const webpage = {
    '@type': 'WebPage', '@id': `${url}#webpage`, url, name: page.title, description: page.description, inLanguage: 'en',
    isPartOf: { '@id': `${SITE}/#website` },
    ...(page.path === '/' ? { about: { '@id': `${SITE}/#app` }, primaryImageOfPage: `${SITE}/og.png` } : {}),
  };
  const graph: object[] = [website, creator, app, webpage];
  if (page.path === '/') {
    graph.push({
      '@type': 'FAQPage', '@id': `${SITE}/#faq`,
      mainEntity: FAQ.map(([q, a]) => ({ '@type': 'Question', name: q, acceptedAnswer: { '@type': 'Answer', text: a } })),
    });
  } else {
    graph.push({
      '@type': 'BreadcrumbList',
      itemListElement: [
        { '@type': 'ListItem', position: 1, name: 'Mergio', item: `${SITE}/` },
        { '@type': 'ListItem', position: 2, name: page.name, item: url },
      ],
    });
  }
  return { '@context': 'https://schema.org', '@graph': graph };
}
