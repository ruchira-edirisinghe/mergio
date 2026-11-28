// Quick self-test: syntax-checks every source file and unit-tests link detection and settings handling.
//   npm run check
import { readdirSync, statSync, readFileSync } from 'node:fs';
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
test('alert sounds by size accept known sounds only', () => {
  const s = settings.update({ alerts: { tierSounds: 'true', soundEpic: 'fanfare', soundLegendary: 'sparkle', soundRare: 'nope' } });
  assert.equal(s.alerts.tierSounds, true);
  assert.equal(s.alerts.soundEpic, 'fanfare');
  assert.equal(s.alerts.soundLegendary, 'sparkle');
  assert.equal(s.alerts.soundRare, 'same');
  settings.update({ alerts: { tierSounds: false, soundEpic: 'same', soundLegendary: 'same' } });
});
test('space between alerts stays between 0 and 30 seconds', () => {
  assert.equal(settings.update({ alerts: { gap: '5' } }).alerts.gap, 5);
  assert.equal(settings.update({ alerts: { gap: 99 } }).alerts.gap, 30);
  assert.equal(settings.update({ alerts: { gap: -3 } }).alerts.gap, 0);
  settings.update({ alerts: { gap: 0 } });
});
test('read aloud: what gets said', () => {
  const tts = require(join(root, 'src/tts.js'));
  const m = { user: { name: 'LunaByte' }, parts: [{ type: 'text', text: 'Keep it up!!!!!!! https://x.example/a' }, { type: 'emote', name: 'Kappa' }], event: { kind: 'superchat', title: 'sent a Super Chat', amount: '$20.00' } };
  assert.equal(tts.textFor(m, { readWhat: 'message', ttsMaxLength: 200 }, ''), 'Keep it up!!! link');
  assert.equal(tts.textFor(m, { readWhat: 'full', ttsMaxLength: 200 }, ''), 'LunaByte sent a Super Chat $20.00. Keep it up!!! link');
  assert.equal(tts.textFor(m, { readWhat: 'message', ttsMaxLength: 200 }, 'keep'), '', 'blocked words are never read');
  const g = { user: { name: 'Nova' }, parts: [], event: { kind: 'gift', title: 'sent Galaxy', amount: '×3' } };
  assert.equal(tts.textFor(g, { readWhat: 'full', ttsMaxLength: 200 }, ''), 'Nova sent Galaxy times 3.');
  const long = { user: { name: 'A' }, parts: [{ type: 'text', text: 'word '.repeat(80) }], event: {} };
  assert.ok(tts.textFor(long, { readWhat: 'message', ttsMaxLength: 50 }, '').length <= 50);
});
test('read aloud settings stay in range', () => {
  const s = settings.update({ alerts: { readAloud: 'true', readMin: 'epic', readWhat: 'nope', ttsRate: 9, ttsMaxLength: 5 } });
  assert.equal(s.alerts.readAloud, true);
  assert.equal(s.alerts.readMin, 'epic');
  assert.equal(s.alerts.readWhat, 'message');
  assert.equal(s.alerts.ttsRate, 1.8);
  assert.equal(s.alerts.ttsMaxLength, 20);
  settings.update({ alerts: { readAloud: false, readMin: 'all', ttsRate: 1, ttsMaxLength: 200 } });
});
test('every matching pack uses only values the settings accept', () => {
  const MG = { h: () => ({}), icon: () => ({}) };
  new Function('MG', readFileSync(join(root, 'public/dashboard/packs.js'), 'utf8'))(MG);
  assert.ok(MG.PACKS.length >= 8);
  const keep = structuredClone(settings.get());
  for (const p of MG.PACKS) {
    const patch = MG.packPatch(p), s = settings.update(structuredClone(patch));
    for (const [sec, vals] of Object.entries(patch)) for (const [k, v] of Object.entries(vals)) assert.deepEqual(s[sec][k], v, `${p.name}: ${sec}.${k}`);
  }
  settings.update({ appearance: keep.appearance, alerts: keep.alerts, viewers: keep.viewers, followers: keep.followers });
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
test("the hidden browser keeps its profile in Mergio's own data folder", () => {
  const { PROFILE } = require(join(root, 'src/browser.js'));
  const { DATA_DIR } = require(join(root, 'src/util.js'));
  assert.equal(PROFILE.startsWith(DATA_DIR), true, PROFILE);
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
  settings.update({ advanced: { facebookAccessToken: '���' } });
  assert.equal(settings.get().advanced.facebookAccessToken, 'EAAsecretvalue');
  settings.update({ advanced: { facebookAccessToken: settings.MASK.slice(2) } });
  assert.equal(settings.get().advanced.facebookAccessToken, 'EAAsecretvalue');
});
test('a key typed after the mask replaces the saved one', () => {
  settings.update({ advanced: { facebookAccessToken: `${settings.MASK}EAAnewvalue ` } });
  assert.equal(settings.get().advanced.facebookAccessToken, 'EAAnewvalue');
  settings.update({ advanced: { facebookAccessToken: `${settings.MASK.slice(3)}EAAother` } });
  assert.equal(settings.get().advanced.facebookAccessToken, 'EAAother');
  settings.update({ advanced: { facebookAccessToken: 'EAA一二' } });
  assert.equal(settings.get().advanced.facebookAccessToken, 'EAAother');
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

test('the viewer count can hide single platforms and shorten big numbers', () => {
  const s = settings.update({ viewers: { kick: false, numberFormat: 'short', totalAll: 'false' } });
  assert.equal(s.viewers.kick, false);
  assert.equal(s.viewers.twitch, true);
  assert.equal(s.viewers.numberFormat, 'short');
  assert.equal(s.viewers.totalAll, false);
  assert.equal(settings.update({ viewers: { numberFormat: 'huge' } }).viewers.numberFormat, 'short');
  settings.reset();
});

test('saved looks: save, use, rename, delete, and nothing else can change them', () => {
  settings.update({ appearance: { theme: 'neon', fontSize: 30 }, general: { blockedWords: 'spoiler' } });
  settings.template('save', 'chat', 0, 'Neon  big');
  assert.equal(settings.get().templates.chat[0].name, 'Neon big');
  assert.equal('blockedWords' in settings.get().templates.chat[0].values.general, false);
  settings.update({ appearance: { theme: 'soft', fontSize: 18 }, general: { blockedWords: 'other' } });
  const s = settings.template('load', 'chat', 0);
  assert.equal(s.appearance.theme, 'neon');
  assert.equal(s.appearance.fontSize, 30);
  assert.equal(s.general.blockedWords, 'other');
  settings.update({ templates: { chat: [{ name: 'evil', values: {} }] } });
  assert.equal(settings.get().templates.chat[0].name, 'Neon big');
  assert.throws(() => settings.template('load', 'chat', 2));
  assert.throws(() => settings.template('save', 'constructor', 0));
  assert.throws(() => settings.template('save', 'chat', 5));
  settings.template('rename', 'chat', 0, 'Night');
  assert.equal(settings.get().templates.chat[0].name, 'Night');
  settings.template('delete', 'chat', 0);
  assert.equal(settings.get().templates.chat[0], null);
  settings.reset();
});

test('OBS docks are added to OBS settings without touching anything else', () => {
  const { withDocks, readDocks } = require(join(root, 'src/obsdocks.js'));
  const ini = '[General]\r\nName=x\r\n\r\n[BasicWindow]\r\nDockState=abc\r\nExtraBrowserDocks=[{"title":"Mine","url":"https://example.com","uuid":"1"},{"title":"Old","url":"http://localhost:8787/dock/chat","uuid":"2"}]\r\nAlwaysOnTop=false\r\n';
  const out = withDocks(ini, 8790);
  const docks = readDocks(out);
  assert.deepEqual(docks.map(d => d.title), ['Mine', 'Mergio Chat', 'Mergio Gifts', 'Mergio Viewers']);
  assert.equal(docks[1].url, 'http://localhost:8790/dock/chat');
  assert.ok(out.includes('DockState=abc\r\n') && out.includes('AlwaysOnTop=false') && out.includes('[General]\r\nName=x'));
  assert.equal(readDocks(withDocks('[General]\nA=1\n', 8787)).length, 3);
  assert.equal(readDocks(withDocks('[BasicWindow]\nX=1\n', 8787)).length, 3);
});

// a made-up bot token, built from pieces so it never looks like a real one in the source
const FAKE_BOT = ['MTIzNDU2Nzg5MDEyMzQ1Njc4OQ', 'GaBcDe', 'abcdefghijklmnopqrstuvwxyz0123456789AB'].join('.');
test('go-live post: the bot token is checked and kept secret, channels are cleaned, nothing reaches the overlays', () => {
  const token = FAKE_BOT;
  let s = settings.update({ golive: { discordBotToken: token, discordTargets: [{ server: ' Zenitron  Gaming ', channel: '#live-alerts', ping: '@CUSTOMERS' }, { server: 'x' }, 'bad'], trigger: 'nope', delay: 9999, statusTheme: 'nope', statusHeadline: '' } });
  assert.equal(s.golive.discordBotToken, token);
  assert.deepEqual(s.golive.discordTargets, [{ server: 'Zenitron Gaming', channel: 'live-alerts', ping: '@CUSTOMERS' }]);
  s = settings.update({ golive: { discordTargets: [{ server: '', channel: 'https://discord.com/channels/111111111111111111/222222222222222222' }, { server: '', channel: '222222222222222222' }] } });
  assert.deepEqual(s.golive.discordTargets, [{ server: '111111111111111111', channel: 'https://discord.com/channels/111111111111111111/222222222222222222', ping: '' }],
    'a channel link fills in its server; a bare channel ID still needs one');
  assert.equal(s.golive.trigger, 'youtube');
  assert.equal(s.golive.delay, 600);
  assert.equal(s.golive.statusTheme, 'thumb');
  assert.equal(s.golive.statusHeadline, 'LIVE NOW');
  assert.equal(settings.panelView().golive.discordBotToken, settings.MASK);
  assert.equal('golive' in settings.publicView(), false);
  s = settings.update({ golive: { discordBotToken: settings.MASK } });
  assert.equal(s.golive.discordBotToken, token, 'the mask sent back keeps the saved token');
  s = settings.update({ golive: { discordBotToken: 'not-a-token' } });
  assert.equal(s.golive.discordBotToken, token, 'something that is not a token is not saved');
  s = settings.update({ golive: { message: '   ', caption: '' } });
  assert.equal(s.golive.message, settings.GOLIVE_MESSAGE);
  assert.equal(s.golive.caption, settings.GOLIVE_CAPTION);
  settings.reset();
  assert.equal(settings.get().golive.discordBotToken, token, 'reset all keeps the go-live post');
  settings.update({ golive: { discordBotToken: '', discordTargets: [], delay: 30 } });
});

console.log('Android app');
test('the phone screens script parses', () => { new Function(readFileSync(join(root, 'public/phone/phone.js'), 'utf8')); });
test('the phone entry point only starts what the phone needs', () => {
  const src = readFileSync(join(root, 'src/phone.js'), 'utf8');
  for (const no of ['obsdocks', 'autostart', 'openBrowser', 'protectDataDir']) assert.ok(!src.includes(no), no);
});

console.log('Connections');
test('Twitch is live again after a reconnect to the same channel', () => {
  const { TwitchConnector } = require(join(root, 'src/connectors/twitch.js'));
  const c = new TwitchConnector({ id: 's-tw', platform: 'twitch', target: 'someone', label: 'someone' }, { settings: () => settings.get() });
  c.lookViewers = async () => {}; // no network in the check
  c.handle({ command: 'ROOMSTATE', tags: { 'room-id': '42' } });
  assert.equal(c.state, 'live');
  c.attempt = 3;
  c.setState('connecting', 'Joining Twitch chat…');
  c.handle({ command: 'ROOMSTATE', tags: { 'room-id': '42' } });
  assert.equal(c.state, 'live');
  assert.equal(c.attempt, 0);
  c.stopped = true;
});

test('a follower error goes away when the lookup works again', () => {
  const stats = require(join(root, 'src/stats.js'));
  stats.setFollowers('s-err', 120);
  stats.setFollowers('s-err', null, 'network down');
  let sent = 0;
  const on = () => sent++;
  stats.on('change', on);
  stats.timer && (clearTimeout(stats.timer), stats.timer = null);
  stats.setFollowers('s-err', 120);
  assert.equal(stats.followers.get('s-err').err, null);
  assert.ok(stats.timer, 'an update is on its way');
  clearTimeout(stats.timer); stats.timer = null;
  stats.off('change', on);
});

console.log('Go-live post');
{
  const golive = require(join(root, 'src/golive.js'));
  const discord = require(join(root, 'src/discord.js'));
  const g = { ...settings.get().golive };
  const post = { platform: 'youtube', url: 'https://www.youtube.com/watch?v=N1Jz8-GHx_I', title: 'GTA 6 IS HERE!!', name: 'Zenitron Gaming',
    links: { youtube: 'https://www.youtube.com/watch?v=N1Jz8-GHx_I', twitch: 'https://www.twitch.tv/zen', tiktok: 'https://www.tiktok.com/@zen/live' } };
  test('the Discord post has the ping, the title, the stream link and the other channels', () => {
    const t = golive.textFor(post, g, 'discord', '<@&42424242>');
    assert.equal(t, '<@&42424242> 🚨\n\n🔴 Zenitron Gaming is now LIVE!\n\n🎬 GTA 6 IS HERE!!\nhttps://www.youtube.com/watch?v=N1Jz8-GHx_I\n\nAlso live on:\n🟣 Twitch: <https://www.twitch.tv/zen>\n⚫ TikTok: <https://www.tiktok.com/@zen/live>');
  });
  test('the share and status caption lists every stream, without a ping', () => {
    assert.equal(golive.textFor(post, g, 'caption', '<@&1>'), '🔴 Zenitron Gaming is LIVE now!\n\n🎬 GTA 6 IS HERE!!\n\n🔴 YouTube: https://www.youtube.com/watch?v=N1Jz8-GHx_I\n🟣 Twitch: https://www.twitch.tv/zen\n⚫ TikTok: https://www.tiktok.com/@zen/live');
  });
  test('a live YouTube stream gets its own card, so its link stays plain and Discord adds no second card', () => {
    const live = { ...post, thumb: 'N1Jz8-GHx_I' };
    assert.equal(golive.textFor(live, g, 'discord', ''), '🚨\n\n🔴 Zenitron Gaming is now LIVE!\n\n🎬 GTA 6 IS HERE!!\n<https://www.youtube.com/watch?v=N1Jz8-GHx_I>', 'the card lists the other links');
    assert.ok(golive.textFor(live, g, 'caption').includes('🔴 YouTube: https://www.youtube.com/watch?v=N1Jz8-GHx_I'), 'the caption is for other apps: plain links');
  });
  test('lines with nothing to show are left out', () => {
    assert.equal(golive.render('A {name}\n🎬 {title}\n{link}\n\n\n\n{others}\nB', { name: 'Z', title: '', link: 'L', others: '', mention: '' }), 'A Z\nL\n\nB');
    assert.equal(golive.render('{unknown} stays', { name: '' }), '{unknown} stays');
  });
  test('servers, channels and roles are found by name', () => {
    assert.equal(discord.pick([{ name: '📢┃live-alerts' }, { name: 'general' }], '#Live Alerts').name, '📢┃live-alerts');
    assert.equal(discord.pick([{ name: 'live-a' }, { name: 'live-b' }], 'live'), null, 'two channels match a part: no guess');
    const m = discord.mentionFor('@everyone, @Customers, 555555, @Nobody', [{ id: '1', name: '@everyone' }, { id: '77777', name: 'CUSTOMERS' }]);
    assert.equal(m.text, '@everyone <@&77777> <@&555555>');
    assert.deepEqual(m.allowed, { parse: ['everyone'], roles: ['77777', '555555'], users: [] });
    assert.deepEqual(m.missing, ['@Nobody']);
  });
  test('servers and channels can also be Discord IDs, channel mentions or channel links', () => {
    const S = '111111111111111111', C = '222222222222222222';
    assert.deepEqual(discord.channelRef(C), { id: C, server: null });
    assert.deepEqual(discord.channelRef(`#${C}`), { id: C, server: null });
    assert.deepEqual(discord.channelRef(`<#${C}>`), { id: C, server: null });
    assert.deepEqual(discord.channelRef(`https://discord.com/channels/${S}/${C}`), { id: C, server: S });
    assert.deepEqual(discord.channelRef(`ptb.discordapp.com/channels/${S}/${C}/`), { id: C, server: S });
    assert.equal(discord.channelRef('live-alerts'), null, 'a name');
    assert.equal(discord.channelRef('2024'), null, 'a short number is a name, not an ID');
    assert.equal(discord.channelRef(`https://example.com/channels/${S}/${C}`), null);
    assert.equal(discord.serverRef(S), S);
    assert.equal(discord.serverRef(`https://discord.com/channels/${S}`), S);
    assert.equal(discord.serverRef('Zenitron Gaming'), null);
  });
  test('channel links from the chats', () => {
    assert.equal(golive.channelLink({ platform: 'youtube', target: '@zen' }), 'https://www.youtube.com/@zen/live');
    assert.equal(golive.channelLink({ platform: 'facebook', target: 'page:zenitrongaming' }), 'https://www.facebook.com/zenitrongaming');
    assert.equal(golive.channelLink({ platform: 'tiktok', target: 'zen' }), 'https://www.tiktok.com/@zen/live');
  });
  test('one post per stream', () => {
    const st = { keys: ['youtube:abc'], open: true, platform: 'youtube' };
    assert.equal(golive.isNew(st, 'youtube', 'youtube:abc'), false, 'same stream after a restart');
    assert.equal(golive.isNew(st, 'youtube', 'youtube:def'), true, 'a new stream link');
    assert.equal(golive.isNew(st, 'tiktok', 'tiktok:1'), false, 'another platform joining the same stream');
    assert.equal(golive.isNew({ keys: [], open: true, platform: 'twitch' }, 'twitch', ''), false);
    assert.equal(golive.isNew({ keys: [], open: false, platform: '' }, 'twitch', ''), true);
  });

  // the whole way, against a stand-in Discord: a stream starts, the bot posts once, a second platform doesn't post again
  const http = require('node:http');
  const posted = [];
  const fakeDiscord = http.createServer((req, res) => {
    let b = ''; req.on('data', c => (b += c)); req.on('end', () => {
      const json = x => { res.setHeader('Content-Type', 'application/json'); res.end(JSON.stringify(x)); };
      // YouTube's thumbnails: this stream has no live-sized one yet, so the next size is used
      if (req.url.startsWith('/yt/')) { if (req.url === '/yt/vi/N1Jz8-GHx_I/maxresdefault.jpg') return res.end('jpeg'); res.statusCode = 404; return res.end(); }
      if (req.headers.authorization !== `Bot ${FAKE_BOT}`) { res.statusCode = 401; return json({ message: '401: Unauthorized', code: 0 }); }
      const u = req.url.replace(/^\/api/, '');
      if (u === '/users/@me') return json({ id: '900', username: 'Mergio Bot' });
      if (u === '/users/@me/guilds') return json([{ id: '10', name: 'Zenitron Gaming' }, { id: '111111111111111111', name: 'Night Owls' }]);
      if (u === '/guilds/111111111111111111/channels') return json([{ id: '222222222222222222', name: 'alerts', type: 0 }, { id: '333333333333333333', name: 'Lounge', type: 2 }]);
      if (u === '/guilds/10/channels') return json([{ id: '20', name: '📢┃live-alerts', type: 0 }, { id: '21', name: 'general', type: 0 }, { id: '22', name: 'Voice', type: 2 }]);
      if (u === '/guilds/10/roles') return json([{ id: '10', name: '@everyone' }, { id: '30', name: 'CUSTOMERS' }]);
      if (u.startsWith('/channels/20/messages') && req.method === 'GET') return json(posted.map(p => ({ author: { id: '900' }, content: p.content })));
      if (u === '/channels/20/messages' && req.method === 'POST') { posted.push(JSON.parse(b)); return json({ id: String(posted.length) }); }
      res.statusCode = 404; json({ message: 'Unknown', code: 10003 });
    });
  });
  await new Promise(r => fakeDiscord.listen(0, '127.0.0.1', r));
  process.env.MERGIO_DISCORD_API = `http://127.0.0.1:${fakeDiscord.address().port}/api`;
  process.env.MERGIO_YTIMG = `http://127.0.0.1:${fakeDiscord.address().port}/yt`;
  const { EventEmitter } = require('node:events');
  const conn = (info, extra = {}) => ({ liveInfo: () => info.current, channelName: '@zen', ...extra });
  const yt = { current: null }, tt = { current: null };
  const fake = Object.assign(new EventEmitter(), { running: new Map([['s-yt', conn(yt)], ['s-tt', conn(tt)]]) });
  const saved = settings.get().sources;
  settings.update({ golive: { enabled: true, trigger: 'any', delay: 0, name: 'Zenitron Gaming', discordBotToken: FAKE_BOT,
    discordTargets: [{ server: 'zenitron gaming', channel: 'live-alerts', ping: '@CUSTOMERS' }, { server: 'Other server', channel: 'x', ping: '' }] } });
  settings.get().sources = [{ id: 's-yt', platform: 'youtube', target: '@zen', label: '@zen' }, { id: 's-tt', platform: 'tiktok', target: 'zen', label: 'zen' }];
  golive.start(fake);
  const wait = ms => new Promise(r => setTimeout(r, ms));
  const atest = async (name, fn) => { try { await fn(); console.log(`  ok  ${name}`); } catch (e) { failed++; console.log(`  FAIL ${name}\n       ${e.message}`); } };
  await atest('the bot finds the channels by name and says what it cannot find', async () => {
    const c = await discord.check(settings.get().golive.discordBotToken, settings.get().golive.discordTargets);
    assert.equal(c.bot.name, 'Mergio Bot');
    assert.ok(c.invite.includes('client_id=900'));
    assert.equal(c.targets[0].ok, true);
    assert.equal(c.targets[0].label, 'Zenitron Gaming › #📢┃live-alerts');
    assert.equal(c.targets[1].ok, false);
    assert.match(c.targets[1].error, /isn't in a server called “Other server”/);
    assert.match((await discord.check('MTIz.bad.token-xxxxxxxxxxxxxxxxxxxxxxxx', [])).error, /token is wrong/);
  });
  await atest('the bot also finds servers and channels by ID or channel link', async () => {
    const S = '111111111111111111', C = '222222222222222222';
    const c = await discord.check(FAKE_BOT, [
      { server: S, channel: C }, { server: 'Night Owls', channel: `<#${C}>` }, { server: '', channel: `https://discord.com/channels/${S}/${C}` },
      { server: S, channel: '333333333333333333' }, { server: '999999999999999999', channel: C }, { server: '', channel: `https://discord.com/channels/999999999999999999/${C}` },
    ]);
    assert.deepEqual(c.targets.slice(0, 3).map(t => [t.ok, t.label]), [[true, 'Night Owls › #alerts'], [true, 'Night Owls › #alerts'], [true, 'Night Owls › #alerts']]);
    assert.match(c.targets[3].error, /no text channel with ID 333333333333333333 in Night Owls/, 'a voice channel');
    assert.match(c.targets[4].error, /isn't in the server with ID 999999999999999999/);
    assert.match(c.targets[5].error, /isn't in the server with ID 999999999999999999/);
  });
  await atest('posts when the stream starts, once, and pings the role by name', async () => {
    golive.check(); await wait(50);
    assert.equal(posted.length, 0, 'nothing is live yet');
    yt.current = { url: 'https://www.youtube.com/watch?v=N1Jz8-GHx_I', title: 'GTA 6', videoId: 'N1Jz8-GHx_I', started: false };
    golive.check(); await wait(50);
    assert.equal(posted.length, 0, 'a scheduled stream that has not started');
    yt.current = { ...yt.current, started: true };
    golive.check(); await wait(400);
    assert.equal(posted.length, 1);
    assert.ok(posted[0].content.startsWith('<@&30> 🚨'));
    assert.ok(posted[0].content.includes('🎬 GTA 6\n<https://www.youtube.com/watch?v=N1Jz8-GHx_I>'), 'the stream link, shown as a link');
    const card = posted[0].embeds?.[0];
    assert.equal(card?.url, 'https://www.youtube.com/watch?v=N1Jz8-GHx_I', 'the card opens the stream itself, not the channel');
    assert.equal(card.title, 'GTA 6');
    assert.equal(card.author.name, 'Zenitron Gaming is live on YouTube');
    assert.equal(card.description, '🔴 YouTube: https://www.youtube.com/watch?v=N1Jz8-GHx_I\n⚫ TikTok: https://www.tiktok.com/@zen/live', 'every live link');
    assert.equal(card.footer.text, '🔴 @zen  ·  ⚫ @zen', 'the channel names, under the thumbnail');
    assert.ok(!posted[0].content.includes('Also live on'), 'the card lists the other links');
    assert.equal(card.image.url, `${process.env.MERGIO_YTIMG}/vi/N1Jz8-GHx_I/maxresdefault.jpg`, 'the biggest thumbnail there is');
    assert.equal(await golive.cardFor({ ...post, thumb: '' }), null, 'not started yet: no card');
    assert.equal(await golive.cardFor({ ...post, platform: 'twitch', thumb: 'N1Jz8-GHx_I' }), null, 'only YouTube gets one');
    assert.deepEqual(posted[0].allowed_mentions, { parse: [], roles: ['30'], users: [] });
    tt.current = { url: 'https://www.tiktok.com/@zen/live', title: '', videoId: '77', started: true };
    golive.check(); golive.check(); await wait(300);
    assert.equal(posted.length, 1, 'TikTok joining the same stream does not post again');
    const h = golive.view().history[0];
    assert.equal(h.results.find(r => r.label.startsWith('Zenitron')).ok, true);
    assert.equal(h.results.find(r => r.label.startsWith('Other')).ok, false);
  });
  await atest('posting by hand skips a channel that already has this stream (PC and phone)', async () => {
    const e = await golive.postNow();
    assert.equal(posted.length, 1);
    assert.equal(e.results.find(r => r.label.startsWith('Zenitron')).skipped, true);
  });
  await atest('a test post says it is a test and pings nobody', async () => {
    await golive.sendTest();
    assert.equal(posted.length, 2);
    assert.ok(posted[1].content.includes('[Test]'));
    assert.deepEqual(posted[1].allowed_mentions, { parse: [] });
    assert.ok(!posted[1].content.includes('<@&'));
  });
  settings.get().sources = saved;
  settings.update({ golive: { enabled: false, trigger: 'youtube', delay: 30, name: '', discordBotToken: '', discordTargets: [] } });
  delete process.env.MERGIO_DISCORD_API;
  delete process.env.MERGIO_YTIMG;
  fakeDiscord.close();
}

console.log('Local server security');
{
  const http = require('node:http');
  const { EventEmitter } = require('node:events');
  const WebSocket = require('ws');
  const { createServer } = require(join(root, 'src/server.js'));
  const noop = () => {};
  const manager = Object.assign(new EventEmitter(), { list: () => [], recent: [], add: noop, remove: noop, reconnect: noop, setEnabled: noop, inject: noop, reconnectPlatform: noop, clear: noop, hide: noop });
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
  await atest('pinning needs a message from the chat list; alert controls only take known actions', async () => {
    manager.recent.push({ id: 'pin-1', platform: 'twitch', type: 'chat', user: { name: 'a' }, parts: [] });
    const post = (path, b) => call(path, { method: 'POST', headers: json, body: JSON.stringify(b) });
    assert.equal((await post('/api/pin', { id: 'pin-1' })).status, 200);
    assert.equal((await post('/api/pin', { id: 'gone' })).status, 404);
    assert.equal((await post('/api/pin', { id: {} })).status, 404);
    assert.equal((await post('/api/pin', { id: null })).status, 200);
    assert.equal((await post('/api/alerts/control', { action: 'explode' })).status, 400);
    const r = await post('/api/alerts/control', { action: 'pause' });
    assert.equal(r.status, 200); assert.equal(JSON.parse(r.body).paused, true);
    assert.equal(JSON.parse((await post('/api/alerts/control', { action: 'resume' })).body).paused, false);
    manager.recent.length = 0;
  });
  await atest('hiding messages needs real message ids', async () => {
    assert.equal((await call('/api/hide', { method: 'POST', headers: json, body: JSON.stringify({ ids: [1, {}, 'a b'] }) })).status, 400);
    assert.equal((await call('/api/hide', { method: 'POST', headers: json, body: JSON.stringify({ ids: ['test-1', 'yt.Cg0KC=='] }) })).status, 200);
  });
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
  await atest('the Android app screens (/phone) have the strict CSP and cannot be framed', async () => {
    const { status, headers: h } = await call('/phone');
    assert.equal(status, 200);
    assert.match(h['content-security-policy'], /script-src 'self'(;|$)/);
    assert.match(h['content-security-policy'], /frame-ancestors 'none'/);
    assert.equal(h['x-frame-options'], 'DENY');
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
