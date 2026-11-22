/* Mergio alert sounds: short sounds made on the fly with WebAudio, so there are no files to ship.
   Used by the alerts overlay, and by the control panel so you can hear a sound before you pick it. */
(() => {
  'use strict';
  // The chime changes with the alert: these notes for each kind
  const NOTES = { gift: [659, 880, 1319], kicks: [659, 880, 1319], cheer: [784, 988, 1319], superchat: [523, 784, 1047, 1568], hypechat: [523, 784, 1047, 1568], raid: [392, 523, 659, 784], host: [392, 523, 659, 784], follow: [880, 1175] };
  // The other sounds: [wave, notes (an array in the list is a chord), gap between notes, how long each rings, optional low-pass]
  const SOUNDS = {
    coin: ['square', [988, 1319], 0.08, 0.35],
    levelup: ['square', [523, 659, 784, 1047, 1319], 0.07, 0.3],
    arcade: ['square', [262, 392, 523, 784, 1047], 0.05, 0.18],
    soft: ['sine', [392, 523, 659], 0.14, 0.9],
    fanfare: ['sawtooth', [392, 523, 659, [523, 659, 784, 1047]], 0.13, 0.8, 2400],
    sparkle: ['sine', [1319, 1760, 2093, 2637, 3136], 0.045, 0.5],
  };
  const TYPES = [['chime', 'Chime (changes with the alert)'], ['coin', 'Coin pickup'], ['levelup', 'Level up'], ['arcade', '8-bit arcade'], ['soft', 'Soft bell'], ['fanfare', 'Fanfare'], ['sparkle', 'Sparkle']];

  let ctx = null;
  /** Plays a sound: type is one of TYPES (anything else is the chime), kind is the alert kind, volume 0 to 1. */
  function play(type, kind, volume) {
    try {
      ctx ||= new (window.AudioContext || window.webkitAudioContext)();
      if (ctx.state === 'suspended') ctx.resume();
      const [wave, notes, gap, ring, cut] = SOUNDS[type] || ['triangle', NOTES[kind] || [523, 659, 784, 1047], 0.09, 0.6];
      const loud = Math.min(1, Math.max(0, Number(volume) || 0)) * (wave === 'square' || wave === 'sawtooth' ? 0.16 : 0.35);
      notes.forEach((n, i) => {
        const t = ctx.currentTime + i * gap, chord = [].concat(n), vol = loud / Math.sqrt(chord.length);
        for (const f of chord) {
          const o = ctx.createOscillator(), g = ctx.createGain();
          o.type = wave; o.frequency.value = f;
          g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(vol, t + 0.015); g.gain.exponentialRampToValueAtTime(0.0001, t + ring);
          let out = o.connect(g);
          if (cut) { const lp = ctx.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = cut; out = out.connect(lp); }
          out.connect(ctx.destination);
          o.start(t); o.stop(t + ring + 0.05);
        }
      });
    } catch { /* no audio here */ }
  }

  /** The sound an alert of this size gets: its own sound when "different sounds by size" is on, else the main one. */
  const KEYS = ['soundCommon', 'soundRare', 'soundEpic', 'soundLegendary'];
  const forTier = (alerts, tier) => {
    const own = alerts.tierSounds ? alerts[KEYS[tier]] : '';
    return own && own !== 'same' ? own : alerts.soundType;
  };

  window.mergioSound = { play, forTier, TYPES, KEYS };
})();
