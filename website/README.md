# Mergio website

The landing page for [Mergio](https://github.com/ruchira-edirisinghe/mergio), built with React, TypeScript, Vite, Tailwind CSS and lucide-react.

The chat overlay, alerts, control panel and OBS demos on the page are drawn in code and animate live. The backgrounds are real stream footage. Download buttons go to the latest GitHub release.

## Develop

```sh
cd website
npm install
npm run dev
```

## Build

```sh
npm run build    # type-checks, then writes website/dist
npm run preview  # serves the build locally
```

The build renders every page to finished HTML (`src/entry-server.tsx` and `scripts/prerender.mjs`), so search engines and link previews get the whole page without running JavaScript; React then takes over that HTML in the browser. Each page's title, description and structured data (JSON-LD for the app, the site, the FAQ and breadcrumbs) live in `src/seo.ts`. The build also writes `sitemap.xml` and a `404.html`; `public/robots.txt` points search engines to the sitemap. Code that renders on the page must not touch `window` or `document` outside effects and event handlers, or the build fails.

## Deploy on Vercel

1. In Vercel, choose **Add New → Project** and import this repository.
2. Leave **Root Directory** empty and keep the default settings. The `vercel.json` at the repository root installs and builds this folder.
3. Deploy. Vercel publishes the `main` branch. Other branches and pull requests don't deploy.

A push to `main` only deploys when `website/` or `vercel.json` changed since the last commit Vercel deployed (`ignoreCommand` in `vercel.json`). When Vercel can't tell what it deployed last, it builds anyway. To deploy without a change, redeploy with the environment variable `FORCE_DEPLOY=1`.

## Media credits

All media is free to use commercially, with no attribution required. Credit is given anyway.

| File | Source | License |
| --- | --- | --- |
| `public/video/live-streamer*` | [Pexels 7914841](https://www.pexels.com/video/7914841/), [Pexels 7914828](https://www.pexels.com/video/7914828/) | [Pexels License](https://www.pexels.com/license/) |
| `public/video/night-gamer` | [Pexels 10620281](https://www.pexels.com/video/10620281/) | [Pexels License](https://www.pexels.com/license/) |
| `public/video/celebrate`, `neon-gamer`, `rgb-desk` | Mixkit clips 51612, 51619, 51616 | [Mixkit Stock Video Free License](https://mixkit.co/license/#videoFree) |
| `public/faces/*` | Portraits from [Pexels](https://www.pexels.com) | [Pexels License](https://www.pexels.com/license/) |

Platform and app logos come from [Simple Icons](https://simpleicons.org) (CC0). The trademarks belong to their owners.
