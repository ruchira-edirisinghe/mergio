# Mergio for developers

## How it works

```
 YouTube ─┐  (innertube live chat)
 Twitch ──┤  (anonymous IRC over WebSocket)                         ┌──> Chat, Alerts, Viewers, Followers overlays (OBS)
 Kick ────┼─> connectors ─> one message format ─> local server ─WS─┼──> Control panel (browser / OBS dock)
 TikTok ──┤  (TikTok-Live-Connector)            (127.0.0.1:8787)    └──> Live chat list
 Facebook ┘  (Graph API with your token)
```

- One small Node.js process runs everything: the platform connectors, a tiny HTTP + WebSocket server and your settings.
- The overlays and the control panel are plain HTML, CSS and JavaScript served by that process. The UI has no framework and no build step.
- `npm run build` bundles the code with esbuild and packs it with the web files into one executable using Node's [Single Executable Applications](https://nodejs.org/api/single-executable-applications.html). `npm run package` makes the installers for the system you run it on (the Windows installer needs [Inno Setup 6](https://jrsoftware.org/isinfo.php)). Pushing a tag like `v1.5.0` builds and publishes every system's files with GitHub Actions.

**Resource use:** about 45 MB of memory with nothing connected and 70 to 80 MB with very busy chats, at close to 0% CPU. Message lists are capped, picture lookups are cached and rate-limited, and the overlays only animate `transform` and `opacity`.

## Where things are

```
src/
  main.js          entry point: starts the server, opens the control panel, single-instance handling
  server.js        HTTP routes, REST API, WebSocket broadcast, avatar and pronoun helpers
  manager.js       the list of chats, one connector per chat, the message buffer
  settings.js      defaults and saving (every option lives here)
  stats.js         live viewer and follower counts for the counter overlays
  followers.js     follower lookups for each platform
  detect.js        link -> { platform, target }
  connectors/      twitch.js, youtube.js, kick.js, tiktok.js, facebook.js (all extend base.js)
public/
  overlay/         the chat overlay (OBS browser source)
  alerts/          the alerts overlay
  viewers/         the viewer count overlay
  followers/       the follower goals overlay
  dashboard/       the control panel
  shared/          brand icons (from Simple Icons), glyphs, logo, counter helpers
scripts/           build.mjs (single executable), package.mjs (installers), gen-icons.mjs
packaging/         windows/ (Inno Setup), macos/ (.app + .dmg), linux/ (.deb, tar.gz + install.sh)
website/           the landing page (React + Vite), see website/README.md
```

Settings are saved in `config.json`, next to `mergio.log`:

| Install | Folder |
|---|---|
| Windows, installed for you only, or portable | `data` next to `Mergio.exe` |
| Windows, installed for all users | `%APPDATA%\Mergio` |
| macOS | `~/Library/Application Support/Mergio` |
| Linux | `~/.config/Mergio` (`.deb`) or `~/.local/share/mergio/data` (`install.sh`) |

## Message format

What connectors emit and the overlays receive:

```jsonc
{
  "id": "unique id (the same id again = an update, e.g. a TikTok gift combo)",
  "platform": "twitch | youtube | kick | tiktok | facebook",
  "type": "chat | superchat | supersticker | cheer | sub | giftsub | gift | raid | member | milestone | redemption | powerup | streak | announcement | join | like | follow | share",
  "time": 1795162628472,
  "user": { "id": "", "name": "", "login": "", "color": "#ff0000", "avatar": "https://…", "badges": [{ "id": "moderator", "title": "Moderator", "img": "https://…" }],
            "roles": { "broadcaster": false, "mod": true, "vip": false, "sub": false, "member": false, "verified": false } },
  "parts": [{ "type": "text", "text": "hello " }, { "type": "emote", "name": "Kappa", "url": "https://…" }],
  "event": { "kind": "gift", "title": "sent Rose", "amount": "×10", "image": "https://…", "color": "#fe2c55", "value": 10 },
  "flags": { "reply": { "name": "", "text": "" }, "firstMessage": false, "shared": false }
}
```

## Local API

It only listens on `127.0.0.1` and only answers Mergio's own pages.

| Route | What it does |
|---|---|
| `GET /api/state` | Settings, chats, overlay links and status |
| `PUT /api/settings` | Change settings (send only what changes) |
| `POST /api/sources` `{input}` | Add a chat from a name or link |
| `DELETE /api/sources/:id` | Remove a chat |
| `POST /api/sources/:id/reconnect` | Reconnect a chat |
| `POST /api/sources/:id/enabled` `{enabled}` | Pause or resume a chat |
| `POST /api/test` `{kind}` | Send a sample message or alert (`burst` sends one of each) |
| `POST /api/followers/refresh` | Look up follower counts now |
| `POST /api/clear` | Clear the overlay and the Live chat list |

The WebSocket at `/ws` sends `hello`, `msg`, `delete`, `settings`, `sources`, `stats`, `overlays` and `clear`. You can build your own overlays on top of it.

## Adding a platform

Create `src/connectors/<name>.js` extending `Connector`, call `this.push({...})` with the format above, register it in `manager.js` and teach `detect.js` its links. Call `stats.setViewers` and `stats.setFollowers` if the platform shares those numbers.

[← Back to the README](../README.md)
