'use strict';
/*
 * Read aloud: turns an alert into speech with the computer's own voices, so it works offline and sends nothing anywhere.
 *   Windows: System.Speech (the voices in Settings → Time & language → Speech), through PowerShell.
 *   macOS:   say.
 *   Linux:   espeak-ng (or espeak).
 * The words never go on a command line: they're handed over in an environment variable (Windows) or on stdin,
 * so nothing a viewer types can change what runs.
 */
const { spawn } = require('node:child_process');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { log } = require('./util');

const TIMEOUT = 20000;
const SAMPLE = 'NovaRider sent a Super Chat. Keep up the great stream!';

/** Runs a program without a shell. Text goes in on stdin; resolves with what it printed. */
function run(cmd, args, { input, env } = {}) {
  return new Promise((resolve, reject) => {
    let out = '', err = '';
    let child;
    try { child = spawn(cmd, args, { env: { ...process.env, ...env }, windowsHide: true, stdio: ['pipe', 'pipe', 'pipe'] }); } catch (e) { return reject(e); }
    const timer = setTimeout(() => { child.kill(); reject(new Error('The voice took too long')); }, TIMEOUT);
    child.stdout.on('data', d => { out += d; });
    child.stderr.on('data', d => { err += d; });
    child.on('error', e => { clearTimeout(timer); reject(e); });
    child.on('close', code => { clearTimeout(timer); code === 0 ? resolve(out) : reject(new Error(err.trim().split('\n').pop() || `exit ${code}`)); });
    child.stdin.on('error', () => {});
    child.stdin.end(input || '');
  });
}

/* ---------------- Windows: System.Speech through PowerShell ---------------- */
// Fixed scripts: everything that changes (the words, the voice, the speed, the file) comes in through MERGIO_TTS_* variables.
const PS_SPEAK = `
Add-Type -AssemblyName System.Speech
$s = New-Object System.Speech.Synthesis.SpeechSynthesizer
if ($env:MERGIO_TTS_VOICE) { try { $s.SelectVoice($env:MERGIO_TTS_VOICE) } catch {} }
$s.Rate = [int]$env:MERGIO_TTS_RATE
$s.SetOutputToWaveFile($env:MERGIO_TTS_OUT)
$s.Speak($env:MERGIO_TTS_TEXT)
$s.Dispose()`;
const PS_VOICES = `
Add-Type -AssemblyName System.Speech
$s = New-Object System.Speech.Synthesis.SpeechSynthesizer
$s.GetInstalledVoices() | Where-Object { $_.Enabled } | ForEach-Object { $_.VoiceInfo.Name }
$s.Dispose()`;
const ps = (script, env) => run('powershell.exe', ['-NoProfile', '-NonInteractive', '-ExecutionPolicy', 'Bypass', '-EncodedCommand', Buffer.from(script, 'utf16le').toString('base64')], { env });

/* ---------------- the engine for this computer ---------------- */
let linuxCmd = null;
async function espeak() {
  if (linuxCmd) return linuxCmd;
  for (const c of ['espeak-ng', 'espeak']) { try { await run(c, ['--version']); return (linuxCmd = c); } catch { /* try the next */ } }
  throw Object.assign(new Error('No voice found. Install espeak-ng to have messages read aloud.'), { status: 503 });
}

/** The voices you can pick, and which engine makes them. */
let voiceList = null;
async function voices() {
  if (voiceList) return voiceList;
  try {
    let names = [];
    if (process.platform === 'win32') names = (await ps(PS_VOICES)).split(/\r?\n/);
    else if (process.platform === 'darwin') names = (await run('say', ['-v', '?'])).split('\n').map(l => l.split(/\s{2,}/)[0]);
    else names = (await run(await espeak(), ['--voices'])).split('\n').slice(1).map(l => l.trim().split(/\s+/)[3]);
    names = [...new Set(names.map(n => String(n || '').trim()).filter(Boolean))].sort((a, b) => a.localeCompare(b));
    voiceList = { engine: process.platform === 'win32' ? 'windows' : process.platform === 'darwin' ? 'mac' : linuxCmd, voices: names };
  } catch (e) {
    log('tts', `no voices: ${e.message}`);
    voiceList = { engine: null, voices: [] };
  }
  return voiceList;
}

/** System.Speech speed is -10…10 (about a third to three times); say and espeak take words per minute. */
const winRate = r => Math.max(-10, Math.min(10, Math.round((10 * Math.log(r)) / Math.log(3))));

async function synth(text, voice, rate) {
  const file = path.join(os.tmpdir(), `mergio-tts-${process.pid}-${Date.now()}-${Math.random().toString(36).slice(2)}.wav`);
  try {
    if (process.platform === 'win32') {
      await ps(PS_SPEAK, { MERGIO_TTS_TEXT: text, MERGIO_TTS_VOICE: voice, MERGIO_TTS_RATE: String(winRate(rate)), MERGIO_TTS_OUT: file });
    } else if (process.platform === 'darwin') {
      await run('say', [...(voice ? ['-v', voice] : []), '-r', String(Math.round(175 * rate)), '--data-format=LEI16@22050', '-o', file, '-f', '-'], { input: text });
    } else {
      await run(await espeak(), [...(voice ? ['-v', voice] : []), '-s', String(Math.round(175 * rate)), '-w', file, '--stdin'], { input: text });
    }
    return fs.readFileSync(file);
  } finally { fs.rm(file, { force: true }, () => {}); }
}

/* ---------------- one at a time, and each alert only once ---------------- */
let chain = Promise.resolve();
const cache = new Map(); // what to say + how -> Promise<wav>
/** Speech for some text as a WAV file. Jobs run one after another so a burst of alerts can't start a crowd of voices. */
function speak(text, { voice = '', rate = 1 } = {}) {
  voice = String(voice || '').slice(0, 100);
  rate = Math.min(1.8, Math.max(0.6, Number(rate) || 1));
  const key = `${voice}|${rate}|${text}`;
  if (cache.has(key)) return cache.get(key);
  const job = chain.then(() => synth(text, voice, rate));
  chain = job.catch(() => {});
  cache.set(key, job);
  job.catch(() => cache.delete(key));
  if (cache.size > 30) cache.delete(cache.keys().next().value);
  return job;
}

/* ---------------- what gets said ---------------- */
const words = s => String(s || '').split(/[,\n]/).map(x => x.trim().toLowerCase()).filter(Boolean);
/** Tidy chat text for a voice: links become "link", "!!!!!!" and "soooooo" are shortened, odd characters go. */
function clean(s) {
  return String(s || '')
    .replace(/https?:\/\/\S+|www\.\S+/gi, ' link ')
    .replace(/(\S)\1{3,}/gu, '$1$1$1')
    .replace(/[\u0000-\u001f\u007f\u200b-\u200f\u2028-\u202e\u2066-\u2069]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}
/** Cuts at a word near the limit. */
function cut(s, max) {
  if (s.length <= max) return s;
  const t = s.slice(0, max), i = t.lastIndexOf(' ');
  return (i > max * 0.6 ? t.slice(0, i) : t).trim();
}
/** "×3" -> "times 3", so the voice doesn't spell the sign. */
const spoken = s => String(s || '').replace(/(^|\s)[×x]\s?(\d)/g, '$1times $2');

/**
 * The words for an alert: just the viewer's message, or who did what and then the message.
 * Messages with a blocked word are never read. Returns '' when there's nothing to say.
 */
function textFor(m, alerts, blockedWords) {
  const ev = m.event || {};
  let msg = clean((m.parts || []).filter(p => p.type === 'text').map(p => p.text || '').join(''));
  const bad = words(blockedWords);
  if (bad.length && bad.some(w => msg.toLowerCase().includes(w))) msg = '';
  msg = cut(msg, Math.max(20, Math.min(300, Number(alerts.ttsMaxLength) || 200)));
  if (alerts.readWhat !== 'full') return msg;
  const who = cut(clean(m.user?.name), 40);
  const title = clean(spoken(ev.title));
  const num = String(ev.amount || '').match(/\d[\d.,]*/)?.[0];
  const amount = ev.amount && !(num && title.includes(num)) ? clean(spoken(ev.amount)) : '';
  const head = [who, title, amount].filter(Boolean).join(' ');
  return [head && `${head}.`, msg].filter(Boolean).join(' ');
}

module.exports = { speak, voices, textFor, clean, SAMPLE };
