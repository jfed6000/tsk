// Texas Shitkickers — the Cattle Drive at sunup: level 4, Jackrabbit Jack's (story.md: "A stampede chase on the back
// of a longhorn: the Metal Slug vehicle level").
//   far    (scroll x0.25): a dawn sky, pink to gold, the sun just up behind the buttes
//   mid    (scroll x0.5):  the herd strung out across the range, a windmill, a chuckwagon
//   street (scroll x1, one strip): the cattle trail through the grass, a split-rail fence along the back, then the
//          corral at the end (its gate at T.RANCH.GATE)
// Sprites: the longhorn he rides, the rustlers' horses, fences and rocks across the trail, Jackrabbit Jack and his
// lasso. All facing right; 64x64 frames like the bosses unless noted.
(function () {
'use strict';
const T = window.TSK;
const { PAL, CLUT } = T;
const ell = (c, x, y, rx, ry) => { c.beginPath(); c.ellipse(x, y, rx, ry, 0, 0, Math.PI * 2); };
function rng(seed) { return () => (seed = (seed * 16807) % 2147483647) / 2147483647; }

T.RANCH = { W: 2032, GATE: 1250, SADDLE: 26, LOOP: 640 };   // the stage's width, the corral gate, how high he sits on the
                                                             // steer, and the trail's repeat (the ride runs over it twice first)

T.buildRanch = function (VW, VH, FLOOR) {
  const L = {}, r = rng(19), R = T.RANCH;
  // ---- far: dawn
  const far = T.canvas(640, VH), f = far.getContext('2d');
  const bands = ['#3a4a7a', '#5a5a8a', '#8a6a92', '#c07a8a', '#e8987a', '#f4b47a', '#f8cc84', '#fadc9a'];
  const bh = Math.ceil(104 / bands.length);
  bands.forEach((col, i) => {
    f.fillStyle = col; f.fillRect(0, i * bh, 640, bh);
    if (i > 0) { f.fillStyle = bands[i - 1]; for (let y = 0; y < 3; y++) for (let x = y % 2; x < 640; x += 2) if (y < 2 || x % 4 === 0) f.fillRect(x, i * bh + y, 1, 1); }
  });
  f.fillStyle = bands[bands.length - 1]; f.fillRect(0, bh * bands.length, 640, VH);
  f.fillStyle = '#fff2c0'; ell(f, 300, 98, 22, 22); f.fill();             // the sun, half up
  f.fillStyle = '#ffe08a'; ell(f, 300, 98, 30, 30); f.fill(); f.fillStyle = '#fff2c0'; ell(f, 300, 98, 20, 20); f.fill();
  for (let i = 0; i < 5; i++) { const y = 18 + r() * 50, x = r() * 640, w = 50 + r() * 100; f.fillStyle = '#d88a8a'; f.fillRect(x, y, w, 2); f.fillStyle = '#ffd0a0'; f.fillRect(x + 6, y + 2, w - 14, 1); }
  f.fillStyle = '#7a5a6a'; let x = -10;                         // buttes in the distance
  while (x < 650) { const w = 40 + r() * 90, h = 10 + r() * 22; f.fillRect(x + 6, 100 - h, w - 12, h + 20); f.fillRect(x, 104 - h * 0.4, w, 20); x += w * (1 + r()); }
  f.fillStyle = '#9a7a6a'; f.fillRect(0, 106, 640, VH);
  const FP = {}; bands.forEach((b, i) => FP['k' + i] = b);
  Object.assign(FP, { s0: '#fff2c0', s1: '#ffe08a', c0: '#d88a8a', c1: '#ffd0a0', b0: '#7a5a6a', b1: '#9a7a6a' });
  L.far = T.pixelize(far, FP, null, CLUT.bg);

  // ---- mid: the range, the herd, a windmill, the chuckwagon
  const mid = T.canvas(960, VH), m = mid.getContext('2d');
  const G0 = '#8a8a4a', G1 = '#6a703a', H0 = '#4a3024', H1 = '#e8dcc0', W0 = '#3a2a2a';
  m.fillStyle = G0; m.beginPath(); m.moveTo(0, 120); for (let px = 0; px <= 960; px += 16) m.lineTo(px, 108 + 4 * Math.sin(px / 960 * Math.PI * 4)); m.lineTo(960, 120); m.fill();
  m.fillRect(0, 118, 960, VH);
  m.fillStyle = G1; for (let i = 0; i < 90; i++) m.fillRect((r() * 960) | 0, 112 + ((r() * 10) | 0), 2, 1);
  for (let i = 0; i < 26; i++) {                                 // the herd: little cattle, strung out
    const cx = 20 + i * 36 + r() * 14, cy = 112 + r() * 6, white = r() < 0.4;
    m.fillStyle = white ? H1 : H0; m.fillRect(cx, cy, 9, 4); m.fillRect(cx + 8, cy - 1, 3, 3);
    m.fillStyle = H0; m.fillRect(cx + 1, cy + 4, 1, 2); m.fillRect(cx + 7, cy + 4, 1, 2);
    m.fillStyle = H1; m.fillRect(cx + 8, cy - 2, 5, 1);           // the horns
  }
  m.fillStyle = W0; m.fillRect(700, 50, 2, 62);                   // windmill
  for (let a = 0; a < 8; a++) { m.save(); m.translate(701, 48); m.rotate(a * Math.PI / 4 + 0.2); m.fillRect(0, -1, 13, 2); m.restore(); }
  m.fillRect(690, 110, 22, 2);
  m.fillStyle = '#e8e0d0'; m.beginPath(); m.ellipse(320, 104, 16, 10, 0, Math.PI, 0); m.fill();   // the chuckwagon's cover
  m.fillStyle = W0; m.fillRect(304, 104, 34, 4); m.fillStyle = '#2a1a1a'; ell(m, 309, 110, 3, 3); m.fill(); ell(m, 332, 110, 3, 3); m.fill();
  L.mid = T.pixelize(mid, { g0: G0, g1: G1, h0: H0, h1: H1, w0: W0, cv: '#e8e0d0', wh: '#2a1a1a' }, null, CLUT.bg);

  // ---- street: the trail, a fence along the back, then the corral
  const W = R.W, st = T.canvas(W, VH), s = st.getContext('2d');
  const C = { out: PAL.out, gr0: '#6a6a34', gr1: '#8a8a44', gr2: '#a8a258', gr3: '#c4b86a', dirt0: '#8a6440', dirt1: '#a07a4e', dirt2: '#b8905e',
    rut: '#6a4a30', rail0: '#5a3e2a', rail1: '#7a5638', post: '#4a3020', sun: '#f8d88a', shadow: '#5a5030', sign: '#3a2a1a', ink: '#f0d890' };
  const BACK = 120, FRONT = 146;
  s.fillStyle = C.gr1; s.fillRect(0, BACK, W, FRONT - BACK);      // the grass at the back of the trail
  s.fillStyle = C.gr2; for (let i = 0; i < 500; i++) s.fillRect((r() * W) | 0, BACK + ((r() * (FRONT - BACK)) | 0), 1, 2);
  s.fillStyle = C.gr0; for (let i = 0; i < 300; i++) s.fillRect((r() * W) | 0, BACK + ((r() * (FRONT - BACK)) | 0), 2, 1);
  for (let px = 6; px < R.GATE - 30; px += 40) {                  // the split-rail fence along the back (40 px: the loop's a multiple)
    s.fillStyle = C.post; s.fillRect(px, 104, 4, 26);
    s.fillStyle = C.rail1; s.fillRect(px, 110, 40, 3); s.fillRect(px, 120, 40, 3);
    s.fillStyle = C.rail0; s.fillRect(px, 113, 40, 1); s.fillRect(px, 123, 40, 1);
  }
  // the corral: a gate of heavy posts, then rails all round
  const g = R.GATE;
  s.fillStyle = C.post; s.fillRect(g - 30, 70, 8, 60); s.fillRect(g + 22, 70, 8, 60); s.fillRect(g - 34, 66, 68, 7);
  s.fillStyle = C.sign; s.fillRect(g - 26, 74, 52, 14); T.drawText(s, 'LAZY J', g - 21, 77, C.ink, 2, null);
  for (let px = g + 40; px < W; px += 40) {
    s.fillStyle = C.post; s.fillRect(px, 96, 5, 34);
    s.fillStyle = C.rail1; for (const y of [100, 110, 120]) s.fillRect(px, y, 40, 3);
    s.fillStyle = C.rail0; for (const y of [103, 113, 123]) s.fillRect(px, y, 40, 1);
  }
  s.fillStyle = C.out; s.fillRect(0, FRONT, W, 1);
  // the trail: packed dirt with hoof-churned ruts, grass at the edges; the corral floor beaten flat
  const dirt = [[FRONT + 1, C.dirt2], [FRONT + 14, C.dirt1], [FRONT + 46, C.dirt0]];
  for (const [y, col] of dirt) { s.fillStyle = col; s.fillRect(0, y, W, VH - y); }
  for (const y of [FRONT + 22, FRONT + 34, FRONT + 52, FRONT + 66]) { s.fillStyle = C.rut; s.fillRect(0, y, g, 1); }
  for (let i = 0; i < 400; i++) { const qx = (r() * W) | 0, qy = FRONT + 3 + ((r() * (VH - FRONT - 3)) | 0); s.fillStyle = r() < 0.5 ? C.dirt2 : C.rut; s.fillRect(qx, qy, 2, 1); }
  for (let i = 0; i < 120; i++) { const qx = (r() * g) | 0; s.fillStyle = C.gr1; s.fillRect(qx, VH - 6 - ((r() * 6) | 0), 1, 3); }
  // the trail repeats every LOOP px up to the gate: the ride runs over its first LOOP twice before the camera moves
  // (the tile map's scroll wraps there on the F256: no extra tiles)
  s.drawImage(st, 0, 0, R.GATE - 40 - R.LOOP, VH, R.LOOP, 0, R.GATE - 40 - R.LOOP, VH);
  L.street = T.pixelize(st, C, null, CLUT.bg);
  return L;
};

// ---------------------------------------------------------------- sprites
const SP = {
  out: PAL.out, cb0: '#5a3420', cb1: '#8a5634', cb2: '#b07a4a', cw: '#ece0c8', cw2: '#c8b898', horn: '#f0e8d0', horn2: '#b8a888',
  hoof: '#2a1a14', nose: '#d8a090', eye: PAL.eyeW, pupil: PAL.pupil, sad0: '#5a2a1a', sad1: '#8a4428', blanket: '#b03030', blanket2: '#e0c040',
  hb0: '#3a2018', hb1: '#5a3424', hb2: '#7a4a32', mane: '#1a1210',
  post: '#4a3020', rail0: '#5a3e2a', rail1: '#7a5638', rk0: '#6a6060', rk1: '#8a8282', rk2: '#a8a0a0',
};
function legs4(c, ph, x0, x1, y, col, len = 12) {
  const S = Math.sin;
  for (const [lx, o, back] of [[x1, 0, false], [x1 - 6, Math.PI, true], [x0 + 6, Math.PI * 0.5, false], [x0, Math.PI * 1.5, true]]) {
    const a = S(ph + o) * 0.55;
    c.strokeStyle = SP.out; c.lineWidth = 5; c.beginPath(); c.moveTo(lx, y); c.lineTo(lx + Math.sin(a) * len, y + Math.cos(a) * len); c.stroke();
    c.strokeStyle = back ? SP.cb0 : col; c.lineWidth = 3; c.beginPath(); c.moveTo(lx, y); c.lineTo(lx + Math.sin(a) * len, y + Math.cos(a) * len); c.stroke();
    c.fillStyle = SP.hoof; c.fillRect(lx + Math.sin(a) * len - 2, y + Math.cos(a) * len - 1, 4, 2);
  }
}
// the longhorn, galloping (phase ph), origin at the ground under its middle; the saddle at y -26
function drawSteer(c, ph, jump) {
  const by = jump ? -4 : -Math.abs(Math.sin(ph)) * 2;
  c.save(); c.translate(0, by);
  if (jump) { legs4(c, 0, -16, 14, -14, SP.cb1, 10); } else legs4(c, ph, -16, 14, -14, SP.cb1);
  c.beginPath(); c.moveTo(-24, -26); c.quadraticCurveTo(-30, -18, -28, -10); c.strokeStyle = SP.out; c.lineWidth = 2; c.stroke();   // the tail
  ell(c, -2, -22, 22, 10); c.fillStyle = SP.cb1; c.fill(); c.strokeStyle = SP.out; c.lineWidth = 1; c.stroke();
  c.save(); ell(c, -2, -22, 22, 10); c.clip();
  c.fillStyle = SP.cw; ell(c, -10, -18, 8, 6); c.fill(); ell(c, 8, -26, 6, 4); c.fill();      // the patches
  c.fillStyle = SP.cb0; c.fillRect(-24, -16, 44, 4);
  c.restore();
  c.fillStyle = SP.blanket; c.fillRect(-9, -33, 16, 6); c.fillStyle = SP.blanket2; c.fillRect(-9, -29, 16, 1);   // the saddle
  c.fillStyle = SP.sad1; c.fillRect(-7, -35, 12, 4); c.fillStyle = SP.sad0; c.fillRect(-8, -36, 3, 3); c.fillRect(4, -37, 3, 4);
  // the head, low and forward, the horns sweeping out
  c.save(); c.translate(22, -24);
  ell(c, 3, 2, 7, 6); c.fillStyle = SP.cb1; c.fill(); c.strokeStyle = SP.out; c.stroke();
  ell(c, 8, 5, 4, 3.4); c.fillStyle = SP.nose; c.fill(); c.stroke();
  c.fillStyle = SP.cw; c.fillRect(1, -3, 5, 3);
  c.fillStyle = SP.eye; c.fillRect(4, -1, 2, 2); c.fillStyle = SP.pupil; c.fillRect(5, -1, 1, 1);
  c.lineCap = 'round';
  for (const [w, col] of [[4, SP.out], [2.4, SP.horn]]) {
    c.strokeStyle = col; c.lineWidth = w;
    c.beginPath(); c.moveTo(0, -3); c.quadraticCurveTo(10, -10, 16, -14); c.quadraticCurveTo(18, -16, 17, -19); c.stroke();      // the near horn, forward
    c.beginPath(); c.moveTo(-2, -4); c.quadraticCurveTo(-10, -10, -18, -12); c.quadraticCurveTo(-21, -13, -21, -16); c.stroke(); // the far one, back
  }
  c.restore();
  c.restore();
}
// a rustler's horse: a dark bay, galloping; the rider sits at y -26
function drawHorse(c, ph) {
  const by = -Math.abs(Math.sin(ph)) * 2;
  c.save(); c.translate(0, by);
  legs4(c, ph, -14, 12, -14, SP.hb1, 13);
  c.beginPath(); c.moveTo(-20, -26); c.quadraticCurveTo(-28, -20, -26, -8); c.strokeStyle = SP.mane; c.lineWidth = 3; c.stroke();
  ell(c, -2, -22, 19, 8); c.fillStyle = SP.hb1; c.fill(); c.strokeStyle = SP.out; c.lineWidth = 1; c.stroke();
  c.fillStyle = SP.hb0; c.fillRect(-18, -17, 34, 3);
  c.fillStyle = SP.sad0; c.fillRect(-7, -32, 13, 5); c.fillStyle = SP.sad1; c.fillRect(-6, -33, 10, 2);
  c.save(); c.translate(15, -28); c.rotate(-0.7);                // the neck and head, stretched out at the gallop
  c.fillStyle = SP.hb1; c.fillRect(0, -4, 14, 8); c.strokeStyle = SP.out; c.strokeRect(0, -4, 14, 8);
  c.fillStyle = SP.mane; c.fillRect(0, -6, 12, 2);
  c.restore();
  c.save(); c.translate(26, -36);
  ell(c, 2, 0, 7, 4); c.fillStyle = SP.hb2; c.fill(); c.strokeStyle = SP.out; c.stroke();
  c.fillStyle = SP.mane; c.fillRect(-3, -6, 2, 4);
  c.fillStyle = SP.eye; c.fillRect(0, -2, 2, 1);
  c.restore();
  c.restore();
}
function drawFence(c) {                                            // a section of split rail across the trail
  c.fillStyle = SP.out; c.fillRect(-14, -26, 6, 26); c.fillRect(10, -26, 6, 26);
  c.fillStyle = SP.post; c.fillRect(-13, -25, 4, 25); c.fillRect(11, -25, 4, 25);
  for (const y of [-22, -12]) { c.fillStyle = SP.out; c.fillRect(-16, y - 1, 34, 5); c.fillStyle = SP.rail1; c.fillRect(-15, y, 32, 3); c.fillStyle = SP.rail0; c.fillRect(-15, y + 2, 32, 1); }
}
function drawRock(c) {
  c.fillStyle = SP.out; c.beginPath(); c.moveTo(-13, 0); c.lineTo(-10, -9); c.lineTo(-2, -13); c.lineTo(8, -11); c.lineTo(13, -3); c.lineTo(12, 0); c.closePath(); c.fill();
  c.fillStyle = SP.rk1; c.beginPath(); c.moveTo(-12, -1); c.lineTo(-9, -8); c.lineTo(-2, -12); c.lineTo(7, -10); c.lineTo(12, -3); c.lineTo(11, -1); c.closePath(); c.fill();
  c.fillStyle = SP.rk2; c.fillRect(-6, -10, 8, 2); c.fillStyle = SP.rk0; c.fillRect(-10, -3, 20, 2);
}

T.buildRanchSprites = function () {
  const B = T.BOSS;
  const bake = (w, h, ox, oy, fn) => { const cv = T.canvas(w, h), x = cv.getContext('2d'); x.translate(ox, oy); fn(x); const o = T.pixelize(cv, SP, SP.out, CLUT.spr); o.ox = ox; o.oy = oy; return o; };
  const TAU = Math.PI * 2;
  return {
    steer: [0, 1, 2, 3].map(i => bake(B.FW, B.FH, B.OX, B.OY, x => drawSteer(x, i / 4 * TAU, false))),
    steerJump: bake(B.FW, B.FH, B.OX, B.OY, x => drawSteer(x, 0, true)),
    horse: [0, 1, 2, 3].map(i => bake(B.FW, B.FH, B.OX, B.OY, x => drawHorse(x, i / 4 * TAU))),
    fence: bake(36, 30, 18, 29, drawFence),
    rock: bake(28, 16, 14, 15, drawRock),
  };
};

// ---------------------------------------------------------------- Jackrabbit Jack, the rustler
const JP = { out: PAL.out, f0: '#8a7458', f1: '#b49a78', f2: '#d8c4a2', ear: '#e8a8a0', mask: '#1a1a22', hat0: '#4a3a2a', hat1: '#6a5438',
  vest: '#7a2a2a', vest2: '#a83a32', shirt: '#d8c8a0', rope: '#c8a868', rope2: '#8a6a3a', eyeW: PAL.eyeW, pupil: PAL.pupil,
  mouth: PAL.mouth, teeth: PAL.teeth, star: '#ffd34a', spur: '#c0c0c8' };
const JD = { lean: 0, by: 0, legs: [0, 0], fa: 0.8, ba: 1.0, mouth: 0, eyes: 'sly', ears: 0, crouch: 0, lasso: 0, stars: -1, tuck: 0, kick: 0 };
function drawJack(c, o) {
  const p = Object.assign({}, JD, o);
  c.lineCap = 'round'; c.lineJoin = 'round';
  const limb = (pts, w, col) => { c.beginPath(); c.moveTo(pts[0][0], pts[0][1]); for (const q of pts.slice(1)) c.lineTo(q[0], q[1]); c.strokeStyle = JP.out; c.lineWidth = w + 2; c.stroke(); c.strokeStyle = col; c.lineWidth = w; c.stroke(); };
  const leg = (ph, col, back) => {                                 // long hind legs and big feet, a spur
    const s = Math.sin(ph), k = p.kick && back ? 1 : 0;
    const hip = [-2, -18 + p.crouch], knee = k ? [-12, -16] : [4 + 3 * s - p.tuck, -10 + p.crouch * 0.6 - p.tuck], foot = k ? [-24, -14] : [0 + 4 * s - p.tuck * 0.5, -1 - p.tuck * 1.2];
    limb([hip, knee, foot], 5, col);
    c.fillStyle = col; c.strokeStyle = JP.out; c.lineWidth = 1; ell(c, foot[0] + (k ? -4 : 5), foot[1] - 1, 7, 2.4); c.fill(); c.stroke();
    c.fillStyle = JP.spur; c.fillRect(foot[0] - 3 + (k ? 6 : 0), foot[1] - 2, 2, 2);
  };
  c.save(); c.translate(0, p.by + p.crouch * 0.4);
  leg(p.legs[1], JP.f0, true);
  c.save(); c.rotate(p.lean);
  // back arm (with the rope coiled on it unless he's throwing)
  const bs = [-4, -34], be = [bs[0] - 3 + Math.cos(p.ba + 1.6) * 8, bs[1] + 4 + Math.sin(p.ba + 1.6) * 8];
  limb([bs, be, [be[0] + Math.cos(p.ba) * 7, be[1] + Math.sin(p.ba) * 7]], 3.6, JP.f0);
  // the body: lean, in a red vest; a white tail
  ell(c, -11, -20, 4, 4); c.fillStyle = '#f4f0e8'; c.fill(); c.strokeStyle = JP.out; c.lineWidth = 1; c.stroke();
  ell(c, -1, -27, 8, 11); c.fillStyle = JP.shirt; c.fill(); c.stroke();
  c.save(); ell(c, -1, -27, 8, 11); c.clip(); c.fillStyle = JP.vest; c.fillRect(-10, -40, 7, 26); c.fillRect(2, -40, 8, 26); c.fillStyle = JP.vest2; c.fillRect(-9, -38, 1, 22); c.restore();
  if (!p.lasso) {                                                   // the coil of rope on his shoulder
    c.strokeStyle = JP.out; c.lineWidth = 3; ell(c, -4, -30, 6, 7); c.stroke();
    c.strokeStyle = JP.rope; c.lineWidth = 1.6; ell(c, -4, -30, 6, 7); c.stroke();
  }
  // the head: long face, big front teeth, a bandit's mask, the ears up through his hat
  c.save(); c.translate(5, -42);
  for (const [ex, a, len] of [[-3, -0.25 - p.ears * 0.4, 13], [2, 0.15 - p.ears * 0.6, 12]]) {   // the ears
    c.save(); c.translate(ex, -5); c.rotate(a);
    ell(c, 0, -len / 2, 3, len / 2); c.fillStyle = JP.f1; c.fill(); c.strokeStyle = JP.out; c.lineWidth = 1; c.stroke();
    ell(c, 0, -len / 2, 1.4, len / 2 - 3); c.fillStyle = JP.ear; c.fill();
    c.restore();
  }
  ell(c, 2, 0, 7, 6); c.fillStyle = JP.f1; c.fill(); c.strokeStyle = JP.out; c.stroke();
  c.beginPath(); c.moveTo(4, -3); c.quadraticCurveTo(12, -2, 13, 2); c.quadraticCurveTo(12, 5, 4, 5); c.closePath(); c.fillStyle = JP.f2; c.fill(); c.stroke();
  ell(c, 12.6, 1, 1.4, 1.2); c.fillStyle = JP.ear; c.fill();
  c.fillStyle = JP.teeth; c.fillRect(9, 4, 3, 3); c.strokeStyle = JP.out; c.lineWidth = 0.6; c.strokeRect(9, 4, 3, 3); c.beginPath(); c.moveTo(10.5, 4); c.lineTo(10.5, 7); c.stroke();
  if (p.mouth) { c.fillStyle = JP.mouth; c.fillRect(7, 5, 5, 1 + p.mouth * 2); }
  c.fillStyle = JP.mask; c.fillRect(-2, -4, 11, 4);                 // the mask
  if (p.eyes === 'x') { c.strokeStyle = JP.eyeW; c.lineWidth = 1; c.beginPath(); c.moveTo(4, -4); c.lineTo(7, -1); c.moveTo(7, -4); c.lineTo(4, -1); c.stroke(); }
  else { c.fillStyle = JP.eyeW; c.fillRect(4, -3, 3, 2); c.fillStyle = JP.pupil; c.fillRect(p.eyes === 'daze' ? 4 : 6, -3, 1, 2); if (p.eyes === 'sly') { c.fillStyle = JP.mask; c.fillRect(4, -3, 3, 1); } }
  c.save(); c.translate(-1, -6); c.rotate(-0.1);                   // the battered hat, ears through it
  c.fillStyle = JP.hat0; c.fillRect(-10, 0, 20, 2); c.fillStyle = JP.hat1; c.fillRect(-6, -5, 12, 5); c.fillStyle = JP.hat0; c.fillRect(-6, -2, 12, 1);
  c.restore();
  c.restore();
  // the front arm, and the lasso: spinning overhead (1), thrown (2)
  const fs = [5, -34], fe = [fs[0] + Math.cos(p.fa + 1.2) * 8, fs[1] + Math.sin(p.fa + 1.2) * 8];
  const fh = [fe[0] + Math.cos(p.fa) * 8, fe[1] + Math.sin(p.fa) * 8];
  limb([fs, fe, fh], 3.8, JP.f1);
  if (p.lasso === 1) {
    c.strokeStyle = JP.out; c.lineWidth = 3; ell(c, fh[0] + 2, fh[1] - 6, 13, 4); c.stroke();
    c.strokeStyle = JP.rope; c.lineWidth = 1.4; ell(c, fh[0] + 2, fh[1] - 6, 13, 4); c.stroke();
    c.beginPath(); c.moveTo(fh[0], fh[1]); c.lineTo(fh[0] + 2, fh[1] - 2); c.stroke();
  }
  c.restore();
  leg(p.legs[0], JP.f1, false);
  c.restore();
  if (p.stars >= 0) for (let i = 0; i < 3; i++) { const a = p.stars + i * Math.PI * 2 / 3, x = 6 + Math.cos(a) * 11, y = -58 + Math.sin(a) * 3; c.fillStyle = JP.star; c.fillRect(x - 2, y - 0.5, 4, 1); c.fillRect(x - 0.5, y - 2, 1, 4); }
}
T.buildJack = function () {
  const B = T.BOSS, TAU = Math.PI * 2;
  const bake = fn => { const cv = T.canvas(B.FW, B.FH), x = cv.getContext('2d'); x.translate(B.OX, B.OY); fn(x); return T.pixelize(cv, JP, JP.out, CLUT.spr); };
  const mk = o => bake(x => drawJack(x, o));
  // the lasso's loop in flight, and a length of its rope
  const loop = (() => { const cv = T.canvas(16, 12), x = cv.getContext('2d'); x.strokeStyle = JP.out; x.lineWidth = 3; ell(x, 8, 6, 6, 4); x.stroke(); x.strokeStyle = JP.rope; x.lineWidth = 1.4; ell(x, 8, 6, 6, 4); x.stroke(); const o = T.pixelize(cv, JP, JP.out, CLUT.spr); o.ox = 8; o.oy = 6; return o; })();
  const rope = (() => { const cv = T.canvas(24, 4), x = cv.getContext('2d'); x.fillStyle = JP.out; x.fillRect(0, 0, 24, 3); x.fillStyle = JP.rope; x.fillRect(0, 1, 24, 1); const o = T.pixelize(cv, JP, null, CLUT.spr); o.ox = 0; o.oy = 1; return o; })();
  return {
    idle: [mk({}), mk({ by: 0.8, ears: 0.3 })],
    talk: [mk({ mouth: 1, ears: 0.2 }), mk({ mouth: 0.3, by: 0.5 })],
    crouch: mk({ crouch: 6, lean: 0.2, ears: 1, fa: 1.6, ba: 1.6 }),
    hop: mk({ tuck: 5, lean: -0.1, ears: 1.2, fa: -1.2, ba: -1.0, legs: [-0.6, 0.6] }),
    spin: [mk({ lasso: 1, fa: -2.1, ba: 0.6, ears: 0.4, mouth: 0.4 }), mk({ lasso: 1, fa: -1.9, ba: 0.8, ears: 0.3, by: 0.6 })],
    throw: mk({ lasso: 2, fa: 0.1, ba: 0.4, lean: 0.25, mouth: 1, legs: [0.7, -0.5] }),
    kick: mk({ kick: 1, lean: 0.5, fa: 1.6, ba: 1.4, ears: 0.8, mouth: 1 }),      // the mule kick, backwards
    hurt: mk({ lean: -0.3, eyes: 'x', mouth: 1, fa: -1, ears: 1.4 }),
    daze: [0, 1, 2, 3].map(i => mk({ eyes: 'daze', lean: -0.12 + (i % 2) * 0.08, fa: 1.2, mouth: 0.4, stars: i / 4 * TAU / 3, ears: 1.6 })),
    ko: mk({ lean: -0.6, eyes: 'x', mouth: 1.5, fa: -2, ba: -2, ears: 2, legs: [1.2, -1.2] }),
    loop, rope,
  };
};
})();
