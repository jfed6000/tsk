// Texas Shitkickers — Sting, the scorpion with too much dynamite: the Train Heist's boss (story.md: "NOBODY GETS OFF
// THIS TRAIN!"). A big desert scorpion in amber armour: pincers forward, the tail arched high over his back with the
// sting at the top, sticks of dynamite strapped across his back, a cigar he lights them on, a flat black hat.
// 64x64 like the other bosses, facing right, origin at his feet. Also his dynamite (lit) and the bang.
(function () {
'use strict';
const T = window.TSK;
const { PAL } = T;
const ell = (c, x, y, rx, ry, a = 0) => { c.beginPath(); c.ellipse(x, y, rx, ry, a, 0, Math.PI * 2); };

const SP = {
  out: PAL.out, k0: '#6a3e16', k1: '#a86e26', k2: '#d89a44', k3: '#f0c070',   // the armour, dark to light
  leg: '#7a4a1a', leg2: '#4e2e10', dyn: '#c42e26', dyn2: '#ec6a50', strap: '#3a2618', buckle: '#c8a040',
  fuse: '#e8d8b0', hat: '#1e1a1c', hat2: '#3e3638', band: '#8a2a24', cig: '#6a4020', ember: '#ff7a2a', spark: '#ffd34a',
  eyeW: PAL.eyeW, pupil: PAL.pupil, mouth: PAL.mouth, star: '#ffd34a', sting: '#2a1a12', sting2: '#e8dcc0',
};
// tail: the shape of the tail (0 up over his back, 1 cocked back for the sting, 2 lashed out in front, 3 stuck in the
// roof in front, 4 laid flat behind him); claw: how far the pincers reach and open; raise: the near pincer lifted
const DS = { belly: false, by: 0, legs: 0, flat: 0, tail: 0, reach: 0, open: 0.2, raise: 0, stick: 0, mouth: 0, eyes: 'mad', stars: -1, hat: true, lean: 0 };

// the tail's line, from where it leaves the body to the sting, by shape: [x, y] control points of a cubic
const TAILS = [
  [[-16, -14], [-28, -22], [-24, -48], [-6, -50]],     // up over his back
  [[-16, -14], [-30, -26], [-28, -54], [-14, -56]],    // cocked back, high
  [[-16, -14], [-26, -38], [6, -46], [26, -24]],       // lashed out in front
  [[-16, -14], [-24, -36], [10, -38], [26, -6]],       // driven down into the roof in front
  [[-16, -12], [-22, -10], [-26, -7], [-28, -3]],      // laid flat behind (the tunnel; knocked out)
];
const cubic = (P, t) => {
  const u = 1 - t;
  return [0, 1].map(k => u * u * u * P[0][k] + 3 * u * u * t * P[1][k] + 3 * u * t * t * P[2][k] + t * t * t * P[3][k]);
};

function drawSting(c, o) {
  const p = Object.assign({}, DS, o);
  if (p.belly) {                                                    // knocked out: belly up, legs in the air
    c.save(); c.translate(0, -22); c.scale(1, -1); drawSting(c, Object.assign({}, o, { belly: false, hat: false, stars: -1 })); c.restore();
    return;
  }
  c.lineCap = 'round'; c.lineJoin = 'round';
  const line = (pts, w, col) => {
    c.beginPath(); c.moveTo(pts[0][0], pts[0][1]); for (const q of pts.slice(1)) c.lineTo(q[0], q[1]);
    c.strokeStyle = SP.out; c.lineWidth = w + 2; c.stroke(); c.strokeStyle = col; c.lineWidth = w; c.stroke();
  };
  const fl = p.flat;                                                // flattened: everything lower
  c.save(); c.translate(4, p.by + fl * 5);
  // the legs: four a side, splayed - the front pair reaching forward, the back pair back - knees high, feet out
  const legs = (far, col) => {
    for (let i = 0; i < 4; i++) {
      const dir = i < 2 ? 1 : -1, ph = p.legs + i * 1.7 + (far ? 1 : 0), s = Math.sin(ph);
      const ax = -10 + i * 6 + (far ? 2 : 0), ay = -11 + fl * 2;
      const kx = ax + dir * (5 + (i % 2) * 2) + s * 1.5, ky = -18 + fl * 6 - Math.max(0, s) * 2;
      const fx = ax + dir * (9 + (i % 2) * 4) + s * 3, fy = far ? -1 : 0;
      line([[ax, ay], [kx, ky], [fx, fy]], far ? 1.6 : 2, col);
    }
  };
  legs(true, SP.leg2);
  // the tail: a thick armoured curve, ringed, the sting at the end
  const TP = TAILS[p.tail];
  const path = () => { c.beginPath(); c.moveTo(TP[0][0], TP[0][1]); c.bezierCurveTo(TP[1][0], TP[1][1], TP[2][0], TP[2][1], TP[3][0], TP[3][1]); };
  path(); c.strokeStyle = SP.out; c.lineWidth = 9; c.stroke();
  path(); c.strokeStyle = SP.k1; c.lineWidth = 7; c.stroke();
  path(); c.strokeStyle = SP.k2; c.lineWidth = 3; c.stroke();
  for (let i = 1; i < 6; i++) {                                     // the rings between the segments
    const t = i / 6, [x, y] = cubic(TP, t), [x2, y2] = cubic(TP, t + 0.01), n = Math.atan2(y2 - y, x2 - x) + Math.PI / 2;
    c.strokeStyle = SP.k0; c.lineWidth = 1.2; c.beginPath(); c.moveTo(x + Math.cos(n) * 3.4, y + Math.sin(n) * 3.4); c.lineTo(x - Math.cos(n) * 3.4, y - Math.sin(n) * 3.4); c.stroke();
  }
  const [sx, sy] = cubic(TP, 1), [px, py] = cubic(TP, 0.94), a = Math.atan2(sy - py, sx - px);
  c.save(); c.translate(sx, sy); c.rotate(a);                       // the bulb and the hook of the sting
  ell(c, 1, 0, 5, 3.8); c.fillStyle = SP.k1; c.fill(); c.strokeStyle = SP.out; c.lineWidth = 1; c.stroke();
  c.beginPath(); c.moveTo(4, -2.4); c.quadraticCurveTo(10, -1.5, 10, 4); c.quadraticCurveTo(7, 1.4, 4, 2.2); c.closePath();
  c.fillStyle = SP.sting; c.fill(); c.stroke();
  c.fillStyle = SP.sting2; c.fillRect(7, 0, 2, 1);
  c.restore();
  // the body: the abdomen's plates, then the head, low and broad
  c.save(); c.rotate(p.lean);
  for (let i = 0; i < 4; i++) {
    const x = -14 + i * 4.6;
    ell(c, x, -14 + fl * 2, 5.6, 6 - fl * 1.6); c.fillStyle = i % 2 ? SP.k1 : SP.k2; c.fill(); c.strokeStyle = SP.out; c.lineWidth = 1; c.stroke();
  }
  ell(c, 8, -13 + fl * 2, 9, 6.6 - fl * 1.8); c.fillStyle = SP.k2; c.fill(); c.strokeStyle = SP.out; c.stroke();
  c.fillStyle = SP.k3; c.fillRect(3, -18 + fl * 3, 9, 1);
  // the dynamite: a bandolier of sticks across his back, wicks up, and the strap
  if (fl < 1) {
    for (let i = 0; i < 4; i++) {
      const x = -16 + i * 4.4;
      c.fillStyle = SP.out; c.fillRect(x - 1, -27, 5, 10); c.fillStyle = SP.dyn; c.fillRect(x, -26, 3, 8); c.fillStyle = SP.dyn2; c.fillRect(x, -26, 1, 8);
      c.fillStyle = SP.fuse; c.fillRect(x + 1, -29, 1, 2);
    }
    c.fillStyle = SP.out; c.fillRect(-18, -21, 20, 3); c.fillStyle = SP.strap; c.fillRect(-17, -20, 18, 1);
    c.fillStyle = SP.buckle; c.fillRect(-4, -21, 2, 3);
  }
  // the head: beady eyes up top, mean brows, the cigar
  c.save(); c.translate(9, -18 + fl * 3);
  if (p.eyes === 'x') { c.strokeStyle = SP.eyeW; c.lineWidth = 1; for (const ex of [0, 5]) { c.beginPath(); c.moveTo(ex - 1, -2); c.lineTo(ex + 2, 1); c.moveTo(ex + 2, -2); c.lineTo(ex - 1, 1); c.stroke(); } }
  else for (const ex of [0, 5]) {
    c.fillStyle = SP.out; c.fillRect(ex - 1, -3, 4, 4); c.fillStyle = SP.eyeW; c.fillRect(ex, -2, 2, 2);
    c.fillStyle = SP.pupil; c.fillRect(p.eyes === 'daze' ? ex : ex + 1, -2, 1, 2);
    if (p.eyes === 'mad') { c.fillStyle = SP.out; c.fillRect(ex - 1, -4, 4, 1); c.fillRect(ex + (ex ? -1 : 2), -5, 2, 1); }
  }
  if (p.mouth) { c.fillStyle = SP.out; c.fillRect(4, 3, 6, 2 + p.mouth); c.fillStyle = SP.mouth; c.fillRect(5, 3, 4, 1 + p.mouth); }
  c.fillStyle = SP.out; c.fillRect(6, 2, 9, 3); c.fillStyle = SP.cig; c.fillRect(7, 3, 7, 1); c.fillStyle = SP.ember; c.fillRect(14, 2, 2, 3);   // the cigar
  if (p.hat) {                                                      // the flat black hat, a red band
    c.save(); c.translate(2, -5); c.rotate(-0.08);
    c.fillStyle = SP.out; c.fillRect(-9, -1, 20, 3); c.fillStyle = SP.hat; c.fillRect(-8, 0, 18, 1);
    c.fillStyle = SP.out; c.fillRect(-5, -7, 12, 7); c.fillStyle = SP.hat2; c.fillRect(-4, -6, 10, 5); c.fillStyle = SP.band; c.fillRect(-4, -2, 10, 1);
    c.restore();
  }
  c.restore();
  // the pincers: out in front on short arms - a fat claw, its two fingers apart by `open`
  const claw = (bx, by, reach, open, lift, col, far) => {
    const hx = bx + 11 + reach, hy = by - 4 - lift;
    line([[bx, by], [bx + 5 + reach * 0.4, by - 4 - lift * 0.5], [hx - 3, hy]], far ? 2 : 2.6, col);
    c.save(); c.translate(hx, hy);
    for (const [sgn, k] of [[-1, 1], [1, 0.7]]) {                   // the fingers: the top one moves
      const sp2 = sgn < 0 ? open * 4 : open * 1.5;
      c.beginPath(); c.moveTo(2, sgn * 1); c.quadraticCurveTo(9, sgn * (3 + sp2) * k, 12, sgn * (0.6 + sp2 * 0.6));
      c.strokeStyle = SP.out; c.lineWidth = 4; c.stroke(); c.strokeStyle = far ? SP.k1 : SP.k2; c.lineWidth = 2.2; c.stroke();
    }
    ell(c, 0, 0, far ? 5.4 : 6.6, far ? 4 : 5); c.fillStyle = far ? SP.k1 : SP.k2; c.fill(); c.strokeStyle = SP.out; c.lineWidth = 1; c.stroke();
    if (!far) { c.fillStyle = SP.k3; c.fillRect(-3, -3, 4, 1); }
    c.restore();
  };
  claw(5, -14 + fl * 2, p.reach * 0.7, p.open, fl ? 0 : 5, SP.k1, true);   // far pincer
  if (p.stick === 1) {                                              // the stick held to his cigar, the fuse fizzing
    c.save(); c.translate(24, -27); c.rotate(-0.4);
    c.fillStyle = SP.out; c.fillRect(-1, -2, 11, 5); c.fillStyle = SP.dyn; c.fillRect(0, -1, 9, 3); c.fillStyle = SP.dyn2; c.fillRect(0, -1, 9, 1);
    c.fillStyle = SP.fuse; c.fillRect(-3, 0, 3, 1); c.fillStyle = SP.spark; c.fillRect(-5, -1, 2, 2); c.fillRect(-6, 1, 1, 1);
    c.restore();
  }
  claw(9, -12 + fl * 2, p.reach, p.open, p.raise, SP.k2, false);   // near pincer
  c.restore();
  legs(false, SP.leg);
  c.restore();
  if (p.stars >= 0) for (let i = 0; i < 3; i++) {
    const a2 = p.stars + i * Math.PI * 2 / 3, x = 12 + Math.cos(a2) * 12, y = -36 + Math.sin(a2) * 3;
    c.fillStyle = SP.star; c.fillRect(x - 2, y - 0.5, 4, 1); c.fillRect(x - 0.5, y - 2, 1, 4);
  }
}

T.buildSting = function () {
  const B = T.BOSS, TAU = Math.PI * 2;
  const bake = fn => { const cv = T.canvas(B.FW, B.FH), x = cv.getContext('2d'); x.translate(B.OX, B.OY); fn(x); return T.pixelize(cv, SP, SP.out, T.CLUT.spr); };
  const mk = o => bake(x => drawSting(x, o));
  const small = (w, h, ox, oy, fn) => { const cv = T.canvas(w, h), x = cv.getContext('2d'); x.translate(ox, oy); fn(x); const o = T.pixelize(cv, SP, SP.out, T.CLUT.spr); o.ox = ox; o.oy = oy; return o; };
  // a lit stick (2 frames: the fuse's spark) and the bang (3 frames: flash, fire, smoke), each with its origin
  const stick = [0, 1].map(k => small(16, 10, 8, 6, x => {
    x.fillStyle = SP.dyn; x.fillRect(-6, -2, 11, 4); x.fillStyle = SP.dyn2; x.fillRect(-6, -2, 11, 1);
    x.fillStyle = SP.strap; x.fillRect(-2, -2, 1, 4);
    x.fillStyle = SP.fuse; x.fillRect(5, -1, 2, 1);
    x.fillStyle = SP.spark; if (k) { x.fillRect(7, -3, 1, 1); x.fillRect(8, -1, 1, 1); x.fillRect(6, 1, 1, 1); } else { x.fillRect(7, -2, 2, 2); }
  }));
  const BOOM = { w0: '#fff8d0', y0: '#ffd34a', o0: '#ff8a2a', r0: '#c83a1a', s0: '#6a6060', s1: '#9a9090' };
  const boom = [0, 1, 2].map(k => {
    const cv = T.canvas(48, 40), x = cv.getContext('2d'); x.translate(24, 34);
    if (k === 0) { x.fillStyle = BOOM.o0; ell(x, 0, -12, 16, 12); x.fill(); x.fillStyle = BOOM.y0; ell(x, 0, -12, 11, 8); x.fill(); x.fillStyle = BOOM.w0; ell(x, 0, -12, 6, 5); x.fill(); }
    if (k === 1) {
      for (const [dx, dy, r] of [[-10, -10, 9], [9, -12, 10], [0, -20, 9], [-3, -6, 8]]) { x.fillStyle = BOOM.r0; ell(x, dx, dy, r + 2, r); x.fill(); }
      for (const [dx, dy, r] of [[-8, -11, 6], [8, -13, 7], [0, -19, 6]]) { x.fillStyle = BOOM.o0; ell(x, dx, dy, r, r - 1); x.fill(); }
      x.fillStyle = BOOM.y0; ell(x, 0, -13, 5, 4); x.fill();
    }
    if (k === 2) for (const [dx, dy, r] of [[-12, -14, 8], [10, -18, 9], [0, -26, 8], [-2, -9, 7]]) { x.fillStyle = BOOM.s0; ell(x, dx, dy, r, r - 1); x.fill(); x.fillStyle = BOOM.s1; ell(x, dx - 2, dy - 2, r - 4, r - 5); x.fill(); }
    const o = T.pixelize(cv, BOOM, PAL.out, T.CLUT.spr); o.ox = 24; o.oy = 34; return o;
  });
  return {
    idle: [mk({}), mk({ by: 0.6, open: 0.5 })],
    walk: [0, 1, 2, 3].map(i => mk({ legs: i / 4 * TAU, by: (i % 2) * 0.6, open: 0.3 })),
    talk: [mk({ mouth: 2, open: 0.8, raise: 6 }), mk({ mouth: 1, open: 0.3, by: 0.5 })],
    pinchw: mk({ reach: -4, open: 1.1, raise: 2, lean: -0.08 }),     // the pincers back and open
    pinch: mk({ reach: 8, open: 0, lean: 0.1, legs: 1 }),           // snapped shut, out in front
    windup: mk({ tail: 1, open: 0.6, lean: -0.1, eyes: 'mad' }),     // the tail cocked
    sting: mk({ tail: 2, open: 0.3, lean: 0.12, reach: 4 }),         // lashed out in front
    stuck: mk({ tail: 3, open: 0.9, lean: 0.15, mouth: 1, eyes: 'daze' }),   // the sting stuck in the roof: open
    light: mk({ stick: 1, open: 0.2, raise: 10, eyes: 'mad' }),      // a stick to the cigar
    toss: mk({ open: 1, raise: 14, reach: 4, lean: -0.1, mouth: 1 }), // and away
    duck: mk({ flat: 1, tail: 4, open: 0.2, hat: true }),            // flat for the tunnel
    hurt: mk({ lean: -0.18, eyes: 'x', mouth: 2, open: 1.2, raise: 8, tail: 1 }),
    daze: [0, 1, 2, 3].map(i => mk({ eyes: 'daze', lean: -0.06 + (i % 2) * 0.06, open: 0.9, mouth: 1, stars: i / 4 * TAU / 3, tail: 4 })),
    ko: mk({ belly: true, eyes: 'x', mouth: 2, open: 1.3, tail: 4, legs: 0.7 }),
    stick, boom,
  };
};
})();
