/* Dune : Genesis — écran titre, chapitres, commandes */
(function () {
'use strict';
const G = window.G, A = G.art;

G.scenes.title = {
  enter() {
    this.mode = G.firstInput ? 'menu' : 'press'; this.t = 0; this.sel = 0; this.chSel = 0; this.sub = null;
    G.audio.mood('title'); G.audio.silenceAll(); G.barsTarget = 0; G.grainAmt = 0.08;
    G.run = { spice: 0, truth: null, hayt: null, deaths: 0 };
    this.sand = []; for (let i = 0; i < 70; i++) this.sand.push({ x: Math.random() * G.W, y: Math.random() * G.H, v: 80 + Math.random() * 220, s: 0.6 + Math.random() * 1.4 });
  },
  items() {
    const a = [{ k: 'new', l: 'Nouvelle partie' }];
    if (G.save.step > 0) a.push({ k: 'cont', l: 'Continuer' });
    a.push({ k: 'chap', l: 'Chapitres' }, { k: 'ctrl', l: 'Commandes' }, { k: 'snd', l: 'Son : ' + (G.audio.muted ? 'coupé' : 'actif') });
    return a;
  },
  choose(k) {
    G.audio.sfx.confirm();
    if (k === 'new') { G.startChapter(0); }
    else if (k === 'cont') { G.run = { spice: 0, truth: null, hayt: null, deaths: 0 }; G.playStep(G.save.step || 0); }
    else if (k === 'chap') { this.sub = 'chap'; this.chSel = 0; }
    else if (k === 'ctrl') this.sub = 'ctrl';
    else if (k === 'snd') G.audio.toggleMute();
  },
  update(dt) {
    this.t += dt;
    for (const s of this.sand) { s.x += s.v * dt; s.y -= s.v * 0.04 * dt; if (s.x > G.W + 10) { s.x = -10; s.y = Math.random() * G.H; } }
    if (this.mode === 'press') { if (G.firstInput && this.t > 0.6) { this.mode = 'menu'; G.audio.mood('title'); G.audio.sfx.boom(); } return; }
    if (this.sub === 'chap') {
      const n = G.CHAPTERS.length;
      if (G.anyHit('ArrowUp', 'KeyW')) { this.chSel = (this.chSel + n - 1) % n; G.audio.sfx.ui(); }
      if (G.anyHit('ArrowDown', 'KeyS')) { this.chSel = (this.chSel + 1) % n; G.audio.sfx.ui(); }
      if (G.mouse.moved) for (let i = 0; i < n; i++) if (Math.abs(G.mouse.x - G.W / 2) < 340 && Math.abs(G.mouse.y - (206 + i * 46)) < 21) this.chSel = i;
      if (G.anyHit('Enter', 'Space') || (G.mouse.clicked && Math.abs(G.mouse.x - G.W / 2) < 340 && Math.abs(G.mouse.y - (206 + this.chSel * 46)) < 22)) { G.audio.sfx.confirm(); G.startChapter(this.chSel); }
      if (G.hit('Escape') || (G.mouse.clicked && G.mouse.y > 640)) this.sub = null;
      return;
    }
    if (this.sub === 'ctrl') { if (G.anyHit('Escape', 'Enter', 'Space') || G.mouse.clicked) this.sub = null; return; }
    const it = this.items(), n = it.length;
    if (G.anyHit('ArrowUp', 'KeyW')) { this.sel = (this.sel + n - 1) % n; G.audio.sfx.ui(); }
    if (G.anyHit('ArrowDown', 'KeyS')) { this.sel = (this.sel + 1) % n; G.audio.sfx.ui(); }
    if (G.mouse.moved) for (let i = 0; i < n; i++) if (Math.abs(G.mouse.x - G.W / 2) < 190 && Math.abs(G.mouse.y - (478 + i * 44)) < 20) { if (this.sel !== i) G.audio.sfx.ui(); this.sel = i; }
    if (this.sel >= n) this.sel = 0;
    if (G.anyHit('Enter', 'Space') || (G.mouse.clicked && Math.abs(G.mouse.x - G.W / 2) < 200 && Math.abs(G.mouse.y - (478 + this.sel * 44)) < 22)) this.choose(it[this.sel].k);
  },
  draw(c) {
    const W = G.W, H = G.H, t = G.time;
    const px = (G.mouse.x - W / 2) * -0.012;
    c.save(); c.translate(px, 0);
    A.dunes(c, t, Object.assign({}, A.DUNE_SETS.dusk, { sun: { x: 640, y: 372, r: 92, col: [255, 218, 176] }, horizon: 440, drift: 3, amp: 1.2, seed: 8 }));
    c.restore();
    // sable porté par le vent
    c.fillStyle = 'rgba(255,200,140,.28)';
    for (const s of this.sand) c.fillRect(s.x, s.y, s.s * 6, s.s * 0.8);
    // silhouette solitaire au premier plan
    c.fillStyle = '#06030a'; c.beginPath(); c.moveTo(0, H); c.lineTo(0, 640); c.quadraticCurveTo(220, 610, 420, 650); c.lineTo(520, H); c.closePath(); c.fill();
    A.person(c, 300, 640, 200, 'paul', t, { rim: [255, 190, 120], lit: 1 });
    const g = c.createLinearGradient(0, 0, 0, H); g.addColorStop(0, 'rgba(0,0,0,.35)'); g.addColorStop(0.35, 'rgba(0,0,0,0)'); g.addColorStop(0.7, 'rgba(0,0,0,.2)'); g.addColorStop(1, 'rgba(0,0,0,.7)');
    c.fillStyle = g; c.fillRect(0, 0, W, H);

    // titre
    const a = G.smooth(0, 2.4, this.t);
    c.save(); c.globalAlpha = a;
    G.text(c, 'DUNE', W / 2 + 18, 190, { size: 128, weight: 500, align: 'center', ls: 36, color: '#f1dcb8', shadowBlur: 24 });
    G.text(c, ': GENESIS', W / 2 + 6, 244, { size: 34, weight: 500, align: 'center', ls: 26, color: '#d9a05b' });
    c.fillStyle = 'rgba(217,160,91,.7)'; c.fillRect(W / 2 - 90, 266, 180, 1.2);
    c.restore();

    if (this.mode === 'press') {
      G.text(c, 'APPUYEZ SUR UNE TOUCHE', W / 2, 560, { size: 16, align: 'center', ls: 10, color: '#e8d2ad', alpha: (0.45 + 0.4 * Math.sin(t * 2.4)) * G.smooth(1, 2.5, this.t) });
      G.text(c, 'Pour une expérience complète : son activé, plein écran (touche F)', W / 2, 600, { size: 21, fam: 'body', align: 'center', color: '#a8987f', alpha: G.smooth(1.5, 3, this.t) });
    } else if (this.sub === 'chap') this.drawChapters(c);
    else if (this.sub === 'ctrl') this.drawControls(c);
    else {
      this.items().forEach((it, i) => {
        const sel = i === this.sel, y = 478 + i * 44;
        G.text(c, it.l.toUpperCase(), W / 2, y + 6, { size: 20, align: 'center', ls: 8, color: sel ? '#f6dcae' : '#a8927a' });
        if (sel) { c.fillStyle = 'rgba(217,160,91,.8)'; c.fillRect(W / 2 - 130, y + 18, 260, 1.2); c.fillRect(W / 2 - 160, y - 3, 14, 1.2); c.fillRect(W / 2 + 146, y - 3, 14, 1.2); }
      });
    }
    G.text(c, 'Jeu de fan non officiel · inspiré des films de Denis Villeneuve et du roman de Frank Herbert', W / 2, H - 22, { size: 17, fam: 'body', align: 'center', color: '#9c8d77', alpha: 0.8 });
  },
  drawChapters(c) {
    const W = G.W;
    c.fillStyle = 'rgba(4,2,4,.82)'; c.fillRect(0, 0, G.W, G.H);
    G.text(c, 'CHAPITRES', W / 2, 130, { size: 30, align: 'center', ls: 14, color: '#e8d2ad' });
    G.CHAPTERS.forEach((ch, i) => {
      const sel = i === this.chSel, y = 206 + i * 46;
      if (sel) { c.fillStyle = 'rgba(217,160,91,.13)'; c.fillRect(W / 2 - 340, y - 24, 680, 42); c.fillStyle = '#d9a05b'; c.fillRect(W / 2 - 340, y - 24, 3, 42); }
      G.text(c, ch.n, W / 2 - 310, y + 4, { size: 15, ls: 3, color: sel ? '#d9a05b' : '#7e6c52' });
      G.text(c, ch.t, W / 2 - 200, y + 5, { size: 21, ls: 3, color: sel ? '#f6dcae' : '#a8927a' });
      G.text(c, ch.sub, W / 2 + 330, y + 4, { size: 18, fam: 'body', align: 'right', color: sel ? '#c9b894' : '#6f6250' });
    });
    G.text(c, 'ÉCHAP — RETOUR', W / 2, 660, { size: 12, align: 'center', ls: 6, color: '#8a7a62' });
  },
  drawControls(c) {
    const W = G.W;
    c.fillStyle = 'rgba(4,2,4,.86)'; c.fillRect(0, 0, G.W, G.H);
    G.text(c, 'COMMANDES', W / 2, 150, { size: 30, align: 'center', ls: 14, color: '#e8d2ad' });
    const rows = [
      ['Se déplacer', 'ZQSD · WASD · Flèches'],
      ['Action · Valider', 'Espace · Entrée · Clic'],
      ['Marche lente · Esquive', 'Maj'],
      ['Poser un marteleur', 'E'],
      ['Coup rapide (duel)', 'J · Clic gauche'],
      ['Lame lente (duel)', 'Espace — maintenir'],
      ['Garde (duel)', 'S · Flèche bas'],
      ['Plein écran', 'F'],
      ['Pause', 'Échap'],
    ];
    rows.forEach((r, i) => {
      G.text(c, r[0], W / 2 - 40, 214 + i * 46, { size: 25, fam: 'body', align: 'right', color: '#c9b894' });
      G.text(c, r[1], W / 2 + 10, 214 + i * 46, { size: 16, ls: 3, color: '#d9a05b' });
    });
    G.text(c, 'Sur Arrakis, ce qui marche en cadence attire les vers. Brisez le rythme.', W / 2, 640, { size: 24, fam: 'body', align: 'center', color: '#9c8d77' });
  },
};
})();
