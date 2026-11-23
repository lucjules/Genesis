/* Dune : Genesis — terrain d'Arrakis : dunes procédurales, ombrage, roches, rendu par blocs */
(function () {
'use strict';
const G = window.G;
const { clamp, smooth, fbm, vnoise, TAU } = G;

const PAL = {
  day:   { s: [54, 20, 10], m: [172, 88, 38], l: [244, 184, 114], rs: [40, 27, 20], rl: [178, 134, 102], contrast: 1.05 },
  noon:  { s: [104, 56, 30], m: [220, 146, 80], l: [255, 230, 176], rs: [50, 36, 28], rl: [190, 150, 118], contrast: 0.9 },
  dusk:  { s: [28, 14, 20], m: [140, 68, 46], l: [226, 142, 100], rs: [18, 10, 12], rl: [128, 78, 62], contrast: 1.1 },
  night: { s: [3, 6, 13], m: [18, 28, 46], l: [96, 120, 154], rs: [3, 4, 8], rl: [54, 66, 88], contrast: 1.05 },
  storm: { s: [78, 46, 28], m: [140, 86, 50], l: [204, 150, 104], rs: [40, 28, 22], rl: [120, 90, 70], contrast: 0.7 },
  sonar: { s: [6, 10, 22], m: [48, 74, 120], l: [170, 205, 250], rs: [8, 10, 20], rl: [120, 148, 190], contrast: 1.15 },
  ash:   { s: [10, 10, 11], m: [92, 92, 94], l: [214, 214, 210], rs: [6, 6, 7], rl: [150, 150, 150], contrast: 1.0 },
};
G.PAL = PAL;

class World {
  constructor(o) {
    o = o || {};
    this.seed = o.seed || 7;
    this.pal = PAL[o.pal || 'day'];
    this.wind = o.wind === undefined ? 0.35 : o.wind;
    this.lambda = o.lambda || 300;
    this.amp = o.amp === undefined ? 1 : o.amp;
    this.islands = o.islands || [];
    this.sunAz = this.wind + Math.PI + (o.sunTurn === undefined ? 0.45 : o.sunTurn);   // direction horizontale vers le soleil
    this.sunAlt = o.sunAlt || 0.6;
    this.CH = 512; this.RES = 192;
    this.chunks = new Map(); this.frame = 0;
    this.cosA = Math.cos(this.wind); this.sinA = Math.sin(this.wind);
  }
  rock(x, y) {
    let m = 0;
    for (const i of this.islands) {
      const dx = x - i.x, dy = y - i.y, R = i.r * 1.4;
      if (dx * dx + dy * dy > R * R) continue;
      const n = fbm(x * 0.008, y * 0.008, 4, 91);
      const d = Math.hypot(dx, dy) / i.r + (n - 0.5) * 1.25;
      const v = 1 - smooth(0.82, 1.0, d);
      if (v > m) m = v;
    }
    return m;
  }
  safe(x, y) { return this.rock(x, y) > 0.45; }
  /* bloc de terrain */
  gen(cx, cy) {
    const CH = this.CH, RES = this.RES, M = 34, S = RES + 2 * M, step = CH / RES;
    const x0 = cx * CH - M * step, y0 = cy * CH - M * step;
    const cell = 16, n = Math.ceil(S * step / cell) + 3;
    const gx0 = Math.floor(x0 / cell), gy0 = Math.floor(y0 / cell);
    const cWx = new Float32Array(n * n), cWy = new Float32Array(n * n), cAm = new Float32Array(n * n), cTn = new Float32Array(n * n);
    const sd = this.seed;
    for (let j = 0; j < n; j++) for (let i = 0; i < n; i++) {
      const X = (gx0 + i) * cell, Y = (gy0 + j) * cell, k = j * n + i;
      cWx[k] = (fbm(X * 0.0009, Y * 0.0009, 3, sd) - 0.5) * 320;
      cWy[k] = (fbm(X * 0.0009 + 40, Y * 0.0009 + 11, 3, sd + 5) - 0.5) * 320;
      cAm[k] = 0.3 + 0.7 * smooth(0.28, 0.66, fbm(X * 0.0006 + 7, Y * 0.0006, 3, sd + 9));
      cTn[k] = fbm(X * 0.0009 + 3, Y * 0.0009 + 9, 2, sd + 14);
    }
    const near = this.islands.filter((i) => i.x + i.r * 1.5 > x0 && i.x - i.r * 1.5 < x0 + S * step && i.y + i.r * 1.5 > y0 && i.y - i.r * 1.5 < y0 + S * step);
    const H = new Float32Array(S * S), RK = near.length ? new Float32Array(S * S) : null, TN = new Float32Array(S * S);
    const cosA = this.cosA, sinA = this.sinA, lam = this.lambda, amp = this.amp, H0 = 30 * amp;
    for (let j = 0; j < S; j++) for (let i = 0; i < S; i++) {
      const x = x0 + i * step, y = y0 + j * step;
      const fx = x / cell - gx0, fy = y / cell - gy0, ix = fx | 0, iy = fy | 0, tx = fx - ix, ty = fy - iy, k = iy * n + ix;
      const w00 = (1 - tx) * (1 - ty), w10 = tx * (1 - ty), w01 = (1 - tx) * ty, w11 = tx * ty;
      const wx = cWx[k] * w00 + cWx[k + 1] * w10 + cWx[k + n] * w01 + cWx[k + n + 1] * w11;
      const wy = cWy[k] * w00 + cWy[k + 1] * w10 + cWy[k + n] * w01 + cWy[k + n + 1] * w11;
      const am = cAm[k] * w00 + cAm[k + 1] * w10 + cAm[k + n] * w01 + cAm[k + n + 1] * w11;
      const tn = cTn[k] * w00 + cTn[k + 1] * w10 + cTn[k + n] * w01 + cTn[k + n + 1] * w11;
      // dune principale (profil asymétrique : pente douce au vent, face d'avalanche sous le vent)
      let u = ((x + wx) * cosA + (y + wy) * sinA) / lam; let f = u - Math.floor(u);
      let prof; if (f < 0.8) { const r = f / 0.8; prof = r * Math.sqrt(r); } else { const q = (f - 0.8) / 0.2; prof = 1 - q * q * (3 - 2 * q); }
      // dune secondaire, plus fine et désaxée
      const a2 = 0.22, u2 = ((x + wx * 0.5) * Math.cos(this.wind + a2) + (y + wy * 0.5) * Math.sin(this.wind + a2)) / (lam * 0.42);
      const f2 = u2 - Math.floor(u2);
      let prof2; if (f2 < 0.82) prof2 = f2 / 0.82; else { const q2 = (f2 - 0.82) / 0.18; prof2 = 1 - q2 * q2 * (3 - 2 * q2); }
      // rides de sable
      const rip = Math.sin(((x * cosA + y * sinA) + wx * 0.25 + (vnoise(x * 0.01, y * 0.01, 5) - 0.5) * 60) / 12 * TAU) * 0.055;
      let h = (prof * am * H0 + prof2 * am * H0 * 0.1 + rip * 1.0 * (0.4 + am)) ;
      TN[j * S + i] = tn;
      if (RK) {
        let r = 0;
        for (const isl of near) {
          const dx = x - isl.x, dy = y - isl.y, R = isl.r * 1.4;
          if (dx * dx + dy * dy > R * R) continue;
          const nn = fbm(x * 0.008, y * 0.008, 4, 91);
          const d = Math.hypot(dx, dy) / isl.r + (nn - 0.5) * 1.25;
          const v = 1 - smooth(0.82, 1.0, d); if (v > r) r = v;
        }
        RK[j * S + i] = r;
        if (r > 0) {
          const rg = 1 - Math.abs(2 * fbm(x * 0.011, y * 0.011, 2, 33) - 1);
          const st = Math.sin((x * 0.55 + y) * 0.07 + fbm(x * 0.01, y * 0.01, 2, 61) * 7) * 2.6;
          const rh = 18 * smooth(0, 0.7, r) + 28 * rg * smooth(0.1, 0.9, r) + st * smooth(0.2, 0.8, r) + (vnoise(x * 0.07, y * 0.07, 8) - 0.5) * 1.4;
          h = h * (1 - smooth(0, 0.5, r)) + rh * smooth(0, 0.5, r);
        }
      }
      H[j * S + i] = h;
    }
    // éclairage
    const cv = document.createElement('canvas'); cv.width = cv.height = RES;
    const cx2 = cv.getContext('2d'), img = cx2.createImageData(RES, RES), d = img.data;
    const P = this.pal;
    const Lx = Math.cos(this.sunAz) * Math.cos(this.sunAlt), Ly = Math.sin(this.sunAz) * Math.cos(this.sunAlt), Lz = Math.sin(this.sunAlt);
    const sdx = Math.cos(this.sunAz), sdy = Math.sin(this.sunAz), tanA = Math.tan(this.sunAlt);
    const con = P.contrast;
    for (let j = 0; j < RES; j++) for (let i = 0; i < RES; i++) {
      const I = (j + M) * S + (i + M), h = H[I];
      const dhx = (H[I + 1] - H[I - 1]) / (2 * step) * 2.0, dhy = (H[I + S] - H[I - S]) / (2 * step) * 2.0;
      const nl = 1 / Math.sqrt(dhx * dhx + dhy * dhy + 1);
      let lam = (-dhx * Lx - dhy * Ly + Lz) * nl;
      // ombres portées
      let sh = 0;
      for (let k = 1; k <= 8; k++) {
        const kk = k * 4.2;
        const px = Math.round(i + M + sdx * kk), py = Math.round(j + M + sdy * kk);
        const hh = H[py * S + px];
        const need = h + kk * step * tanA;
        if (hh > need) { sh = 1; break; }
      }
      let v = clamp(lam / 0.95, 0, 1);
      if (sh) v *= 0.42;
      v = 0.1 + 0.9 * v; v = 0.5 + (v - 0.5) * con;
      v = clamp(v, 0, 1);
      const tn = TN[(j + M) * S + (i + M)];
      let r, g, b;
      if (v < 0.5) { const t = v * 2; r = P.s[0] + (P.m[0] - P.s[0]) * t; g = P.s[1] + (P.m[1] - P.s[1]) * t; b = P.s[2] + (P.m[2] - P.s[2]) * t; }
      else { const t = (v - 0.5) * 2; r = P.m[0] + (P.l[0] - P.m[0]) * t; g = P.m[1] + (P.l[1] - P.m[1]) * t; b = P.m[2] + (P.l[2] - P.m[2]) * t; }
      const tv = 0.93 + 0.14 * tn; r *= tv; g *= tv * (0.99 + 0.02 * tn); b *= tv * (1.02 - 0.05 * tn);
      if (RK) {
        const rr = RK[I];
        if (rr > 0.01) {
          const streak = 0.82 + 0.3 * vnoise((cx * CH + i * step) * 0.12, (cy * CH + j * step) * 0.025, 12);
          const vv = clamp((lam / 0.8) * (sh ? 0.3 : 1), 0, 1) * streak;
          const rc = [P.rs[0] + (P.rl[0] - P.rs[0]) * vv, P.rs[1] + (P.rl[1] - P.rs[1]) * vv, P.rs[2] + (P.rl[2] - P.rs[2]) * vv];
          const t = smooth(0.05, 0.55, rr);
          r = r + (rc[0] - r) * t; g = g + (rc[1] - g) * t; b = b + (rc[2] - b) * t;
        }
      }
      const o = (j * RES + i) * 4;
      d[o] = r > 255 ? 255 : r; d[o + 1] = g > 255 ? 255 : g; d[o + 2] = b > 255 ? 255 : b; d[o + 3] = 255;
    }
    cx2.putImageData(img, 0, 0);
    return cv;
  }
  get(cx, cy, canGen) {
    const key = cx + ',' + cy; let c = this.chunks.get(key);
    if (c) { c.used = this.frame; return c; }
    if (!canGen) return null;
    c = { cv: this.gen(cx, cy), used: this.frame };
    this.chunks.set(key, c);
    if (this.chunks.size > 60) {
      let oldest = null, ok = null;
      for (const [k, v] of this.chunks) if (!oldest || v.used < oldest.used) { oldest = v; ok = k; }
      if (ok) this.chunks.delete(ok);
    }
    return c;
  }
  /* dessine la zone visible (camX, camY = coin haut-gauche monde) ; génère au plus `budget` blocs visibles par image,
     puis préchauffe en douceur les blocs voisins (un par image) */
  draw(ctx, camX, camY, vw, vh, zoom, budget) {
    zoom = zoom || 1; this.frame++;
    const CH = this.CH, wx = vw / zoom, wy = vh / zoom;
    const c0 = Math.floor(camX / CH), c1 = Math.floor((camX + wx) / CH), r0 = Math.floor(camY / CH), r1 = Math.floor((camY + wy) / CH);
    const P = this.pal; let left = budget === undefined ? 1 : budget;
    ctx.fillStyle = `rgb(${P.m[0] | 0},${P.m[1] | 0},${P.m[2] | 0})`; ctx.fillRect(0, 0, vw, vh);
    ctx.imageSmoothingEnabled = true;
    for (let cy = r0; cy <= r1; cy++) for (let cx = c0; cx <= c1; cx++) {
      let ch = this.get(cx, cy, false);
      if (!ch && left > 0) { ch = this.get(cx, cy, true); left--; }
      if (!ch) continue;
      ctx.drawImage(ch.cv, Math.floor((cx * CH - camX) * zoom), Math.floor((cy * CH - camY) * zoom), Math.ceil(CH * zoom) + 1, Math.ceil(CH * zoom) + 1);
    }
    if (left > 0 && budget !== 999) {      // préchargement des voisins
      for (let cy = r0 - 1; cy <= r1 + 1 && left > 0; cy++) for (let cx = c0 - 1; cx <= c1 + 1 && left > 0; cx++) {
        if (!this.get(cx, cy, false)) { this.get(cx, cy, true); left = 0; }
      }
    }
  }
  warm(camX, camY, vw, vh, zoom) {
    const saved = this.frame; this.draw({ drawImage() {}, set fillStyle(v) {}, fillRect() {}, set imageSmoothingEnabled(v) {}, set imageSmoothingQuality(v) {} }, camX, camY, vw, vh, zoom, 999);
    this.frame = saved + 1;
  }
}
G.World = World;
})();
