/* Dune : Genesis — moteur audio procédural (WebAudio) : drones, chœur synthétique, percussions, vent, bruitages */
(function () {
'use strict';
const G = window.G;
const A = G.audio = { ctx: null, muted: false, mood_: 'silence' };
let c, master, comp, musicBus, sfxBus, revIn, whiteBuf, brownBuf;
let subG, padG, padF, padOscs = [], windG, windF, windLfo, windSrc, shimG;
let thopG, thopOsc, thopLfo, wormG, charge;

/* ---------- outils ---------- */
function makeNoise(brown) {
  const len = c.sampleRate * 4, b = c.createBuffer(1, len, c.sampleRate), d = b.getChannelData(0);
  let last = 0;
  for (let i = 0; i < len; i++) {
    const w = Math.random() * 2 - 1;
    if (brown) { last = (last + 0.02 * w) / 1.02; d[i] = last * 3.5; } else d[i] = w;
  }
  return b;
}
function makeIR(sec, decay) {
  const len = Math.floor(c.sampleRate * sec), b = c.createBuffer(2, len, c.sampleRate);
  for (let ch = 0; ch < 2; ch++) {
    const d = b.getChannelData(ch); let lp = 0;
    for (let i = 0; i < len; i++) {
      const k = i / len;
      lp += ((Math.random() * 2 - 1) - lp) * (0.35 - 0.3 * k);
      d[i] = lp * Math.pow(1 - k, decay) * 1.8;
    }
  }
  return b;
}
function noiseNode(buf, loop) { const s = c.createBufferSource(); s.buffer = buf; s.loop = !!loop; return s; }
function tone(o) {
  const t = (o.at || c.currentTime), osc = c.createOscillator(), g = c.createGain();
  osc.type = o.type || 'sine';
  osc.frequency.setValueAtTime(o.f, t);
  if (o.f2) osc.frequency.exponentialRampToValueAtTime(Math.max(1, o.f2), t + o.dur);
  const a = o.attack || 0.005, v = o.gain === undefined ? 0.3 : o.gain;
  g.gain.setValueAtTime(0.0001, t);
  g.gain.linearRampToValueAtTime(v, t + a);
  g.gain.exponentialRampToValueAtTime(0.0001, t + o.dur);
  osc.connect(g); g.connect(o.dest || sfxBus);
  osc.start(t); osc.stop(t + o.dur + 0.05);
  return osc;
}
function burst(o) {
  const t = (o.at || c.currentTime), s = noiseNode(o.brown ? brownBuf : whiteBuf, false);
  const f = c.createBiquadFilter(); f.type = o.type || 'bandpass';
  f.frequency.setValueAtTime(o.f, t); if (o.f2) f.frequency.exponentialRampToValueAtTime(Math.max(20, o.f2), t + o.dur);
  f.Q.value = o.q || 1;
  const g = c.createGain(), a = o.attack || 0.004, v = o.gain === undefined ? 0.3 : o.gain;
  g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(v, t + a); g.gain.exponentialRampToValueAtTime(0.0001, t + o.dur);
  s.connect(f); f.connect(g); g.connect(o.dest || sfxBus);
  s.start(t, Math.random() * 3, o.dur + 0.05);
}
const ok = (fn) => function () { if (!c || c.state === 'closed') return; try { return fn.apply(null, arguments); } catch (e) { /* audio non critique */ } };

/* ---------- initialisation ---------- */
A.init = function () {
  if (c) { A.resume(); return; }
  const AC = window.AudioContext || window.webkitAudioContext; if (!AC) return;
  c = A.ctx = new AC();
  master = c.createGain(); master.gain.value = A.muted ? 0 : 0.85;
  comp = c.createDynamicsCompressor(); comp.threshold.value = -16; comp.ratio.value = 4; comp.attack.value = 0.01; comp.release.value = 0.3;
  master.connect(comp); comp.connect(c.destination);
  const conv = c.createConvolver(); conv.buffer = makeIR(3.6, 2.4);
  revIn = c.createGain(); revIn.gain.value = 1;
  const revOut = c.createGain(); revOut.gain.value = 0.55;
  revIn.connect(conv); conv.connect(revOut); revOut.connect(master);
  musicBus = c.createGain(); musicBus.gain.value = 0.8; musicBus.connect(master);
  const ms = c.createGain(); ms.gain.value = 0.7; musicBus.connect(ms); ms.connect(revIn);
  sfxBus = c.createGain(); sfxBus.gain.value = 0.9; sfxBus.connect(master);
  const ss = c.createGain(); ss.gain.value = 0.35; sfxBus.connect(ss); ss.connect(revIn);
  whiteBuf = makeNoise(false); brownBuf = makeNoise(true);

  // sub-basses
  subG = c.createGain(); subG.gain.value = 0; subG.connect(musicBus);
  [36.71, 55.0].forEach((f, i) => { const o = c.createOscillator(); o.type = i ? 'triangle' : 'sine'; o.frequency.value = f; o.connect(subG); o.start(); padOscs.push({ o, sub: true, i }); });
  // nappe
  padF = c.createBiquadFilter(); padF.type = 'lowpass'; padF.frequency.value = 500; padF.Q.value = 0.6;
  padG = c.createGain(); padG.gain.value = 0; padF.connect(padG); padG.connect(musicBus);
  const lfo = c.createOscillator(); lfo.frequency.value = 0.07; const lg = c.createGain(); lg.gain.value = 180; lfo.connect(lg); lg.connect(padF.frequency); lfo.start();
  for (let v = 0; v < 4; v++) for (let k = 0; k < 2; k++) {
    const o = c.createOscillator(); o.type = 'sawtooth'; o.frequency.value = 110; o.detune.value = (k ? 1 : -1) * (6 + v * 2);
    const g = c.createGain(); g.gain.value = 0.11; o.connect(g); g.connect(padF); o.start(); padOscs.push({ o, voice: v });
  }
  // vent
  windSrc = noiseNode(whiteBuf, true);
  windF = c.createBiquadFilter(); windF.type = 'bandpass'; windF.frequency.value = 500; windF.Q.value = 0.7;
  windG = c.createGain(); windG.gain.value = 0;
  windLfo = c.createOscillator(); windLfo.frequency.value = 0.11; const wl = c.createGain(); wl.gain.value = 260; windLfo.connect(wl); wl.connect(windF.frequency); windLfo.start();
  windSrc.connect(windF); windF.connect(windG); windG.connect(musicBus); windSrc.start();
  shimG = c.createGain(); shimG.gain.value = 0.5; shimG.connect(musicBus);

  // thopter
  thopG = c.createGain(); thopG.gain.value = 0; thopG.connect(sfxBus);
  thopOsc = c.createOscillator(); thopOsc.type = 'sawtooth'; thopOsc.frequency.value = 58;
  const tf = c.createBiquadFilter(); tf.type = 'lowpass'; tf.frequency.value = 380;
  const tAm = c.createGain(); tAm.gain.value = 0.5; thopLfo = c.createOscillator(); thopLfo.frequency.value = 19;
  const tl = c.createGain(); tl.gain.value = 0.45; thopLfo.connect(tl); tl.connect(tAm.gain);
  thopOsc.connect(tf); tf.connect(tAm); tAm.connect(thopG); thopOsc.start(); thopLfo.start();
  // ver
  wormG = c.createGain(); wormG.gain.value = 0; wormG.connect(sfxBus);
  const wn = noiseNode(brownBuf, true), wf = c.createBiquadFilter(); wf.type = 'lowpass'; wf.frequency.value = 160;
  wn.connect(wf); wf.connect(wormG); wn.start();
  const wo = c.createOscillator(); wo.frequency.value = 27; const wog = c.createGain(); wog.gain.value = 0.9;
  const wlf = c.createOscillator(); wlf.frequency.value = 3.1; const wlg = c.createGain(); wlg.gain.value = 0.4; wlf.connect(wlg); wlg.connect(wog.gain);
  wo.connect(wog); wog.connect(wormG); wo.start(); wlf.start();
  // charge de lame lente
  charge = { g: c.createGain(), o: c.createOscillator() };
  charge.g.gain.value = 0; charge.o.type = 'sine'; charge.o.frequency.value = 300; charge.o.connect(charge.g); charge.g.connect(sfxBus); charge.o.start();

  A.ready = true;
  setInterval(tick, 50);
  A.mood(A.mood_, true);
};
A.resume = function () { if (c && c.state === 'suspended') c.resume(); };
A.toggleMute = function () { A.muted = !A.muted; if (master) master.gain.setTargetAtTime(A.muted ? 0 : 0.85, c.currentTime, 0.05); };
A.duck = function (on) { if (musicBus) musicBus.gain.setTargetAtTime(on ? 0.25 : 0.8, c.currentTime, 0.1); };
document.addEventListener('visibilitychange', () => { if (c) { if (document.hidden) c.suspend(); else c.resume(); } });

/* ---------- ambiances ---------- */
const N = (n) => 440 * Math.pow(2, (n - 69) / 12);       // note MIDI -> Hz
const MOODS = {
  silence: { sub: 0, pad: 0, cut: 300, chord: [38, 45, 50, 53], wind: 0.05, windF: 400, voice: 0, pat: null, bpm: 60, shim: 0 },
  caladan: { sub: 0.0, pad: 0.35, cut: 520, chord: [50, 57, 62, 65], wind: 0.38, windF: 1900, voice: 0.35, vOct: 0, pat: null, bpm: 60, shim: 0 },
  title:   { sub: 0.55, pad: 0.55, cut: 650, chord: [38, 45, 50, 57], wind: 0.2, windF: 520, voice: 0.85, vOct: 0, pat: 'slow', bpm: 52, shim: 0 },
  giedi:   { sub: 0.5, pad: 0.45, cut: 400, chord: [36, 37, 43, 49], wind: 0.1, windF: 300, voice: 0, pat: 'ind', bpm: 62, shim: 0 },
  storm:   { sub: 0.55, pad: 0.45, cut: 700, chord: [38, 39, 45, 51], wind: 0.95, windF: 900, voice: 0.2, vOct: -12, pat: 'pulse', bpm: 108, shim: 0 },
  trek:    { sub: 0.5, pad: 0.5, cut: 600, chord: [38, 45, 48, 53], wind: 0.34, windF: 540, voice: 0.55, vOct: 0, pat: 'heart', bpm: 52, shim: 0 },
  danger:  { sub: 0.7, pad: 0.5, cut: 900, chord: [38, 39, 45, 50], wind: 0.5, windF: 700, voice: 0.2, vOct: -12, pat: 'pulse', bpm: 120, shim: 0 },
  ride:    { sub: 0.7, pad: 0.55, cut: 800, chord: [38, 45, 46, 50], wind: 0.4, windF: 650, voice: 0.9, vOct: 0, pat: 'march', bpm: 104, shim: 0.1 },
  battle:  { sub: 0.85, pad: 0.6, cut: 1100, chord: [38, 39, 45, 46], wind: 0.5, windF: 800, voice: 1.0, vOct: 0, pat: 'war', bpm: 120, shim: 0.2 },
  vision:  { sub: 0.2, pad: 0.4, cut: 1800, chord: [57, 64, 69, 73], wind: 0.12, windF: 2400, voice: 0.4, vOct: 12, pat: null, bpm: 60, shim: 0.9 },
  duel:    { sub: 0.6, pad: 0.45, cut: 700, chord: [38, 41, 45, 48], wind: 0.12, windF: 400, voice: 0.3, vOct: -12, pat: 'duel', bpm: 84, shim: 0 },
  palace:  { sub: 0.4, pad: 0.5, cut: 560, chord: [43, 50, 53, 58], wind: 0.1, windF: 400, voice: 0.3, vOct: -12, pat: 'slow', bpm: 46, shim: 0 },
  sorrow:  { sub: 0.3, pad: 0.55, cut: 900, chord: [50, 57, 60, 65], wind: 0.25, windF: 700, voice: 0.95, vOct: 0, pat: null, bpm: 60, shim: 0.15 },
  blind:   { sub: 0.65, pad: 0.4, cut: 480, chord: [34, 41, 46, 53], wind: 0.3, windF: 420, voice: 0.4, vOct: -12, pat: 'heart', bpm: 48, shim: 0.1 },
};
const PATS = {
  slow:  'B...............' + '................',
  heart: 'b..b............' + '................',
  march: 'B...t...B.t.t...',
  pulse: 'B.t.t.t.B.t.t.t.',
  war:   'B.tBt.B.B.tBt.mm' + 'B.tBt.B.B.tBtmmm',
  ind:   'c...t...t...c.t.',
  duel:  'b.t...t.b..t..t.' + 'B.t...t.....t.tt',
};
A.mood = function (name, force) {
  if (!MOODS[name]) name = 'silence';
  A.mood_ = name; A.m = MOODS[name];
  if (!c) return;
  const m = A.m, t = c.currentTime, k = 1.8;
  subG.gain.setTargetAtTime(m.sub * 0.5, t, k);
  padG.gain.setTargetAtTime(m.pad * 0.5, t, k);
  padF.frequency.setTargetAtTime(m.cut, t, k);
  windG.gain.setTargetAtTime(m.wind * 0.22, t, k);
  windF.frequency.setTargetAtTime(m.windF, t, k);
  windLfo.frequency.value = m.windF > 1500 ? 0.3 : 0.11;
  padOscs.forEach((p) => {
    if (p.sub) { p.o.frequency.setTargetAtTime(N(m.chord[0]), t, 2.5 + p.i); if (p.i) p.o.frequency.setTargetAtTime(N(m.chord[0] + 7), t, 3); }
    else p.o.frequency.setTargetAtTime(N(m.chord[p.voice]) , t, 2.2 + p.voice * 0.4);
  });
  stepIdx = 0; nextT = 0;
};

/* ---------- séquenceur ---------- */
let nextT = 0, stepIdx = 0;
function tick() {
  if (!c || c.state !== 'running' || !A.m) return;
  const now = c.currentTime, m = A.m;
  if (nextT < now) nextT = now + 0.05;
  const dur = 60 / m.bpm / 4;
  while (nextT < now + 0.2) { doStep(nextT, stepIdx, m); stepIdx++; nextT += dur; }
}
const HIJAZ = [0, 1, 4, 5, 7, 8, 10, 12];
function doStep(t, i, m) {
  if (m.pat) {
    const p = PATS[m.pat], ch = p[i % p.length];
    if (ch === 'B') drum.boom(t, 1); else if (ch === 'b') drum.boom(t, 0.55);
    else if (ch === 't') drum.tick(t, 0.5); else if (ch === 'm') drum.tom(t, 0.7);
    else if (ch === 'c') drum.clank(t, 0.6);
    if (m.pat === 'war' && i % 32 === 0) drum.taiko(t);
  }
  const barLen = m.pat ? PATS[m.pat].length : 32;
  if (i % barLen === 0 && m.voice > 0 && Math.random() < m.voice) {
    const root = m.chord[2] + (m.vOct || 0) + 12;
    let tt = t + 0.1; const n = 2 + (Math.random() * 3 | 0); let deg = (Math.random() * 4) | 0;
    for (let k = 0; k < n; k++) {
      deg = G.clamp(deg + ((Math.random() * 5 | 0) - 2), 0, 7);
      const d = 1.3 + Math.random() * 1.8;
      voice(tt, N(root + HIJAZ[deg]), d, 0.1 + 0.05 * Math.random());
      tt += d * 0.8;
    }
  }
  if (m.shim > 0 && i % 2 === 0 && Math.random() < 0.5 * m.shim) {
    const f = N(m.chord[(Math.random() * 4) | 0] + 24 + HIJAZ[(Math.random() * 6) | 0] * (Math.random() < 0.5 ? 0 : 1));
    tone({ at: t, f, dur: 1.4 + Math.random(), gain: 0.05 * m.shim + 0.01, dest: shimG, attack: 0.01 });
  }
}
function voice(t, f, dur, vol) {
  const o = c.createOscillator(), o2 = c.createOscillator(), g = c.createGain();
  o.type = 'sawtooth'; o2.type = 'sine';
  o.frequency.setValueAtTime(f * 0.97, t); o.frequency.exponentialRampToValueAtTime(f, t + 0.25);
  o2.frequency.setValueAtTime(f * 0.97, t); o2.frequency.exponentialRampToValueAtTime(f, t + 0.25);
  const vib = c.createOscillator(), vg = c.createGain(); vib.frequency.value = 5.1; vg.gain.setValueAtTime(0, t); vg.gain.linearRampToValueAtTime(f * 0.012, t + dur * 0.6);
  vib.connect(vg); vg.connect(o.frequency); vg.connect(o2.frequency);
  const f1 = c.createBiquadFilter(), f2 = c.createBiquadFilter(), mix = c.createGain();
  f1.type = f2.type = 'bandpass'; f1.frequency.value = 760; f2.frequency.value = 1220; f1.Q.value = f2.Q.value = 6;
  o.connect(f1); o.connect(f2); f1.connect(mix); f2.connect(mix); o2.connect(mix);
  g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(vol, t + dur * 0.35); g.gain.exponentialRampToValueAtTime(0.0001, t + dur + 0.8);
  mix.connect(g); g.connect(musicBus);
  o.start(t); o2.start(t); vib.start(t); o.stop(t + dur + 1); o2.stop(t + dur + 1); vib.stop(t + dur + 1);
}
const drum = {
  boom: ok((t, v) => { tone({ at: t, f: 120, f2: 36, dur: 0.7, gain: 0.55 * v, dest: musicBus, attack: 0.003 }); burst({ at: t, f: 220, type: 'lowpass', dur: 0.18, gain: 0.25 * v, dest: musicBus, brown: true }); }),
  tom: ok((t, v) => { tone({ at: t, f: 190, f2: 90, dur: 0.35, gain: 0.35 * v, dest: musicBus }); }),
  tick: ok((t, v) => { burst({ at: t, f: 5200, type: 'highpass', dur: 0.05, gain: 0.07 * v, dest: musicBus }); }),
  clank: ok((t, v) => { tone({ at: t, f: 523, dur: 0.5, type: 'square', gain: 0.05 * v, dest: musicBus }); tone({ at: t, f: 811, dur: 0.4, type: 'square', gain: 0.04 * v, dest: musicBus }); burst({ at: t, f: 3000, q: 4, dur: 0.2, gain: 0.08 * v, dest: musicBus }); }),
  taiko: ok((t) => { tone({ at: t, f: 90, f2: 28, dur: 1.4, gain: 0.7, dest: musicBus }); burst({ at: t, f: 500, type: 'lowpass', dur: 0.6, gain: 0.35, dest: musicBus, brown: true }); }),
};

/* ---------- boucles continues pilotées par les scènes ---------- */
A.thopter = ok((level) => { thopG.gain.setTargetAtTime(level * 0.4, c.currentTime, 0.15); thopLfo.frequency.setTargetAtTime(17 + level * 6, c.currentTime, 0.2); });
A.wormLevel = ok((level) => { wormG.gain.setTargetAtTime(level * 0.9, c.currentTime, 0.2); });
A.windBoost = ok((level) => { windG.gain.setTargetAtTime((A.m.wind + level) * 0.22, c.currentTime, 0.4); });
A.charge = ok((p) => {
  if (p <= 0) { charge.g.gain.setTargetAtTime(0, c.currentTime, 0.03); return; }
  charge.o.frequency.setTargetAtTime(220 + p * 700, c.currentTime, 0.03); charge.g.gain.setTargetAtTime(0.06 + p * 0.07, c.currentTime, 0.03);
});
A.silenceAll = ok(() => { A.thopter(0); A.wormLevel(0); A.charge(0); });

/* ---------- bruitages ---------- */
A.sfx = {
  step: ok((v) => { v = v || 1; burst({ f: 700 + Math.random() * 300, f2: 300, q: 0.9, dur: 0.13, gain: 0.16 * v }); tone({ f: 90, f2: 50, dur: 0.09, gain: 0.12 * v }); }),
  stepRock: ok((v) => { v = v || 1; burst({ f: 2400, q: 2, dur: 0.05, gain: 0.1 * v }); tone({ f: 160, f2: 90, dur: 0.06, gain: 0.1 * v }); }),
  ui: ok(() => { tone({ f: 640, f2: 520, dur: 0.07, gain: 0.07, type: 'triangle' }); }),
  confirm: ok(() => { tone({ f: 330, dur: 0.5, gain: 0.12, type: 'triangle' }); tone({ f: 495, dur: 0.6, gain: 0.08, type: 'sine' }); }),
  boom: ok(() => { tone({ f: 95, f2: 30, dur: 2.2, gain: 0.9 }); burst({ f: 300, f2: 60, type: 'lowpass', dur: 1.6, gain: 0.5, brown: true }); }),
  pickup: ok(() => { tone({ f: 988, dur: 0.6, gain: 0.08 }); tone({ f: 1480, dur: 0.8, gain: 0.05 }); }),
  water: ok(() => { tone({ f: 900, f2: 420, dur: 0.18, gain: 0.1 }); tone({ f: 1350, f2: 700, dur: 0.22, gain: 0.06, at: c.currentTime + 0.1 }); }),
  explosion: ok((v) => { v = v || 1; burst({ f: 1400, f2: 60, type: 'lowpass', dur: 1.8, gain: 0.7 * v, brown: true, q: 0.5 }); tone({ f: 80, f2: 24, dur: 1.4, gain: 0.8 * v }); burst({ f: 3000, f2: 400, dur: 0.4, gain: 0.25 * v }); }),
  shot: ok(() => { burst({ f: 3200, f2: 800, q: 1.4, dur: 0.07, gain: 0.14 }); }),
  burst: ok(() => { for (let i = 0; i < 4; i++) burst({ at: c.currentTime + i * 0.07, f: 3000, f2: 700, q: 1.4, dur: 0.06, gain: 0.12 }); }),
  hit: ok(() => { tone({ f: 140, f2: 40, dur: 0.4, gain: 0.5 }); burst({ f: 900, f2: 200, dur: 0.25, gain: 0.3 }); }),
  telegraph: ok(() => { tone({ f: 1500, dur: 0.12, gain: 0.04, type: 'square' }); }),
  warn: ok(() => { tone({ f: 420, f2: 380, dur: 0.35, gain: 0.08, type: 'sawtooth' }); }),
  dash: ok(() => { burst({ f: 400, f2: 2400, q: 0.8, dur: 0.35, gain: 0.22 }); }),
  dive: ok(() => { burst({ f: 900, f2: 90, type: 'lowpass', dur: 1.0, gain: 0.45, brown: true }); tone({ f: 70, f2: 30, dur: 1.0, gain: 0.3 }); }),
  surface: ok(() => { burst({ f: 100, f2: 900, type: 'lowpass', dur: 0.9, gain: 0.5, brown: true }); }),
  roar: ok(() => { burst({ f: 220, f2: 120, q: 0.6, dur: 2.4, gain: 0.5, brown: true, attack: 0.4 }); tone({ f: 60, f2: 40, dur: 2.4, gain: 0.3, type: 'sawtooth', attack: 0.5 }); }),
  clash: ok(() => { burst({ f: 4200, q: 3, dur: 0.22, gain: 0.25 }); tone({ f: 1760, dur: 0.5, gain: 0.07 }); tone({ f: 2630, dur: 0.4, gain: 0.05 }); }),
  swing: ok(() => { burst({ f: 600, f2: 2600, q: 1, dur: 0.14, gain: 0.12 }); }),
  shield: ok(() => { tone({ f: 2100, f2: 380, dur: 0.35, gain: 0.12, type: 'triangle' }); burst({ f: 5000, q: 2, dur: 0.15, gain: 0.1 }); }),
  stab: ok(() => { tone({ f: 100, f2: 38, dur: 0.6, gain: 0.7 }); burst({ f: 1200, f2: 200, dur: 0.4, gain: 0.35 }); }),
  ping: ok((s) => { s = s || 0.5; tone({ f: 1100 - s * 400, f2: 900 - s * 400, dur: 1.6, gain: 0.05 + 0.08 * s }); }),
  heart: ok(() => { tone({ f: 62, f2: 40, dur: 0.22, gain: 0.5 }); tone({ f: 58, f2: 38, dur: 0.22, gain: 0.35, at: c.currentTime + 0.2 }); }),
  fail: ok(() => { tone({ f: 130, f2: 36, dur: 2.6, gain: 0.3, type: 'sawtooth', attack: 0.1 }); }),
  tremor: ok(() => { tone({ f: 48, f2: 34, dur: 1.2, gain: 0.45 }); burst({ f: 140, type: 'lowpass', dur: 1.0, gain: 0.3, brown: true }); }),
  flash: ok(() => { burst({ f: 6000, f2: 200, dur: 3.0, gain: 0.6, attack: 0.02 }); tone({ f: 70, f2: 26, dur: 3, gain: 0.9 }); }),
  vision: ok(() => { tone({ f: 660, f2: 990, dur: 1.4, gain: 0.07, attack: 0.4 }); tone({ f: 990, f2: 1320, dur: 1.6, gain: 0.05, attack: 0.5 }); }),
};
})();
