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
  const { HERO, DILLO, COYOTE, BARREL } = A;
  const VW = 320, VH = 240, FLOOR = 150, TS = 16, MAP_H = 15, LEVEL_W = 1920;
  const CLUT_SPR = 0, CLUT_FLASH = 1, CLUT_GHOST = 2, CLUT_TILE = 3;   // the hardware CLUT plan (f256-plan.md)

  // ---------------------------------------------------------------- the art, built the way the brawler builds it
  // Each stage has its own tile sets and maps, loaded into the same blocks when the stage starts. One tile CLUT
  // serves both (CLUT.bg holds every stage's colours).
  const night = T.buildNightLayers(VW, VH, FLOOR), MS = T.buildMainStreet(VW, VH, FLOOR), GT = T.buildGhostTown(VW, VH, FLOOR);
  const CD = T.buildRanch(VW, VH, FLOOR), TH = T.buildTrain(VW, VH, FLOOR), MI = T.buildMission(VW, VH, FLOOR);
  // the Mission's church doors, as a fourth map: its four states' patches (mission.js L.doors) side by side, at the
  // patch's rows (the 6809 copies a state's 4x5 cells into the street map: mission.a)
  const HN = T.buildNoon(VW, VH, FLOOR), EN = T.buildEnding(VW, VH, FLOOR);   // High Noon; the ending (Boot Hill at sundown, the shop)
  const MD = T.MISSION.DOORS, doorMap = { width: MD.w * 4, height: VH, idx: new Uint16Array(MD.w * 4 * VH) };
  MI.doors.forEach((d, k) => { for (let y = 0; y < MD.h; y++) for (let x = 0; x < MD.w; x++) doorMap.idx[(MD.y + y) * doorMap.width + k * MD.w + x] = d.idx[y * MD.w + x]; });
  const STAGES = [
    { key: 'BH', file: 'bh', W: 1920, layers: [
      { name: 'FAR', img: night.far, rate: 0.25 }, { name: 'MID', img: night.mid, rate: 0.5 },
      { name: 'STR', img: T.buildGraveyardStreet(VW, VH, FLOOR), rate: 1 }] },
    { key: 'MS', file: 'ms', W: 2400, layers: [
      { name: 'FAR', img: MS.far, rate: 0.25 }, { name: 'MID', img: MS.mid, rate: 0.5 }, { name: 'STR', img: MS.street, rate: 1 }] },
    { key: 'GT', file: 'gt', W: T.GHOST.W, layers: [
      { name: 'FAR', img: GT.far, rate: 0.25 }, { name: 'MID', img: GT.mid, rate: 0.5 }, { name: 'STR', img: GT.street, rate: 1 }] },
    // the Cattle Drive: its sky layers keep scrolling over the ride's treadmill (2 loops of the trail), so they're longer
    { key: 'CD', file: 'cd', W: T.RANCH.W, extra: 2 * T.RANCH.LOOP, layers: [
      { name: 'FAR', img: CD.far, rate: 0.25 }, { name: 'MID', img: CD.mid, rate: 0.5 }, { name: 'STR', img: CD.street, rate: 1, noExtra: true }] },
    // the Train Heist: the sky and the desert scroll on with time (wrap: one picture's width and a screen, the F256
    // scrolls modulo the picture), and a fourth map, the tunnel's rock wall, in the middle layer's place in a tunnel
    { key: 'TH', file: 'th', W: T.TRAIN.W, layers: [
      { name: 'FAR', img: TH.far, rate: 0.25, wrap: TH.far.width }, { name: 'MID', img: TH.mid, rate: 0.5, wrap: TH.mid.width },
      { name: 'STR', img: TH.street, rate: 1 }, { name: 'RCK', img: TH.rock, rate: 0.5, wrap: TH.rock.width }] },
    // the Mission: the sky and the town wrap (the camera only goes to the courtyard); the doors' states (DOR, exact)
    { key: 'MI', file: 'mi', W: T.MISSION.W, layers: [
      { name: 'FAR', img: MI.far, rate: 0.25, wrap: MI.far.width }, { name: 'MID', img: MI.mid, rate: 0.5, wrap: MI.mid.width },
      { name: 'STR', img: MI.street, rate: 1 }, { name: 'DOR', img: doorMap, rate: 0, exact: true }] },
    // High Noon: Main Street at noon to the town hall; the ending: one screen of Boot Hill at sundown (the shop's a bitmap)
    { key: 'HN', file: 'hn', W: T.NOON.W, layers: [
      { name: 'FAR', img: HN.far, rate: 0.25, wrap: HN.far.width }, { name: 'MID', img: HN.mid, rate: 0.5, wrap: HN.mid.width }, { name: 'STR', img: HN.street, rate: 1 }] },
    { key: 'EN', file: 'en', W: VW, layers: [
      { name: 'FAR', img: EN.far, rate: 0.25 }, { name: 'MID', img: EN.mid, rate: 0.5 }, { name: 'STR', img: EN.street, rate: 1 }] },
  ];
  const SKEL = T.buildSkeleton();

  // ---------------------------------------------------------------- tiles and maps
  // Each stage has its own tile palette (tpal_<s>.bin, CLUT 3 while it's on): the browser's tile CLUT holds every
  // stage's colours (up to 1023), and a stage's tiles are remapped here to its own entries, 1 up.
  function packStage(st) {
    const PM = new Map(), pal = [null];
    const loc = g => { if (!g) return 0; let i = PM.get(g); if (i === undefined) { i = pal.length; PM.set(g, i); pal.push(T.CLUT.bg.colors[g]); } return i; };
    const tileKeys = new Map(), tileData = [new Uint8Array(256)];
    tileKeys.set(String.fromCharCode(...tileData[0]), 0);
    const maps = [];
    for (const L of st.layers) {
      const img = L.img, pw = img.width / TS;
      const need = L.exact ? pw : L.wrap ? Math.ceil((L.wrap + VW) / TS) + 1                                          // a picture and a screen,
        : Math.ceil(((st.W - VW + (L.noExtra ? 0 : st.extra || 0)) * L.rate + VW) / TS) + 1;   // or enough to scroll the whole level
      const cells = new Uint8Array(need * MAP_H * 2);
      for (let ty = 0; ty < MAP_H; ty++) for (let tx = 0; tx < need; tx++) {
        const sx = (tx % pw) * TS, sy = ty * TS, t = new Uint8Array(256);
        for (let y = 0; y < TS; y++) for (let x = 0; x < TS; x++) t[y * TS + x] = loc(img.idx[(sy + y) * img.width + sx + x] || 0);
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
    if (sets > 8) throw new Error(st.key + ': more than 8 tile sets');
    const mapBytes = new Uint8Array(maps.reduce((s2, m) => s2 + m.cells.length, 0));
    let p = 0;
    for (const m of maps) { m.of = p; mapBytes.set(m.cells, p); p += m.cells.length; }
    if (pal.length > 256) throw new Error(`${st.key}: ${pal.length - 1} tile colours > 255`);
    return Object.assign(st, { tiles, sets, n: tileData.length, maps, mapBytes, pal });
  }
  STAGES.forEach(packStage);

  // ---------------------------------------------------------------- sprites: frames cut into 32x32 cells
  // Sprite banks: the shared cells (sprites.bin) stay loaded; each stage's own cells (spr_<stage>.bin) load at
  // cell OVL_BASE (a block boundary) when the stage starts, so only one stage's are in memory at once.
  // the HUD's colours (CI.* in tsktabs.a): the 6809 draws with them, so they're shared sprite CLUT entries
  const HUDCOLS = [['Out', T.PAL.out], ['Yel', '#ffd34a'], ['Crm', '#fff3c4'], ['Org', '#ff9d3c'], ['BarBk', '#5a1a14'], ['BarFg', '#e04a2a'], ['BarHi', '#ff9a6a']];
  const cellData = [], cellKeys = new Map(), frameRecs = [], groups = [];
  const banks = {};                                // stage key -> { cells: [], keys: Map }
  let bank = null, OVL_BASE = 0;
  // The sprite palette: the browser's sprite CLUT holds every stage's colours (up to 1023). On the F256 the shared
  // art's colours keep fixed entries, counting up from 1 (clut_spr.bin), and each stage bank's own count down from
  // 255 (pal_<s>.bin: shared + that stage's, loaded with the stage): a cell's pixels are remapped here.
  const SH = new Map(), shCols = [null], PB = {};
  const shIdx = g => { let i = SH.get(g); if (i === undefined) { i = shCols.length; SH.set(g, i); shCols.push(T.CLUT.spr.colors[g]); } return i; };
  const bkIdx = (k, g) => {
    if (SH.has(g)) return SH.get(g);
    const B = PB[k] || (PB[k] = { map: new Map(), cols: [] });
    let i = B.map.get(g);
    if (i === undefined) { i = 255 - B.cols.length; B.map.set(g, i); B.cols.push(T.CLUT.spr.colors[g]); }
    return i;
  };
  function addCell(raw) {
    if (!bank) {
      const bytes = Uint8Array.from(raw, g => g ? shIdx(g) : 0), key = String.fromCharCode(...bytes);
      let n = cellKeys.get(key);
      if (n === undefined) { n = cellData.length; cellKeys.set(key, n); cellData.push(bytes); }
      return n;
    }
    if (raw.every(g => !g || SH.has(g))) {       // the same as a shared cell (in shared colours): that one
      const n = cellKeys.get(String.fromCharCode(...Uint8Array.from(raw, g => g ? SH.get(g) : 0)));
      if (n !== undefined) return n;
    }
    const ns = [].concat(bank).map(k => {        // (a group in two banks: its cells at the same place in each)
      const B = banks[k] || (banks[k] = { cells: [], keys: new Map() });
      const bytes = Uint8Array.from(raw, g => g ? bkIdx(k, g) : 0), key = String.fromCharCode(...bytes);
      let m = B.keys.get(key);
      if (m === undefined) { m = OVL_BASE + B.cells.length; B.keys.set(key, m); B.cells.push(bytes); }
      return m;
    });
    if (ns.some(m => m !== ns[0])) throw new Error('a two-bank group not first in both banks');
    return ns[0];
  }
  function addFrame(cv, ox, oy, mirrored) {
    const W = cv.width, H = cv.height, at = (x, y) => (x < 0 || y < 0 || x >= W || y >= H) ? 0 : cv.idx[y * W + (mirrored ? W - 1 - x : x)];
    const ox2 = mirrored ? W - ox : ox;
    const rec = [];
    for (const c of T.cells(cv, mirrored)) {
      const b = new Uint16Array(1024);             // (global sprite CLUT indices: addCell maps them)
      for (let y = 0; y < 32; y++) for (let x = 0; x < 32; x++) b[y * 32 + x] = at(c.x + x, c.y + y);
      rec.push({ dx: c.x - ox2, dy: c.y - oy, cell: addCell(b) });
    }
    frameRecs.push(rec);
    return frameRecs.length - 1;
  }
  // a group = one character: its animations, every frame facing right, then every frame mirrored.
  // An animation may carry its own origin (ox, oy), else the group's.
  function addGroup(prefix, anims, ox, oy, mirror = true) {
    if (bank && !OVL_BASE) throw new Error('a banked group before the shared ones are done');
    const list = [];
    for (const [name, frames, fps, loop, aox = ox, aoy = oy] of anims) list.push({ name, frames, fps, loop, ox: aox, oy: aoy });
    const first = frameRecs.length;
    let n = 0;
    for (const a of list) { a.first = n; for (const f of a.frames) { addFrame(f, a.ox, a.oy, false); n++; } }
    if (mirror) for (const a of list) for (const f of a.frames) addFrame(f, a.ox, a.oy, true);
    groups.push({ prefix, first, n, list, mirror, bank });
  }
  const H = T.HERO, S = T.SKEL;
  addGroup('HR', Object.values(HERO).map(a => [a.name, a.frames, a.fps, a.loop]), H.OX, H.OY);
  addGroup('SK', [['idle', SKEL.idle, 3, true], ['walk', SKEL.walk, 7, true], ['aim', [SKEL.aim], 1, false], ['shoot', [SKEL.shoot], 1, false],
    ['reload', SKEL.reload, 6, true], ['hurt', [SKEL.hurt], 1, false], ['headless', SKEL.headless, 5, true], ['heap', [SKEL.heap], 1, false],
    ['rise', SKEL.rise, 6, false]], S.OX, S.OY);
  // effects: the ground shadow under every character (brawler.js PICK.shadow: an opaque dark ellipse, no blending)
  const shadow = (() => {
    const c = T.canvas(32, 8), x = c.getContext('2d');
    x.translate(16, 4); x.beginPath(); x.ellipse(0, 0, 13, 3.4, 0, 0, Math.PI * 2); x.fillStyle = '#2a1a1e'; x.fill();
    return T.pixelize(c, { s: '#2a1a1e' }, null, T.CLUT.spr);
  })();
  const shadowS = (() => {
    const c = T.canvas(24, 8), x = c.getContext('2d');
    x.translate(12, 4); x.beginPath(); x.ellipse(0, 0, 8, 2.4, 0, 0, Math.PI * 2); x.fillStyle = '#2a1a1e'; x.fill();
    return T.pixelize(c, { s: '#2a1a1e' }, null, T.CLUT.spr);
  })();
  // combat effects (brawler.js spark, shatter) and the skeleton's loose parts; each with its own origin
  const FXA = T.buildFx();
  addGroup('FX', [['shadow', [shadow], 1, false], ['shadowS', [shadowS], 1, false, 12, 4],
    ['star', FXA.star, 1, false, 16, 16], ['bit', FXA.bit, 1, false, 4, 4], ['dust', FXA.dust.map(d => d[0]), 1, false, 4, 4],
    ['skull', SKEL.skull, 12, true, 8, 8], ['hat', [SKEL.hat], 1, false, 12, 12], ['bone', SKEL.bones, 1, false, 6, 6],
    ['ebul', [SKEL.bullet], 1, false, 4, 4], ['chunk', FXA.chunk, 1, false, 1, 1],
    ['hbit', T.buildHatBits(T.buildHat()), 1, false, 4, 4]], 16, 4);
  // sprint 3: the dillo, Two-Bit (the coyote art), and the props and pickups
  const E = T.ENEMY, B = T.BOSS, PROPS = T.buildProps(), PICK = T.buildPick(), HAT = T.buildHat();
  addGroup('DL', [['walk', DILLO.walk, 8, true], ['ball', DILLO.ball, 24, true]], E.OX, E.OY);
  addGroup('PR', [['stone', [PROPS.headstone], 1, false, PROPS.headstone.ox, PROPS.headstone.oy], ['mound', [PROPS.mound], 1, false, 20, 11],
    ['hole', [PROPS.hole], 1, false, 20, 11], ['clod', [PROPS.clod], 1, false, 4, 4], ['digm', PROPS.digMound, 1, false, 16, 11],
    ['barrel', [BARREL], 1, false, T.BARREL.OX, T.BARREL.OY], ['hat', [HAT], 1, false, T.HAT.OX, T.HAT.OY],
    ['whip', [PICK.whip], 1, false, 12, 12], ['gun', [PICK.gun], 1, false, 12, 12], ['beans', [PICK.beans], 1, false, 12, 12],
    ['bullet', [PICK.bullet], 1, false, 4, 4], ['bicon', [PICK.bulletIcon], 1, false, 4, 4]], 16, 16);
  // pre-rendered text: titles and popup words (brawler.js popup / center), origin at the top centre, no mirrors
  const TEXT = [
    ['texas', 'TEXAS', '#ffe7b0', 4], ['shitk', 'SHITKICKERS', '#ff9d3c', 4], ['boothill', 'BOOT HILL', '#ffd34a', 2],
    ['midnight', 'MIDNIGHT', '#e8a070', 1], ['go', 'GO >>', '#ffd34a', 3], ['clear', 'BOOT HILL CLEAR!', '#ffd34a', 3],
    ['tbc', 'TO BE CONTINUED...', '#ff9d3c', 2], ['ride', 'PRESS JUMP TO RIDE AGAIN', '#c3c8d8', 1],
    ['again', 'PRESS JUMP TO TRY AGAIN', '#c3c8d8', 1], ['over', 'GAME OVER', '#ff6b4a', 2],
    ['ko0', 'YEEHAW!', '#ffd34a', 2], ['ko1', 'KICKED!', '#ffd34a', 2], ['ko2', 'GIT!', '#ffd34a', 2], ['ko3', 'BOOTED!', '#ffd34a', 2],
    ['ko4', 'WHOOP!', '#ffd34a', 2], ['ko5', 'SKEDADDLE!', '#ffd34a', 2],
    ['bone0', 'BONE DRY!', '#ffd34a', 2], ['bone1', 'RATTLED!', '#ffd34a', 2], ['bone2', 'DUST TO DUST!', '#ffd34a', 2],
    ['bone3', 'BACK TO THE GRAVE!', '#ffd34a', 2], ['bone4', 'KICKED THE BUCKET!', '#ffd34a', 2],
    ['headsup', 'HEADS UP!', '#ffd34a', 1], ['dagnab', 'DAGNABBIT!', '#ff6b4a', 2], ['kickin', "STILL KICKIN'!", '#ffd34a', 2], ['yeehaw', 'YEE-HAW!', '#ffd34a', 1], ['ouch', 'OUCH!', '#ff6b4a', 2],
    ['sixsh', 'SIX-SHOOTER!', '#ffd34a', 1], ['bwhip', 'BULLWHIP!', '#ffd34a', 1], ['wbroke', 'WHIP BROKE!', '#ff9d3c', 1],
    ['click', 'CLICK!', '#ff9d3c', 1], ['beans', 'BEANS!', '#ffd34a', 1], ['fore', 'FORE!', '#ffd34a', 1],
    ['stomp', 'STOMP!', '#ff8a3c', 2], ['bossko', 'YEEHAW!', '#ffd34a', 3], ['rise', 'RISE, BOYS!', '#ff9d3c', 1],
    ['buried', 'I BURIED YOU MYSELF!', '#fff3c4', 1], ['dizzy', 'DIZZY!', '#ffd34a', 1], ['x', 'X', '#ffd34a', 1],
    ['press', 'PRESS JUMP', '#ffd34a', 2], ['tagline', 'HE DIED WITH HIS BOOTS ON', '#e8a070', 1],
    ['tagline2', 'NOW THE BOOTS WANT REVENGE', '#e8a070', 1],
    ['mainst', 'MAIN STREET', '#ffd34a', 3], ['dusk', 'DUSK', '#e8a070', 1], ['msclear', 'MAIN STREET CLEAR!', '#ffd34a', 3],
    ['mytown', "THIS HERE'S MY TOWN!", '#fff3c4', 1], ['rollout', 'ROLL OUT, BOYS!', '#ff9d3c', 1], ['backatya', 'BACK AT YA!', '#ffd34a', 1],
    ['ghostt', 'GHOST TOWN', '#ffd34a', 3], ['moonrise', 'MOONRISE', '#e8a070', 1], ['gtclear', 'GHOST TOWN CLEAR!', '#ffd34a', 3],
    ['weep', "READ 'EM AND WEEP, BOOTS!", '#fff3c4', 1], ['dealin', "DEAL 'EM IN!", '#ff9d3c', 1], ['anteup', 'ANTE UP!', '#ffd34a', 1],
    ['busted', 'BUSTED!', '#ffd34a', 1], ['chomp', 'CHOMP!', '#ff6b4a', 1], ['timber', 'TIMBER!', '#ffd34a', 1],
    ['pickcard', 'PICK A CARD!', '#ffd34a', 1], ['squashed', 'SQUASHED!', '#ff6b4a', 1],
    ['cattle', 'THE CATTLE DRIVE', '#ffd34a', 3], ['sunup', 'SUNUP', '#e8a070', 1], ['cdclear', 'CATTLE DRIVE CLEAR!', '#ffd34a', 3],
    ['whoa', 'WHOA!', '#ffd34a', 2], ['oof', 'OOF!', '#ff6b4a', 1], ['trampled', 'TRAMPLED!', '#ff6b4a', 1], ['roped', 'ROPED!', '#ff6b4a', 1],
    ['hogtied', 'HOG-TIED!', '#ff6b4a', 1], ['finders', 'FINDERS KEEPERS, BOOTS!', '#fff3c4', 1], ['tooslow', 'TOO SLOW!', '#ffd34a', 1],
    ['nottoday', 'NOT TODAY!', '#ffd34a', 1], ['stampede', 'STAMPEDE!', '#ff9d3c', 1],
    ['trainh', 'THE TRAIN HEIST', '#ffd34a', 3], ['midday', 'MIDDAY', '#e8a070', 1], ['thclear', 'TRAIN HEIST CLEAR!', '#ffd34a', 3],
    ['tunnel', 'TUNNEL!', '#ff9d3c', 3], ['duckhold', 'DUCK! HOLD DOWN', '#ffd34a', 1], ['duck', 'DUCK!', '#ffd34a', 2],
    ['seeya', 'SEE YA!', '#ffd34a', 2], ['swept', 'SWEPT OFF!', '#ffd34a', 2], ['watchstep', 'WATCH YER STEP!', '#ffd34a', 1],
    ['mindhead', 'MIND YER HEAD!', '#ff6b4a', 2], ['nobody', 'NOBODY GETS OFF THIS TRAIN!', '#fff3c4', 1], ['clank', 'CLANK!', '#c3c8d8', 1],
    ['stung', 'STUNG!', '#ff6b4a', 1], ['uhoh', 'UH OH!', '#ff9d3c', 1], ['lightall', "LIGHT 'EM ALL!", '#ff9d3c', 1], ['kaboom', 'KA-BOOM!', '#ff6b4a', 1],
    ['mission', 'THE MISSION', '#ffd34a', 3], ['sundown', 'SUNDOWN', '#e8a070', 1], ['miclear', 'THE MISSION CLEAR!', '#ffd34a', 3],
    ['herethey', 'HERE THEY COME!', '#ff9d3c', 2], ['theyrein', "THEY'RE IN!", '#ff6b4a', 2], ['costhat', 'THAT COST YA A HAT!', '#ffd34a', 1],
    ['barred', 'BARRED AGAIN!', '#fff3c4', 1], ['prayers', 'SAY YER PRAYERS, BOOTS!', '#fff3c4', 1], ['snort', 'SNORT!', '#ff9d3c', 1],
    ['seered', "SEEIN' RED!", '#ff6b4a', 1], ['gored', 'GORED!', '#ff6b4a', 1], ['crash', 'CRASH!', '#ff9d3c', 2], ['stuck', 'STUCK!', '#ffd34a', 1],
    ['highnoon', 'HIGH NOON, BOOTS.', '#9ad46a', 2], ['hnoon', 'HIGH NOON', '#ffd34a', 3], ['mainsub', 'MAIN STREET', '#e8a070', 1],
    ['needin', "I'VE BEEN NEEDIN' A NEW PAIR.", '#fff3c4', 1], ['draw', 'DRAW!', '#ffd34a', 4], ['outdrawn', 'OUTDRAWN!', '#ffd34a', 2],
    ['jumped', 'JUMPED THE GUN!', '#ff6b4a', 1], ['slowboot', 'TOO SLOW, BOOTS!', '#ff6b4a', 1], ['snakebit', 'SNAKEBIT!', '#ff6b4a', 1],
    ['posse', "GET 'EM, POSSE!", '#ff9d3c', 1], ['theend', 'THE END', '#ff9d3c', 4], ['pressj', 'PRESS JUMP', '#c3c8d8', 1], ['mainst2', 'MAIN STREET.', '#9ad46a', 2], ['diamond', '- DIAMONDBACK', '#c3c8d8', 1],
  ];
  addGroup('TX', TEXT.map(([name, str, col, sc]) => { const t = T.textSprite(str, col, sc); return [name, [t], 1, false, t.width >> 1, 0]; }), 0, 0, false);

  // the stage banks: Boot Hill's Two-Bit; Main Street's mangy gang (the coyote art in the mangy palette) and tumbleweed
  // shared by Main Street and Ghost Town: the outlaw coyotes (the coyote art in the mangy palette), the tumbleweed
  const MANGY = T.buildCoyote('mangy'), TUMBLE = T.buildTumbleweed();
  addGroup('CY', [['idle', MANGY.idle, 3, true], ['walk', MANGY.walk, 8, true], ['windup', [MANGY.windup], 1, false],
    ['swing', [MANGY.swing], 1, false], ['hurt', [MANGY.hurt], 1, false], ['down', [MANGY.down], 1, false],
    ['daze', MANGY.daze, 8, true], ['ko', [MANGY.ko], 1, false], ['aim', [MANGY.aim], 1, false], ['shoot', [MANGY.shoot], 1, false]], B.OX, B.OY);
  addGroup('TW', [['roll', TUMBLE, 10, true]], 12, 22);
  OVL_BASE = Math.ceil(cellData.length / 8) * 8;
  bank = 'BH';
  addGroup('TB', [['idle', COYOTE.idle, 3, true], ['walk', COYOTE.walk, 8, true], ['talk', COYOTE.talk, 6, true],
    ['windup', [COYOTE.windup], 1, false], ['swing', [COYOTE.swing], 1, false], ['throw', [COYOTE.throw], 1, false],
    ['dig', [COYOTE.dig], 1, false], ['pop', [COYOTE.pop], 1, false], ['daze', COYOTE.daze, 8, true],
    ['hurt', [COYOTE.hurt], 1, false], ['ko', [COYOTE.ko], 1, false], ['down', [COYOTE.down], 1, false]], B.OX, B.OY);
  bank = 'MS';
  const DLN = T.buildDillon();                     // Big Shell Dillon, Main Street's boss
  addGroup('BD', [['idle', DLN.idle, 3, true], ['walk', DLN.walk, 7, true], ['talk', DLN.talk, 6, true],
    ['windup', [DLN.windup], 1, false], ['swipe', [DLN.swipe], 1, false], ['curl', [DLN.curl], 1, false],
    ['ball', DLN.ball, 20, true], ['hurt', [DLN.hurt], 1, false], ['daze', DLN.daze, 8, true], ['ko', [DLN.ko], 1, false]], B.OX, B.OY);
  bank = ['GT', 'CD', 'TH', 'MI'];                 // the rattler: Ghost Town's, the Cattle Drive's corral's, the train's, the Mission's
  const RAT = T.buildRattler(), GIL = T.buildGila(), GPR = T.buildGhostProps();
  addGroup('RT', [['walk', RAT.walk, 8, true], ['coil', RAT.coil, 14, true], ['lunge', [RAT.lunge], 1, false],
    ['recover', [RAT.recover], 1, false], ['hurt', [RAT.hurt], 1, false], ['down', [RAT.down], 1, false], ['ko', [RAT.ko], 1, false]], B.OX, B.OY);
  bank = 'GT';                                     // Ghost Town: Doc Gila and his cards, the signs and tables
  addGroup('GL', [['idle', GIL.idle, 3, true], ['walk', GIL.walk, 7, true], ['talk', GIL.talk, 6, true], ['deal', [GIL.deal], 1, false],
    ['flick', [GIL.flick], 1, false], ['jaws', [GIL.jaws], 1, false], ['bite', [GIL.bite], 1, false], ['duck', [GIL.duck], 1, false],
    ['hurt', [GIL.hurt], 1, false], ['daze', GIL.daze, 8, true], ['ko', [GIL.ko], 1, false],
    ['card', GIL.card, 16, true, 6, 6], ['leap', [GIL.leap], 1, false], ['drop', [GIL.drop], 1, false]], B.OX, B.OY);
  const SIGNS = ['BARBER', 'DENTIST', 'WHISKEY', 'GUNS'].map(nm => GPR.sign(nm));   // (brawler.js STAGES.ghosttown.signs)
  addGroup('GP', [...SIGNS.flatMap((g, i) => [['sign' + i, [g.up], 1, false, g.up.ox, 0], ['signd' + i, [g.down], 1, false, g.down.ox, 24]]),
    ['table', [GPR.table], 1, false, GPR.table.ox, GPR.table.oy], ['flipped', [GPR.flipped], 1, false, GPR.flipped.ox, GPR.flipped.oy],
    ['plank', [GPR.plank], 1, false, GPR.plank.ox, GPR.plank.oy]], 16, 16, false);
  bank = 'CD';                                     // the Cattle Drive: the longhorn, the horses, fences and rocks, Jackrabbit Jack
  const RS = T.buildRanchSprites(), JK = T.buildJack();
  addGroup('RD', [['steer', RS.steer, 10, true], ['steerj', [RS.steerJump], 1, false], ['horse', RS.horse, 12, true]], B.OX, B.OY);
  addGroup('RO', [['fence', [RS.fence], 1, false, RS.fence.ox, RS.fence.oy], ['rock', [RS.rock], 1, false, RS.rock.ox, RS.rock.oy]], 16, 16, false);
  addGroup('JK', [['idle', JK.idle, 3, true], ['talk', JK.talk, 6, true], ['crouch', [JK.crouch], 1, false], ['hop', [JK.hop], 1, false],
    ['spin', JK.spin, 10, true], ['throw', [JK.throw], 1, false], ['kick', [JK.kick], 1, false], ['hurt', [JK.hurt], 1, false],
    ['daze', JK.daze, 8, true], ['ko', [JK.ko], 1, false],
    ['loop', [JK.loop], 1, false, JK.loop.ox, JK.loop.oy], ['rope', [JK.rope], 1, false, JK.rope.ox, JK.rope.oy]], B.OX, B.OY);
  bank = 'TH';                                     // the Train Heist: Sting, his dynamite, the bang, the tunnel's mouth and its pit-props
  const SG = T.buildSting(), TRS = T.buildTrainSprites(FLOOR);
  addGroup('SC', [['idle', SG.idle, 3, true], ['walk', SG.walk, 10, true], ['talk', SG.talk, 6, true], ['pinchw', [SG.pinchw], 1, false],
    ['pinch', [SG.pinch], 1, false], ['windup', [SG.windup], 1, false], ['sting', [SG.sting], 1, false], ['stuck', [SG.stuck], 1, false],
    ['light', [SG.light], 1, false], ['toss', [SG.toss], 1, false], ['duck', [SG.duck], 1, false], ['hurt', [SG.hurt], 1, false],
    ['daze', SG.daze, 8, true], ['ko', [SG.ko], 1, false],
    ['stick', SG.stick, 14, true, SG.stick[0].ox, SG.stick[0].oy]], B.OX, B.OY);
  addGroup('TP', [['portal', [TRS.portal], 1, false, TRS.portal.ox, TRS.portal.oy]], 0, 0);              // (mirrored: the way out)
  addGroup('TQ', [['boom', SG.boom, 1, false, SG.boom[0].ox, SG.boom[0].oy], ['prop', [TRS.prop], 1, false, TRS.prop.ox, TRS.prop.oy]], 0, 0, false);
  bank = 'MI';                                     // the Mission: El Toro, and the splinters off the church doors
  const TO = T.buildToro(), MSP = T.buildMissionSprites();
  addGroup('TO', [['idle', TO.idle, 3, true], ['walk', TO.walk, 7, true], ['talk', TO.talk, 6, true], ['paw', TO.paw, 6, true],
    ['charge', TO.charge, 12, true], ['stuck', TO.stuck, 10, true], ['hookw', [TO.hookw], 1, false], ['hook', [TO.hook], 1, false],
    ['rear', [TO.rear], 1, false], ['stomp', [TO.stomp], 1, false], ['hurt', [TO.hurt], 1, false], ['daze', TO.daze, 8, true],
    ['ko', [TO.ko], 1, false], ['splint', [MSP.splinter], 1, false, MSP.splinter.ox, MSP.splinter.oy]], B.OX, B.OY);
  bank = 'HN';                                     // High Noon: Diamondback, the town clock's hands
  const DBK = T.buildDiamondback(), NSP = T.buildNoonSprites();
  addGroup('DB', [['idle', DBK.idle, 2, true], ['walk', DBK.walk, 8, true], ['talk', DBK.talk, 6, true], ['draw', [DBK.draw], 1, false],
    ['fire', [DBK.fire], 1, false], ['reload', DBK.reload, 4, true], ['coil', [DBK.coil], 1, false], ['strike', [DBK.strike], 1, false],
    ['stretch', [DBK.stretch], 1, false], ['whip', DBK.whip, 10, true], ['hurt', [DBK.hurt], 1, false], ['daze', DBK.daze, 8, true],
    ['ko', [DBK.ko], 1, false], ['nogun', DBK.nogun, 3, true]], B.OX, B.OY);
  addGroup('CH', [['hands', NSP.hands, 1, false, 16, 16]], 16, 16, false);
  bank = 'EN';                                     // the ending: the snakeskin boot that twitches (over the shop's bitmap)
  addGroup('BO', [['boot', EN.shopBoot, 1, false, EN.shopBoot[0].ox, EN.shopBoot[0].oy]], 0, 0, false);
  bank = null;
  for (const rec of frameRecs) for (const c of rec) if (c.dx < -128 || c.dx > 127 || c.dy < -128 || c.dy > 127) throw new Error('cell offset out of range');

  const sprites = new Uint8Array(OVL_BASE * 1024);              // the shared cells, padded to the overlay's block
  cellData.forEach((b, i) => sprites.set(b, i * 1024));
  const ovl = {};
  for (const k in banks) { ovl[k] = new Uint8Array(banks[k].cells.length * 1024); banks[k].cells.forEach((b, i) => ovl[k].set(b, i * 1024)); }
  const OVL_N = Math.max(...Object.values(banks).map(b => b.cells.length));
  const fsize = 2 + frameRecs.length * 2 + frameRecs.reduce((s, r) => s + 1 + r.length * 4, 0);
  const frames = new Uint8Array(fsize), dv = new DataView(frames.buffer);
  dv.setUint16(0, frameRecs.length);
  let o = 2 + frameRecs.length * 2;
  frameRecs.forEach((rec, i) => {
    dv.setUint16(2 + i * 2, o);
    frames[o++] = rec.length;
    for (const c of rec) { dv.setInt8(o++, c.dx); dv.setInt8(o++, c.dy); dv.setUint16(o, c.cell); o += 2; }
  });

  // the frame records for tsk, out of its data area (tskview still reads frames.bin): one 8K graphics block holds the
  // shared frames' records (frr.bin, loaded once) and, after them, the current stage's (frr_<s>.bin, loaded with the
  // stage); fri.bin is every frame's offset into that block (2 bytes each, big-endian). A stage's frames are never
  // drawn on another stage, so one index serves all of them.
  const bankOf = new Array(frameRecs.length).fill(null);
  for (const g of groups) { const n = g.n * (g.mirror ? 2 : 1); for (let i = 0; i < n; i++) bankOf[g.first + i] = g.bank; }
  const recBytes = rec => { const b = new Uint8Array(1 + rec.length * 4), dv2 = new DataView(b.buffer); b[0] = rec.length;
    rec.forEach((c, k) => { dv2.setInt8(1 + k * 4, c.dx); dv2.setInt8(2 + k * 4, c.dy); dv2.setUint16(3 + k * 4, c.cell); }); return b; };
  const frParts = { null: [] }, frLen = { null: 0 }, frOff = new Array(frameRecs.length);
  frameRecs.forEach((rec, i) => { const k = bankOf[i]; if (k !== null) return; const b = recBytes(rec); frOff[i] = frLen.null; frParts.null.push(b); frLen.null += b.length; });
  const FRR_SH = frLen.null;
  frameRecs.forEach((rec, i) => {
    if (bankOf[i] === null) return;
    const b = recBytes(rec), offs = [].concat(bankOf[i]).map(k => {
      frParts[k] = frParts[k] || []; frLen[k] = frLen[k] || 0;
      const o4 = FRR_SH + frLen[k]; frParts[k].push(b); frLen[k] += b.length; return o4;
    });
    if (offs.some(o4 => o4 !== offs[0])) throw new Error('a two-bank group not first in both banks');
    frOff[i] = offs[0];
  });
  const cat = parts => { const n = parts.reduce((a, b) => a + b.length, 0), o2 = new Uint8Array(n); let q = 0; for (const b of parts) { o2.set(b, q); q += b.length; } return o2; };
  const FRR_MAX = Math.max(...Object.keys(frLen).filter(k => k !== 'null').map(k => frLen[k]));
  if (FRR_SH + FRR_MAX > 8192) throw new Error(`frame records: ${FRR_SH} shared + ${FRR_MAX} a stage > 8192 (one block)`);
  const fri = new Uint8Array(frameRecs.length * 2), fdv = new DataView(fri.buffer);
  frOff.forEach((o3, i) => fdv.setUint16(i * 2, o3));

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
  T.bossBar('A', 1, 2);                          // the HUD bar's colours into the sprite CLUT before it's packed
  for (const h of HUDCOLS) shIdx(T.CLUT.spr.add(h[1]));   // the HUD's colours (drawn by the 6809): shared entries
  const NSH = shCols.length - 1, palOf = k => {   // a stage's whole sprite CLUT: the shared colours and its own
    const cols = shCols.slice(); const B = PB[k] || { cols: [] };
    if (NSH + B.cols.length > 255) throw new Error(`sprite CLUT: ${NSH} shared + ${B.cols.length} of stage ${k} > 255`);
    for (let i = cols.length; i < 256; i++) cols.push(null);
    B.cols.forEach((h, j) => { cols[255 - j] = h; });
    return clut(cols);
  };
  const F = T.rgb('#e4e0ff');
  const shades = pal => {
    const N = 61, out = new Uint8Array(N * 1024);
    for (let st = 0; st < N; st++) out.set(clut(pal, c => c.map((v, j) => Math.round(v * (1 - st / 100) + T.NIGHT[j] * st / 100))), st * 1024);
    pal.forEach((h, i) => {                       // the lights: unshaded in every step
      if (!h || !T.MAIN_STREET_LIGHTS.has(h.toLowerCase())) return;
      const [r, g, bl] = T.rgb(h);
      for (let st = 0; st < N; st++) { const o = st * 1024 + i * 4; out[o] = bl; out[o + 1] = g; out[o + 2] = r; }
    });
    return out;
  };
  const files = {
    'sprites.bin': sprites,
    'spr_bh.bin': ovl.BH, 'spr_ms.bin': ovl.MS, 'spr_gt.bin': ovl.GT, 'spr_cd.bin': ovl.CD, 'spr_th.bin': ovl.TH, 'spr_mi.bin': ovl.MI, 'spr_hn.bin': ovl.HN, 'spr_en.bin': ovl.EN,
    'tiles_bh.bin': STAGES[0].tiles, 'maps_bh.bin': STAGES[0].mapBytes,
    'tiles_ms.bin': STAGES[1].tiles, 'maps_ms.bin': STAGES[1].mapBytes,
    'tiles_gt.bin': STAGES[2].tiles, 'maps_gt.bin': STAGES[2].mapBytes,
    'tiles_cd.bin': STAGES[3].tiles, 'maps_cd.bin': STAGES[3].mapBytes,
    'tiles_th.bin': STAGES[4].tiles, 'maps_th.bin': STAGES[4].mapBytes,
    'tiles_mi.bin': STAGES[5].tiles, 'maps_mi.bin': STAGES[5].mapBytes,
    'tiles_hn.bin': STAGES[6].tiles, 'maps_hn.bin': STAGES[6].mapBytes, 'tiles_en.bin': STAGES[7].tiles, 'maps_en.bin': STAGES[7].mapBytes,
    'bmp_shop.bin': Uint8Array.from(EN.shopBmp.idx), 'clut_shop.bin': clut([null, ...EN.shopBmp.pal]),   // the shop: 320x240 8bpp, its CLUT
    'frames.bin': frames,
    'fri.bin': fri, 'frr.bin': cat(frParts.null), 'frr_bh.bin': cat(frParts.BH), 'frr_ms.bin': cat(frParts.MS), 'frr_gt.bin': cat(frParts.GT), 'frr_cd.bin': cat(frParts.CD), 'frr_th.bin': cat(frParts.TH), 'frr_mi.bin': cat(frParts.MI), 'frr_hn.bin': cat(frParts.HN), 'frr_en.bin': cat(frParts.EN),
    'clut_spr.bin': clut(shCols),                 // the shared colours only (tskview; tsk loads a stage's pal_<s>)
    'pal_bh.bin': palOf('BH'), 'pal_ms.bin': palOf('MS'), 'pal_gt.bin': palOf('GT'), 'pal_cd.bin': palOf('CD'), 'pal_th.bin': palOf('TH'), 'pal_mi.bin': palOf('MI'), 'pal_hn.bin': palOf('HN'), 'pal_en.bin': palOf('EN'),
    // the tile palettes: a stage's own (tpal_<s>); clut_tile is Boot Hill's (the title, tskview), clut_flash Boot
    // Hill's lightning-lit
    'tpal_bh.bin': clut(STAGES[0].pal), 'tpal_ms.bin': clut(STAGES[1].pal), 'tpal_gt.bin': clut(STAGES[2].pal),
    'tpal_cd.bin': clut(STAGES[3].pal), 'tpal_th.bin': clut(STAGES[4].pal), 'tpal_mi.bin': clut(STAGES[5].pal), 'tpal_hn.bin': clut(STAGES[6].pal), 'tpal_en.bin': clut(STAGES[7].pal),
    'clut_tile.bin': clut(STAGES[0].pal),
    'clut_flash.bin': clut(STAGES[0].pal, c => c.map((v, j) => Math.round(v * 0.35 + F[j] * 0.65))),   // lightning
    // the shades (mainstreet.js shadeOf), Main Street's night falling and the train's tunnels: 61 tile CLUTs of the
    // stage's palette, shade 0 .. 0.60 toward NIGHT in steps of 0.01 (fine enough that the F256 can fade, as the
    // browser does; 13 steps of 0.05 looked abrupt on the K2). The lights (windows, lamps, the sun) keep their colour.
    // 1K each, back to back.
    'shade_ms.bin': shades(STAGES[1].pal), 'shade_th.bin': shades(STAGES[4].pal), 'shade_mi.bin': shades(STAGES[5].pal),   // (the Mission: night falling over the siege)
  };

  // ---------------------------------------------------------------- the generated defs file
  const hex = (n, w = 4) => '$' + n.toString(16).toUpperCase().padStart(w, '0');
  const L = [
    '* tskassets.d: GENERATED by f256/tools/export.py from game/js (the browser prototype). Do not edit.',
    '* The contract between the exporter and the 6809 source: rebuild the assets and this file together.',
    '',
    '* screen and maps',
    `TS.Size  equ ${TS}           tile size`,
    `MAP.H    equ ${MAP_H}           map height in tiles`,
    `LEVEL.W  equ ${LEVEL_W}         Boot Hill's width (tskview)`,
    `FLOOR.Y  equ ${FLOOR}          screen y of the back of the floor`,
    `CLUT.Spr equ ${CLUT_SPR}`, `CLUT.Fls equ ${CLUT_FLASH}`, `CLUT.Gst equ ${CLUT_GHOST}`, `CLUT.Til equ ${CLUT_TILE}`,
    '',
    '* the stages: each has its own tiles_<s>.bin and maps_<s>.bin (three maps back to back, 2 bytes a cell),',
    '* loaded into the same blocks; TIL.*, MAP.Size are the largest, for allocating them',
  ];
  for (const st of STAGES) {
    L.push(`${st.key}.W     equ ${st.W}         ${st.key}: level width in pixels`);
    L.push(`${st.key}.TIL.N  equ ${st.n}`, `${st.key}.TIL.Sets equ ${st.sets}`, `${st.key}.TIL.Size equ ${hex(st.tiles.length, 6)}`);
    st.maps.forEach((m, i) => {
      L.push(`${st.key}.MAP${i}.W equ ${m.w}         ${m.name}: width in tiles, scrolls at ${m.rate}x`);
      L.push(`${st.key}.MAP${i}.Of equ ${hex(m.of)}`);
    });
    L.push(`${st.key}.MAP.Size equ ${hex(st.mapBytes.length)}`, '');
  }
  L.push(`TIL.Sets equ ${Math.max(...STAGES.map(st => st.sets))}`, `TIL.Size equ ${hex(Math.max(...STAGES.map(st => st.tiles.length)), 6)}`,
    `MAP.Size equ ${hex(Math.max(...STAGES.map(st => st.mapBytes.length)))}`, '');
  L.push('* tskview shows Boot Hill', ...STAGES[0].maps.flatMap((m, i) => [`MAP${i}.W  equ ${m.w}`, `MAP${i}.Of equ ${hex(m.of)}`]), '');
  L.push('* sprites.bin: the shared 1K cells, padded to SPR.Base; spr_<s>.bin: a stage\'s own, loaded at cell SPR.Base',
    `SPR.N    equ ${cellData.length}         shared cells`, `SPR.Base equ ${OVL_BASE}         the first stage cell (a block boundary)`,
    `SPR.Ovl  equ ${OVL_N}         the most stage cells`, `SPR.Size equ ${hex((OVL_BASE + OVL_N) * 1024, 6)}    bytes of sprite RAM in all`,
    `SPR.ShSize equ ${hex(sprites.length, 6)}  sprites.bin`, '');
  L.push('* frames.bin', `FRM.N    equ ${frameRecs.length}         frames`, `FRM.Size equ ${hex(frames.length)}`, '');
  L.push('* tsk: the frame records in one block (frr.bin, then the stage\'s frr_<s>.bin at FRR.Sh), fri.bin the index',
    `FRR.Sh   equ ${FRR_SH}        the shared records' length: a stage's load here`, `FRR.Max  equ ${FRR_MAX}        the biggest stage's`, '');
  L.push('* animations: <group>.<anim> = first frame (facing right), .N = frame count, .T = ticks a frame (60 Hz)');
  L.push('* the mirrored (facing left) copy of frame f is f + <group>.Mir');
  for (const g of groups) {
    L.push(`${g.prefix}.First equ ${g.first}`, `${g.prefix}.Mir equ ${g.mirror ? g.n : 0}`);
    for (const a of g.list) {
      const nm = g.prefix + '.' + a.name;
      L.push(`${nm.padEnd(14)} equ ${g.first + a.first}`);
      L.push(`${(nm + '.N').padEnd(14)} equ ${a.frames.length}`);
      L.push(`${(nm + '.T').padEnd(14)} equ ${Math.max(1, Math.round(60 / a.fps))}`);
    }
    L.push('');
  }
  const defs = L.join('\n') + '\n';

  // the hero's attack boxes (sprites.js autoHit), one per facing-right frame: dx, dy (from the feet, dy up is
  // negative), w, h; w = 0 = no box. Mirrored frames use the same box, flipped by the game.
  const hr = groups.find(g => g.prefix === 'HR'), TB = [
    '* tsktabs.a: GENERATED by f256/tools/export.py from game/js (the browser prototype). Do not edit.',
    '* HitTab: the hero\'s attack box per frame (HR.First..HR.Mir-1): dx, dy, w, h from the feet; w = 0 = none.',
    'HitTab',
  ];
  for (const a of hr.list) {
    const hits = HERO[a.name].hits || {};
    a.frames.forEach((f, i) => {
      const b = hits[i] || [0, 0, 0, 0];
      if (b.some(v => v < -128 || v > 127)) throw new Error('hit box out of range');
      TB.push(`                    fcb       ${b.join(',')}`.padEnd(56) + `${a.name} ${i}`);
    });
  }
  // the death scene's hand: where his front hand is (dx, dy from the feet, facing right) flat out reaching, and
  // in each frame of getting up; the hat rides there (sprites.js handAt)
  TB.push('', '* HandTab: the front hand, dx, dy from the feet: reach 0, then getup 0..n-1 (the death scene\'s hat rides it)', 'HandTab');
  for (const [a, f] of [['reach', 0], ...HERO.getup.hand.map((_, i) => ['getup', i])]) {
    const [x, y] = HERO[a].hand[f];
    TB.push(`                    fcb       ${Math.round(x)},${Math.round(y)}`.padEnd(56) + `${a} ${f}`);
  }
  // GlyTab: the HUD font (brawler.js drawText, 3x5 with a 1-pixel outline) as 5x7 stamps, ASCII 32..90:
  // 35 bytes each, row by row, 0 = clear, 1 = outline, 2 = fill (the colours come from the caller)
  TB.push('', '* GlyTab: the HUD font as 5x7 stamps for ASCII 32-90, 35 bytes each, column by column (7 rows down each of',
    '* 5 columns): 0 clear, 1 outline, 2 fill.', 'GlyTab');
  for (let c = 32; c <= 90; c++) {
    const g = T.GLYPH[String.fromCharCode(c)] || T.GLYPH['?'], st = new Array(35).fill(0);
    for (let p = 0; p < 15; p++) if (g[p] === '#') {
      const x = (p % 3) + 1, y = Math.floor(p / 3) + 1;
      for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) if (!st[(y + dy) * 5 + x + dx]) st[(y + dy) * 5 + x + dx] = 1;
    }
    for (let p = 0; p < 15; p++) if (g[p] === '#') st[(Math.floor(p / 3) + 1) * 5 + (p % 3) + 1] = 2;
    for (let col = 0; col < 5; col++) TB.push(`                    fcb       ${[0, 1, 2, 3, 4, 5, 6].map(r => st[r * 5 + col]).join(',')}` + (col ? '' : `           '${c === 39 ? '`' : String.fromCharCode(c)}'`));
  }
  // the HUD's colours, as sprite CLUT indices
  const ci = h => shIdx(T.CLUT.spr.add(h));
  TB.push('', '* the HUD colours (sprite CLUT indices)');
  for (const [n, h] of HUDCOLS)
    TB.push(`CI.${n.padEnd(15)} equ       ${ci(h)}`);
  const tabs = TB.join('\n') + '\n';

  // stats for the report
  const report = { stages: STAGES.map(st => ({ key: st.key, tiles: st.n, sets: st.sets, maps: st.maps.map(m => ({ name: m.name, w: m.w })) })),
    cells: cellData.length, ovl: Object.fromEntries(Object.entries(banks).map(([k, b]) => [k, b.cells.length])), frames: frameRecs.length,
    sprClut: { shared: NSH, ...Object.fromEntries(Object.entries(PB).map(([k, b]) => [k, b.cols.length])) }, tileClut: Object.fromEntries(STAGES.map(st => [st.key, st.pal.length - 1])), sizes: Object.fromEntries(Object.entries(files).map(([k, v]) => [k, v.length])) };

  // hand everything to export.py through the DOM, base64-encoded
  const b64 = u8 => { let s = ''; for (let i = 0; i < u8.length; i += 0x8000) s += String.fromCharCode(...u8.subarray(i, i + 0x8000)); return btoa(s); };
  const out = { report, defs, tabs, files: Object.fromEntries(Object.entries(files).map(([k, v]) => [k, b64(v)])) };
  const pre = document.createElement('pre');
  pre.id = 'tskexport'; pre.textContent = JSON.stringify(out);
  document.body.innerHTML = ''; document.body.appendChild(pre);
};
})();
