// Texas Shitkickers — Big Shell Dillon, the giant armadillo: boss of the Outlaw Dillos, Main Street's boss
// (story.md: "He curls up and rolls like a boulder, so kick the shell back at him").
// A burly armadillo outlaw on his hind legs: a banded shell for a body, a long snout with a cigar, a black hat with
// a silver band, heavy claws. Curled up he's a boulder. Facing right, origin at his feet, 64x64 like Two-Bit.
(function () {
'use strict';
const T = window.TSK;
const { PAL } = T;
const ell = (c, x, y, rx, ry, r) => { c.beginPath(); c.ellipse(x, y, rx, ry, r || 0, 0, Math.PI * 2); };

const DBP = {
  out: PAL.out, s0: '#4e4436', s1: '#7a6a55', s2: '#a4927a', s3: '#c9b898',         // the shell
  k0: '#8a5648', k1: '#b87e6c', k2: '#dba894',                                      // the skin
  h0: '#16141a', h1: '#2c2832', band: '#b8bcc8', cig: '#6a4424', ash: '#d8d0c0', ember: '#ff8a3c',
  eyeW: PAL.eyeW, pupil: PAL.pupil, mouth: PAL.mouth, teeth: PAL.teeth, scar: '#e8d6b8', star: '#ffd34a',
};
const DB = { lean: 0, by: 0, legs: [0, 0], fa: 0.6, ba: 0.9, mouth: 0, eyes: 'mad', hat: 0, stars: -1, claw: 0 };

function drawDillon(c, o) {
  const p = Object.assign({}, DB, o);
  c.lineCap = 'round'; c.lineJoin = 'round';
  const limb = (pts, w, col) => {
    c.beginPath(); c.moveTo(pts[0][0], pts[0][1]); for (const q of pts.slice(1)) c.lineTo(q[0], q[1]);
    c.strokeStyle = DBP.out; c.lineWidth = w + 2; c.stroke(); c.strokeStyle = col; c.lineWidth = w; c.stroke();
  };
  const claws = (x, y, a, n = 3) => {
    c.strokeStyle = DBP.ash; c.lineWidth = 1.2;
    for (let k = 0; k < n; k++) { const t = a + (k - 1) * 0.35; c.beginPath(); c.moveTo(x, y); c.lineTo(x + Math.cos(t) * 5, y + Math.sin(t) * 5); c.stroke(); }
  };
  const leg = (ph, col) => {
    const s = Math.sin(ph);
    limb([[-2, -14], [-1 + 3 * s, -7], [1 + 4 * s, -1]], 5.5, col);
    c.fillStyle = col; c.strokeStyle = DBP.out; c.lineWidth = 1;
    c.beginPath(); c.ellipse(4 + 4 * s, -1.2, 5, 2.2, 0, 0, Math.PI * 2); c.fill(); c.stroke();
    claws(8 + 4 * s, -1, 0.1);
  };
  c.save(); c.translate(0, p.by);
  // the tail: armoured, pointing back and down
  c.beginPath(); c.moveTo(-12, -16); c.quadraticCurveTo(-24, -14, -28, -4); c.lineTo(-22, -9); c.quadraticCurveTo(-16, -11, -10, -10); c.closePath();
  c.fillStyle = DBP.s1; c.fill(); c.strokeStyle = DBP.out; c.lineWidth = 1; c.stroke();
  for (const x of [-15, -19, -23]) { c.strokeStyle = DBP.s0; c.beginPath(); c.moveTo(x, -15 + (x + 15) * 0.3); c.lineTo(x + 1, -10 + (x + 15) * 0.1); c.stroke(); }
  leg(p.legs[1], DBP.k0);
  c.save(); c.rotate(p.lean);
  // back arm
  const bs = [-6, -34], be = [bs[0] - 3 + Math.cos(p.ba + 1.6) * 9, bs[1] + 4 + Math.sin(p.ba + 1.6) * 9];
  limb([bs, be, [be[0] + Math.cos(p.ba) * 8, be[1] + Math.sin(p.ba) * 8]], 4.4, DBP.k0);
  // the body: a big banded shell, a paler belly plate in front
  ell(c, -1, -27, 14, 17); c.fillStyle = DBP.s1; c.fill();
  c.save(); ell(c, -1, -27, 14, 17); c.clip();
  c.fillStyle = DBP.s2; c.fillRect(-16, -45, 30, 6);
  c.fillStyle = DBP.s3; c.fillRect(-9, -44, 9, 2);
  c.strokeStyle = DBP.s0; c.lineWidth = 1.4;
  for (const y of [-38, -32, -26, -20, -14]) { c.beginPath(); c.moveTo(-16, y); c.quadraticCurveTo(-2, y + 3, 14, y - 1); c.stroke(); }
  c.fillStyle = DBP.k1; ell(c, 9, -24, 6, 12); c.fill();                                    // the belly
  c.strokeStyle = DBP.k0; c.lineWidth = 1; for (const y of [-31, -25, -19]) { c.beginPath(); c.moveTo(4, y); c.lineTo(13, y); c.stroke(); }
  c.fillStyle = DBP.scar; c.fillRect(-9, -30, 6, 1.2); c.fillRect(-7, -32, 1.2, 5);          // an old scar
  c.restore();
  ell(c, -1, -27, 14, 17); c.strokeStyle = DBP.out; c.lineWidth = 1; c.stroke();
  // the head: small on that body, a long snout to the right, pointed ears
  c.save(); c.translate(8, -44);
  c.beginPath(); c.moveTo(-4, -4); c.lineTo(-6, -12); c.lineTo(-1, -6); c.closePath(); c.fillStyle = DBP.k0; c.fill(); c.stroke();
  c.beginPath(); c.moveTo(0, -5); c.lineTo(1, -13); c.lineTo(3, -5); c.closePath(); c.fillStyle = DBP.k1; c.fill(); c.stroke();
  ell(c, 0, 0, 7, 6); c.fillStyle = DBP.k1; c.fill(); c.stroke();
  c.beginPath(); c.moveTo(4, -3); c.lineTo(17, 0); c.quadraticCurveTo(18.6, 2.4, 16.4, 3.4); c.lineTo(4, 4.4); c.closePath();
  c.fillStyle = DBP.k2; c.fill(); c.stroke();
  ell(c, 17, 1.2, 1.6, 1.4); c.fillStyle = DBP.out; c.fill();
  if (p.mouth) {
    c.beginPath(); c.moveTo(6, 3); c.lineTo(15.6, 3); c.lineTo(13, 3 + 3 * p.mouth); c.lineTo(6.6, 5 + p.mouth); c.closePath();
    c.fillStyle = DBP.mouth; c.fill(); c.stroke();
    c.fillStyle = DBP.teeth; c.fillRect(8, 3, 1, 1.2); c.fillRect(11, 3, 1, 1.2);
  } else {
    // the cigar, clamped in the corner of the mouth, smouldering
    c.strokeStyle = DBP.out; c.beginPath(); c.moveTo(6, 3.6); c.lineTo(14, 3); c.stroke();
    c.fillStyle = DBP.cig; c.beginPath(); c.moveTo(12, 3.4); c.lineTo(21, 5.4); c.lineTo(20.6, 7); c.lineTo(11.6, 5); c.closePath(); c.fill(); c.stroke();
    c.fillStyle = DBP.ember; c.fillRect(20.6, 5, 1.6, 2); c.fillStyle = DBP.ash; c.fillRect(22.2, 4.4, 1, 1);
  }
  if (p.eyes === 'x') {
    c.strokeStyle = DBP.out; c.lineWidth = 1.1; c.beginPath(); c.moveTo(3, -3); c.lineTo(6, 0); c.moveTo(6, -3); c.lineTo(3, 0); c.stroke();
  } else {
    ell(c, 4.6, -1.6, 1.9, 1.7); c.fillStyle = DBP.eyeW; c.fill(); c.lineWidth = 0.8; c.strokeStyle = DBP.out; c.stroke();
    c.fillStyle = DBP.pupil;
    if (p.eyes === 'daze') { c.fillRect(3.8, -2.2, 1, 1); c.fillRect(5, -1.4, 1, 1); } else c.fillRect(5, -2.4, 1.3, 1.6);
    if (p.eyes === 'mad') { c.lineWidth = 1.4; c.beginPath(); c.moveTo(2, -4.6); c.lineTo(7, -3); c.stroke(); }
  }
  // the hat: a black outlaw's flat brim, a silver band
  c.save(); c.translate(-1, -5 - p.hat); c.rotate(-0.12 - p.hat * 0.05);
  c.fillStyle = DBP.h1; c.beginPath(); c.moveTo(-5.4, 0); c.lineTo(-4.6, -6.4); c.quadraticCurveTo(0, -8.4, 4.6, -6.4); c.lineTo(5.4, 0); c.closePath(); c.fill();
  c.strokeStyle = DBP.out; c.lineWidth = 1; c.stroke();
  c.fillStyle = DBP.band; c.fillRect(-5, -2.2, 10, 1.6);
  c.fillStyle = DBP.h0; c.beginPath(); c.moveTo(-10, 0.4); c.lineTo(10, -0.4); c.lineTo(10, 1.6); c.lineTo(-10, 2.2); c.closePath(); c.fill(); c.stroke();
  c.restore();
  c.restore();   // head
  // front arm and its claws
  const fs = [7, -33], fe = [fs[0] + Math.cos(p.fa + 1.2) * 9, fs[1] + Math.sin(p.fa + 1.2) * 9];
  const fh = [fe[0] + Math.cos(p.fa) * 9, fe[1] + Math.sin(p.fa) * 9];
  limb([fs, fe, fh], 5, DBP.k1);
  ell(c, fh[0], fh[1], 3, 2.6); c.fillStyle = DBP.k2; c.fill(); c.strokeStyle = DBP.out; c.lineWidth = 1; c.stroke();
  claws(fh[0] + Math.cos(p.fa) * 2, fh[1] + Math.sin(p.fa) * 2, p.fa, 3);
  if (p.claw) {                                     // the swipe's smear
    c.strokeStyle = DBP.ash; c.lineWidth = 1;
    for (const r of [13, 16, 19]) { c.beginPath(); c.arc(fs[0], fs[1], r, p.fa - 0.9, p.fa + 0.2); c.stroke(); }
  }
  c.restore();   // lean
  leg(p.legs[0], DBP.k1);
  c.restore();
  if (p.stars >= 0) for (let i = 0; i < 3; i++) {
    const a = p.stars + i * Math.PI * 2 / 3, x = 6 + Math.cos(a) * 11, y = -60 + Math.sin(a) * 3;
    c.fillStyle = DBP.star; c.fillRect(x - 2, y - 0.5, 4, 1); c.fillRect(x - 0.5, y - 2, 1, 4);
  }
}

// curled up: a boulder of shell, rolling (frame k of 8)
function drawBall(c, k) {
  c.save(); c.translate(0, -18); c.rotate(k * Math.PI / 4);
  ell(c, 0, 0, 17, 17); c.fillStyle = DBP.s1; c.fill();
  c.save(); ell(c, 0, 0, 17, 17); c.clip();
  c.fillStyle = DBP.s2; c.fillRect(-18, -18, 18, 9);
  c.strokeStyle = DBP.s0; c.lineWidth = 1.6;
  for (const x of [-11, -5, 1, 7, 13]) { c.beginPath(); c.moveTo(x, -19); c.quadraticCurveTo(x + 4, 0, x, 19); c.stroke(); }
  c.fillStyle = DBP.scar; c.fillRect(-8, 4, 6, 1.4);
  c.restore();
  ell(c, 0, 0, 17, 17); c.strokeStyle = DBP.out; c.lineWidth = 1; c.stroke();
  c.fillStyle = DBP.k0; ell(c, 13, 6, 3, 2.4); c.fill(); c.stroke();               // the tip of the tail, tucked in
  c.restore();
}

T.buildDillon = function () {
  const B = T.BOSS;
  const bake = fn => { const cv = T.canvas(B.FW, B.FH), x = cv.getContext('2d'); x.translate(B.OX, B.OY); fn(x); return T.pixelize(cv, DBP, DBP.out, T.CLUT.spr); };
  const mk = o => bake(x => drawDillon(x, o));
  const TAU = Math.PI * 2;
  return {
    idle: [mk({}), mk({ by: 0.8, fa: 0.7 })],
    walk: [0, 1, 2, 3].map(i => mk({ legs: [i / 4 * TAU, i / 4 * TAU + Math.PI], by: -Math.abs(Math.sin(i / 4 * TAU)) * 1.2, fa: 0.5 + Math.sin(i / 4 * TAU) * 0.3 })),
    talk: [mk({ mouth: 1 }), mk({ mouth: 0.4, by: 0.5 })],
    windup: mk({ lean: -0.2, fa: -2.2, ba: -1.8, mouth: 0.6 }),
    swipe: mk({ lean: 0.25, fa: 0.4, ba: 0.6, mouth: 1, claw: 1, legs: [0.7, -0.6] }),
    curl: mk({ lean: 0.5, fa: 1.8, ba: 1.6, by: 6, hat: 2, eyes: 'mad' }),
    ball: [0, 1, 2, 3, 4, 5, 6, 7].map(k => bake(x => drawBall(x, k))),
    hurt: mk({ lean: -0.3, eyes: 'x', mouth: 1, fa: -1, hat: 3 }),
    daze: [0, 1, 2, 3].map(i => mk({ eyes: 'daze', lean: -0.12 + (i % 2) * 0.08, fa: 1.2, mouth: 0.4, stars: i / 4 * TAU / 3, hat: 2 })),
    ko: mk({ lean: -0.6, eyes: 'x', mouth: 1, fa: -2, ba: -2, hat: 7, legs: [1.2, -1.2] }),
  };
};
})();
