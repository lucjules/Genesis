/* Dune : Genesis — Chapitre II (Le Grand Erg) et VIII (La Marche aveugle) :
   traverser le désert sans rythme, de roche en roche. */
(function () {
'use strict';
const G = window.G, A = G.art;
const { clamp, smooth, lerp, TAU } = G;

const CFG = {
  erg: {
    pal: 'day', seed: 21, wind: 0.25, lambda: 340, amp: 1.0, blind: false,
    islands: [
      { x: 0, y: 0, r: 160 }, { x: 800, y: -260, r: 140 }, { x: 1650, y: 90, r: 165 }, { x: 2060, y: -150, r: 62 }, { x: 2290, y: 60, r: 66 },
      { x: 2650, y: -400, r: 145 }, { x: 3500, y: -60, r: 240 },
    ],
    path: [0, 1, 2, 5, 6], // îles principales (les petites 3 et 4 sont des abris)
    patrols: [{ cx: 2150, cy: -90, ax: 330, ay: 170, w: 0.5, ph: 0 }, { cx: 2150, cy: -90, ax: 260, ay: 230, w: 0.37, ph: 2.1 }],
    waterDrain: 0.42, music: 'trek', attRate: 1.0,
    grade: { color: '#d27a2c', alpha: 0.1, mode: 'soft-light' },
  },
  blind: {
    pal: 'sonar', seed: 77, wind: 0.1, lambda: 320, amp: 1.1, blind: true,
    islands: [
      { x: 0, y: 0, r: 190 }, { x: 800, y: 130, r: 150 }, { x: 1620, y: -190, r: 160 }, { x: 2450, y: 150, r: 155 },
      { x: 3280, y: -140, r: 165 }, { x: 4100, y: 100, r: 160 }, { x: 4950, y: -40, r: 280 },
    ],
    path: [0, 1, 2, 3, 4, 5, 6], patrols: [], waterDrain: 0, music: 'blind', attRate: 1.15,
    grade: { color: '#2a4a90', alpha: 0.1, mode: 'soft-light' },
  },
};

const STRIDE = 32, WALK = 150, SLOW = 78, SPRINT = 236;

G.scenes.trek = {
  enter(o) {
    this.cfg = CFG[o.id || 'erg']; const cfg = this.cfg;
    this.world = new G.World({ pal: cfg.pal, seed: cfg.seed, wind: cfg.wind, lambda: cfg.lambda, amp: cfg.amp, islands: cfg.islands, sunAlt: cfg.blind ? 0.55 : 0.6 });
    this.blind = cfg.blind;
    if (this.blind) { this.buf = document.createElement('canvas'); this.buf.width = 640; this.buf.height = 360; this.mask = document.createElement('canvas'); this.mask.width = 640; this.mask.height = 360; }
    this.chk = 0; this.water = 100; this.spice = 0; this.left = false; this.vi = 0; this.lowMsg = false;
    this.items = []; this.genItems();
    this.respawn(true);
    G.audio.mood(cfg.music); G.audio.silenceAll(); G.grade = cfg.grade; G.grainAmt = this.blind ? 0.1 : 0.07;
    if (this.blind) { G.say('Les yeux ne servent plus. Écoute le sable : chaque pas, chaque appel l’éclaire un instant.', '', 6); G.say('Espace : sonder le sol · Maj : marche lente · Marche sans rythme.', '', 6); }
    else { G.say('Dame Jessica : « On ne marche jamais en cadence dans le désert. Le ver entend tout. »', '', 6); G.say('ZQSD / flèches · Maj : marche lente · Espace : sprint · Alterne les allures pour briser le rythme.', '', 7); }
  },
  genItems() {
    const r = G.rng(this.cfg.seed * 3 + 1), isl = this.cfg.islands, P = this.cfg.path;
    for (let k = 0; k < P.length - 1; k++) {
      const a = isl[P[k]], b = isl[P[k + 1]];
      // une réserve d'eau au bord de l'île d'arrivée, de l'épice sur le trajet
      if (!this.blind) { const ang = Math.atan2(a.y - b.y, a.x - b.x); this.items.push({ x: b.x + Math.cos(ang) * b.r * 0.35, y: b.y + Math.sin(ang) * b.r * 0.35, t: 'water', on: true }); }
      for (let i = 0; i < 3; i++) {
        const f = 0.25 + i * 0.25 + r() * 0.08, jx = (r() - 0.5) * 160, jy = (r() - 0.5) * 160;
        this.items.push({ x: lerp(a.x, b.x, f) + jx, y: lerp(a.y, b.y, f) + jy, t: 'spice', on: true });
      }
    }
  },
  respawn(first) {
    const a = this.cfg.islands[this.cfg.path[this.chk]];
    this.px = a.x + (first ? 0 : 20); this.py = a.y + (first ? 0 : 20); this.ang = 0; this.walkPh = 0; this.stepAcc = 0;
    this.stepTimes = []; this.att = 0; this.reg = 0; this.t = 0; this.worm = null; this.det = 0; this.state = 'play'; this.endT = 0;
    this.hist = []; this.prints = []; this.rings = []; this.pings = []; this.fremen = null;
    this.camX = this.px - G.W / 2; this.camY = this.py - G.H / 2; this.tremorT = 0; this.spawnedMsg = false; this.warnMsg = 0;
    this.pingCd = 0; this.lastTarget = -1; this.parts = new G.Particles(200);
    if (!first) this.water = Math.max(this.water, 55);
    this.world.warm(this.camX, this.camY, G.W, G.H, 1);
  },
  safe(x, y) { return this.world.rock(x, y) > 0.45; },
  /* --- pas et rythme --- */
  onStep() {
    const onSand = !this.safe(this.px, this.py), t = this.t;
    if (onSand) {
      this.stepTimes.push(t); if (this.stepTimes.length > 9) this.stepTimes.shift();
      G.audio.sfx.step(this.blind ? 0.8 : 1);
      this.prints.push({ x: this.px, y: this.py, a: this.ang, t });
      if (this.prints.length > 90) this.prints.shift();
    } else G.audio.sfx.stepRock(0.9);
    // régularité sur les 5 derniers intervalles
    const a = this.stepTimes, n = a.length;
    if (n >= 4 && onSand) {
      const iv = []; for (let i = Math.max(1, n - 5); i < n; i++) iv.push(a[i] - a[i - 1]);
      const m = iv.reduce((s, v) => s + v, 0) / iv.length;
      const dev = iv.reduce((s, v) => s + Math.abs(v - m), 0) / iv.length / m;
      this.reg = clamp(1 - (dev - 0.05) / 0.3, 0, 1);
    } else this.reg = 0;
    if (onSand) {
      this.rings.push({ x: this.px, y: this.py, t: 0, reg: this.reg });
      if (this.blind) this.pings.push({ x: this.px, y: this.py, t: 0, life: 2.2, R: 190 });
    }
  },
  nextTarget() { for (let k = this.chk + 1; k < this.cfg.path.length; k++) return k; return this.cfg.path.length - 1; },
  update(dt) {
    const cfg = this.cfg, W = G.W, H = G.H;
    this.t += dt; this.parts.update(dt);
    for (const r of this.rings) r.t += dt; this.rings = this.rings.filter((r) => r.t < 1.6);
    for (const p of this.pings) p.t += dt; this.pings = this.pings.filter((p) => p.t < p.life);
    if (this.state === 'arrive') return this.updateArrive(dt);
    // déplacement
    const ax = G.axis(), slow = G.key('ShiftLeft') || G.key('ShiftRight'), sprint = G.key('Space') && !this.blind;
    let moving = ax.len > 0.12;
    const spd = (sprint ? SPRINT : slow ? SLOW : WALK) * (this.water <= 0 ? 0.6 : 1);
    if (moving) {
      this.ang = Math.atan2(ax.y, ax.x); const d = spd * dt * Math.min(1, ax.len * 1.2);
      this.px += Math.cos(this.ang) * d; this.py += Math.sin(this.ang) * d;
      this.walkPh += d * 0.2; this.stepAcc += d;
      while (this.stepAcc >= STRIDE) { this.stepAcc -= STRIDE; this.onStep(); }
    }
    if (this.stepTimes.length && this.t - this.stepTimes[this.stepTimes.length - 1] > 1.5) { this.stepTimes.length = 0; this.reg = 0; }
    const onRock = this.safe(this.px, this.py);
    // sondage (marche aveugle)
    this.pingCd = Math.max(0, this.pingCd - dt);
    if (this.blind && G.anyHit('Space', 'Mouse0') && this.pingCd <= 0) {
      this.pingCd = 1.6; this.pings.push({ x: this.px, y: this.py, t: 0, life: 3.6, R: 620 }); G.audio.sfx.ping(0.8);
      if (!onRock) this.att = Math.min(1.1, this.att + 0.14);
    }
    // attention du ver
    const mult = sprint ? 1.5 : slow ? 0.65 : 1;
    if (!onRock && moving) this.att += ((this.reg * 0.3 * mult * cfg.attRate) - 0.1) * dt;
    else this.att -= (onRock ? 0.3 : 0.07) * dt;
    this.att = clamp(this.att, 0, 1.15);
    if (this.att > 0.5 && !this.worm) {
      this.tremorT -= dt; if (this.tremorT <= 0) { this.tremorT = 1.7; G.audio.sfx.tremor(); G.shake = Math.max(G.shake, 5 + this.att * 8); }
      if (this.warnMsg < 1) { this.warnMsg = 1; G.say('Le sable vibre. Brise ton rythme !', this.blind ? 'Alia' : 'Jessica', 3); }
    }
    if (this.att < 0.3) this.warnMsg = 0;
    if (this.att >= 1 && !this.worm && !onRock) this.spawnWorm();
    this.updateWorm(dt, onRock);
    // eau
    if (cfg.waterDrain) {
      this.water -= (cfg.waterDrain * (sprint ? 5.5 : moving ? 1 : 0.35) * (this.worm ? 1 : 1)) * dt;
      this.water = clamp(this.water, 0, 100);
      if (this.water < 25 && !this.lowMsg) { this.lowMsg = true; G.say('Ta combinaison est presque à sec. Trouve de l’eau.', 'Jessica', 3); }
      if (this.water > 40) this.lowMsg = false;
      if (this.water <= 0 && this.state === 'play') { this.state = 'dead'; this.die('DÉSHYDRATATION', 'Le désert prend toujours son eau. Les Fremen disent : l’eau est la vie, le reste n’est que sable.'); }
    }
    // objets
    for (const it of this.items) if (it.on && Math.hypot(it.x - this.px, it.y - this.py) < 34) {
      it.on = false;
      if (it.t === 'water') { this.water = clamp(this.water + 32, 0, 100); G.audio.sfx.water(); G.say('Réserve d’eau fremen. +32 %', '', 2); }
      else { this.spice++; G.run.spice++; G.audio.sfx.pickup(); this.parts.add({ x: it.x, y: it.y, vx: 0, vy: -30, r0: 6, r1: 26, life: 0.7, color: '#ffb25c', a: 0.5 }); }
    }
    // patrouilles
    if (cfg.patrols.length) {
      let seen = false;
      for (const p of cfg.patrols) {
        const pos = this.patrolPos(p, this.t);
        if (!onRock && Math.hypot(pos.lx - this.px, pos.ly - this.py) < 150) seen = true;
      }
      this.det = clamp(this.det + (seen ? 0.75 : -0.6) * dt, 0, 1.05);
      if (this.det >= 1 && this.state === 'play') { this.state = 'dead'; G.audio.sfx.burst(); this.die('REPÉRÉ', 'Un ornithoptère Harkonnen vous a trouvés. La roche est votre seul abri contre leurs projecteurs.'); }
    }
    // progression
    const isl = cfg.islands;
    for (let k = this.chk + 1; k < cfg.path.length; k++) {
      const I = isl[cfg.path[k]];
      if (Math.hypot(I.x - this.px, I.y - this.py) < I.r * 0.7) {
        this.chk = k; G.audio.sfx.confirm();
        if (k === cfg.path.length - 1) { this.arrive(); }
        else G.say(this.blind ? 'Une pierre froide sous tes pieds. Tu respires.' : 'Un refuge. Reprends ton souffle avant le prochain trajet.', '', 3);
      }
    }
    // caméra
    const tx = this.px + Math.cos(this.ang) * 40 - W / 2, ty = this.py + Math.sin(this.ang) * 40 - H / 2;
    this.camX += (tx - this.camX) * Math.min(1, dt * 3); this.camY += (ty - this.camY) * Math.min(1, dt * 3);
    this.hist.push({ x: this.px, y: this.py, t: this.t }); while (this.hist.length > 120) this.hist.shift();
    G.audio.wormLevel(this.worm ? clamp(1 - (Math.hypot(this.worm.x - this.px, this.worm.y - this.py) - 100) / 800, 0, 1) * 0.9 : this.att > 0.5 ? (this.att - 0.5) * 0.5 : 0);
    if (this.blind && Math.random() < dt * 0.1 && this.t > 6) G.audio.sfx.heart();
    // voix du fond (marche aveugle)
    if (this.blind) this.updateVoices();
  },
  updateVoices() {
    const V = [[8, 'Chani', 'Usul… regarde-moi. Même sans yeux.'], [30, 'Alia', 'Le futur est un mur, Paul. Il n’y a plus de porte.'], [52, 'Stilgar', 'Le désert te connaît, Muad’Dib.'], [80, 'Chani', 'Les enfants auront nos yeux.'], [110, 'Alia', 'Marche. Je veillerai sur eux.']];
    this.vi = this.vi || 0;
    if (this.vi < V.length && this.t > V[this.vi][0]) { const v = V[this.vi++]; G.say(v[2], v[1], 4); G.audio.sfx.vision(); }
  },
  patrolPos(p, t) {
    const x = p.cx + Math.cos(t * p.w + p.ph) * p.ax, y = p.cy + Math.sin(t * p.w * 1.7 + p.ph) * p.ay;
    const vx = -Math.sin(t * p.w + p.ph) * p.ax * p.w, vy = Math.cos(t * p.w * 1.7 + p.ph) * p.ay * p.w * 1.7, a = Math.atan2(vy, vx);
    return { x, y, a, lx: x + Math.cos(a) * 170, ly: y + Math.sin(a) * 170 };
  },
  spawnWorm() {
    const a = Math.random() * TAU;
    this.worm = { x: this.px + Math.cos(a) * 760, y: this.py + Math.sin(a) * 760, ang: a + Math.PI, speed: 170, r: 58, pts: [], state: 'approach', timer: 0, emerge: 0, isl: null, open: 0 };
    this.worm.pts.push({ x: this.worm.x, y: this.worm.y }); this.worm.last = { x: this.worm.x, y: this.worm.y };
    G.say('Shai-Hulud ! Gagne la roche !', this.blind ? 'Alia' : 'Jessica', 3); G.audio.sfx.roar(); G.shake = 18;
  },
  updateWorm(dt, onRock) {
    const w = this.worm; if (!w) return;
    const d = Math.hypot(w.x - this.px, w.y - this.py);
    if (w.state === 'approach') {
      const want = Math.atan2(this.py - w.y, this.px - w.x);
      w.ang += clamp(G.angDiff(w.ang, want), -2.4 * dt, 2.4 * dt);
      w.speed = Math.min(235, w.speed + 24 * dt);
      w.x += Math.cos(w.ang) * w.speed * dt; w.y += Math.sin(w.ang) * w.speed * dt;
      w.emerge = smooth(560, 230, d);
      // bloqué par la roche -> tourne autour
      if (this.world.rock(w.x + Math.cos(w.ang) * 60, w.y + Math.sin(w.ang) * 60) > 0.3 || (onRock && d < 330)) {
        let best = null, bd = 1e9; for (const i of this.cfg.islands) { const dd = Math.hypot(i.x - w.x, i.y - w.y); if (dd < bd) { bd = dd; best = i; } }
        w.state = 'circle'; w.isl = best; w.timer = 0; w.circAng = Math.atan2(w.y - best.y, w.x - best.x);
      }
      if (d < 74 && !onRock) { this.state = 'dead'; G.audio.sfx.roar(); G.flash = 0.8; G.flashColor = '#1a0a05'; this.die('SHAI-HULUD', 'Le sable s’ouvre sous vos pas. Dans le désert, il faut marcher sans rythme.'); }
    } else if (w.state === 'circle') {
      w.timer += dt; const I = w.isl, R = I.r * 1.18 + 120;
      w.circAng += (230 / R) * dt * (Math.random() < 0 ? -1 : 1);
      const tx = I.x + Math.cos(w.circAng) * R, ty = I.y + Math.sin(w.circAng) * R;
      const prevx = w.x, prevy = w.y; w.x += (tx - w.x) * Math.min(1, dt * 3); w.y += (ty - w.y) * Math.min(1, dt * 3);
      w.ang = Math.atan2(w.y - prevy, w.x - prevx); w.emerge = Math.max(0.5, w.emerge - dt * 0.1);
      if (w.timer > 6) { w.state = 'leave'; w.timer = 0; this.att = 0.2; G.say('Il s’éloigne. Pour l’instant.', '', 2.5); }
    } else {
      w.timer += dt; w.speed = 200; w.x += Math.cos(w.ang) * w.speed * dt; w.y += Math.sin(w.ang) * w.speed * dt; w.emerge = Math.max(0, w.emerge - dt * 0.6);
      if (d > 1100) { this.worm = null; return; }
    }
    // corps : historique de la tête
    if (Math.hypot(w.x - w.last.x, w.y - w.last.y) > 15) { w.pts.unshift({ x: w.x, y: w.y }); w.last = { x: w.x, y: w.y }; if (w.pts.length > 40) w.pts.pop(); }
    w.pts[0] = { x: w.x, y: w.y };
    // poussière
    if (Math.random() < 0.9) this.parts.add({ x: w.x + G.rnd(-40, 40), y: w.y + G.rnd(-40, 40), vx: G.rnd(-30, 30), vy: G.rnd(-30, 30), r0: 12, r1: 60, life: G.rnd(0.8, 1.8), color: this.cfg.blind ? '#6f86a8' : '#c88f58', a: 0.3 });
  },
  die(title, text) {
    G.audio.silenceAll();
    G.fail(title, text, () => { this.respawn(false); });
  },
  arrive() {
    this.state = 'arrive'; this.endT = 0; G.audio.silenceAll(); this.worm = null;
    const I = this.cfg.islands[this.cfg.path[this.cfg.path.length - 1]];
    if (!this.blind) {
      this.fremen = [0, 1, 2, 3, 4].map((i) => ({ x: I.x + Math.cos(i * 1.4 + 3) * (I.r * 0.8), y: I.y + Math.sin(i * 1.4 + 3) * (I.r * 0.7), t: i * 0.9, who: i }));
      G.say('Stilgar : « Qui marche ainsi, sans cadence, comme les enfants d’Arrakis ? »', '', 4.2);
      G.say('Jessica : « Nous cherchons refuge, et un peu d’eau. »', '', 3.5);
      G.say('Chani : « Ils ont des yeux d’Ibad. Ils ont bu l’épice. »', '', 3.5);
    } else {
      G.say('Paul : « Le sable se souvient de moi. »', '', 4);
      G.say('Alia : « Je te vois, mon frère. Va. »', '', 3.5);
      G.say('Paul : « Dis aux enfants que je n’ai pas eu peur. »', '', 4);
    }
  },
  updateArrive(dt) {
    this.endT += dt; G.audio.wormLevel(0);
    for (const f of this.fremen || []) f.t += dt;
    if (this.endT > 13 && !this.left) { this.left = true; G.next(); }
  },
  /* --- dessin --- */
  drawWorldLayer(c, camX, camY) {
    const W = G.W, H = G.H, t = G.time, cfg = this.cfg;
    this.world.draw(c, camX, camY, W, H, 1, 3);
    // empreintes
    for (const p of this.prints) { const a = clamp(1 - (this.t - p.t) / 22, 0, 1) * 0.35; if (a <= 0) continue; c.fillStyle = `rgba(30,10,0,${a})`; c.save(); c.translate(p.x - camX, p.y - camY); c.rotate(p.a); c.beginPath(); c.ellipse(0, 0, 6, 3, 0, 0, TAU); c.fill(); c.restore(); }
    // anneaux de pas
    for (const r of this.rings) {
      const k = r.t / 1.6, col = A.mix([246, 220, 174], [255, 90, 50], r.reg);
      c.strokeStyle = A.rgba(col, (1 - k) * (0.12 + 0.4 * r.reg)); c.lineWidth = 2 - k; c.beginPath(); c.arc(r.x - camX, r.y - camY, 8 + k * 120, 0, TAU); c.stroke();
    }
    // objets
    c.save(); c.globalCompositeOperation = 'lighter';
    for (const it of this.items) {
      if (!it.on) continue; const x = it.x - camX, y = it.y - camY; if (x < -40 || x > W + 40 || y < -40 || y > H + 40) continue;
      const pulse = 0.6 + 0.4 * Math.sin(t * 3 + it.x);
      if (it.t === 'spice') {
        const g = c.createRadialGradient(x, y, 0, x, y, 22); g.addColorStop(0, `rgba(255,170,80,${0.55 * pulse})`); g.addColorStop(0.5, `rgba(255,120,40,${0.2 * pulse})`); g.addColorStop(1, 'rgba(255,100,30,0)'); c.fillStyle = g; c.fillRect(x - 24, y - 24, 48, 48);
        c.fillStyle = 'rgba(120,180,255,.85)'; c.fillRect(x - 1, y - 1, 2.2, 2.2);
      } else {
        const g = c.createRadialGradient(x, y, 0, x, y, 30); g.addColorStop(0, `rgba(120,190,255,${0.6 * pulse})`); g.addColorStop(1, 'rgba(60,120,255,0)'); c.fillStyle = g; c.fillRect(x - 32, y - 32, 64, 64);
      }
    }
    c.restore();
    for (const it of this.items) if (it.on && it.t === 'water') { const x = it.x - camX, y = it.y - camY; c.fillStyle = '#12161c'; c.beginPath(); c.ellipse(x, y, 7, 9, 0, 0, TAU); c.fill(); c.strokeStyle = '#8ec3ff'; c.lineWidth = 1.5; c.stroke(); }
    // ver
    const w = this.worm;
    if (w) {
      const e = w.emerge;
      // vague de poussière et ondulation devant la tête
      c.save(); c.globalCompositeOperation = 'source-over';
      for (let i = 0; i < 6; i++) { const k = i / 6; c.strokeStyle = `rgba(40,16,4,${(0.22 - k * 0.2) * (0.4 + e)})`; c.lineWidth = 3; c.beginPath(); c.arc(w.x - camX, w.y - camY, 80 + k * 160 + (t * 80 % 40), 0, TAU); c.stroke(); }
      c.restore();
      const body = { pts: w.pts.slice(0, Math.max(4, Math.round(4 + e * 26))), r: w.r * (0.5 + 0.5 * e), ang: w.ang };
      A.worm(c, body, camX, camY, { open: 0.4 + 0.6 * e, sub: clamp(1 - e * 1.4, 0, 0.9), full: e > 0.7, base: cfg.blind ? [58, 66, 84] : undefined, lit: cfg.blind ? [150, 170, 210] : undefined, sun: this.world.sunAz });
    }
    this.parts.draw(c, camX, camY);
    // patrouilles
    for (const p of cfg.patrols) {
      const pos = this.patrolPos(p, this.t), lx = pos.lx - camX, ly = pos.ly - camY;
      c.save(); c.globalCompositeOperation = 'lighter';
      const g = c.createRadialGradient(lx, ly, 20, lx, ly, 150); g.addColorStop(0, 'rgba(255,240,210,.5)'); g.addColorStop(0.8, 'rgba(255,230,190,.22)'); g.addColorStop(1, 'rgba(255,230,190,0)');
      c.fillStyle = g; c.beginPath(); c.arc(lx, ly, 150, 0, TAU); c.fill(); c.restore();
      c.strokeStyle = 'rgba(255,240,200,.12)'; c.lineWidth = 2; c.beginPath(); c.moveTo(pos.x - camX, pos.y - camY); c.lineTo(lx, ly); c.stroke();
      A.thopter(c, pos.x - camX, pos.y - camY, pos.a, t, { style: 'harkonnen', s: 0.9, light: '#ff4a2a', sx: 24, sy: 34 });
    }
    // Fremen (arrivée)
    if (this.fremen) for (const f of this.fremen) { const a = smooth(0, 1.2, f.t); if (a <= 0) continue; c.save(); c.globalAlpha = a; A.walker(c, f.x - camX, f.y - camY, Math.PI * 0.9, 0, { cloak: [58, 44, 32], suit: [70, 56, 42], s: 1.7 }); c.restore(); }
  },
  draw(c) {
    const W = G.W, H = G.H, t = G.time, camX = this.camX, camY = this.camY;
    if (!this.blind) {
      this.drawWorldLayer(c, camX, camY);
      this.drawChars(c, camX, camY);
      // lumière rasante, poussière
      const g = c.createRadialGradient(W / 2, H / 2, 300, W / 2, H / 2, 800); g.addColorStop(0, 'rgba(255,200,140,0)'); g.addColorStop(1, 'rgba(60,20,4,.28)'); c.fillStyle = g; c.fillRect(0, 0, W, H);
      A.motes(c, t, 40, 'rgba(255,210,160,.25)', 5, 60);
    } else this.drawBlind(c, camX, camY);
    this.drawHud(c);
  },
  drawChars(c, camX, camY) {
    const t = G.time;
    if (!this.blind) {
      // Jessica suit avec un léger retard
      const target = this.hist.length ? this.hist[Math.max(0, this.hist.length - 38)] : { x: this.px, y: this.py };
      const jx = target.x - Math.cos(this.ang) * 14, jy = target.y - Math.sin(this.ang) * 14;
      A.walker(c, jx - camX, jy - camY, this.ang, this.walkPh + 1.2, { cloak: [44, 38, 40], suit: [62, 52, 46], hood: [50, 42, 40], s: 1.55 });
    }
    A.walker(c, this.px - camX, this.py - camY, this.ang, this.walkPh, { cloak: [30, 24, 22], s: 1.7 });
  },
  drawBlind(c, camX, camY) {
    const W = G.W, H = G.H, t = G.time;
    c.fillStyle = '#010208'; c.fillRect(0, 0, W, H);
    const b = this.buf.getContext('2d'), m = this.mask.getContext('2d');
    b.setTransform(0.5, 0, 0, 0.5, 0, 0); b.globalCompositeOperation = 'source-over'; b.globalAlpha = 1;
    this.drawWorldLayer(b, camX, camY);
    m.setTransform(1, 0, 0, 1, 0, 0); m.globalCompositeOperation = 'source-over'; m.clearRect(0, 0, 640, 360); m.setTransform(0.5, 0, 0, 0.5, 0, 0);
    m.globalCompositeOperation = 'lighter';
    // halo constant autour de Paul
    let g = m.createRadialGradient(this.px - camX, this.py - camY, 0, this.px - camX, this.py - camY, 90); g.addColorStop(0, 'rgba(255,255,255,.55)'); g.addColorStop(1, 'rgba(255,255,255,0)'); m.fillStyle = g; m.fillRect(this.px - camX - 100, this.py - camY - 100, 200, 200);
    for (const p of this.pings) {
      const k = p.t / p.life, R = 30 + (p.R) * (1 - Math.pow(1 - clamp(p.t / (p.life * 0.55), 0, 1), 2)), life = 1 - k;
      const outer = R + 90, gg = m.createRadialGradient(p.x - camX, p.y - camY, 0, p.x - camX, p.y - camY, outer);
      gg.addColorStop(0, `rgba(255,255,255,${0.3 * life})`); gg.addColorStop(Math.max(0, (R - 110) / outer), `rgba(255,255,255,${0.32 * life})`); gg.addColorStop(R / outer, `rgba(255,255,255,${life})`); gg.addColorStop(1, 'rgba(255,255,255,0)');
      m.fillStyle = gg; m.fillRect(p.x - camX - outer, p.y - camY - outer, outer * 2, outer * 2);
    }
    b.setTransform(1, 0, 0, 1, 0, 0); b.globalCompositeOperation = 'destination-in'; b.drawImage(this.mask, 0, 0); b.globalCompositeOperation = 'source-over';
    c.imageSmoothingEnabled = true; c.drawImage(this.buf, 0, 0, W, H); c.save(); c.globalCompositeOperation = 'lighter'; c.globalAlpha = 0.6; c.drawImage(this.buf, 0, 0, W, H); c.restore();
    // brume bleutée
    const gr = c.createRadialGradient(W / 2, H / 2, 200, W / 2, H / 2, 760); gr.addColorStop(0, 'rgba(40,70,140,0)'); gr.addColorStop(1, 'rgba(0,0,10,.5)'); c.fillStyle = gr; c.fillRect(0, 0, W, H);
    // Paul : silhouette à peine visible
    c.save(); c.globalAlpha = 0.85; A.walker(c, this.px - camX, this.py - camY, this.ang, this.walkPh, { cloak: [150, 170, 210], suit: [120, 140, 190], hood: [160, 180, 220], eyes: false, s: 1.7 }); c.restore();
    // phosphènes de prescience
    c.fillStyle = 'rgba(160,200,255,.4)';
    const r = G.rng(Math.floor(t * 2)); for (let i = 0; i < 8; i++) c.fillRect(r() * W, r() * H, 2, 2);
  },
  drawHud(c) {
    const W = G.W, H = G.H, t = G.time, cfg = this.cfg;
    let hg = c.createLinearGradient(0, 0, 0, 120); hg.addColorStop(0, 'rgba(10,4,0,.5)'); hg.addColorStop(1, 'rgba(10,4,0,0)'); c.fillStyle = hg; c.fillRect(0, 0, W, 120);
    hg = c.createLinearGradient(0, H - 150, 0, H); hg.addColorStop(0, 'rgba(10,4,0,0)'); hg.addColorStop(1, 'rgba(10,4,0,.5)'); c.fillStyle = hg; c.fillRect(0, H - 150, W, 150);
    // panneaux sombres sous les indicateurs (lisibilité sur le sable clair)
    c.fillStyle = 'rgba(12,5,1,.42)'; c.fillRect(28, 22, 210, cfg.waterDrain ? 74 : 34); c.fillRect(W - 312, 22, 284, 114);
    // eau
    if (cfg.waterDrain) {
      G.text(c, 'EAU', 40, 44, { size: 11, ls: 5, color: '#f3e6cc' });
      c.fillStyle = 'rgba(234,220,196,.18)'; c.fillRect(40, 54, 150, 3);
      c.fillStyle = this.water < 25 ? '#d9553a' : '#a8d4ff'; c.fillRect(40, 54, 150 * this.water / 100, 3);
      G.text(c, 'ÉPICE  ' + this.spice, 40, 82, { size: 11, ls: 5, color: '#d9a05b' });
    } else G.text(c, 'MARCHE AVEUGLE', 40, 44, { size: 11, ls: 5, color: '#8fa6d0' });
    // indicateur du prochain refuge
    if (this.state === 'play') {
      const tgt = cfg.islands[cfg.path[this.nextTarget()]], dx = tgt.x - this.px, dy = tgt.y - this.py, d = Math.hypot(dx, dy);
      const a = Math.atan2(dy, dx), sx = this.px - this.camX, sy = this.py - this.camY;
      if (d > 220) { c.save(); c.translate(sx + Math.cos(a) * 92, sy + Math.sin(a) * 92); c.rotate(a); c.fillStyle = this.blind ? 'rgba(170,200,255,.55)' : 'rgba(246,220,174,.6)'; c.beginPath(); c.moveTo(9, 0); c.lineTo(-5, -6); c.lineTo(-2, 0); c.lineTo(-5, 6); c.closePath(); c.fill(); c.restore(); }
      G.text(c, (this.blind ? 'LA DUNE LOINTAINE' : 'PROCHAIN REFUGE') + '  ' + Math.round(d / 10) + ' M', W / 2, 40, { size: 11, ls: 5, align: 'center', color: this.blind ? '#8fa6d0' : '#f3e6cc' });
    }
    // rythme
    const bx = W - 300, by = 78, att = this.att;
    G.text(c, this.worm ? 'SHAI-HULUD APPROCHE' : 'ÉCOUTE DU DÉSERT', bx, by - 20, { size: 11, ls: 5, color: this.worm || att > 0.7 ? '#ff7a55' : '#f3e6cc' });
    c.fillStyle = 'rgba(234,220,196,.16)'; c.fillRect(bx, by - 10, 260, 3);
    const col = A.mix([246, 220, 174], [255, 80, 46], clamp(att * 1.3, 0, 1));
    c.fillStyle = A.rgba(col); c.fillRect(bx, by - 10, 260 * clamp(att, 0, 1), 3);
    // écho des pas : 6 dernières secondes
    c.fillStyle = 'rgba(0,0,0,.25)'; c.fillRect(bx, by, 260, 34);
    c.strokeStyle = 'rgba(234,220,196,.1)'; c.strokeRect(bx + 0.5, by + 0.5, 259, 33);
    for (const st of this.stepTimes) { const age = this.t - st; if (age > 6) continue; const x = bx + 258 - age / 6 * 256; c.fillStyle = A.rgba(col, 1 - age / 7); c.fillRect(x, by + 6, 2, 22); }
    G.text(c, this.reg > 0.55 ? 'RYTHME RÉGULIER' : 'RYTHME BRISÉ', bx + 260, by + 50, { size: 10, ls: 4, align: 'right', color: this.reg > 0.55 ? '#ff7a55' : '#9fb59a' });
    // détection patrouille
    if (this.det > 0.02) { c.fillStyle = 'rgba(255,80,60,.8)'; c.fillRect(W / 2 - 80, 62, 160 * clamp(this.det, 0, 1), 2); G.text(c, 'DÉTECTION', W / 2, 78, { size: 10, ls: 5, align: 'center', color: '#ff7a55' }); }
    if (this.att > 0.5 && !this.worm) { c.fillStyle = `rgba(255,60,30,${(this.att - 0.5) * 0.18 * (0.6 + 0.4 * Math.sin(t * 8))})`; c.fillRect(0, 0, W, H); }
    if (this.state === 'arrive') { const a = smooth(9, 12.5, this.endT); c.fillStyle = `rgba(0,0,0,${a})`; c.fillRect(0, 0, W, H); }
  },
  exit() { G.audio.silenceAll(); },
};
})();
