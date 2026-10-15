// Texas Shitkickers — Doc Gila, the Gila monster card sharp: Ghost Town's boss, who runs the Last Chance saloon
// (story.md). A stocky lizard on his hind legs in a gambler's green eyeshade, white shirt with sleeve garters, black
// vest and string tie; beaded black-and-coral hide; a fan of cards. 64x64 like Two-Bit, facing right, origin at his
// feet. Also the card he flicks.
(function () {
'use strict';
const T = window.TSK;
const { PAL } = T;
const ell = (c, x, y, rx, ry) => { c.beginPath(); c.ellipse(x, y, rx, ry, 0, 0, Math.PI * 2); };

const GP = {
  out: PAL.out, k0: '#1a1214', k1: '#2e2024', c0: '#b8483a', c1: '#e07858', c2: '#f4a080',   // the hide: black, coral
  sh0: '#a8a8a0', sh1: '#e0dcd0', vest: '#16141c', vest2: '#2e2a38', vis: '#2a7a3a', vis2: '#5ac06a',
  tie: '#c8a040', garter: '#b02a24', card: '#f0ece0', cardR: '#c02a2a', cardK: '#1a1a1a', cardB: '#2a4a8a',
  eyeW: PAL.eyeW, pupil: PAL.pupil, mouth: PAL.mouth, teeth: PAL.teeth, star: '#ffd34a', tongue: '#3a2a4a',
};
const DB = { lean: 0, by: 0, legs: [0, 0], fa: 0.5, ba: 0.9, mouth: 0, eyes: 'smug', vis: 0, stars: -1, fan: true, crouch: 0 };

function beads(c, x, y, w, h, seed) {                               // the beaded hide: black blotches on coral
  c.fillStyle = GP.k0;
  for (let i = 0; i < 9; i++) { const s = (seed * 31 + i * 17) % 97; c.fillRect(x + (s % w), y + ((s * 7) % h), 2 + (s % 2), 2); }
}
function drawGila(c, o) {
  const p = Object.assign({}, DB, o);
  c.lineCap = 'round'; c.lineJoin = 'round';
  const limb = (pts, w, col) => {
    c.beginPath(); c.moveTo(pts[0][0], pts[0][1]); for (const q of pts.slice(1)) c.lineTo(q[0], q[1]);
    c.strokeStyle = GP.out; c.lineWidth = w + 2; c.stroke(); c.strokeStyle = col; c.lineWidth = w; c.stroke();
  };
  const leg = (ph, col) => {
    const s = Math.sin(ph);
    limb([[-2, -14 + p.crouch], [-2 + 3 * s, -7 + p.crouch * 0.5], [1 + 4 * s, -1]], 6, col);
    c.fillStyle = col; c.strokeStyle = GP.out; c.lineWidth = 1; ell(c, 4 + 4 * s, -1.4, 5.5, 2.2); c.fill(); c.stroke();
    c.fillStyle = GP.k0; c.fillRect(-4 + 3 * s, -10 + p.crouch * 0.6, 5, 2); c.fillRect(-1 + 4 * s, -5, 4, 2);
  };
  c.save(); c.translate(0, p.by + p.crouch);
  // the tail: thick and short, banded
  c.beginPath(); c.moveTo(-10, -18); c.quadraticCurveTo(-24, -14, -26, -3); c.lineTo(-18, -6); c.quadraticCurveTo(-14, -11, -8, -11); c.closePath();
  c.fillStyle = GP.c1; c.fill(); c.strokeStyle = GP.out; c.lineWidth = 1; c.stroke();
  c.fillStyle = GP.k0; for (const t of [[-15, -14], [-20, -11], [-24, -7]]) c.fillRect(t[0], t[1], 2, 5);
  leg(p.legs[1], GP.c0);
  c.save(); c.rotate(p.lean);
  // back arm
  const bs = [-7, -34], be = [bs[0] - 3 + Math.cos(p.ba + 1.6) * 8, bs[1] + 4 + Math.sin(p.ba + 1.6) * 8];
  limb([bs, be, [be[0] + Math.cos(p.ba) * 7, be[1] + Math.sin(p.ba) * 7]], 4.6, GP.sh0);
  // the body: shirt, then the vest over it, a paunch
  ell(c, -1, -27, 12, 15); c.fillStyle = GP.sh1; c.fill(); c.strokeStyle = GP.out; c.lineWidth = 1; c.stroke();
  c.save(); ell(c, -1, -27, 12, 15); c.clip();
  c.fillStyle = GP.vest; c.fillRect(-14, -44, 11, 34); c.fillRect(4, -44, 10, 34);
  c.fillStyle = GP.vest2; c.fillRect(-13, -42, 2, 30);
  c.fillStyle = GP.tie; c.fillRect(1, -41, 1, 10); c.fillRect(0, -32, 3, 2);
  c.fillStyle = GP.sh0; for (const y of [-34, -28, -22]) c.fillRect(-1, y, 1, 1);
  c.fillStyle = GP.c1; c.fillRect(-14, -14, 28, 6);                 // the belly of the hide below the shirt
  beads(c, -12, -14, 24, 5, 3);
  c.restore();
  // the head: broad and flat, a blunt snout, beads
  c.save(); c.translate(7, -44);
  ell(c, 1, 0, 9, 6); c.fillStyle = GP.c1; c.fill(); c.strokeStyle = GP.out; c.stroke();
  c.beginPath(); c.moveTo(2, -4); c.quadraticCurveTo(15, -4, 16, 1); c.quadraticCurveTo(15, 4.5, 4, 4.5); c.closePath();
  c.fillStyle = GP.k1; c.fill(); c.stroke();
  c.fillStyle = GP.c2; c.fillRect(-4, -4, 6, 1);
  beads(c, -6, -3, 10, 6, 7);
  if (p.mouth) {                                                    // the jaws: a Gila's bite
    c.beginPath(); c.moveTo(5, 2); c.lineTo(16, 1 - p.mouth); c.lineTo(16, 3 + p.mouth * 3); c.lineTo(5, 5); c.closePath();
    c.fillStyle = GP.mouth; c.fill(); c.stroke();
    c.fillStyle = GP.teeth; for (const tx of [8, 11, 14]) { c.fillRect(tx, 1, 1, 1.5); c.fillRect(tx - 1, 4 + p.mouth * 2, 1, 1.5); }
    c.fillStyle = GP.tongue; c.fillRect(13, 2 + p.mouth, 4, 1);
  } else { c.strokeStyle = GP.out; c.beginPath(); c.moveTo(5, 3); c.quadraticCurveTo(11, 4.5, 16, 2); c.stroke(); }
  if (p.eyes === 'x') { c.strokeStyle = GP.out; c.lineWidth = 1.1; c.beginPath(); c.moveTo(3, -3); c.lineTo(6, 0); c.moveTo(6, -3); c.lineTo(3, 0); c.stroke(); }
  else {
    ell(c, 4.6, -1.5, 1.9, 1.5); c.fillStyle = GP.eyeW; c.fill(); c.lineWidth = 0.8; c.strokeStyle = GP.out; c.stroke();
    c.fillStyle = GP.pupil;
    if (p.eyes === 'daze') { c.fillRect(3.8, -2, 1, 1); c.fillRect(5, -1.4, 1, 1); } else c.fillRect(5.2, -2, 1.2, 1.2);
    c.fillStyle = GP.c0;                                             // heavy lids: smug, or narrowed mean
    if (p.eyes === 'smug') c.fillRect(2.4, -3.4, 4.6, 1.6); else if (p.eyes === 'mad') { c.beginPath(); c.moveTo(2, -4); c.lineTo(7.4, -2.4); c.lineTo(7.4, -3.6); c.closePath(); c.fill(); }
  }
  // the green eyeshade, on a band
  c.save(); c.translate(0, -5 - p.vis); c.rotate(0.08 - p.vis * 0.1);
  c.fillStyle = GP.out; c.fillRect(-8, -1, 13, 3);
  c.fillStyle = GP.vis; c.beginPath(); c.moveTo(-2, -1); c.lineTo(13, 0.5); c.lineTo(12, 3); c.lineTo(-2, 2); c.closePath(); c.fill();
  c.strokeStyle = GP.out; c.lineWidth = 1; c.stroke();
  c.fillStyle = GP.vis2; c.fillRect(0, 0, 10, 1);
  c.restore();
  c.restore();   // head
  // the front arm: shirt sleeve with a red garter, a claw holding the fan of cards
  const fs = [6, -34], fe = [fs[0] + Math.cos(p.fa + 1.2) * 8, fs[1] + Math.sin(p.fa + 1.2) * 8];
  const fh = [fe[0] + Math.cos(p.fa) * 8, fe[1] + Math.sin(p.fa) * 8];
  limb([fs, fe], 5, GP.sh1); limb([fe, fh], 4.4, GP.c1);
  c.fillStyle = GP.garter; c.fillRect(fe[0] - 2, fe[1] - 2, 4, 3);
  if (p.fan) {                                                     // the fan: four cards spread
    for (let k = 0; k < 4; k++) {
      c.save(); c.translate(fh[0], fh[1]); c.rotate(p.fa - 0.9 + k * 0.3);
      c.fillStyle = GP.out; c.fillRect(-1, -11, 7, 10); c.fillStyle = GP.card; c.fillRect(0, -10, 5, 8);
      c.fillStyle = k % 2 ? GP.cardK : GP.cardR; c.fillRect(1, -9, 1, 2); c.fillRect(3, -5, 1, 2);
      c.restore();
    }
  }
  ell(c, fh[0], fh[1], 2.4, 2.2); c.fillStyle = GP.c1; c.fill(); c.strokeStyle = GP.out; c.lineWidth = 1; c.stroke();
  c.restore();   // lean
  leg(p.legs[0], GP.c1);
  c.restore();
  if (p.stars >= 0) for (let i = 0; i < 3; i++) {
    const a = p.stars + i * Math.PI * 2 / 3, x = 6 + Math.cos(a) * 11, y = -60 + Math.sin(a) * 3;
    c.fillStyle = GP.star; c.fillRect(x - 2, y - 0.5, 4, 1); c.fillRect(x - 0.5, y - 2, 1, 4);
  }
}

T.buildGila = function () {
  const B = T.BOSS;
  const bake = fn => { const cv = T.canvas(B.FW, B.FH), x = cv.getContext('2d'); x.translate(B.OX, B.OY); fn(x); return T.pixelize(cv, GP, GP.out, T.CLUT.spr); };
  const mk = o => bake(x => drawGila(x, o));
  const TAU = Math.PI * 2;
  // the card in flight, spinning (4 frames: face, edge, back, edge)
  const card = [0, 1, 2, 3].map(k => {
    const cv = T.canvas(12, 12), x = cv.getContext('2d'), w = [7, 2, 7, 2][k];
    x.fillStyle = GP.out; x.fillRect(6 - w / 2 - 1, 1, w + 2, 10);
    x.fillStyle = k === 2 ? GP.cardB : GP.card; x.fillRect(6 - w / 2, 2, w, 8);
    if (k === 0) { x.fillStyle = GP.cardR; x.fillRect(4, 3, 1, 2); x.fillRect(7, 7, 1, 2); }
    const o = T.pixelize(cv, GP, GP.out, T.CLUT.spr); o.ox = 6; o.oy = 6; return o;
  });
  return {
    idle: [mk({}), mk({ by: 0.8, fa: 0.6 })],
    walk: [0, 1, 2, 3].map(i => mk({ legs: [i / 4 * TAU, i / 4 * TAU + Math.PI], by: -Math.abs(Math.sin(i / 4 * TAU)) * 1.2, fa: 0.4 + Math.sin(i / 4 * TAU) * 0.2 })),
    talk: [mk({ mouth: 1, eyes: 'smug' }), mk({ mouth: 0.3, by: 0.5 })],
    deal: mk({ lean: -0.15, fa: -2.3, ba: -1.4, eyes: 'mad' }),               // winding up a throw, the fan over his shoulder
    flick: mk({ lean: 0.2, fa: 0.1, ba: 0.6, eyes: 'mad', fan: false, legs: [0.6, -0.5] }),
    jaws: mk({ lean: 0.1, fa: 1.4, ba: 1.6, mouth: 0.4, eyes: 'mad', crouch: 2 }),   // the bite's wind-up
    bite: mk({ lean: 0.45, fa: 1.0, ba: 0.4, mouth: 2, eyes: 'mad', legs: [0.9, -0.7] }),
    duck: mk({ crouch: 14, lean: 0.2, fa: -1.7, ba: -1.2, eyes: 'mad', vis: 1 }),   // behind the table, peeking
    hurt: mk({ lean: -0.3, eyes: 'x', mouth: 1, fa: -1, fan: false, vis: 3 }),
    daze: [0, 1, 2, 3].map(i => mk({ eyes: 'daze', lean: -0.12 + (i % 2) * 0.08, fa: 1.2, mouth: 0.4, stars: i / 4 * TAU / 3, vis: 2, fan: false })),
    ko: mk({ lean: -0.6, eyes: 'x', mouth: 1.5, fa: -2, ba: -2, vis: 7, fan: false, legs: [1.2, -1.2] }),
    card,
  };
};
})();
