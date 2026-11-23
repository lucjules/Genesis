/* Dune : Genesis — direction artistique : décors et sprites vectoriels */
(function () {
'use strict';
const G = window.G;
const { clamp, smooth, fbm, vnoise, TAU } = G;
const A = G.art = {};
const rgba = (c, a) => `rgba(${c[0] | 0},${c[1] | 0},${c[2] | 0},${a === undefined ? 1 : a})`;
const mix = (a, b, t) => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];
A.rgba = rgba; A.mix = mix;

/* ================= DÉCORS ================= */
function vgrad(c, y0, y1, stops) {
  const g = c.createLinearGradient(0, y0, 0, y1);
  stops.forEach((s) => g.addColorStop(s[0], s[1]));
  return g;
}
function ridgePath(c, base, amp, freq, off, seed, w, h, step) {
  c.beginPath(); c.moveTo(-10, h + 10);
  for (let x = -10; x <= w + 10; x += step || 8) {
    const n1 = fbm(x * freq + off, seed, 3, seed), n2 = fbm(x * freq * 1.9 + off * 1.3, seed + 5, 2, seed + 3);
    c.lineTo(x, base - amp * (0.55 * n1 + 0.45 * (1 - Math.abs(2 * n2 - 1))));
  }
  c.lineTo(w + 10, h + 10); c.closePath();
}
/* Dunes en couches avec soleil et brume */
A.dunes = function (c, t, o) {
  o = Object.assign({
    sky: [[44, 40, 58], [196, 128, 98], [248, 196, 142]], sun: { x: 860, y: 300, r: 54, col: [255, 238, 210] }, horizon: 420,
    cols: [[212, 140, 86], [176, 104, 62], [132, 74, 46], [92, 50, 36], [52, 28, 24]], seed: 3, drift: 5, haze: [240, 176, 120], amp: 1,
  }, o);
  const W = G.W, H = G.H, hz = o.horizon;
  c.fillStyle = vgrad(c, 0, hz + 20, [[0, rgba(o.sky[0])], [0.62, rgba(o.sky[1])], [1, rgba(o.sky[2])]]); c.fillRect(0, 0, W, H);
  if (o.sun) {
    const s = o.sun; let g = c.createRadialGradient(s.x, s.y, 0, s.x, s.y, s.r * 9);
    g.addColorStop(0, rgba(s.col, 0.55)); g.addColorStop(0.15, rgba(s.col, 0.2)); g.addColorStop(1, rgba(s.col, 0));
    c.fillStyle = g; c.fillRect(0, 0, W, H);
    c.fillStyle = rgba(s.col, 0.95); c.beginPath(); c.arc(s.x, s.y, s.r, 0, TAU); c.fill();
  }
  const n = o.cols.length;
  for (let i = 0; i < n; i++) {
    const k = i / (n - 1), base = hz + 6 + Math.pow(k, 1.25) * (H - hz) * 0.78, amp = (26 + k * 90) * o.amp;
    const off = t * o.drift * (0.2 + k * 1.2) * 0.0009 * 60 + i * 13.7;
    ridgePath(c, base, amp, 0.0042 + k * 0.0012, off, o.seed + i * 11, W, H, 8);
    const col = o.cols[i];
    c.fillStyle = vgrad(c, base - amp, H, [[0, rgba(mix(col, o.haze, 0.25 * (1 - k)))], [0.35, rgba(col)], [1, rgba(mix(col, [0, 0, 0], 0.55))]]);
    c.fill();
    c.strokeStyle = rgba(mix(col, [255, 220, 170], 0.35), 0.35 * (1 - k * 0.5)); c.lineWidth = 1.5; c.stroke();
    // voile de brume entre les plans
    if (i < n - 1) { c.fillStyle = vgrad(c, base - amp, base + 70, [[0, rgba(o.haze, 0)], [1, rgba(o.haze, 0.12 * (1 - k))]]); c.fillRect(0, base - amp, W, amp + 70); }
  }
};
A.DUNE_SETS = {
  dayDusk: {},
  noon: { sky: [[120, 120, 140], [236, 190, 150], [252, 224, 180]], sun: { x: 640, y: 150, r: 70, col: [255, 250, 235] }, cols: [[240, 180, 120], [214, 150, 96], [180, 112, 70], [130, 78, 50], [80, 46, 34]], haze: [250, 214, 170] },
  dusk: { sky: [[20, 14, 34], [140, 56, 52], [236, 130, 80]], sun: { x: 300, y: 380, r: 60, col: [255, 196, 140] }, cols: [[170, 76, 52], [128, 54, 44], [86, 38, 38], [52, 26, 30], [26, 14, 20]], haze: [220, 110, 70] },
  night: { sky: [[2, 4, 10], [10, 18, 34], [34, 52, 78]], sun: null, cols: [[40, 58, 86], [28, 42, 66], [18, 28, 46], [10, 16, 30], [4, 8, 16]], haze: [60, 84, 120] },
};
A.stars = function (c, t, o) {
  o = o || {};
  const W = G.W, H = G.H, r = G.rng(o.seed || 11);
  for (let i = 0; i < 220; i++) {
    const x = r() * W, y = r() * (o.maxY || H * 0.62), s = r(), tw = 0.6 + 0.4 * Math.sin(t * (0.5 + r() * 2) + i);
    c.fillStyle = `rgba(220,230,255,${(0.25 + s * 0.6) * tw})`; c.fillRect(x, y, s > 0.92 ? 2 : 1.2, s > 0.92 ? 2 : 1.2);
  }
  // deux lunes d'Arrakis
  const moons = o.moons || [{ x: 330, y: 170, r: 52 }, { x: 520, y: 110, r: 19 }];
  moons.forEach((m, i) => {
    let g = c.createRadialGradient(m.x, m.y, m.r * 0.8, m.x, m.y, m.r * 5);
    g.addColorStop(0, 'rgba(170,190,225,.35)'); g.addColorStop(1, 'rgba(170,190,225,0)'); c.fillStyle = g; c.fillRect(m.x - m.r * 5, m.y - m.r * 5, m.r * 10, m.r * 10);
    g = c.createRadialGradient(m.x - m.r * 0.3, m.y - m.r * 0.3, 1, m.x, m.y, m.r);
    g.addColorStop(0, '#e9eef7'); g.addColorStop(0.7, '#aeb9cf'); g.addColorStop(1, '#6e7b96');
    c.fillStyle = g; c.beginPath(); c.arc(m.x, m.y, m.r, 0, TAU); c.fill();
    c.fillStyle = 'rgba(80,95,125,.28)';
    const rr = G.rng(5 + i * 3); for (let k = 0; k < 7; k++) { c.beginPath(); c.arc(m.x + (rr() - 0.5) * m.r, m.y + (rr() - 0.5) * m.r, m.r * (0.08 + rr() * 0.15), 0, TAU); c.fill(); }
  });
};
A.caladan = function (c, t) {
  const W = G.W, H = G.H, hz = 360;
  c.fillStyle = vgrad(c, 0, hz, [[0, '#56635f'], [0.6, '#8d9a92'], [1, '#bcc6bb']]); c.fillRect(0, 0, W, H);
  // soleil voilé
  let g = c.createRadialGradient(900, 210, 0, 900, 210, 380); g.addColorStop(0, 'rgba(236,240,226,.55)'); g.addColorStop(1, 'rgba(236,240,226,0)'); c.fillStyle = g; c.fillRect(0, 0, W, H);
  // nuages
  for (let i = 0; i < 7; i++) {
    const x = ((i * 280 + t * (6 + i * 1.2)) % (W + 500)) - 250, y = 60 + i * 38;
    g = c.createRadialGradient(x, y, 10, x, y, 260); g.addColorStop(0, 'rgba(70,82,80,.32)'); g.addColorStop(1, 'rgba(70,82,80,0)');
    c.fillStyle = g; c.save(); c.translate(x, y); c.scale(2.2, 0.38); c.translate(-x, -y); c.fillRect(x - 280, y - 280, 560, 560); c.restore();
  }
  // mer
  c.fillStyle = vgrad(c, hz, H, [[0, '#4b5c5a'], [0.4, '#26383b'], [1, '#101c20']]); c.fillRect(0, hz, W, H - hz);
  for (let i = 0; i < 46; i++) {
    const k = i / 46, y = hz + 4 + Math.pow(k, 1.6) * (H - hz), amp = 3 + k * 16, ph = t * (0.4 + k * 0.7) + i * 1.7;
    c.strokeStyle = `rgba(190,208,200,${0.05 + k * 0.15})`; c.lineWidth = 1 + k * 1.5; c.beginPath();
    for (let x = 0; x <= W; x += 24) { const yy = y + Math.sin(x * 0.012 * (1 + k) + ph) * amp * 0.4; x ? c.lineTo(x, yy) : c.moveTo(x, yy); }
    c.stroke();
  }
  // falaise & château Atréides (silhouette monolithique)
  c.fillStyle = '#0d1311';
  c.beginPath(); c.moveTo(-10, H); c.lineTo(-10, 330); c.lineTo(90, 322); c.lineTo(150, 340); c.lineTo(260, 380); c.lineTo(330, 470); c.lineTo(420, 560); c.lineTo(520, H); c.closePath(); c.fill();
  c.fillStyle = '#131b18';
  c.fillRect(20, 190, 90, 150); c.fillRect(60, 130, 38, 70); c.fillRect(120, 232, 130, 98); c.fillRect(244, 270, 64, 60); c.fillRect(-10, 232, 40, 100);
  c.fillStyle = '#1b2521'; c.fillRect(124, 236, 6, 94); c.fillRect(66, 134, 5, 66);
  c.fillStyle = 'rgba(255,214,140,.5)'; c.fillRect(46, 250, 4, 12); c.fillRect(150, 270, 4, 12); c.fillRect(190, 270, 4, 12);
  // brume
  for (let i = 0; i < 3; i++) {
    const y = hz - 10 + i * 40, x = ((t * (14 + i * 6) + i * 300) % (W + 800)) - 400;
    g = c.createLinearGradient(x - 400, 0, x + 400, 0); g.addColorStop(0, 'rgba(190,200,190,0)'); g.addColorStop(0.5, 'rgba(190,200,190,.16)'); g.addColorStop(1, 'rgba(190,200,190,0)');
    c.fillStyle = g; c.fillRect(x - 400, y - 30, 800, 70);
  }
  // pluie
  c.strokeStyle = 'rgba(200,214,208,.28)'; c.lineWidth = 1; c.beginPath();
  const r = G.rng(4);
  for (let i = 0; i < 170; i++) { const x = r() * (W + 200) - 100, y0 = r() * H, sp = 0.6 + r() * 0.8; const yy = (y0 + t * 900 * sp) % (H + 60) - 30; const xx = x - yy * 0.18; c.moveTo(xx, yy); c.lineTo(xx - 5, yy + 24 * sp); }
  c.stroke();
};
A.giedi = function (c, t) {
  const W = G.W, H = G.H, hz = 470;
  c.fillStyle = vgrad(c, 0, hz, [[0, '#9a9a98'], [0.55, '#cfcfcb'], [1, '#ececE8']]); c.fillRect(0, 0, W, H);
  // soleil noir
  const sx = 700, sy = 250;
  let g = c.createRadialGradient(sx, sy, 60, sx, sy, 520); g.addColorStop(0, 'rgba(255,255,255,.95)'); g.addColorStop(0.18, 'rgba(255,255,255,.55)'); g.addColorStop(1, 'rgba(255,255,255,0)');
  c.fillStyle = g; c.fillRect(0, 0, W, H);
  c.fillStyle = '#050505'; c.beginPath(); c.arc(sx, sy, 98, 0, TAU); c.fill();
  c.strokeStyle = 'rgba(255,255,255,.9)'; c.lineWidth = 3; c.beginPath(); c.arc(sx, sy, 101, 0, TAU); c.stroke();
  for (let i = 0; i < 90; i++) { const a = i / 90 * TAU + t * 0.01, l = 12 + 40 * vnoise(i * 3.1, t * 0.4, 2); c.strokeStyle = `rgba(255,255,255,${0.1 + 0.3 * vnoise(i, t * 0.2, 1)})`; c.lineWidth = 1.2; c.beginPath(); c.moveTo(sx + Math.cos(a) * 104, sy + Math.sin(a) * 104); c.lineTo(sx + Math.cos(a) * (104 + l), sy + Math.sin(a) * (104 + l)); c.stroke(); }
  // skyline industriel
  const r = G.rng(21);
  for (let layer = 0; layer < 3; layer++) {
    const col = ['#8e8e8c', '#4d4d4d', '#101010'][layer];
    c.fillStyle = col;
    let x = -20;
    while (x < W + 40) {
      const w = 30 + r() * 80, h = 40 + r() * (90 + layer * 90);
      c.fillRect(x, hz - h + layer * 14, w, h + 200);
      if (r() < 0.3) c.fillRect(x + w * 0.4, hz - h - 50 - r() * 60 + layer * 14, 8 + r() * 10, 70);
      x += w - 2;
    }
  }
  c.fillStyle = vgrad(c, hz, H, [[0, '#0b0b0b'], [1, '#000']]); c.fillRect(0, hz + 14, W, H);
  c.fillStyle = 'rgba(255,255,255,.07)'; c.fillRect(0, hz + 14, W, 2);
  // cendres
  c.fillStyle = 'rgba(30,30,30,.55)';
  const r2 = G.rng(8);
  for (let i = 0; i < 80; i++) { const x = (r2() * W + t * 14 * (0.5 + r2())) % W, y = (r2() * H + t * 30 * (0.4 + r2())) % H; c.fillRect(x, y, 2, 2); }
};
const puffCache = {};
function puff(tint) {
  const key = tint.join(',');
  if (!puffCache[key]) {
    const cv = document.createElement('canvas'); cv.width = cv.height = 128; const x = cv.getContext('2d');
    const g = x.createRadialGradient(64, 64, 0, 64, 64, 64); g.addColorStop(0, rgba(tint, 1)); g.addColorStop(1, rgba(tint, 0)); x.fillStyle = g; x.fillRect(0, 0, 128, 128);
    puffCache[key] = cv;
  }
  return puffCache[key];
}
A.cloud = function (c, t, k, tint) {
  // masses de poussière d'une tempête (k = intensité 0..1)
  const W = G.W, H = G.H, tn = tint || [150, 96, 60], sp = puff(tn);
  for (let i = 0; i < 10; i++) {
    const v = 40 + i * 20, R = 360 + i * 20, x = ((i * 241 - t * v) % (W + 900) + W + 900) % (W + 900) - 450, y = ((i * 131) % H) + Math.sin(t * 0.5 + i) * 30;
    c.globalAlpha = Math.min(1, 0.26 * k); c.drawImage(sp, x - R, y - R, R * 2, R * 2);
  }
  c.globalAlpha = 1;
  // rafales
  c.strokeStyle = rgba(mix(tn, [255, 230, 190], 0.5), 0.15 * Math.min(1, k)); c.lineWidth = 1.5; c.beginPath();
  const r = G.rng(33);
  for (let i = 0; i < 50; i++) { const y = r() * H, v = 900 + r() * 900, x = ((r() * W * 2 - t * v) % (W + 400) + W + 400) % (W + 400) - 200, l = 60 + r() * 160; c.moveTo(x, y); c.lineTo(x + l, y - 6); }
  c.stroke();
};
A.hall = function (c, t, o) {
  o = Object.assign({ light: [255, 196, 120], wall: [26, 20, 18], beams: 5, floor: [18, 12, 10], pillars: true, y: 560 }, o);
  const W = G.W, H = G.H, fy = o.y;
  c.fillStyle = vgrad(c, 0, fy, [[0, rgba(mix(o.wall, [0, 0, 0], 0.6))], [1, rgba(mix(o.wall, o.light, 0.12))]]); c.fillRect(0, 0, W, H);
  // piliers monolithiques
  if (o.pillars) for (let i = 0; i < 7; i++) {
    const x = 40 + i * 205, w = 70;
    c.fillStyle = vgrad(c, 0, fy, [[0, rgba(mix(o.wall, [0, 0, 0], 0.75))], [1, rgba(mix(o.wall, o.light, 0.18))]]);
    c.fillRect(x, 0, w, fy);
    c.fillStyle = rgba(o.light, 0.05); c.fillRect(x + w - 6, 0, 6, fy);
  }
  // faisceaux de lumière haute
  for (let i = 0; i < o.beams; i++) {
    const x0 = 120 + i * (W - 240) / Math.max(1, o.beams - 1) + Math.sin(t * 0.2 + i) * 10, w0 = 22, x1 = x0 - 180 - i * 18, w1 = 120;
    const g = c.createLinearGradient(x0, 0, x1, fy);
    g.addColorStop(0, rgba(o.light, 0.34)); g.addColorStop(1, rgba(o.light, 0));
    c.fillStyle = g; c.beginPath(); c.moveTo(x0 - w0, 0); c.lineTo(x0 + w0, 0); c.lineTo(x1 + w1, fy); c.lineTo(x1 - w1, fy); c.closePath(); c.fill();
  }
  // sol
  c.fillStyle = vgrad(c, fy, H, [[0, rgba(mix(o.floor, o.light, 0.16))], [1, rgba(o.floor)]]); c.fillRect(0, fy, W, H - fy);
  c.fillStyle = rgba(o.light, 0.12); c.fillRect(0, fy, W, 1.5);
  // poussière en suspension
  const r = G.rng(6); c.fillStyle = rgba(o.light, 0.35);
  for (let i = 0; i < 50; i++) { const x = (r() * W + t * 5 * (r() - 0.3)) % W, y = (r() * fy + t * 4 * r()) % fy; c.fillRect(x, y, 1.6, 1.6); }
};
A.voidBlue = function (c, t, k) {
  k = k === undefined ? 1 : k;
  const W = G.W, H = G.H, sp = puff([40, 110, 230]);
  c.fillStyle = '#02050c'; c.fillRect(0, 0, W, H);
  for (let i = 0; i < 4; i++) {
    const x = W / 2 + Math.sin(t * 0.22 + i * 1.7) * 360, y = H / 2 + Math.cos(t * 0.18 + i * 2.3) * 190;
    c.globalAlpha = 0.5 * k; c.drawImage(sp, x - 520, y - 520, 1040, 1040);
  }
  c.globalAlpha = 1;
};

/* ================= SPRITES ================= */
const STYLES = {
  atreides: { body: [98, 84, 66], trim: [200, 160, 96], wing: [210, 196, 170] },
  harkonnen: { body: [18, 18, 22], trim: [92, 92, 100], wing: [70, 70, 78] },
  imperial: { body: [196, 190, 178], trim: [120, 114, 104], wing: [230, 224, 212] },
  fremen: { body: [120, 92, 62], trim: [60, 44, 30], wing: [180, 150, 110] },
};
/* ornithoptère vu de dessus, cap vers +x */
A.thopter = function (c, x, y, ang, t, o) {
  o = o || {}; const s = o.s || 1, st = STYLES[o.style || 'atreides'];
  const fl = t * (o.freq || 22);
  c.save(); c.translate(x, y); c.rotate(ang); c.scale(s, s);
  const wing = (rx, side, phase, len) => {
    const L = len * (0.42 + 0.58 * Math.abs(Math.cos(fl + phase)));
    c.beginPath(); c.moveTo(rx + 6, side * 5); c.quadraticCurveTo(rx + 4, side * L * 0.6, rx - 18 * Math.abs(Math.cos(fl + phase)), side * L);
    c.quadraticCurveTo(rx - 14, side * L * 0.5, rx - 11, side * 5); c.closePath();
  };
  const wings = [[16, 0, 70], [-8, Math.PI / 2, 62]];
  // ombre
  if (o.shadow !== false) {
    c.save(); c.translate(o.sx === undefined ? 14 : o.sx, o.sy === undefined ? 20 : o.sy); c.rotate(-ang * 0.0); c.fillStyle = 'rgba(0,0,0,.28)';
    c.beginPath(); c.ellipse(-4, 0, 40, 8, 0, 0, TAU); c.fill();
    for (const w of wings) for (const sd of [-1, 1]) { wing(w[0], sd, w[1], w[2]); c.fill(); }
    c.restore();
  }
  // ailes (membrane translucide + nervures)
  for (const w of wings) for (const sd of [-1, 1]) {
    wing(w[0], sd, w[1], w[2]);
    c.fillStyle = rgba(st.wing, 0.42); c.fill();
    c.strokeStyle = rgba(st.trim, 0.8); c.lineWidth = 1.4; c.stroke();
  }
  // fuselage
  c.fillStyle = rgba(st.body);
  c.beginPath(); c.moveTo(44, 0); c.quadraticCurveTo(34, -10, 10, -10); c.lineTo(-34, -6); c.lineTo(-70, -1.6); c.lineTo(-70, 1.6); c.lineTo(-34, 6); c.lineTo(10, 10); c.quadraticCurveTo(34, 10, 44, 0); c.closePath(); c.fill();
  c.strokeStyle = rgba(st.trim, 0.9); c.lineWidth = 1.2; c.stroke();
  c.fillStyle = rgba(mix(st.body, [255, 255, 255], 0.18), 0.8); c.beginPath(); c.ellipse(18, 0, 14, 4.2, 0, 0, TAU); c.fill();   // verrière
  c.fillStyle = rgba(st.trim, 0.95); c.fillRect(-72, -7, 3, 14);
  if (o.light) { c.fillStyle = o.light; c.beginPath(); c.arc(40, 0, 2.5, 0, TAU); c.fill(); }
  c.restore();
};
/* ver des sables : w.pts = [{x,y}...] de la tête à la queue */
A.worm = function (c, w, cx, cy, o) {
  o = o || {}; const pts = w.pts, n = pts.length; if (n < 4) return;
  const R = w.r, sub = o.sub || 0, base = o.base || [66, 52, 44], lit = o.lit || [176, 134, 100];
  const wid = (i) => R * (i < 3 ? 0.94 + i * 0.02 : 1 - 0.6 * Math.pow((i - 3) / (n - 3), 1.15));
  const L = [], Rr = [], nr = [];
  for (let i = 0; i < n; i++) {
    const a = pts[Math.max(0, i - 1)], b = pts[Math.min(n - 1, i + 1)];
    let dx = b.x - a.x, dy = b.y - a.y; const l = Math.hypot(dx, dy) || 1; dx /= l; dy /= l;
    const nx = -dy, ny = dx, wd = wid(i);
    nr.push([nx, ny]);
    L.push([pts[i].x - cx + nx * wd, pts[i].y - cy + ny * wd]); Rr.push([pts[i].x - cx - nx * wd, pts[i].y - cy - ny * wd]);
  }
  const shape = (offx, offy) => { c.beginPath(); c.moveTo(L[0][0] + offx, L[0][1] + offy); for (let i = 1; i < n; i++) c.lineTo(L[i][0] + offx, L[i][1] + offy); for (let i = n - 1; i >= 0; i--) c.lineTo(Rr[i][0] + offx, Rr[i][1] + offy); c.closePath(); };
  c.save(); c.globalAlpha *= 1 - sub * 0.88;
  // halo de poussière + ombre portée
  c.fillStyle = 'rgba(0,0,0,.34)'; shape(R * 0.42, R * 0.55); c.fill();
  shape(0, 0); c.fillStyle = rgba(base); c.fill();
  c.lineJoin = 'round'; c.strokeStyle = 'rgba(8,4,2,.55)'; c.lineWidth = 3; c.stroke();
  // flanc éclairé : bande claire côté soleil + reflet
  const sa = o.sun === undefined ? 3.6 : o.sun, sl = [-Math.cos(sa), -Math.sin(sa)];
  c.lineCap = 'round';
  for (let i = 0; i < n - 1; i++) {
    const d = nr[i][0] * sl[0] + nr[i][1] * sl[1], sd = d >= 0 ? 1 : -1, wd = wid(i), wd2 = wid(i + 1);
    const px = pts[i].x - cx + nr[i][0] * wd * 0.45 * sd, py = pts[i].y - cy + nr[i][1] * wd * 0.45 * sd;
    const qx = pts[i + 1].x - cx + nr[i + 1][0] * wd2 * 0.45 * sd, qy = pts[i + 1].y - cy + nr[i + 1][1] * wd2 * 0.45 * sd;
    c.strokeStyle = rgba(lit, 0.42 * Math.min(1, Math.abs(d) * 1.8 + 0.25)); c.lineWidth = wd * 0.55;
    c.beginPath(); c.moveTo(px, py); c.lineTo(qx, qy); c.stroke();
    c.strokeStyle = rgba(lit, 0.28 * Math.min(1, Math.abs(d) * 1.8 + 0.25)); c.lineWidth = wd * 0.2;
    c.beginPath(); c.moveTo(pts[i].x - cx + nr[i][0] * wd * 0.62 * sd, pts[i].y - cy + nr[i][1] * wd * 0.62 * sd); c.lineTo(pts[i + 1].x - cx + nr[i + 1][0] * wd2 * 0.62 * sd, pts[i + 1].y - cy + nr[i + 1][1] * wd2 * 0.62 * sd); c.stroke();
  }
  // segments (plis de la peau)
  for (let i = 3; i < n - 1; i += 2) {
    const wd = wid(i);
    c.strokeStyle = 'rgba(0,0,0,.38)'; c.lineWidth = 2 + wd * 0.04;
    c.beginPath(); c.moveTo(L[i][0], L[i][1]); c.quadraticCurveTo(pts[i].x - cx + nr[i][1] * wd * 0.35, pts[i].y - cy - nr[i][0] * wd * 0.35, Rr[i][0], Rr[i][1]); c.stroke();
  }
  // tête
  const h = pts[0], hx = h.x - cx, hy = h.y - cy, ha = w.ang, hr = R * 1.22;
  c.save(); c.translate(hx, hy); c.rotate(ha);
  c.fillStyle = 'rgba(0,0,0,.3)'; c.beginPath(); c.ellipse(hr * 0.2, hr * 0.28, hr * 1.02, hr, 0, 0, TAU); c.fill();
  let g = c.createRadialGradient(-hr * 0.35, -hr * 0.3, 2, 0, 0, hr * 1.15); g.addColorStop(0, rgba(lit, 0.95)); g.addColorStop(0.55, rgba(base)); g.addColorStop(1, 'rgba(14,8,5,1)');
  c.fillStyle = g; c.beginPath(); c.ellipse(0, 0, hr, hr * 0.98, 0, 0, TAU); c.fill();
  c.strokeStyle = 'rgba(8,4,2,.6)'; c.lineWidth = 3; c.stroke();
  const open = o.open === undefined ? 0.55 : o.open, full = o.full;
  const a0 = full ? 0 : -1.25, a1 = full ? TAU : 1.25, nt = full ? 34 : 19;
  const rOut = hr * (full ? 0.34 + 0.55 * open : 0.62 + 0.34 * open), cxm = full ? 0 : hr * 0.1;
  // intérieur de la gueule
  g = c.createRadialGradient(cxm, 0, 2, cxm, 0, rOut); g.addColorStop(0, '#0a0201'); g.addColorStop(0.6, '#4b130c'); g.addColorStop(1, '#8a2a16');
  c.fillStyle = g; c.beginPath();
  if (full) c.arc(0, 0, rOut, 0, TAU); else { c.arc(cxm, 0, rOut, a0, a1); c.arc(cxm - hr * 0.1, 0, hr * 0.2, a1, a0, true); }
  c.closePath(); c.fill();
  // crocs cristallins
  for (let ring = 0; ring < 2; ring++) for (let i = 0; i < nt; i++) {
    const a = a0 + (a1 - a0) * (i / (nt - 1)), rr = rOut * (ring ? 0.82 : 1), len = hr * (ring ? 0.2 : 0.3) * (0.7 + open * 0.5);
    const px = cxm + Math.cos(a) * rr, py = Math.sin(a) * rr, bw = hr * 0.055;
    c.fillStyle = ring ? 'rgba(196,174,138,.9)' : 'rgba(238,222,186,.96)'; c.beginPath();
    c.moveTo(px - Math.sin(a) * bw, py + Math.cos(a) * bw); c.lineTo(px + Math.cos(a) * len * (ring ? -1 : 1), py + Math.sin(a) * len * (ring ? -1 : 1)); c.lineTo(px + Math.sin(a) * bw, py - Math.cos(a) * bw); c.closePath(); c.fill();
  }
  // plaques de la nuque
  c.strokeStyle = 'rgba(0,0,0,.4)'; c.lineWidth = 2.4;
  for (let k = 0; k < 3; k++) { c.beginPath(); c.arc(-hr * 0.5, 0, hr * (0.42 + k * 0.2), Math.PI * 0.6, Math.PI * 1.4); c.stroke(); }
  c.restore();
  c.restore();
};
/* moissonneuse d'épice, cap +x */
A.harvester = function (c, x, y, ang, t, o) {
  o = o || {};
  c.save(); c.translate(x, y); c.rotate(ang);
  c.fillStyle = 'rgba(0,0,0,.3)'; c.fillRect(-72, -38, 176, 92);
  // chenilles
  c.fillStyle = '#1b1713'; c.fillRect(-84, -50, 168, 20); c.fillRect(-84, 30, 168, 20);
  c.strokeStyle = '#3a322a'; c.lineWidth = 1.6; for (let i = -80; i < 84; i += 8) { c.beginPath(); c.moveTo(i + ((t * 20) % 8), -50); c.lineTo(i + ((t * 20) % 8), -30); c.moveTo(i + ((t * 20) % 8), 30); c.lineTo(i + ((t * 20) % 8), 50); c.stroke(); }
  // caisson
  let g = c.createLinearGradient(0, -34, 0, 34); g.addColorStop(0, '#8d7a56'); g.addColorStop(1, '#4a3d2a');
  c.fillStyle = g; c.fillRect(-76, -34, 150, 68);
  c.fillStyle = '#2a2318'; c.fillRect(-76, -34, 150, 4); c.fillRect(-76, 30, 150, 4);
  c.fillStyle = '#d9a05b'; for (let i = 0; i < 5; i++) c.fillRect(-60 + i * 28, -4, 12, 8);          // balises d'épice
  c.fillStyle = '#1a140d'; c.fillRect(-20, -16, 44, 32); c.fillStyle = 'rgba(255,196,110,.7)'; c.fillRect(-14, -3, 32, 6);   // cabine
  // tambour d'aspiration
  c.fillStyle = '#2d251b'; c.fillRect(70, -38, 26, 76);
  c.strokeStyle = '#8a7656'; c.lineWidth = 3; for (let i = 0; i < 10; i++) { const yy = -34 + ((i * 7.6 + t * 40) % 70); c.beginPath(); c.moveTo(70, yy); c.lineTo(98, yy); c.stroke(); }
  if (o.alert) { c.fillStyle = `rgba(255,70,40,${0.5 + 0.5 * Math.sin(t * 14)})`; c.beginPath(); c.arc(-8, 0, 5, 0, TAU); c.fill(); }
  c.restore();
};
A.carryall = function (c, x, y, ang, t, o) {
  o = o || {}; const s = o.s || 1;
  c.save(); c.translate(x, y); c.rotate(ang); c.scale(s, s);
  const fl = t * 8;
  const wing = (rx, side, ph) => { const L = 120 * (0.55 + 0.45 * Math.abs(Math.cos(fl + ph))); c.beginPath(); c.moveTo(rx + 10, side * 8); c.quadraticCurveTo(rx + 8, side * L * 0.6, rx - 30, side * L); c.quadraticCurveTo(rx - 24, side * L * 0.4, rx - 18, side * 8); c.closePath(); };
  [[40, 0], [-30, 1.6]].forEach((w) => [-1, 1].forEach((sd) => { wing(w[0], sd, w[1]); c.fillStyle = 'rgba(190,176,150,.4)'; c.fill(); c.strokeStyle = 'rgba(70,60,48,.8)'; c.lineWidth = 2; c.stroke(); }));
  let g = c.createLinearGradient(0, -16, 0, 16); g.addColorStop(0, '#6e6455'); g.addColorStop(1, '#2c2720');
  c.fillStyle = g; c.beginPath(); c.moveTo(90, 0); c.quadraticCurveTo(70, -18, 30, -18); c.lineTo(-90, -9); c.lineTo(-130, -3); c.lineTo(-130, 3); c.lineTo(-90, 9); c.lineTo(30, 18); c.quadraticCurveTo(70, 18, 90, 0); c.fill();
  c.strokeStyle = '#a89878'; c.lineWidth = 1.5; c.stroke();
  c.fillStyle = '#d9a05b'; c.beginPath(); c.arc(84, 0, 3, 0, TAU); c.fill();
  c.restore();
};
A.lander = function (c, x, y, ang, o) {
  o = o || {};
  c.save(); c.translate(x, y); c.rotate(ang);
  c.fillStyle = 'rgba(0,0,0,.34)'; c.beginPath(); c.moveTo(-100, -50); c.lineTo(130, -62); c.lineTo(130, 78); c.lineTo(-100, 70); c.closePath(); c.fill();
  let g = c.createLinearGradient(0, -56, 0, 56); g.addColorStop(0, '#6b6a68'); g.addColorStop(1, '#2b2a2a');
  c.fillStyle = g; c.beginPath(); c.moveTo(-96, -40); c.lineTo(86, -56); c.lineTo(122, -22); c.lineTo(122, 22); c.lineTo(86, 56); c.lineTo(-96, 40); c.closePath(); c.fill();
  c.strokeStyle = '#8c8a86'; c.lineWidth = 2; c.stroke();
  c.strokeStyle = 'rgba(0,0,0,.5)'; c.lineWidth = 2; for (let i = -70; i < 80; i += 26) { c.beginPath(); c.moveTo(i, -44); c.lineTo(i, 44); c.stroke(); }
  c.fillStyle = '#e0a15a'; c.fillRect(100, -14, 12, 8); c.fillRect(100, 6, 12, 8);
  if (o.alert) { c.fillStyle = `rgba(255,70,40,${0.5 + 0.5 * Math.sin(G.time * 12)})`; c.beginPath(); c.arc(0, 0, 8, 0, TAU); c.fill(); }
  c.restore();
};
A.tank = function (c, x, y, ang) {
  c.save(); c.translate(x, y); c.rotate(ang);
  c.fillStyle = 'rgba(0,0,0,.3)'; c.fillRect(-26, -20, 60, 48);
  c.fillStyle = '#252527'; c.fillRect(-30, -24, 62, 48); c.fillStyle = '#3d3d40'; c.fillRect(-22, -16, 40, 32);
  c.fillStyle = '#18181a'; c.fillRect(10, -4, 34, 8);
  c.restore();
};
/* flèche/pointe de roche pour le vol : vue de dessus, grande ombre portée */
A.spire = function (c, x, y, r, seed, sun) {
  const rg = G.rng(seed | 0), n = 11, pts = [];
  for (let i = 0; i < n; i++) { const a = i / n * TAU, rr = r * (0.72 + rg() * 0.4); pts.push([Math.cos(a) * rr, Math.sin(a) * rr]); }
  const sx = -Math.cos(sun), sy = -Math.sin(sun);
  c.save(); c.translate(x, y);
  c.fillStyle = 'rgba(0,0,0,.34)'; c.beginPath();
  pts.forEach((p, i) => { const q = [p[0] + sx * r * 2.2 * (0.6 + (i % 3) * 0.2), p[1] + sy * r * 2.2 * (0.6 + (i % 3) * 0.2)]; i ? c.lineTo(q[0], q[1]) : c.moveTo(q[0], q[1]); });
  c.closePath(); c.fill();
  c.beginPath(); pts.forEach((p, i) => (i ? c.lineTo(p[0], p[1]) : c.moveTo(p[0], p[1]))); c.closePath();
  const g = c.createLinearGradient(-Math.cos(sun) * r, -Math.sin(sun) * r, Math.cos(sun) * r, Math.sin(sun) * r);
  g.addColorStop(0, '#9a7a5e'); g.addColorStop(0.5, '#4d3a2c'); g.addColorStop(1, '#1d1510');
  c.fillStyle = g; c.fill(); c.strokeStyle = 'rgba(0,0,0,.5)'; c.lineWidth = 2; c.stroke();
  c.strokeStyle = 'rgba(210,170,130,.25)'; c.lineWidth = 1.2; c.beginPath(); c.moveTo(pts[0][0] * 0.3, pts[0][1] * 0.3); c.lineTo(pts[4][0] * 0.8, pts[4][1] * 0.8); c.moveTo(0, 0); c.lineTo(pts[7][0] * 0.7, pts[7][1] * 0.7); c.stroke();
  c.restore();
};
/* personnage vu de dessus */
A.walker = function (c, x, y, ang, phase, o) {
  o = o || {}; const s = o.s || 1;
  c.save(); c.translate(x, y); c.scale(s, s);
  c.fillStyle = 'rgba(0,0,0,.3)'; c.beginPath(); c.ellipse(7, 6, 15, 10, ang, 0, TAU); c.fill();
  c.rotate(ang);
  const sw = Math.sin(phase) * 4, cl = o.cloak || [32, 26, 22], su = o.suit || [58, 46, 36], hd = o.hood || [44, 36, 30];
  c.fillStyle = rgba(mix(cl, [0, 0, 0], 0.3));   // pieds
  c.beginPath(); c.ellipse(sw + 2, -4.5, 5.5, 3, 0, 0, TAU); c.ellipse(-sw + 2, 4.5, 5.5, 3, 0, 0, TAU); c.fill();
  c.fillStyle = rgba(cl);   // cape
  c.beginPath(); c.moveTo(4, -10); c.bezierCurveTo(-8, -14, -19, -10, -23 - Math.abs(sw) * 0.5, -3); c.quadraticCurveTo(-26, 0, -23 - Math.abs(sw) * 0.5, 3); c.bezierCurveTo(-19, 10, -8, 14, 4, 10); c.closePath(); c.fill();
  c.strokeStyle = 'rgba(0,0,0,.28)'; c.lineWidth = 1; c.beginPath(); c.moveTo(0, -6); c.quadraticCurveTo(-10, -5, -19, -2); c.moveTo(0, 6); c.quadraticCurveTo(-10, 5, -19, 2); c.moveTo(-2, 0); c.lineTo(-21, 0); c.stroke();
  c.strokeStyle = 'rgba(255,200,150,.22)'; c.lineWidth = 1.2; c.beginPath(); c.moveTo(4, -10); c.bezierCurveTo(-8, -14, -19, -10, -23, -3); c.stroke();
  c.fillStyle = rgba(su); c.beginPath(); c.ellipse(2, 0, 6.5, 11.5, 0, 0, TAU); c.fill();   // épaules
  c.strokeStyle = rgba(mix(su, [0, 0, 0], 0.4)); c.lineWidth = 3.4; c.lineCap = 'round'; c.beginPath(); c.moveTo(3, -10); c.lineTo(5 + sw * 0.6, -13); c.moveTo(3, 10); c.lineTo(5 - sw * 0.6, 13); c.stroke();
  c.fillStyle = rgba(hd); c.beginPath(); c.arc(3.5, 0, 6, 0, TAU); c.fill();   // capuche
  c.fillStyle = 'rgba(0,0,0,.55)'; c.beginPath(); c.ellipse(7, 0, 3, 3.6, 0, -1.4, 1.4); c.fill();
  c.strokeStyle = 'rgba(255,200,150,.3)'; c.lineWidth = 1; c.beginPath(); c.arc(3.5, 0, 6, -2.4, -0.6); c.stroke();
  if (o.eyes !== false) { c.fillStyle = 'rgba(130,180,255,.95)'; c.fillRect(8.4, -2.4, 1.5, 1.5); c.fillRect(8.4, 1, 1.5, 1.5); }
  c.restore();
};
/* silhouette de face pour les dialogues */
const KINDS = {
  chani: { robe: [34, 27, 23], hood: true, eyes: 'blue', mask: true, h: 1 },
  stilgar: { robe: [48, 38, 28], hood: false, eyes: 'blue', beard: true, wrap: true, h: 1.03 },
  alia: { robe: [12, 10, 12], hood: true, eyes: 'blue', h: 0.82 },
  irulan: { robe: [36, 30, 44], crown: true, h: 1.02, gown: true },
  scytale: { robe: [34, 30, 28], bald: true, hunch: true, h: 0.98 },
  bijaz: { robe: [44, 22, 22], bald: true, h: 0.56, bigHead: true },
  hayt: { robe: [22, 20, 22], bald: false, eyes: 'silver', h: 1.08 },
  paul: { robe: [26, 22, 20], hood: true, eyes: 'blue', h: 1 },
  edric: { tank: true, h: 1.0 },
  jessica: { robe: [28, 24, 24], hood: true, eyes: 'blue', h: 1 },
};
A.KINDS = KINDS;
A.person = function (c, x, y, h, kind, t, o) {
  o = o || {}; const K = KINDS[kind] || KINDS.paul, lit = o.lit === undefined ? 1 : o.lit, hh = h * K.h;
  const br = Math.sin(t * 1.4 + x) * 0.004 * hh;
  c.save(); c.translate(x, y); c.globalAlpha *= 0.35 + 0.65 * lit;
  if (K.tank) {
    const w = hh * 0.52, th = hh * 0.9;
    let g = c.createLinearGradient(0, -th, 0, 0); g.addColorStop(0, 'rgba(255,170,70,.6)'); g.addColorStop(1, 'rgba(210,90,20,.75)');
    c.fillStyle = 'rgba(8,6,6,.9)'; c.fillRect(-w / 2 - 10, -th - 12, w + 20, th + 12);
    c.fillStyle = g; c.fillRect(-w / 2, -th, w, th - 6);
    c.fillStyle = 'rgba(12,6,4,.9)'; c.beginPath();      // navigateur
    c.ellipse(0, -th * 0.5 + Math.sin(t * 0.7) * 5, w * 0.3, th * 0.17, 0.1 * Math.sin(t), 0, TAU); c.fill();
    c.beginPath(); c.ellipse(-w * 0.22, -th * 0.5 + 12, w * 0.12, th * 0.05, 0.4, 0, TAU); c.fill();
    c.strokeStyle = 'rgba(255,214,150,.4)'; c.lineWidth = 2; c.strokeRect(-w / 2, -th, w, th - 6);
    c.restore(); return;
  }
  const rim = o.rim || [255, 190, 120];
  const sh = hh * (K.gown ? 0.17 : 0.13), bw = hh * (K.gown ? 0.3 : 0.22);
  // robe
  c.fillStyle = rgba(K.robe);
  c.beginPath(); c.moveTo(-sh, -hh * 0.78 + br); c.quadraticCurveTo(0, -hh * 0.82, sh, -hh * 0.78 + br);
  c.lineTo(bw, -hh * 0.02); c.lineTo(-bw, -hh * 0.02); c.closePath(); c.fill();
  // lumière de bord
  c.strokeStyle = rgba(rim, 0.5 * lit); c.lineWidth = 2; c.beginPath(); c.moveTo(sh, -hh * 0.78 + br); c.lineTo(bw, -hh * 0.02); c.stroke();
  const hy = -hh * 0.865 + br + (K.hunch ? hh * 0.03 : 0), hr = hh * (K.bigHead ? 0.1 : 0.058);
  // tête
  c.fillStyle = rgba(K.mask ? [30, 24, 22] : [96, 72, 58], 1);
  c.beginPath(); c.ellipse(K.hunch ? hh * 0.02 : 0, hy, hr * 0.88, hr, 0, 0, TAU); c.fill();
  if (K.hood) { c.fillStyle = rgba(K.robe); c.beginPath(); c.moveTo(-hr * 1.5, hy + hr * 1.4); c.quadraticCurveTo(-hr * 1.6, hy - hr * 1.6, 0, hy - hr * 1.5); c.quadraticCurveTo(hr * 1.6, hy - hr * 1.6, hr * 1.5, hy + hr * 1.4); c.quadraticCurveTo(0, hy + hr * 0.6, -hr * 1.5, hy + hr * 1.4); c.fill(); c.fillStyle = 'rgba(0,0,0,.55)'; c.beginPath(); c.ellipse(0, hy + hr * 0.1, hr * 0.78, hr * 0.95, 0, 0, TAU); c.fill(); }
  if (K.wrap) { c.fillStyle = '#2a1f17'; c.beginPath(); c.ellipse(0, hy - hr * 0.5, hr * 1.1, hr * 0.7, 0, Math.PI, TAU); c.fill(); }
  if (K.beard) { c.fillStyle = 'rgba(20,16,14,.9)'; c.beginPath(); c.moveTo(-hr * 0.8, hy + hr * 0.3); c.quadraticCurveTo(0, hy + hr * 2.2, hr * 0.8, hy + hr * 0.3); c.fill(); }
  if (K.crown) { c.strokeStyle = rgba([190, 160, 96], 0.9); c.lineWidth = 2; c.beginPath(); c.moveTo(-hr * 1.1, hy - hr * 0.7); c.lineTo(-hr * 0.5, hy - hr * 2); c.lineTo(0, hy - hr * 1.1); c.lineTo(hr * 0.5, hy - hr * 2); c.lineTo(hr * 1.1, hy - hr * 0.7); c.stroke(); }
  if (K.eyes) {
    c.fillStyle = K.eyes === 'blue' ? `rgba(110,170,255,${0.7 + 0.3 * Math.sin(t * 2)})` : 'rgba(210,220,230,.95)';
    c.beginPath(); c.arc(-hr * 0.36, hy, hr * 0.14, 0, TAU); c.arc(hr * 0.36, hy, hr * 0.14, 0, TAU); c.fill();
  }
  // rim sur la tête
  c.strokeStyle = rgba(rim, 0.4 * lit); c.lineWidth = 1.6; c.beginPath(); c.arc(0, hy, hr * 1.02, -1.1, 0.7); c.stroke();
  if (o.pregnant) { c.fillStyle = rgba(mix(K.robe, [60, 50, 44], 0.3)); c.beginPath(); c.ellipse(0, -hh * 0.42, hh * 0.15, hh * 0.1, 0, 0, TAU); c.fill(); }
  c.restore();
};
/* combattant de profil (duel) : cap vers +x (dir=1) */
A.fighter = function (c, x, y, h, dir, p, o) {
  // p : { lean, arm (rad), arm2, stride, bladeLen, bladeGlow, crouch }
  o = o || {};
  const body = o.body || [22, 18, 16], rim = o.rim || [255, 186, 110];
  c.save(); c.translate(x, y); c.scale(dir, 1);
  c.fillStyle = 'rgba(0,0,0,.4)'; c.beginPath(); c.ellipse(0, 2, h * 0.28, h * 0.035, 0, 0, TAU); c.fill();
  const cr = (p.crouch || 0) * h, hip = [0, -h * 0.5 + cr * 0.5], sh = [h * 0.04 * (p.lean || 0) * 6 + 0, -h * 0.78 + cr];
  const leg = (off, col) => {
    const fx = off * h * 0.2 * (p.stride === undefined ? 0.5 : p.stride) * 2, kx = fx * 0.5 + h * 0.05 * (off > 0 ? 1 : -0.4);
    c.strokeStyle = col; c.lineWidth = h * 0.07; c.lineCap = 'round'; c.lineJoin = 'round';
    c.beginPath(); c.moveTo(hip[0], hip[1]); c.lineTo(kx, -h * 0.25 + cr * 0.3); c.lineTo(fx, 0); c.stroke();
  };
  leg(-1, rgba(mix(body, [0, 0, 0], 0.3))); leg(1, rgba(body));
  // cape
  c.fillStyle = rgba(mix(body, [0, 0, 0], 0.15));
  const sw = (p.cape || 0) * h * 0.1;
  c.beginPath(); c.moveTo(sh[0] - h * 0.03, sh[1]); c.quadraticCurveTo(-h * 0.2 - sw, -h * 0.5, -h * 0.26 - sw * 1.5, -h * 0.04); c.lineTo(-h * 0.04, -h * 0.07); c.quadraticCurveTo(hip[0], hip[1], sh[0] + h * 0.02, sh[1]); c.fill();
  // torse
  c.fillStyle = rgba(body); c.beginPath(); c.moveTo(sh[0] - h * 0.07, sh[1]); c.lineTo(sh[0] + h * 0.07, sh[1] + h * 0.01); c.lineTo(hip[0] + h * 0.07, hip[1]); c.lineTo(hip[0] - h * 0.07, hip[1]); c.closePath(); c.fill();
  c.strokeStyle = rgba(rim, 0.45); c.lineWidth = 2; c.beginPath(); c.moveTo(sh[0] + h * 0.07, sh[1] + h * 0.01); c.lineTo(hip[0] + h * 0.07, hip[1]); c.stroke();
  // tête
  const hd = [sh[0] + h * 0.015 * (p.lean || 0) * 4, sh[1] - h * 0.075];
  c.fillStyle = o.skin ? rgba(o.skin) : rgba([88, 66, 54]); c.beginPath(); c.arc(hd[0], hd[1], h * 0.052, 0, TAU); c.fill();
  if (o.hood) { c.fillStyle = rgba(body); c.beginPath(); c.arc(hd[0] - h * 0.01, hd[1], h * 0.062, Math.PI * 0.55, Math.PI * 1.8); c.fill(); }
  if (o.bald) { c.fillStyle = 'rgba(230,226,220,.35)'; c.beginPath(); c.arc(hd[0], hd[1], h * 0.052, -2.4, -0.4); c.fill(); }
  if (o.eyes) { c.fillStyle = o.eyes; c.fillRect(hd[0] + h * 0.028, hd[1] - h * 0.01, h * 0.016, h * 0.011); }
  // bras arrière
  const arm = (a1, a2, ul, fl, col) => {
    const ex = sh[0] + Math.cos(a1) * ul, ey = sh[1] + Math.sin(a1) * ul, hx = ex + Math.cos(a2) * fl, hy = ey + Math.sin(a2) * fl;
    c.strokeStyle = col; c.lineWidth = h * 0.055; c.lineCap = 'round'; c.beginPath(); c.moveTo(sh[0], sh[1] + h * 0.02); c.lineTo(ex, ey); c.lineTo(hx, hy); c.stroke();
    return [hx, hy, a2];
  };
  arm(1.2, 0.5, h * 0.18, h * 0.17, rgba(mix(body, [0, 0, 0], 0.3)));
  const ex = p.ext || 1, hnd = arm(p.arm === undefined ? 0.6 : p.arm, p.arm2 === undefined ? -0.1 : p.arm2, h * 0.18 * ex, h * 0.17 * ex, rgba(body));
  // lame
  const bl = (p.bladeLen === undefined ? 0.2 : p.bladeLen) * h;
  if (bl > 0) {
    const bx = hnd[0] + Math.cos(hnd[2]) * bl, by = hnd[1] + Math.sin(hnd[2]) * bl;
    if (p.bladeGlow) { c.strokeStyle = rgba(o.glow || [255, 120, 80], 0.5 * p.bladeGlow); c.lineWidth = 8; c.beginPath(); c.moveTo(hnd[0], hnd[1]); c.lineTo(bx, by); c.stroke(); }
    c.strokeStyle = '#d7d2c8'; c.lineWidth = 3; c.beginPath(); c.moveTo(hnd[0], hnd[1]); c.lineTo(bx, by); c.stroke();
    c.fillStyle = '#d7d2c8'; c.beginPath(); c.arc(bx, by, 1.8, 0, TAU); c.fill();
  }
  c.restore();
  return { hx: x + dir * (hnd[0]), hy: y + hnd[1] };
};
/* motifs : points de lumière flottants */
A.motes = function (c, t, n, color, seed, speed) {
  const r = G.rng(seed || 2), W = G.W, H = G.H;
  c.fillStyle = color || 'rgba(255,220,170,.5)';
  for (let i = 0; i < n; i++) { const x = (r() * W + t * (speed || 12) * (0.3 + r())) % W, y = (r() * H + Math.sin(t * 0.4 + i) * 12 + H) % H, s = 1 + r() * 1.6; c.fillRect(x, y, s, s); }
};
})();
