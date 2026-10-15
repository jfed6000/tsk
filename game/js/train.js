// Texas Shitkickers — the Train Heist at midday: level 5, Sting's (story.md: "Fighting along the roofs of a moving
// train. The tunnel ducking writes itself.").
//   far    (scroll x0.25, and the train's motion slowly): a hot blue sky, mesas in the haze
//   mid    (scroll x0.5, and the train's motion at full speed): the desert going by - scrub, cacti, telegraph poles -
//          and the track bed, which shows between the cars and under them
//   street (scroll x1, one strip): the train, caboose to engine, its roofs the floor; the gaps between the cars are
//          see-through (the ground rushing by), and so is everything above the roofline but the cupola, the coal and
//          the cab
// The train runs to the right, so the scenery streams left whatever the camera does (brawler.js render: S.train).
// Sprites: the tunnel's mouth, a band of stone that sweeps across the screen (brawler.js updateTunnel).
(function () {
'use strict';
const T = window.TSK;
const { PAL, CLUT } = T;
const ell = (c, x, y, rx, ry) => { c.beginPath(); c.ellipse(x, y, rx, ry, 0, 0, Math.PI * 2); };
function rng(seed) { return () => (seed = (seed * 16807) % 2147483647) / 2147483647; }

// the train, caboose (left) to engine (right): [x0, x1, kind]; between cars, a gap you jump (fall in: 3, and back)
const CARS = [[0, 206, 'caboose'], [230, 490, 'box'], [514, 774, 'cattle'], [798, 1058, 'box2'], [1082, 1382, 'coach'],
  [1406, 1690, 'express'], [1712, 1868, 'tender'], [1868, 2032, 'loco']];
const GAPS = [];
for (let i = 1; i < CARS.length; i++) if (CARS[i][0] > CARS[i - 1][1]) GAPS.push([CARS[i - 1][1], CARS[i][0]]);
// W: the strip; ZMAX: the roof's depth (the walking band, 48 px: narrower than a street); ROOF: the roofline's y
// (the far edge, a little behind z 0); LIP: the near edge; CLEAR: a tunnel's clearance over the roof, in height -
// standing he's 56, flat 20; V: the scenery's speed (px/s) on the mid layer, FAR on the far one
T.TRAIN = { W: 2032, CARS, GAPS, ZMAX: 48, ROOF: 146, LIP: 202, CLEAR: 36, V: 200, FAR: 14 };

T.buildTrain = function (VW, VH, FLOOR) {
  const L = {}, r = rng(23), R = T.TRAIN;
  // ---- far: midday
  const far = T.canvas(640, VH), f = far.getContext('2d');
  const bands = ['#3a6ab8', '#4a7ac4', '#5a8ace', '#6c9cd6', '#82acdc', '#9cbee0', '#b8d0e2', '#d2dee0'];
  const bh = Math.ceil(100 / bands.length);
  bands.forEach((col, i) => {
    f.fillStyle = col; f.fillRect(0, i * bh, 640, bh);
    if (i > 0) { f.fillStyle = bands[i - 1]; for (let y = 0; y < 3; y++) for (let x = y % 2; x < 640; x += 2) if (y < 2 || x % 4 === 0) f.fillRect(x, i * bh + y, 1, 1); }
  });
  f.fillStyle = bands[bands.length - 1]; f.fillRect(0, bh * bands.length, 640, VH);
  for (let i = 0; i < 6; i++) {                                   // fair-weather clouds
    const cx = r() * 640, cy = 18 + r() * 40, w = 30 + r() * 40;
    f.fillStyle = '#eef2f4'; for (let k = 0; k < 4; k++) { ell(f, cx + k * w / 4, cy - (k % 2) * 4, w / 4, 6); f.fill(); }
    f.fillStyle = '#c8d6e4'; f.fillRect(cx - w / 8, cy + 3, w, 2);
  }
  let x = -20;                                                    // mesas in the haze
  while (x < 660) {
    const w = 60 + r() * 120, h = 14 + r() * 26;
    f.fillStyle = '#8a8ab0'; f.fillRect(x + 8, 104 - h, w - 16, h + 10); f.fillRect(x, 104 - h * 0.45, w, h);
    f.fillStyle = '#a2a0c0'; f.fillRect(x + 8, 104 - h, w - 16, 2);
    x += w * (1.1 + r());
  }
  f.fillStyle = '#c8a878'; f.fillRect(0, 106, 640, VH);
  const FP = {}; bands.forEach((b, i) => FP['k' + i] = b);
  Object.assign(FP, { c0: '#eef2f4', c1: '#c8d6e4', m0: '#8a8ab0', m1: '#a2a0c0', d0: '#c8a878' });
  L.far = T.pixelize(far, FP, null, CLUT.bg);

  // ---- mid: the desert going by, and the track bed
  const MW = 960, mid = T.canvas(MW, VH), m = mid.getContext('2d');
  const D0 = '#d8b07a', D1 = '#c49460', D2 = '#a87a4a', SC = '#6a7a3a', SC2 = '#4a5a2a', PO = '#5a3a24', WI = '#2a2a2a';
  m.fillStyle = D0; m.beginPath(); m.moveTo(0, 124);
  for (let px = 0; px <= MW; px += 16) m.lineTo(px, 110 + 5 * Math.sin(px / MW * Math.PI * 6) + 3 * Math.sin(px / MW * Math.PI * 14));
  m.lineTo(MW, 124); m.fill(); m.fillRect(0, 122, MW, VH);
  m.fillStyle = D1; for (let i = 0; i < 160; i++) m.fillRect((r() * MW) | 0, 118 + ((r() * 100) | 0), 2 + ((r() * 4) | 0), 1);
  m.fillStyle = D2; for (let i = 0; i < 60; i++) m.fillRect((r() * MW) | 0, 130 + ((r() * 90) | 0), 1, 1);
  for (let i = 0; i < 14; i++) {                                  // scrub
    const sx = r() * MW, sy = 116 + r() * 20;
    m.fillStyle = SC2; ell(m, sx, sy, 5, 3); m.fill(); m.fillStyle = SC; ell(m, sx - 1, sy - 1, 3, 2); m.fill();
  }
  for (const cx of [140, 420, 610, 860]) {                        // saguaros
    const h = 30 + r() * 14, by = 122;
    m.fillStyle = SC2; m.fillRect(cx - 3, by - h, 6, h); m.fillRect(cx - 11, by - h * 0.6, 4, h * 0.3); m.fillRect(cx - 11, by - h * 0.32, 10, 3);
    m.fillRect(cx + 7, by - h * 0.75, 4, h * 0.35); m.fillRect(cx + 2, by - h * 0.42, 9, 3);
    m.fillStyle = SC; m.fillRect(cx - 2, by - h + 1, 2, h - 2); m.fillRect(cx - 10, by - h * 0.6 + 1, 1, h * 0.28); m.fillRect(cx + 8, by - h * 0.75 + 1, 1, h * 0.33);
  }
  const poles = [];                                               // the telegraph line, every 160 px
  for (let px = 40; px < MW; px += 160) poles.push(px);
  m.strokeStyle = WI; m.lineWidth = 1;
  for (const wy of [58, 64]) for (let i = 0; i < poles.length; i++) {
    const a = poles[i], b = i + 1 < poles.length ? poles[i + 1] : poles[0] + MW;   // (the last wire wraps to the first)
    m.beginPath(); for (let k = 0; k <= 16; k++) { const t = k / 16, xx = a + (b - a) * t, yy = wy + 6 * Math.sin(t * Math.PI); k ? m.lineTo(xx, yy) : m.moveTo(xx, yy); } m.stroke();
    if (b > MW) { m.save(); m.translate(-MW, 0); m.beginPath(); for (let k = 0; k <= 16; k++) { const t = k / 16, xx = a + (b - a) * t, yy = wy + 6 * Math.sin(t * Math.PI); k ? m.lineTo(xx, yy) : m.moveTo(xx, yy); } m.stroke(); m.restore(); }
  }
  for (const px of poles) {
    m.fillStyle = PO; m.fillRect(px - 1, 54, 3, 70); m.fillRect(px - 8, 57, 17, 2); m.fillRect(px - 6, 63, 13, 2);
    m.fillStyle = '#e8e0d0'; for (const dx of [-7, -3, 4, 7]) m.fillRect(px + dx, 56, 1, 1);
  }
  // the track bed along the bottom: ballast, ties, the near rail (the train hides most of it)
  m.fillStyle = '#8a7a6a'; m.fillRect(0, 224, MW, VH - 224);
  m.fillStyle = '#6a5a4a'; for (let i = 0; i < 400; i++) m.fillRect((r() * MW) | 0, 224 + ((r() * 16) | 0), 2, 1);
  m.fillStyle = '#4a3020'; for (let px = 0; px < MW; px += 12) m.fillRect(px, 228, 7, 8);
  m.fillStyle = '#b8b8c0'; m.fillRect(0, 230, MW, 2); m.fillStyle = '#5a5a64'; m.fillRect(0, 232, MW, 1);
  L.mid = T.pixelize(mid, { d0: D0, d1: D1, d2: D2, sc: SC, sc2: SC2, po: PO, wi: WI, ins: '#e8e0d0', b0: '#8a7a6a', b1: '#6a5a4a',
    tie: '#4a3020', r0: '#b8b8c0', r1: '#5a5a64' }, null, CLUT.bg);

  // ---- street: the train
  const W = R.W, st = T.canvas(W, VH), s = st.getContext('2d');
  const OUT = '#1e1416', U0 = '#2a2224', U1 = '#4a4044', WH = '#6a6066', TIN = '#8a8a90', TIN2 = '#6e6e76', BRD = '#a07a52', BRD2 = '#7a5a3a';
  const Y0 = R.ROOF, Y1 = R.LIP, SIDE = Y1 + 2, SB = 226;          // roof (far .. near edge), the car's side, its bottom
  const roof = (x0, x1, c0, c1, walk = true) => {                 // the roof seen from above, the far edge a little lip
    s.fillStyle = c0; s.fillRect(x0, Y0, x1 - x0, Y1 - Y0);
    s.fillStyle = c1; for (let y = Y0 + 9; y < Y1; y += 11) s.fillRect(x0 + 1, y, x1 - x0 - 2, 1);   // the seams, along
    for (let xx = x0 + 18; xx < x1 - 4; xx += 26) s.fillRect(xx, Y0 + 1, 1, Y1 - Y0 - 2);            // and across
    if (walk) {                                                   // the running board down the middle
      s.fillStyle = BRD2; s.fillRect(x0 + 4, Y0 + 20, x1 - x0 - 8, 14);
      s.fillStyle = BRD; for (let xx = x0 + 4; xx < x1 - 4; xx += 6) s.fillRect(xx, Y0 + 21, 5, 12);
    }
    s.fillStyle = OUT; s.fillRect(x0, Y0 - 2, x1 - x0, 2); s.fillRect(x0, Y1, x1 - x0, 2);
  };
  const body = (x0, x1, c0, c1, c2, planks = true) => {            // the side: planks, the frame, the trucks
    if (planks) {
      s.fillStyle = c0; s.fillRect(x0, SIDE, x1 - x0, SB - SIDE);
      s.fillStyle = c1; for (let xx = x0 + 3; xx < x1; xx += 5) s.fillRect(xx, SIDE + 1, 1, SB - SIDE - 2);
    }
    s.fillStyle = c2; s.fillRect(x0, SIDE, x1 - x0, 2);
    s.fillStyle = OUT; s.fillRect(x0, SIDE, 1, SB - SIDE); s.fillRect(x1 - 1, SIDE, 1, SB - SIDE); s.fillRect(x0, SB - 1, x1 - x0, 1);
    s.fillStyle = U0; s.fillRect(x0 + 4, SB, x1 - x0 - 8, 4);    // the underframe
    for (const tx of [x0 + 34, x1 - 34]) {                        // two trucks of two wheels
      s.fillStyle = U1; s.fillRect(tx - 18, SB + 2, 36, 4);
      for (const wx of [tx - 10, tx + 10]) {
        s.fillStyle = OUT; ell(s, wx, SB + 8, 6, 6); s.fill();
        s.fillStyle = U1; ell(s, wx, SB + 8, 4.5, 4.5); s.fill();
        s.fillStyle = WH; ell(s, wx, SB + 8, 1.5, 1.5); s.fill(); s.fillRect(wx - 4, SB + 7, 8, 1);
      }
    }
    for (const lx of [x0 + 4, x1 - 9]) {                          // the ladders at the ends
      s.fillStyle = OUT; s.fillRect(lx, SIDE + 2, 1, SB - SIDE - 3); s.fillRect(lx + 4, SIDE + 2, 1, SB - SIDE - 3);
      for (let y = SIDE + 4; y < SB - 1; y += 4) s.fillRect(lx, y, 5, 1);
    }
  };
  const words = (txt, cx, y, col) => T.drawText(s, txt, cx, y, col, 1, OUT, 'center');
  for (const [x0, x1, kind] of CARS) {
    if (kind === 'caboose') {
      const RED = '#a83a2a', RED1 = '#8a2a20', RED2 = '#c8584a';
      s.fillStyle = RED1; s.fillRect(x0 + 70, Y0 - 26, 60, 26);    // the cupola, above the roof at the back
      s.fillStyle = RED; s.fillRect(x0 + 72, Y0 - 24, 56, 24);
      s.fillStyle = '#f4d88a'; for (const wx of [x0 + 78, x0 + 96, x0 + 114]) s.fillRect(wx, Y0 - 18, 10, 8);
      s.fillStyle = OUT; s.fillRect(x0 + 66, Y0 - 28, 68, 3); s.fillRect(x0 + 70, Y0 - 26, 1, 26); s.fillRect(x0 + 129, Y0 - 26, 1, 26);
      s.fillRect(x0 + 100, Y0 - 34, 4, 6);                         // the stovepipe
      roof(x0, x1, '#6a3a32', '#5a2e28');
      body(x0, x1, RED, RED1, RED2);
      s.fillStyle = '#f4d88a'; for (const wx of [x0 + 44, x0 + 150]) { s.fillRect(wx, SIDE + 5, 12, 9); s.fillStyle = OUT; s.fillRect(wx + 5, SIDE + 5, 1, 9); s.fillStyle = '#f4d88a'; }
      words('NO. 13', x0 + 103, SIDE + 8, '#f4d88a');
    } else if (kind === 'box' || kind === 'box2') {
      const [c0, c1, c2, lt] = kind === 'box' ? ['#8a4a2e', '#743c24', '#a05a3a', '#e8d8b0'] : ['#c09a4a', '#a8823a', '#d4b060', '#3a2a1a'];
      roof(x0, x1, TIN, TIN2);
      body(x0, x1, c0, c1, c2);
      const dx = (x0 + x1) / 2 - 22;                              // the sliding door, an X brace
      s.fillStyle = c1; s.fillRect(dx, SIDE + 3, 44, SB - SIDE - 5);
      s.fillStyle = OUT; s.fillRect(dx, SIDE + 3, 44, 1); s.fillRect(dx, SB - 3, 44, 1); s.fillRect(dx, SIDE + 3, 1, SB - SIDE - 5); s.fillRect(dx + 43, SIDE + 3, 1, SB - SIDE - 5);
      s.strokeStyle = c2; s.lineWidth = 1; s.beginPath(); s.moveTo(dx + 2, SIDE + 5); s.lineTo(dx + 41, SB - 5); s.moveTo(dx + 41, SIDE + 5); s.lineTo(dx + 2, SB - 5); s.stroke();
      words(kind === 'box' ? 'OVERLAND' : 'FAST FREIGHT', (x0 + dx) / 2 + 6, SIDE + 9, lt);
      words(kind === 'box' ? 'LINE' : 'NO. 7', (dx + 44 + x1) / 2 - 4, SIDE + 9, lt);
    } else if (kind === 'cattle') {                                // open slats, and the steers inside
      const c0 = '#9a7a4a', c1 = '#6a5030';
      roof(x0, x1, '#7a6a5a', '#665848');
      s.fillStyle = '#2a1e18'; s.fillRect(x0, SIDE, x1 - x0, SB - SIDE);
      for (let i = 0; i < 9; i++) {                               // the herd in the dark
        const cx = x0 + 18 + i * 27, cy = SIDE + 9 + (i % 2) * 2, hide = i % 3 === 1;
        s.fillStyle = hide ? '#e8dcc0' : '#5a3a2a'; s.fillRect(cx, cy, 16, 8); s.fillRect(cx + 15, cy - 2, 5, 5);
        s.fillStyle = '#e8dcc0'; s.fillRect(cx + 15, cy - 4, 8, 1);
      }
      s.fillStyle = c0; for (let y = SIDE; y < SB; y += 6) s.fillRect(x0, y, x1 - x0, 3);
      s.fillStyle = c1; for (let xx = x0; xx < x1; xx += 32) s.fillRect(xx, SIDE, 3, SB - SIDE);
      body(x0, x1, null, c1, c0, false);
      words('LIVE STOCK', (x0 + x1) / 2, SIDE + 13, '#f4e0b0');
    } else if (kind === 'coach') {                                 // the passenger coach: windows, lamplight
      const G0 = '#3a6a4a', G1 = '#2e5a3e', G2 = '#5a8a6a';
      roof(x0, x1, '#4a4a50', '#3a3a40');
      body(x0, x1, G0, G1, G2);
      for (let wx = x0 + 18; wx < x1 - 24; wx += 22) {
        s.fillStyle = '#f4d88a'; s.fillRect(wx, SIDE + 4, 12, 10);
        s.fillStyle = OUT; s.fillRect(wx, SIDE + 4, 12, 1); s.fillRect(wx, SIDE + 13, 12, 1); s.fillRect(wx + 6, SIDE + 4, 1, 10);
      }
      s.fillStyle = '#e8c86a'; s.fillRect(x0 + 6, SB - 6, x1 - x0 - 12, 1);
      words('PULLMAN', (x0 + x1) / 2, SB - 5, '#e8c86a');
    } else if (kind === 'express') {                               // the express car: the gold's in here
      const E0 = '#2e3a5a', E1 = '#26304c', E2 = '#4a5a7a';
      roof(x0, x1, TIN2, '#5a5a62');
      body(x0, x1, E0, E1, E2);
      const dx = (x0 + x1) / 2 - 16;
      s.fillStyle = '#5a6a8a'; s.fillRect(dx, SIDE + 3, 32, SB - SIDE - 5); s.fillStyle = OUT; s.fillRect(dx, SIDE + 3, 32, 1); s.fillRect(dx + 16, SIDE + 3, 1, SB - SIDE - 5);
      s.fillStyle = '#ffd34a'; s.fillRect(dx + 12, SIDE + 11, 3, 3); s.fillRect(dx + 18, SIDE + 11, 3, 3);   // the padlock hasps
      words('OVERLAND', (x0 + dx) / 2 + 4, SIDE + 6, '#ffd34a'); words('EXPRESS', (x0 + dx) / 2 + 4, SIDE + 13, '#ffd34a');
      words('U.S. MAIL', (dx + 32 + x1) / 2, SIDE + 9, '#ffd34a');
    } else if (kind === 'tender') {                                // the tender: coal heaped over the back
      const K0 = '#2a2a30', K1 = '#1a1a20', K2 = '#3a3a44';
      s.fillStyle = K1; s.beginPath(); s.moveTo(x0 + 6, Y0); s.lineTo(x0 + 30, Y0 - 14); s.lineTo(x1 - 40, Y0 - 18); s.lineTo(x1 - 8, Y0); s.fill();
      s.fillStyle = K2; for (let i = 0; i < 40; i++) { const cx = x0 + 14 + r() * (x1 - x0 - 30), cy = Y0 - 2 - r() * 13; s.fillRect(cx, cy, 3, 2); }
      roof(x0, x1, '#3a3a40', K1, false);
      s.fillStyle = K2; for (let i = 0; i < 70; i++) s.fillRect(x0 + 4 + r() * (x1 - x0 - 10), Y0 + 2 + r() * (Y1 - Y0 - 6), 2, 1);   // coal on the deck
      body(x0, x1, K0, K1, K2);
      words('OVERLAND', (x0 + x1) / 2, SIDE + 9, '#ffd34a');
    } else if (kind === 'loco') {                                  // the engine: the cab, the boiler, the stack, the cowcatcher
      const K0 = '#2a2a30', K1 = '#1a1a20', K2 = '#4a4a54', BR = '#c89a3a', RD = '#a83a2a';
      s.fillStyle = K0; s.fillRect(x0 + 4, Y0 - 44, 54, 44);          // the cab
      s.fillStyle = K1; s.fillRect(x0, Y0 - 50, 62, 6);
      s.fillStyle = '#f4d88a'; s.fillRect(x0 + 14, Y0 - 36, 14, 12); s.fillRect(x0 + 36, Y0 - 36, 14, 12);
      s.fillStyle = OUT; s.fillRect(x0 + 4, Y0 - 44, 1, 44); s.fillRect(x0 + 57, Y0 - 44, 1, 44);
      s.fillStyle = K2; s.fillRect(x0 + 62, Y0 - 16, x1 - x0 - 62, 16);  // the boiler's top beyond the cab
      s.fillStyle = BR; s.fillRect(x0 + 90, Y0 - 26, 14, 10); s.fillRect(x0 + 92, Y0 - 30, 10, 4);     // the dome
      s.fillStyle = K1; s.fillRect(x1 - 34, Y0 - 52, 16, 36); s.fillRect(x1 - 38, Y0 - 58, 24, 8);    // the stack
      s.fillStyle = BR; s.fillRect(x0 + 120, Y0 - 24, 8, 8);          // the bell
      roof(x0, x1, '#3a3a44', K1, false);
      s.fillStyle = K2; for (let xx = x0 + 70; xx < x1 - 4; xx += 18) s.fillRect(xx, Y0 + 2, 2, Y1 - Y0 - 4);   // the boiler bands
      body(x0, x1, K0, K1, K2);
      s.fillStyle = RD; s.fillRect(x0 + 8, SIDE + 4, 40, 8); words('NO. 9', x0 + 28, SIDE + 6, '#ffd34a');
      s.fillStyle = BR; s.fillRect(x0 + 70, SIDE + 10, x1 - x0 - 74, 2);
    }
  }
  for (const [g0, g1] of GAPS) {                                   // couplers across the gaps
    s.fillStyle = U1; s.fillRect(g0 - 2, SB - 8, g1 - g0 + 4, 4); s.fillStyle = OUT; s.fillRect(g0 - 2, SB - 9, g1 - g0 + 4, 1);
  }
  // ---- the tunnel's wall: rock behind the train, all the way down (the middle layer's other map on the F256)
  const RW = 128, rk = T.canvas(RW, VH), k = rk.getContext('2d');
  const K0 = '#3a302a', K1 = '#4e423a', K2 = '#2a221e', K3 = '#5e5048';
  k.fillStyle = K0; k.fillRect(0, 0, RW, VH);
  for (let i = 0; i < 70; i++) {                                   // ledges, cracks, the odd lit edge
    const x2 = r() * RW, y = r() * VH, w = 5 + r() * 18;
    k.fillStyle = K1; k.fillRect(x2, y, w, 2); k.fillStyle = K2; k.fillRect(x2 + 1, y + 2, w - 1, 2);
    if (r() < 0.3) { k.fillStyle = K3; k.fillRect(x2 + 2, y, w / 2, 1); }
  }
  for (let x2 = 0; x2 < RW; x2 += 64) { k.fillStyle = K2; k.fillRect(x2 + 20, 0, 2, VH); }   // the drill marks, down the wall
  L.rock = T.pixelize(rk, { k0: K0, k1: K1, k2: K2, k3: K3 }, null, CLUT.bg);

  L.street = T.pixelize(st, { out: OUT, u0: U0, u1: U1, wh: WH, tin: TIN, tin2: TIN2, brd: BRD, brd2: BRD2,
    r0: '#a83a2a', r1: '#8a2a20', r2: '#c8584a', rr: '#6a3a32', rr1: '#5a2e28', lamp: '#f4d88a', lamp2: '#e8c86a',
    b0: '#8a4a2e', b1: '#743c24', b2: '#a05a3a', bl: '#e8d8b0', y0: '#c09a4a', y1: '#a8823a', y2: '#d4b060', yl: '#3a2a1a',
    c0: '#9a7a4a', c1: '#6a5030', cr: '#7a6a5a', cr1: '#665848', dk: '#2a1e18', cow: '#5a3a2a', cow2: '#e8dcc0', lw: '#f4e0b0',
    g0: '#3a6a4a', g1: '#2e5a3e', g2: '#5a8a6a', gr: '#4a4a50', gr1: '#3a3a40', e0: '#2e3a5a', e1: '#26304c', e2: '#4a5a7a', ed: '#5a6a8a',
    gold: '#ffd34a', tn: '#5a5a62', k0: '#2a2a30', k1: '#1a1a20', k2: '#3a3a44', k3: '#4a4a54', brass: '#c89a3a' }, null, CLUT.bg);
  return L;
};

// the tunnel's mouth: the edge of the mountain - a ring of dressed stone, its foot CLEAR px over the roof (as it
// sweeps over the roof it's at standing head height), the dark rock face behind it. 64 wide: two sprite columns.
// Mirrored, it's the way out.
T.buildTrainSprites = function () {
  const H = 136, W = 64, cv = T.canvas(W, H), c = cv.getContext('2d'), r = rng(31);
  const S0 = '#8a7a6a', S1 = '#6a5a4c', S2 = '#a89a88', MO = '#4a3e36', RK = '#3a302a', RK1 = '#4e423a', RK2 = '#2a221e';
  c.fillStyle = RK; c.fillRect(18, 0, W - 18, H - 22);              // the rock face over the tunnel
  c.fillStyle = RK; c.beginPath(); c.moveTo(18, H - 22); c.lineTo(W, H - 22); c.lineTo(W, H - 40); c.fill();
  for (let i = 0; i < 26; i++) {                                    // ledges and cracks
    const x = 22 + r() * (W - 26), y = r() * (H - 30), w = 4 + r() * 12;
    c.fillStyle = RK1; c.fillRect(x, y, w, 2); c.fillStyle = RK2; c.fillRect(x + 1, y + 2, w - 1, 1);
  }
  c.fillStyle = MO; c.fillRect(0, 0, 20, H);                        // the ring of stones, the mortar between
  for (let y = 0, i = 0; y < H; y += 12, i++) {
    c.fillStyle = S1; c.fillRect(1, y + 1, 18, 10);
    c.fillStyle = S0; c.fillRect(1, y + 1, 17, 9);
    c.fillStyle = S2; c.fillRect(1 + (i % 2) * 5, y + 1, 9, 2);
  }
  c.fillStyle = S1; c.fillRect(0, H - 7, 24, 7); c.fillStyle = S2; c.fillRect(0, H - 7, 24, 2);   // the springer at its foot
  const o = T.pixelize(cv, { s0: S0, s1: S1, s2: S2, mo: MO, rk: RK, rk1: RK1, rk2: RK2 }, PAL.out, CLUT.spr); o.ox = 0; o.oy = H;
  return { portal: o };
};
})();
