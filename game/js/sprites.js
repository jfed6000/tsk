// Texas Shitkickers — procedural pixel-art sprites.
// Every sprite is drawn with vector shapes at 1:1 pixel scale, then "pixelized":
// alpha is thresholded and every pixel snapped to a fixed palette, so the
// result reads as hand-placed pixel art but stays fully posable from code.
(function () {
'use strict';
const T = window.TSK = window.TSK || {};

// ---------------------------------------------------------------- palette
const PAL = {
  out: '#1f0f07',
  // near (face) boot, dark -> light
  n0: '#5c2d12', n1: '#8c4a20', n2: '#b4672f', n3: '#dc955a',
  // far boot (a step darker, reads as "behind")
  f0: '#43200c', f1: '#673417', f2: '#874a24', f3: '#a7683c',
  st: '#e8bb7a',
  h0: '#4a2710', h1: '#764121', h2: '#9d5d32', h3: '#c27f4c', band: '#2b170b', buckle: '#d8b45c',
  eyeW: '#f7eed6', pupil: '#120804', teeth: '#f1e8ce', mouth: '#3d0f07', tongue: '#b2463a',
  g0: '#8a5a32', g1: '#c48c56', g2: '#e6b680',
  white: '#ffffff', sm1: '#fff4dc', sm2: '#f2c98c',
};
T.PAL = PAL;

function rgb(h) { const n = parseInt(h.slice(1), 16); return [n >> 16 & 255, n >> 8 & 255, n & 255]; }
T.rgb = rgb;

// ---------------------------------------------------------------- CLUTs (F256: 4 x 256 entries, index 0 transparent)
// Hardware plan: CLUT 0 sprites, CLUT 1 sprite hit-flash, CLUT 2 sprite afterimage ("ghost"), CLUT 3 tile layers.
// The sprite CLUT here is every colour of every stage (up to 1023): the exporter splits it into the shared art's
// colours (fixed) and each stage's own (loaded with the stage, export.js), and checks each stage fits the 255.
function makeClut(name, max = 255) {
  return {
    name, colors: [null], index: new Map(),
    add(h) {
      h = h.toLowerCase();
      if (!this.index.has(h)) {
        if (this.colors.length > max) throw new Error('CLUT ' + name + ' full');
        this.index.set(h, this.colors.length); this.colors.push(h);
      }
      return this.index.get(h);
    },
  };
}
const CLUT = T.CLUT = { spr: makeClut('sprites', 1023), bg: makeClut('tiles') };

// Threshold alpha, snap every pixel to the given palette, optionally add a 1px outline.
// The result keeps its CLUT indices in cv.idx, which is what the F256 converter will emit.
function pixelize(cv, palObj, outline, clut) {
  const ctx = cv.getContext('2d');
  const W = cv.width, H = cv.height;
  const img = ctx.getImageData(0, 0, W, H), d = img.data;
  const pal = [...new Set(Object.values(palObj).map(h => h.toLowerCase()))].map(h => ({ c: rgb(h), i: clut.add(h) }));
  const idx = new Uint16Array(W * H);             // (the sprite CLUT's indices go past 255: see makeClut)
  const cache = new Map();
  for (let i = 0; i < W * H; i++) {
    const o = i * 4;
    if (d[o + 3] < 110) { d[o + 3] = 0; continue; }
    const r = d[o], g = d[o + 1], b = d[o + 2];
    const key = (r >> 2) << 12 | (g >> 2) << 6 | (b >> 2);
    let e = cache.get(key);
    if (!e) {
      let best = Infinity;
      for (const p of pal) {
        const dr = r - p.c[0], dg = g - p.c[1], db = b - p.c[2];
        const dist = 2 * dr * dr + 4 * dg * dg + 3 * db * db;
        if (dist < best) { best = dist; e = p; }
      }
      cache.set(key, e);
    }
    d[o] = e.c[0]; d[o + 1] = e.c[1]; d[o + 2] = e.c[2]; d[o + 3] = 255;
    idx[i] = e.i;
  }
  if (outline) {
    const oc = rgb(outline), oi = clut.add(outline);
    const solid = idx.slice();
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
      const i = y * W + x;
      if (solid[i]) continue;
      if ((x > 0 && solid[i - 1]) || (x < W - 1 && solid[i + 1]) ||
          (y > 0 && solid[i - W]) || (y < H - 1 && solid[i + W])) {
        const o = i * 4;
        d[o] = oc[0]; d[o + 1] = oc[1]; d[o + 2] = oc[2]; d[o + 3] = 255;
        idx[i] = oi;
      }
    }
  }
  ctx.putImageData(img, 0, 0);
  cv.idx = idx; cv.clut = clut;
  return cv;
}
T.pixelize = pixelize;

// Recoloured copy through another CLUT built from the sprite CLUT (hit flash / afterimage).
const GHOST = rgb('#7fd4ff');
T.variant = function (cv, kind) {
  cv._v = cv._v || {};
  if (cv._v[kind]) return cv._v[kind];
  const c = canvas(cv.width, cv.height), ctx = c.getContext('2d');
  const img = ctx.createImageData(cv.width, cv.height), d = img.data;
  for (let i = 0; i < cv.idx.length; i++) {
    const k = cv.idx[i]; if (!k) continue;
    let col = rgb(cv.clut.colors[k]);
    if (kind === 'flash') col = [255, 255, 255];
    else if (kind === 'ghost') { const l = (col[0] * 2 + col[1] * 5 + col[2]) / 8; col = GHOST.map(g => Math.round(g * (0.45 + l / 400))); }
    d[i * 4] = col[0]; d[i * 4 + 1] = col[1]; d[i * 4 + 2] = col[2]; d[i * 4 + 3] = 255;
  }
  ctx.putImageData(img, 0, 0);
  c.idx = cv.idx; c.clut = cv.clut; c._cells = cv._cells; c._cellsM = cv._cellsM;
  return (cv._v[kind] = c);
};

T.flashOf = function (cv) {
  if (cv._flash) return cv._flash;
  const c = canvas(cv.width, cv.height), ctx = c.getContext('2d');
  const img = ctx.createImageData(cv.width, cv.height), d = img.data, F = rgb('#e4e0ff');
  for (let i = 0; i < cv.idx.length; i++) {
    const k = cv.idx[i]; if (!k) continue;
    const col = rgb(cv.clut.colors[k]);
    for (let j = 0; j < 3; j++) d[i * 4 + j] = Math.round(col[j] * 0.35 + F[j] * 0.65);
    d[i * 4 + 3] = 255;
  }
  ctx.putImageData(img, 0, 0);
  return (cv._flash = c);
};

// Cover the opaque pixels with a 32x32 grid anchored at the bounding box: one hardware sprite per non-empty
// cell. Mirrored frames are separate image data on the F256 (no flip bit), so they get their own cell list.
T.cells = function (cv, mirrored) {
  const key = mirrored ? '_cellsM' : '_cells';
  if (cv[key]) return cv[key];
  const W = cv.width, H = cv.height, idx = cv.idx;
  const at = (x, y) => idx[y * W + (mirrored ? W - 1 - x : x)];
  let x0 = W, y0 = H, x1 = -1, y1 = -1;
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) if (at(x, y)) {
    if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y;
  }
  const out = [];
  for (let cy = y0; cy <= y1; cy += 32) for (let cx = x0; cx <= x1; cx += 32) {
    let any = false;
    for (let y = cy; y < Math.min(cy + 32, H) && !any; y++) for (let x = cx; x < Math.min(cx + 32, W); x++) if (at(x, y)) { any = true; break; }
    if (any) out.push({ x: cx, y: cy });
  }
  return (cv[key] = out);
};

function canvas(w, h) {
  const c = document.createElement('canvas');
  c.width = w; c.height = h;
  return c;
}
T.canvas = canvas;

function ell(ctx, x, y, rx, ry, rot) {
  ctx.beginPath(); ctx.ellipse(x, y, rx, ry, rot || 0, 0, Math.PI * 2);
}

// ---------------------------------------------------------------- the hero
// Two cowboy boots joined from the shaft tops down to a very high crotch: no body, just a face across the joined
// shafts, a hat on top, arms out of the sides. Below the crotch each boot is a short leg (lower shaft + foot)
// that swings from the hip, so walking is the two boots scissoring and a kick is a boot swinging up.
// `yaw` turns him: 0 = facing the player (standing still), 1 = profile facing right (everything else).
// Facing us, the joined top is two shafts wide; in profile the boots line up and it is one shaft wide. The face
// slides around and is clipped by the leather, so in profile the far eye goes round the front edge.
const NEAR = { d: PAL.n0, m: PAL.n1, l: PAL.n2, h: PAL.n3 };
const FAR = { d: PAL.f0, m: PAL.f1, l: PAL.f2, h: PAL.f3 };
const lerp = (a, b, t) => a + (b - a) * t;
const TOP_Y = -33, HIP_Y = -15;
const ARCH_Y = -19.8, SIDE_Y = -14.4;           // facing us: crotch apex, bottom of the joined top at the sides

const halfW = yaw => lerp(10.8, 6.8, yaw);

// the joined upper shafts. Facing us: two scalloped boot openings and an arched crotch between the legs.
function topPath(ctx, yaw) {
  const w = halfW(yaw), front = yaw < 0.75;
  ctx.beginPath();
  ctx.moveTo(-w, TOP_Y);
  if (front) { ctx.quadraticCurveTo(-w / 2, TOP_Y + 2.6, 0, TOP_Y + 0.4); ctx.quadraticCurveTo(w / 2, TOP_Y + 2.6, w, TOP_Y); }
  else ctx.quadraticCurveTo(0, TOP_Y + 2.6, w, TOP_Y);
  if (front) {                       // two shafts that part in a tall arch just under the folded arms
    const g = lerp(2.4, 0.6, Math.max(0, yaw - 0.3) / 0.45);
    ctx.lineTo(w - 0.4, SIDE_Y); ctx.lineTo(g + 0.6, SIDE_Y);
    ctx.quadraticCurveTo(0.2, ARCH_Y - 1.6, -g - 0.6, SIDE_Y);
    ctx.lineTo(-w + 0.4, SIDE_Y);
  } else {                           // side-on the legs carry on straight down from here
    ctx.lineTo(w - 0.4, -12.4); ctx.lineTo(-w + 0.4, -12.4);
  }
  ctx.closePath();
}

function drawTop(ctx, p) {
  const S = NEAR, y = p.yaw, w = halfW(y);
  topPath(ctx, y); ctx.fillStyle = S.m; ctx.fill();
  ctx.save(); topPath(ctx, y); ctx.clip();
  if (y > 0.5) { ctx.fillStyle = S.d; ctx.fillRect(-w - 1, -34, 3.2, 30); ctx.fillStyle = S.l; ctx.fillRect(1, -33, 2.4, 22); }
  else { ctx.fillStyle = S.d; ctx.fillRect(w - 2.4, -34, 3, 30); ctx.fillStyle = S.l; ctx.fillRect(-w + 1.6, -33, 2.4, 22); }
  ctx.fillStyle = S.d;                                          // rim of the boot openings
  ctx.beginPath(); ctx.moveTo(-w - 1, TOP_Y - 0.4); ctx.quadraticCurveTo(0, TOP_Y + 2.4, w + 1, TOP_Y - 0.4);
  ctx.lineTo(w + 1, TOP_Y + 1.8); ctx.quadraticCurveTo(0, TOP_Y + 4.6, -w - 1, TOP_Y + 1.8); ctx.fill();
  // one stitched scroll per boot, low on each shaft (they merge into one in profile)
  ctx.strokeStyle = PAL.st; ctx.lineWidth = 0.8; ctx.setLineDash([1, 1]);
  if (y > 0.75) { const k = lerp(0, 2.5, y); ctx.beginPath(); ctx.moveTo(k - 3.2, -13); ctx.quadraticCurveTo(k, -15.4, k + 3.2, -13); ctx.stroke(); }
  ctx.setLineDash([]);
  drawFace(ctx, p);
  ctx.restore();
  topPath(ctx, y); ctx.strokeStyle = PAL.out; ctx.lineWidth = 1.1; ctx.stroke();
  // pull straps poking up at the sides of the openings
  ctx.fillStyle = S.d; ctx.strokeStyle = PAL.out; ctx.lineWidth = 1;
  for (const x of y > 0.75 ? [-w + 0.4] : [-w + 0.4, w - 2.8]) { ctx.beginPath(); ctx.roundRect(x, TOP_Y - 3, 2.4, 3.6, 1); ctx.fill(); ctx.stroke(); }
}

function drawFace(ctx, p) {
  ctx.save(); ctx.translate(0, -3.4);   // eyes tucked right under the hat brim
  drawFaceAt(ctx, p);
  ctx.restore();
}
function drawFaceAt(ctx, p) {
  const type = p.face, y = p.yaw, c = 4.4 * y;
  const sp = lerp(4.3, 3.1, y), px = p.pupil[0], py = p.pupil[1], ey = -25;
  const eyes = [[c - sp, 1], [c + sp, 1 - 0.45 * y]];               // [x, width] near, far
  ctx.lineCap = 'round';
  if (type === 'squint' || type === 'blink') {
    ctx.strokeStyle = PAL.out; ctx.lineWidth = 1.3; ctx.beginPath();
    if (type === 'blink') for (const [ex, w] of eyes) { ctx.moveTo(ex - 2 * w, ey + 0.5); ctx.lineTo(ex + 2 * w, ey + 0.5); }
    else {
      const [[a], [b, wb]] = eyes;
      ctx.moveTo(a - 2, ey - 2); ctx.lineTo(a + 1.4, ey); ctx.lineTo(a - 2, ey + 2);
      ctx.moveTo(b + 2 * wb, ey - 2); ctx.lineTo(b - 1.4 * wb, ey); ctx.lineTo(b + 2 * wb, ey + 2);
    }
    ctx.stroke();
  } else {
    for (const [ex, w] of eyes) {
      ell(ctx, ex, ey, 2.3 * w, 2.8); ctx.fillStyle = PAL.eyeW; ctx.fill();
      ctx.strokeStyle = PAL.out; ctx.lineWidth = 0.8; ctx.stroke();
      ctx.fillStyle = PAL.pupil; ctx.fillRect(ex + px * w - 0.7, ey + py - 0.9, 1.6, 2.1);
    }
    if (type === 'smug') {
      ctx.fillStyle = NEAR.m;
      for (const [ex, w] of eyes) ctx.fillRect(ex - 2.6 * w, ey - 3.4, 5.2 * w, 2.5);
      ctx.strokeStyle = PAL.out; ctx.lineWidth = 1; ctx.beginPath();
      for (const [ex, w] of eyes) { ctx.moveTo(ex - 2.2 * w, ey - 1); ctx.lineTo(ex + 2.2 * w, ey - 1); }
      ctx.stroke();
    }
  }
  // no eyebrows: the scowl is the upper lids, slanting down toward the middle of the face
  if (type === 'mad' || type === 'yell') {
    const [[a], [b, wb]] = eyes;
    for (const [ex, w, inner] of [[a, 1, 1], [b, wb, -1]]) {
      const xo = ex - inner * 2.8 * w, xi = ex + inner * 2.6 * w;    // outer and inner corners
      ctx.beginPath(); ctx.moveTo(xo, ey - 3.4); ctx.lineTo(xi, ey - 3.4); ctx.lineTo(xi, ey - 0.4); ctx.lineTo(xo, ey - 2.4); ctx.closePath();
      ctx.fillStyle = NEAR.m; ctx.fill();
      ctx.strokeStyle = PAL.out; ctx.lineWidth = 1.2;
      ctx.beginPath(); ctx.moveTo(xo, ey - 2.4); ctx.lineTo(xi, ey - 0.4); ctx.stroke();
    }
  }
  const m = c + 0.2, mw = lerp(5.6, 4.4, y);                         // mouth
  if (type === 'yell') {
    ell(ctx, m, -17.8, mw - 0.6, 3.1); ctx.fillStyle = PAL.mouth; ctx.fill();
    ctx.strokeStyle = PAL.out; ctx.lineWidth = 0.9; ctx.stroke();
    ctx.fillStyle = PAL.teeth; ctx.fillRect(m - mw + 1.6, -20.7, 2 * mw - 3.2, 1.5);
    ell(ctx, m + 0.2, -15.9, 2.2, 1.1); ctx.fillStyle = PAL.tongue; ctx.fill();
  } else if (type === 'smug') {
    ctx.beginPath(); ctx.moveTo(m - mw + 0.8, -18); ctx.quadraticCurveTo(m + 0.4, -16.6, m + mw - 0.4, -19.8);
    ctx.lineTo(m + mw - 0.8, -17.8); ctx.quadraticCurveTo(m + 0.4, -15.2, m - mw + 0.8, -18);
    ctx.fillStyle = PAL.teeth; ctx.fill(); ctx.strokeStyle = PAL.out; ctx.lineWidth = 0.9; ctx.stroke();
  } else {
    // one row of clenched teeth
    ctx.beginPath(); ctx.roundRect(m - mw, -19.8, 2 * mw, 3.4, 1);
    ctx.fillStyle = PAL.teeth; ctx.fill();
    ctx.strokeStyle = PAL.out; ctx.lineWidth = 1; ctx.stroke();
    ctx.lineWidth = 0.7; ctx.beginPath();
    for (let x = -mw + 2.4; x < mw - 0.8; x += 2.2) { ctx.moveTo(m + x, -19.6); ctx.lineTo(m + x, -16.6); }
    ctx.stroke();
  }
}

function drawHat(ctx, yaw) {
  const crown = () => {
    ctx.beginPath();
    ctx.moveTo(-8.5, -1.5); ctx.lineTo(-8, -9);
    ctx.quadraticCurveTo(-7.2, -13.2, -3, -12); ctx.quadraticCurveTo(0, -10.2, 3, -12);
    ctx.quadraticCurveTo(7.4, -13.2, 7.5, -9); ctx.lineTo(8, -1.5);
  };
  ctx.save(); ctx.scale(lerp(1, 0.88, yaw), 1);
  crown(); ctx.closePath(); ctx.fillStyle = PAL.h1; ctx.fill();
  ctx.save(); ctx.clip();
  ctx.fillStyle = PAL.h2; ctx.fillRect(-9, -14, 5, 14);
  ctx.fillStyle = PAL.h0; ctx.fillRect(5, -14, 4, 14);
  ctx.fillStyle = PAL.band; ctx.fillRect(-9, -4.6, 18, 2.4);
  ctx.fillStyle = PAL.buckle; ctx.fillRect(lerp(-1, 3.4, yaw), -4.6, 1.8, 2.2);
  ctx.strokeStyle = PAL.h0; ctx.lineWidth = 0.9;
  ctx.beginPath(); ctx.moveTo(-1.2, -11); ctx.quadraticCurveTo(0, -8, 1.4, -11); ctx.stroke();
  ctx.restore();
  crown(); ctx.strokeStyle = PAL.out; ctx.lineWidth = 1; ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(-15, -4.2);
  ctx.quadraticCurveTo(-13, -0.6, -1, 0.8);
  ctx.quadraticCurveTo(11, 0.6, 14.5, -3.6);
  ctx.quadraticCurveTo(10, -1.6, -1, -2.2);
  ctx.quadraticCurveTo(-11, -2, -15, -4.2);
  ctx.closePath();
  ctx.fillStyle = PAL.h1; ctx.fill();
  ctx.strokeStyle = PAL.out; ctx.lineWidth = 1; ctx.stroke();
  ctx.strokeStyle = PAL.h3; ctx.lineWidth = 0.7;
  ctx.beginPath(); ctx.moveTo(-12, -2.6); ctx.quadraticCurveTo(-1, -1.2, 11, -2.4); ctx.stroke();
  ctx.restore();
}

// ---- the legs: cowboy boots. Profile: lower shaft + foot in one piece, origin at the sole; hangs from (0, HIP_Y).
// The cues that make it read "cowboy" at 20 px: a tall pitched riding heel with daylight under the arch, a narrow
// upturned toe, a darker vamp under the dipped instep seam, a stitched toe design, and a spur.
const VAMP_N = { d: '#47220c', m: '#6a3416', l: '#874a22', h: '#b06a38' };
const VAMP_F = { d: '#341807', m: '#4f2610', l: '#683519', h: '#8a5228' };
Object.assign(PAL, { vn0: VAMP_N.d, vn1: VAMP_N.m, vn2: VAMP_N.l, vn3: VAMP_N.h,
  vf0: VAMP_F.d, vf1: VAMP_F.m, vf2: VAMP_F.l, vf3: VAMP_F.h });

// `top`: where the shaft starts. A stretched leg passes its own top, so the shaft runs all the way back to the hip.
// `slim`: a kicking leg's shaft is ~3 px narrower, so the stretched boot keeps cowboy-boot proportions to its foot.
function legPath(ctx, top = -19, slim = false) {
  ctx.beginPath();
  ctx.moveTo(slim ? -4.9 : -6.6, top); ctx.lineTo(slim ? 3.9 : 6.4, top);   // top hidden under the joined top
  ctx.lineTo(slim ? 4.2 : 5.6, -11);
  ctx.quadraticCurveTo(5.8, -7.6, 9.6, -6.3);             // instep
  ctx.quadraticCurveTo(14.2, -5, 15.6, -3.8);             // narrow toe, turned up at the tip
  ctx.lineTo(14.8, -2.6); ctx.lineTo(1.2, -2.6);
  ctx.quadraticCurveTo(-0.6, -3.9, -2.8, -4.2);           // arch
  ctx.lineTo(-7, -4.2);
  ctx.quadraticCurveTo(-8.4, -7, -6.9, -11.5);            // heel counter
  ctx.closePath();
}
const LEG_PTS = [[-8, -12], [16, -12], [16, 0.6], [-8, 0.6]];   // for hitboxes (the boot, not its hidden top)
// leather sole and stacked-leather heel in the boot's own browns (dark rubber soles read as work boots)
function cowboySole(ctx, V) {
  ctx.fillStyle = V.l;                                              // thin welt, a shade lighter than the vamp
  ctx.beginPath(); ctx.moveTo(1, -2.8); ctx.lineTo(14.8, -2.8); ctx.lineTo(15.8, -3.8);
  ctx.quadraticCurveTo(15.4, -1.4, 13, -1.2); ctx.lineTo(1, -1.2); ctx.closePath(); ctx.fill();
  ctx.beginPath(); ctx.moveTo(-7.4, -4.6); ctx.lineTo(-2.6, -4.6); ctx.lineTo(-3.2, 0.6); ctx.lineTo(-5.6, 0.6);
  ctx.closePath(); ctx.fillStyle = V.m; ctx.fill();
  ctx.strokeStyle = V.d; ctx.lineWidth = 0.8;                       // the stacked layers
  ctx.beginPath(); ctx.moveTo(-7, -2.6); ctx.lineTo(-2.9, -2.6); ctx.moveTo(-6.4, -0.8); ctx.lineTo(-3.1, -0.8); ctx.stroke();
}
function drawLegSide(ctx, S, V, spur = true, top = -19, slim = false) {
  cowboySole(ctx, V);
  legPath(ctx, top, slim); ctx.fillStyle = S.m; ctx.fill();
  ctx.save(); legPath(ctx, top, slim); ctx.clip();
  ctx.fillStyle = S.d; ctx.fillRect(-9, top - 1, 3, 3 - top);
  ctx.fillStyle = S.l; ctx.fillRect(0.8, top - 1, 2, -9 - top);
  // the vamp: darker leather below the classic dipped seam over the instep
  ctx.beginPath(); ctx.moveTo(-9, -8.6); ctx.quadraticCurveTo(-0.5, -11.8, 6.2, -7.6); ctx.lineTo(18, -7.6); ctx.lineTo(18, 2); ctx.lineTo(-9, 2);
  ctx.closePath(); ctx.fillStyle = V.m; ctx.fill();
  ctx.fillStyle = V.d; ctx.fillRect(-9, -9, 2.6, 11);
  ell(ctx, 10.6, -4.6, 2.4, 1, -0.2); ctx.fillStyle = V.h; ctx.fill();
  ctx.strokeStyle = PAL.out; ctx.lineWidth = 0.9;
  ctx.beginPath(); ctx.moveTo(-9, -8.6); ctx.quadraticCurveTo(-0.5, -11.8, 6.2, -7.6); ctx.stroke();
  ctx.strokeStyle = PAL.st; ctx.lineWidth = 0.8; ctx.setLineDash([1, 1]);   // stitched toe design
  ctx.beginPath(); ctx.moveTo(6.4, -6.6); ctx.quadraticCurveTo(9.6, -6.4, 12.8, -4.4); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(-4.6, -16); ctx.quadraticCurveTo(-0.6, -13.6, -4, -11.6); ctx.stroke();
  ctx.setLineDash([]);
  ctx.restore();
  legPath(ctx, top, slim); ctx.strokeStyle = PAL.out; ctx.lineWidth = 1.1; ctx.stroke();
  if (spur) {                                                       // strap, shank and rowel
    ctx.strokeStyle = PAL.out; ctx.lineWidth = 2.2;
    ctx.beginPath(); ctx.moveTo(-7.6, -5.6); ctx.lineTo(-11.2, -5.4); ctx.stroke();
    ctx.strokeStyle = PAL.buckle; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(-7.6, -5.6); ctx.lineTo(-11, -5.4); ctx.stroke();
    ctx.fillStyle = PAL.out; ell(ctx, -12.4, -5.4, 2.3, 2.3); ctx.fill();
    ctx.fillStyle = PAL.buckle;
    ctx.fillRect(-14, -5.9, 3.2, 1); ctx.fillRect(-12.9, -7, 1, 3.2);
  }
}
// facing us: a straight lower shaft over a foreshortened boot, toe splayed out (sx < 0 points it left)
function drawLegFront(ctx, S, V, sx) {
  ctx.save(); ctx.scale(sx, 1); drawLegSide(ctx, S, V, false); ctx.restore();
  ctx.beginPath(); ctx.rect(-4, -19, 8, 11);
  ctx.fillStyle = S.m; ctx.fill(); ctx.strokeStyle = PAL.out; ctx.lineWidth = 1.1; ctx.stroke();
  ctx.fillStyle = sx > 0 ? S.d : S.l; ctx.fillRect(sx > 0 ? 1.6 : -3.4, -18.4, 1.8, 9.8);
  ctx.strokeStyle = PAL.out; ctx.lineWidth = 0.9;                   // the vamp seam, seen from the front
  ctx.beginPath(); ctx.moveTo(-4, -8.4); ctx.quadraticCurveTo(0, -10.6, 4, -8.4); ctx.stroke();
}

// two-bone IK so poses can just say "put the fist here"
function ik(sx, sy, tx, ty, L1, L2, bend) {
  let dx = tx - sx, dy = ty - sy, d = Math.hypot(dx, dy);
  const max = L1 + L2 - 0.01;
  if (d > max) { dx *= max / d; dy *= max / d; d = max; }
  if (d < 0.5) d = 0.5;
  const base = Math.atan2(dy, dx);
  const a = Math.acos(Math.max(-1, Math.min(1, (L1 * L1 + d * d - L2 * L2) / (2 * L1 * d))));
  const a1 = base + bend * a;
  return { ex: sx + Math.cos(a1) * L1, ey: sy + Math.sin(a1) * L1, hx: sx + dx, hy: sy + dy };
}
function drawArmPts(ctx, pts, sleeve, fist = true) {
  ctx.lineCap = 'round'; ctx.lineJoin = 'round';
  ctx.beginPath(); ctx.moveTo(pts[0][0], pts[0][1]);
  for (const [x, y] of pts.slice(1)) ctx.lineTo(x, y);
  ctx.strokeStyle = PAL.out; ctx.lineWidth = 4.2; ctx.stroke();
  ctx.strokeStyle = sleeve; ctx.lineWidth = 2.3; ctx.stroke();
  if (!fist) return;
  const [hx, hy] = pts[pts.length - 1];
  ell(ctx, hx, hy, 2.7, 2.5); ctx.fillStyle = PAL.g1; ctx.fill();
  ctx.strokeStyle = PAL.out; ctx.lineWidth = 1; ctx.stroke();
  ell(ctx, hx - 0.8, hy - 0.8, 0.9, 0.8); ctx.fillStyle = PAL.g2; ctx.fill();
}
function drawArm(ctx, sx, sy, target, bend, L, sleeve) {
  const j = ik(sx, sy, target[0], target[1], L, L, bend);
  drawArmPts(ctx, [[sx, sy], [j.ex, j.ey], [j.hx, j.hy]], sleeve);
}
// arms folded across the front, under the mouth, as in the original drawing
function drawCrossedArms(ctx, w, dx) {
  const y = -17.2;
  drawArmPts(ctx, [[-w + 0.4 + dx, -21.4], [-w - 1.8 + dx, y + 0.6], [w - 5.4 + dx, y - 0.8]], PAL.f2);
  drawArmPts(ctx, [[w - 0.4 + dx, -21.4], [w + 1.8 + dx, y + 0.6], [-w + 5.4 + dx, y - 0.8]], PAL.n2, false);
  ell(ctx, -w + 4.6 + dx, y - 0.6, 2.5, 2.3); ctx.fillStyle = PAL.g1; ctx.fill(); ctx.strokeStyle = PAL.out; ctx.lineWidth = 1; ctx.stroke();
}

function drawSmear(ctx, sm) {
  ctx.lineCap = 'round';
  for (const [col, lw] of [[PAL.sm2, 4.5], [PAL.sm1, 2]]) {
    ctx.strokeStyle = col; ctx.lineWidth = lw;
    if (sm.arc) {
      const [cx, cy, r, a0, a1] = sm.arc;
      ctx.beginPath(); ctx.arc(cx, cy, r, a0, a1, a1 < a0); ctx.stroke();
    }
    if (sm.lines) for (const [x0, y0, x1, y1] of sm.lines) {
      ctx.beginPath(); ctx.moveTo(x0, y0); ctx.lineTo(x1, y1); ctx.stroke();
    }
  }
}

// Pose. Legs: `a` = swing from the hip (radians, negative = forward), `lift` = raised, `dx` = shifted.
// Facing us the legs stand apart (`dx` ±5) with toes splayed (`sx`).
const BASE = {
  yaw: 1,
  bx: 0, by: 0, br: 0, bsx: 1, bsy: 1,              // the joined top (squash/lean/bob)
  nl: { a: 0, lift: 0, dx: 0 }, fl: { a: 0, lift: 0, dx: -2 },  // near / far leg (facing us: right / left)
  hx: 0, hy: 0, hr: 0, noHat: false,
  arms: 'ik', fh: [8.5, -12], bh: [6, -10.5], fb: 1, bb: 1, armL: 6, crossX: 0,
  face: 'mad', pupil: [1, 0],
  smear: null, hit: false,
};
const pose = o => Object.assign({}, BASE, o);
const leg = (a, lift = 0, dx = 0, o = {}) => Object.assign({ a, lift, dx }, o);

function bodyPoint(p, lx, ly) {
  const c = Math.cos(p.br), s = Math.sin(p.br), x = lx * p.bsx, y = ly * p.bsy;
  return [p.bx + c * x - s * y, p.by + s * x + c * y];
}
// leg-space point -> character space: the leg hangs from the (leaning, bobbing) top's hip
function legPoint(p, l, lx, ly) {
  const [hx, hy] = bodyPoint(p, l.dx, HIP_Y);
  const k = l.sc || 1, c = Math.cos(l.a), s = Math.sin(l.a), x = lx * k, y = (ly - HIP_Y - l.lift) * k;
  return [hx + c * x - s * y, hy + s * x + c * y];
}
function paintLeg(ctx, p, l, S, V) {
  const [hx, hy] = bodyPoint(p, l.dx, HIP_Y);
  ctx.save(); ctx.translate(hx, hy); ctx.rotate(l.a); ctx.scale(l.sc || 1, l.sc || 1); ctx.translate(0, -HIP_Y - l.lift);
  if (l.sx) drawLegFront(ctx, S, V, l.sx); else drawLegSide(ctx, S, V, true, Math.min(-19, HIP_Y + l.lift - 3), !!l.kick);
  ctx.restore();
}

function drawHero(ctx, p) {
  if (p.smear) drawSmear(ctx, p.smear);
  const front = p.yaw < 0.3, w = halfW(p.yaw);
  paintLeg(ctx, p, p.fl, front ? NEAR : FAR, front ? VAMP_N : VAMP_F);
  paintLeg(ctx, p, p.nl, NEAR, VAMP_N);
  ctx.save(); ctx.translate(p.bx, p.by); ctx.rotate(p.br); ctx.scale(p.bsx, p.bsy);
  const sF = [lerp(w - 0.6, 1.2, p.yaw), lerp(-20, -18.4, p.yaw)], sB = [lerp(-w + 0.6, -2.8, p.yaw), lerp(-20.6, -19, p.yaw)];
  if (p.arms === 'ik' && !front) drawArm(ctx, sB[0], sB[1], p.bh, p.bb, p.armL, PAL.f2);
  drawTop(ctx, p);
  if (!p.noHat) { ctx.save(); ctx.translate(p.hx + 0.6 * p.yaw, -31.6 + p.hy); ctx.rotate(p.hr); drawHat(ctx, p.yaw); ctx.restore(); }
  if (p.arms === 'crossed') drawCrossedArms(ctx, w, p.crossX);
  else {
    if (front) drawArm(ctx, sB[0], sB[1], p.bh, p.bb, p.armL, PAL.f2);
    drawArm(ctx, sF[0], sF[1], p.fh, p.fb, p.armL, PAL.n2);
    if (p.whip || p.gun) {
      const j = ik(sF[0], sF[1], p.fh[0], p.fh[1], p.armL, p.armL, p.fb);
      if (p.whip) drawWhip(ctx, j.hx, j.hy, p.whip);
      if (p.gun) drawGun(ctx, j.hx, j.hy, p.gun);
    }
  }
  ctx.restore();
}

// pickup weapons, drawn in the hand. Brass and leather only: a grey gun would pull the eye whites grey (see the spur).
function drawWhip(ctx, x, y, w) {
  ctx.lineCap = 'round';
  for (const [col, lw] of [[PAL.out, 2.6], [PAL.n2, 1.2]]) {
    ctx.strokeStyle = col; ctx.lineWidth = lw;
    ctx.beginPath(); ctx.moveTo(x, y); ctx.quadraticCurveTo(w.c[0], w.c[1], w.e[0], w.e[1]); ctx.stroke();
  }
  if (w.crack) {                                     // the crack at the tip
    ctx.fillStyle = PAL.sm1; const [ex, ey] = w.e;
    ctx.fillRect(ex - 3, ey - 0.5, 6, 1.4); ctx.fillRect(ex - 0.5, ey - 3, 1.4, 6); ctx.fillRect(ex - 1.5, ey - 1.5, 3, 3);
  }
}
function drawGun(ctx, x, y, g) {
  ctx.save(); ctx.translate(x, y); ctx.rotate(g.a || 0);
  ctx.strokeStyle = PAL.out; ctx.lineWidth = 0.9;
  ctx.beginPath(); ctx.moveTo(-1.6, 0); ctx.lineTo(-3.8, 4.6); ctx.lineTo(-0.6, 5.2); ctx.lineTo(1.2, 0.4); ctx.closePath();
  ctx.fillStyle = PAL.band; ctx.fill(); ctx.stroke();              // grip
  ctx.beginPath(); ctx.rect(-1.6, -2.8, 4.4, 3.8); ctx.fillStyle = PAL.buckle; ctx.fill(); ctx.stroke();   // cylinder
  ctx.beginPath(); ctx.rect(2.4, -2.2, 7.6, 2.2); ctx.fillStyle = PAL.buckle; ctx.fill(); ctx.stroke();    // barrel
  if (g.flash) {
    ctx.fillStyle = PAL.sm2; ctx.beginPath(); ctx.moveTo(10, -1); ctx.lineTo(17, -4.5); ctx.lineTo(15, -1); ctx.lineTo(17, 2.5); ctx.closePath(); ctx.fill();
    ctx.fillStyle = PAL.sm1; ctx.fillRect(10, -2, 4, 2);
  }
  ctx.restore();
}
T.drawHero = drawHero;

// attack box = the bounding box of every kicking boot, padded a little
function autoHit(p) {
  let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
  for (const l of [p.nl, p.fl]) if (l.kick) for (const [lx, ly] of LEG_PTS) {
    const [x, y] = legPoint(p, l, lx, ly);
    x0 = Math.min(x0, x); y0 = Math.min(y0, y); x1 = Math.max(x1, x); y1 = Math.max(y1, y);
  }
  return [Math.floor(x0) - 2, Math.floor(y0) - 2, Math.ceil(x1 - x0) + 4, Math.ceil(y1 - y0) + 4];
}

// ---------------------------------------------------------------- moves
function heroAnims() {
  const A = {};
  const TAU = Math.PI * 2;
  const stand = { nl: leg(0, 0, 5.4, { sx: 0.6 }), fl: leg(0, 0, -5.4, { sx: -0.6 }) };

  A.idle = { fps: 6, loop: true, poses: [0, 1, 2, 1, 0, 1, 2, 1].map((b, i) => pose(Object.assign({}, stand, {
    yaw: 0, arms: 'crossed', pupil: [0, 0.3], bsy: 1 - b * 0.025, hy: b * 0.5, by: b * 0.3,
    face: i === 6 ? 'blink' : 'mad',
  }))) };

  A.turn = { fps: 1, loop: false, poses: [pose({
    yaw: 0.55, arms: 'crossed', crossX: 1.4, pupil: [0.8, 0.2],
    nl: leg(0, 0, 2.6, { sx: 0.85 }), fl: leg(0, 0, -3.4, { sx: 0.35 }),
  })] };

  A.run = { fps: 12, loop: true, poses: [] };
  for (let i = 0; i < 6; i++) {
    const t = i / 6 * TAU, c = Math.cos(t), s = Math.sin(t);
    A.run.poses.push(pose({
      br: 0.06, by: -1.4 * Math.abs(s), hy: 0.5 * Math.abs(s),
      // the boots scissor from the hip, each the front foot for half the cycle. A boot is lifted while it
      // swings forward and planted while it sweeps back (lifting on the back-sweep reads as a moonwalk),
      // and each arm swings against the leg on its own side
      nl: leg(-0.42 * c, 2.6 * Math.max(0, -s), 0),
      fl: leg(0.42 * c, 2.6 * Math.max(0, s), -2),
      fh: [4.5 - 5 * c, -11 + 1.5 * c], bh: [1 + 5 * c, -11 - 1.5 * c],
    }));
  }

  A.jump = { fps: 1, loop: false, poses: [
    pose({ by: -1, bsx: 0.96, bsy: 1.05, hy: 1, nl: leg(-0.5, 3), fl: leg(0.3, 0, -2),
      fh: [3, -30], bh: [-7, -28], fb: -1, face: 'yell' }),
    pose({ nl: leg(-0.2, 2), fl: leg(0.15, 1, -2), fh: [11, -20], bh: [-9, -21] }),
    pose({ br: 0.04, hy: -2.5, hr: -0.08, nl: leg(0.15), fl: leg(0.4, 0, -2),
      fh: [7, -31], bh: [-8, -30], fb: -1, face: 'yell', pupil: [0.5, 1] }),
  ] };

  A.land = { fps: 14, loop: false, poses: [
    pose({ bsx: 1.14, bsy: 0.86, hy: 1.5, by: 1.5, nl: leg(-0.25), fl: leg(0.35, 0, -2), fh: [12, -9], bh: [-11, -8] }),
    pose({ bsx: 1.05, bsy: 0.95, hy: 0.8, nl: leg(-0.1), fl: leg(0.15, 0, -2) }),
  ] };

  A.stomp = { fps: 1, loop: false, poses: [
    pose({ bsy: 0.94, bsx: 1.03, br: -0.06, hy: -1, nl: leg(-0.7, 4), fl: leg(-0.4, 4, -2),
      fh: [2, -30], bh: [-2, -30], fb: -1, bb: -1 }),
    pose({ bsy: 1.06, bsx: 0.95, hy: -4.5, nl: leg(0.05), fl: leg(0.05, 0, -2),
      fh: [2, -32], bh: [-3, -31], fb: -1, bb: -1, face: 'yell', pupil: [0, 1.2] }),
    pose({ bsx: 1.26, bsy: 0.76, by: 2, hy: 3.4, nl: leg(-0.3), fl: leg(0.4, 0, -2), fh: [13, -8], bh: [-12, -6], face: 'squint' }),
    pose({ bsx: 1.1, bsy: 0.92, by: 1, hy: 1.5, nl: leg(-0.15), fl: leg(0.2, 0, -2), fh: [11, -11], bh: [-8, -9] }),
  ] };

  // X, front snap kick: knee up, then the whole boot thrust out sole-first, drawn ~30% oversize on impact
  const plant = leg(0.18, 0, -2);
  const snapChamber = pose({ br: -0.12, bx: -1, nl: leg(-0.95, 4), fl: plant, fh: [8, -22], bh: [-6, -20] });
  const snap = pose({ br: -0.34, bx: -3, nl: leg(-1.6, -8, 0, { kick: true, sc: 1.32 }), fl: leg(0.3, 0, -2),
    fh: [-10, -14], bh: [-8, -26], fb: -1, face: 'yell', hit: true,
    smear: { lines: [[5, -24, 15, -24], [3, -17, 14, -17], [6, -10, 14, -10]] } });
  A.snap = { fps: 16, loop: false, poses: [snapChamber, snap,
    pose(Object.assign({}, snap, { nl: leg(-1.58, -7.5, 0, { kick: true, sc: 1.2 }), smear: null })), snapChamber, pose({})] };

  // C, side kick: he turns to the camera, as a real side kick turns the body square to the target, and drives
  // one boot straight out sideways
  const sideChamber = pose(Object.assign({}, stand, { yaw: 0, br: -0.12, nl: leg(-0.85, 5, 5.4), fh: [8, -24], bh: [-14, -20],
    pupil: [1, 0], face: 'mad' }));
  const sideOut = pose(Object.assign({}, stand, { yaw: 0, br: -0.24, bx: -2, nl: leg(-1.62, -15, -2.6, { kick: true, sc: 1.2 }),
    fl: leg(0.12, 0, -5.4, { sx: -0.6 }), fh: [9, -25], bh: [-15, -24], bb: -1, face: 'yell', pupil: [1.2, 0], hit: true,
    smear: { lines: [[8, -27, 17, -27], [7, -20, 17, -20], [9, -13, 16, -13]] } }));
  // the heavy kick: he turns to the camera and back through three-quarter frames, so it takes about twice as long
  // as the snap kick (9 frames at 14 fps against 5 at 16)
  const sideTurn = pose({ yaw: 0.55, nl: leg(-0.3, 2, 2.6, { sx: 0.85 }), fl: leg(0, 0, -3.4, { sx: 0.35 }),
    fh: [9, -21], bh: [-8, -20], face: 'mad', pupil: [0.8, 0] });
  const sideWind = pose(Object.assign({}, sideChamber, { br: -0.16, nl: leg(-1.05, 6.5, 5.4) }));
  const sideHold = pose(Object.assign({}, sideOut, { nl: leg(-1.6, -14.5, -2.6, { kick: true, sc: 1.14 }), smear: null }));
  A.side = { fps: 14, loop: false, poses: [sideTurn, sideChamber, sideWind, sideOut, sideHold,
    pose(Object.assign({}, sideHold, { nl: leg(-1.58, -14, -2.6, { kick: true, sc: 1.08 }) })), sideChamber, sideTurn, pose({})] };

  // C in the air: the flying side kick, also square to the camera, the other boot tucked
  A.airside = { fps: 1, loop: false, poses: [pose(Object.assign({}, sideOut, {
    br: -0.36, by: -2, fl: leg(-0.7, 6, -5.4, { sx: -0.6 }), bh: [-15, -28] }))] };

  // bicycle: both boots flutter-kick from the hip, half a beat apart
  A.bike = { fps: 22, loop: true, poses: [] };
  for (let i = 0; i < 8; i++) {
    const f = i / 8 * TAU;
    A.bike.poses.push(pose({
      br: -0.4, bx: -2, by: -2,
      nl: leg(-1.2 + 0.6 * Math.sin(f), -4 + 4 * Math.cos(f), 0, { kick: true, sc: 1.12 }),
      fl: leg(-1.2 + 0.6 * Math.sin(f + Math.PI), -4 + 4 * Math.cos(f + Math.PI), -2, { kick: true, sc: 1.12 }),
      fh: [-8, -28], bh: [-11, -24], fb: -1, bb: -1, face: 'yell', hy: -1, hit: true,
      smear: { arc: [0, -14, 25, -0.1 + 0.5 * Math.sin(f), -1.4 + 0.5 * Math.sin(f)] },
    }));
  }

  // tip of the hat, facing the player
  A.taunt = { fps: 10, loop: false, poses: [] };
  const tip = [
    [[8, -13], 0, 0, 'mad'], [[12, -23], 0, 0, 'mad'], [[12, -30], -0.5, -0.05, 'smug'],
    [[12.5, -35], -4.5, 0.25, 'smug'], [[12.5, -35.5], -5, 0.28, 'smug'], [[12.5, -35], -4.5, 0.25, 'smug'],
    [[12, -30], -0.5, -0.05, 'smug'], [[12, -23], 0, 0, 'mad'], [[8, -13], 0, 0, 'mad'],
  ];
  for (const [fh, hy, hr, face] of tip)
    A.taunt.poses.push(pose(Object.assign({}, stand, { yaw: 0, fh, bh: [-13, -11], hy, hr, face, armL: 9, fb: 1, bb: -1, pupil: [0, 0.3] })));

  A.hurt = { fps: 10, loop: false, poses: [
    pose({ br: -0.28, bx: -2, nl: leg(-0.6, 2), fl: leg(0.3, 0, -2), hy: -8, hr: -0.5,
      fh: [11, -29], bh: [-10, -30], fb: -1, bb: -1, face: 'squint' }),
    pose({ br: -0.18, bx: -1, nl: leg(-0.35, 1), fl: leg(0.2, 0, -2), hy: -4, hr: -0.25,
      fh: [11, -24], bh: [-10, -26], fb: -1, bb: -1, face: 'squint' }),
  ] };

  // brawler moves: grab an outlaw by the collar, throw him; crack a whip; fan a six-shooter
  A.grab = { fps: 1, loop: false, poses: [pose({ br: -0.05, fh: [15, -21], bh: [13, -18], nl: leg(-0.25), fl: leg(0.3, 0, -2) })] };
  A.throw = { fps: 7, loop: false, poses: [
    pose({ br: -0.3, bx: -2, fh: [-5, -35], bh: [-9, -33], fb: -1, bb: -1, face: 'yell', nl: leg(-0.3), fl: leg(0.35, 0, -2) }),
    pose({ br: 0.25, bx: 2, fh: [16, -14], bh: [14, -12], face: 'yell', nl: leg(-0.45), fl: leg(0.4, 0, -2) }),
  ] };
  A.whip = { fps: 12, loop: false, poses: [
    pose({ br: -0.12, fh: [-3, -33], fb: -1, whip: { c: [-12, -48], e: [-24, -40] }, nl: leg(-0.15), fl: leg(0.25, 0, -2) }),
    pose({ br: 0.1, fh: [14, -21], face: 'yell', whip: { c: [32, -32], e: [60, -23], crack: true }, nl: leg(-0.35), fl: leg(0.35, 0, -2) }),
    pose({ br: 0.05, fh: [12, -17], whip: { c: [28, -22], e: [44, -4] }, nl: leg(-0.25), fl: leg(0.3, 0, -2) }),
  ] };
  A.shoot = { fps: 10, loop: false, poses: [
    pose({ fh: [16, -22], bh: [6, -13], gun: { a: 0 }, nl: leg(-0.2), fl: leg(0.3, 0, -2), pupil: [1.2, 0] }),
    pose({ br: -0.06, fh: [14, -25], bh: [6, -13], gun: { a: -0.35, flash: true }, face: 'yell', nl: leg(-0.2), fl: leg(0.3, 0, -2) }),
  ] };

  // clawing out of the grave (hatless, eyes shut), then waking up
  A.rise = { fps: 8, loop: false, poses: [40, 33, 26, 19, 12, 6, 0].map((d, i) => pose(Object.assign({}, stand, {
    yaw: 0, noHat: true, bury: d, face: 'blink', arms: 'ik', fh: [12, -27 + (i % 2) * 3], bh: [-12, -30 + ((i + 1) % 2) * 3],
    fb: -1, bb: -1, br: (i % 2 ? 0.05 : -0.05) })))
  };
  A.wake = { fps: 1, loop: false, poses: [pose(Object.assign({}, stand, { yaw: 0, noHat: true, arms: 'crossed', pupil: [0, -0.4] }))] };

  // the death scene: his hat crumbles and he topples over backwards (`tip`: the whole of him turned about the back
  // heel, baked, as the F256 can't rotate); flat on his back he reaches up for the hat that floats down off the
  // lives, then gets up with it held high
  const FLAT = -1.42, down = o => pose(Object.assign({ noHat: true, tip: FLAT, nl: leg(-0.1), fl: leg(0.1, 0, -2) }, o));
  A.die = { fps: 12, loop: false, poses: [
    pose({ noHat: true, tip: -0.12, br: -0.2, fh: [-2, -33], bh: [-9, -31], fb: -1, bb: -1, face: 'yell', nl: leg(-0.5, 2), fl: leg(0.2, 0, -2) }),
    pose({ noHat: true, tip: -0.42, br: -0.15, fh: [-4, -34], bh: [-11, -30], fb: -1, bb: -1, face: 'squint', nl: leg(-0.6, 3), fl: leg(0.1, 0, -2) }),
    pose({ noHat: true, tip: -0.85, fh: [-1, -33], bh: [-10, -29], fb: -1, bb: -1, face: 'squint', nl: leg(-0.4, 2), fl: leg(0.1, 0, -2) }),
    pose({ noHat: true, tip: -1.28, fh: [6, -28], bh: [-6, -27], fb: -1, bb: -1, face: 'blink', nl: leg(-0.3, 1) }),
    down({ tip: FLAT - 0.06, fh: [11, -22], bh: [-2, -24], face: 'blink', bsy: 0.95 }),
    down({ fh: [11, -12], bh: [7, -10], face: 'blink' }),
  ] };
  A.dead = { fps: 1, loop: false, poses: [down({ fh: [11, -12], bh: [7, -10], face: 'blink' })] };
  // flat out, one hand up for the hat (the sky is his front, now): the hand opens and closes
  A.reach = { fps: 4, loop: true, poses: [
    down({ fh: [13, -21], bh: [7, -10], face: 'mad', pupil: [1.2, 0], armL: 6.5 }),
    down({ fh: [12.5, -19.5], bh: [7, -10], face: 'mad', pupil: [1.2, 0], armL: 6.5 }),
  ] };
  // up again, the hat held high, and at the top it goes on (the brawler draws the hat at `hand`)
  A.getup = { fps: 10, loop: false, poses: [
    down({ tip: -1.15, fh: [13, -21], bh: [-2, -14], face: 'mad', pupil: [1.2, 0], armL: 6.5, nl: leg(-0.8, 4) }),
    pose({ noHat: true, tip: -0.8, fh: [10, -27], bh: [-6, -18], face: 'mad', pupil: [1, -0.6], armL: 6.5, nl: leg(-0.9, 5), fl: leg(0.2, 0, -2) }),
    pose({ noHat: true, tip: -0.45, by: 1, fh: [7, -31], bh: [-9, -22], face: 'mad', pupil: [0.6, -1], armL: 6.5, nl: leg(-0.6, 3), fl: leg(0.2, 0, -2) }),
    pose({ noHat: true, tip: -0.15, by: 1.5, bsy: 0.95, fh: [4, -35], bh: [-10, -24], face: 'smug', pupil: [0.3, -1], armL: 7, nl: leg(-0.2) }),
    pose({ noHat: true, fh: [2, -37], bh: [-10, -24], face: 'smug', pupil: [0.2, -1], armL: 7.5 }),
  ] };

  for (const a of Object.values(A)) a.poses.forEach((p, i) => { if (p.hit) (a.hits = a.hits || {})[i] = autoHit(p); });
  return A;
}

const HERO_FW = 100, HERO_FH = 76, HERO_OX = 38, HERO_OY = 68;
// toppling: about the back heel, and slid forward as he goes so his top stays in the frame
const TIP_X = -7, TIP_DX = 8;
// where a pose's front hand is (origin at his feet, facing right): the arm's reach (IK) through the top's lean and
// squash and the whole-body tip. The death scene holds the hat there.
function handAt(p) {
  const w = halfW(p.yaw), j = ik(lerp(w - 0.6, 1.2, p.yaw), lerp(-20, -18.4, p.yaw), p.fh[0], p.fh[1], p.armL, p.armL, p.fb);
  const c = Math.cos(p.br), s = Math.sin(p.br), x = j.hx * p.bsx, y = j.hy * p.bsy;
  let hx = p.bx + c * x - s * y, hy = p.by + s * x + c * y;
  if (p.tip) {
    const t = p.tip, dx = hx - TIP_X, ct = Math.cos(t), st = Math.sin(t);
    hx = TIP_X + ct * dx - st * hy + TIP_DX * t / -1.42; hy = st * dx + ct * hy;
  }
  return [hx, hy];
}

// the hat on its own (it waits on Ringo's headstone in the opening): origin at the middle of the brim's underside
T.HAT = { OX: 16, OY: 14 };
T.buildHat = function () {
  const c = canvas(32, 16), ctx = c.getContext('2d');
  ctx.translate(16, 14); drawHat(ctx, 0);
  return pixelize(c, PAL, PAL.out, CLUT.spr);
};
T.HERO = { FW: HERO_FW, FH: HERO_FH, OX: HERO_OX, OY: HERO_OY };
// the hat's bits, when it crumbles in the death scene: its 32x16 in eight 8x8 pieces, origin in the middle
T.buildHatBits = function (hat) {
  return [0, 1, 2, 3, 4, 5, 6, 7].map(i => {
    const c = canvas(8, 8), sx = (i % 4) * 8, sy = (i >> 2) * 8;
    c.getContext('2d').drawImage(hat, sx, sy, 8, 8, 0, 0, 8, 8); c.ox = 4; c.oy = 4;
    c.idx = new Uint16Array(64); for (let y = 0; y < 8; y++) for (let x = 0; x < 8; x++) c.idx[y * 8 + x] = hat.idx[(sy + y) * hat.width + sx + x];
    return c;
  });
};

T.buildHero = function () {
  const anims = heroAnims();
  for (const name in anims) {
    const a = anims[name];
    a.name = name;
    a.frames = a.poses.map(p => {
      const c = canvas(HERO_FW, HERO_FH), ctx = c.getContext('2d');
      ctx.translate(HERO_OX, HERO_OY);
      if (p.bury) { ctx.beginPath(); ctx.rect(-HERO_OX, -HERO_OY, HERO_FW, HERO_OY - 1); ctx.clip(); ctx.translate(0, p.bury); }
      if (p.tip) { ctx.translate(TIP_DX * p.tip / -1.42 + TIP_X, 0); ctx.rotate(p.tip); ctx.translate(-TIP_X, 0); }
      drawHero(ctx, p);
      return pixelize(c, PAL, PAL.out, CLUT.spr);
    });
    a.dur = a.frames.length / a.fps;
    a.hand = a.poses.map(handAt);
  }
  return anims;
};

// ---------------------------------------------------------------- enemies
// "Outlaw Dillo": an armadillo in a bandana. Fits one 32x32 hardware sprite.
const DPAL = {
  out: PAL.out, s0: '#5d5143', s1: '#8a7a65', s2: '#b3a186', s3: '#d6c6a6',
  k0: '#a8695c', k1: '#d79a86', r0: '#7e1c16', r1: '#c4352a', eyeW: PAL.eyeW, pupil: PAL.pupil,
};
function drawDillo(ctx, frame, mode) {
  ctx.lineWidth = 1; ctx.strokeStyle = DPAL.out;
  if (mode === 'ball') {
    ctx.save(); ctx.translate(0, -9); ctx.rotate(frame * Math.PI / 4);
    ell(ctx, 0, 0, 9, 9); ctx.fillStyle = DPAL.s1; ctx.fill();
    ctx.save(); ell(ctx, 0, 0, 9, 9); ctx.clip();
    ctx.fillStyle = DPAL.s2; ctx.fillRect(-9, -9, 9, 5);
    ctx.strokeStyle = DPAL.s0; ctx.lineWidth = 1.2;
    for (const x of [-5, -1.5, 2, 5.5]) { ctx.beginPath(); ctx.moveTo(x, -10); ctx.quadraticCurveTo(x + 2, 0, x, 10); ctx.stroke(); }
    ctx.restore();
    ell(ctx, 0, 0, 9, 9); ctx.strokeStyle = DPAL.out; ctx.lineWidth = 1; ctx.stroke();
    ell(ctx, 6, 4, 2.4, 1.6); ctx.fillStyle = DPAL.r1; ctx.fill(); ctx.stroke(); // bandana knot
    ctx.restore();
    return;
  }
  const step = frame % 2 ? 1 : -1;
  ctx.fillStyle = DPAL.k0;
  for (const [x, o] of [[-7, step], [-3, -step], [4, step], [8, -step]]) {
    ctx.beginPath(); ctx.roundRect(x - 1.2 + o * 0.8, -5, 2.6, 5, 0.8); ctx.fill(); ctx.stroke();
  }
  ctx.beginPath(); ctx.moveTo(-10, -7); ctx.lineTo(-13, -3 + step * 0.5); ctx.lineTo(-10, -4); ctx.closePath();
  ctx.fillStyle = DPAL.s1; ctx.fill(); ctx.stroke();
  ctx.save(); ctx.translate(9, -7.5); ctx.rotate(0.28);
  ell(ctx, 0, 0, 5.6, 3.6); ctx.fillStyle = DPAL.k1; ctx.fill(); ctx.stroke();
  ell(ctx, 5.6, 0.2, 1.1, 1.1); ctx.fillStyle = DPAL.out; ctx.fill();
  ctx.restore();
  ell(ctx, 6, -12, 1.6, 2.6, -0.3); ctx.fillStyle = DPAL.k0; ctx.fill(); ctx.stroke();
  ell(ctx, 9.5, -9.4, 1.6, 1.6); ctx.fillStyle = DPAL.eyeW; ctx.fill();
  ctx.fillStyle = DPAL.pupil; ctx.fillRect(9.9, -10, 1.2, 1.5);
  ctx.lineWidth = 1.3; ctx.beginPath(); ctx.moveTo(7.5, -12); ctx.lineTo(11.5, -10.4); ctx.stroke(); ctx.lineWidth = 1;
  const shell = () => {
    ctx.beginPath();
    ctx.moveTo(-12, -4.5); ctx.quadraticCurveTo(-12.5, -17, 0, -17); ctx.quadraticCurveTo(11.5, -17, 10.5, -4.5);
    ctx.closePath();
  };
  shell(); ctx.fillStyle = DPAL.s1; ctx.fill();
  ctx.save(); ctx.clip();
  ctx.fillStyle = DPAL.s2; ctx.fillRect(-13, -18, 26, 5);
  ctx.fillStyle = DPAL.s3; ctx.fillRect(-6, -17, 7, 1.6);
  ctx.fillStyle = DPAL.s0; ctx.fillRect(-13, -7, 26, 3);
  ctx.strokeStyle = DPAL.s0; ctx.lineWidth = 1.2;
  for (const x of [-6, -2, 2, 6]) { ctx.beginPath(); ctx.moveTo(x, -18); ctx.quadraticCurveTo(x + 1.2, -10, x, -4); ctx.stroke(); }
  ctx.restore();
  shell(); ctx.strokeStyle = DPAL.out; ctx.lineWidth = 1; ctx.stroke();
  ctx.beginPath(); ctx.moveTo(6, -9); ctx.lineTo(9.5, -4); ctx.lineTo(7, -1.5); ctx.lineTo(4.5, -5); ctx.closePath();
  ctx.fillStyle = DPAL.r1; ctx.fill(); ctx.stroke();
}

T.ENEMY = { FW: 32, FH: 32, OX: 14, OY: 29 };
T.buildDillo = function () {
  const E = T.ENEMY;
  const mk = (f, mode) => {
    const c = canvas(E.FW, E.FH), ctx = c.getContext('2d');
    ctx.translate(E.OX, E.OY); drawDillo(ctx, f, mode);
    return pixelize(c, DPAL, DPAL.out, CLUT.spr);
  };
  return {
    walk: [0, 1, 2, 3].map(f => mk(f, 'walk')),
    ball: [0, 1, 2, 3, 4, 5, 6, 7].map(f => mk(f, 'ball')),
  };
};

// ---------------------------------------------------------------- props (sprites)
const WPAL = { out: PAL.out, w0: '#5b3417', w1: '#8a5428', w2: '#b47838', w3: '#d9a25a', m0: '#4b4f55', m1: '#7d848c' };
T.WOOD = [WPAL.w0, WPAL.w1, WPAL.w2, WPAL.w3, WPAL.m0];
T.BARREL = { OX: 11, OY: 25 };
T.buildBarrel = function () {
  const barrel = canvas(22, 26), b = barrel.getContext('2d');
  const body = () => {
    b.beginPath(); b.moveTo(-7, -23); b.quadraticCurveTo(-10.5, -11.5, -7, 0); b.lineTo(7, 0);
    b.quadraticCurveTo(10.5, -11.5, 7, -23); b.closePath();
  };
  b.translate(11, 25);
  body(); b.fillStyle = WPAL.w1; b.fill();
  b.save(); b.clip();
  b.fillStyle = WPAL.w2; b.fillRect(-4, -24, 4, 25);
  b.fillStyle = WPAL.w0; b.fillRect(5, -24, 5, 25);
  b.strokeStyle = WPAL.w0; b.lineWidth = 0.8;
  for (const x of [-5, 2]) { b.beginPath(); b.moveTo(x, -23); b.lineTo(x, 0); b.stroke(); }
  b.fillStyle = WPAL.m0; b.fillRect(-11, -20, 22, 2); b.fillRect(-11, -4.5, 22, 2);
  b.fillStyle = WPAL.m1; b.fillRect(-11, -20, 22, 0.9); b.fillRect(-11, -4.5, 22, 0.9);
  b.restore();
  body(); b.strokeStyle = WPAL.out; b.lineWidth = 1; b.stroke();
  return pixelize(barrel, WPAL, WPAL.out, CLUT.spr);
};

// ---------------------------------------------------------------- effects (sprites)
const FPAL = { a: '#f4dcb0', b: '#d8b98a', c: '#fff6c8', d: '#ffb340', w: '#ffffff', e: '#e6c08a', f: '#fff3d0', l: '#fff6e0' };
T.buildFx = function () {
  const mk = (w, h, fn, pal = FPAL) => { const c = canvas(w, h); fn(c.getContext('2d')); return pixelize(c, pal, null, CLUT.spr); };
  const FX = {};
  FX.dust = [2, 3, 4, 5, 6].map(s => [FPAL.a, FPAL.b].map(col => mk(8, 8, x => { x.fillStyle = col; x.fillRect(4 - (s >> 1), 4 - (s >> 1), s, s); })));
  FX.bit = [FPAL.c, FPAL.d].map(col => mk(8, 8, x => { x.fillStyle = col; x.fillRect(3, 3, 2, 2); }));
  FX.chunk = [];
  for (const col of T.WOOD) for (const [w, h] of [[2, 2], [3, 2], [4, 3], [5, 2]])
    FX.chunk.push(mk(8, 8, x => { x.fillStyle = col; x.fillRect(1, 1, w, h); }, WPAL));
  FX.star = [4, 6, 8, 10, 12, 14].map(s => mk(32, 32, x => {
    x.fillStyle = FPAL.c; x.fillRect(16 - s, 15, s * 2, 3); x.fillRect(15, 16 - s, 3, s * 2);
    x.fillStyle = FPAL.d; const d = Math.round(s * 0.55);
    for (let i = -d; i <= d; i++) { x.fillRect(16 + i, 16 + i, 2, 2); x.fillRect(16 + i, 16 - i, 2, 2); }
    x.fillStyle = FPAL.w; x.fillRect(14, 14, 5, 5);
  }));
  FX.line = mk(16, 16, x => { x.fillStyle = FPAL.l; x.fillRect(7, 1, 1, 14); });
  FX.ring = [];
  for (let r = 8; r <= 80; r += 8) {
    const ry = Math.max(2, Math.round(r * 0.2)), w = 2 * r + 4, h = 2 * ry + 4;
    const c = mk(w, h, x => {
      x.fillStyle = r < 40 ? FPAL.f : FPAL.e;
      for (let a = 0; a < Math.PI * 2; a += 0.08) x.fillRect(Math.round(r + 1 + Math.cos(a) * r), Math.round(ry + 1 + Math.sin(a) * ry), 2, 2);
    });
    c.ox = r + 1; c.oy = ry + 1;
    FX.ring.push(c);
  }
  return FX;
};

// ---------------------------------------------------------------- tiles (front tile map, 16x16)
const DESERT_TPAL = {
  out: PAL.out, s0: '#f0c27a', s1: '#dca35e', s2: '#c98a48', s3: '#b0733d', s4: '#93592f', s5: '#7d4a26',
  p0: '#a9693a', p1: '#e5b06a', pit: '#2a1408',
  w0: WPAL.w0, w1: WPAL.w1, w2: WPAL.w2, w3: WPAL.w3, m0: WPAL.m0,
};
function rng(seed) { return () => (seed = (seed * 16807) % 2147483647) / 2147483647; }

// Boot Hill at midnight: moonlit grave dirt, grey headstones, pine coffins
const NPAL = {
  out: PAL.out, s0: '#8c80a6', s1: '#6c5f88', s2: '#4f4468', s3: '#3d3354', s4: '#2e2640', s5: '#241d33',
  p0: '#5e5278', p1: '#9a8fb2', pit: '#0e0a16',
  w0: '#3a2618', w1: '#5a3d28', w2: '#7a5538', w3: '#9a7250', m0: '#3a3a48',
  g0: '#4a5068', g1: '#6f7690', g2: '#9aa1b8', g3: '#c3c8d8', moss: '#4f6a48',
};
T.buildTiles = function (theme = 'desert') {
  const TPAL = theme === 'boothill' ? NPAL : DESERT_TPAL;
  const t = {}, list = [];
  const mk = (name, fn) => {
    const c = canvas(16, 16); fn(c.getContext('2d'));
    t[name] = pixelize(c, TPAL, null, CLUT.bg); t[name].id = list.length; list.push(t[name]);
  };
  const pebbles = (x, seed, y0, y1, dark) => {
    const r = rng(seed);
    for (let i = 0; i < 9; i++) {
      const px = Math.floor(r() * 16), py = y0 + Math.floor(r() * (y1 - y0));
      x.fillStyle = dark ? TPAL.s5 : r() < 0.5 ? TPAL.p0 : TPAL.p1;
      x.fillRect(px, py, r() < 0.3 ? 2 : 1, 1);
    }
  };
  const top = (x, seed) => {
    x.fillStyle = TPAL.s2; x.fillRect(0, 0, 16, 16);
    x.fillStyle = TPAL.out; x.fillRect(0, 0, 16, 1);
    x.fillStyle = TPAL.s0; x.fillRect(0, 1, 16, 2);
    x.fillStyle = TPAL.s1; x.fillRect(0, 3, 16, 2);
    pebbles(x, seed, 6, 16);
  };
  const low = (x, seed) => {
    x.fillStyle = TPAL.s3; x.fillRect(0, 0, 16, 16);
    x.fillStyle = TPAL.s2; x.fillRect(0, 0, 16, 2);
    x.fillStyle = TPAL.s4; x.fillRect(0, 14, 16, 2);
    pebbles(x, seed, 2, 14, true);
  };
  for (let v = 0; v < 4; v++) { mk('top' + v, x => top(x, 11 + v * 7)); mk('low' + v, x => low(x, 5 + v * 13)); }
  for (const [side, col] of [['L', 0], ['R', 15]]) {
    mk('top' + side, x => { top(x, 3); x.fillStyle = TPAL.out; x.fillRect(col, 0, 1, 16); });
    mk('low' + side, x => { low(x, 9); x.fillStyle = TPAL.out; x.fillRect(col, 0, 1, 16); });
  }
  mk('pitT', x => { x.fillStyle = TPAL.pit; x.fillRect(0, 6, 16, 10); });
  mk('pitB', x => { x.fillStyle = TPAL.pit; x.fillRect(0, 0, 16, 16); });
  const plank = (x, l, r) => {
    x.fillStyle = TPAL.w2; x.fillRect(0, 0, 16, 7);
    x.fillStyle = TPAL.w3; x.fillRect(0, 0, 16, 1);
    x.fillStyle = TPAL.w1; x.fillRect(0, 4, 16, 3);
    x.fillStyle = TPAL.w0; x.fillRect(15, 0, 1, 7); x.fillRect(0, 6, 16, 1);
    x.fillStyle = TPAL.m0; x.fillRect(2, 2, 1, 1); x.fillRect(12, 2, 1, 1);
    x.fillStyle = TPAL.out;
    if (l) x.fillRect(0, 0, 1, 7);
    if (r) x.fillRect(15, 0, 1, 7);
  };
  mk('plankL', x => plank(x, 1, 0)); mk('plankM', x => plank(x, 0, 0)); mk('plankR', x => plank(x, 0, 1));
  mk('crate', x => {
    x.fillStyle = TPAL.w1; x.fillRect(0, 0, 16, 16);
    x.fillStyle = TPAL.w2; x.fillRect(0, 0, 16, 2); x.fillRect(0, 14, 16, 2); x.fillRect(0, 0, 2, 16); x.fillRect(14, 0, 2, 16);
    x.strokeStyle = TPAL.w2; x.lineWidth = 2; x.beginPath(); x.moveTo(2, 14); x.lineTo(14, 2); x.stroke();
    x.strokeStyle = TPAL.w0; x.lineWidth = 1;
    x.strokeRect(0.5, 0.5, 15, 15); x.strokeRect(2.5, 2.5, 11, 11);
    x.fillStyle = TPAL.w3; x.fillRect(1, 1, 14, 1);
    x.fillStyle = TPAL.m0; for (const [px, py] of [[1, 1], [14, 1], [1, 14], [14, 14]]) x.fillRect(px, py, 1, 1);
  });
  if (theme === 'boothill') {
    // a headstone two tiles tall (solid), and a pine coffin two tiles long (solid, stackable)
    mk('stoneT', x => {
      x.fillStyle = TPAL.g1; x.beginPath(); x.moveTo(2, 16); x.lineTo(2, 7); x.quadraticCurveTo(2, 1, 8, 1); x.quadraticCurveTo(14, 1, 14, 7);
      x.lineTo(14, 16); x.closePath(); x.fill();
      x.fillStyle = TPAL.g2; x.fillRect(3, 6, 3, 10); x.fillRect(5, 2, 4, 2);
      x.fillStyle = TPAL.g0; x.fillRect(12, 6, 2, 10);
      x.fillStyle = TPAL.g0; x.fillRect(6, 7, 4, 1); x.fillRect(7.5, 5, 1, 6);        // a carved cross
      x.strokeStyle = TPAL.out; x.lineWidth = 1;
      x.beginPath(); x.moveTo(1.5, 16); x.lineTo(1.5, 7); x.quadraticCurveTo(1.5, 0.5, 8, 0.5); x.quadraticCurveTo(14.5, 0.5, 14.5, 7); x.lineTo(14.5, 16); x.stroke();
    });
    mk('stoneB', x => {
      x.fillStyle = TPAL.g1; x.fillRect(2, 0, 12, 16);
      x.fillStyle = TPAL.g2; x.fillRect(3, 0, 3, 13);
      x.fillStyle = TPAL.g0; x.fillRect(12, 0, 2, 16);
      x.fillStyle = TPAL.moss; x.fillRect(2, 12, 5, 2); x.fillRect(9, 13, 4, 1);
      x.fillStyle = TPAL.g0; x.fillRect(0, 14, 16, 2);                                // plinth
      x.fillStyle = TPAL.out; x.fillRect(1, 0, 1, 14); x.fillRect(14, 0, 1, 14); x.fillRect(0, 13, 16, 1); x.fillRect(0, 15, 16, 1);
    });
    for (const side of ['L', 'R']) mk('coffin' + side, x => {
      const l = side === 'L';
      x.fillStyle = TPAL.w1; x.fillRect(0, 2, 16, 13);
      x.fillStyle = TPAL.w2; x.fillRect(0, 2, 16, 3);
      x.fillStyle = TPAL.w0; x.fillRect(0, 9, 16, 1); x.fillRect(0, 13, 16, 2);
      x.fillStyle = TPAL.w3; x.fillRect(0, 2, 16, 1);
      x.fillStyle = TPAL.m0; x.fillRect(l ? 3 : 12, 6, 1, 1); x.fillRect(l ? 3 : 12, 11, 1, 1);
      x.fillStyle = TPAL.out; x.fillRect(0, 1, 16, 1); x.fillRect(0, 15, 16, 1); x.fillRect(l ? 0 : 15, 1, 1, 15);
    });
  }
  t.list = list;
  return t;
};

// ---------------------------------------------------------------- parallax layers (two back tile maps)
T.buildLayers = function (VW, VH, GROUND, theme = 'desert') {
  if (theme === 'boothill') return T.buildNightLayers(VW, VH, GROUND);
  const L = {};
  const r = rng(7);
  // back map: sky bands + clouds + mesas, fully opaque, 640 px period
  const far = canvas(640, VH), f = far.getContext('2d');
  const bands = ['#3d86b8', '#4f9ac4', '#67afd0', '#85c3d8', '#a6d3d8', '#c8dfcf', '#e9dcb0', '#f3cf93'];
  const bh = Math.ceil((GROUND - 16) / bands.length);
  bands.forEach((col, i) => {
    f.fillStyle = col; f.fillRect(0, i * bh, 640, bh);
    if (i > 0) {
      f.fillStyle = bands[i - 1];
      for (let y = 0; y < 3; y++) for (let x = (y % 2); x < 640; x += 2)
        if (y < 2 || x % 4 === 0) f.fillRect(x, i * bh + y, 1, 1);
    }
  });
  f.fillStyle = bands[bands.length - 1]; f.fillRect(0, bh * bands.length, 640, VH);
  for (let i = 0; i < 5; i++) {
    const cx = 50 + i * 128 + r() * 30, cy = 26 + r() * 50, w = 26 + r() * 26;
    f.fillStyle = '#d6ebf0';
    for (let k = 0; k < 5; k++) { ell(f, cx + (k - 2) * w * 0.35, cy + 3, w * 0.32, w * 0.22); f.fill(); }
    f.fillStyle = '#fbf6ea';
    for (let k = 0; k < 5; k++) { ell(f, cx + (k - 2) * w * 0.33, cy - 2 - (k % 2) * 3, w * 0.3, w * 0.24); f.fill(); }
  }
  const MP = { a: '#a7798a', b: '#bd8f93', c: '#cfa59a', d: '#8f6479' };
  let x = -20;
  while (x < 620) {
    const w = 50 + r() * 100, h = 26 + r() * 44, top = GROUND - 26 - h, sl = 8 + r() * 10;
    f.fillStyle = MP.b;
    f.beginPath(); f.moveTo(x, GROUND); f.lineTo(x + sl, top); f.lineTo(x + w - sl, top); f.lineTo(x + w, GROUND); f.fill();
    f.fillStyle = MP.c; f.fillRect(x + sl, top, w - 2 * sl, 3);
    f.fillStyle = MP.d;
    f.beginPath(); f.moveTo(x + w * 0.6, top); f.lineTo(x + w - sl, top); f.lineTo(x + w, GROUND); f.lineTo(x + w * 0.7, GROUND); f.fill();
    f.fillStyle = MP.a; f.fillRect(x + sl * 0.7, top + h * 0.45, w - sl * 1.4, 2);
    x += w * (0.7 + r() * 0.6);
  }
  f.fillStyle = MP.a; f.fillRect(0, GROUND - 28, 640, VH);
  const SKY = {}; bands.forEach((b, i) => SKY['k' + i] = b);
  L.far = pixelize(far, Object.assign(SKY, MP, { c1: '#d6ebf0', c2: '#fbf6ea' }), null, CLUT.bg);

  // middle map: dunes + saguaros over transparency, 800 px period
  const hill = canvas(800, VH), h = hill.getContext('2d');
  const HP = { a: '#d29a5a', b: '#e2ae6c', c: '#b97f45', g1: '#5e8d45', g2: '#7fae5a', o: PAL.out };
  h.fillStyle = HP.b; h.beginPath(); h.moveTo(0, VH);
  for (let i = 0; i <= 800; i += 10) h.lineTo(i, GROUND - 20 - 9 * Math.sin(i / 800 * Math.PI * 4) - 5 * Math.sin(i / 800 * Math.PI * 10));
  h.lineTo(800, VH); h.fill();
  h.fillStyle = HP.c; h.fillRect(0, GROUND - 7, 800, VH);
  const cactus = (cx, base, ht) => {
    h.lineCap = 'round';
    const arm = (dir, y0, len, up) => { h.beginPath(); h.moveTo(cx, y0); h.lineTo(cx + dir * len, y0); h.lineTo(cx + dir * len, y0 - up); h.stroke(); };
    for (const [col, lw] of [[HP.o, 8], [HP.g1, 6]]) {
      h.strokeStyle = col; h.lineWidth = lw;
      h.beginPath(); h.moveTo(cx, base); h.lineTo(cx, base - ht); h.stroke();
      arm(-1, base - ht * 0.45, 7, ht * 0.3); arm(1, base - ht * 0.6, 7, ht * 0.25);
    }
    h.strokeStyle = HP.g2; h.lineWidth = 1.2;
    h.beginPath(); h.moveTo(cx - 1, base - 2); h.lineTo(cx - 1, base - ht + 1); h.stroke();
  };
  for (let i = 0; i < 5; i++) cactus(60 + i * 160 + r() * 60, GROUND - 9, 26 + r() * 20);
  L.mid = pixelize(hill, HP, null, CLUT.bg);
  return L;
};

// unique 16x16 tiles in a layer image (what its tile set would hold)
T.tileStats = function (cv) {
  const seen = new Set(); let empty = 0;
  for (let ty = 0; ty < cv.height; ty += 16) for (let tx = 0; tx < cv.width; tx += 16) {
    let k = '', any = false;
    for (let y = 0; y < 16; y++) {
      const row = cv.idx.subarray((ty + y) * cv.width + tx, (ty + y) * cv.width + tx + 16);
      for (const v of row) if (v) { any = true; break; }
      k += String.fromCharCode(...row);
    }
    if (!any) empty++; else seen.add(k);
  }
  return { unique: seen.size, empty, total: (cv.width / 16) * (cv.height / 16) };
};
// ---------------------------------------------------------------- 3x5 pixel font
const G = {
  A: '.#. #.# ### #.# #.#', B: '##. #.# ##. #.# ##.', C: '.## #.. #.. #.. .##', D: '##. #.# #.# #.# ##.',
  E: '### #.. ##. #.. ###', F: '### #.. ##. #.. #..', G: '.## #.. #.# #.# .##', H: '#.# #.# ### #.# #.#',
  I: '### .#. .#. .#. ###', J: '..# ..# ..# #.# .#.', K: '#.# #.# ##. #.# #.#', L: '#.. #.. #.. #.. ###',
  M: '#.# ### ### #.# #.#', N: '##. #.# #.# #.# #.#', O: '.#. #.# #.# #.# .#.', P: '##. #.# ##. #.. #..',
  Q: '.#. #.# #.# ##. .##', R: '##. #.# ##. #.# #.#', S: '.## #.. .#. ..# ##.', T: '### .#. .#. .#. .#.',
  U: '#.# #.# #.# #.# ###', V: '#.# #.# #.# #.# .#.', W: '#.# #.# ### ### #.#', X: '#.# #.# .#. #.# #.#',
  Y: '#.# #.# .#. .#. .#.', Z: '### ..# .#. #.. ###',
  0: '### #.# #.# #.# ###', 1: '.#. ##. .#. .#. ###', 2: '##. ..# .#. #.. ###', 3: '##. ..# .#. ..# ##.',
  4: '#.# #.# ### ..# ..#', 5: '### #.. ##. ..# ##.', 6: '.## #.. ### #.# ###', 7: '### ..# .#. .#. .#.',
  8: '### #.# ### #.# ###', 9: '### #.# ### ..# ##.',
  '!': '.#. .#. .#. ... .#.', '?': '##. ..# .#. ... .#.', '.': '... ... ... ... .#.', ',': '... ... ... .#. #..',
  ':': '... .#. ... .#. ...', '-': '... ... ### ... ...', '+': '... .#. ### .#. ...', "'": '.#. .#. ... ... ...',
  '/': '..# ..# .#. #.. #..', '(': '.#. #.. #.. #.. .#.', ')': '.#. ..# ..# ..# .#.', '*': '#.# .#. #.# ... ...',
  '<': '..# .#. #.. .#. ..#', '>': '#.. .#. ..# .#. #..', '=': '... ### ... ### ...', ' ': '... ... ... ... ...',
};
const GLYPH = {};
for (const k in G) GLYPH[k] = G[k].replace(/ /g, '');
T.GLYPH = GLYPH;

T.textWidth = (str, s = 1) => str.length * 4 * s - s;
T.drawText = function (ctx, str, x, y, color, s = 1, outline = PAL.out, align = 'left') {
  str = String(str).toUpperCase();
  if (align === 'center') x -= Math.floor(T.textWidth(str, s) / 2);
  else if (align === 'right') x -= T.textWidth(str, s);
  x = Math.round(x); y = Math.round(y);
  const pass = (ox, oy, col) => {
    ctx.fillStyle = col;
    for (let i = 0; i < str.length; i++) {
      const g = GLYPH[str[i]] || GLYPH['?'];
      for (let p = 0; p < 15; p++) if (g[p] === '#')
        ctx.fillRect(x + i * 4 * s + (p % 3) * s + ox, y + Math.floor(p / 3) * s + oy, s, s);
    }
  };
  if (outline) for (const [ox, oy] of [[-1, 0], [1, 0], [0, -1], [0, 1], [1, 1], [-1, 1], [1, -1], [-1, -1]]) pass(ox * s, oy * s, outline);
  pass(0, 0, color);
};

// ---------------------------------------------------------------- text as sprites
const textCache = new Map();
T.textSprite = function (str, color, s = 1, outline = PAL.out) {
  const key = str + '|' + color + '|' + s + '|' + outline;
  let c = textCache.get(key);
  if (c) return c;
  const pad = outline ? s : 0;
  c = canvas(T.textWidth(String(str), s) + pad * 2, 5 * s + pad * 2);
  T.drawText(c.getContext('2d'), str, pad, pad, color, s, outline);
  pixelize(c, outline ? { color, outline } : { color }, null, CLUT.spr);
  if (textCache.size > 300) textCache.clear();
  textCache.set(key, c);
  return c;
};

// ---------------------------------------------------------------- sprite sheet / F256 budget view
T.buildSheet = function (A, labelled) {
  const H = T.HERO, rows = Object.values(A.hero);
  const pad = 6, lab = labelled ? 12 : 0, left = labelled ? 74 : 0;
  const cols = Math.max(...rows.map(a => a.frames.length));
  const W = Math.max(left + cols * (H.FW + pad), 560);
  const extra = A.rows || [];
  const Ht = rows.length * (H.FH + pad + lab) + extra.reduce((h, [, f]) => h + f[0].height + pad + lab, 0) + (labelled ? 150 : 40);
  const c = canvas(W, Ht), ctx = c.getContext('2d');
  const label = (t, x, y, col = '#f3cf93') => labelled && T.drawText(ctx, t, x, y, col, 1);
  let y = 4, cellTotal = 0, frameTotal = 0, maxCells = 0;
  for (const a of rows) {
    label(a.name, 4, y + 2);
    a.frames.forEach((f, i) => {
      const fx = left + i * (H.FW + pad), fy = y + lab;
      if (labelled && a.hits && a.hits[i]) {
        const [hx, hy, hw, hh] = a.hits[i];
        ctx.fillStyle = 'rgba(255,60,40,0.25)';
        ctx.fillRect(fx + H.OX + hx, fy + H.OY + hy, hw, hh);
      }
      ctx.drawImage(f, fx, fy);
      const cl = T.cells(f), cm = T.cells(f, true);
      cellTotal += cl.length + cm.length; frameTotal += 2; maxCells = Math.max(maxCells, cl.length, cm.length);
      if (labelled) {
        ctx.strokeStyle = 'rgba(90,220,255,0.55)';
        for (const q of cl) ctx.strokeRect(fx + q.x + 0.5, fy + q.y + 0.5, 31, 31);
        T.drawText(ctx, cl.length + ' SPR', fx + 2, fy + H.FH - 6, '#7fd4ff', 1, null);
      }
    });
    y += H.FH + pad + lab;
  }
  for (const [name, set] of extra) {
    label(name, 4, y + 2);
    let x = left;
    for (const f of set) {
      ctx.drawImage(f, x, y + lab);
      if (labelled && f.idx) {
        ctx.strokeStyle = 'rgba(90,220,255,0.55)';
        for (const q of T.cells(f)) ctx.strokeRect(x + q.x + 0.5, y + lab + q.y + 0.5, 31, 31);
      }
      x += f.width + pad;
    }
    y += set[0].height + pad + lab;
  }
  ctx.drawImage(A.barrel, left, y);
  A.tiles.list.forEach((t, i) => ctx.drawImage(t, left + 34 + i * 18, y + 6));
  y += 34;
  if (labelled) {
    const kb = cellTotal; // 32x32 at 8bpp = 1K a cell
    const lines = [
      `HERO: ${frameTotal / 2} FRAMES, ${frameTotal} WITH MIRRORS, ${cellTotal} 32X32 CELLS = ${kb}K, MAX ${maxCells} SPRITES/FRAME`,
      `SPRITE CLUT: ${CLUT.spr.colors.length - 1} (ALL STAGES: EACH STAGE FITS 255)    TILE CLUT: ${CLUT.bg.colors.length - 1} OF 255`,
      `BACK MAP: ${A.stats.far.unique} TILES   MID MAP: ${A.stats.mid.unique} TILES   FRONT SET: ${A.tiles.list.length} TILES`,
      `BLUE SQUARES = 32X32 HARDWARE SPRITES   RED = ATTACK HITBOX`,
    ];
    lines.forEach((t, i) => T.drawText(ctx, t, 4, y + i * 10, '#fff3c4', 1));
    y += lines.length * 10 + 6;
    for (const [cl, yy] of [[CLUT.spr, y], [CLUT.bg, y + 14]]) {
      cl.colors.forEach((col, i) => { if (col) { ctx.fillStyle = col; ctx.fillRect(4 + (i - 1) * 6, yy, 5, 10); } });
    }
  }
  return c;
};
})();
