/* Dune : Genesis — Chapitre I : la fuite en ornithoptère dans la tempête */
(function () {
'use strict';
const G = window.G, A = G.art;
const { clamp, smooth, lerp, TAU } = G;
const LEN = 21000, ZM = 0.7;

G.scenes.thopter = {
  enter() {
    this.world = new G.World({ pal: 'day', seed: 5, wind: 0.0, lambda: 330, amp: 1.0, sunTurn: 0.55 });
    this.chk = 0; this.sunDir = this.world.sunAz;
    this.reset(0);
    G.audio.mood('storm'); G.grade = { color: '#c8782c', alpha: 0.12, mode: 'soft-light' };
    G.say('ZQSD / flèches pour piloter · Espace pour pousser les ailes (esquive)', '', 6);
  },
  reset(chk) {
    this.camX = chk * LEN; this.ox = 380; this.oy = 360; this.rvx = 0; this.rvy = 0;
    this.k = 0.3; this.t = 0; this.hull = 4; this.inv = 0; this.dashT = 0; this.dashCd = 0; this.state = 'fly'; this.ct = 0; this.done = false; this.boomed = false;
    this.parts = new G.Particles(300); this.flash = 0; this.msgIdx = 0; this.spawned = chk * LEN;
    this.spires = []; this.enemies = [];
    this.genTo(this.camX + 2600);
    for (let i = 0; i < 3; i++) this.enemies.push({ y: 300 + i * 60, ty: 300, ph: 'move', pt: 1 + i * 1.3, aimY: 0, fireT: 0, hitDone: false, i });
    this.ang = 0; this.crashY = 0; this.spin = 0;
    G.clearSubs(); this.world.warm(this.camX / ZM, 0, G.W, G.H, ZM);
    this.lines = [[0.01, 'Jessica', 'Droit dans la tempête, Paul. Ils n’oseront pas nous suivre.'], [0.12, 'Paul', 'Ils sont derrière nous. Plusieurs appareils.'], [0.26, 'Jessica', 'Reste bas. Le vent sera ton allié.'], [0.42, 'Paul', 'Les pointes rocheuses… je les devine à peine.'], [0.58, 'Jessica', 'Ne pense pas. Écoute les ailes.'], [0.74, 'Paul', 'Les ailes vibrent trop. Elles ne tiendront pas.'], [0.9, 'Jessica', 'Tiens bon, Paul. Encore un peu.']];
    this.lines = this.lines.filter((l) => l[0] * LEN >= this.camX - 1);
  },
  genTo(x1) {
    const r = G.rng(1234 + Math.floor(this.spawned / 1000));
    while (this.spawned < x1) {
      const p = this.spawned / LEN;
      this.spawned += (560 - 240 * p) * (0.7 + r() * 0.8);
      const n = 1 + (r() < 0.35 + p * 0.3 ? 1 : 0);
      for (let k = 0; k < n; k++) this.spires.push({ x: this.spawned + k * 120, y: 70 + r() * 580, r: 34 + r() * 36, seed: Math.floor(r() * 1e6) });
    }
  },
  hurt(src) {
    if (this.inv > 0 || this.dashT > 0 || this.state !== 'fly') return;
    this.hull--; this.inv = 1.4; G.shake = 26; this.flash = 0.6; G.audio.sfx.hit();
    for (let i = 0; i < 14; i++) this.parts.add({ x: this.camX + this.ox, y: this.oy, vx: G.rnd(-120, 80), vy: G.rnd(-100, 100), r0: 3, r1: 9, life: G.rnd(0.5, 1.1), color: '#ffb066', a: 0.8 });
    if (src === 'rock') this.rvx = -150;
    if (this.hull <= 0) {
      this.state = 'dead'; G.audio.thopter(0); G.audio.sfx.explosion(0.8);
      G.fail("L'ORNITHOPTÈRE S'EST BRISÉ", 'Le vent et les Sardaukar ont eu raison de la coque. Le désert n’attend pas.', () => { const c = this.camX / LEN; this.reset(c < 0.33 ? 0 : c < 0.66 ? 0.33 : 0.66); G.audio.thopter(0.7); });
    }
  },
  update(dt) {
    const W = G.W, H = G.H, prog = clamp(this.camX / LEN, 0, 1), k = this.k = 0.3 + 0.7 * smooth(0, 1, prog);
    this.parts.update(dt); this.flash = Math.max(0, this.flash - dt * 1.5);
    if (this.state === 'dead') return;
    this.t += dt;
    if (this.state === 'crash') return this.updateCrash(dt);
    G.audio.thopter(0.55 + this.dashT); G.audio.windBoost(k * 0.7);
    const ax = G.axis();
    this.inv = Math.max(0, this.inv - dt); this.dashT = Math.max(0, this.dashT - dt); this.dashCd = Math.max(0, this.dashCd - dt);
    if (this.dashCd <= 0 && G.anyHit('Space', 'ShiftLeft', 'Mouse0')) { this.dashT = 0.55; this.dashCd = 3.2; G.audio.sfx.dash(); G.shake = 8; }
    const dashing = this.dashT > 0;
    const tvy = ax.y * 330 * (dashing ? 0.35 : 1), tvx = ax.x * 170;
    this.rvx += (tvx - this.rvx) * Math.min(1, dt * 5); this.rvy += (tvy - this.rvy) * Math.min(1, dt * 5);
    const gust = Math.sin(this.t * 0.9 + 1) * 55 + Math.sin(this.t * 2.3) * 30 * k + (G.vnoise(this.t * 1.3, 3, 4) - 0.5) * 150 * k;
    this.oy = clamp(this.oy + (this.rvy + gust) * dt, 64, H - 64); this.ox = clamp(this.ox + this.rvx * dt, 150, 760);
    const speed = (dashing ? 600 : 270 + 40 * k);
    this.camX += speed * dt;
    this.ang += (clamp((this.rvy + gust) / 700, -0.4, 0.4) - this.ang) * Math.min(1, dt * 6);
    this.genTo(this.camX + 2600);
    while (this.spires.length && this.spires[0].x < this.camX - 300) this.spires.shift();
    // collisions rochers
    const px = this.camX + this.ox;
    for (const s of this.spires) if (Math.abs(s.x - px) < s.r + 40 && Math.hypot(s.x - px, s.y - this.oy) < s.r * 0.8 + 18) this.hurt('rock');
    // poursuivants
    const nEn = 1 + (prog > 0.28 ? 1 : 0) + (prog > 0.6 ? 1 : 0);
    this.enemies.forEach((e, idx) => {
      e.active = idx < nEn; if (!e.active) return;
      e.pt -= dt;
      if (e.ph === 'move') {
        e.ty = clamp(this.oy + Math.sin(this.t * 0.6 + idx * 2) * 90, 70, H - 70);
        e.y += clamp(e.ty - e.y, -1, 1) * (110 + 60 * k) * dt;
        if (e.pt <= 0) { e.ph = 'aim'; e.pt = 1.0; e.aimY = e.y; e.hitDone = false; G.audio.sfx.telegraph(); }
      } else if (e.ph === 'aim') {
        if (e.pt > 0.45) { e.aimY = e.y = lerp(e.y, this.oy, dt * 1.6); }
        if (e.pt <= 0) { e.ph = 'fire'; e.pt = 0.16; G.audio.sfx.burst(); G.shake = Math.max(G.shake, 5); }
      } else if (e.ph === 'fire') {
        if (!e.hitDone && Math.abs(this.oy - e.aimY) < 24) { e.hitDone = true; this.hurt('shot'); }
        if (e.pt <= 0) { e.ph = 'move'; e.pt = 1.5 + Math.random() * 1.3 - k * 0.5; }
      }
    });
    // particules : sable soulevé
    if (Math.random() < 0.9) this.parts.add({ x: px - 28, y: this.oy + G.rnd(-4, 4), vx: -speed * 0.5 + G.rnd(-40, 20), vy: G.rnd(-30, 30), r0: 3, r1: G.rnd(10, 20), life: G.rnd(0.6, 1.2), color: '#d8a468', a: 0.28 });
    // dialogues
    while (this.lines.length && prog >= this.lines[0][0]) { const l = this.lines.shift(); G.say(l[2], l[1], 4); }
    // fin
    if (this.camX >= LEN) {
      this.state = 'crash'; this.ct = 0; this.crashStart = { ox: this.ox, oy: this.oy };
      G.say('Le vent arrache les ailes…', '', 3); G.audio.sfx.warn();
    }
  },
  updateCrash(dt) {
    this.ct += dt; this.camX += 220 * Math.max(0.2, 1 - this.ct / 3.2) * dt;
    this.spin += dt * (2 + this.ct * 3); this.ox += 60 * dt; this.oy += Math.sin(this.ct * 3) * 40 * dt;
    G.shake = 6 + this.ct * 8;
    if (this.ct > 3.3 && !this.boomed) { this.boomed = true; G.flash = 1; G.flashColor = '#e9b070'; G.audio.sfx.explosion(1); G.audio.thopter(0); G.audio.windBoost(0.3);
      for (let i = 0; i < 60; i++) this.parts.add({ x: this.camX + this.ox, y: this.oy, vx: G.rnd(-300, 300), vy: G.rnd(-300, 300), r0: 8, r1: 46, life: G.rnd(1, 2.2), color: '#c28850', a: 0.55 }); }
    if (this.ct > 5.2 && !this.done) { this.done = true; G.next(); }
  },
  draw(c) {
    const W = G.W, H = G.H, t = G.time, camX = this.camX;
    this.world.draw(c, camX / ZM, (H / 2) * (1 / ZM - 1) * 0 , W, H, ZM, 1);
    // ombre des nuages de poussière / voile
    for (const s of this.spires) {
      const sx = s.x - camX; if (sx < -200 || sx > W + 300) continue;
      const vis = clamp(1.25 - (sx - 260) / (1050 - 520 * this.k), 0, 1);
      if (vis <= 0.02) continue;
      c.save(); c.globalAlpha = vis; A.spire(c, sx, s.y, s.r, s.seed, this.sunDir); c.restore();
    }
    // traînée
    this.parts.draw(c, camX, 0);
    // poursuivants
    this.enemies.forEach((e, idx) => {
      if (!e.active) return;
      const ex = Math.max(70, this.ox - 270 - idx * 70) + Math.sin(t * 1.3 + idx) * 14;
      if (e.ph === 'aim' || e.ph === 'fire') {
        const on = e.ph === 'fire';
        c.save(); c.globalCompositeOperation = 'lighter';
        if (on) { c.strokeStyle = 'rgba(255,230,190,.95)'; c.lineWidth = 6; c.shadowColor = '#ff9040'; c.shadowBlur = 24; }
        else { const f = Math.sin(t * 40) > 0 ? 0.55 : 0.18; c.strokeStyle = `rgba(255,70,50,${f})`; c.lineWidth = 2; }
        c.beginPath(); c.moveTo(ex + 40, e.aimY); c.lineTo(W + 40, e.aimY); c.stroke(); c.restore();
      }
      A.thopter(c, ex, e.y, 0.05 * Math.sin(t * 2 + idx), t + idx, { style: 'harkonnen', s: 1.0, light: '#ff4a2a', sx: 20, sy: 30 });
    });
    // joueur
    if (this.state !== 'dead') {
      const blink = this.inv > 0 && Math.floor(t * 18) % 2 === 0;
      if (!blink) {
        if (this.state === 'crash') {
          const k = clamp(this.ct / 3.3, 0, 1);
          A.thopter(c, this.ox, this.oy + k * 120, this.spin, t, { style: 'atreides', s: 1.15 - k * 0.5, sx: 20 + k * 60, sy: 26 + k * 40 });
        } else {
          if (this.dashT > 0) { c.save(); c.globalCompositeOperation = 'lighter'; for (let i = 1; i < 6; i++) { c.globalAlpha = 0.14 * (6 - i) / 6; A.thopter(c, this.ox - i * 26, this.oy, this.ang, t - i * 0.01, { s: 1.15, shadow: false }); } c.restore(); }
          A.thopter(c, this.ox, this.oy, this.ang, t, { style: 'atreides', s: 1.15, light: '#ffcf8a', sx: 18, sy: 28 });
        }
      }
    }
    // tempête
    A.cloud(c, t, this.k * 1.7, [176, 108, 62]);
    c.fillStyle = `rgba(110,60,26,${0.06 + 0.3 * this.k * this.k})`; c.fillRect(0, 0, W, H);
    const rg = c.createRadialGradient(this.ox, this.oy, 260, this.ox, this.oy, 820 - 240 * this.k);
    rg.addColorStop(0, 'rgba(80,40,16,0)'); rg.addColorStop(1, `rgba(80,40,16,${0.15 + 0.7 * this.k * this.k})`); c.fillStyle = rg; c.fillRect(0, 0, W, H);
    if (this.flash > 0) { c.fillStyle = `rgba(255,70,40,${this.flash * 0.35})`; c.fillRect(0, 0, W, H); }
    this.drawHud(c);
  },
  drawHud(c) {
    const W = G.W, H = G.H, prog = clamp(this.camX / LEN, 0, 1);
    // progression
    c.fillStyle = 'rgba(234,220,196,.25)'; c.fillRect(W / 2 - 220, 38, 440, 2);
    c.fillStyle = '#d9a05b'; c.fillRect(W / 2 - 220, 38, 440 * prog, 2);
    c.fillStyle = '#f1dcb8'; c.beginPath(); c.arc(W / 2 - 220 + 440 * prog, 39, 4, 0, TAU); c.fill();
    G.text(c, 'TEMPÊTE', W / 2 - 220, 28, { size: 10, ls: 5, color: '#c9b894' });
    G.text(c, 'ABRI', W / 2 + 220, 28, { size: 10, ls: 5, align: 'right', color: '#c9b894' });
    // coque
    G.text(c, 'COQUE', 40, 44, { size: 11, ls: 5, color: '#c9b894' });
    for (let i = 0; i < 4; i++) { c.fillStyle = i < this.hull ? '#e8d2ad' : 'rgba(234,220,196,.15)'; c.save(); c.translate(48 + i * 26, 62); c.rotate(Math.PI / 4); c.fillRect(-7, -7, 14, 14); c.restore(); }
    // élan
    G.text(c, 'ÉLAN', 40, H - 46, { size: 11, ls: 5, color: '#c9b894' });
    c.fillStyle = 'rgba(234,220,196,.18)'; c.fillRect(40, H - 34, 120, 3);
    c.fillStyle = this.dashCd <= 0 ? '#f6dcae' : '#a8825a'; c.fillRect(40, H - 34, 120 * (1 - this.dashCd / 3.2), 3);
  },
  exit() { G.audio.thopter(0); G.audio.windBoost(0); },
};
})();
