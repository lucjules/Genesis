/* Dune : Genesis — socle : utilitaires, bruit, entrées, boucle, scènes, post-traitement */
(function () {
'use strict';
const G = window.G = { W: 1280, H: 720, scenes: {}, time: 0, TAU: Math.PI * 2 };
const TAU = G.TAU;

/* ---------- maths ---------- */
G.clamp = (v, a, b) => v < a ? a : v > b ? b : v;
G.lerp = (a, b, t) => a + (b - a) * t;
G.smooth = (a, b, x) => { const t = G.clamp((x - a) / (b - a), 0, 1); return t * t * (3 - 2 * t); };
G.rnd = (a = 1, b) => b === undefined ? Math.random() * a : a + Math.random() * (b - a);
G.pick = (arr) => arr[Math.floor(Math.random() * arr.length)];
G.dist = (ax, ay, bx, by) => Math.hypot(ax - bx, ay - by);
G.angDiff = (a, b) => { let d = (b - a) % TAU; if (d > Math.PI) d -= TAU; if (d < -Math.PI) d += TAU; return d; };
G.rng = function (seed) {
  let s = seed >>> 0;
  return function () {
    s = (s + 0x6D2B79F5) | 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
};

/* ---------- bruit de valeur ---------- */
function hash2(ix, iy, seed) {
  let h = Math.imul(ix, 374761393) + Math.imul(iy, 668265263) + Math.imul(seed | 0, 1442695041);
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  h ^= h >>> 16;
  return (h >>> 0) / 4294967296;
}
function vnoise(x, y, seed) {
  const ix = Math.floor(x), iy = Math.floor(y);
  const fx = x - ix, fy = y - iy;
  const u = fx * fx * fx * (fx * (fx * 6 - 15) + 10);
  const v = fy * fy * fy * (fy * (fy * 6 - 15) + 10);
  const a = hash2(ix, iy, seed), b = hash2(ix + 1, iy, seed);
  const c = hash2(ix, iy + 1, seed), d = hash2(ix + 1, iy + 1, seed);
  return a + (b - a) * u + (c - a) * v + (a - b - c + d) * u * v;
}
function fbm(x, y, oct, seed) {
  let s = 0, a = 0.5, f = 1, n = 0;
  for (let i = 0; i < oct; i++) { s += a * vnoise(x * f, y * f, seed + i * 17); n += a; a *= 0.5; f *= 2.03; }
  return s / n;
}
G.hash2 = hash2; G.vnoise = vnoise; G.fbm = fbm;

/* ---------- texte ---------- */
const FD = '"Cinzel","Trajan Pro","Optima","Palatino Linotype",Georgia,serif';
const FB = '"Cormorant Garamond","Palatino Linotype","Book Antiqua",Georgia,serif';
G.font = (size, weight, fam) => `${weight || 400} ${size}px ${fam === 'body' ? FB : FD}`;
G.text = function (ctx, s, x, y, o) {
  o = o || {};
  ctx.save();
  ctx.font = G.font(o.size || 24, o.weight, o.fam);
  ctx.textAlign = o.align || 'left';
  ctx.textBaseline = o.base || 'alphabetic';
  if ('letterSpacing' in ctx) ctx.letterSpacing = (o.ls || 0) + 'px';
  ctx.globalAlpha *= (o.alpha === undefined ? 1 : o.alpha);
  if (o.shadow !== false) { ctx.shadowColor = 'rgba(0,0,0,.85)'; ctx.shadowBlur = o.shadowBlur || 8; }
  ctx.fillStyle = o.color || '#eadcc4';
  ctx.fillText(s, x, y);
  ctx.restore();
};
G.wrap = function (ctx, s, maxW, font) {
  ctx.save(); ctx.font = font;
  const words = s.split(' '), lines = []; let cur = '';
  for (const w of words) {
    const t = cur ? cur + ' ' + w : w;
    if (ctx.measureText(t).width > maxW && cur) { lines.push(cur); cur = w; } else cur = t;
  }
  if (cur) lines.push(cur);
  ctx.restore();
  return lines;
};
G.paragraph = function (ctx, s, x, y, maxW, lineH, o) {
  o = o || {};
  const f = G.font(o.size || 24, o.weight, o.fam);
  const lines = G.wrap(ctx, s, maxW, f);
  lines.forEach((l, i) => G.text(ctx, l, x, y + i * lineH, o));
  return lines.length * lineH;
};

/* ---------- entrées ---------- */
const keys = {}, pressedSet = new Set();
G.mouse = { x: 640, y: 360, down: false, clicked: false, moved: false };
G.stick = { x: 0, y: 0 };
G.keys = keys; G.pressedSet = pressedSet;
G.key = (c) => !!keys[c];
G.hit = (c) => pressedSet.has(c);
G.anyKey = (...c) => c.some((k) => keys[k]);
G.anyHit = (...c) => c.some((k) => pressedSet.has(k));
G.axis = function () {
  let x = 0, y = 0;
  if (keys.ArrowLeft || keys.KeyA) x -= 1;
  if (keys.ArrowRight || keys.KeyD) x += 1;
  if (keys.ArrowUp || keys.KeyW) y -= 1;
  if (keys.ArrowDown || keys.KeyS) y += 1;
  if (G.stick.x || G.stick.y) { x = G.stick.x; y = G.stick.y; }
  const l = Math.hypot(x, y);
  if (l > 1) { x /= l; y /= l; }
  return { x, y, len: l > 1 ? 1 : l };
};
G.confirm = () => G.anyHit('Enter', 'Space', 'NumpadEnter') || G.mouse.clicked;
G.firstInput = false;
function onFirst() {
  if (!G.firstInput) { G.firstInput = true; if (G.audio) G.audio.init(); }
  else if (G.audio) G.audio.resume();
}
function toggleFullscreen() {
  try {
    if (document.fullscreenElement) document.exitFullscreen();
    else if (document.documentElement.requestFullscreen) document.documentElement.requestFullscreen();
  } catch (err) { /* plein écran indisponible */ }
}
window.addEventListener('keydown', (e) => {
  if (e.code === 'KeyF' && !e.repeat && !e.ctrlKey && !e.metaKey && G.curName !== 'duel') toggleFullscreen();
  if (!keys[e.code]) pressedSet.add(e.code);
  keys[e.code] = true;
  if (['Space', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Tab'].includes(e.code)) e.preventDefault();
  onFirst();
});
window.addEventListener('keyup', (e) => { keys[e.code] = false; });
window.addEventListener('blur', () => { for (const k in keys) keys[k] = false; });

/* ---------- canvas ---------- */
const canvas = document.getElementById('c');
const ctx = canvas.getContext('2d', { alpha: false });
G.canvas = canvas; G.ctx = ctx;
let scale = 1, offX = 0, offY = 0, dpr = 1;
function resize() {
  dpr = Math.min(window.devicePixelRatio || 1, 2);
  const w = window.innerWidth, h = window.innerHeight;
  canvas.width = Math.round(w * dpr); canvas.height = Math.round(h * dpr);
  canvas.style.width = w + 'px'; canvas.style.height = h + 'px';
  scale = Math.min(canvas.width / G.W, canvas.height / G.H);
  offX = (canvas.width - G.W * scale) / 2; offY = (canvas.height - G.H * scale) / 2;
}
window.addEventListener('resize', resize); resize();
function toLogical(e) {
  const r = canvas.getBoundingClientRect();
  G.mouse.x = ((e.clientX - r.left) * dpr - offX) / scale;
  G.mouse.y = ((e.clientY - r.top) * dpr - offY) / scale;
  G.mouse.moved = true;
}
canvas.addEventListener('mousemove', toLogical);
canvas.addEventListener('mousedown', (e) => { toLogical(e); G.mouse.down = true; G.mouse.clicked = true; onFirst(); keys.Mouse0 = true; pressedSet.add('Mouse0'); });
window.addEventListener('mouseup', () => { G.mouse.down = false; keys.Mouse0 = false; });
canvas.addEventListener('contextmenu', (e) => e.preventDefault());

/* tactile */
(function touchInit() {
  const root = document.getElementById('touch');
  let isTouch = false;
  function enable() { if (isTouch) return; isTouch = true; G.isTouch = true; root.classList.add('on'); }
  window.addEventListener('touchstart', enable, { passive: true });
  const stickEl = document.getElementById('stick'), knob = stickEl.querySelector('i'), nub = knob.querySelector('b');
  let sid = null, ox = 0, oy = 0;
  stickEl.addEventListener('touchstart', (e) => {
    const t = e.changedTouches[0]; sid = t.identifier; ox = t.clientX; oy = t.clientY;
    knob.style.display = 'block'; knob.style.left = ox + 'px'; knob.style.top = (oy - stickEl.getBoundingClientRect().top) + 'px';
    nub.style.transform = 'translate(0,0)'; onFirst(); e.preventDefault();
  }, { passive: false });
  stickEl.addEventListener('touchmove', (e) => {
    for (const t of e.changedTouches) if (t.identifier === sid) {
      let dx = t.clientX - ox, dy = t.clientY - oy; const l = Math.hypot(dx, dy), m = 55;
      if (l > m) { dx = dx / l * m; dy = dy / l * m; }
      nub.style.transform = `translate(${dx}px,${dy}px)`;
      G.stick.x = Math.abs(dx) > 8 ? dx / m : 0; G.stick.y = Math.abs(dy) > 8 ? dy / m : 0;
    }
    e.preventDefault();
  }, { passive: false });
  const end = (e) => { for (const t of e.changedTouches) if (t.identifier === sid) { sid = null; G.stick.x = G.stick.y = 0; knob.style.display = 'none'; } };
  stickEl.addEventListener('touchend', end); stickEl.addEventListener('touchcancel', end);
  document.querySelectorAll('.tb').forEach((b) => {
    const k = b.dataset.k;
    b.addEventListener('touchstart', (e) => { if (!keys[k]) pressedSet.add(k); keys[k] = true; b.classList.add('dn'); onFirst(); e.preventDefault(); }, { passive: false });
    const up = (e) => { keys[k] = false; b.classList.remove('dn'); e.preventDefault(); };
    b.addEventListener('touchend', up, { passive: false }); b.addEventListener('touchcancel', up, { passive: false });
  });
  canvas.addEventListener('touchstart', (e) => { const t = e.changedTouches[0]; toLogical(t); G.mouse.clicked = true; G.mouse.down = true; onFirst(); e.preventDefault(); }, { passive: false });
  canvas.addEventListener('touchend', () => { G.mouse.down = false; });
})();

/* ---------- sauvegarde ---------- */
G.save = { chapter: 0, best: {} };
try { const s = localStorage.getItem('dune-genesis'); if (s) Object.assign(G.save, JSON.parse(s)); } catch (e) { /* stockage indisponible */ }
G.persist = () => { try { localStorage.setItem('dune-genesis', JSON.stringify(G.save)); } catch (e) { /* ignore */ } };
G.run = { spice: 0, truth: null, hayt: null, deaths: 0 };

/* ---------- sous-titres ---------- */
G.subQ = []; G.subCur = null;
G.say = function (text, who, dur) {
  G.subQ.push({ text, who: who || '', dur: dur || (2.2 + text.length * 0.045), t: 0 });
};
G.clearSubs = () => { G.subQ.length = 0; G.subCur = null; };
function updateSubs(dt) {
  if (!G.subCur && G.subQ.length) G.subCur = G.subQ.shift();
  if (G.subCur) { G.subCur.t += dt; if (G.subCur.t > G.subCur.dur) G.subCur = null; }
}
function drawSubs(c) {
  const s = G.subCur; if (!s) return;
  const a = Math.min(1, s.t / 0.3, (s.dur - s.t) / 0.4);
  c.save(); c.globalAlpha = Math.max(0, a);
  const f = G.font(25, 500, 'body');
  const lines = G.wrap(c, s.text, 900, f);
  const y0 = G.H - 62 - (lines.length - 1) * 30;
  const w = Math.min(960, Math.max(...lines.map((l) => { c.font = f; return c.measureText(l).width; })) + 70);
  const g = c.createLinearGradient(0, y0 - 70, 0, G.H);
  g.addColorStop(0, 'rgba(0,0,0,0)'); g.addColorStop(1, 'rgba(0,0,0,.55)');
  c.fillStyle = g; c.fillRect(0, y0 - 70, G.W, G.H - y0 + 70);
  if (s.who) G.text(c, s.who.toUpperCase(), G.W / 2, y0 - 34, { size: 12, align: 'center', ls: 5, color: '#d9a05b' });
  lines.forEach((l, i) => G.text(c, l, G.W / 2, y0 + i * 30, { size: 25, weight: 500, fam: 'body', align: 'center', color: '#f1e6d2' }));
  c.restore();
  void w;
}

/* ---------- effets post ---------- */
const grainTiles = [], grainPat = [];
for (let n = 0; n < 4; n++) {
  const g = document.createElement('canvas'); g.width = g.height = 256;
  const gc = g.getContext('2d'), id = gc.createImageData(256, 256);
  for (let i = 0; i < id.data.length; i += 4) { const v = Math.random() * 255 | 0; id.data[i] = id.data[i + 1] = id.data[i + 2] = v; id.data[i + 3] = 255; }
  gc.putImageData(id, 0, 0); grainTiles.push(g);
}
const vig = document.createElement('canvas'); vig.width = 640; vig.height = 360;
(function () {
  const v = vig.getContext('2d');
  const g = v.createRadialGradient(320, 180, 120, 320, 180, 400);
  g.addColorStop(0, 'rgba(0,0,0,0)'); g.addColorStop(0.65, 'rgba(0,0,0,.18)'); g.addColorStop(1, 'rgba(0,0,0,.72)');
  v.fillStyle = g; v.fillRect(0, 0, 640, 360);
})();
G.bars = 0; G.barsTarget = 0;
G.shake = 0; G.flash = 0; G.flashColor = '#fff';
G.grade = null;       // {color, alpha, mode}
G.grainAmt = 0.07;

function post(c, dt) {
  // étalonnage global
  if (G.grade) {
    c.save(); c.globalAlpha = G.grade.alpha * 0.7;
    c.fillStyle = G.grade.color; c.fillRect(0, 0, G.W, G.H); c.restore();
  }
  c.drawImage(vig, 0, 0, G.W, G.H);
  // grain argentique (motif répété : pas de jointures visibles)
  if (G.grainAmt > 0) {
    c.save(); c.globalAlpha = G.grainAmt * 0.5;
    const k = (Math.random() * 4) | 0, ox = ((Math.random() * 256) | 0) * 2, oy = ((Math.random() * 256) | 0) * 2;
    if (!grainPat[k]) { grainPat[k] = c.createPattern(grainTiles[k], 'repeat'); if (grainPat[k].setTransform && window.DOMMatrix) grainPat[k].setTransform(new DOMMatrix([2, 0, 0, 2, 0, 0])); }
    c.translate(-ox, -oy); c.fillStyle = grainPat[k]; c.fillRect(ox, oy, G.W, G.H);
    c.restore();
  }
  // flash
  if (G.flash > 0.01) { c.save(); c.globalAlpha = Math.min(1, G.flash); c.fillStyle = G.flashColor; c.fillRect(0, 0, G.W, G.H); c.restore(); G.flash *= Math.pow(0.02, dt); }
  // bandes cinéma
  G.bars += (G.barsTarget - G.bars) * Math.min(1, dt * 3);
  if (G.bars > 0.5) { c.fillStyle = '#000'; c.fillRect(0, 0, G.W, G.bars); c.fillRect(0, G.H - G.bars, G.W, G.bars); }
}

/* ---------- scènes & transitions ---------- */
G.cur = null; G.curName = '';
const trans = { phase: 'none', t: 0, dur: 0.7, next: null, opts: null };
G.fadeA = 0;
G.busy = () => !!trans.next;
G.go = function (name, opts, fast) {
  if (!G.scenes[name]) { console.error('scène inconnue', name); return; }
  if (trans.next) return;
  if (!G.cur) { enter(name, opts); trans.phase = 'in'; trans.t = 0; return; }
  trans.phase = 'out'; trans.t = 0; trans.next = name; trans.opts = opts; trans.dur = fast ? 0.35 : 0.8;
  G.failState = null; G.paused = false;
};
function enter(name, opts) {
  if (G.cur && G.cur.exit) G.cur.exit();
  G.clearSubs(); G.shake = 0; G.grade = null; G.barsTarget = 0; G.grainAmt = 0.07;
  G.cur = G.scenes[name]; G.curName = name;
  G.cur.enter(opts || {});
}
G.fail = function (title, text, retry) {
  G.failState = { title, text, retry, t: 0 };
  G.run.deaths++;
  if (G.audio) G.audio.sfx.fail();
};
G.paused = false;
G.pauseIdx = 0;

function drawFail(c) {
  const f = G.failState; const a = G.smooth(0, 0.8, f.t);
  c.save(); c.globalAlpha = a * 0.78; c.fillStyle = '#050302'; c.fillRect(0, 0, G.W, G.H); c.restore();
  c.save(); c.globalAlpha = a;
  G.text(c, f.title, G.W / 2, 310, { size: 44, align: 'center', ls: 8, color: '#e8d2ad', weight: 500 });
  G.paragraph(c, f.text, G.W / 2, 362, 760, 34, { size: 26, fam: 'body', align: 'center', color: '#bda98c' });
  const blink = 0.55 + 0.45 * Math.sin(G.time * 3);
  c.globalAlpha = a * blink;
  G.text(c, 'ENTRÉE — RÉESSAYER      ÉCHAP — MENU', G.W / 2, 500, { size: 14, align: 'center', ls: 5, color: '#d9a05b' });
  c.restore();
}
const PAUSE_ITEMS = ['Reprendre', 'Son : ', 'Quitter vers le titre'];
function drawPause(c) {
  c.save(); c.fillStyle = 'rgba(5,3,2,.72)'; c.fillRect(0, 0, G.W, G.H);
  G.text(c, 'PAUSE', G.W / 2, 250, { size: 40, align: 'center', ls: 12 });
  PAUSE_ITEMS.forEach((it, i) => {
    let s = it; if (i === 1) s += (G.audio && G.audio.muted ? 'coupé' : 'actif');
    const sel = i === G.pauseIdx;
    G.text(c, s.toUpperCase(), G.W / 2, 340 + i * 54, { size: 20, align: 'center', ls: 6, color: sel ? '#f4c27c' : '#8f7f68' });
    if (sel) { c.fillStyle = '#d9a05b'; c.fillRect(G.W / 2 - 150, 354 + i * 54, 300, 1); }
  });
  c.restore();
}
function updatePause() {
  if (G.anyHit('ArrowUp', 'KeyW')) G.pauseIdx = (G.pauseIdx + 2) % 3;
  if (G.anyHit('ArrowDown', 'KeyS')) G.pauseIdx = (G.pauseIdx + 1) % 3;
  // survol souris
  if (G.mouse.moved) for (let i = 0; i < 3; i++) if (Math.abs(G.mouse.x - G.W / 2) < 200 && Math.abs(G.mouse.y - (333 + i * 54)) < 24) G.pauseIdx = i;
  if (G.anyHit('Enter', 'Space') || (G.mouse.clicked && Math.abs(G.mouse.x - G.W / 2) < 220)) {
    if (G.pauseIdx === 0) G.paused = false;
    else if (G.pauseIdx === 1) G.audio.toggleMute();
    else { G.paused = false; G.go('title'); }
  }
}

/* ---------- boucle ---------- */
let last = 0;
function frame(ts) {
  const dt = Math.min(0.05, (ts - last) / 1000 || 0.016); last = ts; G.time += dt;
  const c = ctx;
  c.setTransform(1, 0, 0, 1, 0, 0);
  c.fillStyle = '#000'; c.fillRect(0, 0, canvas.width, canvas.height);
  c.setTransform(scale, 0, 0, scale, offX, offY);
  c.save(); c.beginPath(); c.rect(0, 0, G.W, G.H); c.clip();

  // pause
  if (G.cur && !G.failState && !trans.next && G.hit('Escape') && G.curName !== 'title') { G.paused = !G.paused; G.pauseIdx = 0; if (G.audio) G.audio.duck(G.paused); }
  if (G.paused) updatePause();
  else if (G.failState) {
    G.failState.t += dt;
    if (G.failState.t > 0.6 && G.anyHit('Enter', 'Space')) { const r = G.failState.retry; G.failState = null; if (r) r(); }
    else if (G.anyHit('Escape')) { G.failState = null; G.go('title'); }
  } else if (G.cur) {
    const sims = Math.max(1, G.sim | 0);
    for (let i = 0; i < sims; i++) { if (G.bot) G.bot(dt); if (!G.cur) break; G.cur.update(dt); updateSubs(dt); if (i < sims - 1) pressedSet.clear(); if (G.failState || G.paused) break; }
  }

  // transition
  if (trans.phase === 'out') {
    trans.t += dt; G.fadeA = Math.min(1, trans.t / trans.dur);
    if (trans.t >= trans.dur) { enter(trans.next, trans.opts); trans.next = null; trans.phase = 'in'; trans.t = 0; }
  } else if (trans.phase === 'in') {
    trans.t += dt; G.fadeA = 1 - Math.min(1, trans.t / 0.9);
    if (trans.t >= 0.9) trans.phase = 'none';
  }

  // dessin
  if (G.cur) {
    c.save();
    if (G.shake > 0.1) { c.translate((Math.random() - 0.5) * G.shake, (Math.random() - 0.5) * G.shake); G.shake *= Math.pow(0.04, dt); }
    G.cur.draw(c);
    c.restore();
  }
  post(c, dt);
  drawSubs(c);
  if (G.failState) drawFail(c);
  if (G.paused) drawPause(c);
  if (G.fadeA > 0.001) { c.fillStyle = '#000'; c.globalAlpha = G.fadeA; c.fillRect(0, 0, G.W, G.H); c.globalAlpha = 1; }
  c.restore();

  pressedSet.clear(); G.mouse.clicked = false; G.mouse.moved = false;
  requestAnimationFrame(frame);
}
G.start = function () { requestAnimationFrame(frame); };

/* ---------- particules génériques ---------- */
G.Particles = function (max) {
  this.p = []; this.max = max || 400;
};
G.Particles.prototype.add = function (o) {
  if (this.p.length >= this.max) this.p.shift();
  o.t = 0; o.life = o.life || 1; this.p.push(o);
};
G.Particles.prototype.update = function (dt) {
  for (let i = this.p.length - 1; i >= 0; i--) {
    const q = this.p[i]; q.t += dt;
    if (q.t >= q.life) { this.p.splice(i, 1); continue; }
    q.x += (q.vx || 0) * dt; q.y += (q.vy || 0) * dt;
    if (q.drag) { const d = Math.pow(q.drag, dt); q.vx *= d; q.vy *= d; }
    if (q.g) q.vy += q.g * dt;
  }
};
G.Particles.prototype.draw = function (c, camX, camY, mode) {
  c.save();
  if (mode) c.globalCompositeOperation = mode;
  for (const q of this.p) {
    const k = q.t / q.life;
    const a = (q.a === undefined ? 1 : q.a) * (1 - k) * (q.fadeIn ? Math.min(1, k * 8) : 1);
    const r = q.r0 + (q.r1 - q.r0) * k;
    if (a <= 0.01 || r <= 0.1) continue;
    c.globalAlpha = a; c.fillStyle = q.color || '#fff';
    c.beginPath(); c.arc(q.x - camX, q.y - camY, r, 0, TAU); c.fill();
  }
  c.restore();
};
})();
