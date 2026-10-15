// Texas Shitkickers — Ghost Town at moonrise: level 3, Doc Gila's town (story.md: "Runs the saloon. A brawl
// through swinging doors, tables and falling signs").
//   far    (scroll x0.25): a cold night sky, a huge rising moon in a ghostly ring, ragged cloud, the mountains
//   mid    (scroll x0.5):  the dead mine above the town: a headframe, a tailings heap, a burnt church, dead trees
//   street (scroll x1, one unbroken strip: a tile map on the F256): the abandoned street - weathered false fronts,
//          boarded windows, broken boardwalk, cobwebs - then THE LAST CHANCE saloon's front and its swinging doors,
//          then inside: the bar, the mirror and the bottles, a piano, warm lamplight, floorboards
// The hanging signs that fall, and the saloon tables, are sprites (T.buildGhostProps).
(function () {
'use strict';
const T = window.TSK;
const { PAL, CLUT } = T;
function ell(x, cx, cy, rx, ry) { x.beginPath(); x.ellipse(cx, cy, rx, ry, 0, 0, Math.PI * 2); }
function rng(seed) { return () => (seed = (seed * 16807) % 2147483647) / 2147483647; }

T.GHOST = { W: 2032, DOORS: 1100, INSIDE: 1160 };   // the stage's width, the batwing doors, where the inside starts

T.buildGhostTown = function (VW, VH, FLOOR) {
  const L = {}, r = rng(77), G = T.GHOST;

  // ---- far: the night sky and the moon coming up
  const far = T.canvas(640, VH), f = far.getContext('2d');
  const bands = ['#070a18', '#0a1020', '#0e1628', '#121e32', '#16283c', '#1c3244', '#223c4a'];
  const bh = Math.ceil(100 / bands.length);
  bands.forEach((col, i) => {
    f.fillStyle = col; f.fillRect(0, i * bh, 640, bh);
    if (i > 0) { f.fillStyle = bands[i - 1]; for (let y = 0; y < 3; y++) for (let x = y % 2; x < 640; x += 2) if (y < 2 || x % 4 === 0) f.fillRect(x, i * bh + y, 1, 1); }
  });
  f.fillStyle = bands[bands.length - 1]; f.fillRect(0, bh * bands.length, 640, VH);
  for (let i = 0; i < 70; i++) { f.fillStyle = r() < 0.3 ? '#c8d8e0' : '#6a8090'; f.fillRect((r() * 640) | 0, (r() * 70) | 0, 1, 1); }
  // the moon: huge and low, a pale ring round it
  f.fillStyle = '#2a4450'; ell(f, 420, 74, 50, 50); f.fill();
  f.fillStyle = '#3a5a62'; ell(f, 420, 74, 42, 42); f.fill();
  f.fillStyle = '#c8dccc'; ell(f, 420, 74, 34, 34); f.fill();
  f.fillStyle = '#e8f2e0'; ell(f, 416, 70, 28, 28); f.fill();
  f.fillStyle = '#a8c0b0'; for (const [mx, my, mr] of [[408, 64, 6], [428, 82, 5], [420, 60, 3], [404, 84, 4]]) { ell(f, mx, my, mr, mr); f.fill(); }
  for (let i = 0; i < 6; i++) {                                // ragged cloud across the moon and sky
    const y = 20 + r() * 70, x = r() * 640, w = 50 + r() * 110;
    f.fillStyle = '#16222e'; f.fillRect(x, y, w, 3); f.fillRect(x + 8, y - 2, w - 22, 2);
    f.fillStyle = '#3a5060'; f.fillRect(x + 4, y + 3, w - 10, 1);
  }
  f.fillStyle = '#101a26'; f.beginPath(); f.moveTo(0, VH);       // mountains
  let px = 0;
  f.lineTo(0, 100);
  while (px < 640) { const w = 30 + r() * 60; f.lineTo(px + w / 2, 72 + r() * 18); f.lineTo(px + w, 96 + r() * 8); px += w; }
  f.lineTo(640, VH); f.fill();
  f.fillStyle = '#0c141e'; f.fillRect(0, 104, 640, VH);
  const FP = { k0: bands[0], k1: bands[1], k2: bands[2], k3: bands[3], k4: bands[4], k5: bands[5], k6: bands[6],
    st0: '#c8d8e0', st1: '#6a8090', m0: '#2a4450', m1: '#3a5a62', m2: '#c8dccc', m3: '#e8f2e0', m4: '#a8c0b0',
    c0: '#16222e', c1: '#3a5060', h0: '#101a26', h1: '#0c141e' };
  L.far = T.pixelize(far, FP, null, CLUT.bg);

  // ---- mid: the dead mine on the hill, the burnt church, dead trees
  const mid = T.canvas(960, VH), m = mid.getContext('2d');
  const S = '#0a0e16', S2 = '#141c26';
  m.fillStyle = S2; m.beginPath(); m.moveTo(0, 120);             // the hill, and the tailings heap
  for (let x = 0; x <= 960; x += 16) m.lineTo(x, 100 + 8 * Math.sin(x / 960 * Math.PI * 3));
  m.lineTo(960, 120); m.fill();
  m.beginPath(); m.moveTo(560, 120); m.lineTo(640, 70); m.lineTo(700, 74); m.lineTo(780, 120); m.fill();
  m.fillStyle = S;
  const hf = 150;                                                 // the mine's headframe and its wheel
  m.fillRect(hf, 34, 3, 80); m.fillRect(hf + 30, 34, 3, 80);
  for (let y = 44; y < 110; y += 16) { m.save(); m.translate(hf + 1, y); m.rotate(0.5); m.fillRect(0, 0, 36, 2); m.restore(); m.save(); m.translate(hf + 32, y); m.rotate(Math.PI - 0.5); m.fillRect(0, 0, 36, 2); m.restore(); }
  m.lineWidth = 2; m.strokeStyle = S; ell(m, hf + 16, 30, 12, 12); m.stroke();
  for (let a = 0; a < 6; a++) { m.save(); m.translate(hf + 16, 30); m.rotate(a * Math.PI / 3); m.fillRect(0, -1, 12, 2); m.restore(); }
  m.fillRect(hf - 10, 106, 54, 8);
  // the burnt church: a broken steeple, ribs of roof
  const ch = 400;
  m.beginPath(); m.moveTo(ch, 120); m.lineTo(ch, 70); m.lineTo(ch + 30, 50); m.lineTo(ch + 60, 70); m.lineTo(ch + 60, 120); m.fill();
  m.fillRect(ch + 22, 24, 14, 30); m.beginPath(); m.moveTo(ch + 22, 24); m.lineTo(ch + 28, 8); m.lineTo(ch + 31, 18); m.lineTo(ch + 36, 24); m.fill();
  m.fillStyle = S2; m.fillRect(ch + 12, 74, 8, 14); m.fillRect(ch + 40, 74, 8, 14);
  m.fillStyle = S;
  for (const tx of [60, 300, 520, 820, 900]) {                   // dead trees
    m.fillRect(tx, 70, 3, 50);
    for (let k = 0; k < 4; k++) { m.save(); m.translate(tx + 1, 76 + k * 8); m.rotate((k % 2 ? -1 : 1) * (0.7 + r() * 0.4)); m.fillRect(0, 0, 10 + r() * 8, 2); m.restore(); }
  }
  L.mid = T.pixelize(mid, { s: S, s2: S2 }, null, CLUT.bg);

  // ---- street: one strip the stage's width
  const W = G.W, st = T.canvas(W, VH), s = st.getContext('2d');
  const C = {
    out: PAL.out, trim: '#0e1016', dark: '#06080c', sign: '#1c2024', ink: '#a8b4a8', inkR: '#b04030',
    wd0: '#2a2e34', wd1: '#3e434a', wd2: '#565c62', wd3: '#6e7470',       // weathered grey boards
    bt0: '#2e2822', bt1: '#463c32', bt2: '#5e5042',                       // brown boards
    board: '#4a4036', nail: '#1a1814', web: '#8a9890', glass: '#16242a', glass2: '#2a4048',
    walk0: '#2a2a2e', walk1: '#3e3e42', walk2: '#56565a', walkF: '#1a1a1e',
    dirt0: '#22262a', dirt1: '#2e3236', dirt2: '#3a3e40', dirt3: '#4a4c4c', rut: '#1a1c20',
    // inside the saloon: lamplight
    pan0: '#2e1a12', pan1: '#462818', pan2: '#5e3820', pan3: '#7a4c2a',   // the panelled wall
    bar0: '#3a1e10', bar1: '#5a3018', bar2: '#7e4824', brass: '#c09040',
    mir0: '#3a4a4a', mir1: '#5a6e6a', mir2: '#8aa098',
    bot0: '#2a5a2a', bot1: '#6a3a1a', bot2: '#8a8a3a', lab: '#d8c8a0',
    flr0: '#3a2414', flr1: '#4e3220', flr2: '#62402a', flr3: '#7a5434',
    pia0: '#140c0a', pia1: '#2a1a14', key: '#e8e0d0', curt0: '#4a1018', curt1: '#6a1a22',
    lamp0: '#ffd060', lamp1: '#fff0b0', halo: '#c87a30', glow: '#a86030',
  };
  const WALK = 134, FRONT = 146, AWN = 88;
  const gW = G.DOORS - 40;                                        // where the street's buildings end
  // the street's buildings: weathered, empty, the signs gone (the ones that fall are sprites)
  const BUILD = [
    [0, 120, 54, 'ASSAY', 'grey'], [120, 104, 66, null, 'brown'], [224, 96, 48, 'MERCANTILE', 'grey'], [320, 24, 0, null, 'gap'],
    [344, 112, 62, 'BATHS', 'brown'], [456, 120, 46, 'HOTEL', 'grey'], [576, 96, 70, null, 'brown'], [672, 24, 0, null, 'gap'],
    [696, 128, 56, 'BANK', 'grey'], [824, 112, 66, 'JAIL', 'brown'], [936, gW - 936, 60, 'FUNERALS', 'grey'],
  ];
  const tone = { grey: [C.wd0, C.wd1, C.wd2], brown: [C.bt0, C.bt1, C.bt2] };
  const boarded = (wx, wy, w, h) => {                             // a window boarded up, or just broken
    s.fillStyle = C.trim; s.fillRect(wx - 1, wy - 1, w + 2, h + 2);
    s.fillStyle = C.glass; s.fillRect(wx, wy, w, h);
    if (r() < 0.6) { s.fillStyle = C.board; s.save(); s.translate(wx + w / 2, wy + h / 2); s.rotate(0.35); s.fillRect(-w / 2 - 2, -2, w + 4, 4); s.rotate(-0.7); s.fillRect(-w / 2 - 2, -2, w + 4, 4); s.restore(); s.fillStyle = C.nail; s.fillRect(wx + 1, wy + 2, 1, 1); s.fillRect(wx + w - 2, wy + h - 3, 1, 1); }
    else { s.fillStyle = C.glass2; s.beginPath(); s.moveTo(wx, wy); s.lineTo(wx + w * 0.6, wy); s.lineTo(wx + w * 0.2, wy + h * 0.7); s.fill(); }
  };
  const web = (wx, wy, rad, flip) => {                            // a cobweb in a corner
    s.strokeStyle = C.web; s.lineWidth = 1;
    for (let k = 0; k < 4; k++) { const a = (flip ? Math.PI / 2 : 0) + k * Math.PI / 6; s.beginPath(); s.moveTo(wx, wy); s.lineTo(wx + Math.cos(a) * rad * (flip ? -1 : 1), wy + Math.sin(a) * rad); s.stroke(); }
    for (const q of [0.4, 0.75]) { s.beginPath(); s.arc(wx, wy, rad * q, flip ? Math.PI / 2 : 0, flip ? Math.PI : Math.PI / 2); s.stroke(); }
  };
  for (const [bx, bw, top, name, kind] of BUILD) {
    if (kind === 'gap') { s.fillStyle = C.dark; s.fillRect(bx, 84, bw, WALK - 84); continue; }
    if (kind === 'ruin') {                                        // a burnt-out lot: charred posts, a stub of wall
      s.fillStyle = C.wd0; s.fillRect(bx + 4, 104, 26, WALK - 104);
      s.fillStyle = C.trim; for (const p of [bx + 2, bx + 30, bx + 52]) s.fillRect(p, 92 + (p % 11), 4, WALK - 92 - (p % 11));
      s.fillStyle = C.dark; s.fillRect(bx + 10, 112, 12, WALK - 112);
      continue;
    }
    const [c0, c1, c2] = tone[kind];
    s.fillStyle = c1; s.fillRect(bx, top, bw, WALK - top);
    s.fillStyle = c0; for (let y = top + 3; y < WALK; y += 4) s.fillRect(bx, y, bw, 1);
    for (let k = 0; k < 3; k++) { s.fillStyle = C.dark; s.fillRect(bx + 4 + r() * (bw - 10), top + 4 + r() * 50, 2 + r() * 4, 3); }   // missing boards
    s.fillStyle = c2; s.fillRect(bx, top, bw, 2);
    s.fillStyle = C.trim; s.fillRect(bx, top - 3, bw, 3); s.fillRect(bx, top, 2, WALK - top); s.fillRect(bx + bw - 2, top, 2, WALK - top);
    if (name) {                                                    // a faded sign board, half the letters gone
      const tw = T.textWidth(name, 2), sx = bx + ((bw - tw) >> 1);
      s.fillStyle = C.sign; s.fillRect(sx - 4, top + 6, tw + 8, 14);
      T.drawText(s, name, sx, top + 8, C.ink, 2, null);
      s.fillStyle = C.sign; for (let k = 0; k < 2; k++) s.fillRect(sx + r() * tw, top + 8, 4, 10);
      s.save(); s.translate(sx - 4, top + 6); s.rotate(0.04); s.restore();
    }
    const wy = top + 24, wh = Math.min(16, AWN - 3 - wy);
    if (wh >= 7) for (let i = 0; i < 2; i++) boarded(bx + bw * (0.22 + 0.42 * i), wy, 12, wh);
    web(bx + 2, top, 9, false); if (r() < 0.6) web(bx + bw - 2, top, 7, true);
    const door = bx + (bw >> 1) - 8;                               // a dark doorway, the door hanging off
    s.fillStyle = C.dark; s.fillRect(door, 100, 16, WALK - 100);
    s.fillStyle = c0; s.save(); s.translate(door + 16, 100); s.rotate(0.25); s.fillRect(0, 0, 7, WALK - 100); s.restore();
    boarded(bx + 6, 106, 18, 16); if (bw > 90) boarded(bx + bw - 24, 106, 18, 16);
    // the porch roof, sagging, a post gone
    s.fillStyle = C.wd0; s.beginPath(); s.moveTo(bx, AWN); s.lineTo(bx + bw, AWN + 4); s.lineTo(bx + bw, AWN + 11); s.lineTo(bx, AWN + 8); s.fill();
    s.fillStyle = C.trim; s.fillRect(bx, AWN + 9, bw, 1);
    s.fillStyle = C.wd1; s.fillRect(bx + 3, AWN + 9, 3, WALK - AWN - 9);
    if (r() < 0.5) s.fillRect(bx + bw - 6, AWN + 13, 3, WALK - AWN - 13);
  }
  // the saloon's front: THE LAST CHANCE, its batwing doors lit from inside
  const sx0 = gW, sw = G.INSIDE - gW;
  s.fillStyle = C.bt1; s.fillRect(sx0, 30, sw, WALK - 30);
  s.fillStyle = C.bt0; for (let y = 33; y < WALK; y += 4) s.fillRect(sx0, y, sw, 1);
  s.fillStyle = C.trim; s.fillRect(sx0, 27, sw, 3); s.fillRect(sx0 + sw - 3, 30, 3, WALK - 30);
  s.fillStyle = C.sign; s.fillRect(sx0 + 4, 36, sw - 8, 36);
  T.drawText(s, 'LAST', sx0 + 10, 40, C.lamp0, 2, null); T.drawText(s, 'CHANCE', sx0 + 6, 56, C.lamp0, 2, null);
  const dx = G.DOORS - 8;
  s.fillStyle = C.halo; s.fillRect(dx - 2, 92, 20, WALK - 92);
  s.fillStyle = C.lamp0; s.fillRect(dx, 94, 16, 14);
  s.fillStyle = C.bar2; s.fillRect(dx, 104, 7, 18); s.fillRect(dx + 9, 104, 7, 18);
  s.fillStyle = C.trim; s.fillRect(dx + 7, 104, 2, 18);
  // inside: the panelled back wall, a mirror, bottles, the bar, a piano, a stage curtain, lamps
  const ix = G.INSIDE;
  s.fillStyle = C.pan1; s.fillRect(ix, 0, W - ix, FRONT);
  s.fillStyle = C.pan0; for (let y = 6; y < FRONT; y += 22) s.fillRect(ix, y, W - ix, 2);
  s.fillStyle = C.pan2; for (let x = ix; x < W; x += 40) { s.fillRect(x, 0, 2, FRONT); s.fillRect(x + 6, 30, 26, 1); s.fillRect(x + 6, 60, 26, 1); }
  s.fillStyle = C.pan0; s.fillRect(ix, 0, 6, FRONT);              // the door frame we came through
  const BAR0 = ix + 120, BAR1 = ix + 560;                          // the bar runs along the back
  s.fillStyle = C.mir0; s.fillRect(BAR0 + 40, 26, BAR1 - BAR0 - 80, 44);     // the big mirror, cracked
  s.fillStyle = C.mir1; s.fillRect(BAR0 + 44, 30, BAR1 - BAR0 - 88, 36);
  s.fillStyle = C.mir2; for (let k = 0; k < 6; k++) s.fillRect(BAR0 + 60 + k * 50, 32, 14, 2);
  s.strokeStyle = C.mir0; s.lineWidth = 1; s.beginPath(); s.moveTo(BAR0 + 200, 30); s.lineTo(BAR0 + 214, 44); s.lineTo(BAR0 + 206, 58); s.lineTo(BAR0 + 222, 66); s.stroke();
  s.fillStyle = C.brass; s.fillRect(BAR0 + 38, 24, BAR1 - BAR0 - 76, 2); s.fillRect(BAR0 + 38, 70, BAR1 - BAR0 - 76, 2);
  for (const shelfY of [80, 96]) {                                 // shelves of bottles
    s.fillStyle = C.bar1; s.fillRect(BAR0, shelfY + 10, BAR1 - BAR0, 3);
    for (let x = BAR0 + 4; x < BAR1 - 6; x += 7 + ((x * 13) % 5)) {
      const col = [C.bot0, C.bot1, C.bot2][(x >> 3) % 3], h = 7 + (x % 4);
      s.fillStyle = col; s.fillRect(x, shelfY + 10 - h, 4, h); s.fillRect(x + 1, shelfY + 10 - h - 3, 2, 3);
      if ((x >> 2) % 3 === 0) { s.fillStyle = C.lab; s.fillRect(x, shelfY + 6 - (h >> 2), 4, 2); }
    }
  }
  s.fillStyle = C.bar1; s.fillRect(BAR0 - 10, 112, BAR1 - BAR0 + 20, FRONT - 112);   // the counter
  s.fillStyle = C.bar2; s.fillRect(BAR0 - 12, 108, BAR1 - BAR0 + 24, 5);
  s.fillStyle = C.bar0; for (let x = BAR0; x < BAR1; x += 30) s.fillRect(x, 116, 22, 24);
  s.fillStyle = C.brass; s.fillRect(BAR0 - 10, FRONT - 6, BAR1 - BAR0 + 20, 2);
  const pia = ix + 640;                                            // the piano, and the stage beyond it
  s.fillStyle = C.pia1; s.fillRect(pia, 92, 70, FRONT - 92);
  s.fillStyle = C.pia0; s.fillRect(pia, 88, 70, 6); s.fillRect(pia + 4, 120, 62, 4);
  s.fillStyle = C.key; s.fillRect(pia + 6, 114, 58, 5);
  s.fillStyle = C.pia0; for (let x = pia + 8; x < pia + 62; x += 4) s.fillRect(x, 114, 2, 3);
  s.fillStyle = C.curt1; s.fillRect(ix + 760, 0, W - ix - 760, FRONT);
  s.fillStyle = C.curt0; for (let x = ix + 764; x < W; x += 12) s.fillRect(x, 0, 4, FRONT);
  s.fillStyle = C.brass; s.fillRect(ix + 760, 0, W - ix - 760, 4);
  for (const lx of [ix + 60, BAR0 + 20, BAR1 - 20, ix + 610, ix + 740]) {   // wall lamps
    s.fillStyle = C.glow; s.fillRect(lx - 7, 36, 15, 16);
    s.fillStyle = C.halo; s.fillRect(lx - 5, 38, 11, 12);
    s.fillStyle = C.lamp0; s.fillRect(lx - 2, 40, 5, 8); s.fillStyle = C.lamp1; s.fillRect(lx - 1, 42, 3, 3);
    s.fillStyle = C.brass; s.fillRect(lx - 1, 48, 3, 6);
  }
  // the street's boardwalk (broken), then the floor: dirt outside, floorboards in
  s.fillStyle = C.walk1; s.fillRect(0, WALK, ix, 6);
  s.fillStyle = C.walk2; s.fillRect(0, WALK, ix, 1);
  s.fillStyle = C.walk0; for (let x = 0; x < ix; x += 9) s.fillRect(x, WALK + 1, 1, 5);
  for (let k = 0; k < 14; k++) { s.fillStyle = C.dark; s.fillRect((r() * (ix - 20)) | 0, WALK + 1, 8 + r() * 10, 5); }   // planks gone
  s.fillStyle = C.walkF; s.fillRect(0, WALK + 6, ix, FRONT - WALK - 6);
  s.fillStyle = C.trim; for (let x = 4; x < ix; x += 24) s.fillRect(x, WALK + 6, 2, FRONT - WALK - 6);
  s.fillStyle = C.out; s.fillRect(0, FRONT, W, 1);
  const dirt = [[FRONT + 1, C.dirt3], [FRONT + 12, C.dirt2], [FRONT + 40, C.dirt1], [FRONT + 70, C.dirt0]];
  for (const [y, col] of dirt) { s.fillStyle = col; s.fillRect(0, y, ix, VH - y); }
  s.fillStyle = C.dirt0; s.fillRect(0, FRONT + 1, ix, 2);
  for (const y of [FRONT + 26, FRONT + 31, FRONT + 58, FRONT + 64]) { s.fillStyle = C.rut; s.fillRect(0, y, ix, 1); }
  for (let i = 0; i < 200; i++) { const qx = (r() * ix) | 0, qy = FRONT + 4 + ((r() * (VH - FRONT - 4)) | 0); s.fillStyle = r() < 0.5 ? C.dirt3 : C.rut; s.fillRect(qx, qy, 1, 1); }
  const boards = [C.flr3, C.flr2, C.flr1, C.flr2, C.flr1, C.flr0];   // floorboards: lighter toward the back, under the lamps
  for (let y = FRONT + 1, k = 0; y < VH; y += 8, k++) {
    s.fillStyle = boards[Math.min(boards.length - 1, k >> 1)]; s.fillRect(ix, y, W - ix, 8);
    s.fillStyle = C.flr0; s.fillRect(ix, y + 7, W - ix, 1);
    for (let x = ix + ((k * 37) % 60); x < W; x += 60) s.fillRect(x, y, 1, 7);
  }
  L.street = T.pixelize(st, C, null, CLUT.bg);
  return L;
};

// the props that move: hanging signs that fall (the board, and it broken on the ground), and saloon tables
T.buildGhostProps = function () {
  const P = { out: PAL.out, b0: '#2e2822', b1: '#463c32', b2: '#5e5042', ink: '#a8b4a8', ch: '#6a6a70',
    t0: '#3a2010', t1: '#5a3418', t2: '#7a4a24', felt: '#2a5a32', card: '#e8e0d0', red: '#b04030' };
  const sign = (name, broken) => {
    const tw = T.textWidth(name, 1), w = Math.max(30, tw + 10), c = T.canvas(w + 4, 30), x = c.getContext('2d');
    if (!broken) { x.fillStyle = P.ch; x.fillRect(4, 0, 1, 10); x.fillRect(w - 1, 0, 1, 10); }
    x.save(); if (broken) { x.translate(w / 2, 20); x.rotate(0.18); x.translate(-w / 2, -20); }
    x.fillStyle = P.out; x.fillRect(1, 9, w + 2, 15);
    x.fillStyle = P.b1; x.fillRect(2, 10, w, 13);
    x.fillStyle = P.b0; x.fillRect(2, 16, w, 1); x.fillStyle = P.b2; x.fillRect(2, 10, w, 1);
    T.drawText(x, name, 2 + ((w - tw) >> 1), 13, P.ink, 1, null);
    if (broken) { x.fillStyle = P.out; x.fillRect(w * 0.55, 9, 2, 15); }
    x.restore();
    const o = T.pixelize(c, P, P.out, CLUT.spr); o.ox = (w + 4) >> 1; o.oy = broken ? 24 : 0; return o;
  };
  const table = () => {                           // a card table, cards on the felt
    const c = T.canvas(32, 24), x = c.getContext('2d');
    {
      x.fillStyle = P.out; x.fillRect(1, 6, 30, 6);
      x.fillStyle = P.t2; x.fillRect(2, 7, 28, 3); x.fillStyle = P.t1; x.fillRect(2, 10, 28, 1);
      x.fillStyle = P.felt; x.fillRect(5, 7, 22, 2);
      x.fillStyle = P.card; x.fillRect(9, 5, 4, 3); x.fillRect(16, 5, 4, 3); x.fillStyle = P.red; x.fillRect(10, 6, 1, 1);
      x.fillStyle = P.t0; for (const lx of [4, 26]) x.fillRect(lx, 11, 2, 12);
      x.fillStyle = P.t1; x.fillRect(13, 11, 6, 12);
    }
    const o = T.pixelize(c, P, P.out, CLUT.spr); o.ox = 16; o.oy = 23; return o;
  };
  // a flipped table: Doc Gila hides behind one (on its side, the top facing you)
  const flipped = (() => {                       // on its side: the round top facing you, two legs sticking out
    const c = T.canvas(32, 32), x = c.getContext('2d');
    x.fillStyle = P.out; x.fillRect(8, 2, 4, 12); x.fillRect(20, 2, 4, 12);
    x.fillStyle = P.t0; x.fillRect(9, 3, 2, 11); x.fillRect(21, 3, 2, 11);
    x.fillStyle = P.out; ell(x, 16, 21, 14, 10); x.fill();
    x.fillStyle = P.t1; ell(x, 16, 21, 13, 9); x.fill();
    x.fillStyle = P.t2; ell(x, 15, 20, 10, 6.5); x.fill();
    x.fillStyle = P.felt; ell(x, 15, 20, 6, 3.5); x.fill();
    x.fillStyle = P.t0; x.fillRect(3, 21, 26, 1);
    const o = T.pixelize(c, P, P.out, CLUT.spr); o.ox = 16; o.oy = 31; return o;
  })();
  const plank = (() => { const c = T.canvas(12, 6), x = c.getContext('2d'); x.fillStyle = P.out; x.fillRect(0, 1, 12, 4); x.fillStyle = P.t2; x.fillRect(1, 2, 10, 2); const o = T.pixelize(c, P, P.out, CLUT.spr); o.ox = 6; o.oy = 3; return o; })();
  return { sign: name => ({ up: sign(name, false), down: sign(name, true) }), table: table(), flipped, plank };
};
})();
