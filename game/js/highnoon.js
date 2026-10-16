// Texas Shitkickers — High Noon: level 7, the last (story.md: "Diamondback, Main Street, clock tower. A duel, then the
// fight."). Main Street again, in the white glare of noon - the same town as level 2, bleached - and at the end of it
// the town hall's clock tower, where Diamondback waits.
//   far    (scroll x0.25): the noon sky, the sun straight overhead, pale mesas in the heat
//   mid    (scroll x0.5): the far side of town above the rooftops
//   street (scroll x1, one strip): the false fronts in daylight, then the plaza and the town hall (PLAZA on)
// Sprites: the clock's hands (11:59, then noon), Diamondback (64x64 like the other bosses, facing right, origin at the
// bottom of his coils), the snakeskin boots of the epilogue. Layers for the ending: Boot Hill at sunset (Main Street's
// sunset sky over the graveyard) and the boot shop's shelf.
(function () {
'use strict';
const T = window.TSK;
const { PAL, CLUT } = T;
const ell = (c, x, y, rx, ry) => { c.beginPath(); c.ellipse(x, y, rx, ry, 0, 0, Math.PI * 2); };
function rng(seed) { return () => (seed = (seed * 16807) % 2147483647) / 2147483647; }

// W: the strip; PLAZA: where the plaza starts (the duel's locked screen, PLAZA .. PLAZA + 320); CLOCK: the clock's
// centre (its hands are a sprite there)
T.NOON = { W: 1600, PLAZA: 1280, CLOCK: { x: 1440, y: 44 } };

T.buildNoon = function (VW, VH, FLOOR) {
  const L = {}, r = rng(51), N = T.NOON;
  // ---- far: noon, the sun straight overhead
  const far = T.canvas(640, VH), f = far.getContext('2d');
  const bands = ['#4a86c8', '#5a94cc', '#6ca2d0', '#80b0d4', '#96bcd4', '#acc8d2', '#c2d2cc', '#d6dac4'];
  const bh = Math.ceil(100 / bands.length);
  bands.forEach((col, i) => {
    f.fillStyle = col; f.fillRect(0, i * bh, 640, bh);
    if (i > 0) { f.fillStyle = bands[i - 1]; for (let y = 0; y < 3; y++) for (let x = y % 2; x < 640; x += 2) if (y < 2 || x % 4 === 0) f.fillRect(x, i * bh + y, 1, 1); }
  });
  f.fillStyle = bands[bands.length - 1]; f.fillRect(0, bh * bands.length, 640, VH);
  const SUN0 = '#fff8d8', SUN1 = '#ffffff';
  f.fillStyle = SUN0; ell(f, 320, 8, 16, 16); f.fill(); f.fillStyle = SUN1; ell(f, 320, 8, 10, 10); f.fill();
  let x = -20;                                                     // pale mesas shimmering in the heat
  while (x < 660) {
    const w = 60 + r() * 120, h = 10 + r() * 22;
    f.fillStyle = '#c4b0a0'; f.fillRect(x + 8, 108 - h, w - 16, h + 10); f.fillRect(x, 108 - h * 0.45, w, h);
    f.fillStyle = '#d4c4b4'; f.fillRect(x + 8, 108 - h, w - 16, 1);
    x += w * (1.1 + r());
  }
  f.fillStyle = '#d8c09a'; f.fillRect(0, 110, 640, VH);
  const FP = {}; bands.forEach((b, i) => FP['k' + i] = b);
  Object.assign(FP, { s0: SUN0, s1: SUN1, m0: '#c4b0a0', m1: '#d4c4b4', g0: '#d8c09a' });
  L.far = T.pixelize(far, FP, null, CLUT.bg);

  // ---- mid: the far side of town (Main Street's skyline, bleached by the glare)
  const mid = T.canvas(800, VH), m = mid.getContext('2d');
  const S = '#a8988c', S2 = '#bcae9e';
  m.fillStyle = S;
  m.fillRect(110, 24, 34, 22); m.beginPath(); m.moveTo(106, 24); m.lineTo(127, 12); m.lineTo(148, 24); m.fill();   // water tower
  for (const lx of [114, 124, 132, 140]) m.fillRect(lx, 46, 2, 70);
  m.fillRect(112, 70, 32, 2);
  m.beginPath(); m.moveTo(420, 120); m.lineTo(420, 36); m.lineTo(432, 8); m.lineTo(444, 36); m.lineTo(444, 120); m.fill();     // steeple
  m.fillRect(431, 0, 2, 10); m.fillRect(427, 3, 10, 2);
  m.fillRect(640, 40, 3, 80);                                      // windmill
  for (let a = 0; a < 8; a++) { m.save(); m.translate(641, 38); m.rotate(a * Math.PI / 4); m.fillRect(0, -1, 14, 2); m.restore(); }
  m.strokeStyle = S; m.lineWidth = 1;
  for (let px = 20; px < 800; px += 110) {
    m.fillRect(px, 48, 2, 70); m.fillRect(px - 5, 50, 12, 2);
    m.beginPath(); m.moveTo(px - 4, 51); m.quadraticCurveTo(px + 51, 60, px + 106, 51); m.stroke();
  }
  m.fillStyle = S2; for (let px = 0; px < 800; px += 3) m.fillRect(px, 118 + ((px * 7) % 5), 2, 2);
  L.mid = T.pixelize(mid, { s: S, s2: S2 }, null, CLUT.bg);

  // ---- street: Main Street's false fronts in the noon glare, then the plaza and the town hall
  const W = N.W, st = T.canvas(W, VH), s = st.getContext('2d');
  const C = {
    out: PAL.out, trim: '#4a3428', dark: '#2a1c18', sign: '#5a3a28', ink: '#f8e8c0', shade: '#6a5040',
    red0: '#8a4436', red1: '#a8584a', red2: '#c87460', teal0: '#4a7068', teal1: '#5e8a80', teal2: '#7aa89a',
    gry0: '#7a7684', gry1: '#9894a2', gry2: '#b4b0bc', brn0: '#7a5440', brn1: '#966a52', brn2: '#b48a6a',
    pur0: '#6a5470', pur1: '#84708a', pur2: '#a08ca4',
    awn0: '#5a3a2e', awn1: '#7a5240', post: '#4a3428', paper: '#f4ead0', papr2: '#c8b898', glass: '#3a4048', glint: '#a8c0d0',
    walk0: '#8a6a50', walk1: '#a8865e', walk2: '#c8a474', walkF: '#5a4434',
    dirt0: '#b08a62', dirt1: '#c49a6c', dirt2: '#d4ac7a', dirt3: '#e2bc8a', rut: '#9a7652',
    batw: '#c8905a', brick0: '#8a4a36', brick1: '#a85e44', white0: '#d8d0c0', white1: '#f0eadc', face: '#f8f4e8', roman: '#2a1c18',
    bell: '#c8a040', copper: '#5a9a7a',
  };
  const hue = { red: [C.red0, C.red1, C.red2], teal: [C.teal0, C.teal1, C.teal2], gry: [C.gry0, C.gry1, C.gry2], brn: [C.brn0, C.brn1, C.brn2], pur: [C.pur0, C.pur1, C.pur2] };
  const WALK = 134, FRONT = 146, AWN = 88;
  const BUILDINGS = [
    [0, 128, 50, 'SALOON', 'red', 'saloon'], [128, 112, 66, 'STORE', 'teal', 'store'], [240, 96, 60, 'BANK', 'gry', 'bank'],
    [336, 104, 70, 'SHERIFF', 'brn', 'jail'], [440, 120, 48, 'HOTEL', 'pur', 'hotel'], [560, 112, 62, 'UNDERTAKER', 'gry', 'coffins'],
    [672, 24, 0, null, null, 'alley'], [696, 136, 52, 'GUNSMITH', 'red', 'store'], [832, 128, 66, 'LIVERY', 'brn', 'barn'],
    [960, 112, 58, 'BARBER', 'teal', 'store'], [1072, 24, 0, null, null, 'alley'], [1096, 144, 54, 'ASSAYER', 'pur', 'bank'],
  ];
  const window_ = (wx, wy, w, h) => {                              // daylight: dark glass, a glint
    s.fillStyle = C.trim; s.fillRect(wx - 1, wy - 1, w + 2, h + 2);
    s.fillStyle = C.glass; s.fillRect(wx, wy, w, h);
    s.fillStyle = C.glint; s.fillRect(wx + 1, wy + 1, 2, 1); s.fillRect(wx + 1, wy + 2, 1, 1);
    s.fillStyle = C.trim; s.fillRect(wx + (w >> 1), wy, 1, h); s.fillRect(wx, wy + (h >> 1), w, 1);
  };
  const poster = (px, py) => {
    s.fillStyle = C.paper; s.fillRect(px, py, 9, 12);
    s.fillStyle = C.papr2; s.fillRect(px + 1, py + 1, 7, 2); s.fillRect(px + 3, py + 4, 3, 3); s.fillRect(px + 1, py + 8, 7, 1); s.fillRect(px + 1, py + 10, 5, 1);
  };
  for (const [bx, bw, top, name, h, kind] of BUILDINGS) {
    if (kind === 'alley') { s.fillStyle = C.dark; s.fillRect(bx, 80, bw, WALK - 80); s.fillStyle = C.shade; s.fillRect(bx + 4, 96, 10, 38); continue; }
    const [c0, c1, c2] = hue[h];
    s.fillStyle = c1; s.fillRect(bx, top, bw, WALK - top);
    s.fillStyle = c0; for (let y = top + 3; y < WALK; y += 4) s.fillRect(bx, y, bw, 1);
    s.fillStyle = c2; s.fillRect(bx, top, bw, 2);
    s.fillStyle = C.trim; s.fillRect(bx, top - 3, bw, 3); s.fillRect(bx, top, 2, WALK - top); s.fillRect(bx + bw - 2, top, 2, WALK - top);
    if (kind === 'saloon' || kind === 'hotel') { s.fillStyle = c1; s.fillRect(bx + bw / 2 - 18, top - 10, 36, 10); s.fillStyle = C.trim; s.fillRect(bx + bw / 2 - 18, top - 12, 36, 2); }
    const tw = T.textWidth(name, 2), sx = bx + ((bw - tw) >> 1);
    s.fillStyle = C.sign; s.fillRect(sx - 4, top + 6, tw + 8, 14);
    s.fillStyle = C.trim; s.fillRect(sx - 4, top + 6, tw + 8, 1); s.fillRect(sx - 4, top + 19, tw + 8, 1);
    T.drawText(s, name, sx, top + 8, C.ink, 2, null);
    const wy = top + 23, wh = Math.min(16, AWN - 3 - wy);
    if (wh >= 7) for (let i = 0; i < 2; i++) window_(bx + bw * (0.22 + 0.42 * i), wy, 12, wh);
    const door = bx + (bw >> 1) - 8;
    s.fillStyle = C.shade; s.fillRect(bx + 2, AWN + 9, bw - 4, WALK - AWN - 9);   // the shade under the awning
    s.fillStyle = C.dark; s.fillRect(door, 100, 16, WALK - 100);
    if (kind === 'saloon') { s.fillStyle = C.batw; s.fillRect(door, 108, 7, 14); s.fillRect(door + 9, 108, 7, 14); s.fillStyle = C.trim; s.fillRect(door + 7, 108, 2, 14); }
    if (kind === 'store' || kind === 'bank' || kind === 'hotel') { window_(bx + 6, 104, 22, 18); window_(bx + bw - 28, 104, 22, 18); }
    if (kind === 'jail') { s.fillStyle = C.dark; s.fillRect(bx + 8, 104, 20, 16); s.fillStyle = C.gry2; for (let i = 0; i < 5; i++) s.fillRect(bx + 10 + i * 4, 104, 1, 16); }
    if (kind === 'coffins') for (const cx of [bx + 8, bx + bw - 20]) { s.fillStyle = C.brn1; s.beginPath(); s.moveTo(cx + 3, 104); s.lineTo(cx + 9, 104); s.lineTo(cx + 12, 110); s.lineTo(cx + 9, WALK); s.lineTo(cx + 3, WALK); s.lineTo(cx, 110); s.fill(); }
    if (kind === 'barn') { s.fillStyle = C.brn0; s.fillRect(door - 10, 100, 36, WALK - 100); s.strokeStyle = C.brn2; s.lineWidth = 1; s.beginPath(); s.moveTo(door - 10, 100); s.lineTo(door + 26, WALK); s.moveTo(door + 26, 100); s.lineTo(door - 10, WALK); s.stroke(); }
    if (r() < 0.8) poster(door - 16, 106);
    if (r() < 0.5) poster(door + 22, 108);
    s.fillStyle = C.awn0; s.fillRect(bx, AWN, bw, 8);
    s.fillStyle = C.awn1; s.fillRect(bx, AWN + 6, bw, 3);
    s.fillStyle = C.trim; s.fillRect(bx, AWN + 9, bw, 1);
    s.fillStyle = C.post; for (const px of [bx + 3, bx + bw - 6]) s.fillRect(px, AWN + 9, 3, WALK - AWN - 9);
  }
  // the town hall: two storeys of brick, a white clock tower, the bell up top (the clock's hands are a sprite)
  const HX = N.CLOCK.x, H0 = HX - 100, H1 = HX + 100;
  s.fillStyle = C.brick1; s.fillRect(H0, 70, H1 - H0, WALK - 70);
  s.fillStyle = C.brick0; for (let y = 72; y < WALK; y += 4) for (let px = H0 + ((y >> 2) % 2) * 4; px < H1; px += 8) s.fillRect(px, y, 1, 3);
  for (let y = 72; y < WALK; y += 4) { s.fillStyle = C.brick0; s.fillRect(H0, y + 3, H1 - H0, 1); }
  s.fillStyle = C.white0; s.fillRect(H0 - 4, 66, H1 - H0 + 8, 6); s.fillRect(H0 - 2, 100, H1 - H0 + 4, 4);
  s.fillStyle = C.trim; s.fillRect(H0 - 4, 65, H1 - H0 + 8, 1);
  for (const wx of [H0 + 14, H0 + 44, H1 - 58, H1 - 28]) { window_(wx, 76, 14, 18); window_(wx, 108, 14, 20); }
  s.fillStyle = C.dark; s.fillRect(HX - 14, 106, 28, WALK - 106); ell(s, HX, 106, 14, 8); s.fill();   // the doors
  s.fillStyle = C.brn1; s.fillRect(HX - 12, 108, 11, WALK - 108); s.fillRect(HX + 1, 108, 11, WALK - 108);
  T.drawText(s, 'TOWN HALL', HX, 58 + 13, C.ink, 1, C.trim, 'center');
  s.fillStyle = C.white0; s.fillRect(HX - 22, 8, 44, 58);         // the tower
  s.fillStyle = C.white1; s.fillRect(HX - 20, 8, 40, 58);
  s.fillStyle = C.trim; s.fillRect(HX - 22, 8, 1, 58); s.fillRect(HX + 21, 8, 1, 58);
  s.fillStyle = C.copper; s.beginPath(); s.moveTo(HX - 26, 8); s.lineTo(HX, -18); s.lineTo(HX + 26, 8); s.fill();   // the copper roof
  s.fillStyle = C.trim; s.fillRect(HX - 26, 8, 52, 2);
  s.fillStyle = C.trim; ell(s, N.CLOCK.x, N.CLOCK.y, 16, 16); s.fill();   // the clock face (no hands: the sprite)
  s.fillStyle = C.face; ell(s, N.CLOCK.x, N.CLOCK.y, 14, 14); s.fill();
  s.fillStyle = C.roman; for (let k = 0; k < 12; k++) { const a = k * Math.PI / 6; s.fillRect(N.CLOCK.x + Math.sin(a) * 11 - 1, N.CLOCK.y - Math.cos(a) * 11 - 1, 2, 2); }
  // the boardwalk, then the plaza's paving in front of the hall
  s.fillStyle = C.walk1; s.fillRect(0, WALK, N.PLAZA, 6);
  s.fillStyle = C.walk2; s.fillRect(0, WALK, N.PLAZA, 1);
  s.fillStyle = C.walk0; for (let px = 0; px < N.PLAZA; px += 9) s.fillRect(px, WALK + 1, 1, 5);
  s.fillStyle = C.walkF; s.fillRect(0, WALK + 6, N.PLAZA, FRONT - WALK - 6);
  s.fillStyle = C.trim; for (let px = 4; px < N.PLAZA; px += 24) s.fillRect(px, WALK + 6, 2, FRONT - WALK - 6);
  s.fillStyle = C.white0; s.fillRect(N.PLAZA, WALK, W - N.PLAZA, FRONT - WALK);   // the hall's steps
  s.fillStyle = C.white1; for (let y = WALK; y < FRONT; y += 4) s.fillRect(N.PLAZA, y, W - N.PLAZA, 1);
  s.fillStyle = C.out; s.fillRect(0, FRONT, W, 1);
  const dirt = [[FRONT + 1, C.dirt3], [FRONT + 12, C.dirt2], [FRONT + 40, C.dirt1], [FRONT + 70, C.dirt0]];
  for (const [y, col] of dirt) { s.fillStyle = col; s.fillRect(0, y, W, VH - y); }
  s.fillStyle = C.dirt0; s.fillRect(0, FRONT + 1, W, 2);
  for (const y of [FRONT + 26, FRONT + 31, FRONT + 58, FRONT + 64]) { s.fillStyle = C.rut; s.fillRect(0, y, N.PLAZA, 1); }
  for (let i = 0; i < 400; i++) { const px = (r() * W) | 0, py = FRONT + 4 + ((r() * (VH - FRONT - 4)) | 0); s.fillStyle = r() < 0.5 ? C.dirt3 : C.rut; s.fillRect(px, py, 1 + (r() < 0.2 ? 1 : 0), 1); }
  L.street = T.pixelize(st, C, null, CLUT.bg);
  return L;
};

// the ending's two backdrops: Boot Hill at sundown (Main Street's sunset sky behind the graveyard), and the boot shop
T.buildEnding = function (VW, VH, FLOOR) {
  const L = {}, MS = T.buildMainStreet(VW, VH, FLOOR), BH = T.buildNightLayers(VW, VH, FLOOR);
  L.far = MS.far; L.mid = BH.mid; L.street = T.buildGraveyardStreet(VW, VH, FLOOR);
  Object.assign(L, T.buildShopScene(VW, VH));                      // the boot shop: a bitmap, and the boot that twitches
  return L;
};

// ---------------------------------------------------------------- the epilogue: the boot shop
// A painted picture, not tiles: a lamplit boot shop at night - red damask, a mahogany wainscot, a polished shelf with a
// brass rail, an oil lamp, plain boots in the shadows - and on the shelf a fine pair of diamondback snakeskin boots,
// a price tag on a string. Painted with gradients at 320x240, then cut to 248 colours (median cut): on the F256 it's the
// bitmap layer with its own CLUT, loaded for the epilogue. The right-hand boot is a sprite over it (it twitches).
function medianCut(data, n) {                                     // data: RGBA bytes -> a palette of n [r, g, b]
  const px = [];
  for (let i = 0; i < data.length; i += 4) if (data[i + 3] > 127) px.push([data[i], data[i + 1], data[i + 2]]);
  let boxes = [px];
  while (boxes.length < n) {
    let bi = -1, best = -1, ch = 0;
    boxes.forEach((b, i) => {
      if (b.length < 2) return;
      for (let k = 0; k < 3; k++) {
        let lo = 255, hi = 0; for (const q of b) { if (q[k] < lo) lo = q[k]; if (q[k] > hi) hi = q[k]; }
        const range = (hi - lo) * (k === 1 ? 1.2 : 1) * Math.sqrt(b.length);
        if (range > best) { best = range; bi = i; ch = k; }
      }
    });
    if (bi < 0) break;
    const b = boxes[bi].sort((u, v) => u[ch] - v[ch]), mid = b.length >> 1;
    boxes.splice(bi, 1, b.slice(0, mid), b.slice(mid));
  }
  return boxes.filter(b => b.length).map(b => [0, 1, 2].map(k => Math.round(b.reduce((t, q) => t + q[k], 0) / b.length)));
}
function indexed(cv, n, clut) {                                   // cut a canvas to n colours: its pixels, idx, palette
  const ctx = cv.getContext('2d'), img = ctx.getImageData(0, 0, cv.width, cv.height), d = img.data;
  const pal = medianCut(d, n), hex = pal.map(q => '#' + q.map(v => v.toString(16).padStart(2, '0')).join(''));
  const idx = new Uint16Array(cv.width * cv.height), cache = new Map();
  const ids = clut ? hex.map(h => clut.add(h)) : hex.map((h, i) => i + 1);
  for (let i = 0; i < idx.length; i++) {
    const o = i * 4;
    if (d[o + 3] <= 127) { d[o + 3] = 0; continue; }
    const key = d[o] << 16 | d[o + 1] << 8 | d[o + 2];
    let k = cache.get(key);
    if (k === undefined) {
      let best = Infinity;
      pal.forEach((q, j) => { const e = 2 * (q[0] - d[o]) ** 2 + 4 * (q[1] - d[o + 1]) ** 2 + 3 * (q[2] - d[o + 2]) ** 2; if (e < best) { best = e; k = j; } });
      cache.set(key, k);
    }
    d[o] = pal[k][0]; d[o + 1] = pal[k][1]; d[o + 2] = pal[k][2]; d[o + 3] = 255; idx[i] = ids[k];
  }
  ctx.putImageData(img, 0, 0);
  cv.idx = idx; cv.pal = hex; cv.clut = clut || { colors: [null, ...hex] };
  return cv;
}
// a cowboy boot, toe to the right, its heel's back at x 0 and the sole on y 0, about 78 x 118: diamondback skin
function paintBoot(c, opt = {}) {
  const outline = () => {
    c.beginPath();
    c.moveTo(2, -104); c.quadraticCurveTo(18, -116, 36, -104);     // the scalloped top
    c.lineTo(37, -52); c.quadraticCurveTo(39, -26, 58, -19);        // the front of the shaft, the instep
    c.quadraticCurveTo(74, -13, 78, -5); c.lineTo(76, 0);           // the vamp, the pointed toe
    c.lineTo(22, 0); c.lineTo(17, -5); c.lineTo(15, 0); c.lineTo(0, 0);   // the sole, the arch, the heel
    c.lineTo(-1, -15); c.quadraticCurveTo(-4, -50, 2, -104); c.closePath();
  };
  c.save();
  outline(); c.save(); c.clip();
  let g = c.createLinearGradient(0, -118, 0, 0); g.addColorStop(0, '#c49a5c'); g.addColorStop(0.6, '#a07844'); g.addColorStop(1, '#6e4c26');
  c.fillStyle = g; c.fillRect(-6, -120, 90, 122);
  const diamond = (x, y, w, h, a) => {                               // one of the big diamonds down his back: a cream rim, dark, a tan heart
    c.save(); c.translate(x, y); c.rotate(a);
    for (const [k, col] of [[1, '#e6d09a'], [0.8, '#3a200c'], [0.55, '#5a3818'], [0.28, '#a87c48']]) {
      c.fillStyle = col; c.beginPath(); c.moveTo(0, -h * k); c.lineTo(w * k, 0); c.lineTo(0, h * k); c.lineTo(-w * k, 0); c.fill();
    }
    c.restore();
  };
  const blotch = (x, y, r) => { c.fillStyle = 'rgba(58,32,12,0.75)'; c.beginPath(); c.ellipse(x, y, r * 1.3, r, 0, 0, Math.PI * 2); c.fill(); };
  for (let y = -96; y <= -44; y += 13) { diamond(19, y, 9, 7, 0); blotch(3, y + 6, 2.4); blotch(35, y + 6, 2.4); }   // down the shaft, blotches on its sides
  for (let k = 0; k < 4; k++) {                                       // and along the vamp to the toe, smaller as it goes
    const t = k / 4, x = 34 + t * 36, y = -36 + t * 26, sc = 1 - t * 0.35;
    diamond(x, y, 8 * sc, 6 * sc, 0.62); blotch(x - 4, y + 9 * sc, 2 * sc);
  }
  c.strokeStyle = 'rgba(70,44,20,0.35)'; c.lineWidth = 0.6;          // the little scales
  for (let y = -118; y < 0; y += 3) for (let x = -4 + (y % 6 ? 1.5 : 0); x < 82; x += 3) { c.beginPath(); c.arc(x, y, 1.6, 0.1 * Math.PI, 0.9 * Math.PI); c.stroke(); }
  g = c.createLinearGradient(-2, 0, 40, 0);                         // round: lit from the lamp on the left
  g.addColorStop(0, 'rgba(255,230,180,0.0)'); g.addColorStop(0.25, 'rgba(255,236,190,0.35)'); g.addColorStop(0.6, 'rgba(0,0,0,0)'); g.addColorStop(1, 'rgba(30,10,0,0.45)');
  c.fillStyle = g; c.fillRect(-6, -120, 46, 100);
  g = c.createLinearGradient(0, -40, 0, 0); g.addColorStop(0, 'rgba(0,0,0,0)'); g.addColorStop(1, 'rgba(20,8,0,0.35)');
  c.fillStyle = g; c.fillRect(-6, -40, 90, 40);
  c.fillStyle = 'rgba(255,250,235,0.28)'; c.fillRect(9, -100, 2, 52); c.fillRect(48, -20, 14, 1.4);   // the gloss
  c.restore();
  c.fillStyle = '#3a2010'; c.fillRect(-1, -15, 16, 15);              // the stacked heel, the sole and its welt
  c.fillStyle = '#5a3418'; for (let y = -13; y < 0; y += 3) c.fillRect(0, y, 14, 1);
  c.fillStyle = '#24140a'; c.beginPath(); c.moveTo(15, 0); c.lineTo(17, -4); c.lineTo(22, -3); c.lineTo(76, -3); c.lineTo(76, 0); c.closePath(); c.fill();
  c.strokeStyle = '#d8c090'; c.lineWidth = 0.8; c.setLineDash([1.5, 1.5]);
  c.beginPath(); c.moveTo(23, -4); c.lineTo(74, -4); c.stroke();
  c.beginPath(); c.moveTo(4, -92); c.quadraticCurveTo(18, -82, 34, -92); c.stroke();   // the fancy stitching up the shaft
  c.beginPath(); c.moveTo(6, -80); c.quadraticCurveTo(18, -70, 33, -80); c.stroke();
  c.beginPath(); c.moveTo(37, -48); c.quadraticCurveTo(30, -30, 48, -22); c.stroke();
  c.setLineDash([]);
  outline(); c.strokeStyle = '#1e1008'; c.lineWidth = 1.4; c.stroke();
  c.fillStyle = '#5a3418'; c.fillRect(3, -114, 6, 10); c.fillStyle = '#1e1008'; c.fillRect(4, -112, 4, 7);   // the pull tab
  c.restore();
}
T.buildShopScene = function (VW, VH) {
  const cv = T.canvas(VW, VH), c = cv.getContext('2d');
  c.fillStyle = '#3a0e12'; c.fillRect(0, 0, VW, 150);              // the damask: red, a darker motif, a gold thread
  for (let y = 0; y < 150; y += 30) for (let x = (y / 30 % 2) * 14; x < VW + 14; x += 28) {
    c.fillStyle = '#4e1418'; c.beginPath(); c.ellipse(x, y + 15, 7, 11, 0, 0, Math.PI * 2); c.fill();
    c.strokeStyle = 'rgba(176,128,60,0.45)'; c.lineWidth = 0.8; c.beginPath(); c.moveTo(x, y + 3); c.quadraticCurveTo(x + 8, y + 15, x, y + 27); c.quadraticCurveTo(x - 8, y + 15, x, y + 3); c.stroke();
    c.fillStyle = 'rgba(190,140,70,0.5)'; c.fillRect(x - 1, y + 14, 2, 2);
  }
  c.fillStyle = '#2a1008'; c.fillRect(0, 146, VW, 4);                 // the chair rail, the wainscot's panels
  c.fillStyle = '#4a2212'; c.fillRect(0, 150, VW, VH - 150);
  for (let x = 8; x < VW; x += 52) { c.fillStyle = '#5c2c18'; c.fillRect(x, 186, 44, 46); c.fillStyle = '#7a4024'; c.fillRect(x, 186, 44, 1.5); c.fillRect(x, 186, 1.5, 46); c.fillStyle = '#2e140a'; c.fillRect(x, 231, 44, 1.5); }
  for (const [sx, sy, w] of [[8, 74, 70], [242, 74, 70], [8, 116, 60], [252, 116, 60]]) {   // shelves in the shadows, plain boots on them
    c.fillStyle = '#2e1408'; c.fillRect(sx, sy, w, 4); c.fillStyle = '#5a2e18'; c.fillRect(sx, sy, w, 1);
    for (let k = 0; k < 2; k++) {
      c.save(); c.translate(sx + 8 + k * 30, sy); c.scale(0.3, 0.3);
      c.fillStyle = k ? '#3a2214' : '#2a1a10'; c.beginPath(); c.moveTo(2, -104); c.lineTo(36, -104); c.lineTo(37, -52); c.quadraticCurveTo(40, -24, 58, -19); c.quadraticCurveTo(74, -13, 78, -5); c.lineTo(76, 0); c.lineTo(0, 0); c.closePath(); c.fill();
      c.fillStyle = 'rgba(255,210,150,0.25)'; c.fillRect(8, -100, 6, 70);
      c.restore();
    }
  }
  c.fillStyle = '#1e0c06'; c.fillRect(70, 18, 180, 22);              // the sign: gold leaf on black
  c.strokeStyle = '#b08a3c'; c.lineWidth = 1; c.strokeRect(71.5, 19.5, 177, 19);
  T.drawText(c, 'FINE BOOTS', 160, 23, '#e8c060', 3, null, 'center');
  let g = c.createLinearGradient(0, 168, 0, 186);                    // the shelf: polished mahogany, a brass rail
  g.addColorStop(0, '#8a4a26'); g.addColorStop(0.3, '#6a3218'); g.addColorStop(1, '#3e1a0a');
  c.fillStyle = g; c.fillRect(20, 168, 280, 16);
  c.fillStyle = '#c08a5a'; c.fillRect(20, 168, 280, 1);
  c.fillStyle = '#c8a040'; c.fillRect(20, 182, 280, 2); c.fillStyle = '#f0d070'; c.fillRect(20, 182, 280, 1);
  c.fillStyle = 'rgba(0,0,0,0.45)'; for (const bx of [140, 226]) { c.beginPath(); c.ellipse(bx, 170, 44, 4, 0, 0, Math.PI * 2); c.fill(); }   // the boots' shadows
  // the oil lamp: brass foot, glass chimney, the flame
  c.fillStyle = '#9a7228'; c.beginPath(); c.ellipse(46, 167, 10, 3, 0, 0, Math.PI * 2); c.fill(); c.fillRect(42, 150, 8, 17);
  c.fillStyle = '#c8a040'; c.beginPath(); c.ellipse(46, 150, 9, 6, 0, 0, Math.PI * 2); c.fill();
  c.fillStyle = 'rgba(230,240,240,0.35)'; c.beginPath(); c.moveTo(40, 146); c.quadraticCurveTo(36, 132, 42, 122); c.lineTo(50, 122); c.quadraticCurveTo(56, 132, 52, 146); c.fill();
  c.fillStyle = '#ffd060'; c.beginPath(); c.ellipse(46, 134, 2.6, 6, 0, 0, Math.PI * 2); c.fill(); c.fillStyle = '#fff4c0'; c.beginPath(); c.ellipse(46, 135, 1.2, 3, 0, 0, Math.PI * 2); c.fill();
  c.save(); c.translate(98, 168); paintBoot(c); c.restore();         // the left boot (the right one's the sprite)
  c.strokeStyle = '#d8c8a0'; c.lineWidth = 0.8; c.beginPath(); c.moveTo(104, 60); c.quadraticCurveTo(96, 78, 84, 96); c.stroke();   // the tag on its string
  c.save(); c.translate(84, 96); c.rotate(-0.12);
  c.fillStyle = '#f4ecd4'; c.fillRect(-36, 0, 46, 24); c.strokeStyle = '#8a7a5a'; c.strokeRect(-36, 0, 46, 24);
  T.drawText(c, 'GENUINE', -13, 3, '#5a1a14', 1, null, 'center'); T.drawText(c, 'DIAMONDBACK', -13, 10, '#5a1a14', 1, null, 'center'); T.drawText(c, '5 BITS', -13, 17, '#8a2a1a', 1, null, 'center');
  c.restore();
  c.globalCompositeOperation = 'screen';                             // the lamplight, warm, from the left
  g = c.createRadialGradient(56, 130, 4, 56, 130, 190); g.addColorStop(0, 'rgba(255,190,100,0.55)'); g.addColorStop(0.4, 'rgba(160,80,30,0.25)'); g.addColorStop(1, 'rgba(0,0,0,0)');
  c.fillStyle = g; c.fillRect(0, 0, VW, VH);
  c.globalCompositeOperation = 'multiply';                           // the corners falling into the dark
  g = c.createRadialGradient(150, 130, 60, 150, 130, 230); g.addColorStop(0, 'rgba(255,255,255,1)'); g.addColorStop(1, 'rgba(40,20,20,1)');
  c.fillStyle = g; c.fillRect(0, 0, VW, VH);
  c.globalCompositeOperation = 'source-over';
  const bmp = indexed(cv, 248);
  // the right-hand boot, lit the same way, as a sprite: still, and twitching (tipped back on its heel)
  const boot = [0, -0.09].map(tw => {
    const sc = T.canvas(88, 128), x = sc.getContext('2d'); x.translate(4, 124); x.rotate(tw); paintBoot(x);
    x.globalCompositeOperation = 'source-atop';
    const g2 = x.createLinearGradient(-60, 0, 120, 0); g2.addColorStop(0, 'rgba(255,190,100,0.25)'); g2.addColorStop(1, 'rgba(0,0,0,0.25)');
    x.fillStyle = g2; x.fillRect(-10, -130, 110, 140);
    x.fillStyle = 'rgba(20,6,0,0.22)'; x.fillRect(-10, -130, 110, 140);   // (the far side of the lamp: a shade darker)
    const o = indexed(sc, 40, CLUT.spr); o.ox = 4; o.oy = 124; return o;
  });
  return { shopBmp: bmp, shopBoot: boot };
};

// the clock's hands: 11:59 and noon; and the snakeskin boots (still, and one twitching)
T.buildNoonSprites = function () {
  const HP = { out: PAL.out, h: '#2a1c18' };
  const hands = [-0.1, 0].map(mn => {
    const cv = T.canvas(32, 32), c = cv.getContext('2d'); c.translate(16, 16);
    c.strokeStyle = HP.h; c.lineCap = 'round';
    c.lineWidth = 2; c.beginPath(); c.moveTo(0, 0); c.lineTo(Math.sin(mn * 0.08) * 7, -Math.cos(mn * 0.08) * 7); c.stroke();   // the hour hand
    c.lineWidth = 1.4; c.beginPath(); c.moveTo(0, 0); c.lineTo(Math.sin(mn) * 11, -Math.cos(mn) * 11); c.stroke();             // the minute hand
    const o = T.pixelize(cv, HP, null, CLUT.spr); o.ox = 16; o.oy = 16; return o;
  });
  const BP = { out: PAL.out, s0: '#b89a5a', s1: '#d8c08a', d: '#5a3a1a', d2: '#3a2410', sole: '#2a1c18', heel: '#4a3020' };
  const boot = (c, tw) => {                                        // one boot, toe to the right, snakeskin diamonds
    c.save(); c.rotate(tw);
    c.fillStyle = BP.s0; c.beginPath(); c.moveTo(-5, -26); c.lineTo(5, -26); c.lineTo(6, -6); c.quadraticCurveTo(16, -6, 18, -2); c.lineTo(18, 0); c.lineTo(-6, 0); c.closePath(); c.fill();
    c.strokeStyle = BP.out; c.lineWidth = 1; c.stroke();
    c.fillStyle = BP.s1; c.fillRect(-4, -25, 3, 18);
    c.fillStyle = BP.d; for (let y = -23; y < -3; y += 5) for (const x of [-2, 3]) { c.beginPath(); c.moveTo(x, y - 2); c.lineTo(x + 2, y); c.lineTo(x, y + 2); c.lineTo(x - 2, y); c.fill(); }
    c.fillStyle = BP.d2; c.fillRect(-6, -1, 24, 2); c.fillStyle = BP.heel; c.fillRect(-6, -3, 6, 3);
    c.restore();
  };
  const boots = [0, 1].map(k => {
    const cv = T.canvas(56, 36), c = cv.getContext('2d'); c.translate(14, 33);
    boot(c, 0); c.translate(24, 0); boot(c, k ? -0.18 : 0);       // the second one twitches
    const o = T.pixelize(cv, BP, PAL.out, CLUT.spr); o.ox = 28; o.oy = 33; return o;
  });
  return { hands, boots };
};

// ---------------------------------------------------------------- Diamondback
// A giant diamondback rattlesnake in a flat black hat and a bolo tie: coiled up, his neck rising in an S to a broad
// viper's head, slit yellow eyes; the rattle up behind him; a six-shooter held in the curl of his tail. Pose: coil
// (squash), neck (how far up and forward the head is: 0 up, 1 drawn back low, 2 lunged out), gun ('tail' at the hip,
// 'aim' up in front, 'out' open, none), tongue, rattle (its shake), lean, eyes, mouth, stars, belly (KO: on his back).
const DP = {
  out: PAL.out, b0: '#8a6a3a', b1: '#b8964e', b2: '#d8bc78', belly: '#e8d8a8', dia: '#4a2e16', dia2: '#f0e0b0',
  hat: '#1e1a1c', hat2: '#3e3638', band: '#c8ccd8', bolo: '#c8ccd8', tq: '#3aa8a0', eye: '#ffd34a', pupil: '#1a1010',
  tongue: '#c83a3a', fang: '#f4f0e0', gun: '#4a4a54', gun2: '#8a8a96', grip: '#6a3a1a', flash: '#ffe680', flash2: '#ff9a3a',
  rattle: '#d8c8a0', rattle2: '#a8946a', star: '#ffd34a',
};
const DD = { coil: 0, neck: 0, gun: 'tail', tongue: 0, rattle: 0, lean: 0, eyes: 'mean', mouth: 0, stars: -1, belly: false, flash: false, hat: true };

function drawDiamondback(c, o) {
  const p = Object.assign({}, DD, o);
  if (p.belly) {                                                   // KO'd: flattened out cold, the hat gone, tongue out
    c.save(); c.scale(1, 0.55); drawDiamondback(c, Object.assign({}, o, { belly: false, hat: false, stars: -1, gun: null, neck: 2, tongue: 1, coil: 1 })); c.restore();
    return;
  }
  c.lineCap = 'round'; c.lineJoin = 'round';
  const body = (pts, w) => {                                       // a thick scaled body along a path, the diamonds down its back
    const path = () => { c.beginPath(); c.moveTo(pts[0][0], pts[0][1]); for (let i = 1; i < pts.length - 2; i += 3) c.bezierCurveTo(pts[i][0], pts[i][1], pts[i + 1][0], pts[i + 1][1], pts[i + 2][0], pts[i + 2][1]); };
    path(); c.strokeStyle = DP.out; c.lineWidth = w + 2; c.stroke();
    path(); c.strokeStyle = DP.b1; c.lineWidth = w; c.stroke();
    path(); c.strokeStyle = DP.b2; c.lineWidth = w * 0.35; c.stroke();
  };
  const diamonds = (pts, n) => {                                   // diamonds sampled along a cubic
    const P = pts;
    for (let i = 1; i < n; i++) {
      const t = i / n, u = 1 - t;
      const x = u * u * u * P[0][0] + 3 * u * u * t * P[1][0] + 3 * u * t * t * P[2][0] + t * t * t * P[3][0];
      const y = u * u * u * P[0][1] + 3 * u * u * t * P[1][1] + 3 * u * t * t * P[2][1] + t * t * t * P[3][1];
      c.fillStyle = DP.dia2; c.beginPath(); c.moveTo(x, y - 3.4); c.lineTo(x + 3.4, y); c.lineTo(x, y + 3.4); c.lineTo(x - 3.4, y); c.fill();
      c.fillStyle = DP.dia; c.beginPath(); c.moveTo(x, y - 2.4); c.lineTo(x + 2.4, y); c.lineTo(x, y + 2.4); c.lineTo(x - 2.4, y); c.fill();
    }
  };
  const sq = 1 - p.coil * 0.25;
  c.save(); c.translate(0, 0); c.rotate(p.lean);
  // the rattle and the tail, up behind him
  const rs = Math.sin(p.rattle) * 1.5;
  const tail = [[-14, -6], [-26, -8], [-28, -20], [-22 + rs, -30]];
  body(tail, 4);
  for (let i = 0; i < 4; i++) { const ry = -30 - i * 3; ell(c, -22 + rs + i * 0.4, ry, 3, 2); c.fillStyle = i % 2 ? DP.rattle2 : DP.rattle; c.fill(); c.strokeStyle = DP.out; c.lineWidth = 0.8; c.stroke(); }
  // the coils: two rings stacked, squashed by `coil`
  for (const [cy, rx, ry] of [[-6, 20, 6.5], [-14, 15, 5.5]]) {
    ell(c, -2, cy * sq, rx, ry * sq); c.fillStyle = DP.out; c.fill();
    ell(c, -2, cy * sq, rx - 1.5, ry * sq - 1.5); c.fillStyle = DP.b1; c.fill();
    ell(c, -2, cy * sq + 1.5, rx - 4, ry * sq - 3.5); c.fillStyle = DP.b0; c.fill();
    for (let k = -2; k <= 2; k++) { const dx = -2 + k * (rx / 3), dy = cy * sq - ry * sq * 0.45; c.fillStyle = DP.dia; c.beginPath(); c.moveTo(dx, dy - 2.2); c.lineTo(dx + 2.6, dy); c.lineTo(dx, dy + 2.2); c.lineTo(dx - 2.6, dy); c.fill(); }
  }
  // the neck: up from the top coil in an S to the head
  const HD = [[10, -40], [4, -22], [24, -16]][p.neck];           // where the head is: up, drawn back low, lunged out
  const neck = p.neck === 0 ? [[2, -18 * sq], [10, -24], [0, -32], HD] : p.neck === 1 ? [[2, -18 * sq], [-8, -20], [-10, -26], HD] : [[2, -18 * sq], [10, -16], [16, -18], HD];
  body(neck, 7);
  c.save(); c.beginPath(); c.moveTo(neck[0][0], neck[0][1]); c.bezierCurveTo(neck[1][0], neck[1][1], neck[2][0], neck[2][1], neck[3][0], neck[3][1]);
  c.strokeStyle = DP.belly; c.lineWidth = 2.2; c.translate(1.5, 0); c.stroke(); c.restore();   // the pale belly scales along the front
  diamonds(neck, 4);
  // the gun: in the curl of his tail - holstered at his side, or brought up in front to fire
  const gun = (gx, gy, a, open) => {
    c.save(); c.translate(gx, gy); c.rotate(a);
    c.fillStyle = DP.out; c.fillRect(-2, -2.5, 14, 5); c.fillStyle = DP.gun; c.fillRect(-1, -1.5, 12, 3); c.fillStyle = DP.gun2; c.fillRect(0, -1.5, 11, 1);
    c.fillStyle = DP.out; c.fillRect(-3, 0, 5, 6); c.fillStyle = DP.grip; c.fillRect(-2, 1, 3, 4);
    if (open) { c.fillStyle = DP.gun2; ell(c, 3, 3, 2.5, 2.5); c.fill(); }
    if (p.flash) { c.fillStyle = DP.flash2; ell(c, 15, 0, 4, 3); c.fill(); c.fillStyle = DP.flash; ell(c, 14, 0, 2.4, 1.6); c.fill(); }
    c.restore();
  };
  if (p.gun === 'tail') { body([[-12, -8], [-18, 2], [8, 4], [14, -4]], 3); gun(14, -6, 0.1, false); }
  else if (p.gun === 'aim') { body([[-12, -8], [-6, -18], [10, -22], [16, -26]], 3); gun(17, -27, -0.05, false); }
  else if (p.gun === 'open') { body([[-12, -8], [-6, -16], [6, -18], [12, -20]], 3); gun(12, -21, 0.5, true); }
  // the head: broad and flat, slit eyes, the bolo at the throat, the hat
  c.save(); c.translate(HD[0], HD[1]);
  c.fillStyle = DP.bolo; c.fillRect(-2, 3, 1, 6); c.fillRect(1, 3, 1, 6); ell(c, 0, 4, 2.4, 2.4); c.fill(); c.fillStyle = DP.tq; ell(c, 0, 4, 1.4, 1.4); c.fill();
  ell(c, 4, 0, 9, 5.4); c.fillStyle = DP.out; c.fill();
  ell(c, 4, 0, 8, 4.4); c.fillStyle = DP.b1; c.fill();
  c.fillStyle = DP.b2; c.fillRect(0, -3, 9, 1);
  c.fillStyle = DP.belly; c.fillRect(2, 2, 9, 1.4);
  if (p.mouth) {                                                   // the jaws open, the fangs
    c.fillStyle = DP.out; c.beginPath(); c.moveTo(4, 1); c.lineTo(13, -1 - p.mouth); c.lineTo(13, 3 + p.mouth); c.fill();
    c.fillStyle = DP.tongue; c.fillRect(7, 0.5, 5, 1);
    c.fillStyle = DP.fang; c.fillRect(11, -1 - p.mouth, 1, 2); c.fillRect(11, 1.5 + p.mouth, 1, 2);
  }
  if (p.tongue) { c.strokeStyle = DP.tongue; c.lineWidth = 1; c.beginPath(); c.moveTo(12, 1); c.lineTo(16, 1); c.lineTo(18, -0.5); c.moveTo(16, 1); c.lineTo(18, 2.5); c.stroke(); }
  if (p.eyes === 'x') { c.strokeStyle = DP.eye; c.lineWidth = 1; c.beginPath(); c.moveTo(4, -3); c.lineTo(7, 0); c.moveTo(7, -3); c.lineTo(4, 0); c.stroke(); }
  else {
    c.fillStyle = DP.out; c.fillRect(4, -3, 4, 3); c.fillStyle = DP.eye; c.fillRect(5, -2.5, 2.4, 2);
    c.fillStyle = DP.pupil; c.fillRect(p.eyes === 'daze' ? 5 : 6, -2.5, 1, 2);
    if (p.eyes === 'mean') { c.fillStyle = DP.out; c.fillRect(3, -4, 6, 1); }
  }
  if (p.hat) {                                                     // the flat black hat, a silver band
    c.save(); c.translate(1, -4); c.rotate(-0.06);
    c.fillStyle = DP.out; c.fillRect(-9, -1, 22, 3); c.fillStyle = DP.hat; c.fillRect(-8, 0, 20, 1);
    c.fillStyle = DP.out; c.fillRect(-4, -9, 13, 9); c.fillStyle = DP.hat2; c.fillRect(-3, -8, 11, 7); c.fillStyle = DP.band; c.fillRect(-3, -3, 11, 1);
    c.restore();
  }
  c.restore();
  c.restore();
  if (p.stars >= 0) for (let i = 0; i < 3; i++) {
    const a2 = p.stars + i * Math.PI * 2 / 3, x = 10 + Math.cos(a2) * 12, y = -54 + Math.sin(a2) * 3;
    c.fillStyle = DP.star; c.fillRect(x - 2, y - 0.5, 4, 1); c.fillRect(x - 0.5, y - 2, 1, 4);
  }
}

T.buildDiamondback = function () {
  const B = T.BOSS, TAU = Math.PI * 2;
  const bake = fn => { const cv = T.canvas(B.FW, B.FH), x = cv.getContext('2d'); x.translate(B.OX, B.OY); fn(x); return T.pixelize(cv, DP, DP.out, T.CLUT.spr); };
  const mk = o => bake(x => drawDiamondback(x, o));
  return {
    idle: [mk({}), mk({ tongue: 1, rattle: 1 })],
    walk: [0, 1, 2, 3].map(i => mk({ coil: (i % 2) * 0.3, lean: Math.sin(i / 4 * TAU) * 0.05, rattle: i })),   // slithering
    talk: [mk({ mouth: 2, tongue: 0 }), mk({ mouth: 1, tongue: 1 })],
    draw: mk({ gun: 'aim', eyes: 'mean' }),                         // the gun up in front
    fire: mk({ gun: 'aim', flash: true, lean: -0.05 }),             // fanning the hammer
    reload: [mk({ gun: 'open', eyes: 'mean', rattle: 0 }), mk({ gun: 'open', rattle: 2 })],
    coil: mk({ coil: 1, neck: 1, mouth: 1, rattle: 1, gun: 'tail' }),   // drawn back, rattling: the strike coming
    strike: mk({ coil: 0.4, neck: 2, mouth: 3, gun: 'tail', lean: 0.1 }),   // lunged out, the fangs
    stretch: mk({ coil: 0.6, neck: 2, mouth: 1, eyes: 'daze', gun: 'tail', lean: 0.18 }),   // a miss: stretched out, open
    whip: [0, 1].map(i => mk({ coil: 0.3, gun: 'tail', rattle: i * 3, lean: i ? 0.12 : -0.12, mouth: 1 })),   // the tail swinging round
    hurt: mk({ eyes: 'x', mouth: 2, lean: -0.2, gun: 'tail' }),
    daze: [0, 1, 2, 3].map(i => mk({ eyes: 'daze', lean: -0.05 + (i % 2) * 0.08, mouth: 1, stars: i / 4 * TAU / 3, gun: null })),
    ko: mk({ belly: true, eyes: 'x', mouth: 2 }),
    nogun: [mk({ gun: null }), mk({ gun: null, tongue: 1, rattle: 1 })],   // outdrawn: his gun kicked away
  };
};
})();
