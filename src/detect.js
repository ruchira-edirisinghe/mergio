'use strict';

/**
 * Turns whatever the user pastes (a full link, a channel name, "@handle") into { platform, target, label }.
 * Accepts a platform prefix too, e.g. "twitch:xqc", "kick:xqc", "tiktok:@user", "yt:@handle".
 */
function detect(input) {
  let raw = String(input || '').trim();
  if (!raw) throw new Error('Paste a stream link or channel name first.');

  const prefixed = /^(twitch|tw|kick|tiktok|tt|youtube|yt|facebook|fb)\s*:\s*(.+)$/i.exec(raw);
  if (prefixed) {
    const p = { tw: 'twitch', tt: 'tiktok', yt: 'youtube', fb: 'facebook' }[prefixed[1].toLowerCase()] || prefixed[1].toLowerCase();
    return fromPlatform(p, prefixed[2].trim());
  }

  if (!/^https?:\/\//i.test(raw) && /\.(com|tv|be)\b/i.test(raw)) raw = 'https://' + raw;
  let url;
  try { url = new URL(raw); } catch {
    throw new Error('That does not look like a link. Paste the full URL of the live stream (or use e.g. "twitch:yourname").');
  }
  const host = url.hostname.replace(/^(www|m|mobile|gaming|studio|vm)\./, '').toLowerCase();
  const parts = url.pathname.split('/').filter(Boolean);

  if (host === 'twitch.tv') {
    const name = parts[0] === 'popout' ? parts[1] : parts[0];
    if (!name || ['videos', 'directory', 'search'].includes(name)) throw new Error('Use the Twitch channel link, e.g. https://twitch.tv/yourname');
    return fromPlatform('twitch', name);
  }
  if (host === 'kick.com') {
    const name = parts[0] === 'popout' ? parts[1] : parts[0];
    if (!name) throw new Error('Use the Kick channel link, e.g. https://kick.com/yourname');
    return fromPlatform('kick', name);
  }
  if (host === 'tiktok.com') {
    const handle = parts.find(p => p.startsWith('@'));
    if (!handle) throw new Error('Use the TikTok LIVE link, e.g. https://www.tiktok.com/@yourname/live');
    return fromPlatform('tiktok', handle);
  }
  if (host === 'youtube.com' || host === 'youtu.be') {
    if (host === 'youtu.be' && parts[0]) return fromPlatform('youtube', parts[0]);
    const v = url.searchParams.get('v');
    if (v) return fromPlatform('youtube', v);
    if ((parts[0] === 'live' || parts[0] === 'shorts' || parts[0] === 'embed') && parts[1]) return fromPlatform('youtube', parts[1]);
    if (parts[0] === 'video' && parts[1]) return fromPlatform('youtube', parts[1]); // studio.youtube.com/video/ID/livestreaming
    if (parts[0]?.startsWith('@')) return fromPlatform('youtube', parts[0]);
    if ((parts[0] === 'channel' || parts[0] === 'c' || parts[0] === 'user') && parts[1]) return fromPlatform('youtube', `${parts[0]}/${parts[1]}`);
    throw new Error('Use a YouTube live link (watch?v=…), a youtu.be link or your channel link (youtube.com/@name).');
  }
  if (host === 'facebook.com' || host === 'fb.watch' || host === 'fb.com') {
    const v = url.searchParams.get('v') || url.searchParams.get('video_id');
    if (v) return fromPlatform('facebook', v);
    const i = parts.indexOf('videos');
    if (i >= 0 && parts[i + 1]) return fromPlatform('facebook', parts[i + 1]);
    if (parts[0] === 'live' && parts[1] === 'producer' && parts[2]) return fromPlatform('facebook', parts[2]);
    throw new Error('Use the Facebook live video link (…/videos/1234567890 or facebook.com/watch/?v=…). Open your live, click Share > Copy link.');
  }
  throw new Error(`"${url.hostname}" is not supported yet. Supported: YouTube, Twitch, Kick, TikTok, Facebook.`);
}

function fromPlatform(platform, value) {
  let v = String(value).trim().replace(/\/+$/, '');
  switch (platform) {
    case 'twitch':
    case 'kick':
      v = v.replace(/^@/, '').toLowerCase();
      if (!/^[a-z0-9_-]{2,40}$/.test(v)) throw new Error(`"${value}" is not a valid ${platform} channel name.`);
      return { platform, target: v, label: v };
    case 'tiktok':
      v = v.replace(/^@/, '');
      if (!/^[\w.]{2,40}$/.test(v)) throw new Error(`"${value}" is not a valid TikTok username.`);
      return { platform, target: v, label: '@' + v };
    case 'youtube':
      return { platform, target: v, label: v.startsWith('@') ? v : v.includes('/') ? v.split('/')[1] : v };
    case 'facebook':
      if (!/^\d{5,25}$/.test(v)) throw new Error('For Facebook paste the live video link (it contains a long number).');
      return { platform, target: v, label: `video ${v}` };
    default:
      throw new Error(`Unknown platform "${platform}".`);
  }
}

module.exports = { detect };
