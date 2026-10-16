// Texas Shitkickers — the hidden hats: one on each stage, behind something at the back of the street you can kick
// (brawler.js S.secret, openSecret). Each is a small prop sprite with two frames - whole (a glint now and then is its
// tell) and broken - origin at the middle of its foot, at most 32 x 40 (one or two sprite cells).
//   bh  a cracked headstone          ms  a coffin leaned up outside the undertaker's, its lid ajar
//   gt  a crate of whiskey (XXX)     cd  the corral's water trough
//   th  a hatch on the express car's roof
//   mi  a loose stone in a niche of the mission's wall     hn  the barber's pole
(function () {
'use strict';
const T = window.TSK;
const { PAL, CLUT } = T;

T.buildSecrets = function () {
  const mk = (pal, fn) => [0, 1].map(k => {
    const cv = T.canvas(32, 40), c = cv.getContext('2d'); c.translate(16, 39); fn(c, k);
    const o = T.pixelize(cv, pal, PAL.out, CLUT.spr); o.ox = 16; o.oy = 39; return o;
  });
  const S = {};
  S.bh = mk({ s0: '#7e8290', s1: '#a4a8b4', s2: '#5a5e6a', k: '#24242c', m: '#5a7a3a', d: '#3a3438' }, (c, k) => {
    c.fillStyle = '#3a3438'; c.fillRect(-12, -3, 24, 3);                         // the mound at its foot
    if (!k) {
      c.fillStyle = '#7e8290'; c.beginPath(); c.moveTo(-9, -2); c.lineTo(-9, -24); c.quadraticCurveTo(0, -36, 9, -24); c.lineTo(9, -2); c.fill();
      c.fillStyle = '#a4a8b4'; c.fillRect(-8, -24, 3, 21);
      c.strokeStyle = '#24242c'; c.lineWidth = 1; c.beginPath(); c.moveTo(2, -30); c.lineTo(-1, -22); c.lineTo(3, -15); c.lineTo(0, -8); c.stroke();   // the crack
      c.fillStyle = '#5a7a3a'; c.fillRect(-9, -4, 6, 2); c.fillRect(4, -4, 5, 2);
    } else {                                                                     // split: the top half fallen, a hollow behind
      c.fillStyle = '#7e8290'; c.fillRect(-9, -14, 18, 12); c.fillStyle = '#24242c'; c.fillRect(-4, -12, 8, 6);
      c.fillStyle = '#5a5e6a'; c.beginPath(); c.moveTo(10, -2); c.lineTo(10, -8); c.quadraticCurveTo(15, -12, 15, -2); c.fill();
    }
  });
  S.ms = mk({ w0: '#6a4228', w1: '#8a5a36', w2: '#4a2c18', k: '#1e1410', x: '#c8b080' }, (c, k) => {
    const coffin = (dx, open) => {
      c.fillStyle = '#4a2c18'; c.beginPath(); c.moveTo(dx - 5, -1); c.lineTo(dx - 8, -26); c.lineTo(dx - 4, -38); c.lineTo(dx + 4, -38); c.lineTo(dx + 8, -26); c.lineTo(dx + 5, -1); c.fill();
      c.fillStyle = open ? '#1e1410' : '#6a4228'; c.beginPath(); c.moveTo(dx - 4, -2); c.lineTo(dx - 7, -26); c.lineTo(dx - 3, -37); c.lineTo(dx + 3, -37); c.lineTo(dx + 7, -26); c.lineTo(dx + 4, -2); c.fill();
      if (!open) { c.fillStyle = '#8a5a36'; c.fillRect(dx - 5, -26, 2, 22); c.fillStyle = '#c8b080'; c.fillRect(dx - 1, -32, 2, 10); c.fillRect(dx - 4, -29, 8, 2); }
    };
    if (!k) { coffin(0, false); c.fillStyle = '#1e1410'; c.fillRect(5, -30, 1, 22); }   // the lid not quite shut
    else { coffin(-2, true); c.fillStyle = '#6a4228'; c.save(); c.translate(10, -1); c.rotate(-1.35); c.fillRect(0, -4, 30, 7); c.restore(); }   // the lid down
  });
  S.gt = mk({ p0: '#8a6a3a', p1: '#a8844c', p2: '#5a4224', k: '#3a1a10', g: '#5a7a4a' }, (c, k) => {
    if (!k) {
      c.fillStyle = '#5a4224'; c.fillRect(-13, -22, 26, 22); c.fillStyle = '#8a6a3a'; for (let y = -21; y < 0; y += 5) c.fillRect(-12, y, 24, 4);
      c.fillStyle = '#a8844c'; c.fillRect(-12, -21, 24, 1);
      T.drawText(c, 'XXX', 0, -15, '#3a1a10', 1, null, 'center');
    } else {                                                                     // smashed: planks splayed, a broken bottle
      c.fillStyle = '#8a6a3a'; c.save(); c.translate(-12, -2); c.rotate(-0.3); c.fillRect(0, -4, 16, 4); c.restore();
      c.save(); c.translate(2, -1); c.rotate(0.25); c.fillRect(0, -4, 14, 4); c.restore();
      c.fillStyle = '#5a4224'; c.fillRect(-10, -6, 20, 5); c.fillStyle = '#5a7a4a'; c.fillRect(-3, -10, 4, 5);
    }
  });
  S.cd = mk({ w0: '#7a5634', w1: '#9a7246', w2: '#4e3420', a: '#4a7aa8', a2: '#8ab8d8', m: '#5a4a3a' }, (c, k) => {
    if (!k) {
      c.fillStyle = '#4e3420'; c.fillRect(-14, -14, 28, 14); c.fillStyle = '#7a5634'; c.fillRect(-13, -13, 26, 12);
      c.fillStyle = '#4a7aa8'; c.fillRect(-12, -12, 24, 3); c.fillStyle = '#8ab8d8'; c.fillRect(-8, -12, 6, 1);
      c.fillStyle = '#9a7246'; c.fillRect(-13, -8, 26, 1); c.fillStyle = '#4e3420'; c.fillRect(-12, -1, 3, 2); c.fillRect(9, -1, 3, 2);
    } else {                                                                     // burst: the boards apart, a puddle
      c.fillStyle = '#4a7aa8'; c.beginPath(); c.ellipse(0, -1, 15, 2, 0, 0, Math.PI * 2); c.fill();
      c.fillStyle = '#7a5634'; c.fillRect(-14, -6, 10, 5); c.fillRect(5, -5, 10, 4); c.fillStyle = '#4e3420'; c.fillRect(-4, -3, 8, 3);
    }
  });
  S.th = mk({ i0: '#5a5a62', i1: '#7a7a84', i2: '#3a3a40', k: '#141418', r: '#8a4a2a' }, (c, k) => {
    if (!k) {
      c.fillStyle = '#3a3a40'; c.fillRect(-13, -6, 26, 6); c.fillStyle = '#5a5a62'; c.fillRect(-12, -5, 24, 4);
      c.fillStyle = '#7a7a84'; c.fillRect(-12, -5, 24, 1); c.fillStyle = '#8a4a2a'; c.fillRect(-3, -8, 6, 2);   // the handle, rusted
      c.fillStyle = '#3a3a40'; for (const x of [-10, 9]) c.fillRect(x, -4, 1, 1);
    } else {                                                                     // flung open: the lid up on its hinge, the dark below
      c.fillStyle = '#141418'; c.fillRect(-12, -4, 24, 4);
      c.fillStyle = '#5a5a62'; c.fillRect(-13, -30, 5, 26); c.fillStyle = '#7a7a84'; c.fillRect(-13, -30, 1, 26);
    }
  });
  S.mi = mk({ a0: '#c8946a', a1: '#b07a54', a2: '#dcae80', k: '#2a1814', r: '#8a5a3a' }, (c, k) => {
    c.fillStyle = '#b07a54'; c.fillRect(-12, -26, 24, 26);                       // the niche's frame in the wall
    c.fillStyle = '#dcae80'; c.fillRect(-12, -26, 24, 2);
    c.fillStyle = '#2a1814'; c.fillRect(-9, -22, 18, 18);
    if (!k) { c.fillStyle = '#c8946a'; c.fillRect(-8, -21, 16, 16); c.fillStyle = '#dcae80'; c.fillRect(-8, -21, 16, 2); c.fillStyle = '#8a5a3a'; c.fillRect(-2, -18, 1, 6); c.fillRect(2, -12, 4, 1); }
    else { c.fillStyle = '#8a5a3a'; c.fillRect(-7, -7, 5, 3); c.fillRect(1, -6, 6, 2); }   // rubble in the hole
  });
  S.hn = mk({ r: '#c83a3a', w: '#f4ecdc', b: '#c8a040', b2: '#f0d070', k: '#2a1c18', g: '#5a5458' }, (c, k) => {
    const pole = (h0, h1) => {
      c.save(); c.beginPath(); c.rect(-3, h1, 6, h0 - h1); c.clip();
      c.fillStyle = '#f4ecdc'; c.fillRect(-3, h1, 6, h0 - h1);
      c.fillStyle = '#c83a3a'; for (let y = h1 - 6; y < h0; y += 6) { c.beginPath(); c.moveTo(-3, y + 3); c.lineTo(3, y); c.lineTo(3, y + 2); c.lineTo(-3, y + 5); c.fill(); }
      c.restore();
    };
    c.fillStyle = '#5a5458'; c.fillRect(-4, -4, 8, 4);                            // the base
    if (!k) { pole(-4, -32); c.fillStyle = '#c8a040'; c.fillRect(-4, -35, 8, 3); c.fillStyle = '#f0d070'; c.beginPath(); c.arc(0, -37, 2.4, 0, Math.PI * 2); c.fill(); }
    else {                                                                       // snapped: a stump, the top lying in the dust
      pole(-4, -14); c.fillStyle = '#2a1c18'; c.fillRect(-3, -15, 6, 1);
      c.save(); c.translate(4, -2); c.rotate(-Math.PI / 2 + 0.15); c.fillStyle = '#f4ecdc'; c.fillRect(0, -3, 18, 6); c.fillStyle = '#c83a3a'; for (let x = 0; x < 18; x += 6) c.fillRect(x, -3, 3, 6); c.restore();
    }
  });
  return S;
};
})();
