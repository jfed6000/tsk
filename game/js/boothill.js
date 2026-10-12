// Texas Shitkickers — Boot Hill art: the night backdrop, the Buzzard, Two-Bit the gravedigger, and the props.
// Same method as sprites.js: vector drawing at 1:1, then pixelized into the sprite or tile CLUT.
(function () {
'use strict';
const T = window.TSK;
const { PAL, CLUT } = T;
const canvas = T.canvas, pixelize = T.pixelize;
function ell(ctx, x, y, rx, ry, rot) { ctx.beginPath(); ctx.ellipse(x, y, rx, ry, rot || 0, 0, Math.PI * 2); }
function rng(seed) { return () => (seed = (seed * 16807) % 2147483647) / 2147483647; }
const bake = (w, h, ox, oy, pal, fn, outline = PAL.out) => {
  const c = canvas(w, h), ctx = c.getContext('2d');
  ctx.translate(ox, oy); fn(ctx);
  const out = pixelize(c, pal, outline, CLUT.spr);
  out.ox = ox; out.oy = oy;
  return out;
};

// ---------------------------------------------------------------- the night sky and the hill (two back tile maps)
T.buildNightLayers = function (VW, VH, GROUND) {
  const L = {}, r = rng(19);
  const far = canvas(640, VH), f = far.getContext('2d');
  const bands = ['#0b0a20', '#100e2c', '#161338', '#1d1844', '#251e50', '#2f255a', '#3a2c62', '#463468'];
  const bh = Math.ceil((GROUND - 24) / bands.length);
  bands.forEach((col, i) => {
    f.fillStyle = col; f.fillRect(0, i * bh, 640, bh);
    if (i > 0) {
      f.fillStyle = bands[i - 1];
      for (let y = 0; y < 3; y++) for (let x = (y % 2); x < 640; x += 2) if (y < 2 || x % 4 === 0) f.fillRect(x, i * bh + y, 1, 1);
    }
  });
  f.fillStyle = bands[bands.length - 1]; f.fillRect(0, bh * bands.length, 640, VH);
  for (let i = 0; i < 90; i++) {                                   // stars, thinning toward the horizon
    const x = Math.floor(r() * 640), y = Math.floor(Math.pow(r(), 1.6) * (GROUND - 70));
    f.fillStyle = r() < 0.25 ? '#fff3c4' : '#cfd4f0'; f.fillRect(x, y, 1, 1);
    if (r() < 0.08) { f.fillRect(x - 1, y, 3, 1); f.fillRect(x, y - 1, 1, 3); }
  }
  // the moon, with a ring of glow and some craters
  f.fillStyle = '#2c2558'; ell(f, 230, 52, 31, 31); f.fill();
  f.fillStyle = '#3a3168'; ell(f, 230, 52, 26, 26); f.fill();
  f.fillStyle = '#f3ecd0'; ell(f, 230, 52, 21, 21); f.fill();
  f.fillStyle = '#d9d0ae'; for (const [x, y, rr] of [[222, 46, 4], [237, 58, 5], [233, 41, 2.5], [219, 60, 2.5]]) { ell(f, x, y, rr, rr); f.fill(); }
  // far hills, an old mission and a dead tree in silhouette
  f.fillStyle = '#1c1636'; f.beginPath(); f.moveTo(0, VH);
  for (let x = 0; x <= 640; x += 8) f.lineTo(x, GROUND - 44 - 12 * Math.sin(x / 640 * Math.PI * 2) - 6 * Math.sin(x / 640 * Math.PI * 6));
  f.lineTo(640, VH); f.fill();
  f.fillStyle = '#151029';
  f.fillRect(470, GROUND - 92, 34, 40); f.beginPath(); f.moveTo(466, GROUND - 92); f.quadraticCurveTo(487, GROUND - 118, 508, GROUND - 92); f.fill();
  f.fillRect(484, GROUND - 126, 6, 14); f.fillRect(480, GROUND - 121, 14, 3);  // the cross on the bell tower
  f.strokeStyle = '#151029'; f.lineCap = 'round';
  const branch = (x, y, a, len, w) => {
    if (len < 3) return;
    const x2 = x + Math.cos(a) * len, y2 = y + Math.sin(a) * len;
    f.lineWidth = w; f.beginPath(); f.moveTo(x, y); f.lineTo(x2, y2); f.stroke();
    branch(x2, y2, a - 0.5 - r() * 0.3, len * 0.68, Math.max(1, w * 0.7));
    branch(x2, y2, a + 0.4 + r() * 0.3, len * 0.62, Math.max(1, w * 0.7));
  };
  branch(110, GROUND - 46, -Math.PI / 2 - 0.1, 22, 4);
  const NS = {}; bands.forEach((b, i) => NS['k' + i] = b);
  L.far = pixelize(far, Object.assign(NS, { s1: '#fff3c4', s2: '#cfd4f0', m0: '#2c2558', m1: '#3a3168', m2: '#f3ecd0', m3: '#d9d0ae', h0: '#1c1636', h1: '#151029' }), null, CLUT.bg);

  // the hill itself: crosses, headstones, an iron fence, over transparency
  const mid = canvas(800, VH), m = mid.getContext('2d');
  const HP = { a: '#2a2242', b: '#211a36', c: '#3a3058', o: PAL.out };
  m.fillStyle = HP.a; m.beginPath(); m.moveTo(0, VH);
  for (let x = 0; x <= 800; x += 10) m.lineTo(x, GROUND - 24 - 8 * Math.sin(x / 800 * Math.PI * 4) - 4 * Math.sin(x / 800 * Math.PI * 10));
  m.lineTo(800, VH); m.fill();
  const hill = x => GROUND - 24 - 8 * Math.sin(x / 800 * Math.PI * 4) - 4 * Math.sin(x / 800 * Math.PI * 10);
  m.fillStyle = HP.b;
  for (let i = 0; i < 26; i++) {
    const x = 14 + i * 30 + r() * 14, y = hill(x) + 2, k = r();
    if (k < 0.45) { m.fillRect(x, y - 12, 2, 12); m.fillRect(x - 3, y - 9, 8, 2); }                 // cross
    else if (k < 0.85) { m.beginPath(); m.moveTo(x, y); m.lineTo(x, y - 7); m.quadraticCurveTo(x + 4, y - 12, x + 8, y - 7); m.lineTo(x + 8, y); m.fill(); }
    else { m.fillRect(x, y - 16, 3, 16); m.fillRect(x - 4, y - 12, 11, 3); }                        // a tall cross
  }
  m.fillStyle = HP.c; m.fillRect(0, GROUND - 13, 800, 1);                                            // fence rail
  for (let x = 2; x < 800; x += 6) { m.fillRect(x, GROUND - 16, 1, 10); m.fillRect(x - 1, GROUND - 17, 3, 1); }
  m.fillStyle = HP.b; m.fillRect(0, GROUND - 6, 800, VH);
  L.mid = pixelize(mid, HP, null, CLUT.bg);
  return L;
};

// ---------------------------------------------------------------- the Buzzard
// Perches on a headstone, takes off when you get close, circles, then dive-bombs. Origin at its centre.
const BPAL = {
  out: PAL.out, f0: '#231a2a', f1: '#3a2f45', f2: '#55476a', f3: '#776a8e',
  r0: '#f0ece0', r1: '#c9c2b0', k0: '#b5534a', k1: '#de8a78', b0: '#d8a840', b1: '#f3d27a',
  eyeW: PAL.eyeW, pupil: PAL.pupil,
};
function drawBuzzard(ctx, wing, mode) {
  ctx.lineWidth = 1; ctx.strokeStyle = BPAL.out;
  const body = mode === 'perch' ? [0, 2, 8, 9.5, -0.2] : mode === 'dive' ? [0, 0, 11, 6, 0.6] : [0, 0, 10.5, 6.5, 0.05];
  // far wing
  const wingShape = (up, back, dark) => {
    ctx.beginPath(); ctx.moveTo(-3, -1);
    ctx.quadraticCurveTo(-6 - back, -6 - up * 8, -14 - back, -4 - up * 10);
    for (let i = 0; i < 4; i++) ctx.lineTo(-14 - back + i * 3.2, -4 - up * 10 + (i % 2 ? 2.6 : 0) + i * up * 2);
    ctx.quadraticCurveTo(-2, 2, 4, 0);
    ctx.closePath(); ctx.fillStyle = dark ? BPAL.f0 : BPAL.f2; ctx.fill(); ctx.stroke();
  };
  if (mode !== 'perch') wingShape(wing * 0.8, mode === 'dive' ? 4 : 0, true);
  // tail
  ctx.beginPath(); ctx.moveTo(-7, 1); ctx.lineTo(-14, 3 + (mode === 'perch' ? 6 : 0)); ctx.lineTo(-13, 6 + (mode === 'perch' ? 6 : 0)); ctx.lineTo(-6, 4);
  ctx.closePath(); ctx.fillStyle = BPAL.f1; ctx.fill(); ctx.stroke();
  // body
  ell(ctx, body[0], body[1], body[2], body[3], body[4]); ctx.fillStyle = BPAL.f1; ctx.fill(); ctx.stroke();
  ctx.save(); ell(ctx, body[0], body[1], body[2], body[3], body[4]); ctx.clip();
  ctx.fillStyle = BPAL.f2; ell(ctx, body[0] + 2, body[1] - 3, body[2] * 0.7, body[3] * 0.5, body[4]); ctx.fill();
  ctx.restore();
  if (mode === 'perch') {                                      // folded wing, feet gripping
    ctx.beginPath(); ctx.moveTo(-6, -4); ctx.quadraticCurveTo(2, -5, 5, 2); ctx.quadraticCurveTo(-2, 9, -9, 10); ctx.closePath();
    ctx.fillStyle = BPAL.f2; ctx.fill(); ctx.stroke();
    ctx.fillStyle = BPAL.b0; ctx.fillRect(-3, 10.5, 2, 3); ctx.fillRect(2, 10.5, 2, 3);
  } else if (mode === 'dive') {
    ctx.fillStyle = BPAL.b0; ctx.fillRect(-9, 4, 3, 2); ctx.fillRect(-7, 6, 3, 2);      // talons out
  }
  // neck ruff, bald head, hooked beak
  const hx = mode === 'perch' ? 7 : mode === 'dive' ? 11 : 10, hy = mode === 'perch' ? -9 : mode === 'dive' ? 5 : -4;
  ell(ctx, hx - 4, hy + 3, 4.6, 3.6); ctx.fillStyle = BPAL.r0; ctx.fill(); ctx.stroke();
  ctx.fillStyle = BPAL.r1; ctx.fillRect(hx - 7, hy + 4, 6, 1.4);
  ctx.beginPath(); ctx.moveTo(hx - 3, hy + 2); ctx.lineTo(hx, hy - 1); ctx.stroke();
  ell(ctx, hx, hy - 1.5, 3.8, 3.3); ctx.fillStyle = BPAL.k0; ctx.fill(); ctx.stroke();
  ell(ctx, hx - 0.6, hy - 2.6, 2, 1.4); ctx.fillStyle = BPAL.k1; ctx.fill();
  ctx.beginPath(); ctx.moveTo(hx + 3, hy - 3); ctx.lineTo(hx + 7.4, hy - 1.4); ctx.quadraticCurveTo(hx + 7.6, hy + 1.6, hx + 5.6, hy + 1.6);
  ctx.lineTo(hx + 3, hy); ctx.closePath(); ctx.fillStyle = BPAL.b1; ctx.fill(); ctx.stroke();
  ctx.fillStyle = BPAL.eyeW; ctx.fillRect(hx + 0.4, hy - 3.2, 2, 2);
  ctx.fillStyle = BPAL.pupil; ctx.fillRect(hx + 1.2, hy - 2.6, 1, 1.2);
  ctx.strokeStyle = BPAL.out; ctx.lineWidth = 1.2; ctx.beginPath(); ctx.moveTo(hx - 0.6, hy - 4.6); ctx.lineTo(hx + 3, hy - 3.2); ctx.stroke();
  if (mode !== 'perch') { ctx.lineWidth = 1; wingShape(wing, mode === 'dive' ? 4 : 0, false); }
}
T.BUZZARD = { FW: 32, FH: 32, OX: 16, OY: 16 };
T.buildBuzzard = function () {
  const B = T.BUZZARD, mk = (w, m) => bake(B.FW, B.FH, B.OX, B.OY, BPAL, ctx => drawBuzzard(ctx, w, m));
  return { perch: mk(0, 'perch'), fly: [mk(1, 'fly'), mk(0.15, 'fly'), mk(-0.7, 'fly'), mk(0.15, 'fly')], dive: mk(-0.2, 'dive') };
};

// ---------------------------------------------------------------- Two-Bit, the coyote gravedigger (level boss)
// He buried Ringo, and he's been robbing the graves since. A scrawny coyote in an undertaker's battered topper,
// a ragged vest and a shovel. Facing right, origin at his feet.
const CPAL = {
  out: PAL.out, c0: '#6e4a2c', c1: '#9c7246', c2: '#c69a66', c3: '#e6c897',
  v0: '#2c2436', v1: '#453850', v2: '#5f4f6c', h0: '#141218', h1: '#2a2630', h2: '#423c4c', band: '#7a2a2a',
  s0: '#4a4a52', s1: '#7a7c86', s2: '#a6a9b4', wd0: '#4a3020', wd1: '#7a5236',
  eyeW: PAL.eyeW, pupil: PAL.pupil, mouth: PAL.mouth, teeth: PAL.teeth, nose: '#141014', star: '#ffd34a',
};
const CB = {
  lean: 0, by: 0, legs: [0, 0], shovel: -0.9, grip: [9, -24], arms: 0, mouth: 0, eyes: 'mad', hat: 0, sink: 0, stars: -1, squash: 1,
};
function drawCoyote(ctx, o) {
  const p = Object.assign({}, CB, o);
  ctx.lineCap = 'round'; ctx.lineJoin = 'round';
  const limb = (pts, w, col) => {
    ctx.beginPath(); ctx.moveTo(pts[0][0], pts[0][1]); for (const q of pts.slice(1)) ctx.lineTo(q[0], q[1]);
    ctx.strokeStyle = CPAL.out; ctx.lineWidth = w + 2; ctx.stroke(); ctx.strokeStyle = col; ctx.lineWidth = w; ctx.stroke();
  };
  const leg = (ph, col) => {                         // digitigrade: hip, knee forward, hock back, paw
    const s = Math.sin(ph), c = Math.cos(ph);
    const hip = [0, -19], knee = [3 + 3 * s, -12 - 1.5 * Math.max(0, c)], hock = [-1 + 4 * s, -5 - 2 * Math.max(0, -c)], paw = [2 + 5 * s, -0.8 - 2 * Math.max(0, -c)];
    limb([hip, knee, hock], 3.2, col);
    limb([hock, paw, [paw[0] + 3.2, paw[1]]], 2.4, col);
  };
  ctx.save(); ctx.translate(0, p.sink + p.by); ctx.scale(1, p.squash);
  leg(p.legs[1], CPAL.c0);
  // bushy tail
  ctx.beginPath(); ctx.moveTo(-5, -20); ctx.quadraticCurveTo(-17, -20, -18, -8); ctx.quadraticCurveTo(-13, -12, -4, -15); ctx.closePath();
  ctx.fillStyle = CPAL.c1; ctx.fill(); ctx.strokeStyle = CPAL.out; ctx.lineWidth = 1; ctx.stroke();
  ctx.fillStyle = CPAL.c3; ell(ctx, -16.4, -10, 2, 2.4); ctx.fill();
  ctx.save(); ctx.rotate(p.lean);
  // back arm to the shovel
  const g = p.grip, gx = g[0], gy = g[1];
  limb([[-1, -32], [-4 + p.arms, -26], [gx - 4, gy + 2]], 2.6, CPAL.c0);
  // torso + ragged vest
  ell(ctx, 0, -26, 6.6, 9.6); ctx.fillStyle = CPAL.c1; ctx.fill(); ctx.stroke();
  ctx.save(); ell(ctx, 0, -26, 6.6, 9.6); ctx.clip();
  ctx.fillStyle = CPAL.c3; ell(ctx, 3.6, -25, 3, 7); ctx.fill();          // pale chest
  ctx.fillStyle = CPAL.v1; ctx.beginPath(); ctx.moveTo(-8, -36); ctx.lineTo(2, -36); ctx.lineTo(1, -16); ctx.lineTo(-3, -18); ctx.lineTo(-5, -15); ctx.lineTo(-8, -17); ctx.fill();
  ctx.fillStyle = CPAL.v2; ctx.fillRect(-7, -35, 2, 18);
  ctx.fillStyle = CPAL.star; ctx.fillRect(-0.6, -29, 1.4, 1.4); ctx.fillRect(-0.6, -24, 1.4, 1.4);  // buttons
  ctx.restore();
  // head: long snout to the right, tall ears, scruffy cheek
  ctx.save(); ctx.translate(2, -39);
  ctx.beginPath(); ctx.moveTo(-3, -4); ctx.lineTo(-4.4, -13); ctx.lineTo(1, -6); ctx.closePath(); ctx.fillStyle = CPAL.c0; ctx.fill(); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(0, -4); ctx.lineTo(2.6, -13); ctx.lineTo(4.4, -5); ctx.closePath(); ctx.fillStyle = CPAL.c1; ctx.fill(); ctx.stroke();
  ctx.fillStyle = CPAL.c3; ctx.beginPath(); ctx.moveTo(1.2, -6); ctx.lineTo(2.6, -11); ctx.lineTo(3.4, -6); ctx.fill();
  ell(ctx, 0, 0, 6, 5.2); ctx.fillStyle = CPAL.c1; ctx.fill(); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(3, -2.6); ctx.lineTo(13.4, -0.6); ctx.quadraticCurveTo(14.6, 1.4, 12.6, 2.2); ctx.lineTo(3.4, 4); ctx.closePath();
  ctx.fillStyle = CPAL.c2; ctx.fill(); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(-5, 2); ctx.lineTo(-7.4, 5); ctx.lineTo(-3.4, 4.4); ctx.lineTo(-4.4, 6.6); ctx.lineTo(0, 4.6); ctx.closePath();
  ctx.fillStyle = CPAL.c3; ctx.fill(); ctx.stroke();
  ell(ctx, 13.4, 0.3, 1.5, 1.3); ctx.fillStyle = CPAL.nose; ctx.fill();
  if (p.mouth) {                                     // open jaw with a crooked row of teeth
    ctx.beginPath(); ctx.moveTo(4, 2.6); ctx.lineTo(12.4, 2.2); ctx.lineTo(10.6, 2.2 + 3 * p.mouth); ctx.lineTo(4.6, 4.6 + 1.4 * p.mouth); ctx.closePath();
    ctx.fillStyle = CPAL.mouth; ctx.fill(); ctx.stroke();
    ctx.fillStyle = CPAL.teeth; ctx.fillRect(6, 2.4, 1, 1.2); ctx.fillRect(8.6, 2.3, 1, 1.4); ctx.fillRect(10.8, 2.2, 1, 1);
  } else { ctx.strokeStyle = CPAL.out; ctx.beginPath(); ctx.moveTo(4.6, 3); ctx.lineTo(10.6, 2.4); ctx.stroke(); }
  if (p.eyes === 'x') {
    ctx.strokeStyle = CPAL.out; ctx.lineWidth = 1.1; ctx.beginPath();
    ctx.moveTo(2.4, -3.2); ctx.lineTo(5.4, -0.4); ctx.moveTo(5.4, -3.2); ctx.lineTo(2.4, -0.4); ctx.stroke();
  } else {
    ell(ctx, 4, -1.8, 1.9, 1.7); ctx.fillStyle = CPAL.eyeW; ctx.fill(); ctx.lineWidth = 0.8; ctx.stroke();
    ctx.fillStyle = CPAL.pupil;
    if (p.eyes === 'daze') { ctx.fillRect(3.2, -2.4, 1, 1); ctx.fillRect(4.4, -1.6, 1, 1); }
    else ctx.fillRect(4.4, -2.4, 1.3, 1.6);
    if (p.eyes === 'mad') { ctx.lineWidth = 1.3; ctx.beginPath(); ctx.moveTo(1.6, -4.6); ctx.lineTo(6.2, -3); ctx.stroke(); }
  }
  // the battered undertaker's topper
  ctx.save(); ctx.translate(-1, -4.6 - p.hat); ctx.rotate(-0.16 - p.hat * 0.04);
  ctx.fillStyle = CPAL.h1; ctx.beginPath(); ctx.moveTo(-4.6, 0); ctx.lineTo(-4, -9); ctx.lineTo(1, -8); ctx.lineTo(4, -10.4); ctx.lineTo(4.4, 0); ctx.closePath(); ctx.fill();
  ctx.strokeStyle = CPAL.out; ctx.lineWidth = 1; ctx.stroke();
  ctx.fillStyle = CPAL.h2; ctx.fillRect(-3.6, -8, 1.6, 7);
  ctx.fillStyle = CPAL.band; ctx.fillRect(-4.4, -2.6, 8.8, 1.8);
  ctx.fillStyle = CPAL.h0; ctx.beginPath(); ctx.moveTo(-8, 0.6); ctx.lineTo(8, -0.4); ctx.lineTo(8, 1.4); ctx.lineTo(-8, 2.2); ctx.closePath(); ctx.fill(); ctx.stroke();
  ctx.restore();
  ctx.restore();   // head
  // the shovel: a handle through the grip, blade at the far end
  const ca = Math.cos(p.shovel), sa = Math.sin(p.shovel);
  const end0 = [gx - ca * 10, gy - sa * 10], end1 = [gx + ca * 15, gy + sa * 15];
  limb([end0, end1], 1.8, CPAL.wd1);
  ctx.save(); ctx.translate(end1[0], end1[1]); ctx.rotate(p.shovel);
  ctx.beginPath(); ctx.moveTo(0, -3.2); ctx.lineTo(7, -4); ctx.quadraticCurveTo(10.4, 0, 7, 4); ctx.lineTo(0, 3.2); ctx.closePath();
  ctx.fillStyle = CPAL.s1; ctx.fill(); ctx.strokeStyle = CPAL.out; ctx.lineWidth = 1; ctx.stroke();
  ctx.fillStyle = CPAL.s2; ctx.fillRect(1, -2.6, 5, 1.4);
  ctx.restore();
  // front arm to the shovel
  limb([[2, -31], [6 + p.arms, -26], [gx + 2, gy]], 2.8, CPAL.c1);
  ell(ctx, gx + 2, gy, 2.2, 2); ctx.fillStyle = CPAL.c2; ctx.fill(); ctx.strokeStyle = CPAL.out; ctx.lineWidth = 1; ctx.stroke();
  ctx.restore();   // lean
  leg(p.legs[0], CPAL.c1);
  ctx.restore();
  if (p.stars >= 0) {                                 // seeing stars
    for (let i = 0; i < 3; i++) {
      const a = p.stars + i * Math.PI * 2 / 3, x = 2 + Math.cos(a) * 10, y = -50 + Math.sin(a) * 3;
      ctx.fillStyle = CPAL.star; ctx.fillRect(x - 2, y - 0.5, 4, 1); ctx.fillRect(x - 0.5, y - 2, 1, 4);
    }
  }
}
T.BOSS = { FW: 64, FH: 64, OX: 26, OY: 60 };
// 'mangy': the same coyote re-coloured mean for the darker brawler stages (grey-brown mange, a blood-red band,
// yellow eyes)
const MANGY = { c0: '#3e3228', c1: '#5e5040', c2: '#7c6c56', c3: '#9a8a70', v1: '#2e2834', v2: '#3e3646', band: '#6a1010', eyeW: '#e8cc30' };
T.buildCoyote = function (variant) {
  const saved = Object.assign({}, CPAL);
  if (variant === 'mangy') Object.assign(CPAL, MANGY);
  try { return coyoteFrames(); } finally { Object.assign(CPAL, saved); }
};
function coyoteFrames() {
  const B = T.BOSS, mk = o => bake(B.FW, B.FH, B.OX, B.OY, CPAL, ctx => drawCoyote(ctx, o));
  const TAU = Math.PI * 2;
  return {
    idle: [mk({}), mk({ by: 0.6, squash: 0.98, shovel: -0.86 })],
    walk: [0, 1, 2, 3].map(i => mk({ legs: [i / 4 * TAU, i / 4 * TAU + Math.PI], by: -Math.abs(Math.sin(i / 4 * TAU)) })),
    talk: [mk({ mouth: 1 }), mk({ mouth: 0.4, by: 0.4 })],
    windup: mk({ lean: -0.25, shovel: -2.5, grip: [2, -36], arms: -3, mouth: 0.6 }),
    swing: mk({ lean: 0.3, shovel: 0.55, grip: [12, -19], arms: 3, mouth: 1, legs: [0.8, -0.6] }),
    throw: mk({ lean: 0.15, shovel: -0.45, grip: [12, -27], arms: 3, mouth: 1 }),
    dig: mk({ lean: 0.55, shovel: 1.25, grip: [10, -15], arms: 2, legs: [0.6, -0.6], squash: 0.94 }),
    pop: mk({ lean: -0.1, shovel: -2.2, grip: [4, -40], arms: -2, mouth: 1, by: -4 }),
    daze: [0, 1, 2, 3].map(i => mk({ eyes: 'daze', lean: -0.15 + (i % 2) * 0.08, shovel: 1.1, grip: [6, -16], mouth: 0.4, stars: i / 4 * TAU / 3, hat: 2 })),
    hurt: mk({ lean: -0.35, eyes: 'x', mouth: 1, shovel: -1.6, grip: [4, -26], hat: 3 }),
    ko: mk({ lean: -0.6, eyes: 'x', mouth: 1, shovel: -2.8, grip: [0, -30], hat: 6, legs: [1.2, -1.2] }),
    // flat on his back (the brawler's knockdown): the standing drawing tipped over
    down: bake(B.FW, B.FH, B.OX, B.OY, CPAL, ctx => { ctx.translate(24, -3); ctx.rotate(-Math.PI / 2 + 0.06); drawCoyote(ctx, { eyes: 'x', mouth: 1, shovel: 0.4, grip: [8, -22], hat: 4 }); }),
  };
}

// ---------------------------------------------------------------- props and effects
const GPAL = { out: PAL.out, g0: '#4a5068', g1: '#6f7690', g2: '#9aa1b8', g3: '#c3c8d8', d0: '#241d33', d1: '#3d3354', d2: '#5e5278', d3: '#8c80a6', moss: '#4f6a48' };
T.buildProps = function () {
  const P = {};
  // Ringo's headstone. The hat waits on top of it until he gets up.
  P.headstone = bake(32, 40, 16, 39, GPAL, ctx => {
    ctx.beginPath(); ctx.moveTo(-11, 0); ctx.lineTo(-11, -24); ctx.quadraticCurveTo(-11, -34, 0, -34); ctx.quadraticCurveTo(11, -34, 11, -24); ctx.lineTo(11, 0); ctx.closePath();
    ctx.fillStyle = GPAL.g1; ctx.fill(); ctx.strokeStyle = PAL.out; ctx.lineWidth = 1; ctx.stroke();
    ctx.fillStyle = GPAL.g2; ctx.fillRect(-9, -27, 4, 26); ctx.fillStyle = GPAL.g0; ctx.fillRect(7, -26, 3, 26);
    ctx.fillStyle = GPAL.moss; ctx.fillRect(-11, -4, 7, 3); ctx.fillRect(4, -3, 6, 2);
  }, PAL.out);
  // carve the name in after pixelizing, so the letters stay crisp
  const hc = P.headstone.getContext('2d');
  hc.setTransform(1, 0, 0, 1, 0, 0);
  T.drawText(hc, 'RINGO', 16, 13, GPAL.d1, 1, null, 'center');
  T.drawText(hc, 'R.I.P.', 16, 21, GPAL.d1, 1, null, 'center');
  P.headstone = pixelize(P.headstone, GPAL, null, CLUT.spr); P.headstone.ox = 16; P.headstone.oy = 39;
  // the grave: a fresh mound before he rises, an open hole after
  P.mound = bake(40, 12, 20, 11, GPAL, ctx => {
    ctx.beginPath(); ctx.moveTo(-18, 0); ctx.quadraticCurveTo(-16, -8, 0, -8); ctx.quadraticCurveTo(16, -8, 18, 0); ctx.closePath();
    ctx.fillStyle = GPAL.d2; ctx.fill(); ctx.fillStyle = GPAL.d3; ctx.fillRect(-10, -8, 12, 2);
    ctx.fillStyle = GPAL.d1; for (const [x, y] of [[-12, -3], [-4, -5], [6, -3], [12, -2]]) ctx.fillRect(x, y, 2, 1);
  });
  P.hole = bake(40, 12, 20, 11, GPAL, ctx => {
    ctx.fillStyle = GPAL.d2; ctx.beginPath(); ctx.moveTo(-19, 0); ctx.lineTo(-15, -5); ctx.lineTo(-11, -2); ctx.lineTo(-9, 0); ctx.fill();
    ctx.beginPath(); ctx.moveTo(19, 0); ctx.lineTo(14, -6); ctx.lineTo(10, -2); ctx.lineTo(9, 0); ctx.fill();
    ell(ctx, 0, -1, 10, 2.6); ctx.fillStyle = '#0e0a16'; ctx.fill();
  });
  // a checkpoint lantern on a post (lit once passed)
  const lantern = lit => bake(16, 32, 8, 31, { out: PAL.out, w0: '#3a2618', w1: '#5a3d28', m0: '#3a3a48', m1: '#6a6a7a', l0: '#7a4a20', l1: '#ffb340', l2: '#fff3c4' }, ctx => {
    ctx.fillStyle = '#5a3d28'; ctx.fillRect(-1, -22, 2, 22); ctx.fillRect(-1, -22, 6, 2);
    ctx.fillStyle = '#3a3a48'; ctx.fillRect(2, -20, 5, 1); ctx.fillRect(2.5, -14, 4, 1);
    ctx.fillStyle = lit ? '#ffb340' : '#7a4a20'; ctx.fillRect(2.5, -19, 4, 5);
    if (lit) { ctx.fillStyle = '#fff3c4'; ctx.fillRect(3.5, -18, 2, 3); }
  });
  P.lantern = [lantern(false), lantern(true)];
  P.clod = bake(8, 8, 4, 4, GPAL, ctx => { ell(ctx, 0, 0, 2.6, 2.2); ctx.fillStyle = GPAL.d2; ctx.fill(); ctx.fillStyle = GPAL.d3; ctx.fillRect(-1.6, -1.8, 2, 1); });
  P.digMound = [0, 1].map(k => bake(32, 12, 16, 11, GPAL, ctx => {
    ctx.beginPath(); ctx.moveTo(-13, 0); ctx.quadraticCurveTo(-8 + k, -9, 0, -8 - k); ctx.quadraticCurveTo(9 - k, -9, 13, 0); ctx.closePath();
    ctx.fillStyle = GPAL.d2; ctx.fill(); ctx.fillStyle = GPAL.d3; ctx.fillRect(-6 + k, -8, 8, 2);
    ctx.fillStyle = GPAL.d1; ctx.fillRect(-9, -2, 2, 1); ctx.fillRect(5, -3 - k, 2, 1);
  }));
  return P;
};

// a wooden signpost with one line of instructions, the way the level teaches its moves
const SPAL = { out: PAL.out, w0: '#3a2618', w1: '#5a3d28', w2: '#7a5538', w3: '#9a7250', t: '#fff3c4' };
T.signSprite = function (text) {
  const w = T.textWidth(text, 1) + 8, h = 30;
  const c = canvas(w, h), x = c.getContext('2d');
  x.fillStyle = SPAL.w1; x.fillRect((w >> 1) - 1, 10, 3, 20);
  x.fillStyle = SPAL.w2; x.fillRect(0, 0, w, 11);
  x.fillStyle = SPAL.w3; x.fillRect(0, 0, w, 1);
  x.fillStyle = SPAL.w0; x.fillRect(0, 10, w, 1); x.fillRect(0, 0, 1, 11); x.fillRect(w - 1, 0, 1, 11);
  T.drawText(x, text, 4, 3, SPAL.t, 1, null);
  const out = pixelize(c, SPAL, PAL.out, CLUT.spr);
  out.ox = w >> 1; out.oy = h - 1;
  return out;
};

// the boss's health, as a sprite strip (no bitmap layer to draw it on)
const barCache = new Map();
T.bossBar = function (name, hp, max) {
  const key = name + hp + '/' + max;
  if (barCache.has(key)) return barCache.get(key);
  const w = 96, c = canvas(w + 4, 16), x = c.getContext('2d');
  T.drawText(x, name, 2, 0, '#ffd34a', 1, PAL.out);
  x.fillStyle = PAL.out; x.fillRect(1, 8, w + 2, 7);
  x.fillStyle = '#5a1a14'; x.fillRect(2, 9, w, 5);
  x.fillStyle = '#e04a2a'; x.fillRect(2, 9, Math.round(w * hp / max), 5);
  x.fillStyle = '#ff9a6a'; x.fillRect(2, 9, Math.round(w * hp / max), 1);
  const out = pixelize(c, { a: '#ffd34a', b: PAL.out, c: '#5a1a14', d: '#e04a2a', e: '#ff9a6a' }, null, CLUT.spr);
  barCache.set(key, out);
  return out;
};
})();
