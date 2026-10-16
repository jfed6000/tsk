// Texas Shitkickers — prototype: the hero, his moveset, and the levels (Boot Hill, and the desert test range).
//
// The web view obeys the F256 display rules so the art and the layout carry straight over:
//   * 320x240, three tile-map layers (back sky, middle hill, front ground/props), 16x16 tiles
//   * everything that moves, plus HUD and text, is hardware sprites: 32x32 cells, at most 128 records
//   * no rotation, no alpha, no flipping in hardware: mirrored frames are their own data; the hit flash, the
//     afterimages and the lightning are CLUT swaps; spinning is pre-drawn frames
(function () {
'use strict';
const T = window.TSK;
const VW = 320, VH = 240, GROUND = 208, TS = 16;
const MAX_SPRITES = 128;
const GRAV = 1500, RUN = 150, JUMP = 470, MAXFALL = 620;
const PW = 16, PH = 38;            // player collision box (feet-centred)
const EW = 22, EH = 16;            // dillo collision box
const BW = 20, BH = 14;            // buzzard collision box (centred)
const MAX_HP = 3;
const params = new URLSearchParams(location.search);
const LV = T.LEVELS[params.get('level')] || T.LEVELS.boothill;
const LEVEL_W = LV.W;

// ---------------------------------------------------------------- assets
const HERO = T.buildHero();
const SIDE_HIT0 = Math.min(...Object.keys(HERO.side.hits).map(Number));   // first frame of the side kick that connects
const DILLO = T.buildDillo();
const BARREL = T.buildBarrel();
const FX = T.buildFx();
const TILES = T.buildTiles(LV.theme);
const LAYERS = T.buildLayers(VW, VH, GROUND, LV.theme);
const STATS = { far: T.tileStats(LAYERS.far), mid: T.tileStats(LAYERS.mid) };
const BUZZ = T.buildBuzzard();
const COYOTE = T.buildCoyote();
const PROPS = T.buildProps();
const HAT = T.buildHat();

// ---------------------------------------------------------------- sprite-sheet viewer (?sheet, ?lineup)
if (params.has('sheet') || params.has('lineup')) {
  let sheet;
  if (params.has('lineup')) {   // the key poses side by side, at game scale
    const rows = [
      [['STANDING', 'idle', 0], ['TURN', 'turn', 0], ['RUN', 'run', 0], ['', 'run', 1], ['', 'run', 2], ['', 'run', 3], ['', 'run', 4], ['', 'run', 5]],
      [['JUMP', 'jump', 0], ['FALL', 'jump', 2], ['SNAP', 'snap', 1], ['SIDE', 'side', 3], ['BICYCLE', 'bike', 0], ['', 'bike', 3], ['STOMP', 'stomp', 2], ['TIP HAT', 'taunt', 4]],
    ];
    const cw = 72, chh = 56;
    sheet = T.canvas(8 + 8 * cw, rows.length * (chh + 12) + 4);
    const ctx = sheet.getContext('2d');
    rows.forEach((row, r) => row.forEach(([label, a, f], i) => {
      const y = 4 + r * (chh + 12);
      if (label) T.drawText(ctx, label, 6 + i * cw, y, '#f3cf93', 1);
      ctx.drawImage(HERO[a].frames[f], 14, 16, cw, chh, 4 + i * cw, y + 8, cw, chh);
    }));
  } else {
    const C = COYOTE;
    sheet = T.buildSheet({ hero: HERO, barrel: BARREL, tiles: TILES, stats: STATS, rows: [
      ['dillo walk', DILLO.walk], ['dillo ball', DILLO.ball],
      ['buzzard', [BUZZ.perch, ...BUZZ.fly, BUZZ.dive]],
      ['two-bit', [...C.idle, ...C.walk, C.windup, C.swing, C.throw]],
      ['two-bit 2', [C.dig, C.pop, ...C.daze, C.hurt, C.ko, ...C.talk]],
      ['skeleton', (() => { const K = T.buildSkeleton(); return [...K.idle, ...K.walk, K.aim, K.shoot, ...K.reload, K.hurt]; })()],
      ['skeleton 2', (() => { const K = T.buildSkeleton(); return [...K.headless, K.heap, ...K.rise, ...K.skull, K.hat, ...K.bones, K.bullet]; })()],
      ['props', [PROPS.headstone, PROPS.mound, PROPS.hole, ...PROPS.lantern, PROPS.clod, ...PROPS.digMound, HAT, BARREL]],
    ] }, true);
  }
  document.body.classList.add('sheet');
  const s = +(params.get('scale') || 3);
  sheet.style.width = sheet.width * s + 'px';
  sheet.style.height = sheet.height * s + 'px';
  document.getElementById('app').replaceWith(sheet);
  return;
}

// ---------------------------------------------------------------- level geometry (all on the 16 px grid)
const GROUND_SEGS = LV.ground;
const SOLIDS = GROUND_SEGS.map(([a, b]) => ({ x: a, y: GROUND, w: b - a, h: 200, ground: true }));
for (const [x, y] of LV.blocks) SOLIDS.push({ x, y, w: TS, h: TS, block: true });
SOLIDS.push({ x: -40, y: -400, w: 40, h: 800 }, { x: LEVEL_W, y: -400, w: 40, h: 800 });
const PLATS = LV.plats.map(([x, y, w]) => ({ x, y, w, h: 7 }));
const SIGNS = LV.signs.map(([x, text]) => ({ x, img: T.signSprite(text) }));
const CHECKS = LV.checkpoints.map(x => ({ x, lit: false }));

// front tile map: what the F256's layer-0 map holds, one tile number per cell
const MAP_W = LEVEL_W / TS, MAP_H = VH / TS;
const FRONT = Array.from({ length: MAP_H }, () => new Array(MAP_W).fill(null));
(function buildFront() {
  const gr = GROUND / TS;
  for (let tx = 0; tx < MAP_W; tx++) {
    const x = tx * TS, seg = GROUND_SEGS.find(([a, b]) => x >= a && x < b);
    if (!seg) { FRONT[gr][tx] = TILES.pitT; FRONT[gr + 1][tx] = TILES.pitB; continue; }
    const edge = x === seg[0] && x > 0 ? 'L' : x + TS === seg[1] && seg[1] < LEVEL_W ? 'R' : null;
    const v = (tx * 7 + (tx >> 2)) % 4;
    FRONT[gr][tx] = TILES['top' + (edge || v)];
    FRONT[gr + 1][tx] = TILES['low' + (edge || v)];
  }
  for (const p of PLATS) for (let x = p.x; x < p.x + p.w; x += TS)
    FRONT[p.y / TS][x / TS] = TILES[x === p.x ? 'plankL' : x + TS >= p.x + p.w ? 'plankR' : 'plankM'];
  for (const [x, y, tile] of LV.blocks) FRONT[y / TS][x / TS] = TILES[tile];
})();

// ---------------------------------------------------------------- input
const keys = {}, pressed = {};
const BIND = {
  left: ['ArrowLeft', 'KeyA'], right: ['ArrowRight', 'KeyD'], up: ['ArrowUp', 'KeyW'], down: ['ArrowDown', 'KeyS'],
  jump: ['Space', 'KeyZ', 'KeyK'], snap: ['KeyX', 'KeyJ'], side: ['KeyC', 'KeyL'], taunt: ['KeyT'],
  help: ['KeyH'], mute: ['KeyM'], sheet: ['KeyP'], info: ['KeyI'],
};
const codeToAct = {};
for (const a in BIND) for (const c of BIND[a]) codeToAct[c] = a;
addEventListener('keydown', e => {
  const a = codeToAct[e.code]; if (!a) return;
  e.preventDefault();
  if (!keys[a]) pressed[a] = true;
  keys[a] = true;
  initAudio();
});
addEventListener('keyup', e => { const a = codeToAct[e.code]; if (a) keys[a] = false; });
addEventListener('blur', () => { for (const k in keys) keys[k] = false; });

const padPrev = {};
function pollPad() {
  const gp = navigator.getGamepads ? [...navigator.getGamepads()].find(Boolean) : null;
  if (!gp) return;
  const b = i => gp.buttons[i] && gp.buttons[i].pressed;
  const st = {
    left: b(14) || gp.axes[0] < -0.4, right: b(15) || gp.axes[0] > 0.4,
    up: b(12) || gp.axes[1] < -0.5, down: b(13) || gp.axes[1] > 0.5,
    jump: b(0), snap: b(2), side: b(1), taunt: b(3),
  };
  for (const a in st) {
    if (st[a] && !padPrev[a]) pressed[a] = true;
    if (st[a] !== padPrev[a]) keys[a] = st[a];
    padPrev[a] = st[a];
  }
}

// attract / test mode: ?demo plays a scripted run through the moveset (on the test range)
const DEMO = params.has('demo') ? [
  [0.3, 'right', 1], [1.0, 'snap'], [1.5, 'jump'], [1.9, 'snap'], [2.8, 'side'], [3.4, 'jump'],
  [3.7, 'down'], [4.6, 'right', 0], [4.7, 'taunt'], [5.8, 'right', 1], [6.2, 'jump'], [6.4, 'side'],
  [7.3, 'jump'], [7.55, 'snap'], [8.5, 'side'], [9.3, 'jump'], [9.6, 'down'],
] : null;
let demoT = 0, demoI = 0, demoRelease = [];
function runDemo(dt) {
  if (!DEMO || phase !== 'play') return;
  demoT += dt;
  demoRelease = demoRelease.filter(([t, a]) => (t <= demoT ? (keys[a] = false) : true));
  while (demoI < DEMO.length && DEMO[demoI][0] <= demoT) {
    const [, a, hold] = DEMO[demoI++];
    if (hold === undefined) { pressed[a] = true; keys[a] = true; demoRelease.push([demoT + 0.12, a]); }
    else { if (hold && !keys[a]) pressed[a] = true; keys[a] = !!hold; }
  }
  if (demoI >= DEMO.length && demoT > DEMO[DEMO.length - 1][0] + 2) {
    demoT = 0; demoI = 0; resetPlayer(LV.start);
  }
}

// ---------------------------------------------------------------- audio (placeholder: WebAudio blips)
let ac = null, noiseBuf = null, muted = false;
function initAudio() {
  if (ac) { if (ac.state === 'suspended') ac.resume(); return; }
  try {
    ac = new (window.AudioContext || window.webkitAudioContext)();
    noiseBuf = ac.createBuffer(1, ac.sampleRate * 1.5, ac.sampleRate);
    const d = noiseBuf.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
  } catch (e) { ac = null; }
}
function tone(type, f0, f1, dur, vol, delay = 0) {
  const t = ac.currentTime + delay, o = ac.createOscillator(), g = ac.createGain();
  o.type = type; o.frequency.setValueAtTime(f0, t); o.frequency.exponentialRampToValueAtTime(Math.max(1, f1), t + dur);
  g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(0.001, t + dur);
  o.connect(g).connect(ac.destination); o.start(t); o.stop(t + dur);
}
function noise(dur, vol, filt, f0, f1, delay = 0) {
  const t = ac.currentTime + delay, s = ac.createBufferSource(), f = ac.createBiquadFilter(), g = ac.createGain();
  s.buffer = noiseBuf; f.type = filt; f.frequency.setValueAtTime(f0, t);
  f.frequency.exponentialRampToValueAtTime(f1, t + dur);
  g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(0.001, t + dur);
  s.connect(f).connect(g).connect(ac.destination); s.start(t); s.stop(t + dur);
}
function sfx(k) {
  if (!ac || muted) return;
  switch (k) {
    case 'jump': tone('square', 200, 520, 0.12, 0.05); break;
    case 'whoosh': noise(0.13, 0.18, 'bandpass', 600, 2400); break;
    case 'hit': noise(0.1, 0.35, 'lowpass', 2000, 200); tone('square', 140, 50, 0.12, 0.12); break;
    case 'ko': noise(0.18, 0.4, 'lowpass', 3000, 150); tone('sawtooth', 220, 40, 0.25, 0.1); break;
    case 'stomp': tone('sine', 110, 28, 0.45, 0.55); noise(0.3, 0.35, 'lowpass', 900, 60); break;
    case 'bounce': tone('square', 300, 760, 0.1, 0.06); break;
    case 'land': noise(0.06, 0.12, 'lowpass', 800, 100); break;
    case 'break': noise(0.22, 0.3, 'highpass', 400, 2400); tone('triangle', 300, 90, 0.15, 0.1); break;
    case 'hurt': tone('sawtooth', 420, 120, 0.3, 0.1); break;
    case 'tip': tone('triangle', 660, 660, 0.1, 0.08); tone('triangle', 990, 990, 0.18, 0.08, 0.1); break;
    case 'shell': tone('square', 500, 250, 0.07, 0.05); break;
    case 'thunder': noise(1.4, 0.5, 'lowpass', 400, 40, 0.25); break;
    case 'dig': noise(0.18, 0.25, 'lowpass', 600, 120); break;
    case 'squawk': tone('sawtooth', 900, 500, 0.12, 0.05); tone('sawtooth', 700, 380, 0.12, 0.05, 0.12); break;
    case 'check': tone('triangle', 520, 520, 0.08, 0.08); tone('triangle', 780, 780, 0.2, 0.08, 0.08); break;
    case 'win': [523, 659, 784, 1046].forEach((f, i) => tone('square', f, f, 0.16, 0.06, i * 0.13)); break;
    case 'rattle': for (let i = 0; i < 7; i++) noise(0.035, 0.16, 'highpass', 3500, 5000, i * 0.055); break;   // a rattler coiling
    case 'card': noise(0.05, 0.2, 'bandpass', 2600, 1200); tone('square', 1400, 900, 0.04, 0.03); break;    // a card flicked
    case 'whistle': for (const [f, d, l] of [[466, 0, 0.5], [587, 0, 0.5], [698, 0, 0.5], [466, 0.6, 1.1], [587, 0.6, 1.1], [698, 0.6, 1.1]]) tone('sawtooth', f, f * 0.96, l, 0.07, d); break;   // the train's whistle: a tunnel coming
    case 'boom': noise(0.9, 0.6, 'lowpass', 1800, 60); tone('sine', 90, 30, 0.6, 0.4); break;   // dynamite
    case 'creak': tone('sawtooth', 120, 90, 0.5, 0.05); noise(0.3, 0.1, 'bandpass', 400, 200, 0.1); break;   // a pit-prop coming
    case 'roar': noise(1.6, 0.5, 'lowpass', 700, 90); tone('sine', 70, 40, 1.2, 0.3); break;    // into the tunnel
    case 'bell': for (const d of [0, 0.9]) { tone('triangle', 392, 388, 1.4, 0.14, d); tone('sine', 784, 780, 0.9, 0.05, d); tone('sine', 1176, 1170, 0.5, 0.03, d); } break;   // the mission bell: here they come
    case 'thud': noise(0.16, 0.4, 'lowpass', 500, 70); tone('sine', 90, 45, 0.18, 0.3); break;    // a blow on the church doors
    case 'tick': noise(0.018, 0.22, 'bandpass', 3200, 2600); tone('square', 1900, 1700, 0.012, 0.03); break;   // a telegraph key: the boss's name typing on
    case 'stamp': noise(0.12, 0.45, 'lowpass', 1400, 90); tone('sine', 120, 50, 0.16, 0.35); tone('square', 240, 120, 0.05, 0.05); break;   // his nickname stamped on (a WANTED poster)
    case 'bellow': tone('sawtooth', 160, 70, 0.9, 0.12); tone('sawtooth', 120, 55, 0.9, 0.08, 0.05); noise(0.6, 0.15, 'lowpass', 500, 120); break;   // Bullrush
  }
}

// ?export: build the assets and pack them for the F256 (js/export.js, driven by f256/tools/export.py)
if (params.has('export')) { T.runExport({ HERO, DILLO, COYOTE, BARREL }); return; }

// The game is the brawler (js/brawler.js), which takes over from here. The original platformer is kept for
// reference at ?mode=platformer (or any ?level=...).
if (params.get('mode') !== 'platformer' && !params.has('level')) {
  T.runBrawler({ HERO, DILLO, BARREL, FX, COYOTE, keys, pressed, sfx, pollPad, params });
  return;
}

// ---------------------------------------------------------------- world state
// phase: 'intro' (Ringo's boots climb out of the grave), 'play', 'dead' (respawning), 'clear' (level done)
let phase = LV.intro && !params.has('start') ? 'intro' : 'play', phaseT = 0;
let player, enemies = [], birds = [], barrels = [], parts = [], popups = [], clods = [], boss = null;
let camX = 0, shake = 0, hitstop = 0, score = 0, combo = 0, comboT = 0, time = 0;
let showHelp = false, showInfo = params.has('debug'), titleT = phase === 'intro' ? -99 : params.has('start') ? 99 : 0;
let respawnX = +(params.get('start') || LV.start), arenaLock = false, flashT = 0, nextBolt = 6, flicker = 0;
const arenaWall = { x: 0, y: -400, w: 16, h: 800 };
const intro = { hatX: 0, hatY: 0, hatOn: false, risen: false };

function resetPlayer(x, keepHp) {
  const hp = keepHp && player ? player.hp : MAX_HP;
  player = {
    x, y: GROUND, vx: 0, vy: 0, face: 1, onGround: true, state: 'idle', t: 1, anim: 'idle', frame: 0,
    coyote: 0, jumpBuf: 0, inv: 0, hitSet: new Set(), bikeUsed: false, trail: [], safeX: x, prevY: GROUND,
    dropT: 0, hp,
  };
}
resetPlayer(respawnX);
function spawnEnemies() {
  enemies = []; birds = [];
  for (const e of LV.enemies) {
    if (e.type === 'dillo') spawnEnemy(e.x, e.x % 2 ? -1 : 1);
    else if (e.type === 'buzzard') birds.push({ x: e.x, y: e.y, homeY: e.y, state: 'perch', t: 0, vx: 0, vy: 0, hp: 2, flash: 0, face: -1, anim: Math.random() * 3 });
  }
}
spawnEnemies();
for (const [x, y] of LV.barrels) barrels.push({ x, y, alive: true, t: 0 });
if (phase === 'intro') { intro.hatX = LV.intro.stone; intro.hatY = GROUND - 34; player.x = LV.intro.grave; }
if (params.has('start')) for (const c of CHECKS) if (c.x <= respawnX) c.lit = true;

function spawnEnemy(x, dir) {
  enemies.push({ x, y: GROUND - 1, vx: 0, vy: 0, dir, state: 'walk', t: 0, hp: 3, flash: 0, spin: 0, anim: 0, onGround: false });
}

// ---------------------------------------------------------------- physics
const overlap = (a, b) => a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
function box(e, w, h) { return { x: e.x - w / 2, y: e.y - h, w, h }; }
const birdBox = b => ({ x: b.x - BW / 2, y: b.y - BH / 2, w: BW, h: BH });

function moveBody(e, w, h, dt, oneway = true) {
  e.hitWall = 0;
  e.x += e.vx * dt;
  for (const s of SOLIDS) {
    const b = box(e, w, h);
    if (overlap(b, s) && b.y + b.h - s.y > 2) {
      if (e.x < s.x + s.w / 2) { e.x = s.x - w / 2; e.hitWall = 1; }
      else { e.x = s.x + s.w + w / 2; e.hitWall = -1; }
      e.vx = 0;
    }
  }
  const prevY = e.y;
  e.y += e.vy * dt;
  e.onGround = false;
  for (const s of SOLIDS) {
    const b = box(e, w, h);
    if (!overlap(b, s)) continue;
    if (e.vy >= 0 && prevY <= s.y + 3) { e.y = s.y; e.vy = 0; e.onGround = true; e.onSolid = s; }
    else if (e.vy < 0) { e.y = s.y + s.h + h; e.vy = 0; }
  }
  if (oneway && e.vy >= 0 && !(e.dropT > 0)) for (const p of PLATS) {
    if (e.x + w / 2 > p.x && e.x - w / 2 < p.x + p.w && prevY <= p.y + 0.5 && e.y >= p.y) {
      e.y = p.y; e.vy = 0; e.onGround = true; e.onSolid = p;
    }
  }
}

function groundAhead(x, y) {
  for (const s of SOLIDS) if (x >= s.x && x <= s.x + s.w && y + 2 >= s.y && y - 2 <= s.y) return true;
  for (const p of PLATS) if (x >= p.x && x <= p.x + p.w && Math.abs(y - p.y) < 2) return true;
  return false;
}

// ---------------------------------------------------------------- effects
function puff(x, y, n, spread = 1) {
  for (let i = 0; i < n; i++) parts.push({ k: 'dust', x: x + (Math.random() - 0.5) * 10 * spread, y: y - 2,
    vx: (Math.random() - 0.5) * 90 * spread, vy: -Math.random() * 40, life: 0.35 + Math.random() * 0.25, max: 0.6, s: Math.floor(Math.random() * 3) });
}
function spark(x, y, big) {
  parts.push({ k: 'star', x, y, life: big ? 0.18 : 0.12, max: big ? 0.18 : 0.12, big });
  for (let i = 0; i < (big ? 8 : 4); i++) {
    const a = Math.random() * Math.PI * 2, v = 80 + Math.random() * 160;
    parts.push({ k: 'bit', x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v, g: 300, life: 0.25, max: 0.25, c: i % 2 });
  }
}
function debris(x, y, n) {
  for (let i = 0; i < n; i++) parts.push({ k: 'chunk', x: x + (Math.random() - 0.5) * 12, y: y - Math.random() * 18,
    vx: (Math.random() - 0.5) * 260, vy: -100 - Math.random() * 220, g: 900, life: 1.2, max: 1.2,
    img: FX.chunk[Math.floor(Math.random() * FX.chunk.length)] });
}
function dirt(x, y, n) {   // grave dirt flying
  for (let i = 0; i < n; i++) parts.push({ k: 'chunk', x: x + (Math.random() - 0.5) * 14, y: y - 2,
    vx: (Math.random() - 0.5) * 160, vy: -120 - Math.random() * 200, g: 900, life: 0.9, max: 0.9, img: PROPS.clod });
}
function popup(x, y, text, color = '#ffd34a', s = 2, life = 0.9) { popups.push({ x, y, text, color, s, life, rise: life < 1.5 }); }

function addScore(n, x, y) {
  combo = comboT > 0 ? combo + 1 : 1; comboT = 1.4;
  const mult = Math.min(combo, 8);
  score += n * mult;
  popup(x, y - 14, (n * mult) + (mult > 1 ? ' X' + mult : ''), '#fff3c4', 1);
}

const KO_WORDS = ['YEEHAW!', 'KICKED!', 'GIT!', 'HOWDY!', 'BOOTED!', 'WHOOP!'];
const DMG = { snap: 2, side: 3, airside: 3, bike: 1, drop: 3, shock: 3 };

// ---------------------------------------------------------------- combat: dillos, buzzards, barrels
function hitEnemy(e, kind) {
  if (e.state === 'ko') return;
  const p = player, dir = Math.sign(e.x - p.x) || p.face;
  const kickDir = kind === 'shock' ? dir : p.face;
  if ((e.state === 'shell' || e.state === 'roll') && kind !== 'shock' && kind !== 'drop') {
    e.state = 'roll'; e.dir = kickDir; e.t = 0; e.vy = -80;
    e.speed = kind === 'side' || kind === 'airside' ? 420 : 320;
    spark(e.x, e.y - 9, false); sfx('hit'); hitstop = 0.05; shake = Math.max(shake, 2);
    addScore(50, e.x, e.y - 16);
    return;
  }
  const dmg = DMG[kind] || 1;
  e.hp -= dmg; e.flash = 0.1;
  spark(e.x + (kind === 'shock' ? 0 : -kickDir * 4), e.y - 10, dmg >= 2);
  if (e.hp <= 0) {
    ko(e, kickDir, kind === 'side' || kind === 'airside' ? 380 : 250);
    popup(e.x, e.y - 26, KO_WORDS[Math.floor(Math.random() * KO_WORDS.length)], '#ffd34a', 2);
  } else {
    sfx('hit'); hitstop = 0.045; shake = Math.max(shake, 2);
    e.state = 'stagger'; e.t = 0.35;
    e.vx = kickDir * (kind === 'bike' ? 60 : 130);
    e.vy = kind === 'bike' ? -170 : -110;
    addScore(10, e.x, e.y);
  }
}
function ko(e, dir, speed) {
  e.state = 'ko'; e.vx = dir * speed; e.vy = -300; e.spin = 0;
  sfx('ko'); hitstop = 0.08; shake = Math.max(shake, 4);
  addScore(200, e.x, e.y);
}
function hitBird(b, kind) {
  if (b.state === 'ko') return;
  const dir = kind === 'shock' ? Math.sign(b.x - player.x) || 1 : player.face;
  b.hp -= DMG[kind] || 1; b.flash = 0.1;
  spark(b.x, b.y, true);
  if (b.hp <= 0 || b.state === 'perch') {
    b.state = 'ko'; b.vx = dir * 260; b.vy = -260; sfx('ko'); sfx('squawk'); hitstop = 0.07; shake = Math.max(shake, 3);
    addScore(300, b.x, b.y); popup(b.x, b.y - 18, 'PLUCKED!', '#ffd34a', 2);
  } else { b.state = 'climb'; b.t = 0; b.vx = dir * 120; sfx('hit'); hitstop = 0.04; addScore(20, b.x, b.y); }
}
function breakBarrel(b) {
  b.alive = false; b.t = 9;
  debris(b.x, b.y, 12);
  sfx('break'); hitstop = 0.04; shake = Math.max(shake, 2);
  addScore(50, b.x, b.y - 20);
}

function attackBox() {
  const p = player, a = HERO[p.anim], h = a.hits && a.hits[p.frame];
  if (!h) return null;
  const [hx, hy, hw, hh] = h;
  return { x: p.face > 0 ? p.x + hx : p.x - hx - hw, y: p.y + hy, w: hw, h: hh };
}
function kindOf(state) { return { snap: 'snap', side: 'side', airside: 'airside', bike: 'bike' }[state]; }

function resolveAttacks() {
  const p = player, ab = attackBox(), kind = kindOf(p.state);
  if (!ab || !kind) return;
  for (const e of enemies) {
    if (e.state === 'ko' || p.hitSet.has(e)) continue;
    if (overlap(ab, box(e, EW, EH))) { p.hitSet.add(e); hitEnemy(e, kind); }
  }
  for (const b of birds) {
    if (b.state === 'ko' || p.hitSet.has(b)) continue;
    if (overlap(ab, birdBox(b))) { p.hitSet.add(b); hitBird(b, kind); }
  }
  for (const b of barrels) {
    if (!b.alive || p.hitSet.has(b)) continue;
    if (overlap(ab, { x: b.x - 8, y: b.y - 24, w: 16, h: 24 })) { p.hitSet.add(b); breakBarrel(b); }
  }
  for (const c of clods) if (!c.dead && overlap(ab, { x: c.x - 4, y: c.y - 4, w: 8, h: 8 })) {
    c.dead = true; spark(c.x, c.y, false); dirt(c.x, c.y, 3); sfx('hit'); addScore(10, c.x, c.y);
  }
  if (boss && !p.hitSet.has(boss) && bossHittable() && overlap(ab, bossBox())) { p.hitSet.add(boss); hitBoss(kind); }
}

function stompShock() {
  const p = player;
  shake = 7; hitstop = 0.06; sfx('stomp');
  parts.push({ k: 'ring', x: p.x, y: p.y, life: 0.35, max: 0.35 });
  puff(p.x - 10, p.y, 6, 2); puff(p.x + 10, p.y, 6, 2);
  popup(p.x, p.y - 56, 'STOMP!', '#ff8a3c', 2);
  for (const e of enemies) {
    if (e.state === 'ko') continue;
    if (Math.abs(e.x - p.x) < 70 && Math.abs(e.y - p.y) < 20) hitEnemy(e, 'shock');
  }
  for (const b of birds) if (b.state === 'perch' && Math.abs(b.x - p.x) < 60 && Math.abs(b.y - p.y) < 50) hitBird(b, 'shock');
  for (const b of barrels) if (b.alive && Math.abs(b.x - p.x) < 50 && Math.abs(b.y - p.y) < 10) breakBarrel(b);
  if (boss && bossHittable() && boss.onGround && Math.abs(boss.x - p.x) < 70) hitBoss('shock');
}

// ---------------------------------------------------------------- the hero
function setState(s) {
  const p = player;
  p.state = s; p.t = 0; p.hitSet.clear();
  if (s === 'snap' || s === 'side' || s === 'airside' || s === 'bike') sfx('whoosh');
}
function canAct(p) { return p.state === 'idle' || p.state === 'run' || p.state === 'land' || (p.state === 'taunt' && p.t > 0.3); }

function hurtPlayer(fromX) {
  const p = player;
  if (p.inv > 0 || phase !== 'play' || params.has('god')) return false;   // ?god: invulnerable, for testing
  p.hp--;
  setState('hurt'); p.inv = 1.3; p.vx = -(Math.sign(fromX - p.x) || p.face) * 160; p.vy = -230; p.onGround = false;
  sfx('hurt'); shake = Math.max(shake, 3);
  if (p.hp <= 0) die(); else popup(p.x, p.y - 50, 'OUCH!', '#ff6b4a', 2);
  return true;
}
function die() {
  phase = 'dead'; phaseT = 0;
  popup(player.x, player.y - 56, 'DAGNABBIT!', '#ff6b4a', 2, 1.6);
}
function respawn() {
  resetPlayer(respawnX); player.inv = 1.5;
  phase = 'play'; clods = [];
  if (boss && boss.state !== 'ko') startBoss();      // the boss starts over, with his health back
}

function updatePlayer(dt) {
  const p = player;
  const dir = (keys.right ? 1 : 0) - (keys.left ? 1 : 0);
  p.t += dt; p.inv = Math.max(0, p.inv - dt); p.dropT -= dt;
  p.jumpBuf = pressed.jump ? 0.12 : p.jumpBuf - dt;
  p.coyote = p.onGround ? 0.08 : p.coyote - dt;
  let grav = GRAV;
  const ground = p.onGround;

  if (canAct(p)) {
    const back = dir !== 0 && dir !== p.face;          // pressing away from where he faces
    if (dir) p.face = dir;
    const target = dir * RUN;
    const acc = dir ? 1300 : 1700;
    p.vx += Math.sign(target - p.vx) * Math.min(Math.abs(target - p.vx), acc * dt);
    if ((pressed.snap && back) || pressed.side) setState('side');   // back + kick: turn into the side kick (C: shortcut)
    else if (pressed.snap) setState('snap');
    else if (pressed.taunt && p.state !== 'taunt') { setState('taunt'); sfx('tip'); }
    else if (p.jumpBuf > 0 && keys.down && p.onSolid && !p.onSolid.ground && !p.onSolid.block) {
      p.dropT = 0.2; p.jumpBuf = 0; p.onGround = false; setState('air');
    } else if (p.jumpBuf > 0 && (p.onGround || p.coyote > 0)) {
      p.vy = -JUMP; p.onGround = false; p.jumpBuf = 0; p.coyote = 0;
      setState('air'); sfx('jump'); puff(p.x, p.y, 3);
    } else if (!p.onGround && p.coyote <= 0) setState('air');
    else if (p.state === 'taunt' && dir) setState('run');
    else if (p.state !== 'taunt' && (p.state !== 'land' || p.t > 0.12)) {
      const want = Math.abs(p.vx) > 15 || dir ? 'run' : 'idle';
      if (p.state !== want) { p.from = p.state; setState(want); }
    }
  }

  switch (p.state) {
    case 'air': {
      if (dir) p.face = dir;
      const target = dir * RUN;
      p.vx += Math.sign(target - p.vx) * Math.min(Math.abs(target - p.vx), 1000 * dt);
      if (!keys.jump && p.vy < 0) grav *= 2.4;                       // variable jump height
      if (p.jumpBuf > 0 && p.coyote > 0) { p.vy = -JUMP; p.coyote = 0; p.jumpBuf = 0; sfx('jump'); }
      if (pressed.down) { setState('stompPre'); p.vx = 0; p.vy = 0; sfx('whoosh'); }
      else if (pressed.snap && !p.bikeUsed) { setState('bike'); p.bikeUsed = true; p.vy = Math.min(p.vy, -60); }
      else if (pressed.side) setState('airside');
      break;
    }
    case 'snap':
      p.vx *= Math.pow(0.0005, dt);
      if (p.t >= HERO.snap.dur) setState('idle');
      break;
    case 'side':
      if (p.frame === SIDE_HIT0) p.vx = p.face * 110; else p.vx *= Math.pow(0.0005, dt);   // lunge as the boot lands
      if (p.t >= HERO.side.dur) setState('idle');
      break;
    case 'airside':
      p.vx = p.face * 270; grav *= 0.35; p.vy = Math.min(p.vy, 120);
      if (p.t > 0.38) setState('air');
      break;
    case 'bike':
      p.vx = p.face * 175; grav *= 0.22;
      if (p.vy > 40) p.vy = 40;
      if (Math.floor(p.t / 0.11) !== Math.floor((p.t - dt) / 0.11)) p.hitSet.clear();
      if (Math.floor(p.t / 0.18) !== Math.floor((p.t - dt) / 0.18)) sfx('whoosh');
      if (p.t > 0.72) setState('air');
      break;
    case 'stompPre':
      p.vx = 0; p.vy = -25; grav = 0;
      if (p.t > 0.16) { setState('stompFall'); p.vy = 760; }
      break;
    case 'stompFall':
      p.vx = 0; grav = 0; p.vy = 760;
      if (Math.random() < 0.5) parts.push({ k: 'line', x: p.x + (Math.random() - 0.5) * 26, y: p.y - 30 - Math.random() * 30, life: 0.15, max: 0.15 });
      for (const e of enemies) if (e.state !== 'ko' && !p.hitSet.has(e) && overlap(box(p, PW + 6, 10), box(e, EW, EH))) {
        p.hitSet.add(e); hitEnemy(e, 'drop');
      }
      break;
    case 'stompLand':
      p.vx = 0;
      if (p.t > 0.32) setState('idle');
      break;
    case 'taunt':
      p.vx *= Math.pow(0.001, dt);
      if (p.t >= HERO.taunt.dur) setState('idle');
      break;
    case 'hurt':
      if (p.t > 0.45) setState(p.onGround ? 'idle' : 'air');
      break;
  }

  p.vy = Math.min(p.vy + grav * dt, p.state === 'stompFall' ? 760 : MAXFALL);
  p.prevY = p.y;
  moveBody(p, PW, PH, dt);

  if (p.onGround && !ground) {
    p.bikeUsed = false;
    if (p.state === 'stompFall') { setState('stompLand'); stompShock(); }
    else if (['air', 'bike', 'airside', 'hurt'].includes(p.state)) {
      setState('land'); puff(p.x, p.y, 4); sfx('land');
    }
  }
  if (p.onGround && p.onSolid && p.onSolid.ground && p.x > 40) {
    const nearGap = GROUND_SEGS.some(([a, b]) => Math.abs(p.x - a) < 30 || Math.abs(p.x - b) < 30);
    if (!nearGap) p.safeX = p.x;
  }
  if (p.y > VH + 80) {             // fell in a pit (an open grave, on Boot Hill)
    const sx = p.safeX, hp = p.hp - 1;
    sfx('hurt');
    if (hp <= 0) { p.hp = 0; die(); return; }
    resetPlayer(sx); player.hp = hp; player.inv = 1.5; player.y = GROUND - 60; player.state = 'air';
    popup(sx, GROUND - 70, 'DAGNABBIT!', '#ff6b4a', 2);
    return;
  }

  // head-bounces (Mario rules) and contact damage
  const pb = box(p, PW, PH), falling = p.vy > 0;
  const airborne = ['air', 'airside', 'bike', 'hurt'].includes(p.state);
  for (const e of enemies) {
    if (e.state === 'ko') continue;
    const eb = box(e, EW, EH);
    if (!overlap(eb, pb)) continue;
    if (falling && p.prevY <= eb.y + 7 && airborne) {
      p.y = eb.y; p.vy = keys.jump ? -JUMP * 0.95 : -JUMP * 0.7; setState('air'); p.bikeUsed = false;
      sfx('bounce'); puff(e.x, eb.y, 3);
      if (e.state === 'roll') { e.state = 'shell'; e.t = 5; e.vx = 0; }
      else if (e.state !== 'shell') { e.state = 'shell'; e.t = 5; e.vx = 0; addScore(100, e.x, e.y - 10); }
      else hitEnemy(e, 'drop');
      continue;
    }
    if (e.state === 'shell' && p.state !== 'stompFall') {      // nudge a parked shell = kick it
      e.state = 'roll'; e.dir = Math.sign(e.x - p.x) || p.face; e.speed = 300; e.t = 0; sfx('shell');
      continue;
    }
    if (e.state === 'walk' && !attackBox() && p.state !== 'stompFall' && p.state !== 'stompLand') hurtPlayer(e.x);
  }
  for (const b of birds) {
    if (b.state === 'ko') continue;
    const bb = birdBox(b);
    if (!overlap(bb, pb)) continue;
    if (falling && p.prevY <= bb.y + 6 && (airborne || p.state === 'stompFall')) {
      p.y = bb.y; p.vy = -JUMP * 0.8; setState('air'); p.bikeUsed = false; sfx('bounce');
      hitBird(b, 'drop');
      continue;
    }
    if (b.state !== 'perch' && !attackBox()) hurtPlayer(b.x);
  }
  if (boss) bossContact(pb, falling, airborne);

  resolveAttacks();
  pickAnim(p);

  // afterimages for the flashy moves (drawn through the ghost CLUT)
  if (['bike', 'airside', 'stompFall'].includes(p.state) && Math.floor(time * 60) % 4 === 0)
    p.trail.push({ x: p.x, y: p.y, img: HERO[p.anim].frames[p.frame], face: p.face, life: 0.16 });
  for (const t of p.trail) t.life -= dt;
  p.trail = p.trail.filter(t => t.life > 0);

  // checkpoints: light the lantern as you pass
  for (const c of CHECKS) if (!c.lit && p.x >= c.x - 4) {
    c.lit = true; respawnX = c.x; sfx('check'); popup(c.x, GROUND - 44, 'CHECKPOINT!', '#ffd34a', 1, 1.4);
  }
  if (LV.boss && !boss && p.x > LV.boss.arenaX + 48) enterArena();
}

function pickAnim(p) {
  const at = (name, loop) => {
    const a = HERO[name]; p.anim = name;
    const f = Math.floor(p.t * a.fps);
    p.frame = loop ? f % a.frames.length : Math.min(f, a.frames.length - 1);
  };
  switch (p.state) {
    // standing still he turns to face the player, through a three-quarter frame; moving, he is in profile
    case 'idle':
      if (p.t < 0.1) { p.anim = 'turn'; p.frame = 0; }
      else { p.anim = 'idle'; p.frame = Math.floor((p.t - 0.1) * HERO.idle.fps) % HERO.idle.frames.length; }
      break;
    case 'run':
      if (p.t < 0.06 && p.from === 'idle') { p.anim = 'turn'; p.frame = 0; }
      else { p.anim = 'run'; p.frame = Math.floor(time * HERO.run.fps) % 6; }
      break;
    case 'air': p.anim = 'jump'; p.frame = p.vy < -120 ? 0 : p.vy < 120 ? 1 : 2; break;
    case 'land': at('land'); break;
    case 'snap': at('snap'); break;
    case 'side': at('side'); break;
    case 'airside': p.anim = 'airside'; p.frame = 0; break;
    case 'bike': at('bike', true); break;
    case 'stompPre': p.anim = 'stomp'; p.frame = 0; break;
    case 'stompFall': p.anim = 'stomp'; p.frame = 1; break;
    case 'stompLand': p.anim = 'stomp'; p.frame = p.t < 0.16 ? 2 : 3; break;
    case 'taunt': at('taunt'); break;
    case 'hurt': p.anim = 'hurt'; p.frame = p.t < 0.2 ? 0 : 1; break;
  }
}

// ---------------------------------------------------------------- dillos
let spawnT = 0;
const inGap = x => GROUND_SEGS.every(([a, b]) => x < a + 16 || x > b - 16);
function updateEnemies(dt) {
  for (const e of enemies) {
    e.t -= dt; e.flash -= dt; e.anim += dt;
    switch (e.state) {
      case 'walk':
        e.vx = e.dir * 34;
        if (e.onGround && !groundAhead(e.x + e.dir * 12, e.y)) e.dir *= -1;
        break;
      case 'stagger':
        e.vx *= Math.pow(0.02, dt);
        if (e.t <= 0 && e.onGround) { e.state = 'walk'; e.dir = Math.sign(player.x - e.x) || 1; }
        break;
      case 'shell':
        e.vx *= Math.pow(0.001, dt);
        if (e.t <= 0) { e.state = 'walk'; e.vy = -150; e.hp = 3; }
        break;
      case 'roll':
        e.vx = e.dir * e.speed;
        if (e.t < -4) { e.state = 'shell'; e.t = 4; }
        for (const o of enemies) if (o !== e && o.state !== 'ko' && o.state !== 'roll' && overlap(box(e, EW, EH), box(o, EW, EH))) {
          ko(o, e.dir, 300); popup(o.x, o.y - 26, 'STRIKE!', '#ffd34a', 2); spark(o.x, o.y - 8, true);
        }
        for (const b of barrels) if (b.alive && Math.abs(b.x - e.x) < 14 && Math.abs(b.y - e.y) < 10) breakBarrel(b);
        if (boss && bossHittable() && overlap(box(e, EW, EH), bossBox())) { hitBoss('side'); ko(e, -e.dir, 200); }
        break;
      case 'ko':
        e.vy += GRAV * 0.8 * dt; e.x += e.vx * dt; e.y += e.vy * dt; e.spin += dt;
        for (const o of enemies) if (o !== e && o.state !== 'ko' && overlap(box(e, EW, EH), box(o, EW, EH))) {
          ko(o, Math.sign(e.vx) || 1, 260); popup(o.x, o.y - 26, 'COMBO!', '#ffd34a', 2);
        }
        continue;
    }
    e.vy = Math.min(e.vy + GRAV * dt, MAXFALL);
    moveBody(e, EW, EH, dt);
    if (e.hitWall) {
      if (e.state === 'roll') { e.dir = -e.hitWall; sfx('shell'); spark(e.x + e.hitWall * 10, e.y - 8, false); }
      else if (e.state === 'walk') e.dir = -e.hitWall;
    }
    if (e.y > VH + 60) e.state = 'ko';
  }
  enemies = enemies.filter(e => !(e.state === 'ko' && e.y > VH + 60));

  if (LV.respawn) {          // the test range keeps itself stocked with outlaws
    const alive = enemies.filter(e => e.state !== 'ko').length;
    spawnT -= dt;
    if (alive < 6 && spawnT <= 0) {
      spawnT = 2.5;
      const x = camX + (Math.random() < 0.7 ? VW + 30 : -30);
      if (x > 60 && x < LEVEL_W - 60 && !inGap(x)) spawnEnemy(x, x > player.x ? -1 : 1);
    }
  }
  for (const b of barrels) if (!b.alive && (b.t -= dt) <= 0 && Math.abs(b.x - player.x) > 60) { b.alive = true; puff(b.x, b.y, 4); }
}

// ---------------------------------------------------------------- buzzards
// perch on a headstone -> take off when you come near -> circle overhead -> dive at you -> climb -> circle ...
function updateBirds(dt) {
  const p = player;
  for (const b of birds) {
    b.t += dt; b.flash -= dt; b.anim += dt;
    switch (b.state) {
      case 'perch':
        if (Math.abs(p.x - b.x) < 120 && phase === 'play') { b.state = 'rise'; b.t = 0; sfx('squawk'); }
        break;
      case 'rise':
        b.y -= 80 * dt; b.face = Math.sign(p.x - b.x) || b.face;
        if (b.t > 0.7) { b.state = 'circle'; b.t = 0; }
        break;
      case 'circle': {
        const tx = p.x + Math.sin(b.anim * 1.6) * 50, ty = 64 + Math.sin(b.anim * 2.6) * 10;
        b.vx += Math.sign(tx - b.x) * 220 * dt; b.vx = Math.max(-90, Math.min(90, b.vx));
        b.vy = (ty - b.y) * 2;
        b.x += b.vx * dt; b.y += b.vy * dt; b.face = Math.sign(b.vx) || b.face;
        if (b.t > 1.8 && phase === 'play') {
          const dx = p.x - b.x, dy = p.y - 20 - b.y, d = Math.hypot(dx, dy) || 1;
          b.state = 'dive'; b.t = 0; b.vx = dx / d * 210; b.vy = dy / d * 210; b.face = Math.sign(b.vx) || b.face; sfx('squawk');
        }
        break;
      }
      case 'dive':
        b.x += b.vx * dt; b.y += b.vy * dt;
        if (b.y > GROUND - 12 || b.t > 1.3) { b.state = 'climb'; b.t = 0; }
        break;
      case 'climb':
        b.vy = -120; b.vx *= Math.pow(0.4, dt); b.x += b.vx * dt; b.y += b.vy * dt;
        if (b.t > 0.8) { b.state = 'circle'; b.t = 0; }
        break;
      case 'ko':
        b.vy += GRAV * 0.7 * dt; b.x += b.vx * dt; b.y += b.vy * dt;
        break;
    }
  }
  birds = birds.filter(b => !(b.state === 'ko' && b.y > VH + 40));
}

// ---------------------------------------------------------------- the boss: Two-Bit, the coyote gravedigger
// walk -> (close) wind up + shovel swing | (far) fling three dirt clods | (every third time) dig under and burst
// up beneath you, which leaves him dazed and open. Contact hurts, except while he's dazed or recovering.
const BOSS_HP = 16;
function enterArena() {
  arenaLock = true;
  arenaWall.x = LV.boss.arenaX - 16; SOLIDS.push(arenaWall);
  startBoss();
}
function startBoss() {
  const B = LV.boss;
  boss = { x: B.arenaX + 260, y: GROUND, vx: 0, vy: 0, face: -1, hp: BOSS_HP, state: 'intro', t: 0, n: 0, flash: 0, mx: 0, onGround: true, said: false };
  clods = [];
}
const bossBox = () => box(boss, 22, 44);
const bossHittable = () => boss && !['intro', 'under', 'rumble', 'ko', 'dig'].includes(boss.state);
function bossSet(s) { boss.state = s; boss.t = 0; }

function hitBoss(kind) {
  const b = boss, dazed = b.state === 'daze';
  let dmg = { snap: 2, side: 3, airside: 3, bike: 1, drop: 2, shock: 2 }[kind] || 1;
  if (dazed) dmg = Math.ceil(dmg * 1.5);
  b.hp -= dmg; b.flash = 0.12;
  spark(b.x - player.face * 6, b.y - 24, true); sfx('hit'); hitstop = 0.06; shake = Math.max(shake, 3);
  score += dmg * 50;
  if (b.hp <= 0) {
    b.hp = 0; bossSet('ko'); b.vx = player.face * 180; b.vy = -420; b.face = -player.face;
    sfx('ko'); hitstop = 0.18; shake = 9; score += 5000;
    popup(b.x, b.y - 60, 'YEEHAW!', '#ffd34a', 3, 1.6);
    clods = [];
  } else if (b.state === 'walk' || b.state === 'recover' || b.state === 'throw') {
    bossSet('hurt'); b.vx = player.face * 80;
  }
}

function bossContact(pb, falling, airborne) {
  const b = boss, p = player;
  if (b.state === 'ko' || b.state === 'under' || b.state === 'intro') return;
  const bb = bossBox();
  if (b.state === 'rumble') return;
  if (overlap(bb, pb)) {
    if (falling && p.prevY <= bb.y + 8 && (airborne || p.state === 'stompFall') && !p.hitSet.has(b)) {
      p.y = bb.y; p.vy = -JUMP * 0.85; setState('air'); p.bikeUsed = false; sfx('bounce');
      p.hitSet.add(b); hitBoss('drop');
      return;
    }
    if (b.state === 'walk' && !attackBox()) hurtPlayer(b.x);          // only bumping him mid-stride hurts
  }
  // the shovel swing and the burst from underground
  if (b.state === 'swing' && b.t < 0.22) {
    const hb = { x: b.face > 0 ? b.x + 4 : b.x - 40, y: b.y - 42, w: 36, h: 40 };
    if (overlap(hb, pb)) hurtPlayer(b.x);
  }
  if (b.state === 'pop' && b.t < 0.2 && overlap({ x: b.x - 16, y: b.y - 56, w: 32, h: 56 }, pb)) hurtPlayer(b.x);
}

function updateBoss(dt) {
  const b = boss, p = player;
  if (!b) return;
  b.t += dt; b.flash -= dt;
  const dx = p.x - b.x, toward = Math.sign(dx) || b.face;
  switch (b.state) {
    case 'intro':
      b.face = toward;
      if (!b.said && b.t > 0.3) { b.said = true; popup(b.x, b.y - 66, LV.boss.line, '#fff3c4', 1, 2); }
      if (b.t > 2.2) bossSet('walk');
      break;
    case 'walk':                        // close in, but stop just out of reach and wind up rather than walk into you
      b.face = toward; b.vx = Math.abs(dx) > 44 ? b.face * 46 : 0;
      if (b.t > 1.1 || (Math.abs(dx) <= 44 && b.t > 0.3)) {
        b.n++; b.vx = 0;
        if (b.n % 3 === 0) { bossSet('dig'); sfx('dig'); }
        else if (Math.abs(dx) < 60) bossSet('windup');
        else bossSet('throwWind');
      }
      break;
    case 'windup': b.vx = 0; if (b.t > 0.45) { bossSet('swing'); sfx('whoosh'); } break;
    case 'swing': b.vx = b.t < 0.15 ? b.face * 90 : 0; if (b.t > 0.32) bossSet('recover'); break;
    case 'recover': b.vx = 0; if (b.t > 0.65) bossSet('walk'); break;
    case 'throwWind': b.vx = 0; b.face = toward; if (b.t > 0.35) { bossSet('throw'); flingClods(); } break;
    case 'throw': if (b.t > 0.5) bossSet('recover'); break;
    case 'hurt': b.vx *= Math.pow(0.01, dt); if (b.t > 0.28) bossSet('walk'); break;
    case 'dig':
      b.vx = 0; if (b.t > 0.4) { bossSet('under'); b.mx = b.x; dirt(b.x, b.y, 8); }
      break;
    case 'under':                       // a mound of dirt tunnels toward you
      b.mx += Math.sign(p.x - b.mx) * Math.min(Math.abs(p.x - b.mx), 120 * dt);
      b.mx = Math.max(LV.boss.arenaX + 20, Math.min(LEVEL_W - 20, b.mx));
      if (Math.random() < 0.2) puff(b.mx, GROUND, 1);
      if (Math.abs(p.x - b.mx) < 6 || b.t > 1.6) { bossSet('rumble'); sfx('dig'); }
      break;
    case 'rumble':
      if (Math.random() < 0.4) dirt(b.mx, GROUND, 1);
      if (b.t > 0.5) { bossSet('pop'); b.x = b.mx; b.vy = -200; dirt(b.x, GROUND, 12); shake = Math.max(shake, 5); sfx('stomp'); }
      break;
    case 'pop': if (b.t > 0.35 && b.onGround) { bossSet('daze'); popup(b.x, b.y - 62, 'DIZZY!', '#ffd34a', 1); } break;
    case 'daze': b.vx = 0; if (b.t > 1.7) bossSet('walk'); break;
    case 'ko':
      b.vy += GRAV * 0.6 * dt; b.x += b.vx * dt; b.y += b.vy * dt;
      if (b.t > 1.6 && phase === 'play') { phase = 'clear'; phaseT = 0; sfx('win'); player.vx = 0; setState('taunt'); }
      return;
  }
  if (b.state !== 'under' && b.state !== 'rumble') {
    b.vy = Math.min(b.vy + GRAV * dt, MAXFALL);
    moveBody(b, 22, 44, dt, false);
  }
}
function flingClods() {
  const b = boss;
  for (let k = 0; k < 3; k++) clods.push({ x: b.x + b.face * 16, y: b.y - 30, vx: b.face * (80 + 55 * k), vy: -300 + 30 * k });
  sfx('dig');
}
function updateClods(dt) {
  const pb = box(player, PW, PH);
  for (const c of clods) {
    c.vy += 700 * dt; c.x += c.vx * dt; c.y += c.vy * dt;
    if (c.y >= GROUND && groundAhead(c.x, GROUND)) { c.dead = true; puff(c.x, GROUND, 2); dirt(c.x, GROUND, 2); }
    if (!c.dead && overlap({ x: c.x - 4, y: c.y - 4, w: 8, h: 8 }, pb) && hurtPlayer(c.x)) c.dead = true;
    if (c.y > VH + 20) c.dead = true;
  }
  clods = clods.filter(c => !c.dead);
}

// ---------------------------------------------------------------- the opening: Ringo's boots climb out of the grave
const INTRO = { bolt: 0.7, rumble: 1.1, rise: 1.5, wake: 1.5 + HERO.rise.dur + 0.3, hop: 0, land: 0, end: 0 };
INTRO.hop = INTRO.wake + 0.3; INTRO.land = INTRO.hop + 0.55; INTRO.end = INTRO.land + 0.2;
function updateIntro(dt) {
  const t = phaseT, I = LV.intro;
  if ((pressed.jump || pressed.snap || pressed.side) && t < INTRO.land) phaseT = INTRO.land - 0.01;
  if (t >= INTRO.bolt && t - dt < INTRO.bolt) bolt();
  if (t >= INTRO.rumble && t < INTRO.rise) { shake = Math.max(shake, 1.5); if (Math.random() < 0.3) dirt(I.grave, GROUND, 1); }
  if (t >= INTRO.rise && t - dt < INTRO.rise) { dirt(I.grave, GROUND, 14); sfx('dig'); intro.risen = true; }
  if (t >= INTRO.rise && t < INTRO.wake && Math.random() < 0.15) dirt(I.grave, GROUND, 1);
  if (t >= INTRO.hop) {                // the hat hops off the headstone onto him
    const k = Math.min(1, (t - INTRO.hop) / (INTRO.land - INTRO.hop));
    const x0 = I.stone, y0 = GROUND - 34, x1 = I.grave, y1 = GROUND - 31.6;
    intro.hatX = x0 + (x1 - x0) * k; intro.hatY = y0 + (y1 - y0) * k - Math.sin(k * Math.PI) * 26;
  }
  if (t >= INTRO.land && !intro.hatOn) { intro.hatOn = true; sfx('tip'); puff(I.grave, GROUND, 4); }
  if (t >= INTRO.end) { phase = 'play'; titleT = 0; player.state = 'idle'; player.t = 0.2; }
}
function bolt() { flashT = 0.16; sfx('thunder'); }

// ---------------------------------------------------------------- particles
function updateParts(dt) {
  for (const q of parts) {
    q.life -= dt;
    if (q.vx !== undefined) { q.x += q.vx * dt; q.y += q.vy * dt; }
    if (q.g) q.vy += q.g * dt;
    if (q.k === 'dust') { q.vx *= 0.9; q.vy *= 0.9; }
    if (q.k === 'chunk' && q.y > GROUND && q.vy > 0 && groundAhead(q.x, GROUND)) { q.y = GROUND; q.vy *= -0.35; q.vx *= 0.6; }
  }
  parts = parts.filter(q => q.life > 0);
  for (const u of popups) { u.life -= dt; if (u.rise) u.y -= 30 * dt; }
  popups = popups.filter(u => u.life > 0);
}

// ---------------------------------------------------------------- display list (what the F256 would be sent)
// Each entry is one image placed on screen; it costs one hardware record per non-empty 32x32 cell.
// Lower priority number = nearer the front = lower sprite number. Records past 128 are dropped.
const view = document.getElementById('view');
const vctx = view.getContext('2d');
const buf = T.canvas(VW, VH), ctx = buf.getContext('2d');
let scale = 2;
function resize() {
  scale = Math.max(1, Math.floor(Math.min(innerWidth / VW, innerHeight / VH)));
  view.width = VW * scale; view.height = VH * scale;
  vctx.imageSmoothingEnabled = false;
}
addEventListener('resize', resize); resize();

let DL = [], frameStats = { records: 0, dropped: 0 };
// screen-space placement: (x, y) is the image's origin point, (ox, oy) that origin inside the image
function put(img, x, y, ox, oy, pri, face = 1, clut = null) {
  const left = face < 0 ? Math.round(x) - (img.width - ox) : Math.round(x) - ox;
  const top = Math.round(y) - oy;
  if (left >= VW || top >= VH || left + img.width <= 0 || top + img.height <= 0) return;
  DL.push({ img, left, top, pri, face, clut, n: T.cells(img, face < 0).length });
}
const putO = (img, x, y, pri, face, clut) => put(img, x, y, img.ox, img.oy, pri, face, clut);   // image knows its origin
const center = (img, y, pri = 0) => put(img, (VW - img.width) >> 1, y, 0, 0, pri);

function buildDisplayList() {
  DL = [];
  const cx = Math.round(camX);
  const wx = x => x - cx;

  // HUD and text
  put(T.textSprite('SCORE ' + String(score).padStart(7, '0'), '#fff3c4', 2), 6, 6, 0, 0, 0);
  if (phase !== 'intro') for (let i = 0; i < MAX_HP; i++) if (i < player.hp) put(HAT, 6 + i * 26, 22, 0, 0, 0);
  if (comboT > 0 && combo > 1) { const t = T.textSprite(combo + ' HIT COMBO!', '#ffd34a', 1); put(t, VW - 6 - t.width, 8, 0, 0, 0); }
  if (boss && boss.state !== 'ko') { const bar = T.bossBar(LV.boss.name, boss.hp, BOSS_HP); put(bar, VW - 6 - bar.width, 20, 0, 0, 0); }
  if (titleT > 0 && titleT < 4 && !DEMO && LV.intro) {
    center(T.textSprite('TEXAS', '#ffe7b0', 4), 30); center(T.textSprite('SHITKICKERS', '#ff9d3c', 4), 58);
    if (titleT > 0.6) { center(T.textSprite(LV.name, '#fff3c4', 2), 96); center(T.textSprite(LV.sub, '#c3c8d8', 1), 112); }
  } else if (!LV.intro && titleT < 6 && !DEMO && (titleT < 5 || Math.floor(titleT * 8) % 2)) {
    center(T.textSprite('TEXAS', '#ffe7b0', 4), 30); center(T.textSprite('SHITKICKERS', '#ff9d3c', 4), 58);
  }
  if (phase === 'clear') {
    center(T.textSprite(LV.name + ' CLEAR!', '#ffd34a', 3), 60);
    if (phaseT > 1) center(T.textSprite('SCORE ' + score, '#fff3c4', 2), 90);
    if (phaseT > 3) center(T.textSprite('TO BE CONTINUED...', '#ff9d3c', 2), 120);
    if (phaseT > 4 && Math.floor(phaseT * 3) % 2) center(T.textSprite('PRESS JUMP TO RIDE AGAIN', '#c3c8d8', 1), 146);
  }
  if (showHelp) { const h = helpSprite(); put(h, (VW - h.width) >> 1, 54, 0, 0, 0); }
  else if (phase === 'play') { const h = T.textSprite(DEMO ? 'DEMO' : 'H: MOVES', '#ffe7b0', 1); put(h, 6, VH - 11, 0, 0, 0); }
  for (const u of popups) {
    if (u.life < 0.2 && Math.floor(u.life * 30) % 2) continue;
    const t = T.textSprite(u.text, u.color, u.s);
    put(t, Math.max(2, Math.min(VW - 2 - t.width, wx(u.x) - (t.width >> 1))), u.y, 0, 0, 1);
  }

  // effects in front of the actors
  for (const q of parts) {
    const k = q.life / q.max;
    if (q.k === 'star') { const f = FX.star[Math.max(0, Math.min(5, Math.round((q.big ? 5 : 3) * (0.6 + k * 0.4))))]; put(f, wx(q.x), q.y, 16, 16, 2); }
    else if (q.k === 'bit') put(FX.bit[q.c], wx(q.x), q.y, 4, 4, 2);
  }
  for (const c of clods) putO(PROPS.clod, wx(c.x), c.y, 2);

  // the hero
  const p = player, H = T.HERO;
  if (phase === 'intro') {
    const t = phaseT;
    if (t >= INTRO.rise) {
      const img = t < INTRO.wake ? HERO.rise.frames[Math.min(HERO.rise.frames.length - 1, Math.floor((t - INTRO.rise) * HERO.rise.fps))]
        : intro.hatOn ? HERO.idle.frames[0] : HERO.wake.frames[0];
      put(img, wx(p.x), p.y, H.OX, H.OY, 3);
    }
    if (!intro.hatOn) put(HAT, wx(intro.hatX), intro.hatY, T.HAT.OX, T.HAT.OY, 3);
  } else if (!(p.inv > 0 && Math.floor(p.inv * 18) % 2) && !(phase === 'dead' && Math.floor(phaseT * 10) % 2)) {
    put(HERO[p.anim].frames[p.frame], wx(p.x), p.y, H.OX, H.OY, 3, p.face);
  }
  for (const t of p.trail) put(t.img, wx(t.x), t.y, H.OX, H.OY, 4, t.face, 'ghost');

  // the boss
  if (boss) {
    const b = boss, C = COYOTE, Bo = T.BOSS;
    let img = null;
    switch (b.state) {
      case 'intro': img = C.talk[Math.floor(b.t * 6) % 2]; break;
      case 'walk': img = C.walk[Math.floor(b.t * 8) % 4]; break;
      case 'windup': case 'throwWind': img = C.windup; break;
      case 'swing': img = C.swing; break;
      case 'throw': img = C.throw; break;
      case 'recover': img = C.idle[Math.floor(b.t * 3) % 2]; break;
      case 'dig': img = C.dig; break;
      case 'pop': img = C.pop; break;
      case 'daze': img = C.daze[Math.floor(b.t * 8) % 4]; break;
      case 'hurt': img = C.hurt; break;
      case 'ko': img = C.ko; break;
    }
    if (img) put(img, wx(b.x), b.y, Bo.OX, Bo.OY, 5, b.face, b.flash > 0 ? 'flash' : null);
    if (b.state === 'under' || b.state === 'rumble') {
      const m = PROPS.digMound[Math.floor(time * (b.state === 'rumble' ? 16 : 6)) % 2];
      putO(m, wx(b.mx) + (b.state === 'rumble' ? (Math.floor(time * 30) % 2) * 2 - 1 : 0), GROUND, 5);
    }
  }

  // buzzards, dillos and props
  for (const b of birds) {
    const B = BUZZ, img = b.state === 'perch' ? B.perch : b.state === 'dive' || b.state === 'ko' ? B.dive : B.fly[Math.floor(b.anim * 10) % 4];
    putO(img, wx(b.x), b.y, 5, b.state === 'perch' ? -1 * Math.sign(b.x - p.x || 1) : b.face, b.flash > 0 ? 'flash' : null);
  }
  const E = T.ENEMY;
  for (const e of enemies) {
    let img, face = e.dir;
    if (e.state === 'walk') img = DILLO.walk[Math.floor(e.anim * 8) % 4];
    else if (e.state === 'roll') { img = DILLO.ball[Math.floor(e.anim * 24) % 8]; face = 1; }
    else if (e.state === 'shell') { img = DILLO.ball[e.t < 1 && Math.floor(e.t * 10) % 2 ? 1 : 0]; face = 1; }
    else if (e.state === 'stagger') { img = DILLO.walk[0]; face = -Math.sign(e.vx || 1); }
    else { img = DILLO.ball[Math.floor(e.spin * 20) % 8]; face = Math.sign(e.vx) || 1; }   // KO: tumbling ball
    put(img, wx(e.x), e.y, E.OX, E.OY, 5, face, e.flash > 0 ? 'flash' : null);
  }
  for (const b of barrels) if (b.alive) put(BARREL, wx(b.x), b.y, T.BARREL.OX, T.BARREL.OY, 6);
  if (LV.intro) {
    putO(PROPS.headstone, wx(LV.intro.stone), GROUND, 6);
    putO(phase === 'intro' && !intro.risen ? PROPS.mound : PROPS.hole, wx(LV.intro.grave), GROUND, 6);
  }
  for (const c of CHECKS) putO(PROPS.lantern[c.lit ? 1 : 0], wx(c.x), GROUND, 6);

  // effects behind the actors
  for (const q of parts) {
    const k = q.life / q.max;
    if (q.k === 'dust') put(FX.dust[Math.min(4, q.s + Math.floor((1 - k) * 2))][k > 0.5 ? 0 : 1], wx(q.x), q.y, 4, 4, 7);
    else if (q.k === 'chunk') put(q.img, wx(q.x), q.y, 1, 1, 7);
    else if (q.k === 'line') put(FX.line, wx(q.x), q.y, 7, 0, 7);
    else if (q.k === 'ring') { const f = FX.ring[Math.min(FX.ring.length - 1, Math.floor((1 - k) * FX.ring.length))]; put(f, wx(q.x), q.y, f.ox, f.oy, 7); }
  }
  for (const s of SIGNS) putO(s.img, wx(s.x), GROUND, 8);

  // allocate hardware records front to back
  DL.sort((a, b) => a.pri - b.pri);
  let used = 0, dropped = 0;
  for (const d of DL) {
    if (used + d.n > MAX_SPRITES) { d.dropped = true; dropped += d.n; continue; }
    used += d.n;
  }
  frameStats = { records: used, dropped, images: DL.length };
}

let helpImg = null;
function helpSprite() {
  if (helpImg) return helpImg;
  const lines = [
    ['ARROWS/WASD', 'MOVE'], ['SPACE / Z', 'JUMP (HOLD = HIGHER)'], ['X', 'FRONT SNAP KICK'], ['BACK + X', 'SIDE KICK'],
    ['X IN AIR', 'BICYCLE KICK'], ['C IN AIR', 'FLYING SIDE KICK'], ['DOWN IN AIR', 'STOMP'],
    ['DOWN+JUMP', 'DROP THROUGH PLANK'], ['T', 'TIP YER HAT'], ['M / P / I', 'MUTE / SHEET / F256 INFO'],
    ['', ''], ['STOMP A DILLO,', 'THEN KICK THE BALL!'],
  ];
  const w = 216, h = 20 + lines.length * 9;
  const c = T.canvas(w, h), x = c.getContext('2d');
  x.fillStyle = T.PAL.out; x.fillRect(0, 0, w, h);
  x.fillStyle = T.PAL.n2; x.fillRect(0, 0, w, 1); x.fillRect(0, h - 1, w, 1); x.fillRect(0, 0, 1, h); x.fillRect(w - 1, 0, 1, h);
  T.drawText(x, 'HOW TO KICK', w / 2, 5, '#ff9d3c', 1, null, 'center');
  lines.forEach(([k, v], i) => {
    T.drawText(x, k, 8, 16 + i * 9, '#ffd34a', 1, null);
    T.drawText(x, v, 66, 16 + i * 9, '#fff3c4', 1, null);
  });
  return (helpImg = T.pixelize(c, { a: T.PAL.out, b: T.PAL.n2, c: '#ff9d3c', d: '#ffd34a', e: '#fff3c4' }, null, T.CLUT.spr));
}

// ---------------------------------------------------------------- render
function render() {
  const sx = shake > 0.3 ? Math.round((Math.random() - 0.5) * shake * 2) : 0;
  const sy = shake > 0.3 ? Math.round((Math.random() - 0.5) * shake * 2) : 0;
  const cx = Math.round(camX), lit = flashT > 0;

  // three tile-map layers, each with its own scroll (a map's X register). Lightning = the tile CLUT, washed out.
  const layer = (img, scroll) => {
    const src = lit ? T.flashOf(img) : img, off = -(Math.floor(scroll) % img.width);
    for (let x = off; x < VW; x += img.width) ctx.drawImage(src, x + sx, sy);
  };
  ctx.fillStyle = '#000'; ctx.fillRect(0, 0, VW, VH);
  layer(LAYERS.far, cx * 0.25);
  layer(LAYERS.mid, cx * 0.5);
  const t0 = Math.floor(cx / TS);
  for (let ty = 0; ty < MAP_H; ty++) for (let tx = t0; tx <= t0 + VW / TS + 1 && tx < MAP_W; tx++) {
    const tile = FRONT[ty][tx];
    if (tile) ctx.drawImage(lit ? T.flashOf(tile) : tile, tx * TS - cx + sx, ty * TS + sy);
  }

  // sprites, back to front
  for (let i = DL.length - 1; i >= 0; i--) {
    const d = DL[i];
    if (d.dropped) continue;
    const img = d.clut ? T.variant(d.img, d.clut) : d.img;
    if (d.face < 0) {
      ctx.save(); ctx.translate(d.left + img.width + sx, d.top + sy); ctx.scale(-1, 1); ctx.drawImage(img, 0, 0); ctx.restore();
    } else ctx.drawImage(img, d.left + sx, d.top + sy);
    if (params.has('cells')) {
      ctx.strokeStyle = 'rgba(90,220,255,0.6)';
      for (const c of T.cells(d.img, d.face < 0)) {
        const x = d.face < 0 ? d.left + (d.img.width - 1 - c.x) - 31 : d.left + c.x;
        ctx.strokeRect(x + 0.5, d.top + c.y + 0.5, 31, 31);
      }
    }
  }
  if (params.has('debug')) {
    const ab = attackBox(), pb = box(player, PW, PH);
    ctx.strokeStyle = '#0f0'; ctx.strokeRect(pb.x - cx + 0.5, pb.y + 0.5, pb.w, pb.h);
    if (ab) { ctx.strokeStyle = '#f00'; ctx.strokeRect(ab.x - cx + 0.5, ab.y + 0.5, ab.w, ab.h); }
    if (boss) { const bb = bossBox(); ctx.strokeStyle = '#ff0'; ctx.strokeRect(bb.x - cx + 0.5, bb.y + 0.5, bb.w, bb.h); }
  }
  if (showInfo) { // diagnostics, not part of the F256 picture
    const s = frameStats;
    T.drawText(ctx, `SPR ${s.records}/${MAX_SPRITES}${s.dropped ? ' DROP ' + s.dropped : ''}  IMG ${s.images}`, VW - 6, 40, s.dropped ? '#ff6b4a' : '#7fd4ff', 1, T.PAL.out, 'right');
    T.drawText(ctx, `TILES ${STATS.far.unique}/${STATS.mid.unique}/${TILES.list.length}  CLUT ${T.CLUT.spr.colors.length - 1}/${T.CLUT.bg.colors.length - 1}`, VW - 6, 48, '#7fd4ff', 1, T.PAL.out, 'right');
  }
  if (muted) T.drawText(ctx, 'MUTED', VW - 6, VH - 11, '#ffe7b0', 1, T.PAL.out, 'right');

  vctx.drawImage(buf, 0, 0, VW * scale, VH * scale);
}

function saveSheet() {
  const sheet = T.buildSheet({ hero: HERO, barrel: BARREL, tiles: TILES, stats: STATS }, false);
  const a = document.createElement('a');
  a.download = 'tsk_spritesheet.png'; a.href = sheet.toDataURL('image/png'); a.click();
}

// ---------------------------------------------------------------- loop
let last = performance.now(), acc = 0;
const STEP = 1 / 120;
function camTarget() {
  if (arenaLock && boss && boss.state !== 'ko') return LV.boss.arenaX;
  return Math.max(0, Math.min(LEVEL_W - VW, player.x - VW * 0.4 + player.face * 24));
}
// ?bot: a crude autopilot that fights the boss, for testing the fight end to end with ?ff
let botT = 0;
function runBot(dt) {
  if (!params.has('bot') || phase !== 'play' || !boss || boss.state === 'ko') return;
  const p = player, b = boss, dx = b.x - p.x;
  botT -= dt;
  keys.left = keys.right = false;
  const go = d => { keys[d > 0 ? 'right' : 'left'] = true; };
  if (b.state === 'under' || b.state === 'rumble') {          // get out from over the mound
    if (Math.abs(b.mx - p.x) < 50) { go(p.x - b.mx || 1); if (p.onGround && botT <= 0) { pressed.jump = keys.jump = true; botT = 0.5; } }
  } else if (b.state === 'windup' || b.state === 'swing') { if (Math.abs(dx) < 70) go(-dx); }   // back off the shovel
  else if (Math.abs(dx) > 34) go(dx);
  else if (botT <= 0 && p.onGround) {
    p.face = Math.sign(dx) || p.face;
    if (b.state === 'daze' || b.state === 'recover') { pressed.snap = true; botT = 0.35; }
    else { pressed.side = true; botT = 0.7; }
  }
  if (botT < 0.3) keys.jump = false;
}
function simulate(dt) {
  runDemo(dt);
  runBot(dt);
  flashT -= dt;
  if (LV.lightning && phase !== 'intro' && (nextBolt -= dt) <= 0) {   // a storm rolls over Boot Hill now and then
    bolt(); nextBolt = 7 + Math.random() * 9;
    if (Math.random() < 0.5) flicker = 0.22;             // and sometimes a second flicker
  }
  if (flicker > 0 && (flicker -= dt) <= 0) flashT = 0.08;
  if (hitstop > 0) { hitstop -= dt; return; }
  time += dt; titleT += dt; phaseT += dt;
  comboT -= dt; shake = Math.max(0, shake - 30 * dt);
  if (phase === 'intro') updateIntro(dt);
  else if (phase === 'play') updatePlayer(dt);
  else if (phase === 'dead') { if (phaseT > 1.6) respawn(); }
  else if (phase === 'clear') {           // he turns to the camera and tips his hat
    const p = player; p.t += dt;
    if (p.state === 'taunt' && p.t >= HERO.taunt.dur) setState('idle');
    p.vy = Math.min(p.vy + GRAV * dt, MAXFALL); moveBody(p, PW, PH, dt); pickAnim(p);
    if (phaseT > 4 && pressed.jump) location.reload();
  }
  updateEnemies(dt);
  updateBirds(dt);
  updateBoss(dt);
  updateClods(dt);
  updateParts(dt);
  for (const k in pressed) pressed[k] = false;
}
// ?ff=SECONDS fast-forwards the simulation at load (handy for headless screenshots);
// ?start=X begins at x (skipping the opening), e.g. ?start=2260 for the boss
if (params.has('ff')) {
  for (let i = 0; i < parseFloat(params.get('ff')) / STEP; i++) {
    simulate(STEP);
    if (i % 2) camX += (camTarget() - camX) * 0.1;
  }
  shake = 0;
} else camX = camTarget();
function frame(now) {
  const dt = Math.min(0.05, (now - last) / 1000); last = now;
  pollPad();
  if (pressed.help) showHelp = !showHelp;
  if (pressed.mute) muted = !muted;
  if (pressed.info) showInfo = !showInfo;
  if (pressed.sheet) saveSheet();
  acc += dt;
  while (acc >= STEP) { acc -= STEP; simulate(STEP); }
  camX += (camTarget() - camX) * Math.min(1, dt * 6);
  buildDisplayList();
  render();
  requestAnimationFrame(frame);
}
buildDisplayList(); render();
requestAnimationFrame(frame);
})();
