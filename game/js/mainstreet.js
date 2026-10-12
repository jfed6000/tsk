// Texas Shitkickers — Main Street at dusk: the backdrop for the darker brawler stage.
//   far    (scroll x0.25): a blood-red sunset going down behind the mesas, streaks of lit cloud
//   mid    (scroll x0.5):  water tower, church steeple, windmill and telegraph line above the rooftops
//   street (scroll x1, a tile map on the F256): false-front buildings, awnings, boardwalk, the dirt street itself
// Night falls as you fight: T.shadeOf darkens a layer toward night, except the "light" colours (lit windows,
// lanterns, the sun). On the F256 that's a CLUT fade that never writes those entries.
(function () {
'use strict';
const T = window.TSK;
const { PAL, CLUT } = T;
function ell(x, cx, cy, rx, ry) { x.beginPath(); x.ellipse(cx, cy, rx, ry, 0, 0, Math.PI * 2); }
function rng(seed) { return () => (seed = (seed * 16807) % 2147483647) / 2147483647; }

const LIGHT = { win0: '#f0a840', win1: '#ffd878', lamp0: '#ffd060', lamp1: '#fff0b0', halo: '#f08a30', sun0: '#ff7a2a', sun1: '#ffb050' };
T.MAIN_STREET_LIGHTS = new Set(Object.values(LIGHT).map(c => c.toLowerCase()));

T.buildMainStreet = function (VW, VH, FLOOR) {
  const L = {}, r = rng(41);

  // ---- far: the sunset
  const far = T.canvas(640, VH), f = far.getContext('2d');
  const bands = ['#1e1236', '#2a1440', '#3e1840', '#5a1c3e', '#7e223a', '#a62e34', '#cc4430', '#e8642c', '#f4863a'];
  const bh = Math.ceil(92 / bands.length);
  bands.forEach((col, i) => {
    f.fillStyle = col; f.fillRect(0, i * bh, 640, bh);
    if (i > 0) { f.fillStyle = bands[i - 1]; for (let y = 0; y < 3; y++) for (let x = y % 2; x < 640; x += 2) if (y < 2 || x % 4 === 0) f.fillRect(x, i * bh + y, 1, 1); }
  });
  f.fillStyle = bands[bands.length - 1]; f.fillRect(0, bh * bands.length, 640, VH);
  f.fillStyle = LIGHT.sun0; ell(f, 210, 70, 26, 26); f.fill();
  f.fillStyle = LIGHT.sun1; ell(f, 206, 66, 17, 17); f.fill();
  for (let i = 0; i < 7; i++) {                                // long streaks of cloud, lit from below
    const y = 12 + r() * 52, x = r() * 640, w = 60 + r() * 120;
    f.fillStyle = '#5a1c3e'; f.fillRect(x, y, w, 2);
    f.fillStyle = '#e8642c'; f.fillRect(x + 6, y + 2, w - 14, 1);
  }
  f.fillStyle = '#3e1a3a'; f.beginPath(); f.moveTo(0, VH);       // far hills, then mesas in silhouette
  for (let x = 0; x <= 640; x += 8) f.lineTo(x, 88 - 6 * Math.sin(x / 640 * Math.PI * 4));
  f.lineTo(640, VH); f.fill();
  f.fillStyle = '#2a1430';
  let x = -10;
  while (x < 650) {
    const w = 50 + r() * 90, h = 14 + r() * 26, sl = 6 + r() * 8;
    f.beginPath(); f.moveTo(x, 120); f.lineTo(x + sl, 98 - h); f.lineTo(x + w - sl, 98 - h); f.lineTo(x + w, 120); f.fill();
    x += w * (0.9 + r() * 0.8);
  }
  f.fillRect(0, 98, 640, VH);
  const FP = { k0: bands[0], k1: bands[1], k2: bands[2], k3: bands[3], k4: bands[4], k5: bands[5], k6: bands[6], k7: bands[7], k8: bands[8], h0: '#3e1a3a', h1: '#2a1430', s0: LIGHT.sun0, s1: LIGHT.sun1 };
  L.far = T.pixelize(far, FP, null, CLUT.bg);

  // ---- mid: the far side of town above the rooftops
  const mid = T.canvas(800, VH), m = mid.getContext('2d');
  const S = '#24122e';
  m.fillStyle = S;
  m.fillRect(110, 24, 34, 22); m.beginPath(); m.moveTo(106, 24); m.lineTo(127, 12); m.lineTo(148, 24); m.fill();   // water tower
  for (const lx of [114, 124, 132, 140]) m.fillRect(lx, 46, 2, 70);
  m.fillRect(112, 70, 32, 2);
  m.beginPath(); m.moveTo(420, 120); m.lineTo(420, 36); m.lineTo(432, 8); m.lineTo(444, 36); m.lineTo(444, 120); m.fill();     // steeple
  m.fillRect(431, 0, 2, 10); m.fillRect(427, 3, 10, 2);
  m.fillRect(640, 40, 3, 80);                                     // windmill
  for (let a = 0; a < 8; a++) { const ca = Math.cos(a * Math.PI / 4), sa = Math.sin(a * Math.PI / 4); m.save(); m.translate(641, 38); m.rotate(a * Math.PI / 4); m.fillRect(0, -1, 14, 2); m.restore(); }
  m.strokeStyle = S; m.lineWidth = 1;                             // telegraph line
  for (let px = 20; px < 800; px += 110) {
    m.fillRect(px, 48, 2, 70); m.fillRect(px - 5, 50, 12, 2);
    m.beginPath(); m.moveTo(px - 4, 51); m.quadraticCurveTo(px + 51, 60, px + 106, 51); m.stroke();
  }
  L.mid = T.pixelize(mid, { s: S }, null, CLUT.bg);

  // ---- street: false-front buildings, awnings, boardwalk, and the dirt street
  const W = 960, st = T.canvas(W, VH), s = st.getContext('2d');
  const C = {
    out: PAL.out, trim: '#1e1218', dark: '#140c18', sign: '#2a1818', ink: '#e8c890',
    red0: '#4a1e22', red1: '#6a2e2e', red2: '#8a4038', teal0: '#1e3436', teal1: '#2e4a4a', teal2: '#40605c',
    gry0: '#2e2c3a', gry1: '#4a4858', gry2: '#64607a', brn0: '#3a2620', brn1: '#5a3a2e', brn2: '#7a5040',
    pur0: '#2a1e2e', pur1: '#3e2c42', pur2: '#56405a',
    awn0: '#2e1a22', awn1: '#4a2c32', post: '#2a1a20', paper: '#d8c8a0', papr2: '#a89878',
    walk0: '#4a3230', walk1: '#6a4a3a', walk2: '#8a6448', walkF: '#33221f',
    dirt0: '#3a2826', dirt1: '#4e3430', dirt2: '#644238', dirt3: '#7a5040', rut: '#2e201e',
    batw: '#8a5a3a', ...LIGHT,
  };
  const hue = { red: [C.red0, C.red1, C.red2], teal: [C.teal0, C.teal1, C.teal2], gry: [C.gry0, C.gry1, C.gry2], brn: [C.brn0, C.brn1, C.brn2], pur: [C.pur0, C.pur1, C.pur2] };
  const WALK = 134, FRONT = 146, AWN = 88;
  const BUILDINGS = [
    [0, 128, 50, 'SALOON', 'red', 'saloon'], [128, 112, 66, 'STORE', 'teal', 'store'], [240, 96, 60, 'BANK', 'gry', 'bank'],
    [336, 104, 70, 'SHERIFF', 'brn', 'jail'], [440, 120, 48, 'HOTEL', 'pur', 'hotel'], [560, 112, 62, 'UNDERTAKER', 'gry', 'coffins'],
    [672, 24, 0, null, null, 'alley'], [696, 136, 52, 'GUNSMITH', 'red', 'store'], [832, 128, 66, 'LIVERY', 'brn', 'barn'],
  ];
  const window_ = (wx, wy, w, h, lit) => {
    s.fillStyle = C.trim; s.fillRect(wx - 1, wy - 1, w + 2, h + 2);
    s.fillStyle = lit ? C.win0 : C.dark; s.fillRect(wx, wy, w, h);
    if (lit) { s.fillStyle = C.win1; s.fillRect(wx + 1, wy + 1, w - 2, (h >> 1) - 1); }
    s.fillStyle = C.trim; s.fillRect(wx + (w >> 1), wy, 1, h); s.fillRect(wx, wy + (h >> 1), w, 1);
  };
  const poster = (px, py) => {
    s.fillStyle = C.paper; s.fillRect(px, py, 9, 12);
    s.fillStyle = C.papr2; s.fillRect(px + 1, py + 1, 7, 2); s.fillRect(px + 3, py + 4, 3, 3); s.fillRect(px + 1, py + 8, 7, 1); s.fillRect(px + 1, py + 10, 5, 1);
  };
  for (const [bx, bw, top, name, h, kind] of BUILDINGS) {
    if (kind === 'alley') {                                      // a dark gap between buildings
      s.fillStyle = C.dark; s.fillRect(bx, 80, bw, WALK - 80);
      s.fillStyle = C.pur0; s.fillRect(bx + 4, 96, 10, 38);
      continue;
    }
    const [c0, c1, c2] = hue[h];
    s.fillStyle = c1; s.fillRect(bx, top, bw, WALK - top);       // the false front
    s.fillStyle = c0; for (let y = top + 3; y < WALK; y += 4) s.fillRect(bx, y, bw, 1);   // siding
    s.fillStyle = c2; s.fillRect(bx, top, bw, 2);
    s.fillStyle = C.trim; s.fillRect(bx, top - 3, bw, 3); s.fillRect(bx, top, 2, WALK - top); s.fillRect(bx + bw - 2, top, 2, WALK - top);
    if (kind === 'saloon' || kind === 'hotel') {                 // a stepped or arched parapet
      s.fillStyle = c1; s.fillRect(bx + bw / 2 - 18, top - 10, 36, 10);
      s.fillStyle = C.trim; s.fillRect(bx + bw / 2 - 18, top - 12, 36, 2);
    }
    // the sign board
    const tw = T.textWidth(name, 2), sx = bx + ((bw - tw) >> 1);
    s.fillStyle = C.sign; s.fillRect(sx - 4, top + 6, tw + 8, 14);
    s.fillStyle = C.trim; s.fillRect(sx - 4, top + 6, tw + 8, 1); s.fillRect(sx - 4, top + 19, tw + 8, 1);
    T.drawText(s, name, sx, top + 8, C.ink, 2, null);
    // upper windows, some lit
    const wy = top + 23, wh = Math.min(16, AWN - 3 - wy);
    if (wh >= 7) for (let i = 0; i < 2; i++) window_(bx + bw * (0.22 + 0.42 * i), wy, 12, wh, r() < 0.6);
    // ground floor, under the awning
    const door = bx + (bw >> 1) - 8;
    s.fillStyle = C.dark; s.fillRect(door, 100, 16, WALK - 100);
    if (kind === 'saloon') {                                    // batwing doors with light behind them
      s.fillStyle = C.win0; s.fillRect(door, 100, 16, 18);
      s.fillStyle = C.batw; s.fillRect(door, 108, 7, 14); s.fillRect(door + 9, 108, 7, 14);
      s.fillStyle = C.trim; s.fillRect(door + 7, 108, 2, 14);
    }
    if (kind === 'store' || kind === 'bank' || kind === 'hotel') { window_(bx + 6, 104, 22, 18, r() < 0.8); window_(bx + bw - 28, 104, 22, 18, r() < 0.5); }
    if (kind === 'jail') { s.fillStyle = C.dark; s.fillRect(bx + 8, 104, 20, 16); s.fillStyle = C.gry2; for (let i = 0; i < 5; i++) s.fillRect(bx + 10 + i * 4, 104, 1, 16); }
    if (kind === 'coffins') {                                   // coffins leaned up out front
      for (const cx of [bx + 8, bx + bw - 20]) { s.fillStyle = C.brn1; s.beginPath(); s.moveTo(cx + 3, 104); s.lineTo(cx + 9, 104); s.lineTo(cx + 12, 110); s.lineTo(cx + 9, WALK); s.lineTo(cx + 3, WALK); s.lineTo(cx, 110); s.fill(); s.fillStyle = C.trim; s.fillRect(cx + 5, 108, 2, 8); }
    }
    if (kind === 'barn') { s.fillStyle = C.brn0; s.fillRect(door - 10, 100, 36, WALK - 100); s.strokeStyle = C.brn2; s.lineWidth = 1; s.beginPath(); s.moveTo(door - 10, 100); s.lineTo(door + 26, WALK); s.moveTo(door + 26, 100); s.lineTo(door - 10, WALK); s.stroke(); }
    if (r() < 0.8) poster(door - 16, 106);
    if (r() < 0.5) poster(door + 22, 108);
    // the awning: a sloped porch roof on posts, with lanterns
    s.fillStyle = C.awn0; s.beginPath(); s.moveTo(bx, AWN); s.lineTo(bx + bw, AWN); s.lineTo(bx + bw, AWN + 8); s.lineTo(bx, AWN + 8); s.fill();
    s.fillStyle = C.awn1; s.fillRect(bx, AWN + 6, bw, 3);
    s.fillStyle = C.trim; s.fillRect(bx, AWN + 9, bw, 1);
    s.fillStyle = C.post; for (const px of [bx + 3, bx + bw - 6]) s.fillRect(px, AWN + 9, 3, WALK - AWN - 9);
    if (r() < 0.75) {
      const lx = bx + (bw >> 1) + (r() < 0.5 ? -26 : 22);
      s.fillStyle = C.halo; s.fillRect(lx - 2, AWN + 13, 9, 9);
      s.fillStyle = C.trim; s.fillRect(lx + 2, AWN + 9, 1, 3);
      s.fillStyle = C.lamp0; s.fillRect(lx, AWN + 12, 5, 7); s.fillStyle = C.lamp1; s.fillRect(lx + 1, AWN + 14, 3, 3);
    }
  }
  // boardwalk: plank tops, then the front face
  s.fillStyle = C.walk1; s.fillRect(0, WALK, W, 6);
  s.fillStyle = C.walk2; s.fillRect(0, WALK, W, 1);
  s.fillStyle = C.walk0; for (let px = 0; px < W; px += 9) s.fillRect(px, WALK + 1, 1, 5);
  s.fillStyle = C.walkF; s.fillRect(0, WALK + 6, W, FRONT - WALK - 6);
  s.fillStyle = C.trim; for (let px = 4; px < W; px += 24) s.fillRect(px, WALK + 6, 2, FRONT - WALK - 6);
  s.fillStyle = C.out; s.fillRect(0, FRONT, W, 1);
  // the street: dusky dirt with wagon ruts
  const dirt = [[FRONT + 1, C.dirt3], [FRONT + 12, C.dirt2], [FRONT + 40, C.dirt1], [FRONT + 70, C.dirt0]];
  for (const [y, col] of dirt) { s.fillStyle = col; s.fillRect(0, y, W, VH - y); }
  s.fillStyle = C.dirt0; s.fillRect(0, FRONT + 1, W, 2);              // the boardwalk's shadow
  for (const y of [FRONT + 26, FRONT + 31, FRONT + 58, FRONT + 64]) { s.fillStyle = C.rut; s.fillRect(0, y, W, 1); }
  for (let i = 0; i < 260; i++) { const px = (r() * W) | 0, py = FRONT + 4 + ((r() * (VH - FRONT - 4)) | 0); s.fillStyle = r() < 0.5 ? C.dirt3 : C.rut; s.fillRect(px, py, 1 + (r() < 0.2 ? 1 : 0), 1); }
  L.street = T.pixelize(st, C, null, CLUT.bg);
  return L;
};

// a layer darkened toward night by k (0..1), leaving the light sources alone; cached per step
const NIGHT = T.rgb('#120a22');
T.shadeOf = function (cv, k) {
  if (k <= 0) return cv;
  const step = Math.round(k * 20);
  cv._shade = cv._shade || {};
  if (cv._shade[step]) return cv._shade[step];
  const c = T.canvas(cv.width, cv.height), ctx = c.getContext('2d');
  const img = ctx.createImageData(cv.width, cv.height), d = img.data, f = step / 20;
  const lut = cv.clut.colors.map(h => {
    if (!h) return null;
    const col = T.rgb(h);
    return T.MAIN_STREET_LIGHTS.has(h) ? col : col.map((v, j) => Math.round(v * (1 - f) + NIGHT[j] * f));
  });
  for (let i = 0; i < cv.idx.length; i++) {
    const k2 = cv.idx[i]; if (!k2) continue;
    const col = lut[k2];
    d[i * 4] = col[0]; d[i * 4 + 1] = col[1]; d[i * 4 + 2] = col[2]; d[i * 4 + 3] = 255;
  }
  ctx.putImageData(img, 0, 0);
  return (cv._shade[step] = c);
};

// a tumbleweed, pre-rotated (no rotation in hardware)
T.buildTumbleweed = function () {
  const TW = { a: '#a8804e', b: '#7a5634', c: '#c09a62' };
  const frames = [];
  for (let i = 0; i < 4; i++) {
    const c = T.canvas(24, 24), x = c.getContext('2d'), rr = rng(5);
    x.translate(12, 12); x.rotate(i * Math.PI / 8);
    for (let k = 0; k < 16; k++) {
      x.strokeStyle = [TW.a, TW.b, TW.c][k % 3]; x.lineWidth = 1;
      const a0 = rr() * Math.PI * 2, rad = 4 + rr() * 6;
      x.beginPath(); x.arc((rr() - 0.5) * 4, (rr() - 0.5) * 4, rad, a0, a0 + 1.5 + rr() * 2); x.stroke();
    }
    const o = T.pixelize(c, TW, null, CLUT.spr); o.ox = 12; o.oy = 22;
    frames.push(o);
  }
  return frames;
};
})();
