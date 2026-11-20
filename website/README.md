# Mergio website

The landing page for [Mergio](https://github.com/ruchira-edirisinghe/mergio), built with React, TypeScript, Vite, Tailwind CSS and lucide-react.

Every demo on the page (the stream scene, chat overlay, alerts, gift pictures, control panel and OBS dock) is drawn in code; there are no videos or screenshots. Download buttons go to the latest GitHub release.

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

## Deploy on Vercel

Import the repository and set the **Production Branch** to `website`. The `vercel.json` at the repository root tells Vercel to install and build from this folder, so no other settings are needed.
