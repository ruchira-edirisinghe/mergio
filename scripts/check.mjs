// Quick self-test: syntax-checks every source file and unit-tests link detection and settings handling.
//   npm run check
import { readdirSync, statSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { execFileSync } from 'node:child_process';
import { createRequire } from 'node:module';
import assert from 'node:assert/strict';
import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
process.env.MERGIO_DATA = mkdtempSync(join(tmpdir(), 'mergio-check-'));
const require = createRequire(import.meta.url);
let failed = 0;
const test = (name, fn) => { try { fn(); console.log(`  ok  ${name}`); } catch (e) { failed++; console.log(`  FAIL ${name}\n       ${e.message}`); } };

console.log('Syntax');
const files = [];
const walk = d => readdirSync(d).forEach(n => { const p = join(d, n); statSync(p).isDirectory() ? walk(p) : p.endsWith('.js') && files.push(p); });
walk(join(root, 'src')); walk(join(root, 'public'));
for (const f of files) test(f.slice(root.length + 1), () => execFileSync(process.execPath, ['--check', f]));

console.log('Link detection');
const { detect } = require(join(root, 'src/detect.js'));
const cases = [
  ['https://www.twitch.tv/SomeOne', 'twitch', 'someone'],
  ['twitch.tv/popout/abc/chat', 'twitch', 'abc'],
  ['kick:xqc', 'kick', 'xqc'],
  ['https://kick.com/Some_Streamer', 'kick', 'some_streamer'],
  ['https://www.tiktok.com/@cool.user/live', 'tiktok', 'cool.user'],
  ['tiktok:@cool.user', 'tiktok', 'cool.user'],
  ['https://www.youtube.com/watch?v=jfKfPfyJRdk&t=1', 'youtube', 'jfKfPfyJRdk'],
  ['https://youtu.be/jfKfPfyJRdk', 'youtube', 'jfKfPfyJRdk'],
  ['https://www.youtube.com/live/jfKfPfyJRdk?si=x', 'youtube', 'jfKfPfyJRdk'],
  ['https://www.youtube.com/@LofiGirl', 'youtube', '@LofiGirl'],
  ['https://studio.youtube.com/video/jfKfPfyJRdk/livestreaming', 'youtube', 'jfKfPfyJRdk'],
  ['https://www.youtube.com/@%E0%B6%BB%E0%B7%94%E0%B6%A0%E0%B7%92%E0%B6%BB', 'youtube', '@රුචිර'],
  ['https://www.youtube.com/channel/UCSJ4gkVC6NrvII8umztf0Ow', 'youtube', 'channel/UCSJ4gkVC6NrvII8umztf0Ow'],
  ['https://www.facebook.com/somepage/videos/1234567890123/', 'facebook', '1234567890123'],
  ['https://www.facebook.com/watch/?v=1234567890123', 'facebook', '1234567890123'],
  ['https://www.facebook.com/somepage', 'facebook', 'page:somepage'],
  ['https://www.facebook.com/somepage/live', 'facebook', 'page:somepage'],
  ['fb:somepage', 'facebook', 'page:somepage'],
  ['https://www.facebook.com/profile.php?id=100089123456', 'facebook', 'page:100089123456'],
];
for (const [input, platform, target] of cases) test(input, () => { const r = detect(input); assert.equal(r.platform, platform); assert.equal(r.target, target); });
for (const bad of ['', 'hello world', 'https://example.com/x', 'https://www.facebook.com/watch/live/', 'yt:@a/../../x', 'yt:jfKfPfyJRdk?x=1', 'https://www.youtube.com/watch?v=../../evil', 'twitch:a b', 'fb:page:a/b']) test(`rejects "${bad}"`, () => assert.throws(() => detect(bad)));

console.log('Settings');
const settings = require(join(root, 'src/settings.js'));
test('coerces types and drops unknown keys', () => {
  const s = settings.update({ appearance: { fontSize: '28', showAvatar: 'false', nope: 1 }, bogus: true });
  assert.equal(s.appearance.fontSize, 28);
  assert.equal(s.appearance.showAvatar, false);
  assert.equal('nope' in s.appearance, false);
  assert.equal('bogus' in s, false);
});
test('public view hides tokens', () => {
  settings.update({ advanced: { facebookAccessToken: 'secret' } });
  assert.equal(JSON.stringify(settings.publicView()).includes('secret'), false);
});
test('control panel view masks tokens', () => {
  settings.update({ advanced: { facebookAccessToken: 'EAAsecretvalue' } });
  const v = settings.panelView();
  assert.equal(JSON.stringify(v).includes('EAAsecretvalue'), false);
  assert.equal(v.advanced.facebookAccessToken, settings.MASK);
  assert.equal(settings.panelView({ ...settings.get(), advanced: { ...settings.get().advanced, tiktokSignApiKey: '' } }).advanced.tiktokSignApiKey, '');
});
test('the YouTube key is masked like the other tokens', () => {
  settings.update({ advanced: { youtubeApiKey: 'AIzaSyFakeKey0123456789abcdefghijklmn' } });
  assert.equal(settings.panelView().advanced.youtubeApiKey, settings.MASK);
  assert.equal(JSON.stringify(settings.publicView()).includes('AIza'), false);
  settings.update({ advanced: { youtubeApiKey: '' } });
});
test('follower lookup errors shown on overlays hide tokens', () => {
  const stats = require(join(root, 'src/stats.js'));
  stats.setFollowers('s-test', null, 'HTTP 400 for https://www.googleapis.com/youtube/v3/channels?part=statistics&key=AIzaSyFakeKey0123456789');
  assert.equal(stats.followers.get('s-test').err.includes('AIza'), false);
});
test('the hidden browser only opens TikTok and Facebook pages', () => {
  const { ALLOWED } = require(join(root, 'src/browser.js'));
  for (const ok of ['https://www.tiktok.com/@someone?lang=en', 'https://www.facebook.com/somepage']) assert.equal(ALLOWED.test(ok), true, ok);
  for (const bad of ['https://evil.example/', 'http://www.tiktok.com/@a', 'https://www.tiktok.com.evil.example/', 'file:///C:/x', '--remote-debugging-port=9222']) assert.equal(ALLOWED.test(bad), false, bad);
});
test('tokens are hidden in logs and error messages', () => {
  const { redact } = require(join(root, 'src/util.js'));
  const out = redact('HTTP 400 for https://graph.facebook.com/v21.0/123?fields=id&access_token=EAABsbCS1iHgBAKZBZCq12345678901234567890 &key=AIzaXYZ token EAAG0123456789abcdefghijABCDEFGHIJ0123');
  assert.equal(/EAAB|AIza|EAAG/.test(out), false, out);
  assert.match(out, /fields=id&access_token=\[hidden\]/);
});
test('sending the mask back keeps the saved token', () => {
  settings.update({ advanced: { facebookAccessToken: settings.MASK } });
  assert.equal(settings.get().advanced.facebookAccessToken, 'EAAsecretvalue');
  settings.update({ advanced: { facebookAccessToken: settings.MASK + 'typed' } });
  assert.equal(settings.get().advanced.facebookAccessToken, 'EAAsecretvalue');
  settings.update({ advanced: { facebookAccessToken: '���' } });
  assert.equal(settings.get().advanced.facebookAccessToken, 'EAAsecretvalue');
  settings.update({ advanced: { facebookAccessToken: '' } });
  assert.equal(settings.get().advanced.facebookAccessToken, '');
});
test('settings stay in range, on real choices and real colours', () => {
  const before = structuredClone(settings.get());
  const s = settings.update({
    appearance: { fontSize: 1e9, maxMessages: 1e7, bubbleOpacity: -3, theme: 'x"><b', animation: 'zzz', textColor: 'url(https://e.x/a)', font: "Inter'; color: red" },
    general: { hideAfter: -50 }, alerts: { duration: -1, size: 99, style: 'nope' }, followers: { goalStep: -100, barColor: 'red' }, viewers: { fontSize: 'big' },
  });
  assert.equal(s.appearance.fontSize, 48);
  assert.equal(s.appearance.maxMessages, 80);
  assert.equal(s.appearance.bubbleOpacity, 0);
  assert.equal(s.appearance.theme, before.appearance.theme);
  assert.equal(s.appearance.animation, before.appearance.animation);
  assert.equal(s.appearance.textColor, before.appearance.textColor);
  assert.equal(s.appearance.font, before.appearance.font);
  assert.equal(s.general.hideAfter, 5);
  assert.equal(s.alerts.duration, 2);
  assert.equal(s.alerts.size, 2);
  assert.equal(s.alerts.style, before.alerts.style);
  assert.equal(s.followers.goalStep, 1);
  assert.equal(s.followers.barColor, before.followers.barColor);
  assert.equal(s.viewers.fontSize, before.viewers.fontSize);
  const ok = settings.update({ appearance: { theme: 'neon', textColor: '#AABBCC', font: 'Noto Sans Sinhala' }, alerts: { duration: 7.5 } });
  assert.equal(ok.appearance.theme, 'neon');
  assert.equal(ok.appearance.textColor, '#AABBCC');
  assert.equal(ok.appearance.font, 'Noto Sans Sinhala');
  assert.equal(ok.alerts.duration, 7.5);
  settings.reset();
});

console.log('Local server security');
{
  const http = require('node:http');
  const { EventEmitter } = require('node:events');
  const WebSocket = require('ws');
  const { createServer } = require(join(root, 'src/server.js'));
  const noop = () => {};
  const manager = Object.assign(new EventEmitter(), { list: () => [], recent: [], add: noop, remove: noop, reconnect: noop, setEnabled: noop, inject: noop, reconnectPlatform: noop });
  const server = createServer(manager, { onQuit: noop });
  await new Promise(r => server.listen(0, '127.0.0.1', r));
  const port = server.address().port;
  const self = `http://127.0.0.1:${port}`;
  const call = (path, { method = 'GET', headers = {}, body } = {}) => new Promise((resolve, reject) => {
    const r = http.request({ host: '127.0.0.1', port, path, method, headers: { Host: `127.0.0.1:${port}`, ...headers } }, res => {
      let data = ''; res.on('data', c => { data += c; }); res.on('end', () => resolve({ status: res.statusCode, headers: res.headers, body: data }));
    });
    r.on('error', reject);
    r.end(body);
  });
  const json = { 'Content-Type': 'application/json' };
  const atest = async (name, fn) => { try { await fn(); console.log(`  ok  ${name}`); } catch (e) { failed++; console.log(`  FAIL ${name}\n       ${e.message}`); } };

  await atest('accepts the control panel (same origin, JSON)', async () => assert.equal((await call('/api/clear', { method: 'POST', headers: { ...json, Origin: self, 'Sec-Fetch-Site': 'same-origin' }, body: '{}' })).status, 200));
  await atest('accepts tools that are not browsers', async () => assert.equal((await call('/api/clear', { method: 'POST', headers: json, body: '{}' })).status, 200));
  await atest('accepts a request without a body (remove a chat)', async () => assert.equal((await call('/api/sources/s-none', { method: 'DELETE', headers: { Origin: self } })).status, 200));
  await atest('blocks other websites (Origin)', async () => assert.equal((await call('/api/quit', { method: 'POST', headers: { ...json, Origin: 'https://evil.example' }, body: '{}' })).status, 403));
  await atest('blocks other websites (Sec-Fetch-Site)', async () => assert.equal((await call('/api/clear', { method: 'POST', headers: { ...json, 'Sec-Fetch-Site': 'cross-site' }, body: '{}' })).status, 403));
  await atest('blocks a page on another local port', async () => assert.equal((await call('/api/clear', { method: 'POST', headers: { ...json, Origin: 'http://127.0.0.1:1' }, body: '{}' })).status, 403));
  await atest('blocks DNS rebinding (foreign Host header)', async () => assert.equal((await call('/api/state', { headers: { Host: `evil.example:${port}` } })).status, 403));
  await atest('rejects text/plain disguised as JSON', async () => assert.equal((await call('/api/clear', { method: 'POST', headers: { 'Content-Type': 'text/plain; x=application/json' }, body: '{}' })).status, 415));
  await atest('rejects bodies over 1 MB', async () => {
    // The server answers 413 and closes while the body is still being sent, which can reset the socket before the
    // answer is read; try a few times instead of failing on that race.
    let status;
    for (let i = 0; i < 4 && status === undefined; i++) {
      try { status = (await call('/api/clear', { method: 'POST', headers: json, body: JSON.stringify({ x: 'a'.repeat(1_100_000) }) })).status; } catch { /* reset: try again */ }
    }
    assert.equal(status, 413);
  });
  await atest('rejects bad JSON with 400', async () => assert.equal((await call('/api/clear', { method: 'POST', headers: json, body: '{nope' })).status, 400));
  await atest('does not serve files outside public/', async () => {
    for (const p of ['/..%2f..%2fpackage.json', '/%2e%2e/%2e%2e/package.json', '/shared/..%5c..%5cpackage.json']) assert.equal((await call(p)).status, 404, p);
  });
  await atest('control panel has a strict CSP and cannot be framed', async () => {
    const { headers: h } = await call('/dashboard');
    assert.match(h['content-security-policy'], /script-src 'self'(;|$)/);
    assert.match(h['content-security-policy'], /frame-ancestors 'none'/);
    assert.equal(h['x-frame-options'], 'DENY');
    assert.equal(h['x-content-type-options'], 'nosniff');
  });
  await atest('overlay has a CSP and can still be embedded', async () => {
    const { headers: h } = await call('/overlay');
    assert.match(h['content-security-policy'], /script-src 'self'(;|$)/);
    assert.doesNotMatch(h['content-security-policy'], /frame-ancestors/);
  });
  await atest('counter overlays have a CSP and can be embedded', async () => {
    for (const p of ['/viewers', '/followers']) {
      const { status, headers: h } = await call(p);
      assert.equal(status, 200, p);
      assert.match(h['content-security-policy'], /script-src 'self'(;|$)/, p);
      assert.doesNotMatch(h['content-security-policy'], /frame-ancestors/, p);
    }
  });
  await atest('follower refresh is only for the control panel', async () => assert.equal((await call('/api/followers/refresh', { method: 'POST', headers: { ...json, Origin: 'https://evil.example' }, body: '{}' })).status, 403));
  const wsOpen = origin => new Promise(resolve => {
    const ws = new WebSocket(`ws://127.0.0.1:${port}/ws`, origin ? { origin } : {});
    ws.on('message', d => { resolve(JSON.parse(d).op); ws.close(); });
    ws.on('error', () => resolve('refused'));
    ws.on('unexpected-response', () => resolve('refused'));
  });
  await atest('live connection works for Mergio pages', async () => assert.equal(await wsOpen(self), 'hello'));
  await atest('live connection refuses other websites', async () => assert.equal(await wsOpen('https://evil.example'), 'refused'));
  server.close();
}

console.log('Updates');
{
  const http = require('node:http');
  const { createHash } = require('node:crypto');
  const { existsSync } = require('node:fs');
  const { downloadVerified } = require(join(root, 'src/updater.js'));
  const payload = Buffer.from('pretend installer '.repeat(5000));
  const sha = createHash('sha256').update(payload).digest('hex');
  const server = http.createServer((req, res) => res.end(payload));
  await new Promise(r => server.listen(0, '127.0.0.1', r));
  const url = `http://127.0.0.1:${server.address().port}/Mergio-Setup.exe`;
  const local = { trusted: /^127\.0\.0\.1$/ };
  const dir = mkdtempSync(join(tmpdir(), 'mergio-upd-'));
  const atest = async (name, fn) => { try { await fn(); console.log(`  ok  ${name}`); } catch (e) { failed++; console.log(`  FAIL ${name}\n       ${e.message}`); } };
  await atest('keeps a download whose SHA-256 matches', async () => {
    const t = join(dir, 'good.exe');
    await downloadVerified(url, t, { ...local, sha256: sha, size: payload.length });
    assert.equal(existsSync(t), true);
  });
  await atest('deletes a download whose SHA-256 differs', async () => {
    const t = join(dir, 'bad.exe');
    await assert.rejects(downloadVerified(url, t, { ...local, sha256: 'f'.repeat(64) }), /checksum/);
    assert.equal(existsSync(t), false);
  });
  await atest('refuses an update without a checksum', async () => assert.rejects(downloadVerified(url, join(dir, 'x.exe'), { ...local }), /no checksum/));
  await atest('refuses downloads from other hosts', async () => assert.rejects(downloadVerified(url, join(dir, 'y.exe'), { sha256: sha }), /Unexpected download address/));
  server.close();
}

console.log(failed ? `\n${failed} check(s) failed` : '\nAll checks passed');
process.exit(failed ? 1 : 0);
