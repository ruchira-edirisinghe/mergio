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
process.env.OMNICHAT_DATA = mkdtempSync(join(tmpdir(), 'omnichat-check-'));
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
  ['https://www.facebook.com/somepage/videos/1234567890123/', 'facebook', '1234567890123'],
  ['https://www.facebook.com/watch/?v=1234567890123', 'facebook', '1234567890123'],
];
for (const [input, platform, target] of cases) test(input, () => { const r = detect(input); assert.equal(r.platform, platform); assert.equal(r.target, target); });
for (const bad of ['', 'hello world', 'https://example.com/x', 'https://www.facebook.com/somepage']) test(`rejects "${bad}"`, () => assert.throws(() => detect(bad)));

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

console.log(failed ? `\n${failed} check(s) failed` : '\nAll checks passed');
process.exit(failed ? 1 : 0);
