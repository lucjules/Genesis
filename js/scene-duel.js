/* Dune : Genesis — Chapitre VI : le duel contre Feyd-Rautha.
   Règle des boucliers : le fer rapide rebondit (il fatigue l'adversaire), seule la lame lente pénètre. */
(function () {
'use strict';
const G = window.G, A = G.art;
const { clamp, smooth, lerp, TAU } = G;
const FLOOR = 575, FH = 270, REACH = { quick: 150, slow: 165, spike: 120 };

function mk(x, face, hp) { return { x, face, hp, max: hp, bal: 0, act: null, stag: 0, inv: 0, dodgeCd: 0, blocking: false, blockT: 0, shield: 0, kick: 0, flash: 0, fall: 0 }; }

G.scenes.duel = {
  enter() {
    this.reset();
    G.audio.mood('duel'); G.audio.silenceAll(); G.grade = { color: '#c8782c', alpha: 0.12, mode: 'soft-light' }; G.barsTarget = 0;
    G.say('Le bouclier repousse le fer rapide. Épuise ton adversaire (J), puis perce-le avec la lame lente (Espace, maintenir).', '', 8);
    G.say('S : garde (une parade au dernier instant désarme l’adversaire) · Maj : esquive.', '', 6);
  },
  reset() {
    this.p = mk(430, 1, 3); this.f = mk(850, -1, 4); this.t = 0; this.hitstop = 0; this.slowmo = 0; this.end = 0; this.parts = new G.Particles(200);
    this.ai = { t: 1.4, mode: 'idle', mv: 0, react: 0, combo: 0 }; this.msg = null; this.over = false; this.left = false; this.said = false;
    this.crowd = ['stilgar', 'irulan', 'alia', 'chani', 'scytale', 'edric'];
  },
  /* --- résolution d'une frappe --- */
  strike(att, def, kind) {
    const dx = Math.abs(att.x - def.x); const isP = att === this.p;
    if (dx > REACH[kind]) { G.audio.sfx.swing(); return; }
    if (def.inv > 0) { this.fx(def, 'ESQUIVE', '#9fb7d8'); return; }
    if (kind === 'quick' || kind === 'spike') {
      if (def.blocking && def.blockT < (kind === 'spike' ? 0.22 : 0.17)) {   // parade parfaite
        att.stag = 1.15; att.act = null; def.bal = Math.max(0, def.bal - 18); def.flash = 1; G.audio.sfx.clash(); G.shake = 14; this.spark(def.x + def.face * 40, FLOOR - 140);
        this.fx(def, 'PARADE', '#ffe6bc'); return;
      }
      if (kind === 'quick') {
        if (def.blocking) { def.bal += 5; def.kick = def.face * -26; G.audio.sfx.clash(); this.spark(def.x + def.face * 36, FLOOR - 140); return; }
        if (def.act && def.act.k === 'slow' && def.act.phase === 'charge') { def.act = null; def.bal += 26; def.stag = 0.5; G.audio.sfx.shield(); this.fx(def, 'INTERROMPU', '#ffd28a'); G.audio.charge(0); }
        else { def.bal += isP ? 24 : 20; G.audio.sfx.shield(); }
        def.shield = 1; def.kick = -def.face * 34; this.spark(def.x + def.face * 30, FLOOR - 150);
        if (def.bal >= 100) { def.bal = 0; def.stag = isP ? 1.7 : 1.3; def.act = null; this.fx(def, isP ? 'OUVERTURE !' : 'DÉSÉQUILIBRÉ', isP ? '#ffd28a' : '#ff8a70'); G.audio.sfx.warn(); }
        return;
      }
    }
    // lame lente / dard : pénètre le bouclier
    def.hp--; def.act = null; def.stag = 1.1; def.shield = 1; def.flash = 1; def.bal = 0; def.blocking = false;
    this.hitstop = 0.16; this.slowmo = 0.7; G.audio.sfx.stab(); G.shake = 32; G.flash = 0.35; G.flashColor = isP ? '#ffe0b0' : '#ff7a50'; G.audio.charge(0);
    for (let i = 0; i < 18; i++) this.parts.add({ x: def.x, y: FLOOR - 150, vx: G.rnd(-260, 260) , vy: G.rnd(-300, 80), r0: 3, r1: 1, life: G.rnd(0.4, 0.9), color: isP ? '#ffe0b0' : '#ff7a50', a: 0.9, g: 500 });
    this.fx(def, def === this.f ? 'LE BOUCLIER CÈDE' : 'TOUCHÉ', '#ffd28a');
    if (def.hp <= 0) { this.over = true; this.endWho = def; this.end = 0.001; def.fall = 0.001; this.slowmo = 3; G.audio.thopter(0); }
  },
  fx(who, text, col) { this.msg = { text, col, t: 0, x: who.x }; },
  spark(x, y) { for (let i = 0; i < 10; i++) this.parts.add({ x, y, vx: G.rnd(-240, 240), vy: G.rnd(-240, 120), r0: 2.4, r1: 0.5, life: G.rnd(0.2, 0.5), color: '#fff2d0', a: 1, g: 400 }); },
  /* --- joueur et IA partagent la mécanique --- */
  fighter(f, o, dt, c) {
    f.stag = Math.max(0, f.stag - dt); f.inv = Math.max(0, f.inv - dt); f.dodgeCd = Math.max(0, f.dodgeCd - dt); f.shield = Math.max(0, f.shield - dt * 2.2); f.flash = Math.max(0, f.flash - dt * 2.5);
    f.bal = Math.max(0, f.bal - 5 * dt); f.kick *= Math.pow(0.0005, dt); f.x += f.kick * dt * 6;
    f.face = o.x > f.x ? 1 : -1;
    if (f.fall) { f.fall += dt; return; }
    if (f.stag > 0) { f.act = null; f.blocking = false; f.blockT = 0; return; }
    const a = f.act;
    f.blocking = false;
    if (a) {
      a.t += dt;
      if (a.k === 'quick') {
        if (!a.hit && a.t >= a.wind) { a.hit = true; this.strike(f, o, 'quick'); }
        if (a.t >= a.wind + a.rec) f.act = null;
      } else if (a.k === 'spike') {
        if (!a.hit && a.t >= a.wind) { a.hit = true; this.strike(f, o, 'spike'); }
        if (a.t >= a.wind + a.rec) f.act = null;
      } else if (a.k === 'slow') {
        if (a.phase === 'charge') {
          const hold = c.slowHeld !== undefined ? c.slowHeld : true;
          a.p = Math.min(1, a.t / a.T);
          if (!hold) { f.act = null; f.stag = 0.12; G.audio.charge(0); }
          else if (a.p >= 1) { a.phase = 'rec'; a.t = 0; this.strike(f, o, 'slow'); G.audio.charge(0); }
          else if (f === this.p) G.audio.charge(a.p);
        } else if (a.t >= a.rec) f.act = null;
      } else if (a.k === 'dodge') {
        f.x += a.dir * (a.t < a.dur * 0.7 ? 400 : 120) * dt * (1 - a.t / a.dur); f.inv = a.t < a.dur * 0.7 ? 0.05 : 0;
        if (a.t >= a.dur) f.act = null;
      }
      return;
    }
    // libre : déplacement / garde / nouvelles actions
    if (c.block) { f.blocking = true; f.blockT += dt; } else f.blockT = 0;
    if (!f.blocking && c.mx) f.x += c.mx * 215 * dt * (f.stag > 0 ? 0 : 1);
    if (c.dodge && f.dodgeCd <= 0) { f.act = { k: 'dodge', t: 0, dur: 0.34, dir: -f.face }; f.inv = 0.22; f.dodgeCd = 0.8; G.audio.sfx.dash(); return; }
    if (c.quick && !f.blocking) { f.act = { k: 'quick', t: 0, wind: c.wind || 0.13, rec: c.rec || 0.27 }; G.audio.sfx.swing(); return; }
    if (c.slowPress && !f.blocking) { f.act = { k: 'slow', t: 0, T: c.T || 0.85, p: 0, phase: 'charge', rec: 0.55 }; return; }
    if (c.spike) { f.act = { k: 'spike', t: 0, wind: 0.8, rec: 0.5 }; G.audio.sfx.telegraph(); return; }
  },
  updateAI(dt) {
    const f = this.f, p = this.p, ai = this.ai, dist = Math.abs(f.x - p.x);
    const c = { mx: 0 };
    if (f.act || f.stag > 0 || f.fall) { if (f.act && f.act.k === 'slow') c.slowHeld = true; return c; }
    ai.t -= dt;
    // réactions
    ai.react -= dt;
    if (ai.react <= 0) {
      ai.react = 0.22;
      if (p.act && p.act.k === 'slow' && p.act.phase === 'charge' && p.act.p > 0.35 && dist < 220 && f.dodgeCd <= 0 && Math.random() < 0.55) { c.dodge = true; ai.t = 0.5; return c; }
      if (p.act && p.act.k === 'slow' && p.act.phase === 'charge' && dist < 160 && Math.random() < 0.4) { c.quick = true; c.wind = 0.2; c.rec = 0.3; ai.t = 0.6; return c; }   // il tente de t'interrompre
    }
    if (ai.mode === 'block') { c.block = true; if (ai.t <= 0) ai.mode = 'idle'; return c; }
    if (ai.mode === 'retreat') { c.mx = -f.face; if (ai.t <= 0 || dist > 330) ai.mode = 'idle'; return c; }
    if (dist > 138) { c.mx = f.face; return c; }
    if (dist < 100) { c.mx = -f.face * 0.6; }
    if (ai.t <= 0) {
      const r = Math.random(), phase2 = f.hp <= 2;
      ai.t = 0.7 + Math.random() * 0.9 - (phase2 ? 0.2 : 0);
      if (ai.combo > 0) { ai.combo--; c.quick = true; c.wind = 0.3; c.rec = 0.22; ai.t = 0.1; }
      else if (r < 0.42) { c.quick = true; c.wind = 0.4; c.rec = 0.3; }
      else if (r < 0.58) { c.quick = true; c.wind = 0.34; c.rec = 0.22; ai.combo = 1 + (phase2 ? 1 : 0); }
      else if (r < 0.72) { c.slowPress = true; c.T = 0.95; c.slowHeld = true; ai.t = 1.2; }
      else if (r < 0.8 && phase2 && dist < 135) { c.spike = true; ai.t = 1.4; }
      else if (r < 0.9) { ai.mode = 'retreat'; ai.t = 0.8; }
      else { ai.mode = 'block'; ai.t = 0.7; }
    }
    return c;
  },
  update(dt) {
    this.t += dt; this.parts.update(dt);
    if (this.msg) { this.msg.t += dt; if (this.msg.t > 1.4) this.msg = null; }
    if (this.hitstop > 0) { this.hitstop -= dt; return; }
    let sdt = dt; if (this.slowmo > 0) { this.slowmo -= dt; sdt = dt * 0.28; }
    const p = this.p, f = this.f;
    const ax = G.axis();
    const pc = { mx: ax.x, quick: G.anyHit('KeyJ', 'Mouse0', 'KeyK'), slowPress: G.hit('Space'), slowHeld: G.key('Space'), block: G.key('KeyS') || G.key('ArrowDown') || ax.y > 0.55, dodge: G.anyHit('ShiftLeft', 'ShiftRight') };
    if (!this.over) {
      this.fighter(p, f, sdt, pc); const ac = this.updateAI(sdt); this.fighter(f, p, sdt, ac);
      // collisions entre combattants
      const gap = 84; if (Math.abs(p.x - f.x) < gap) { const m = (p.x + f.x) / 2; if (p.x < f.x) { p.x = m - gap / 2; f.x = m + gap / 2; } else { p.x = m + gap / 2; f.x = m - gap / 2; } }
      p.x = clamp(p.x, 150, 1130); f.x = clamp(f.x, 150, 1130);
      if (p.x > f.x - 80 && p.x < f.x) p.x = f.x - 80;
    } else {
      this.fighter(this.p, this.f, sdt, { mx: 0 }); this.fighter(this.f, this.p, sdt, { mx: 0 });
      this.end += dt;
      if (this.end > 1 && !this.said) {
        this.said = true;
        if (this.endWho === f) { G.say('Feyd-Rautha s’effondre. Le silence tombe sur la salle du trône.', '', 4); G.say('Paul : « C’est fini. Le fief d’Arrakis est à moi. »', '', 4); }
        else G.fail('LE DUEL EST PERDU', 'La lame lente de Feyd-Rautha a traversé votre bouclier. Attendez l’ouverture, puis frappez sans hâte.', () => { this.said = false; this.reset(); });
      }
      if (this.endWho === f && this.end > 9 && !this.left) { this.left = true; G.audio.silenceAll(); G.next(); }
    }
    G.audio.windBoost(0);
  },
  /* --- dessin --- */
  pose(f, isP, t) {
    const a = f.act, base = { arm: 0.75, arm2: -0.15, bladeLen: 0.2, lean: 0, stride: 0.5, cape: 0.2 + 0.15 * Math.sin(t * 2), crouch: 0.0, ext: 1 };
    if (f.fall) { base.lean = -1.6; base.arm = 1.3; base.arm2 = 1.0; base.bladeLen = 0.1; return base; }
    if (f.stag > 0) { base.lean = -1.4; base.arm = 1.1; base.arm2 = 0.9; base.bladeLen = 0.1; base.cape = 0.6; base.stride = 0.9; return base; }
    if (f.blocking) { base.arm = -0.15; base.arm2 = -1.3; base.bladeLen = 0.24; base.crouch = 0.03; return base; }
    if (a) {
      if (a.k === 'quick') { const w = a.t < a.wind; const k = w ? a.t / a.wind : 1; if (w) { base.arm = lerp(0.75, -1.0, k); base.arm2 = lerp(-0.15, -1.7, k); base.lean = -0.5 * k; } else { const r = (a.t - a.wind) / a.rec; base.arm = lerp(0.2, 0.75, r); base.arm2 = lerp(0.1, -0.15, r); base.lean = 1.2 * (1 - r); base.bladeLen = 0.24; } }
      else if (a.k === 'spike') { const k = clamp(a.t / a.wind, 0, 1); base.crouch = 0.1 * k; base.arm = lerp(0.75, 1.1, k); base.arm2 = lerp(-0.15, 0.4, k); base.bladeLen = 0.12; base.glow = k; base.lean = 0.3 * k; if (a.t >= a.wind) { base.arm = 0.4; base.arm2 = 0.0; base.bladeLen = 0.22; base.lean = 1.3; } }
      else if (a.k === 'slow') { const k = a.phase === 'charge' ? a.p : 1; base.arm = lerp(0.8, 0.3, k); base.arm2 = lerp(-0.1, 0.0, k); base.ext = lerp(1, 1.4, k); base.bladeLen = lerp(0.2, 0.3, k); base.glow = a.phase === 'charge' ? k : 0; base.lean = 0.9 * k; base.crouch = 0.04 * k; }
      else if (a.k === 'dodge') { const k = a.t / a.dur; base.lean = -1.5 * Math.sin(k * Math.PI); base.crouch = 0.08 * Math.sin(k * Math.PI); base.stride = 1.1; }
    }
    void isP; return base;
  },
  draw(c) {
    const W = G.W, H = G.H, t = G.time;
    A.hall(c, t, { light: [255, 168, 96], wall: [30, 20, 16], floor: [20, 12, 9], beams: 5, y: FLOOR });
    // assistance : silhouettes sombres dans les travées
    this.crowd.forEach((k, i) => { const x = i < 3 ? 70 + i * 62 : W - 70 - (i - 3) * 62; A.person(c, x, FLOOR - 12 + (i % 2) * 6, 190 - (i % 3) * 8, k, t, { lit: 0.22, rim: [255, 150, 90] }); });
    // trône impérial (suggéré)
    c.fillStyle = 'rgba(8,5,4,.85)'; c.fillRect(W / 2 - 150, 250, 300, 24); c.fillRect(W / 2 - 100, 160, 200, 90); c.fillStyle = 'rgba(255,170,100,.12)'; c.fillRect(W / 2 - 100, 160, 200, 3);
    // reflet au sol
    const fg = c.createLinearGradient(0, FLOOR, 0, H); fg.addColorStop(0, 'rgba(255,150,80,.18)'); fg.addColorStop(1, 'rgba(0,0,0,.6)'); c.fillStyle = fg; c.fillRect(0, FLOOR, W, H - FLOOR);
    this.drawFighter(c, this.f, false, t); this.drawFighter(c, this.p, true, t);
    this.parts.draw(c, 0, 0, 'lighter');
    // message
    if (this.msg) { const m = this.msg, a = 1 - smooth(1, 1.4, m.t); G.text(c, m.text, m.x, FLOOR - 340 - m.t * 24, { size: 22, ls: 8, align: 'center', color: m.col, alpha: a, weight: 600 }); }
    this.drawHud(c);
  },
  drawFighter(c, f, isP, t) {
    const pose = this.pose(f, isP, t);
    c.save();
    if (f.fall) { const k = smooth(0, 1.6, f.fall); c.translate(f.x, FLOOR); c.rotate(-f.face * k * 1.45); c.translate(-f.x, -FLOOR); c.globalAlpha = 1; }
    // bouclier
    if (f.shield > 0) { c.save(); c.globalCompositeOperation = 'lighter'; const a = f.shield; c.strokeStyle = `rgba(150,200,255,${a * 0.8})`; c.lineWidth = 2; for (let r = 0; r < 3; r++) { c.beginPath(); c.ellipse(f.x, FLOOR - FH * 0.52, FH * 0.26 + r * 8 + (1 - a) * 18, FH * 0.56 + r * 8, 0, 0, TAU); c.stroke(); } c.restore(); }
    else { c.save(); c.globalCompositeOperation = 'lighter'; c.strokeStyle = 'rgba(150,200,255,.07)'; c.lineWidth = 1.5; c.beginPath(); c.ellipse(f.x, FLOOR - FH * 0.52, FH * 0.27, FH * 0.56, 0, 0, TAU); c.stroke(); c.restore(); }
    const opt = isP ? { body: [24, 21, 19], hood: true, eyes: 'rgba(120,180,255,.95)', rim: [255, 180, 110] } : { body: [14, 14, 16], skin: [196, 190, 184], bald: true, rim: [255, 200, 150], glow: [120, 255, 140] };
    // lueur du dard / lame lente
    if (!isP && pose.glow) opt.glow = [120, 255, 140];
    if (isP && pose.glow) opt.glow = [255, 190, 110];
    const hand = A.fighter(c, f.x, FLOOR, FH, f.face, Object.assign({ bladeGlow: pose.glow || 0 }, pose), opt);
    if (f.flash > 0) { c.save(); c.globalCompositeOperation = 'lighter'; c.fillStyle = `rgba(255,255,255,${f.flash * 0.5})`; c.fillRect(f.x - 70, FLOOR - FH, 140, FH); c.restore(); }
    // télégraphe de Feyd : repère rouge pendant la préparation
    if (!isP && f.act && (f.act.k === 'quick' || f.act.k === 'spike') && f.act.t < f.act.wind) { c.fillStyle = `rgba(255,70,50,${0.5 + 0.5 * Math.sin(t * 30)})`; c.fillRect(f.x - 5, FLOOR - FH - 20, 10, 10); }
    if (!isP && f.act && f.act.k === 'slow' && f.act.phase === 'charge') { c.strokeStyle = 'rgba(120,255,140,.7)'; c.lineWidth = 2; c.beginPath(); c.arc(f.x, FLOOR - FH - 14, 9, -Math.PI / 2, -Math.PI / 2 + TAU * f.act.p); c.stroke(); }
    if (isP && f.act && f.act.k === 'slow' && f.act.phase === 'charge') { c.strokeStyle = 'rgba(255,210,150,.9)'; c.lineWidth = 3; c.beginPath(); c.arc(f.x, FLOOR - FH - 16, 11, -Math.PI / 2, -Math.PI / 2 + TAU * f.act.p); c.stroke(); }
    if (f.stag > 0 && !f.fall) { c.fillStyle = 'rgba(255,230,160,.9)'; for (let i = 0; i < 3; i++) { const a = t * 6 + i * 2.1; c.fillRect(f.x + Math.cos(a) * 26 - 2, FLOOR - FH - 22 + Math.sin(a) * 6, 4, 4); } }
    c.restore();
    void hand;
  },
  drawHud(c) {
    const W = G.W, H = G.H;
    const bar = (x, align, name, f, col) => {
      G.text(c, name, x, 46, { size: 13, ls: 6, align, color: '#f0e0c0' });
      for (let i = 0; i < f.max; i++) { const px = align === 'left' ? x + 6 + i * 26 : x - 6 - i * 26; c.fillStyle = i < f.hp ? col : 'rgba(234,220,196,.18)'; c.save(); c.translate(px, 66); c.rotate(Math.PI / 4); c.fillRect(-7, -7, 14, 14); c.restore(); }
      const w = 300, bx = align === 'left' ? x : x - w;
      c.fillStyle = 'rgba(234,220,196,.15)'; c.fillRect(bx, 88, w, 3); c.fillStyle = f.bal > 70 ? '#ff8a62' : '#d9c8a4'; c.fillRect(align === 'left' ? bx : bx + w * (1 - f.bal / 100), 88, w * clamp(f.bal / 100, 0, 1), 3);
      G.text(c, 'ÉQUILIBRE', x, 108, { size: 9, ls: 5, align, color: '#a8987f' });
    };
    bar(40, 'left', 'PAUL ATRÉIDES', this.p, '#f1dcb8'); bar(W - 40, 'right', 'FEYD-RAUTHA HARKONNEN', this.f, '#ff8a70');
    G.text(c, 'J · COUP RAPIDE      ESPACE (MAINTENIR) · LAME LENTE      S · GARDE      MAJ · ESQUIVE', W / 2, H - 22, { size: 11, ls: 4, align: 'center', color: '#b9a88c', alpha: 0.75 });
    if (this.end > 5) { c.fillStyle = `rgba(0,0,0,${smooth(5, 8.5, this.end)})`; c.fillRect(0, 0, W, H); }
  },
  exit() { G.audio.silenceAll(); },
};
})();
