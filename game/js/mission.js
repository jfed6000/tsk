// Texas Shitkickers — the Mission at sundown: level 6 (story.md: "A last stand defending the town, Magnificent Seven
// or Alamo style"). The gang's full assault on the town; the only stage where he defends rather than hunts.
//   far    (scroll x0.25): the sun going down red behind the mesas
//   mid    (scroll x0.5): the town at the edge of the desert, its windows lit
//   street (scroll x1, one strip): the edge of town, the mission's long outer wall and its gate, then the courtyard -
//          the cloister arcades and the church, its doors the townsfolk are barred in behind (YARD on)
// The church doors are tiles (L.doors: a 64x80 patch of the street map over the doorway, one a state - on the F256, 20
// map entries rewritten when they change), never sprites: they can't be dropped when the sprites run out, and they
// darken with the night like the church. Sprites: a splinter; and the gang's enforcer, El Toro, the minotaur bull
// (64x64 like the other bosses, facing right, origin at his feet).
(function () {
'use strict';
const T = window.TSK;
const { PAL, CLUT } = T;
const ell = (c, x, y, rx, ry) => { c.beginPath(); c.ellipse(x, y, rx, ry, 0, 0, Math.PI * 2); };
function rng(seed) { return () => (seed = (seed * 16807) % 2147483647) / 2147483647; }

// W: the strip; YARD: where the courtyard starts (the siege's locked screen, YARD .. YARD + 320); DOOR: the church
// doors' x (the screen's middle), their foot on the back edge of the walking band
T.MISSION = { W: 1280, YARD: 960, DOOR: 1120, DOORS: { x: 1088, y: 80, w: 64, h: 80 } };   // (DOORS: the patch, on the 16-px tile grid)
const DP = { out: PAL.out, w0: '#7a4e2c', w1: '#5a361e', w2: '#94643a', ir: '#2e2a2c', ir2: '#5a5458', dk: '#24140e', bm: '#6a4428', bm2: '#8a5a34' };
const LIGHT = { win: '#ffcc66', win2: '#f0a848', fl0: '#ffe080', fl1: '#ffb040', fl2: '#e86a20' };   // lamplight and torches: night spares them
for (const c of Object.values(LIGHT)) T.MAIN_STREET_LIGHTS.add(c.toLowerCase());

T.buildMission = function (VW, VH, FLOOR) {
  const L = {}, r = rng(41), M = T.MISSION;
  // ---- far: sundown
  const far = T.canvas(640, VH), f = far.getContext('2d');
  const bands = ['#2a1a3a', '#3a1e46', '#52264e', '#6e2e50', '#8c3a4c', '#aa4c44', '#c8623c', '#e07e3a', '#f0a040'];
  const bh = Math.ceil(104 / bands.length);
  bands.forEach((col, i) => {
    f.fillStyle = col; f.fillRect(0, i * bh, 640, bh);
    if (i > 0) { f.fillStyle = bands[i - 1]; for (let y = 0; y < 3; y++) for (let x = y % 2; x < 640; x += 2) if (y < 2 || x % 4 === 0) f.fillRect(x, i * bh + y, 1, 1); }
  });
  f.fillStyle = bands[bands.length - 1]; f.fillRect(0, bh * bands.length, 640, VH);
  const SUN0 = '#ffd27a', SUN1 = '#fff0b8';
  f.fillStyle = SUN0; ell(f, 400, 100, 26, 26); f.fill(); f.fillStyle = SUN1; ell(f, 400, 100, 18, 18); f.fill();
  f.fillStyle = bands[5]; for (const y of [86, 94, 101]) f.fillRect(360, y, 80, 2);   // the low bars of cloud across it
  for (let i = 0; i < 5; i++) {                                    // long thin clouds, lit from under
    const cx = r() * 640, cy = 20 + r() * 50, w = 50 + r() * 70;
    f.fillStyle = '#5a2448'; f.fillRect(cx, cy, w, 3); f.fillStyle = '#e8784a'; f.fillRect(cx + 4, cy + 3, w - 8, 1);
  }
  let x = -20;                                                     // the mesas against it
  while (x < 660) {
    const w = 60 + r() * 120, h = 12 + r() * 28;
    f.fillStyle = '#4a2442'; f.fillRect(x + 8, 106 - h, w - 16, h + 10); f.fillRect(x, 106 - h * 0.45, w, h);
    f.fillStyle = '#6a3050'; f.fillRect(x + 8, 106 - h, w - 16, 1);
    x += w * (1.1 + r());
  }
  f.fillStyle = '#5a2a3a'; f.fillRect(0, 108, 640, VH);
  const FP = {}; bands.forEach((b, i) => FP['k' + i] = b);
  Object.assign(FP, { s0: SUN0, s1: SUN1, c0: '#5a2448', c1: '#e8784a', m0: '#4a2442', m1: '#6a3050', g0: '#5a2a3a' });
  L.far = T.pixelize(far, FP, null, CLUT.bg);

  // ---- mid: the town at the edge of the desert
  const MW = 640, mid = T.canvas(MW, VH), m = mid.getContext('2d');
  const A0 = '#8a5040', A1 = '#6e3c32', A2 = '#a8664c', G0 = '#6a3a34', G1 = '#7a463a', TR = '#3a2228', VG = '#3e2418';
  m.fillStyle = G0; m.fillRect(0, 128, MW, VH);
  m.fillStyle = G1; for (let i = 0; i < 120; i++) m.fillRect((r() * MW) | 0, 130 + ((r() * 100) | 0), 2 + ((r() * 3) | 0), 1);
  for (let hx = 6; hx < MW - 30;) {                               // adobe houses, flat roofs, the beam ends showing
    const w = 34 + r() * 40, h = 16 + r() * 22, top = 130 - h;
    if (r() < 0.25) {                                              // a mesquite between them
      m.fillStyle = TR; m.fillRect(hx + 8, top + 10, 3, h - 10); ell(m, hx + 9, top + 6, 12, 7); m.fill();
      hx += 26; continue;
    }
    m.fillStyle = A1; m.fillRect(hx, top, w, h);
    m.fillStyle = A0; m.fillRect(hx + 2, top + 2, w - 4, h - 2);
    m.fillStyle = A2; m.fillRect(hx, top, w, 2);
    m.fillStyle = VG; for (let vx = hx + 4; vx < hx + w - 3; vx += 8) m.fillRect(vx, top + 4, 3, 2);
    for (let wx = hx + 7; wx < hx + w - 10; wx += 15) { m.fillStyle = r() < 0.7 ? LIGHT.win : A1; m.fillRect(wx, top + 10, 5, 6); }
    m.fillStyle = A1; m.fillRect(hx + w / 2 - 3, 122, 6, 8);   // the door
    hx += w + 4 + r() * 16;
  }
  m.fillStyle = VG; m.fillRect(470, 74, 3, 56); m.fillRect(498, 74, 3, 56); m.fillRect(468, 98, 34, 2);   // the water tower
  m.fillStyle = A1; m.fillRect(462, 52, 46, 24); m.fillStyle = A0; m.fillRect(464, 54, 42, 20);
  m.fillStyle = VG; for (const y of [58, 66]) m.fillRect(462, y, 46, 1); m.fillRect(460, 50, 50, 3);
  L.mid = T.pixelize(mid, { a0: A0, a1: A1, a2: A2, g0: G0, g1: G1, tr: TR, vg: VG, win: LIGHT.win }, null, CLUT.bg);

  // ---- street: the edge of town, the mission's wall and gate, the courtyard and the church
  const W = M.W, st = T.canvas(W, VH), s = st.getContext('2d');
  const OUT = '#1e1416', D0 = '#a8744a', D1 = '#8e5e3a', D2 = '#c08a5a', F0 = '#a88468', F1 = '#7a5a44', F2 = '#c2a080';
  const W0 = '#c8946a', W1 = '#b07a54', W2 = '#dcae80', BR = '#8a4a32', BM = '#5a3a24', DK = '#2a1814', WD = '#6a4428', WD2 = '#4a2e1a';
  const TL = '#a84a30', TL2 = '#7a3220', BZ = '#b08a3a', BZ2 = '#7a5a20', IRON = '#2e2a2c';
  const BASE = 146;                                                // the foot of the walls: the back edge of the band
  // the ground: dirt outside, flagstones in the courtyard
  s.fillStyle = D0; s.fillRect(0, BASE, M.YARD, VH - BASE);
  s.fillStyle = D1; for (let i = 0; i < 500; i++) s.fillRect((r() * M.YARD) | 0, BASE + 2 + ((r() * 90) | 0), 2 + ((r() * 4) | 0), 1);
  s.fillStyle = D2; for (let i = 0; i < 160; i++) s.fillRect((r() * M.YARD) | 0, BASE + 2 + ((r() * 90) | 0), 1, 1);
  s.fillStyle = D1; for (const y of [176, 204]) for (let px = 0; px < M.YARD; px += 2) s.fillRect(px, y + Math.round(Math.sin(px / 37) * 2), 2, 1);   // wheel ruts
  s.fillStyle = F1; s.fillRect(M.YARD, BASE, W - M.YARD, VH - BASE);
  for (let y = BASE + 1, row = 0; y < VH; row++) {                // flagstones, rows getting deeper toward you
    const hgt = 7 + row * 2;
    for (let px = M.YARD + ((row % 2) * 13) - 13; px < W; px += 26) {
      s.fillStyle = F0; s.fillRect(px + 1, y, 24, hgt - 1); s.fillStyle = F2; s.fillRect(px + 1, y, 24, 1);
    }
    y += hgt;
  }
  s.fillStyle = OUT; s.fillRect(0, BASE, W, 1);
  // the edge of town: a well, a cart wheel, prickly pear
  s.fillStyle = WD2; s.fillRect(104, 100, 3, 40); s.fillRect(135, 100, 3, 40); s.fillRect(100, 98, 42, 4);   // the well's frame
  s.fillStyle = IRON; s.fillRect(120, 102, 1, 14); s.fillStyle = WD; s.fillRect(116, 114, 9, 8);   // the bucket
  s.fillStyle = BR; s.fillRect(98, 126, 46, BASE - 126); s.fillStyle = W1; for (let px = 98; px < 144; px += 9) s.fillRect(px + 1, 127, 7, 5);
  s.fillStyle = W0; for (let px = 102; px < 144; px += 9) s.fillRect(px, 134, 7, 5);
  s.fillStyle = OUT; ell(s, 200, 128, 15, 15); s.fill(); s.fillStyle = WD; ell(s, 200, 128, 13, 13); s.fill(); s.fillStyle = D0; ell(s, 200, 128, 10, 10); s.fill();
  s.strokeStyle = WD; s.lineWidth = 2; for (let k = 0; k < 6; k++) { const a = k * Math.PI / 3; s.beginPath(); s.moveTo(200, 128); s.lineTo(200 + Math.cos(a) * 11, 128 + Math.sin(a) * 11); s.stroke(); }
  s.fillStyle = WD2; ell(s, 200, 128, 3, 3); s.fill();
  for (const [cx, cy, rx] of [[40, 136, 7], [50, 128, 6], [32, 128, 5], [236, 138, 6], [244, 131, 5]]) {   // prickly pear pads
    s.fillStyle = '#3e5a2a'; ell(s, cx, cy, rx, rx + 2); s.fill(); s.fillStyle = '#5a7a3a'; ell(s, cx - 1, cy - 1, rx - 2, rx); s.fill();
  }
  // the outer wall: adobe, plaster flaking off the brick, buttresses, the beam ends
  const WTOP = 92;
  s.fillStyle = W1; s.fillRect(260, WTOP, M.YARD - 260, BASE - WTOP);
  s.fillStyle = W0; s.fillRect(260, WTOP + 3, M.YARD - 260, BASE - WTOP - 3);
  s.fillStyle = W2; s.fillRect(258, WTOP - 2, M.YARD - 258, 4);
  s.fillStyle = OUT; s.fillRect(258, WTOP - 3, M.YARD - 258, 1); s.fillRect(258, WTOP - 3, 1, BASE - WTOP + 3);
  for (let i = 0; i < 14; i++) {                                   // where the plaster's gone: brick
    const bx = 280 + r() * (M.YARD - 340), by = WTOP + 10 + r() * 34, bw = 10 + r() * 18, bh2 = 6 + r() * 8;
    s.fillStyle = W1; s.fillRect(bx - 1, by - 1, bw + 2, bh2 + 2);
    s.fillStyle = BR; s.fillRect(bx, by, bw, bh2);
    s.fillStyle = W1; for (let yy = by + 3; yy < by + bh2; yy += 4) s.fillRect(bx, yy, bw, 1);
  }
  s.fillStyle = BM; for (let px = 270; px < M.YARD - 50; px += 22) s.fillRect(px, WTOP + 6, 4, 3);
  for (let px = 380; px < M.YARD - 90; px += 150) {                // buttresses
    s.fillStyle = W1; s.fillRect(px, WTOP + 14, 18, BASE - WTOP - 14); s.fillStyle = W2; s.fillRect(px, WTOP + 14, 18, 2); s.fillRect(px, WTOP + 14, 2, BASE - WTOP - 14);
  }
  // the gate: an arch in the wall, the heavy leaves swung back
  const GX = 880, GW = 50;
  s.fillStyle = DK; s.fillRect(GX, WTOP + 16, GW, BASE - WTOP - 16); ell(s, GX + GW / 2, WTOP + 16, GW / 2, 12); s.fill();
  s.fillStyle = W2; for (let a = 0; a <= 8; a++) { const t = Math.PI + a * Math.PI / 8; s.fillRect(GX + GW / 2 + Math.cos(t) * (GW / 2 + 3) - 2, WTOP + 16 + Math.sin(t) * 15 - 2, 5, 4); }
  for (const lx of [GX - 14, GX + GW]) {
    s.fillStyle = WD2; s.fillRect(lx, WTOP + 22, 14, BASE - WTOP - 22); s.fillStyle = WD; for (let px = lx + 1; px < lx + 13; px += 4) s.fillRect(px, WTOP + 23, 3, BASE - WTOP - 24);
    s.fillStyle = IRON; s.fillRect(lx, WTOP + 30, 14, 2); s.fillRect(lx, BASE - 14, 14, 2);
  }
  // the courtyard: the cloister arcades either side, roofed in red tile
  const arcade = (x0, x1) => {
    s.fillStyle = TL2; s.fillRect(x0, 82, x1 - x0, 10); s.fillStyle = TL; for (let px = x0; px < x1; px += 6) s.fillRect(px, 82, 4, 8);
    s.fillStyle = OUT; s.fillRect(x0, 81, x1 - x0, 1);
    s.fillStyle = W0; s.fillRect(x0, 92, x1 - x0, BASE - 92);
    for (let px = x0 + 6; px + 30 <= x1; px += 36) {
      s.fillStyle = DK; s.fillRect(px, 106, 30, BASE - 106); ell(s, px + 15, 106, 15, 10); s.fill();
      s.fillStyle = W2; s.fillRect(px - 3, 104, 3, BASE - 104);
      s.fillStyle = LIGHT.win2; s.fillRect(px + 9, 116, 12, 14);   // a lit doorway deep in the cloister
      s.fillStyle = DK; s.fillRect(px + 14, 116, 2, 14);
    }
  };
  arcade(M.YARD, M.DOOR - 70); arcade(M.DOOR + 70, W);
  // the church: a curved mission parapet, the bell in its niche, the rose window, the doorway (the doors are a sprite)
  const CX = M.DOOR, CW = 128, C0 = CX - CW / 2, CTOP = 46;
  s.fillStyle = W1; s.fillRect(C0, CTOP + 18, CW, BASE - CTOP - 18);
  s.fillStyle = W0; s.fillRect(C0 + 3, CTOP + 20, CW - 6, BASE - CTOP - 20);
  s.beginPath(); s.moveTo(C0, CTOP + 18);                          // the parapet: scrolls up to a crown
  s.quadraticCurveTo(C0 + 12, CTOP + 6, C0 + 28, CTOP + 12); s.quadraticCurveTo(C0 + 44, CTOP - 2, CX - 12, CTOP - 4);
  s.lineTo(CX - 12, CTOP - 22); s.quadraticCurveTo(CX, CTOP - 34, CX + 12, CTOP - 22); s.lineTo(CX + 12, CTOP - 4);
  s.quadraticCurveTo(C0 + CW - 44, CTOP - 2, C0 + CW - 28, CTOP + 12); s.quadraticCurveTo(C0 + CW - 12, CTOP + 6, C0 + CW, CTOP + 18);
  s.closePath(); s.fillStyle = W0; s.fill(); s.strokeStyle = OUT; s.lineWidth = 1; s.stroke();
  s.fillStyle = W2; s.fillRect(C0, CTOP + 18, CW, 2);
  s.fillStyle = DK; s.fillRect(CX - 6, CTOP - 20, 12, 14); ell(s, CX, CTOP - 20, 6, 5); s.fill();   // the bell's niche
  s.fillStyle = BZ2; s.beginPath(); s.moveTo(CX - 5, CTOP - 8); s.quadraticCurveTo(CX, CTOP - 22, CX + 5, CTOP - 8); s.fill();
  s.fillStyle = BZ; s.fillRect(CX - 3, CTOP - 16, 2, 7);
  s.fillStyle = WD2; s.fillRect(CX - 1, CTOP - 40, 2, 10); s.fillRect(CX - 4, CTOP - 37, 8, 2);   // the cross on the crown
  s.fillStyle = W1; ell(s, CX, CTOP + 34, 11, 11); s.fill();       // the rose window
  s.fillStyle = LIGHT.win2; ell(s, CX, CTOP + 34, 8, 8); s.fill();
  s.fillStyle = W1; s.fillRect(CX - 8, CTOP + 33, 16, 2); s.fillRect(CX - 1, CTOP + 26, 2, 16);
  for (const px of [C0 + 12, C0 + CW - 20]) {                      // pilasters, a statue niche each side
    s.fillStyle = W2; s.fillRect(px, CTOP + 22, 8, BASE - CTOP - 22); s.fillStyle = W1; s.fillRect(px + 6, CTOP + 22, 2, BASE - CTOP - 22);
  }
  for (const px of [C0 + 26, C0 + CW - 38]) { s.fillStyle = DK; s.fillRect(px, CTOP + 30, 12, 20); ell(s, px + 6, CTOP + 30, 6, 5); s.fill(); s.fillStyle = W1; s.fillRect(px + 4, CTOP + 34, 4, 16); ell(s, px + 6, CTOP + 33, 2, 2); s.fill(); }
  const DW = 44, DH = 62;                                           // the doorway's arch (the doors fill it)
  s.fillStyle = W2; s.fillRect(CX - DW / 2 - 5, BASE - DH - 2, DW + 10, DH + 2); ell(s, CX, BASE - DH - 2, DW / 2 + 5, 12); s.fill();
  s.fillStyle = DK; s.fillRect(CX - DW / 2, BASE - DH + 6, DW, DH - 6); ell(s, CX, BASE - DH + 6, DW / 2, 10); s.fill();
  for (const tx of [CX - 34, CX + 34]) {                            // the torches in their iron sconces
    s.fillStyle = IRON; s.fillRect(tx - 1, 104, 3, 10); s.fillRect(tx - 4, 102, 9, 3);
    s.fillStyle = LIGHT.fl2; ell(s, tx, 96, 4, 6); s.fill(); s.fillStyle = LIGHT.fl1; ell(s, tx, 97, 3, 4); s.fill(); s.fillStyle = LIGHT.fl0; ell(s, tx, 98, 1.5, 2); s.fill();
  }
  T.drawText(s, 'MISION SAN ROQUE', 790, WTOP + 16, '#5a3a24', 1, null, 'center');   // painted on the wall by the gate
  const SPAL = { out: OUT, d0: D0, d1: D1, d2: D2, f0: F0, f1: F1, f2: F2, w0: W0, w1: W1, w2: W2, br: BR, bm: BM, dk: DK,
    wd: WD, wd2: WD2, tl: TL, tl2: TL2, bz: BZ, bz2: BZ2, iron: IRON, pr0: '#3e5a2a', pr1: '#5a7a3a', sign: '#5a3a24',
    win2: LIGHT.win2, fl0: LIGHT.fl0, fl1: LIGHT.fl1, fl2: LIGHT.fl2 };
  L.street = T.pixelize(st, SPAL, null, CLUT.bg);
  // the doors, one patch of street a state: the doorway with the doors drawn in (shut, battered, nearly through, busted)
  const P = M.DOORS, pal = Object.assign({}, SPAL); Object.entries(DP).forEach(([k, v]) => pal['door_' + k] = v);
  L.doors = doorFrames().map(fr => {
    const cv = T.canvas(P.w, P.h), c = cv.getContext('2d');
    c.drawImage(L.street, P.x, P.y, P.w, P.h, 0, 0, P.w, P.h);
    c.drawImage(fr, M.DOOR - 24 - P.x, BASE + 1 - 63 - P.y);
    return T.pixelize(cv, pal, null, CLUT.bg);
  });
  return L;
};

// the church doors: two plank leaves under the arch, iron straps, a beam barred across. 0 shut, 1 battered (splintered
// planks), 2 nearly through (holes, the beam cracked), 3 busted in (a leaf hanging, the dark showing). 48x64, the origin
// at the foot of the middle (drawn into the street's door patches above).
function doorFrames() {
  return [0, 1, 2, 3].map(k => {
    const cv = T.canvas(48, 64), c = cv.getContext('2d'), rr = rng(7 + k);
    c.translate(24, 63);
    c.save(); c.beginPath(); c.rect(-22, -54, 44, 54); c.ellipse(0, -54, 22, 10, 0, Math.PI, 0); c.clip();
    c.fillStyle = DP.dk; c.fillRect(-24, -66, 48, 66);
    for (const side of [-1, 1]) {
      if (k === 3 && side > 0) continue;                           // busted: the right leaf's gone
      const x0 = side < 0 ? -22 : 0;
      c.fillStyle = DP.w1; c.fillRect(x0, -66, 22, 66);
      for (let px = x0 + 1; px < x0 + 22; px += 5) { c.fillStyle = DP.w0; c.fillRect(px, -66, 4, 66); c.fillStyle = DP.w2; c.fillRect(px, -66, 1, 66); }
      c.fillStyle = DP.ir; for (const y of [-46, -16]) c.fillRect(x0 + 1, y, 20, 3);
      c.fillStyle = DP.ir2; for (const y of [-46, -16]) for (let px = x0 + 3; px < x0 + 21; px += 6) c.fillRect(px, y + 1, 1, 1);
    }
    c.fillStyle = DP.out; c.fillRect(-1, -66, 2, 66);
    const holes = k === 1 ? 3 : k === 2 ? 7 : 0;                   // splintered planks: holes, the jagged dark through them
    for (let i = 0; i < holes; i++) {
      const hx = -18 + rr() * 34, hy = -50 + rr() * 42, hw = 3 + rr() * 5, hh = 4 + rr() * (k === 2 ? 9 : 5);
      c.fillStyle = DP.dk; c.beginPath(); c.moveTo(hx, hy); c.lineTo(hx + hw, hy + 1); c.lineTo(hx + hw - 1, hy + hh); c.lineTo(hx + 1, hy + hh - 1); c.fill();
      c.fillStyle = DP.w2; c.fillRect(hx - 1, hy - 1, hw + 1, 1);
    }
    if (k === 3) {                                                 // the right leaf hanging off one hinge, inward
      c.save(); c.translate(20, -50); c.rotate(0.5); c.fillStyle = DP.w1; c.fillRect(-4, 0, 8, 44); c.fillStyle = DP.w0; c.fillRect(-3, 0, 3, 44); c.restore();
    }
    c.restore();
    if (k < 3) {                                                   // the beam barred across, in its brackets (cracked at 2)
      c.fillStyle = DP.ir; c.fillRect(-24, -34, 5, 8); c.fillRect(19, -34, 5, 8);
      c.fillStyle = DP.out; c.fillRect(-23, -33, 46, 7); c.fillStyle = DP.bm; c.fillRect(-22, -32, 44, 5); c.fillStyle = DP.bm2; c.fillRect(-22, -32, 44, 1);
      if (k === 2) { c.fillStyle = DP.out; c.beginPath(); c.moveTo(-3, -33); c.lineTo(2, -29); c.lineTo(-1, -26); c.lineTo(1, -29); c.fill(); }
    }
    return cv;
  });
}
// a splinter flying off the doors
T.buildMissionSprites = function () {
  const sp = T.canvas(8, 8), c = sp.getContext('2d');
  c.fillStyle = DP.w0; c.fillRect(1, 3, 6, 2); c.fillStyle = DP.w2; c.fillRect(1, 3, 6, 1);
  const splinter = T.pixelize(sp, DP, PAL.out, CLUT.spr); splinter.ox = 4; splinter.oy = 4;
  return { splinter };
};

// ---------------------------------------------------------------- El Toro
// A minotaur in the gang's colours: a bull's head on a wall of a chest, horns that sweep back and curl forward, a brass
// ring through his nose, a red bandana, blue jeans and a big buckle, hooves. Pose: lean (forward, rad), head (down, rad),
// legs (the stride's phase) and stride, arms ('hang', 'pump', 'up', 'down', 'hook', 'flex', 'brace'), crouch, eyes,
// mouth, steam (snorting), stars (dizzy), dx (shifted back so the charge fits the frame), lie (knocked flat on his back).
const TP = {
  out: PAL.out, h0: '#2e1a12', h1: '#4e2e1c', h2: '#6e4428', mz: '#9a6a4e', mz2: '#bc8c6a', hn: '#ecdcb8', hn2: '#b8a282', tip: '#4a3a2a',
  ring: '#e8c040', jn: '#34446a', jn2: '#4e6294', belt: '#2a1a10', bk: '#e8c040', hoof: '#1e1416', band: '#b02a24', band2: '#d8483a',
  eyeW: PAL.eyeW, pupil: PAL.pupil, red: '#ff4a2a', mouth: PAL.mouth, steam: '#e4e2ec', star: '#ffd34a',
};
const DT = { lean: 0, head: 0, legs: 0, stride: 0, arms: 'hang', crouch: 0, eyes: 'mad', mouth: 0, steam: 0, stars: -1, dx: 0, lie: false, armPh: 0 };

function drawToro(c, o) {
  const p = Object.assign({}, DT, o);
  if (p.lie) {                                                     // flat on his back, head to the left, hooves up a little
    c.save(); c.translate(26, -5); c.rotate(-Math.PI / 2 + 0.08); drawToro(c, Object.assign({}, o, { lie: false, crouch: 0.6, lean: 0, head: -0.3 })); c.restore();
    return;
  }
  c.lineCap = 'round'; c.lineJoin = 'round';
  const line = (pts, w, col) => {
    c.beginPath(); c.moveTo(pts[0][0], pts[0][1]); for (const q of pts.slice(1)) c.lineTo(q[0], q[1]);
    c.strokeStyle = TP.out; c.lineWidth = w + 2; c.stroke(); c.strokeStyle = col; c.lineWidth = w; c.stroke();
  };
  c.save(); c.translate(p.dx, 0); c.scale(0.92, 0.92);           // (a big lad: scaled to keep his horns in the frame)
  const hipY = -20 + p.crouch * 7;
  const leg = (far, ph) => {                                       // jeans to the knee and down, a split hoof
    const a = Math.sin(ph) * p.stride, hx = (far ? -3 : 2), lift = Math.max(0, Math.cos(ph)) * p.stride * 5;
    const fx = hx + Math.sin(a) * 15, fy = -lift - (far ? 1 : 0);
    const kx = (hx + fx) / 2 + 3 + p.crouch * 4, ky = (hipY + fy) / 2 - p.crouch * 2;
    line([[hx, hipY], [kx, ky], [fx, fy - 3]], 7, far ? TP.jn : TP.jn2);
    c.fillStyle = TP.out; c.fillRect(fx - 4, fy - 4, 9, 5); c.fillStyle = TP.hoof; c.fillRect(fx - 3, fy - 3, 7, 3);
    c.fillStyle = TP.h2; c.fillRect(fx - 3, fy - 5, 7, 1);
  };
  const ARM = {                                                    // [elbow, fist] from the shoulder, per pose
    hang: [[2, 9], [5, 16]], up: [[2, -9], [6, -17]], down: [[8, 8], [13, 18]], hook: [[9, 4], [16, 0]],
    flex: [[-5, 3], [-4, -7]], brace: [[-6, 6], [-11, 9]],
  };
  const arm = (sx, sy, near) => {
    let [e, f] = ARM[p.arms] || ARM.hang;
    if (p.arms === 'pump') { const k = Math.sin(p.armPh + (near ? 0 : Math.PI)) * 6; e = [2 + k * 0.4, 9]; f = [5 + k, 15 - Math.abs(k) * 0.3]; }
    if (p.arms === 'flex' && near) { e = [8, 3]; f = [9, -8]; }
    line([[sx, sy], [sx + e[0], sy + e[1]], [sx + f[0], sy + f[1]]], 5, near ? TP.h1 : TP.h0);
    ell(c, sx + f[0], sy + f[1], 3.6, 3.4); c.fillStyle = near ? TP.h1 : TP.h0; c.fill(); c.strokeStyle = TP.out; c.lineWidth = 1; c.stroke();
  };
  leg(true, p.legs + Math.PI);
  c.save(); c.translate(0, hipY); c.rotate(p.lean);
  arm(-2, -22, false);                                             // the far arm, behind
  ell(c, 3, -14, 13, 13); c.fillStyle = TP.h1; c.fill(); c.strokeStyle = TP.out; c.lineWidth = 1; c.stroke();   // the chest
  ell(c, 6, -10, 8, 7.5); c.fillStyle = TP.h2; c.fill();           // the belly, lighter
  c.fillStyle = TP.h0; c.fillRect(-6, -20, 4, 1); c.fillRect(2, -17, 6, 1);   // the hair on the chest
  c.fillStyle = TP.out; c.fillRect(-10, -3, 23, 5); c.fillStyle = TP.belt; c.fillRect(-9, -2, 21, 3);   // the belt, the buckle
  c.fillStyle = TP.out; c.fillRect(6, -4, 8, 7); c.fillStyle = TP.bk; c.fillRect(7, -3, 6, 5); c.fillStyle = TP.belt; c.fillRect(9, -2, 2, 3);
  c.save(); c.translate(10, -24); c.rotate(p.head);               // the head, about the neck
  c.fillStyle = TP.band; c.beginPath(); c.moveTo(-6, 2); c.lineTo(6, 3); c.lineTo(1, 9); c.closePath(); c.fill(); c.strokeStyle = TP.out; c.stroke();   // the bandana
  c.fillStyle = TP.band2; c.fillRect(-3, 3, 5, 1);
  const horn = (dx2, dy2, col, w) => {                             // back from the poll, then sweeping up and forward
    c.beginPath(); c.moveTo(1 + dx2, -9 + dy2); c.bezierCurveTo(-8 + dx2, -10 + dy2, -8 + dx2, -19 + dy2, 5 + dx2, -20 + dy2);
    c.strokeStyle = TP.out; c.lineWidth = w + 2; c.stroke(); c.strokeStyle = col; c.lineWidth = w; c.stroke();
    c.beginPath(); c.moveTo(1 + dx2, -19.8 + dy2); c.lineTo(6 + dx2, -20.2 + dy2); c.strokeStyle = TP.tip; c.lineWidth = Math.max(1.5, w - 1.5); c.stroke();
  };
  horn(4, 1, TP.hn2, 3.2);                                         // the far horn
  ell(c, 2, -5, 7.5, 7); c.fillStyle = TP.h1; c.fill(); c.strokeStyle = TP.out; c.lineWidth = 1; c.stroke();   // the skull
  ell(c, -5, -6, 4, 2); c.fillStyle = TP.h0; c.fill(); c.stroke();  // the ear
  ell(c, 9, -1, 6.4, 4.8); c.fillStyle = TP.mz; c.fill(); c.stroke();   // the muzzle
  c.fillStyle = TP.mz2; c.fillRect(6, -4, 6, 1);
  c.fillStyle = TP.out; c.fillRect(13, -3, 2, 2);                  // the nostril
  if (p.mouth) { c.fillStyle = TP.out; c.fillRect(7, 2, 8, 1 + p.mouth); c.fillStyle = TP.mouth; c.fillRect(8, 2, 6, p.mouth); }
  c.strokeStyle = TP.out; c.lineWidth = 2.6; ell(c, 14, 1.5, 2.2, 2.2); c.stroke(); c.strokeStyle = TP.ring; c.lineWidth = 1.2; c.stroke();   // the ring
  const ex = 3, ey = -7;                                           // the eye under a heavy brow
  if (p.eyes === 'x') { c.strokeStyle = TP.eyeW; c.lineWidth = 1; c.beginPath(); c.moveTo(ex - 1, ey - 1); c.lineTo(ex + 2, ey + 2); c.moveTo(ex + 2, ey - 1); c.lineTo(ex - 1, ey + 2); c.stroke(); }
  else {
    c.fillStyle = TP.out; c.fillRect(ex - 1, ey - 1, 4, 4);
    c.fillStyle = p.eyes === 'red' ? TP.red : TP.eyeW; c.fillRect(ex, ey, 2, 2);
    if (p.eyes !== 'red') { c.fillStyle = TP.pupil; c.fillRect(p.eyes === 'daze' ? ex : ex + 1, ey, 1, 2); }
    if (p.eyes !== 'daze') { c.fillStyle = TP.out; c.fillRect(ex - 1, ey - 2, 5, 1); c.fillRect(ex + 2, ey - 3, 3, 1); }
  }
  horn(0, 0, TP.hn, 3.6);                                          // the near horn
  if (p.steam) for (const [sx, sy, rr2] of [[16, 0, 2.2], [19, -2, 2.6], [22, 1, 1.8]]) { ell(c, sx + p.steam, sy, rr2, rr2 * 0.8); c.fillStyle = TP.steam; c.fill(); }
  c.restore();
  c.restore();
  leg(false, p.legs);
  c.save(); c.translate(0, hipY); c.rotate(p.lean);
  arm(7, -21, true);                                               // the near arm, in front
  c.restore();
  c.restore();
  if (p.stars >= 0) for (let i = 0; i < 3; i++) {
    const a2 = p.stars + i * Math.PI * 2 / 3, x = 6 + Math.cos(a2) * 12, y = -54 + Math.sin(a2) * 3;
    c.fillStyle = TP.star; c.fillRect(x - 2, y - 0.5, 4, 1); c.fillRect(x - 0.5, y - 2, 1, 4);
  }
}

T.buildToro = function () {
  const B = T.BOSS, TAU = Math.PI * 2;
  const bake = fn => { const cv = T.canvas(B.FW, B.FH), x = cv.getContext('2d'); x.translate(B.OX, B.OY); fn(x); return T.pixelize(cv, TP, TP.out, T.CLUT.spr); };
  const mk = o => bake(x => drawToro(x, o));
  return {
    idle: [mk({}), mk({ crouch: 0.15, mouth: 0 })],
    walk: [0, 1, 2, 3].map(i => mk({ legs: i / 4 * TAU, stride: 0.5, arms: 'pump', armPh: i / 4 * TAU, lean: 0.06 })),
    talk: [mk({ arms: 'flex', mouth: 2 }), mk({ arms: 'flex', mouth: 1, crouch: 0.1 })],
    paw: [mk({ lean: 0.3, head: 0.5, arms: 'brace', legs: 1.2, stride: 0.55, eyes: 'red', steam: 0, dx: -6 }),   // pawing the dirt, snorting
      mk({ lean: 0.3, head: 0.55, arms: 'brace', legs: -0.4, stride: 0.55, eyes: 'red', steam: 3, dx: -6 })],
    charge: [0, 1].map(i => mk({ lean: 0.5, head: 1.3, arms: 'brace', legs: i * Math.PI, stride: 0.75, eyes: 'red', dx: -9 })),
    stuck: [0, 1].map(i => mk({ lean: 0.55, head: 1.35, arms: 'hang', legs: 0.6 + i * 0.3, stride: 0.5, eyes: 'daze', mouth: 1, dx: -9 + i })),   // horns in the wall
    hookw: mk({ lean: 0.25, head: 1.2, arms: 'down', crouch: 0.5, eyes: 'red', dx: -3 }),   // head low to scoop
    hook: mk({ lean: -0.15, head: -0.7, arms: 'up', crouch: 0, mouth: 2, eyes: 'mad' }),     // and the horns flung up
    rear: mk({ lean: -0.18, head: -0.25, arms: 'up', mouth: 2, eyes: 'red' }),               // up on his hooves, fists high
    stomp: mk({ lean: 0.35, head: 0.4, arms: 'down', crouch: 1, mouth: 1, eyes: 'red', dx: -3 }),   // and down: the ground shakes
    hurt: mk({ lean: -0.25, head: -0.35, arms: 'flex', eyes: 'x', mouth: 2 }),
    daze: [0, 1, 2, 3].map(i => mk({ eyes: 'daze', lean: -0.05 + (i % 2) * 0.08, mouth: 1, stars: i / 4 * TAU / 3, head: 0.1 })),
    ko: mk({ lie: true, eyes: 'x', mouth: 2, arms: 'up' }),
  };
};
})();
