/* Dune : Genesis — Chapitres III & V : chevaucher Shai-Hulud */
(function () {
'use strict';
const G = window.G, A = G.art;
const { clamp, smooth, lerp, TAU } = G;

const RCFG = {
  harvest: { pal: 'day', seed: 33, wind: 0.15, lambda: 420, amp: 1.0, targets: 3, thop: 2, turrets: 0, allies: 0, music: 'ride', mount: true, label: 'MOISSONNEUSES', name: 'une moissonneuse' },
  arrakeen: { pal: 'dusk', seed: 51, wind: 0.5, lambda: 400, amp: 1.1, targets: 5, thop: 4, turrets: 6, allies: 3, music: 'battle', mount: false, label: 'TRANSPORTS IMPÉRIAUX', name: 'un transport impérial' },
};

/* ver : chaîne de points suiveurs */
function makeWorm(x, y, ang, r, n) {
  const sp = r * 0.36, w = { x, y, ang, speed: 240, r, n, sp, av: 0, pts: [] };
  for (let i = 0; i < n; i++) w.pts.push({ x: x - Math.cos(ang) * i * sp, y: y - Math.sin(ang) * i * sp });
  return w;
}
function stepWorm(w, dt) {
  w.x += Math.cos(w.ang) * w.speed * dt; w.y += Math.sin(w.ang) * w.speed * dt;
  const p = w.pts; p[0].x = w.x; p[0].y = w.y;
  for (let i = 1; i < p.length; i++) {
    const dx = p[i].x - p[i - 1].x, dy = p[i].y - p[i - 1].y, d = Math.hypot(dx, dy) || 1;
    if (d > w.sp) { p[i].x = p[i - 1].x + dx * w.sp / d; p[i].y = p[i - 1].y + dy * w.sp / d; }
  }
}

G.scenes.ride = {
  enter(o) {
    this.cfg = RCFG[o.id || 'harvest']; this.id = o.id || 'harvest';
    this.world = new G.World({ pal: this.cfg.pal, seed: this.cfg.seed, wind: this.cfg.wind, lambda: this.cfg.lambda, amp: this.cfg.amp });
    this.destroyed = 0; this.setup();
    G.audio.mood(this.cfg.music); G.audio.silenceAll(); G.grade = this.cfg.pal === 'day' ? { color: '#d27a2c', alpha: 0.12, mode: 'soft-light' } : { color: '#c04a28', alpha: 0.16, mode: 'soft-light' };
  },
  setup() {
    const cfg = this.cfg, R = G.rng(cfg.seed + 9);
    this.t = 0; this.hp = 5; this.inv = 0; this.dive = 0; this.diveCd = 0; this.win = 0; this.left = false; this.canHook = false; this.near = null;
    this.parts = new G.Particles(500); this.smoke = new G.Particles(300);
    this.bullets = []; this.thops = []; this.thopCd = 4; this.blasts = [];
    this.harv = []; this.landers = []; this.turrets = []; this.carry = []; this.allies = [];
    this.px = 0; this.py = 0; this.pang = 0; this.walkPh = 0; this.thump = null;
    if (cfg.mount) {
      this.state = 'thump'; this.worm = null;
      G.say('Stilgar : « Plante le marteleur, Usul. Le Faiseur viendra à toi. »', '', 5);
      G.say('E : planter le marteleur · puis, quand le ver passe, Espace pour t’accrocher à son flanc.', '', 6);
      const T = [[1500, -260], [2600, 700], [1300, 1800]];
      T.forEach((p, i) => this.harv.push({ x: p[0], y: p[1], ang: 0.5 + i * 0.4, st: 'work', at: 0, carry: null, i }));
    } else {
      this.state = 'ride'; this.worm = makeWorm(0, 0, 0, 62, 42); this.worm.speed = 260; this.px = 0; this.py = 0;
      const pos = [[1300, -300], [2200, 400], [3100, -250], [3900, 450], [4700, -100]];
      pos.forEach((p, i) => this.landers.push({ x: p[0], y: p[1], ang: (R() - 0.5) * 0.8, alive: true, alert: false }));
      for (let i = 0; i < cfg.turrets; i++) { const l = this.landers[i % this.landers.length]; this.turrets.push({ x: l.x + (R() - 0.5) * 700, y: l.y + (R() - 0.5) * 600, alive: true, cd: 2 + R() * 3, st: 'idle', tt: 0, tx: 0, ty: 0 }); }
      for (let i = 0; i < cfg.allies; i++) { const a = makeWorm(-300 - i * 120, (i - 1) * 260, 0, 54, 38); a.speed = 235; a.mode = 'follow'; a.off = (i - 1) * 260; this.allies.push(a); }
      G.say('Paul : « Fedaykin ! Les Atréides vous regardent ! »', '', 4);
      G.say('Chevauche Shai-Hulud droit sur les transports impériaux. Plonge (Espace) sous les tirs.', '', 6);
      this.rubble = [];
      const wr = G.rng(5); for (let i = 0; i < 18; i++) { const y = -1000 + i * 118; if (Math.abs(y) < 170) continue; this.rubble.push({ x: -420 + wr() * 70, y, r: 62 + wr() * 34, seed: Math.floor(wr() * 1e6) }); }
    }
    this.camX = this.px - G.W / 2; this.camY = this.py - G.H / 2;
    this.world.warm(this.camX, this.camY, G.W, G.H, 1);
  },
  riderPos() { const w = this.worm; return w ? w.pts[Math.min(3, w.pts.length - 1)] : { x: this.px, y: this.py }; },
  /* ---------- mise à jour ---------- */
  update(dt) {
    this.t += dt; this.parts.update(dt); this.smoke.update(dt);
    this.inv = Math.max(0, this.inv - dt); this.diveCd = Math.max(0, this.diveCd - dt);
    if (this.state === 'thump') this.updateThump(dt);
    else if (this.state === 'mount') this.updateMount(dt);
    else this.updateRide(dt);
    // caméra
    let fx, fy;
    if (this.state === 'thump') { fx = this.px; fy = this.py; }
    else if (this.state === 'mount') { const dx = this.worm.x - this.px, dy = this.worm.y - this.py, dd = Math.hypot(dx, dy) || 1, kk = Math.min(1, 420 / dd) * 0.5; fx = this.px + dx * kk; fy = this.py + dy * kk; }
    else { fx = this.worm.x + Math.cos(this.worm.ang) * 140; fy = this.worm.y + Math.sin(this.worm.ang) * 140; }
    const k = Math.min(1, dt * 3.2);
    this.camX += (fx - G.W / 2 - this.camX) * k; this.camY += (fy - G.H / 2 - this.camY) * k;
  },
  updateThump(dt) {
    const ax = G.axis();
    if (!this.thump) {
      if (ax.len > 0.1) { this.pang = Math.atan2(ax.y, ax.x); this.px += ax.x * 120 * dt; this.py += ax.y * 120 * dt; this.walkPh += 0.4; }
      if (G.hit('KeyE') || G.hit('Mouse0')) {
        this.thump = { x: this.px, y: this.py, t: 0 }; G.audio.sfx.confirm(); G.say('Le marteleur bat. Quelque chose, très loin, répond.', '', 4);
        const a = -0.5 + Math.random() * 0.6 + Math.PI; // vient de l'ouest
        this.worm = makeWorm(this.px + Math.cos(a) * 1300, this.py + Math.sin(a) * 1300, a + Math.PI, 62, 42); this.worm.speed = 200; this.state = 'mount'; this.mt = 0; G.audio.sfx.roar();
      }
    }
  },
  updateMount(dt) {
    const w = this.worm, th = this.thump; this.mt += dt; th.t += dt;
    if (Math.floor(th.t * 1.2) !== Math.floor((th.t - dt) * 1.2)) { G.audio.sfx.tremor(); G.shake = Math.max(G.shake, 7); }
    const ax = G.axis();
    if (ax.len > 0.1) { this.pang = Math.atan2(ax.y, ax.x); this.px += ax.x * 130 * dt; this.py += ax.y * 130 * dt; this.walkPh += 0.4; }
    // le ver vise le marteleur, puis continue tout droit
    const d = Math.hypot(th.x - w.x, th.y - w.y);
    if (!w.passed) { const want = Math.atan2(th.y - w.y, th.x - w.x); w.ang += clamp(G.angDiff(w.ang, want), -1.6 * dt, 1.6 * dt); if (d < 130) w.passed = true; }
    w.speed = 200; stepWorm(w, dt);
    this.dust(w, dt, 0.5);
    G.audio.wormLevel(clamp(1 - (Math.hypot(w.x - this.px, w.y - this.py) - 150) / 900, 0.1, 1));
    // repousse le joueur devant la tête (il ne se fait pas manger dans cette phase)
    const hd = Math.hypot(w.x - this.px, w.y - this.py);
    if (hd < 110) { this.px += (this.px - w.x) / hd * 160 * dt * 2; this.py += (this.py - w.y) / hd * 160 * dt * 2; }
    // accroche
    this.near = null; let bd = 1e9;
    for (let i = 3; i < w.pts.length; i++) { const dd = Math.hypot(w.pts[i].x - this.px, w.pts[i].y - this.py); if (dd < bd) { bd = dd; this.near = w.pts[i]; } }
    this.canHook = bd < 100;
    if (this.canHook && G.anyHit('Space', 'KeyE', 'Mouse0')) { this.mountNow(); return; }
    if (hd > 1700 && w.passed) { // manqué : le ver revient
      const a = Math.random() * TAU; this.worm = makeWorm(this.px + Math.cos(a) * 1200, this.py + Math.sin(a) * 1200, a + Math.PI, 62, 42); this.worm.speed = 200;
      G.say('Le Faiseur revient. Place-toi près de son flanc.', '', 3.5);
    }
  },
  mountNow() {
    const w = this.worm; this.thump = null; this.state = 'ride'; w.speed = 245; w.passed = true; this.flashT = 1; G.audio.sfx.surface(); G.shake = 20; G.flash = 0.5; G.flashColor = '#f6dcae';
    G.say('Paul : « Les crochets… maintenant ! »', '', 3); G.say('Chani : « Tu le tiens, Usul. Il est à toi. »', '', 4);
    G.say('Guide Shai-Hulud droit sur les moissonneuses. Plonge (Espace) pour esquiver les tirs.', '', 6);
  },
  dust(w, dt, k) {
    for (let i = 0; i < w.pts.length; i += 2) if (Math.random() < 5 * dt * k) {
      const p = w.pts[i], a = Math.random() * TAU;
      this.smoke.add({ x: p.x + Math.cos(a) * w.r * 0.7, y: p.y + Math.sin(a) * w.r * 0.7, vx: Math.cos(a) * 40, vy: Math.sin(a) * 40, r0: 14, r1: 54 + Math.random() * 30, life: 1 + Math.random(), color: this.cfg.pal === 'dusk' ? '#a86a4c' : '#d09a62', a: 0.28 });
    }
  },
  explode(x, y, big) {
    G.audio.sfx.explosion(big ? 1 : 0.7); G.shake = Math.max(G.shake, big ? 28 : 16);
    for (let i = 0; i < 26; i++) { const a = Math.random() * TAU, s = G.rnd(40, 330); this.parts.add({ x, y, vx: Math.cos(a) * s, vy: Math.sin(a) * s, r0: 10, r1: G.rnd(26, 70), life: G.rnd(0.5, 1.3), color: Math.random() < 0.5 ? '#ffb050' : '#ff6a28', a: 0.8, drag: 0.15 }); }
    for (let i = 0; i < 20; i++) { const a = Math.random() * TAU, s = G.rnd(20, 180); this.smoke.add({ x, y, vx: Math.cos(a) * s, vy: Math.sin(a) * s - 20, r0: 18, r1: G.rnd(50, 110), life: G.rnd(1.5, 3.2), color: '#2b2118', a: 0.5, drag: 0.4 }); }
  },
  hurt(msg) {
    if (this.inv > 0 || this.dive > 0 || this.state !== 'ride' || this.win) return;
    this.hp--; this.inv = 1.3; G.shake = 30; G.flash = 0.45; G.flashColor = '#ff3a20'; G.audio.sfx.hit();
    if (this.hp <= 0) {
      this.state = 'dead'; G.audio.silenceAll();
      G.fail('TU ES TOMBÉ', 'Les crochets ont cédé sous les tirs. Shai-Hulud ne pardonne pas aux cavaliers hésitants.', () => { const d = this.destroyed; const keepH = this.harv.map((h) => ({ st: h.st })), keepL = this.landers.map((l) => l.alive), keepT = this.turrets.map((u) => u.alive); this.setupKeep(d, keepH, keepL, keepT); });
    }
    void msg;
  },
  setupKeep(d, keepH, keepL, keepT) {
    G.clearSubs(); this.setup(); this.destroyed = d; this.thump = null;
    // on reprend directement sur le ver, objectifs déjà détruits conservés
    if (this.cfg.mount) {
      this.state = 'ride'; const w = makeWorm(this.px, this.py, 0.3, 62, 42); w.speed = 245; this.worm = w; this.hist = null;
      this.harv = this.harv.filter((h, i) => !(keepH[i] && keepH[i].st === 'dead'));
    } else {
      this.landers.forEach((l, i) => { if (keepL[i] === false) l.alive = false; }); this.turrets.forEach((u, i) => { if (keepT[i] === false) u.alive = false; });
    }
    this.state = 'ride'; this.camX = this.worm.x - G.W / 2; this.camY = this.worm.y - G.H / 2;
  },
  updateRide(dt) {
    const w = this.worm, cfg = this.cfg;
    if (this.state === 'dead') return;
    const ax = G.axis();
    if (!this.win) {
      let tgt = 255 - ax.y * 90; if (this.dive > 0) tgt *= 1.15;
      w.speed += (tgt - w.speed) * Math.min(1, dt * 1.5);
      w.av += (ax.x * 1.25 - w.av) * Math.min(1, dt * 2.6); w.ang += w.av * dt * clamp(w.speed / 255, 0.6, 1.1);
      if (this.diveCd <= 0 && G.anyHit('Space', 'ShiftLeft', 'Mouse0')) { this.dive = 1.4; this.diveCd = 5.2; G.audio.sfx.dive(); G.shake = 12; }
    } else w.speed += (120 - w.speed) * Math.min(1, dt);
    this.dive = Math.max(0, this.dive - dt);
    stepWorm(w, dt); this.dust(w, dt, 1); G.audio.wormLevel(0.8);
    const head = { x: w.x, y: w.y }, rp = this.riderPos();
    // sable éjecté à l'avant
    if (Math.random() < 0.7) this.smoke.add({ x: head.x + Math.cos(w.ang) * 40, y: head.y + Math.sin(w.ang) * 40 + G.rnd(-30, 30), vx: Math.cos(w.ang) * 90 + G.rnd(-50, 50), vy: G.rnd(-50, 50), r0: 10, r1: 40, life: 0.9, color: '#d9a566', a: 0.3 });
    this.walkPh += 0.3;
    // moissonneuses
    for (const h of this.harv) {
      if (h.st === 'dead' || h.st === 'gone') continue;
      const d = Math.hypot(h.x - head.x, h.y - head.y);
      if (h.st === 'work') { h.x += Math.cos(h.ang) * 34 * dt; h.y += Math.sin(h.ang) * 34 * dt; if (d < 760) { h.st = 'alert'; h.at = 0; G.say('Un transporteur approche. Elle va être évacuée ! Fonce !', 'Stilgar', 3); G.audio.sfx.warn(); this.carry.push({ h, x: h.x + Math.cos(h.ang + 2.5) * 1000, y: h.y + Math.sin(h.ang + 2.5) * 1000, ang: h.ang - 0.6, st: 'in' }); } }
      else if (h.st === 'alert') {
        h.at += dt;
      }
      if (this.dive <= 0 && !this.win && d < 112) { h.st = 'dead'; this.destroyed++; this.explode(h.x, h.y, true); G.say(`Moissonneuse détruite — ${this.destroyed}/${cfg.targets}`, '', 2.4); for (const c of this.carry) if (c.h === h) c.st = 'flee'; }
    }
    for (const c of this.carry) {
      const h = c.h;
      if (c.st === 'in') { const dx = h.x - c.x, dy = h.y - c.y, d = Math.hypot(dx, dy); c.ang = Math.atan2(dy, dx); c.x += dx / d * 240 * dt; c.y += dy / d * 240 * dt; if (d < 20) c.st = 'lift'; c.lift = 0; }
      else if (c.st === 'lift') { c.lift += dt / 10; c.x = h.x; c.y = h.y; c.ang += 0.3 * dt; if (c.lift >= 1) { c.st = 'away'; h.st = 'gone'; G.say('La moissonneuse a été évacuée. Une autre arrive…', 'Stilgar', 3); this.spawnHarvester(); } }
      else if (c.st === 'away') { c.x += Math.cos(c.ang) * 280 * dt; c.y += Math.sin(c.ang) * 280 * dt; }
      else if (c.st === 'flee') { c.x += Math.cos(c.ang + 2.4) * 260 * dt; c.y += Math.sin(c.ang + 2.4) * 260 * dt; }
    }
    this.carry = this.carry.filter((c) => Math.hypot(c.x - head.x, c.y - head.y) < 2600);
    // transports impériaux, tourelles
    for (const l of this.landers) {
      if (!l.alive) continue; const d = Math.hypot(l.x - head.x, l.y - head.y); l.alert = d < 900;
      if (this.dive <= 0 && !this.win && d < 125) { l.alive = false; this.destroyed++; this.explode(l.x, l.y, true); G.say(`Transport détruit — ${this.destroyed}/${cfg.targets}`, '', 2.4); }
    }
    for (const u of this.turrets) {
      if (!u.alive) continue; const d = Math.hypot(u.x - head.x, u.y - head.y);
      if (u.st === 'idle') { u.cd -= dt; if (u.cd <= 0 && d < 950) { u.st = 'tele'; u.tt = 1.25; u.tx = head.x + Math.cos(w.ang) * w.speed * 1.0; u.ty = head.y + Math.sin(w.ang) * w.speed * 1.0; G.audio.sfx.telegraph(); } }
      else { u.tt -= dt; if (u.tt <= 0) { u.st = 'idle'; u.cd = 2.6 + Math.random() * 1.8; this.blasts.push({ x: u.tx, y: u.ty, t: 0 }); this.explode(u.tx, u.ty, false); if (Math.hypot(u.tx - rp.x, u.ty - rp.y) < 120) this.hurt(); } }
      if (this.dive <= 0 && !this.win && d < 90) { u.alive = false; this.explode(u.x, u.y, false); }
    }
    // alliés
    for (const a of this.allies) this.updateAlly(a, dt, head);
    // escorte aérienne
    this.thopCd -= dt;
    if (this.thopCd <= 0 && !this.win && this.thops.filter((t) => t.alive).length < cfg.thop) {
      this.thopCd = 6; const a = Math.random() * TAU;
      this.thops.push({ x: head.x + Math.cos(a) * 1000, y: head.y + Math.sin(a) * 1000, ang: a + Math.PI, th: a, dir: Math.random() < 0.5 ? 1 : -1, R: 330 + Math.random() * 120, st: 'orbit', cd: 2.5 + Math.random() * 2, tt: 0, alive: true, life: 40, aim: null, volley: 0 });
    }
    for (const th of this.thops) {
      if (!th.alive) continue; th.life -= dt; if (th.life <= 0 || this.win) { th.ang += 0.5 * dt; th.x += Math.cos(th.ang) * 300 * dt; th.y += Math.sin(th.ang) * 300 * dt; if (Math.hypot(th.x - head.x, th.y - head.y) > 1600) th.alive = false; continue; }
      th.th += th.dir * 0.6 * dt; const gx = head.x + Math.cos(th.th) * th.R, gy = head.y + Math.sin(th.th) * th.R;
      const dx = gx - th.x, dy = gy - th.y, dd = Math.hypot(dx, dy) || 1, sp = Math.min(dd * 3, 330);
      th.x += dx / dd * sp * dt; th.y += dy / dd * sp * dt; th.ang = Math.atan2(dy, dx);
      if (th.st === 'orbit') { th.cd -= dt; if (th.cd <= 0) { th.st = 'aim'; th.tt = 0.85; const lead = 0.85; th.aim = { x: head.x + Math.cos(w.ang) * w.speed * lead, y: head.y + Math.sin(w.ang) * w.speed * lead }; G.audio.sfx.telegraph(); } }
      else if (th.st === 'aim') { th.tt -= dt; th.ang = Math.atan2(th.aim.y - th.y, th.aim.x - th.x); if (th.tt <= 0) { th.st = 'fire'; th.volley = 5; th.tt = 0; } }
      else if (th.st === 'fire') { th.tt -= dt; th.ang = Math.atan2(th.aim.y - th.y, th.aim.x - th.x); if (th.tt <= 0 && th.volley > 0) { th.volley--; th.tt = 0.09; const a = th.ang + G.rnd(-0.03, 0.03); this.bullets.push({ x: th.x, y: th.y, vx: Math.cos(a) * 620, vy: Math.sin(a) * 620, life: 2 }); G.audio.sfx.shot(); } if (th.volley <= 0) { th.st = 'orbit'; th.cd = 2.8 + Math.random() * 1.6; } }
    }
    for (const b of this.bullets) { b.x += b.vx * dt; b.y += b.vy * dt; b.life -= dt; if (b.life > 0 && Math.hypot(b.x - rp.x, b.y - rp.y) < 42) { b.life = 0; this.hurt(); } }
    this.bullets = this.bullets.filter((b) => b.life > 0);
    // victoire
    if (this.destroyed >= cfg.targets && !this.win) {
      this.win = 0.001; G.audio.sfx.boom();
      G.say(this.cfg.mount ? 'Chani : « Ils t’appellent Muad’Dib. Ils ne te suivent plus : ils te croient. »' : 'Paul : « Arrakeen est à nous. »', '', 5);
    }
    if (this.win) { this.win += dt; if (this.win > 6 && !this.left) { this.left = true; G.audio.silenceAll(); G.next(); } }
  },
  spawnHarvester() {
    const w = this.worm, a = Math.random() * TAU;
    this.harv.push({ x: w.x + Math.cos(a) * 1500, y: w.y + Math.sin(a) * 1500, ang: a + 2.5, st: 'work', at: 0, carry: null });
  },
  updateAlly(a, dt, head) {
    // cible : escorte, puis tourelles
    let tx, ty;
    const tur = this.turrets.filter((u) => u.alive);
    if (a.mode === 'follow' && this.t > 12 && tur.length) a.mode = 'hunt';
    if (a.mode === 'hunt') {
      if (!a.tgt || !a.tgt.alive) a.tgt = tur.length ? tur.reduce((b, u) => (Math.hypot(u.x - a.x, u.y - a.y) < Math.hypot(b.x - a.x, b.y - a.y) ? u : b)) : null;
      if (!a.tgt) a.mode = 'follow'; else { tx = a.tgt.x; ty = a.tgt.y; if (Math.hypot(tx - a.x, ty - a.y) < 70) { a.tgt.alive = false; this.explode(tx, ty, false); } }
    }
    if (a.mode === 'follow') { const hx = head.x + Math.cos(this.worm.ang) * 200, hy = head.y + Math.sin(this.worm.ang) * 200; tx = hx + Math.cos(this.worm.ang + Math.PI / 2) * a.off; ty = hy + Math.sin(this.worm.ang + Math.PI / 2) * a.off; }
    const want = Math.atan2(ty - a.y, tx - a.x); a.ang += clamp(G.angDiff(a.ang, want), -1.1 * dt, 1.1 * dt);
    a.speed = a.mode === 'follow' ? clamp(this.worm.speed + Math.hypot(tx - a.x, ty - a.y) * 0.4 - 40, 200, 340) : 270;
    stepWorm(a, dt); this.dust(a, dt, 0.8);
  },
  /* ---------- dessin ---------- */
  draw(c) {
    const W = G.W, H = G.H, t = G.time, camX = this.camX, camY = this.camY, cfg = this.cfg;
    this.world.draw(c, camX, camY, W, H, 1, 3);
    // mur-bouclier éventré
    if (this.rubble) {
      for (const r of this.rubble) { const x = r.x - camX, y = r.y - camY; if (x < -200 || x > W + 200 || y < -200 || y > H + 200) continue; A.spire(c, x, y, r.r, r.seed, this.world.sunAz); }
      c.save(); c.globalCompositeOperation = 'lighter';
      for (let i = 0; i < 6; i++) { const x = -330 - camX + Math.sin(t * 1.3 + i) * 8, y = (i < 3 ? -200 - i * 120 : 200 + (i - 3) * 120) - camY; const g = c.createRadialGradient(x, y, 0, x, y, 90); g.addColorStop(0, 'rgba(255,150,60,.55)'); g.addColorStop(1, 'rgba(255,80,20,0)'); c.fillStyle = g; c.fillRect(x - 90, y - 90, 180, 180); }
      c.restore();
    }
    // cibles
    for (const h of this.harv) if (h.st === 'work' || h.st === 'alert') A.harvester(c, h.x - camX, h.y - camY, h.ang, t, { alert: h.st === 'alert' });
    for (const l of this.landers) if (l.alive) A.lander(c, l.x - camX, l.y - camY, l.ang, { alert: l.alert });
    for (const u of this.turrets) if (u.alive) {
      A.tank(c, u.x - camX, u.y - camY, 0.4);
      if (u.st === 'tele') { const k = 1 - u.tt / 1.25, x = u.tx - camX, y = u.ty - camY; c.strokeStyle = `rgba(255,80,50,${0.4 + 0.4 * Math.sin(t * 25)})`; c.lineWidth = 3; c.beginPath(); c.arc(x, y, 120, 0, TAU); c.stroke(); c.beginPath(); c.arc(x, y, 120 * k, 0, TAU); c.stroke(); }
    }
    this.smoke.draw(c, camX, camY);
    // marteleur
    if (this.thump) { const th = this.thump, x = th.x - camX, y = th.y - camY; c.fillStyle = '#1b1713'; c.fillRect(x - 5, y - 7, 10, 14); c.fillStyle = '#d9a05b'; c.fillRect(x - 2, y - 3, 4, 6); for (let i = 0; i < 3; i++) { const k = ((th.t * 1.2 + i / 3) % 1); c.strokeStyle = `rgba(255,210,150,${0.45 * (1 - k)})`; c.lineWidth = 2; c.beginPath(); c.arc(x, y, 10 + k * 140, 0, TAU); c.stroke(); } }
    // vers alliés puis ver du joueur
    for (const a of this.allies) { A.worm(c, a, camX, camY, { open: 0.7, sun: this.world.sunAz }); const rp = a.pts[3]; A.walker(c, rp.x - camX, rp.y - camY, a.ang, 0, { cloak: [58, 44, 32], s: 1.5 }); }
    if (this.worm) {
      const w = this.worm;
      A.worm(c, w, camX, camY, { open: 0.6 + 0.2 * Math.sin(t * 3), sub: this.dive > 0 ? Math.min(1, this.dive * 2, (1.4 - this.dive) * 5 + 0.2) * 0.9 : 0, sun: this.world.sunAz });
      if (this.state === 'ride' || this.state === 'dead') {
        const rp = this.riderPos(); const blink = this.inv > 0 && Math.floor(t * 16) % 2 === 0;
        if (!blink && this.dive <= 0) A.walker(c, rp.x - camX, rp.y - camY, w.ang, this.walkPh * 0.2, { cloak: [30, 24, 22], s: 1.9 });
      }
    }
    if (this.state === 'thump' || this.state === 'mount') {
      A.walker(c, this.px - camX, this.py - camY, this.pang, this.walkPh, { cloak: [30, 24, 22], s: 1.9 });
      if (this.state === 'mount' && this.canHook && this.near) { const x = this.near.x - camX, y = this.near.y - camY; c.strokeStyle = `rgba(255,230,180,${0.6 + 0.4 * Math.sin(t * 10)})`; c.lineWidth = 3; c.beginPath(); c.arc(x, y, 34, 0, TAU); c.stroke(); G.text(c, 'ESPACE — S’ACCROCHER', x, y - 52, { size: 13, ls: 5, align: 'center', color: '#ffe6bc' }); }
    }
    // porteurs
    for (const cr of this.carry) {
      const sx = cr.x - camX, sy = cr.y - camY;
      c.save(); c.fillStyle = 'rgba(0,0,0,.25)'; c.translate(sx + 40, sy + 60); c.scale(1.4, 0.4); c.beginPath(); c.arc(0, 0, 80, 0, TAU); c.fill(); c.restore();
      A.carryall(c, sx, sy - (cr.lift || 0) * 20, cr.ang, t * 1.0, { s: 1.5 });
      if (cr.st === 'lift') { const h = cr.h; c.strokeStyle = 'rgba(40,30,20,.7)'; c.lineWidth = 2; for (const o of [[-40, -20], [40, -20], [-40, 20], [40, 20]]) { c.beginPath(); c.moveTo(sx + o[0], sy + o[1]); c.lineTo(h.x - camX + o[0] * 0.8, h.y - camY + o[1] * 0.8); c.stroke(); } G.text(c, 'ÉVACUATION ' + Math.round(cr.lift * 100) + ' %', sx, sy - 90, { size: 12, ls: 5, align: 'center', color: '#ff8a62' }); }
    }
    // escorte, projectiles
    for (const th of this.thops) {
      if (!th.alive) continue;
      if (th.st === 'aim' || th.st === 'fire') { c.save(); c.strokeStyle = th.st === 'aim' ? `rgba(255,70,50,${Math.sin(t * 40) > 0 ? 0.7 : 0.25})` : 'rgba(255,230,190,.5)'; c.lineWidth = th.st === 'aim' ? 2 : 3; c.beginPath(); c.moveTo(th.x - camX, th.y - camY); c.lineTo(th.x - camX + Math.cos(th.ang) * 1500, th.y - camY + Math.sin(th.ang) * 1500); c.stroke(); c.restore(); }
      A.thopter(c, th.x - camX, th.y - camY, th.ang, t + th.th, { style: 'harkonnen', s: 1.4, light: '#ff4a2a', sx: 26, sy: 40 });
    }
    c.save(); c.globalCompositeOperation = 'lighter'; c.lineCap = 'round';
    for (const b of this.bullets) { c.strokeStyle = 'rgba(255,220,160,.95)'; c.lineWidth = 4; c.shadowColor = '#ff9040'; c.shadowBlur = 14; c.beginPath(); c.moveTo(b.x - camX, b.y - camY); c.lineTo(b.x - camX - b.vx * 0.045, b.y - camY - b.vy * 0.045); c.stroke(); }
    c.restore();
    c.save(); c.globalCompositeOperation = 'lighter'; this.parts.draw(c, camX, camY); c.restore();
    // ambiance
    const g = c.createRadialGradient(W / 2, H / 2, 320, W / 2, H / 2, 820); g.addColorStop(0, 'rgba(0,0,0,0)'); g.addColorStop(1, cfg.pal === 'dusk' ? 'rgba(30,6,6,.45)' : 'rgba(60,20,4,.3)'); c.fillStyle = g; c.fillRect(0, 0, W, H);
    this.drawHud(c);
  },
  drawHud(c) {
    const W = G.W, H = G.H, cfg = this.cfg;
    let hg = c.createLinearGradient(0, 0, 0, 120); hg.addColorStop(0, 'rgba(10,4,0,.5)'); hg.addColorStop(1, 'rgba(10,4,0,0)'); c.fillStyle = hg; c.fillRect(0, 0, W, 120);
    hg = c.createLinearGradient(0, H - 130, 0, H); hg.addColorStop(0, 'rgba(10,4,0,0)'); hg.addColorStop(1, 'rgba(10,4,0,.5)'); c.fillStyle = hg; c.fillRect(0, H - 130, W, 130);
    if (this.state === 'ride' || this.state === 'dead') {
      G.text(c, 'COHÉSION', 40, 44, { size: 12, ls: 5, color: '#f0e0c0' });
      for (let i = 0; i < 5; i++) { c.fillStyle = i < this.hp ? '#f1dcb8' : 'rgba(234,220,196,.2)'; c.save(); c.translate(48 + i * 26, 64); c.rotate(Math.PI / 4); c.fillRect(-7, -7, 14, 14); c.restore(); }
      G.text(c, cfg.label + '  ' + this.destroyed + ' / ' + cfg.targets, W / 2, 44, { size: 13, ls: 6, align: 'center', color: '#f0e0c0' });
      G.text(c, 'PLONGÉE', 40, H - 46, { size: 12, ls: 5, color: '#f0e0c0' });
      c.fillStyle = 'rgba(234,220,196,.2)'; c.fillRect(40, H - 34, 130, 3); c.fillStyle = this.diveCd <= 0 ? '#f6dcae' : '#a8825a'; c.fillRect(40, H - 34, 130 * (1 - this.diveCd / 5.2), 3);
      // flèche vers la cible la plus proche
      const w = this.worm; let best = null, bd = 1e9;
      const cand = [...this.harv.filter((h) => h.st === 'work' || h.st === 'alert'), ...this.landers.filter((l) => l.alive)];
      for (const o of cand) { const d = Math.hypot(o.x - w.x, o.y - w.y); if (d < bd) { bd = d; best = o; } }
      if (best) {
        const sx = best.x - this.camX, sy = best.y - this.camY, off = sx < 60 || sx > W - 60 || sy < 60 || sy > H - 60;
        if (off) { const a = Math.atan2(sy - H / 2, sx - W / 2), r = Math.min((W / 2 - 50) / Math.abs(Math.cos(a) || 1e-6), (H / 2 - 50) / Math.abs(Math.sin(a) || 1e-6)); c.save(); c.translate(W / 2 + Math.cos(a) * r, H / 2 + Math.sin(a) * r); c.rotate(a); c.fillStyle = 'rgba(255,230,190,.85)'; c.beginPath(); c.moveTo(14, 0); c.lineTo(-8, -9); c.lineTo(-3, 0); c.lineTo(-8, 9); c.closePath(); c.fill(); c.restore(); G.text(c, Math.round(bd / 10) + ' M', W / 2 + Math.cos(a) * (r - 34), H / 2 + Math.sin(a) * (r - 34) + 4, { size: 11, ls: 3, align: 'center', color: '#ffe6bc' }); }
      }
    }
    if (this.win) { c.fillStyle = `rgba(0,0,0,${smooth(3.5, 6, this.win)})`; c.fillRect(0, 0, W, H); }
  },
  exit() { G.audio.silenceAll(); },
};
})();
