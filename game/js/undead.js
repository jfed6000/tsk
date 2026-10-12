// Texas Shitkickers — the undead posse: skeleton gunslingers, plus the Boot Hill graveyard for the brawler.
// Same method as the rest: vector drawing at 1:1, pixelized into the sprite or tile CLUT.
(function () {
'use strict';
const T = window.TSK;
const { PAL, CLUT } = T;
function ell(x, cx, cy, rx, ry, rot) { x.beginPath(); x.ellipse(cx, cy, rx, ry, rot || 0, 0, Math.PI * 2); }
function rng(seed) { return () => (seed = (seed * 16807) % 2147483647) / 2147483647; }
const bake = (w, h, ox, oy, pal, fn, outline = PAL.out) => {
  const c = T.canvas(w, h), x = c.getContext('2d'); x.translate(ox, oy); fn(x);
  const o = T.pixelize(c, pal, outline, CLUT.spr); o.ox = ox; o.oy = oy; return o;
};

// ---------------------------------------------------------------- the skeleton gunslinger
// A dead man in a tattered duster and a bullet-holed hat, red light in the eye sockets, a six-shooter in a bony
// hand. Facing right, origin at the feet, about as tall as the coyotes.
const SKP = {
  out: PAL.out, b0: '#6e6656', b1: '#aaa08a', b2: '#ddd4bc', b3: '#f6f0dc',
  c0: '#17141c', c1: '#272230', c2: '#3a3346', c3: '#4e4560',
  h0: '#100e14', h1: '#24202a', band: '#5a4632', eye: '#ff3a2a', eye2: '#ffb040',
  g0: '#34343e', g1: '#5e5e6c', g2: '#8a8a9a', sock: '#0a0608', flash0: '#ffe08a', flash1: '#fff6d6',
};
const SB = { legs: [0, 0], lean: 0, by: 0, aim: [16, -27], arm2: [-6, -20], skull: true, jaw: 0, coat: 0, flash: false, eyes: 'glow', hat: 0, gun: true };

function twoBone(sx, sy, tx, ty, L) {      // a quick IK for the bony arms
  let dx = tx - sx, dy = ty - sy, d = Math.hypot(dx, dy);
  if (d > 2 * L - 0.01) { dx *= (2 * L - 0.01) / d; dy *= (2 * L - 0.01) / d; d = 2 * L - 0.01; }
  const base = Math.atan2(dy, dx), a = Math.acos(Math.min(1, d / (2 * L)));
  return [[sx, sy], [sx + Math.cos(base + a) * L, sy + Math.sin(base + a) * L], [sx + dx, sy + dy]];
}
function bone(ctx, pts, w = 1.8) {
  ctx.lineCap = 'round'; ctx.lineJoin = 'round';
  ctx.beginPath(); ctx.moveTo(pts[0][0], pts[0][1]); for (const q of pts.slice(1)) ctx.lineTo(q[0], q[1]);
  ctx.strokeStyle = SKP.out; ctx.lineWidth = w + 1.8; ctx.stroke();
  ctx.strokeStyle = SKP.b2; ctx.lineWidth = w; ctx.stroke();
  ctx.fillStyle = SKP.b3; for (const q of pts.slice(1, -1)) ctx.fillRect(q[0] - 0.8, q[1] - 0.8, 1.6, 1.6);   // knobbly joints
}
function drawSkull(ctx, x, y, o) {
  ell(ctx, x, y, 5.6, 5); ctx.fillStyle = SKP.b2; ctx.fill(); ctx.strokeStyle = SKP.out; ctx.lineWidth = 1; ctx.stroke();
  ell(ctx, x - 1.6, y - 1.8, 2.4, 1.6); ctx.fillStyle = SKP.b3; ctx.fill();
  ctx.beginPath(); ctx.moveTo(x - 1, y + 2.4); ctx.lineTo(x + 6, y + 2); ctx.lineTo(x + 5.2, y + 5.2 + (o.jaw || 0) * 2); ctx.lineTo(x - 0.6, y + 5.4 + (o.jaw || 0) * 2); ctx.closePath();
  ctx.fillStyle = SKP.b1; ctx.fill(); ctx.stroke();                                            // jaw
  ctx.fillStyle = SKP.out; for (const tx of [1, 2.8, 4.4]) ctx.fillRect(x + tx, y + 2.8, 0.7, 1.6);    // teeth
  ell(ctx, x + 2.6, y - 0.4, 1.9, 1.7); ctx.fillStyle = SKP.sock; ctx.fill();                  // eye socket (near)
  ell(ctx, x + 5.2, y - 0.4, 0.9, 1.5); ctx.fill();                                            // the far one, round the front
  ctx.fillRect(x + 5.4, y + 1, 1, 1.2);                                                        // nose hole
  if (o.eyes === 'glow') { ctx.fillStyle = SKP.eye; ctx.fillRect(x + 2.2, y - 1, 1.4, 1.4); ctx.fillRect(x + 5, y - 0.8, 0.8, 1); }
  if (o.eyes === 'flare') { ctx.fillStyle = SKP.eye2; ctx.fillRect(x + 1.6, y - 1.6, 2.4, 2.4); ctx.fillStyle = SKP.eye; ctx.fillRect(x + 4.8, y - 1.2, 1.2, 1.6); }
}
function drawHatS(ctx, x, y) {
  ctx.fillStyle = SKP.h1; ctx.beginPath(); ctx.moveTo(x - 4, y); ctx.lineTo(x - 3.4, y - 6); ctx.quadraticCurveTo(x + 1, y - 4.6, x + 5, y - 6.4); ctx.lineTo(x + 5.6, y); ctx.closePath();
  ctx.fill(); ctx.strokeStyle = SKP.out; ctx.lineWidth = 1; ctx.stroke();
  ctx.fillStyle = SKP.band; ctx.fillRect(x - 3.8, y - 1.8, 9.2, 1.4);
  ctx.fillStyle = SKP.c3; ctx.fillRect(x + 2, y - 4.4, 1, 1);                                  // the bullet hole
  ctx.fillStyle = SKP.h0; ctx.beginPath(); ctx.moveTo(x - 9, y + 0.6); ctx.quadraticCurveTo(x + 1, y + 2.4, x + 11, y - 0.4);
  ctx.lineTo(x + 11, y + 1.2); ctx.quadraticCurveTo(x + 1, y + 4, x - 9, y + 2.2); ctx.closePath(); ctx.fill(); ctx.stroke();
}
function drawGunS(ctx, x, y, a, flash) {
  ctx.save(); ctx.translate(x, y); ctx.rotate(a);
  ctx.strokeStyle = SKP.out; ctx.lineWidth = 0.9;
  ctx.beginPath(); ctx.moveTo(-1.4, 0); ctx.lineTo(-3.4, 4.2); ctx.lineTo(-0.6, 4.8); ctx.lineTo(1, 0.4); ctx.closePath(); ctx.fillStyle = SKP.band; ctx.fill(); ctx.stroke();
  ctx.beginPath(); ctx.rect(-1.4, -2.6, 4, 3.4); ctx.fillStyle = SKP.g1; ctx.fill(); ctx.stroke();
  ctx.beginPath(); ctx.rect(2.2, -2, 8, 2); ctx.fillStyle = SKP.g1; ctx.fill(); ctx.stroke();
  ctx.fillStyle = SKP.g2; ctx.fillRect(2.4, -2, 7.4, 0.7);
  if (flash) {
    ctx.fillStyle = SKP.flash0; ctx.beginPath(); ctx.moveTo(10, -1); ctx.lineTo(18, -5); ctx.lineTo(16, -1); ctx.lineTo(18, 3); ctx.closePath(); ctx.fill();
    ctx.fillStyle = SKP.flash1; ctx.fillRect(10, -2, 5, 2);
  }
  ctx.restore();
}
function drawSkeleton(ctx, o) {
  const p = Object.assign({}, SB, o);
  ctx.save(); ctx.translate(0, p.by);
  // legs: bare bones below the coat, bony feet
  for (const [ph, back] of [[p.legs[1], true], [p.legs[0], false]]) {
    const s = Math.sin(ph), c = Math.cos(ph);
    const hip = [back ? -1 : 1, -15], knee = [hip[0] + 3 * s, -8 - 1.5 * Math.max(0, c)], foot = [hip[0] + 5 * s, -1 - 2 * Math.max(0, -c)];
    bone(ctx, [hip, knee, foot], back ? 1.5 : 1.8);
    ctx.fillStyle = back ? SKP.b1 : SKP.b2; ctx.strokeStyle = SKP.out; ctx.lineWidth = 0.8;
    ctx.beginPath(); ctx.moveTo(foot[0] - 1.6, foot[1]); ctx.lineTo(foot[0] + 4, foot[1] + 0.6); ctx.lineTo(foot[0] + 3.6, foot[1] + 1.8); ctx.lineTo(foot[0] - 1.6, foot[1] + 1.6); ctx.closePath(); ctx.fill(); ctx.stroke();
  }
  ctx.save(); ctx.rotate(p.lean);
  if (p.arm2) bone(ctx, twoBone(-3, -32, p.arm2[0], p.arm2[1], 6.5), 1.5);                     // back arm
  // the duster: tattered hem that streams back, open at the front to show the ribs
  ctx.beginPath(); ctx.moveTo(-7, -35); ctx.lineTo(6, -35); ctx.lineTo(8, -13);
  const hem = [[8, -13], [5, -10], [3, -13], [0, -9.5], [-3, -12.6], [-6, -9 - p.coat], [-9, -12 - p.coat], [-12 - p.coat * 2, -10 - p.coat]];
  for (const q of hem) ctx.lineTo(q[0], q[1]);
  ctx.closePath(); ctx.fillStyle = SKP.c1; ctx.fill(); ctx.strokeStyle = SKP.out; ctx.lineWidth = 1; ctx.stroke();
  ctx.save(); ctx.clip();
  ctx.fillStyle = SKP.c2; ctx.fillRect(-8, -35, 4, 24);
  ctx.fillStyle = SKP.c0; ctx.fillRect(4, -35, 6, 24);
  ctx.restore();
  ctx.fillStyle = SKP.c0; ctx.fillRect(-1, -33, 5.4, 15);                                       // the opening
  ctx.fillStyle = SKP.b1; ctx.fillRect(0.6, -33, 1.2, 15);                                      // spine
  ctx.fillStyle = SKP.b2; for (let i = 0; i < 4; i++) ctx.fillRect(1.6, -31 + i * 3.2, 2.8 - i * 0.3, 1);   // ribs
  ctx.fillStyle = SKP.c3; ctx.fillRect(-7, -35, 13, 1.4);                                       // collar
  // front arm and the six-shooter
  if (p.gun || p.aim) {
    const pts = twoBone(4, -32, p.aim[0], p.aim[1], 6.5);
    bone(ctx, pts, 1.8);
    if (p.gun) drawGunS(ctx, pts[2][0], pts[2][1], Math.atan2(p.aim[1] + 27, p.aim[0] - 4) * 0.3 + (p.gunA || 0), p.flash);
  }
  // the head
  if (p.skull) {
    bone(ctx, [[1, -35], [1.6, -38]], 1.6);                                                     // neck
    drawSkull(ctx, 1.6, -43, p);
    if (p.hat !== false) drawHatS(ctx, 1.4, -47.6 - (p.hat || 0));
  } else {                                                                                     // headless: a stump
    ctx.fillStyle = SKP.b1; ctx.fillRect(0.4, -38, 2, 3); ctx.strokeStyle = SKP.out; ctx.strokeRect(0.4, -38, 2, 3);
  }
  ctx.restore();
  ctx.restore();
}

T.SKEL = { FW: 64, FH: 64, OX: 26, OY: 60 };
T.buildSkeleton = function () {
  const S = T.SKEL, mk = o => bake(S.FW, S.FH, S.OX, S.OY, SKP, ctx => drawSkeleton(ctx, o));
  const TAU = Math.PI * 2;
  const F = {
    idle: [mk({ aim: [12, -22] }), mk({ aim: [12, -21.4], by: 0.5, coat: 0.6 })],
    walk: [0, 1, 2, 3].map(i => mk({ legs: [i / 4 * TAU, i / 4 * TAU + Math.PI], aim: [12, -22 + (i % 2)], coat: 1 + (i % 2), by: -Math.abs(Math.sin(i / 4 * TAU)) })),
    aim: mk({ aim: [18, -29], arm2: [-2, -24], eyes: 'flare', lean: -0.05 }),
    shoot: mk({ aim: [17, -31], arm2: [-2, -24], flash: true, gunA: -0.3, lean: -0.1, jaw: 1 }),
    reload: [mk({ aim: [7, -26], arm2: [6, -24], gunA: -1.2 }), mk({ aim: [7, -25], arm2: [7, -27], gunA: -1.2, jaw: 0.6 })],
    hurt: mk({ lean: -0.3, aim: [10, -38], arm2: [-10, -36], jaw: 1, hat: 3, coat: 2 }),
    headless: [mk({ skull: false, aim: [12, -40], arm2: [-10, -38], gun: false, lean: 0.1, legs: [0.6, -0.6] }),
      mk({ skull: false, aim: [14, -34], arm2: [-12, -40], gun: false, lean: -0.1, legs: [-0.6, 0.6] })],
  };
  // knocked down: a heap of bones under the coat and hat (it reassembles by rising back up)
  F.heap = bake(S.FW, S.FH, S.OX, S.OY, SKP, ctx => {
    ctx.fillStyle = SKP.c1; ctx.beginPath(); ctx.moveTo(-14, 0); ctx.quadraticCurveTo(-4, -9, 10, -4); ctx.lineTo(14, 0); ctx.closePath(); ctx.fill();
    ctx.strokeStyle = SKP.out; ctx.lineWidth = 1; ctx.stroke();
    for (const [x0, y0, x1, y1] of [[-12, -1, -3, -4], [2, -2, 11, -1], [-6, -6, 2, -3]]) bone(ctx, [[x0, y0], [x1, y1]], 1.6);
    drawSkull(ctx, 6, -9, { eyes: 'off' });
    drawHatS(ctx, -6, -6);
  });
  // rising up out of the ground (or a heap): the standing skeleton, clipped at the ground line
  F.rise = [44, 33, 22, 12, 4].map((d, i) => {
    const c = T.canvas(S.FW, S.FH), x = c.getContext('2d');
    x.translate(S.OX, S.OY); x.beginPath(); x.rect(-S.OX, -S.OY, S.FW, S.OY - 1); x.clip(); x.translate(0, d);
    drawSkeleton(x, { aim: [12, -40 + (i % 2) * 4], arm2: [-10, -38 + ((i + 1) % 2) * 4], eyes: i > 2 ? 'glow' : 'off', gun: i > 2, jaw: i % 2 });
    const o = T.pixelize(c, SKP, PAL.out, CLUT.spr); o.ox = S.OX; o.oy = S.OY; return o;
  });
  // the skull on its own, tumbling (pre-rotated), the hat, and a few loose bones
  F.skull = [0, 1, 2, 3].map(i => bake(16, 16, 8, 8, SKP, ctx => { ctx.rotate(i * Math.PI / 2); drawSkull(ctx, -1.6, 0, { eyes: 'glow' }); }));
  F.hat = bake(24, 16, 12, 12, SKP, ctx => drawHatS(ctx, 0, 0));
  F.bones = [0, 1, 2].map(i => bake(12, 12, 6, 6, SKP, ctx => {
    if (i === 2) { ctx.strokeStyle = SKP.b2; ctx.lineWidth = 1.2; ctx.beginPath(); ctx.arc(0, 2, 4, Math.PI, 0); ctx.stroke(); return; }   // a rib
    ctx.rotate(i * 1.1); bone(ctx, [[-4, 0], [4, 0]], 1.4);
    ctx.fillStyle = SKP.b3; ctx.fillRect(-5, -1.4, 2, 2.8); ctx.fillRect(3, -1.4, 2, 2.8);
  }, null));
  F.bullet = bake(8, 8, 4, 4, SKP, ctx => { ctx.fillStyle = SKP.eye; ctx.fillRect(-4, -0.6, 7, 1.4); ctx.fillStyle = SKP.eye2; ctx.fillRect(1, -1, 2.6, 2.4); }, null);
  return F;
};

// ---------------------------------------------------------------- Boot Hill for the brawler: the graveyard street
// One layer that scrolls with the floor: an iron fence and rows of headstones and crosses behind, a dead tree, and
// the grave dirt you fight on, with fresh mounds where the dead come up.
T.buildGraveyardStreet = function (VW, VH, FLOOR) {
  const r = rng(77), W = 960, c = T.canvas(W, VH), s = c.getContext('2d');
  const C = {
    out: PAL.out, g0: '#4a5068', g1: '#6f7690', g2: '#9aa1b8', moss: '#4f6a48', iron: '#1a1626', iron2: '#2e2840',
    wood: '#4a3424', wood2: '#6a4c34', d0: '#241d33', d1: '#2e2640', d2: '#3d3354', d3: '#4f4468', d4: '#6c5f88', grass: '#3e4a3a', tree: '#151029',
  };
  const BACK = FLOOR - 4;
  // the fence along the back
  s.fillStyle = C.iron; s.fillRect(0, BACK - 34, W, 2); s.fillRect(0, BACK - 12, W, 2);
  for (let x = 2; x < W; x += 7) { s.fillRect(x, BACK - 40, 2, 40); s.fillStyle = C.iron2; s.fillRect(x, BACK - 42, 2, 2); s.fillStyle = C.iron; }
  // a dead tree
  s.strokeStyle = C.tree; s.lineCap = 'round';
  const branch = (x, y, a, len, w) => { if (len < 3) return; const x2 = x + Math.cos(a) * len, y2 = y + Math.sin(a) * len; s.lineWidth = w; s.beginPath(); s.moveTo(x, y); s.lineTo(x2, y2); s.stroke(); branch(x2, y2, a - 0.5 - r() * 0.3, len * 0.68, Math.max(1, w * 0.7)); branch(x2, y2, a + 0.45 + r() * 0.3, len * 0.62, Math.max(1, w * 0.7)); };
  branch(610, BACK, -Math.PI / 2 - 0.08, 34, 5);
  // rows of markers in front of the fence
  for (let x = 6; x < W - 16; x += 22 + ((r() * 18) | 0)) {
    const k = r(), y = BACK - (r() * 4 | 0);
    if (Math.abs(x - 610) < 18) continue;
    if (k < 0.5) {                                              // headstone
      const h = 14 + (r() * 10 | 0), w = 10 + (r() * 4 | 0);
      s.fillStyle = C.g1; s.beginPath(); s.moveTo(x, y); s.lineTo(x, y - h + 4); s.quadraticCurveTo(x + w / 2, y - h - 2, x + w, y - h + 4); s.lineTo(x + w, y); s.fill();
      s.fillStyle = C.g2; s.fillRect(x + 1, y - h + 4, 2, h - 4); s.fillStyle = C.g0; s.fillRect(x + w - 2, y - h + 4, 2, h - 4);
      s.fillStyle = C.moss; s.fillRect(x, y - 2, w * 0.6, 2);
      s.strokeStyle = C.out; s.lineWidth = 1; s.beginPath(); s.moveTo(x - 0.5, y); s.lineTo(x - 0.5, y - h + 4); s.quadraticCurveTo(x + w / 2, y - h - 2.5, x + w + 0.5, y - h + 4); s.lineTo(x + w + 0.5, y); s.stroke();
    } else if (k < 0.85) {                                      // wooden cross, a little crooked
      const h = 16 + (r() * 8 | 0);
      s.save(); s.translate(x + 4, y); s.rotate((r() - 0.5) * 0.3);
      s.fillStyle = C.out; s.fillRect(-2, -h - 1, 5, h + 1); s.fillRect(-6, -h + 3, 13, 5);
      s.fillStyle = C.wood2; s.fillRect(-1, -h, 3, h); s.fillRect(-5, -h + 4, 11, 3);
      s.restore();
    } else {                                                    // a fresh mound with a shovel stuck in it
      s.fillStyle = C.d3; s.beginPath(); s.moveTo(x - 4, y); s.quadraticCurveTo(x + 8, y - 9, x + 20, y); s.fill();
      s.fillStyle = C.wood; s.fillRect(x + 12, y - 22, 2, 16); s.fillStyle = C.g1; s.fillRect(x + 10, y - 8, 6, 4);
    }
  }
  // the grave dirt you fight on, with tufts of dead grass
  const bands = [[BACK, C.d4], [BACK + 2, C.d3], [FLOOR + 10, C.d2], [FLOOR + 44, C.d1], [FLOOR + 74, C.d0]];
  for (const [y, col] of bands) { s.fillStyle = col; s.fillRect(0, y, W, VH - y); }
  s.fillStyle = C.out; s.fillRect(0, BACK, W, 1);
  for (let i = 0; i < 240; i++) { const px = (r() * W) | 0, py = BACK + 4 + ((r() * (VH - BACK - 4)) | 0); s.fillStyle = r() < 0.5 ? C.d4 : C.d0; s.fillRect(px, py, 1 + (r() < 0.25 ? 1 : 0), 1); }
  for (let i = 0; i < 40; i++) { const px = (r() * W) | 0, py = BACK + 6 + ((r() * (VH - BACK - 10)) | 0); s.fillStyle = C.grass; s.fillRect(px, py - 2, 1, 2); s.fillRect(px + 2, py - 3, 1, 3); s.fillRect(px + 4, py - 1, 1, 1); }
  return T.pixelize(c, C, null, CLUT.bg);
};
})();
