// Texas Shitkickers — the rattler henchman (story.md's roster: "Coils, then lunges a long way. Bait the lunge, then
// kick"). A diamondback, Diamondback's own breed, in a little black hat and the gang's red bandana. 64x64 frames
// (T.BOSS's size: the lunge is long), facing right, origin at its belly on the street.
(function () {
'use strict';
const T = window.TSK;
const { PAL } = T;

const RP = {
  out: PAL.out, b0: '#5a4a28', b1: '#8a7440', b2: '#b49a5a', bel: '#d8c890', dia: '#3a2a16', dia2: '#e0d0a0',
  rat0: '#c8b888', rat1: '#8a7a58', hat: '#1a161c', hat2: '#3a343e', band: '#b02a24', band2: '#e0483a',
  eyeW: PAL.eyeW, pupil: PAL.pupil, tongue: '#d83050', fang: '#f0ece0',
};

// a body along points (tail first, neck last): outline, scales, the diamond pattern
function body(c, pts, w) {
  c.lineCap = 'round'; c.lineJoin = 'round';
  const path = () => { c.beginPath(); c.moveTo(pts[0][0], pts[0][1]); for (let i = 1; i < pts.length - 1; i++) { const mx = (pts[i][0] + pts[i + 1][0]) / 2, my = (pts[i][1] + pts[i + 1][1]) / 2; c.quadraticCurveTo(pts[i][0], pts[i][1], mx, my); } c.lineTo(pts[pts.length - 1][0], pts[pts.length - 1][1]); };
  path(); c.strokeStyle = RP.out; c.lineWidth = w + 2; c.stroke();
  path(); c.strokeStyle = RP.b1; c.lineWidth = w; c.stroke();
  path(); c.strokeStyle = RP.b2; c.lineWidth = Math.max(1, w * 0.35); c.stroke();
  for (let i = 1; i < pts.length - 1; i++) {                       // a diamond at each joint
    const [x, y] = pts[i], [px, py] = pts[i - 1], a = Math.atan2(y - py, x - px);
    c.save(); c.translate(x, y); c.rotate(a + Math.PI / 4);
    c.fillStyle = RP.dia2; c.fillRect(-w * 0.32, -w * 0.32, w * 0.64, w * 0.64);
    c.fillStyle = RP.dia; c.fillRect(-w * 0.22, -w * 0.22, w * 0.44, w * 0.44);
    c.restore();
  }
}
function rattle(c, x, y, a, shake) {
  c.save(); c.translate(x, y); c.rotate(a + (shake ? 0.4 : 0));
  for (let k = 0; k < 4; k++) { c.fillStyle = RP.out; c.fillRect(-3 - k * 3, -2.5, 3, 5); c.fillStyle = k % 2 ? RP.rat1 : RP.rat0; c.fillRect(-2.5 - k * 3, -1.8, 2.2, 3.6); }
  if (shake) { c.strokeStyle = RP.rat0; c.lineWidth = 1; for (const d of [-5, 5]) { c.beginPath(); c.moveTo(-12, d); c.lineTo(-2, d * 0.6); c.stroke(); } }
  c.restore();
}
// the head at (x, y), pointing a; open = the jaws open (the strike)
function head(c, x, y, a, o) {
  c.save(); c.translate(x, y); c.rotate(a);
  c.fillStyle = RP.band; c.beginPath(); c.moveTo(-6, -4); c.lineTo(-2, -5); c.lineTo(-1, 5); c.lineTo(-6, 4); c.closePath(); c.fill();   // the bandana
  c.fillStyle = RP.band2; c.fillRect(-5, -3, 2, 6);
  c.beginPath(); c.moveTo(-6, 3); c.lineTo(-10, 8); c.lineTo(-5, 6); c.fill();
  c.strokeStyle = RP.out; c.lineWidth = 1;
  c.beginPath(); c.moveTo(-2, -5); c.quadraticCurveTo(6, -7, 11, -2 - (o.open ? 2 : 0)); c.lineTo(11, 0); c.lineTo(-2, 1); c.closePath();
  c.fillStyle = RP.b1; c.fill(); c.stroke();
  c.beginPath(); c.moveTo(-2, 1); c.lineTo(11, o.open ? 6 : 1); c.quadraticCurveTo(5, 6, -2, 5); c.closePath();
  c.fillStyle = RP.bel; c.fill(); c.stroke();
  if (o.open) { c.fillStyle = RP.fang; c.fillRect(8, 0, 1, 3); c.fillRect(5, 0, 1, 2); c.fillStyle = RP.tongue; c.fillRect(11, 2, 5, 1); c.fillRect(15, 1, 1, 1); c.fillRect(15, 3, 1, 1); }
  else if (o.tongue) { c.fillStyle = RP.tongue; c.fillRect(11, 0, 4, 1); c.fillRect(14, -1, 1, 1); c.fillRect(14, 1, 1, 1); }
  if (o.eyes === 'x') { c.strokeStyle = RP.out; c.beginPath(); c.moveTo(3, -4); c.lineTo(6, -1); c.moveTo(6, -4); c.lineTo(3, -1); c.stroke(); }
  else { c.fillStyle = RP.eyeW; c.fillRect(3, -4, 3, 2); c.fillStyle = RP.pupil; c.fillRect(5, -4, 1, 2); c.fillStyle = RP.out; c.fillRect(2, -5, 5, 1); }   // a mean slit and a brow
  c.save(); c.translate(1 - (o.hat || 0), -6 - (o.hat || 0) * 1.5); c.rotate(-0.15 - (o.hat || 0) * 0.2);   // the hat
  c.fillStyle = RP.hat; c.fillRect(-2, -5, 7, 5); c.fillStyle = RP.hat2; c.fillRect(-2, -2, 7, 1);
  c.fillStyle = RP.hat; c.fillRect(-5, 0, 13, 1.6); c.restore();
  c.restore();
}

function drawRattler(c, pose, k) {
  const S = Math.sin, TAU = Math.PI * 2;
  if (pose === 'slither') {                                        // S-curves along the street, the head up
    const ph = k / 4 * TAU, pts = [];
    for (let i = 0; i <= 7; i++) pts.push([-24 + i * 5, -4 + S(ph + i * 0.9) * 3]);
    pts.push([14, -10], [17, -16]);
    body(c, pts, 6); rattle(c, -24, -4 + S(ph) * 3, Math.PI, false);
    head(c, 19, -18, -0.1, { tongue: k % 2 });
  } else if (pose === 'coil') {                                    // coiled tight, the head reared back, rattling
    const pts = [];
    for (let i = 0; i <= 12; i++) { const a = i / 12 * TAU * 1.1, rr = 13 - i * 0.6; pts.push([-2 + Math.cos(a) * rr, -7 + S(a) * rr * 0.45]); }
    pts.push([2, -16], [-1, -24], [3, -30]);
    body(c, pts, 6); rattle(c, -14, -14 + (k ? -2 : 0), -1.2, true);
    head(c, 5, -32, 0.15, { open: k === 1 });
  } else if (pose === 'lunge') {                                   // the strike: straight out, low and long
    const pts = []; for (let i = 0; i <= 9; i++) pts.push([-22 + i * 4.6, -4 - (i > 6 ? (i - 6) * 1.5 : 0)]);
    body(c, pts, 6); rattle(c, -22, -4, Math.PI, false);
    head(c, 22, -9, 0, { open: true });
  } else if (pose === 'recover') {                                 // stretched out on the ground, catching its breath
    const pts = []; for (let i = 0; i <= 9; i++) pts.push([-22 + i * 4.6, -3 + S(i * 1.3) * 1.5]);
    body(c, pts, 6); rattle(c, -22, -3, Math.PI, false);
    head(c, 22, -5, 0.15, { tongue: true });
  } else if (pose === 'hurt') {
    const pts = [[-22, -4], [-14, -6], [-6, -5], [0, -10], [2, -18], [0, -24]];
    body(c, pts, 6); rattle(c, -22, -4, Math.PI, true);
    head(c, -2, -27, -2.2, { eyes: 'x', open: true, hat: 2 });
  } else if (pose === 'down') {
    const pts = []; for (let i = 0; i <= 8; i++) pts.push([-22 + i * 5, -3 + S(i * 2) * 2]);
    body(c, pts, 6); rattle(c, -22, -3, Math.PI, false);
    head(c, 21, -3, 0.5, { eyes: 'x', hat: 3 });
  } else if (pose === 'ko') {                                      // tied in a knot, flying
    const pts = []; for (let i = 0; i <= 12; i++) { const a = i / 12 * TAU, rr = 9 + (i % 3); pts.push([Math.cos(a) * rr, -18 + S(a) * rr]); }
    body(c, pts, 6); rattle(c, 9, -18, 0.5, true);
    head(c, 2, -30, -0.8, { eyes: 'x', open: true, hat: 5 });
  }
}

T.buildRattler = function () {
  const B = T.BOSS;
  const mk = (pose, k = 0) => { const cv = T.canvas(B.FW, B.FH), x = cv.getContext('2d'); x.translate(B.OX, B.OY); drawRattler(x, pose, k); return T.pixelize(cv, RP, RP.out, T.CLUT.spr); };
  return {
    walk: [0, 1, 2, 3].map(k => mk('slither', k)), coil: [mk('coil', 0), mk('coil', 1)], lunge: mk('lunge'), recover: mk('recover'),
    hurt: mk('hurt'), down: mk('down'), ko: mk('ko'),
  };
};
})();
