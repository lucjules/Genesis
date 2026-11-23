/* Dune : Genesis — Chapitre IV : l'Eau de Vie. Suivre le fil du temps à travers les futurs. */
(function () {
'use strict';
const G = window.G, A = G.art;
const { clamp, smooth, lerp, TAU } = G;

const VISIONS = [
  [0.15, 'Des légions sous des bannières vertes et noires. Mon nom, scandé jusque dans les étoiles.'],
  [0.35, 'Un enfant au regard d’ancien. Il n’est pas encore né, et il me connaît.'],
  [0.55, 'Chani… près d’une eau qui ne devrait pas exister. Pourquoi pleure-t-elle ?'],
  [0.75, 'Le feu sur toutes les mers. Des mondes entiers, réduits au silence.'],
  [0.95, 'Et un chemin si étroit qu’il tient dans un seul souffle. Je le vois.'],
];

G.scenes.vision = {
  enter() {
    this.t = 0; this.scroll = 0; this.px = 380; this.py = 360; this.vx = 0; this.vy = 0; this.clarity = 0; this.vi = 0;
    this.hits = []; this.hitCd = 0; this.visT = 0; this.visK = -1; this.done = 0; this.trail = []; this.spawnT = 2; this.shakeT = 0;
    this.parts = new G.Particles(300); this.left = false;
    G.audio.mood('vision'); G.audio.silenceAll(); G.grade = { color: '#1a50c8', alpha: 0.14, mode: 'soft-light' }; G.grainAmt = 0.09;
    G.say('Paul est entre deux rives. Suis le fil doré du temps — évite les gouffres.', '', 6);
    G.say('ZQSD / flèches : guider ton esprit', '', 4);
  },
  thread(u) {
    return 360 + 150 * Math.sin(u * 0.0036) + 90 * Math.sin(u * 0.0083 + 1.3) + 38 * Math.sin(u * 0.019 + 0.5) * (0.5 + 0.5 * Math.sin(u * 0.0021));
  },
  update(dt) {
    this.t += dt; this.parts.update(dt);
    if (this.done) { this.done += dt; if (this.done > 4.2 && !this.left) { this.left = true; G.next(); } return; }
    const ax = G.axis();
    this.vx += ax.x * 1100 * dt; this.vy += ax.y * 1100 * dt;
    const damp = Math.pow(0.04, dt); this.vx *= damp; this.vy *= damp;
    const sp = Math.hypot(this.vx, this.vy); if (sp > 360) { this.vx *= 360 / sp; this.vy *= 360 / sp; }
    this.px = clamp(this.px + this.vx * dt, 200, 620); this.py = clamp(this.py + this.vy * dt, 50, G.H - 50);
    const v = 200 + 30 * this.clarity; this.scroll += v * dt;
    // fil
    const ty = this.thread(this.px + this.scroll), off = Math.abs(this.py - ty);
    const on = off < 56; this.on = on;
    this.clarity = clamp(this.clarity + (on ? 0.030 * (1 - off / 120) : -0.05) * dt, 0, 1);
    G.audio.windBoost(0);
    // gouffres
    this.spawnT -= dt; this.hitCd = Math.max(0, this.hitCd - dt);
    if (this.spawnT <= 0) { this.spawnT = 1.5 + Math.random() * 1.3 - this.clarity * 0.5; const y = this.thread(G.W + this.scroll + 100) + G.rnd(-150, 150); this.hits.push({ x: G.W + 120, y: clamp(y, 60, G.H - 60), r: G.rnd(36, 66), s: Math.random() * 100 }); }
    for (const h of this.hits) { h.x -= (v * 1.25) * dt; if (this.hitCd <= 0 && Math.hypot(h.x - this.px, h.y - this.py) < h.r + 6) { this.hitCd = 1; this.clarity = Math.max(0, this.clarity - 0.1); G.shake = 14; G.audio.sfx.hit(); this.flashBad = 0.6; } }
    this.hits = this.hits.filter((h) => h.x > -150);
    this.flashBad = Math.max(0, (this.flashBad || 0) - dt * 1.6);
    // trace
    this.trail.push({ x: this.px, y: this.py, t: this.t }); while (this.trail.length > 60) this.trail.shift();
    if (Math.random() < 0.8) this.parts.add({ x: this.px, y: this.py, vx: G.rnd(-60, -20), vy: G.rnd(-20, 20), r0: 3, r1: 0.5, life: 1, color: on ? '#ffd28a' : '#7ab4ff', a: 0.8 });
    // visions
    if (this.vi < VISIONS.length && this.clarity >= VISIONS[this.vi][0]) { G.say(VISIONS[this.vi][1], 'Paul', 6); this.visK = this.vi; this.visT = 6.5; G.audio.sfx.vision(); this.vi++; }
    this.visT = Math.max(0, this.visT - dt);
    if (this.clarity >= 1 && !this.done) { this.done = 0.001; G.flash = 1; G.flashColor = '#cfe4ff'; G.audio.sfx.boom(); G.say('Paul : « Je vois. Je vois tout. »', '', 4); }
  },
  drawVision(c, k, a) {
    const W = G.W, H = G.H, t = G.time;
    c.save(); c.globalAlpha = a * 0.7;
    if (k === 0) {
      c.fillStyle = 'rgba(8,24,14,.9)';
      for (let row = 0; row < 5; row++) for (let i = 0; i < 40; i++) { const x = 60 + i * 30 + (row % 2) * 15 + Math.sin(t * 2 + i) * 1.5, y = 330 + row * 38, h = 34 + row * 6; c.fillRect(x - 4, y - h, 8, h); c.beginPath(); c.arc(x, y - h - 4, 5, 0, TAU); c.fill(); }
      c.fillStyle = 'rgba(40,160,90,.8)'; for (let i = 0; i < 8; i++) c.fillRect(120 + i * 150, 140 + Math.sin(t * 1.5 + i) * 6, 5, 190), c.fillRect(125 + i * 150, 140, 56 + Math.sin(t * 3 + i) * 6, 80);
    } else if (k === 1) {
      A.person(c, W * 0.7, 560, 220, 'alia', t, { rim: [140, 190, 255], lit: 1 });
      const g = c.createRadialGradient(W * 0.7, 420, 0, W * 0.7, 420, 160); g.addColorStop(0, 'rgba(120,180,255,.5)'); g.addColorStop(1, 'rgba(120,180,255,0)'); c.fillStyle = g; c.fillRect(W * 0.7 - 170, 250, 340, 340);
    } else if (k === 2) {
      A.person(c, W * 0.68, 580, 360, 'chani', t, { rim: [150, 200, 255], lit: 1 });
      c.strokeStyle = 'rgba(150,200,255,.5)'; c.lineWidth = 2; for (let i = 0; i < 6; i++) { c.beginPath(); c.ellipse(W * 0.68, 590, 80 + i * 40 + Math.sin(t * 2 + i) * 6, 14 + i * 6, 0, 0, TAU); c.stroke(); }
    } else if (k === 3) {
      for (let i = 0; i < 12; i++) { const x = i * 120 + Math.sin(t + i) * 10, g = c.createRadialGradient(x, H, 0, x, H, 260 + (i % 3) * 60); g.addColorStop(0, 'rgba(255,150,50,.7)'); g.addColorStop(1, 'rgba(255,90,20,0)'); c.fillStyle = g; c.fillRect(x - 320, H - 320, 640, 320); }
      c.fillStyle = 'rgba(10,6,12,.8)'; for (let i = 0; i < 5; i++) { const x = 160 + i * 240, y = 140 + (i % 2) * 70; c.beginPath(); c.moveTo(x - 50, y); c.lineTo(x + 70, y - 8); c.lineTo(x + 70, y + 8); c.closePath(); c.fill(); }
    } else {
      c.strokeStyle = 'rgba(255,230,180,.9)'; c.lineWidth = 3;
      for (let i = -3; i <= 3; i++) { c.beginPath(); c.moveTo(W / 2 + i * 220, H); c.lineTo(W / 2 + i * 6, 250); c.stroke(); }
      const g = c.createRadialGradient(W / 2, 250, 0, W / 2, 250, 180); g.addColorStop(0, 'rgba(255,255,255,.9)'); g.addColorStop(1, 'rgba(255,255,255,0)'); c.fillStyle = g; c.fillRect(W / 2 - 200, 100, 400, 300);
    }
    c.restore();
  },
  draw(c) {
    const W = G.W, H = G.H, t = G.time, cl = this.clarity;
    A.voidBlue(c, t, 1);
    A.motes(c, t, 80, 'rgba(150,200,255,.5)', 3, 40 + cl * 60);
    // vision courante
    if (this.visK >= 0 && this.visT > 0) { const a = Math.min(smooth(0, 1, 6.5 - this.visT), smooth(0, 1.2, this.visT)); this.drawVision(c, this.visK, a); }
    // le fil (futurs voisins en filigrane)
    c.save(); c.globalCompositeOperation = 'lighter'; c.lineCap = 'round'; c.lineJoin = 'round';
    for (let strand = -2; strand <= 2; strand++) {
      const main = strand === 0;
      c.strokeStyle = main ? `rgba(255,${190 + cl * 50},${110 + cl * 100},.9)` : 'rgba(110,170,255,.22)';
      c.lineWidth = main ? 4 + cl * 3 : 1.6;
      if (main) { c.save(); c.strokeStyle = 'rgba(255,170,90,.22)'; c.lineWidth = 16 + cl * 6; c.beginPath(); for (let x = -10; x <= W + 10; x += 8) { const y = this.thread(x + this.scroll); x < 0 ? c.moveTo(x, y) : c.lineTo(x, y); } c.stroke(); c.restore(); }
      c.beginPath();
      for (let x = -10; x <= W + 10; x += 8) {
        const u = x + this.scroll, y = this.thread(u) + (main ? 0 : strand * (26 + 14 * Math.sin(u * 0.005 + strand)) * (1.3 - cl));
        x < 0 ? c.moveTo(x, y) : c.lineTo(x, y);
      }
      c.stroke();
    }
    c.restore();
    // gouffres
    for (const h of this.hits) {
      c.save(); c.translate(h.x, h.y); c.fillStyle = '#02030a'; c.beginPath();
      for (let i = 0; i < 14; i++) { const a = i / 14 * TAU, r = h.r * (0.75 + 0.35 * Math.sin(a * 3 + t * 2 + h.s) * Math.cos(a * 2 - t)); i ? c.lineTo(Math.cos(a) * r, Math.sin(a) * r) : c.moveTo(Math.cos(a) * r, Math.sin(a) * r); }
      c.closePath(); c.fill(); c.strokeStyle = 'rgba(160,90,255,.5)'; c.lineWidth = 2; c.stroke(); c.restore();
    }
    // traîne et esprit
    this.parts.draw(c, 0, 0, 'lighter');
    c.save(); c.globalCompositeOperation = 'lighter';
    c.strokeStyle = this.on ? 'rgba(255,220,150,.5)' : 'rgba(120,180,255,.4)'; c.lineWidth = 3; c.beginPath(); this.trail.forEach((p, i) => (i ? c.lineTo(p.x - (this.t - p.t) * 200, p.y) : c.moveTo(p.x - (this.t - p.t) * 200, p.y))); c.stroke();
    const g = c.createRadialGradient(this.px, this.py, 0, this.px, this.py, 46); g.addColorStop(0, 'rgba(255,255,255,.95)'); g.addColorStop(0.3, this.on ? 'rgba(255,200,120,.6)' : 'rgba(120,180,255,.6)'); g.addColorStop(1, 'rgba(60,120,255,0)');
    c.fillStyle = g; c.fillRect(this.px - 50, this.py - 50, 100, 100); c.restore();
    // bruit de visions brouillées quand on perd le fil
    if (!this.on) { c.fillStyle = `rgba(120,160,255,${0.05 + 0.05 * Math.random()})`; for (let i = 0; i < 6; i++) c.fillRect(0, Math.random() * H, W, 1 + Math.random() * 3); }
    if (this.flashBad > 0) { c.fillStyle = `rgba(120,40,200,${this.flashBad * 0.3})`; c.fillRect(0, 0, W, H); }
    // HUD
    G.text(c, 'CLARTÉ DES VISIONS', W / 2, 40, { size: 12, ls: 6, align: 'center', color: '#bcd4ff' });
    c.fillStyle = 'rgba(180,210,255,.18)'; c.fillRect(W / 2 - 200, 52, 400, 3);
    c.fillStyle = '#ffd28a'; c.fillRect(W / 2 - 200, 52, 400 * cl, 3);
    VISIONS.forEach((v) => { c.fillStyle = cl >= v[0] ? '#fff' : 'rgba(180,210,255,.4)'; c.fillRect(W / 2 - 200 + 400 * v[0] - 1, 48, 2, 11); });
    if (this.done) { c.fillStyle = `rgba(215,232,255,${smooth(0.2, 3.5, this.done)})`; c.fillRect(0, 0, W, H); }
  },
};
})();
