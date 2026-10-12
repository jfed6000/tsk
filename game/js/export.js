// Texas Shitkickers — the asset exporter (?export). Draws the assets exactly as the game does, then packs them in the
// F256's formats. f256/tools/export.py runs this page headless, pulls the result out of the DOM and writes the files.
//
//   tiles.bin   unique 16x16 tiles, 256 bytes each (8bpp, linear); tile 0 of every set is empty. Sets of 256 = 64K.
//   maps.bin    the three tile maps, back to back: per cell a tile number then an attribute byte
//               (tile set in bits 2:0, CLUT in bits 5:3), row-major, MAP_H rows
//   sprites.bin 32x32 sprite cells, 1K each (8bpp)
//   frames.bin  frame count (16-bit), then a 16-bit offset per frame, then per frame: cell count (8-bit) and per cell
//               dx, dy (signed 8-bit, the cell's top-left relative to the character's feet) and cell number (16-bit)
//   clut_*.bin  256 entries of B, G, R, A (A = $FF); entry 0 transparent
//   tskassets.d generated equates: sizes, counts, frame ranges, animation timing
// Everything multi-byte is big-endian, for the 6809.
(function () {
'use strict';
const T = window.TSK;

T.runExport = function (A) {
  const { HERO } = A;
  const VW = 320, VH = 240, FLOOR = 150, TS = 16, MAP_H = 15, LEVEL_W = 1920;
  const CLUT_SPR = 0, CLUT_FLASH = 1, CLUT_GHOST = 2, CLUT_TILE = 3;   // the hardware CLUT plan (f256-plan.md)

  // ---------------------------------------------------------------- the art, built the way the brawler builds it
  const night = T.buildNightLayers(VW, VH, FLOOR);
  const layers = [
    { name: 'FAR', img: night.far, rate: 0.25 },
    { name: 'MID', img: night.mid, rate: 0.5 },
    { name: 'STR', img: T.buildGraveyardStreet(VW, VH, FLOOR), rate: 1 },
  ];
  const SKEL = T.buildSkeleton();

  // ---------------------------------------------------------------- tiles and maps
  const tileKeys = new Map(), tileData = [new Uint8Array(256)];
  tileKeys.set(String.fromCharCode(...tileData[0]), 0);
  const maps = [];
  for (const L of layers) {
    const img = L.img, pw = img.width / TS;
    const need = Math.ceil(((LEVEL_W - VW) * L.rate + VW) / TS) + 1;      // enough map to scroll the whole level
    const cells = new Uint8Array(need * MAP_H * 2);
    for (let ty = 0; ty < MAP_H; ty++) for (let tx = 0; tx < need; tx++) {
      const sx = (tx % pw) * TS, sy = ty * TS, t = new Uint8Array(256);
      for (let y = 0; y < TS; y++) for (let x = 0; x < TS; x++) t[y * TS + x] = img.idx[(sy + y) * img.width + sx + x] || 0;
      const key = String.fromCharCode(...t);
      let n = tileKeys.get(key);
      if (n === undefined) {
        if (tileData.length % 256 === 0) tileData.push(new Uint8Array(256));   // slot 0 of every set stays empty (MAME skips tile number 0)
        n = tileData.length; tileKeys.set(key, n); tileData.push(t);
      }
      const o = (ty * need + tx) * 2;
      cells[o] = n & 255; cells[o + 1] = (n >> 8) | (CLUT_TILE << 3);
    }
    maps.push({ name: L.name, w: need, rate: L.rate, cells });
  }
  const tiles = new Uint8Array(tileData.length * 256);
  tileData.forEach((t, i) => tiles.set(t, i * 256));
  const sets = Math.ceil(tileData.length / 256);
  if (sets > 8) throw new Error('more than 8 tile sets');

  // ---------------------------------------------------------------- sprites: frames cut into 32x32 cells
  const cellData = [], cellKeys = new Map(), frameRecs = [], groups = [];
  function addCell(bytes) {
    const key = String.fromCharCode(...bytes);
    let n = cellKeys.get(key);
    if (n === undefined) { n = cellData.length; cellKeys.set(key, n); cellData.push(bytes); }
    return n;
  }
  function addFrame(cv, ox, oy, mirrored) {
    const W = cv.width, H = cv.height, at = (x, y) => (x < 0 || y < 0 || x >= W || y >= H) ? 0 : cv.idx[y * W + (mirrored ? W - 1 - x : x)];
    const ox2 = mirrored ? W - ox : ox;
    const rec = [];
    for (const c of T.cells(cv, mirrored)) {
      const b = new Uint8Array(1024);
      for (let y = 0; y < 32; y++) for (let x = 0; x < 32; x++) b[y * 32 + x] = at(c.x + x, c.y + y);
      rec.push({ dx: c.x - ox2, dy: c.y - oy, cell: addCell(b) });
    }
    frameRecs.push(rec);
    return frameRecs.length - 1;
  }
  // a group = one character: its animations, every frame facing right, then every frame mirrored
  function addGroup(prefix, anims, ox, oy) {
    const list = [];
    for (const [name, frames, fps, loop] of anims) list.push({ name, frames, fps, loop });
    const first = frameRecs.length;
    let n = 0;
    for (const a of list) { a.first = n; for (const f of a.frames) { addFrame(f, ox, oy, false); n++; } }
    for (const a of list) for (const f of a.frames) addFrame(f, ox, oy, true);
    groups.push({ prefix, first, n, list });
  }
  const H = T.HERO, S = T.SKEL;
  addGroup('HR', Object.values(HERO).map(a => [a.name, a.frames, a.fps, a.loop]), H.OX, H.OY);
  addGroup('SK', [['idle', SKEL.idle, 3, true], ['walk', SKEL.walk, 7, true], ['aim', [SKEL.aim], 1, false], ['shoot', [SKEL.shoot], 1, false],
    ['reload', SKEL.reload, 6, true], ['hurt', [SKEL.hurt], 1, false], ['headless', SKEL.headless, 5, true], ['heap', [SKEL.heap], 1, false],
    ['rise', SKEL.rise, 6, false]], S.OX, S.OY);
  for (const rec of frameRecs) for (const c of rec) if (c.dx < -128 || c.dx > 127 || c.dy < -128 || c.dy > 127) throw new Error('cell offset out of range');

  const sprites = new Uint8Array(cellData.length * 1024);
  cellData.forEach((b, i) => sprites.set(b, i * 1024));
  const fsize = 2 + frameRecs.length * 2 + frameRecs.reduce((s, r) => s + 1 + r.length * 4, 0);
  const frames = new Uint8Array(fsize), dv = new DataView(frames.buffer);
  dv.setUint16(0, frameRecs.length);
  let o = 2 + frameRecs.length * 2;
  frameRecs.forEach((rec, i) => {
    dv.setUint16(2 + i * 2, o);
    frames[o++] = rec.length;
    for (const c of rec) { dv.setInt8(o++, c.dx); dv.setInt8(o++, c.dy); dv.setUint16(o, c.cell); o += 2; }
  });

  // ---------------------------------------------------------------- CLUTs
  const clut = (colors, fn) => {
    const b = new Uint8Array(1024);
    colors.forEach((h, i) => {
      if (!h || i === 0) return;
      const [r, g, bl] = fn ? fn(T.rgb(h)) : T.rgb(h);
      b[i * 4] = bl; b[i * 4 + 1] = g; b[i * 4 + 2] = r; b[i * 4 + 3] = 255;
    });
    return b;
  };
  const F = T.rgb('#e4e0ff');
  const files = {
    'tiles.bin': tiles,
    'maps.bin': (() => { const all = new Uint8Array(maps.reduce((s, m) => s + m.cells.length, 0)); let p = 0; for (const m of maps) { all.set(m.cells, p); p += m.cells.length; } return all; })(),
    'sprites.bin': sprites,
    'frames.bin': frames,
    'clut_spr.bin': clut(T.CLUT.spr.colors),
    'clut_tile.bin': clut(T.CLUT.bg.colors),
    'clut_flash.bin': clut(T.CLUT.bg.colors, c => c.map((v, j) => Math.round(v * 0.35 + F[j] * 0.65))),   // lightning
  };
  if (T.CLUT.spr.colors.length > 256 || T.CLUT.bg.colors.length > 256) throw new Error('CLUT overflow');

  // ---------------------------------------------------------------- the generated defs file
  const hex = (n, w = 4) => '$' + n.toString(16).toUpperCase().padStart(w, '0');
  const L = [
    '* tskassets.d: GENERATED by f256/tools/export.py from game/js (the browser prototype). Do not edit.',
    '* The contract between the exporter and the 6809 source: rebuild the assets and this file together.',
    '',
    '* screen and maps',
    `TS.Size  equ ${TS}           tile size`,
    `MAP.H    equ ${MAP_H}           map height in tiles`,
    `LEVEL.W  equ ${LEVEL_W}         level width in pixels`,
    `FLOOR.Y  equ ${FLOOR}          screen y of the back of the floor`,
    `CLUT.Spr equ ${CLUT_SPR}`, `CLUT.Fls equ ${CLUT_FLASH}`, `CLUT.Gst equ ${CLUT_GHOST}`, `CLUT.Til equ ${CLUT_TILE}`,
    '',
    '* tiles.bin',
    `TIL.N    equ ${tileData.length}         unique tiles (tile 0 is empty)`,
    `TIL.Sets equ ${sets}           tile sets of 256 tiles (64K each)`,
    `TIL.Size equ ${hex(tiles.length, 6)}    bytes`,
    '',
    '* maps.bin: three maps back to back, 2 bytes a cell',
  ];
  let mo = 0;
  maps.forEach((m, i) => {
    L.push(`MAP${i}.W  equ ${m.w}          ${m.name}: width in tiles, scrolls at ${m.rate}x`);
    L.push(`MAP${i}.Of equ ${hex(mo)}        offset in maps.bin`);
    mo += m.cells.length;
  });
  L.push(`MAP.Size equ ${hex(mo)}`, '');
  L.push('* sprites.bin: 1K cells', `SPR.N    equ ${cellData.length}         cells`, `SPR.Size equ ${hex(sprites.length, 6)}    bytes`, '');
  L.push('* frames.bin', `FRM.N    equ ${frameRecs.length}         frames`, `FRM.Size equ ${hex(frames.length)}`, '');
  L.push('* animations: <group>.<anim> = first frame (facing right), .N = frame count, .T = ticks a frame (60 Hz)');
  L.push('* the mirrored (facing left) copy of frame f is f + <group>.Mir');
  for (const g of groups) {
    L.push(`${g.prefix}.First equ ${g.first}`, `${g.prefix}.Mir equ ${g.n}`);
    for (const a of g.list) {
      const nm = g.prefix + '.' + a.name;
      L.push(`${nm.padEnd(14)} equ ${g.first + a.first}`);
      L.push(`${(nm + '.N').padEnd(14)} equ ${a.frames.length}`);
      L.push(`${(nm + '.T').padEnd(14)} equ ${Math.max(1, Math.round(60 / a.fps))}`);
    }
    L.push('');
  }
  const defs = L.join('\n') + '\n';

  // stats for the report
  const report = { tiles: tileData.length, sets, maps: maps.map(m => ({ name: m.name, w: m.w })), cells: cellData.length, frames: frameRecs.length,
    sprClut: T.CLUT.spr.colors.length - 1, tileClut: T.CLUT.bg.colors.length - 1, sizes: Object.fromEntries(Object.entries(files).map(([k, v]) => [k, v.length])) };

  // hand everything to export.py through the DOM, base64-encoded
  const b64 = u8 => { let s = ''; for (let i = 0; i < u8.length; i += 0x8000) s += String.fromCharCode(...u8.subarray(i, i + 0x8000)); return btoa(s); };
  const out = { report, defs, files: Object.fromEntries(Object.entries(files).map(([k, v]) => [k, b64(v)])) };
  const pre = document.createElement('pre');
  pre.id = 'tskexport'; pre.textContent = JSON.stringify(out);
  document.body.innerHTML = ''; document.body.appendChild(pre);
};
})();
