# Security policy

Mergio runs on your own PC, reads your live chats and keeps your platform tokens. I take that seriously, and I'm grateful for reports that help keep streamers safe.

## Supported versions

Only the **latest release** gets security fixes. The Windows app updates itself; on macOS and Linux, download the newest version from the [releases page](https://github.com/ruchira-edirisinghe/mergio/releases/latest).

| Version | Supported |
| ------- | --------- |
| Latest release | Yes |
| Anything older | No, please update |

## Reporting a vulnerability

**Please don't open a public issue for security problems.**

Report it privately through GitHub: open the [Security tab](https://github.com/ruchira-edirisinghe/mergio/security) and click **Report a vulnerability** ([direct link](https://github.com/ruchira-edirisinghe/mergio/security/advisories/new)). Only you and I can see the report.

Helpful things to include:

- the Mergio version and your operating system
- what an attacker can do, and what they need first (a website the streamer visits, a chat message, access to the PC...)
- steps to reproduce, or a small proof of concept

What happens next:

- I'll reply within **7 days** to confirm I've got it.
- I'll keep you updated while I work on a fix, and aim to ship it within **30 days** (sooner for serious issues).
- Once a fixed release is out, I'll publish a GitHub security advisory and credit you, unless you'd rather stay anonymous.

Please give me a reasonable chance to fix a problem before you share details publicly, and only test against your own setup and accounts.

## In scope

- The Mergio app: the local server (`127.0.0.1:8787`), control panel, chat, alerts, viewer count and follower goals overlays, platform connectors, follower lookups (including the hidden browser), auto-updater
- The installers and release builds published on GitHub
- The website (`mergio-stream-overlay-gamma.vercel.app`)

Out of scope: problems in YouTube, Twitch, Kick, TikTok, Facebook or other third-party services themselves, social engineering, and attacks that need someone to already control your user account (they could change the app itself).

## How Mergio protects you

**Local server**

- Listens on `127.0.0.1` only, so nothing on your network or the internet can reach it.
- Answers only requests addressed to `localhost` / `127.0.0.1` (stops DNS-rebinding attacks).
- The API and the live WebSocket only accept Mergio's own pages (`Origin` and `Sec-Fetch-Site` checks), so a website open in your browser can't change settings, add chats, read the chat feed, start an update or quit the app. Request bodies must be real JSON and at most 1 MB.
- Every page has a strict Content Security Policy (scripts only from Mergio itself). The control panel can't be shown inside another website (no clickjacking). Responses carry `nosniff`, `no-referrer` and a same-origin resource policy.
- Static files are only served from inside the app's `public/` folder.

**Chat content**

- Messages, names and alert text from viewers are always shown as plain text, never as HTML.
- Pictures (emotes, badges, profile pictures, gifts) are only loaded over `https`, without sending a referrer.
- Images posted as links only appear when you allow it (VIPs, mods and you by default, in Settings).

**Your tokens**

- The Facebook Page token, TikTok key and YouTube Data API key stay in `config.json` on your PC. They are never sent to the overlays or back to the control panel (it only sees that a token is saved).
- Tokens are removed from the log file, from error messages and from the lookup errors the follower goals overlay shows.
- The data folder is locked to your user account (plus SYSTEM and administrators on Windows), so other accounts on the same PC can't read it. The config is saved atomically, so a crash can't corrupt it.

**Updates**

- The update check only reads Mergio's public release list from GitHub and sends nothing about you.
- Before an automatic update runs, the downloaded installer's SHA-256 must match the checksum GitHub publishes for that release file, and it must come from GitHub's own servers. Otherwise it's deleted and not run.

**Follower goals**

- Follower counts are only looked up while the follower goals overlay or its control panel page is open, and **Refresh** looks each channel up at most every 15 seconds.
- TikTok and Facebook block plain requests, so their public profile pages are read in a hidden copy of Edge or Chrome. It can only open `https://www.tiktok.com/` and `https://www.facebook.com/` pages, runs one copy at a time with its own profile (not yours), and starts without extensions, sync or permission prompts.

**Input**

- Chat links and channel names are checked for every platform before Mergio connects, including chats loaded from `config.json`.
- Settings are type-checked, length-limited and range-checked (for example the port).

## Known limits

- **The installers aren't code-signed yet**, so Windows SmartScreen and macOS Gatekeeper warn on first launch. Download Mergio only from the [GitHub releases page](https://github.com/ruchira-edirisinghe/mergio/releases) and check the file (below).
- **Programs running as your user** can read your data folder and talk to the local API, like on any desktop app. Keep your PC free of malware.
- **Tools that aren't browsers** (scripts, Stream Deck plugins) can use the local API on purpose. Browsers can't.
- **Images posted in chat** load from wherever the link points, which tells that server your IP address. Keep image embeds limited to people you trust, or turn them off.
- **Third-party services** are used for display: profile pictures (Twitch, `decapi.me`, Kick), emotes (7TV, BTTV, FFZ), pronouns (`pronouns.alejo.io`, only when enabled), the TikTok gift list, TikTok signing (Euler Stream) and, for follower goals, Twitch's public API, YouTube channel pages (or the YouTube Data API with your key), Kick's channel API and TikTok and Facebook pages. They see requests from your PC, never your tokens (except a key you add for that service: the TikTok key goes to Euler Stream, the YouTube key to Google, the Facebook token to Facebook).
- **The hidden browser** runs TikTok's and Facebook's own page scripts, like visiting those pages yourself. Turn follower lookups off in Follower goals if you don't want that.

## Checking a download

Every file on the releases page shows its SHA-256 next to it. Compare it with the file you downloaded:

```powershell
# Windows (PowerShell)
Get-FileHash .\Mergio-Setup-windows-x64.exe -Algorithm SHA256
```

```sh
# macOS / Linux
shasum -a 256 Mergio-macos-arm64.dmg
```

If they don't match, delete the file and don't run it.

## Automated checks

Every pull request and every push to `main` runs:

- `npm run check`: syntax checks plus tests for link validation, settings, token masking and redaction, the local server's protections (other websites, DNS rebinding, disguised bodies, oversized bodies, path tricks, cross-site WebSockets, security headers) and update verification
- **CodeQL** code scanning for JavaScript/TypeScript and the GitHub workflows (also weekly)
- **npm audit** for the app's and the website's shipped dependencies (also weekly)
- **Dependency review**, which blocks pull requests that add dependencies with known high-severity vulnerabilities

**Dependabot** opens pull requests for outdated or vulnerable npm packages and GitHub Actions every week.

## Security checklist for changes

When you change Mergio, please check:

- [ ] Text from chat, platforms or settings goes into the page with `textContent` / `createTextNode`, never `innerHTML`.
- [ ] URLs from outside go through `safeUrl` (https only) before they become an `src` or `href`.
- [ ] New API routes sit behind the same-origin check in `src/server.js` and read JSON bodies with `readBody`.
- [ ] New settings have a default in `src/settings.js` (that's what gives them a type) and new secrets are added to `SECRETS`.
- [ ] Tokens never appear in URLs that get logged, in error messages or in anything sent to a page.
- [ ] Anything that runs a program uses `execFile`/`spawn` with an argument list, never a command string built from input.
- [ ] New pages for the hidden browser are added to its allow list in `src/browser.js` (https only), and lookups have a minimum interval.
- [ ] New overlay pages that the panel previews are added to the embeddable list in `pageHeaders` (`src/server.js`), and never the control panel itself.
- [ ] Channel names and ids from users are validated in `src/detect.js` and encoded with `encodeURIComponent` in URLs.
- [ ] No inline `<script>` or `on…=` attributes in pages (the CSP blocks them).
- [ ] New dependencies are really needed, maintained, and pass `npm audit`.
- [ ] `npm run check` passes, with tests for anything security-related.
